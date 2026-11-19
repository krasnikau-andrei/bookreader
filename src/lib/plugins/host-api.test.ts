import { describe, test, expect, vi } from 'vitest';
import { createHostApi, type HostDeps } from './host-api';
import type { Permission } from './types';

function setup(permissions: Permission[], granted: string[] = []) {
	const calls = {
		requestedHosts: [] as string[],
		markers: [] as unknown[],
		ui: [] as unknown[],
		stored: new Map<string, unknown>()
	};
	const fetchMock = vi.fn(async () => new Response('{"ok":true}', { status: 200 }));
	const deps: HostDeps = {
		manifest: { id: 'test', name: 'Test', version: '1', description: '', permissions },
		grantedHosts: () => granted,
		requestHost: (h) => calls.requestedHosts.push(h),
		storage: {
			get: async (k) => calls.stored.get(k),
			set: async (k, v) => void calls.stored.set(k, v)
		},
		fetch: fetchMock as unknown as typeof fetch,
		setMarkers: (m) => calls.markers.push(m),
		setUi: (w) => calls.ui.push(w),
		log: () => {}
	};
	return { call: createHostApi(deps), calls, fetchMock };
}

/** Run a call and return the error code it failed with, or 'ok'. */
async function outcome(p: Promise<unknown>): Promise<string> {
	try {
		await p;
		return 'ok';
	} catch (e) {
		return (e as { code?: string }).code ?? `unexpected: ${String(e)}`;
	}
}

describe('permissions from the manifest', () => {
	test('a plugin without "network" cannot fetch even a granted host', async () => {
		const { call, fetchMock } = setup(['position'], ['api.example.com']);
		expect(await outcome(call('net.fetch', { url: 'https://api.example.com/x' }))).toBe(
			'permission-denied'
		);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	test('a plugin without "markers" cannot draw markers', async () => {
		const { call, calls } = setup(['network']);
		const marker = { id: 'a', label: 'A', hue: 10, chapter: 0, fraction: 0.5 };
		expect(await outcome(call('markers.set', { markers: [marker] }))).toBe('permission-denied');
		expect(calls.markers).toEqual([]);
	});
});

describe('network hosts need the user', () => {
	test('an unknown host is refused and shown to the user, nothing is sent', async () => {
		const { call, calls, fetchMock } = setup(['network'], ['allowed.example.com']);
		expect(await outcome(call('net.fetch', { url: 'https://evil.example.com/steal' }))).toBe(
			'host-not-allowed'
		);
		expect(calls.requestedHosts).toEqual(['evil.example.com']);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	test('a granted host is fetched without cookies and without following redirects', async () => {
		const { call, fetchMock } = setup(['network'], ['allowed.example.com']);
		const res = await call('net.fetch', {
			url: 'https://allowed.example.com/p',
			method: 'put',
			headers: { Authorization: 'Bearer x' },
			body: '{}'
		});
		expect(res).toEqual({ status: 200, body: '{"ok":true}' });
		const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('https://allowed.example.com/p');
		expect(init).toMatchObject({ method: 'PUT', credentials: 'omit', redirect: 'error' });
	});

	test('the port is part of the host: allowing :443 does not allow :8443', async () => {
		const { call } = setup(['network'], ['allowed.example.com']);
		expect(await outcome(call('net.fetch', { url: 'https://allowed.example.com:8443/' }))).toBe(
			'host-not-allowed'
		);
	});

	test.each([
		['http://allowed.example.com/', 'plain http to a remote host'],
		['ftp://allowed.example.com/', 'other schemes'],
		['https://user:pw@allowed.example.com/', 'credentials in the URL'],
		['not a url', 'garbage']
	])('rejects %s (%s)', async (url) => {
		const { call, fetchMock } = setup(['network'], ['allowed.example.com']);
		expect(await outcome(call('net.fetch', { url }))).toBe('invalid-argument');
		expect(fetchMock).not.toHaveBeenCalled();
	});

	test('plain http is fine for a server on this device', async () => {
		const { call } = setup(['network'], ['localhost:8787']);
		expect(await outcome(call('net.fetch', { url: 'http://localhost:8787/x' }))).toBe('ok');
	});

	test('stops a plugin that floods the network', async () => {
		const { call } = setup(['network'], ['allowed.example.com']);
		const results: string[] = [];
		for (let i = 0; i < 125; i++) {
			results.push(await outcome(call('net.fetch', { url: 'https://allowed.example.com/' })));
		}
		expect(results.filter((r) => r === 'ok').length, results.join(',')).toBe(120);
		expect(results.at(-1)).toBe('rate-limited');
	});
});

describe('untrusted data from plugins', () => {
	test('markers are checked and hue is wrapped into 0..359', async () => {
		const { call, calls } = setup(['markers']);
		await call('markers.set', {
			markers: [{ id: 'a', label: 'Аня', hue: -30, chapter: 2, fraction: 0.25 }]
		});
		expect(calls.markers[0]).toEqual([
			{ id: 'a', label: 'Аня', hue: 330, chapter: 2, fraction: 0.25 }
		]);
		const bad = { id: 'a', label: 'A', hue: 1, chapter: 0, fraction: 2 };
		expect(await outcome(call('markers.set', { markers: [bad] }))).toBe('invalid-argument');
	});

	test('unknown widget types never reach the screen', async () => {
		const { call, calls } = setup([]);
		const res = await outcome(
			call('ui.set', { widgets: [{ type: 'html', html: '<img src=x onerror=alert(1)>' }] })
		);
		expect(res).toBe('invalid-argument');
		expect(calls.ui).toEqual([]);
	});

	test('storage refuses values that would fill the device', async () => {
		const { call } = setup([]);
		const big = 'x'.repeat(70 * 1024);
		expect(await outcome(call('storage.set', { key: 'k', value: big }))).toBe('invalid-argument');
	});

	test('unknown methods are refused', async () => {
		const { call } = setup(['position', 'markers', 'network']);
		expect(await outcome(call('books.list', {}))).toBe('unknown-method');
	});
});
