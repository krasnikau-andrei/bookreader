import type { PluginManifest, ReaderMarker, Widget } from './types';
import {
	PluginCallError,
	validateMarkers,
	validateNetRequest,
	validateWidgets,
	type NetRequest
} from './validate';

/**
 * The reader's side of every call a plugin makes. A plugin can only reach the
 * outside world through here, so this is where permissions are enforced.
 */
export interface HostDeps {
	manifest: PluginManifest;
	/** Hosts the user allowed, read fresh on every call so a revoke applies at once */
	grantedHosts: () => string[];
	/** The plugin wants a host the user hasn't decided on — show it in the plugin's card */
	requestHost: (host: string) => void;
	storage: {
		get: (key: string) => Promise<unknown>;
		set: (key: string, value: unknown) => Promise<void>;
	};
	fetch: typeof fetch;
	setMarkers: (markers: ReaderMarker[]) => void;
	setUi: (widgets: Widget[]) => void;
	log: (level: 'info' | 'error', message: string) => void;
}

export interface NetResponse {
	status: number;
	body: string;
}

export const MAX_RESPONSE = 1024 * 1024;
export const MAX_STORED_VALUE = 64 * 1024;
const MAX_CONCURRENT_REQUESTS = 4;
const MAX_REQUESTS_PER_MINUTE = 120;

export type HostCall = (method: string, args: unknown) => Promise<unknown>;

export function createHostApi(deps: HostDeps): HostCall {
	const { manifest } = deps;
	let inFlight = 0;
	let recentRequests: number[] = [];

	function requirePermission(permission: PluginManifest['permissions'][number]) {
		if (!manifest.permissions.includes(permission)) {
			throw new PluginCallError(
				'permission-denied',
				`"${manifest.id}" did not ask for the "${permission}" permission in its manifest`
			);
		}
	}

	function storageKey(args: unknown): string {
		const key = (args as { key?: unknown })?.key;
		if (typeof key !== 'string' || key.length === 0 || key.length > 100) {
			throw new PluginCallError('invalid-argument', 'Storage key must be a 1..100 char string');
		}
		return key;
	}

	async function netFetch(req: NetRequest): Promise<NetResponse> {
		const host = req.url.host;
		if (!deps.grantedHosts().includes(host)) {
			deps.requestHost(host);
			throw new PluginCallError(
				'host-not-allowed',
				`The user has not allowed ${host} yet. The request is shown in the plugin's card.`
			);
		}

		const now = Date.now();
		recentRequests = recentRequests.filter((t) => now - t < 60_000);
		if (inFlight >= MAX_CONCURRENT_REQUESTS || recentRequests.length >= MAX_REQUESTS_PER_MINUTE) {
			throw new PluginCallError('rate-limited', 'Too many requests, slow down');
		}
		recentRequests.push(now);
		inFlight++;

		try {
			const response = await deps.fetch(req.url.toString(), {
				method: req.method,
				headers: req.headers,
				body: req.body,
				// Never send the reader's cookies, and never follow a redirect —
				// it could lead to a host the user didn't allow
				credentials: 'omit',
				redirect: 'error',
				referrerPolicy: 'no-referrer',
				cache: 'no-store'
			});
			const body = await response.text();
			if (body.length > MAX_RESPONSE) {
				throw new PluginCallError('response-too-large', `Response is over ${MAX_RESPONSE} bytes`);
			}
			return { status: response.status, body };
		} catch (e) {
			if (e instanceof PluginCallError) throw e;
			throw new PluginCallError('network-error', (e as Error).message || 'Network error');
		} finally {
			inFlight--;
		}
	}

	return async (method, args) => {
		switch (method) {
			case 'storage.get':
				return deps.storage.get(storageKey(args));

			case 'storage.set': {
				const key = storageKey(args);
				const value = (args as { value?: unknown }).value;
				const size = JSON.stringify(value ?? null).length;
				if (size > MAX_STORED_VALUE) {
					throw new PluginCallError('invalid-argument', `Stored value is over ${MAX_STORED_VALUE}`);
				}
				await deps.storage.set(key, value);
				return null;
			}

			case 'net.fetch':
				requirePermission('network');
				return netFetch(validateNetRequest(args));

			case 'markers.set':
				requirePermission('markers');
				deps.setMarkers(validateMarkers((args as { markers?: unknown })?.markers));
				return null;

			case 'ui.set':
				deps.setUi(validateWidgets((args as { widgets?: unknown })?.widgets));
				return null;

			case 'log': {
				const { level, message } = (args ?? {}) as { level?: unknown; message?: unknown };
				deps.log(level === 'error' ? 'error' : 'info', String(message).slice(0, 2000));
				return null;
			}

			default:
				throw new PluginCallError('unknown-method', `Unknown method "${method}"`);
		}
	};
}
