// @vitest-environment node
import { describe, test, expect, beforeEach } from 'vitest';
import { createApp, MemoryStore, publicKeyOf } from './app';

const SECRET = 'a'.repeat(64);
const OTHER_SECRET = 'b'.repeat(64);
const BOOK = 'f'.repeat(64);

let app: ReturnType<typeof createApp>;
let pub: string;

beforeEach(async () => {
	app = createApp(new MemoryStore(), () => 1_700_000_000_000);
	pub = await publicKeyOf(SECRET);
});

async function request(method: string, path: string, body?: unknown, secret?: string) {
	const res = await app(
		new Request(`http://test${path}`, {
			method,
			headers: secret ? { Authorization: `Bearer ${secret}` } : {},
			body: body === undefined ? undefined : JSON.stringify(body)
		})
	);
	const text = await res.text();
	// Status plus body in one value, so a failing assertion shows why
	return { status: res.status, body: text ? JSON.parse(text) : null, headers: res.headers };
}

describe('reading position', () => {
	test('the owner writes, anyone with the public key reads it back with the name', async () => {
		await request('PUT', `/v1/readers/${pub}/profile`, { name: ' Аня ' }, SECRET);
		const put = await request(
			'PUT',
			`/v1/readers/${pub}/books/${BOOK}`,
			{ chapter: 3, fraction: 0.4, percent: 0.25 },
			SECRET
		);
		expect(put).toMatchObject({ status: 200 });

		const got = await request('GET', `/v1/readers/${pub}/books/${BOOK}`);
		expect(got.status, JSON.stringify(got.body)).toBe(200);
		expect(got.body).toEqual({
			name: 'Аня',
			chapter: 3,
			fraction: 0.4,
			percent: 0.25,
			updatedAt: 1_700_000_000_000
		});
	});

	test('a secret for another key cannot write', async () => {
		const res = await request(
			'PUT',
			`/v1/readers/${pub}/books/${BOOK}`,
			{ chapter: 0, fraction: 0, percent: 0 },
			OTHER_SECRET
		);
		expect(res).toMatchObject({ status: 401 });
		expect((await request('GET', `/v1/readers/${pub}/books/${BOOK}`)).status).toBe(404);
	});

	test('a book the reader never opened is a 404, not an empty position', async () => {
		const res = await request('GET', `/v1/readers/${pub}/books/${'0'.repeat(64)}`);
		expect(res.status).toBe(404);
	});

	test.each([
		[{ chapter: -1, fraction: 0, percent: 0 }],
		[{ chapter: 1.5, fraction: 0, percent: 0 }],
		[{ chapter: 1, fraction: 1.2, percent: 0 }],
		[{ chapter: 1, fraction: 0.5 }],
		['not an object']
	])('rejects a bad position %j', async (body) => {
		const res = await request('PUT', `/v1/readers/${pub}/books/${BOOK}`, body, SECRET);
		expect(res.status, JSON.stringify(res.body)).toBe(400);
	});

	test('rejects keys and book ids that could be used to probe paths', async () => {
		expect((await request('GET', `/v1/readers/${pub.toUpperCase()}/profile`)).status).toBe(400);
		expect((await request('GET', `/v1/readers/${pub}/books/..%2F..%2Fetc`)).status).toBe(400);
	});

	test('rejects oversized bodies', async () => {
		const res = await request(
			'PUT',
			`/v1/readers/${pub}/profile`,
			{ name: 'x', pad: 'y'.repeat(2000) },
			SECRET
		);
		expect(res.status).toBe(400);
	});
});

describe('browser access', () => {
	test('every response allows the reader app to call it cross-origin', async () => {
		const preflight = await app(
			new Request(`http://test/v1/readers/${pub}/profile`, { method: 'OPTIONS' })
		);
		expect(preflight.status).toBe(204);
		expect(preflight.headers.get('Access-Control-Allow-Headers')).toContain('Authorization');

		const failed = await request('GET', `/v1/readers/${pub}/books/${BOOK}`);
		expect(failed.status).toBe(404);
		expect(failed.headers.get('Access-Control-Allow-Origin')).toBe('*');
	});
});
