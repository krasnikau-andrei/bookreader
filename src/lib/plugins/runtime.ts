/**
 * Code that runs on the plugin's side of the wall.
 *
 * Layers, outside in:
 * 1. <iframe sandbox="allow-scripts"> — an opaque origin: no IndexedDB, no
 *    cookies, no access to the reader's page.
 * 2. CSP default-src 'none' inside it — no fetch, images, sockets, forms.
 * 3. The plugin's code runs in a Worker started by that iframe. A worker has
 *    no DOM, so no nested iframes and no WebRTC (RTCPeerConnection is
 *    window-only — it is the one channel that slips past CSP). It also runs
 *    on its own thread, so an endless loop can't freeze the reader.
 *
 * The plugin's only way out is the MessagePort it is handed, which leads to
 * createHostApi on the reader's side.
 */

/** Defines the global `reader` object inside the worker. Runs before the plugin's code. */
export const WORKER_RUNTIME = `"use strict";
(() => {
	let port = null;
	let nextId = 1;
	const outbox = [];
	const pending = new Map();
	const listeners = Object.create(null);

	function send(message) {
		if (port) port.postMessage(message);
		else outbox.push(message);
	}

	function report(err) {
		const message = String((err && (err.stack || err.message)) || err);
		send({ kind: 'call', id: 0, method: 'log', args: { level: 'error', message } });
	}

	function call(method, args) {
		return new Promise((resolve, reject) => {
			const id = nextId++;
			pending.set(id, { resolve, reject });
			send({ kind: 'call', id, method, args });
		});
	}

	function onHostMessage(event) {
		const m = event.data;
		if (!m || typeof m !== 'object') return;
		if (m.kind === 'result') {
			const p = pending.get(m.id);
			if (!p) return;
			pending.delete(m.id);
			if (m.ok) return p.resolve(m.value);
			const err = new Error(m.error.message);
			err.code = m.error.code;
			p.reject(err);
		} else if (m.kind === 'event') {
			for (const fn of listeners[m.name] || []) {
				try {
					const r = fn(m.data);
					if (r && typeof r.catch === 'function') r.catch(report);
				} catch (err) {
					report(err);
				}
			}
		}
	}

	self.addEventListener('message', function takePort(event) {
		if (port || !event.ports[0]) return;
		self.removeEventListener('message', takePort);
		port = event.ports[0];
		port.onmessage = onHostMessage;
		for (const m of outbox.splice(0)) port.postMessage(m);
	});
	self.addEventListener('error', (e) => report(e.message));
	self.addEventListener('unhandledrejection', (e) => report(e.reason));

	self.reader = Object.freeze({
		on(name, fn) {
			(listeners[name] ||= []).push(fn);
		},
		storage: Object.freeze({
			get: (key) => call('storage.get', { key }),
			set: (key, value) => call('storage.set', { key, value })
		}),
		net: Object.freeze({
			fetch: (url, init) => call('net.fetch', Object.assign({}, init, { url }))
		}),
		markers: Object.freeze({ set: (markers) => call('markers.set', { markers }) }),
		ui: Object.freeze({ set: (widgets) => call('ui.set', { widgets }) }),
		log: (...parts) => call('log', { level: 'info', message: parts.join(' ') })
	});
})();
`;

const SANDBOX_CSP = "default-src 'none'; script-src 'unsafe-inline'; worker-src blob:";

/**
 * The iframe's document. It holds no plugin code — it only starts the worker
 * from the source the reader posts, hands it the port and reports crashes.
 */
export const SANDBOX_HTML = `<!doctype html>
<meta http-equiv="Content-Security-Policy" content="${SANDBOX_CSP}">
<script>
addEventListener('message', function boot(e) {
	if (e.source !== parent || !e.data || e.data.type !== 'boot' || !e.ports[0]) return;
	removeEventListener('message', boot);
	const url = URL.createObjectURL(new Blob([e.data.source], { type: 'text/javascript' }));
	const worker = new Worker(url);
	worker.onerror = (err) => {
		parent.postMessage({ type: 'crash', message: String(err.message || 'Plugin failed to start') }, '*');
	};
	worker.postMessage(null, [e.ports[0]]);
});
</script>`;

export function workerSource(pluginCode: string): string {
	// The plugin's code gets its own block so its top-level names can't clash with the runtime
	return `${WORKER_RUNTIME}\n;{\n${pluginCode}\n}\n`;
}
