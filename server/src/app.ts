/**
 * Reading Together server: stores where each reader is in each book.
 *
 * No accounts. A reader makes a random secret on their phone; its public key
 * is the first 32 hex chars of SHA-256(secret). Writing needs the secret,
 * reading needs only the public key — that's what you give a friend.
 *
 * A friend can only ask about a book they name by id, and the id is the
 * SHA-256 of the book file. So they see your progress only in books they own,
 * not your whole library.
 */

export interface Position {
	chapter: number;
	fraction: number;
	percent: number;
	updatedAt: number;
}

export interface Store {
	getName(pub: string): Promise<string | undefined>;
	setName(pub: string, name: string): Promise<void>;
	getPosition(pub: string, bookId: string): Promise<Position | undefined>;
	setPosition(pub: string, bookId: string, position: Position): Promise<void>;
}

const PUB_RE = /^[0-9a-f]{32}$/;
const SECRET_RE = /^[0-9a-f]{64}$/;
// SHA-256 hex, or the reader's fallback hash "<base36>-<size>" on browsers without crypto.subtle
const BOOK_RE = /^[0-9a-z-]{1,80}$/;
const MAX_BODY = 1024;
const MAX_NAME = 40;

const CORS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
	'Access-Control-Allow-Headers': 'Authorization, Content-Type',
	'Access-Control-Max-Age': '86400'
};

function json(status: number, body: unknown): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { ...CORS, 'Content-Type': 'application/json' }
	});
}

const error = (status: number, message: string) => json(status, { error: message });

export async function publicKeyOf(secret: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
	return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0'))
		.join('')
		.slice(0, 32);
}

async function isOwner(req: Request, pub: string): Promise<boolean> {
	const auth = req.headers.get('Authorization') ?? '';
	const secret = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
	return SECRET_RE.test(secret) && (await publicKeyOf(secret)) === pub;
}

async function readJson(req: Request): Promise<Record<string, unknown> | null> {
	const text = await req.text();
	if (text.length > MAX_BODY) return null;
	try {
		const body = JSON.parse(text);
		return body && typeof body === 'object' && !Array.isArray(body) ? body : null;
	} catch {
		return null;
	}
}

function parsePosition(body: Record<string, unknown>, now: number): Position | null {
	const { chapter, fraction, percent } = body;
	if (!Number.isInteger(chapter) || (chapter as number) < 0 || (chapter as number) > 100_000) {
		return null;
	}
	const inUnit = (v: unknown) => typeof v === 'number' && v >= 0 && v <= 1;
	if (!inUnit(fraction) || !inUnit(percent)) return null;
	return {
		chapter: chapter as number,
		fraction: fraction as number,
		percent: percent as number,
		updatedAt: now
	};
}

export function createApp(store: Store, now: () => number = Date.now) {
	return async function handle(req: Request): Promise<Response> {
		if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

		const path = new URL(req.url).pathname;
		const profile = /^\/v1\/readers\/([^/]+)\/profile$/.exec(path);
		const book = /^\/v1\/readers\/([^/]+)\/books\/([^/]+)$/.exec(path);
		const pub = (profile ?? book)?.[1];

		if (!pub) return error(404, 'Not found');
		if (!PUB_RE.test(pub)) return error(400, 'Bad reader key');
		if (book && !BOOK_RE.test(book[2])) return error(400, 'Bad book id');

		if (req.method === 'PUT') {
			if (!(await isOwner(req, pub))) return error(401, 'Secret does not match this key');
			const body = await readJson(req);
			if (!body) return error(400, `Body must be a JSON object under ${MAX_BODY} bytes`);

			if (profile) {
				const name = typeof body.name === 'string' ? body.name.trim() : '';
				if (name.length > MAX_NAME) return error(400, `Name is longer than ${MAX_NAME}`);
				await store.setName(pub, name);
				return json(200, { ok: true });
			}

			const position = parsePosition(body, now());
			if (!position) return error(400, 'Need chapter >= 0 and fraction, percent in 0..1');
			await store.setPosition(pub, book![2], position);
			return json(200, { ok: true });
		}

		if (req.method === 'GET') {
			const name = (await store.getName(pub)) ?? '';
			if (profile) return json(200, { name });
			const position = await store.getPosition(pub, book![2]);
			if (!position) return error(404, 'This reader has not opened this book');
			return json(200, { name, ...position });
		}

		return error(405, 'Method not allowed');
	};
}

/** For tests and local runs; the real server keeps data in SQLite. */
export class MemoryStore implements Store {
	#names = new Map<string, string>();
	#positions = new Map<string, Position>();

	async getName(pub: string) {
		return this.#names.get(pub);
	}
	async setName(pub: string, name: string) {
		this.#names.set(pub, name);
	}
	async getPosition(pub: string, bookId: string) {
		return this.#positions.get(`${pub}/${bookId}`);
	}
	async setPosition(pub: string, bookId: string, position: Position) {
		this.#positions.set(`${pub}/${bookId}`, position);
	}
}
