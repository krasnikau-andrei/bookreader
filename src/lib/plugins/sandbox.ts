import type { HostCall } from './host-api';
import { PluginCallError } from './validate';
import { SANDBOX_HTML, workerSource } from './runtime';

export interface Sandbox {
	/** Send an event to the plugin, e.g. emit('position', {...}) */
	emit: (name: string, data: unknown) => void;
	/** Kill the plugin: removing the iframe terminates its worker too */
	stop: () => void;
}

interface CallMessage {
	kind: 'call';
	id: number;
	method: string;
	args: unknown;
}

function isCall(m: unknown): m is CallMessage {
	const c = m as CallMessage;
	return !!c && c.kind === 'call' && typeof c.id === 'number' && typeof c.method === 'string';
}

export function startSandbox(options: {
	code: string;
	call: HostCall;
	onCrash: (message: string) => void;
	parent?: HTMLElement;
}): Sandbox {
	const { code, call, onCrash, parent = document.body } = options;

	// Events sent before the worker starts wait in the channel
	const channel = new MessageChannel();
	const port = channel.port1;

	port.onmessage = async (event) => {
		if (!isCall(event.data)) return;
		const { id, method, args } = event.data;
		try {
			const value = await call(method, args);
			port.postMessage({ kind: 'result', id, ok: true, value });
		} catch (e) {
			const error =
				e instanceof PluginCallError
					? { code: e.code, message: e.message }
					: { code: 'internal', message: 'The reader failed to handle this call' };
			if (!(e instanceof PluginCallError)) console.error('[PLUGINS] Host call failed:', e);
			port.postMessage({ kind: 'result', id, ok: false, error });
		}
	};

	const iframe = document.createElement('iframe');
	iframe.setAttribute('sandbox', 'allow-scripts');
	iframe.setAttribute('aria-hidden', 'true');
	iframe.tabIndex = -1;
	iframe.style.display = 'none';
	iframe.dataset.testid = 'plugin-sandbox';
	iframe.srcdoc = SANDBOX_HTML;

	function onWindowMessage(event: MessageEvent) {
		if (event.source !== iframe.contentWindow) return;
		if (event.data?.type === 'crash') onCrash(String(event.data.message).slice(0, 500));
	}
	window.addEventListener('message', onWindowMessage);

	iframe.addEventListener(
		'load',
		() => {
			// '*' because a sandboxed frame has an opaque origin with no name to target
			iframe.contentWindow?.postMessage({ type: 'boot', source: workerSource(code) }, '*', [
				channel.port2
			]);
		},
		{ once: true }
	);
	parent.appendChild(iframe);

	return {
		emit(name, data) {
			port.postMessage({ kind: 'event', name, data });
		},
		stop() {
			window.removeEventListener('message', onWindowMessage);
			port.close();
			iframe.remove();
		}
	};
}
