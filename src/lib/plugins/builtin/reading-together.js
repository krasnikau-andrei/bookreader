/* reader-plugin
{
	"id": "reading-together",
	"name": "Читаем вместе",
	"version": "1.0.0",
	"description": "Показывает, где в книге сейчас твои друзья, и делится твоим местом. На твой сервер уходят имя, id книги и позиция.",
	"permissions": ["position", "markers", "network"]
}
*/

/**
 * @typedef {import('../plugin-api').PluginApi} PluginApi
 * @typedef {import('../plugin-api').PluginError} PluginError
 * @typedef {import('../types').ReadingPosition} ReadingPosition
 * @typedef {import('../types').Widget} Widget
 * @typedef {{ name: string, chapter: number, fraction: number, percent: number }} FriendPosition
 * @typedef {FriendPosition | { missing: true }} FriendState
 * @typedef {{ text: string, tone: 'muted' | 'error' }} Status
 */

/** The sandbox puts `reader` on the global object; this gives it types in the editor */
const reader = /** @type {PluginApi} */ (/** @type {any} */ (globalThis).reader);

const POLL_MS = 20_000;
const PUSH_DELAY_MS = 5_000;
const KEY_RE = /^[0-9a-f]{32}$/;

const settings = { server: '', name: '', friends: '' };
/** @typedef {keyof typeof settings} SettingKey */

let secret = '';
let myKey = '';
/** @type {string[]} */
let grantedHosts = [];
/** @type {ReadingPosition | null} */
let position = null;
/** @type {ReturnType<typeof setTimeout> | undefined} */
let pushTimer;
let lastPushed = '';
let nameSent = false;
/** @type {Status} */
let statusLine = { text: '', tone: 'muted' };
/** @type {Record<string, FriendState>} friend key → where they are in this book */
let friends = {};

/** @param {Uint8Array} bytes */
const hex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

/** @param {string} s */
async function publicKeyOf(s) {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
	return hex(new Uint8Array(digest)).slice(0, 32);
}

/**
 * Same key → same colour on every phone
 * @param {string} key
 */
const hueOf = (key) => parseInt(key.slice(0, 6), 16) % 360;

function serverUrl() {
	return settings.server.trim().replace(/\/+$/, '');
}

function friendKeys() {
	const keys = settings.friends.toLowerCase().split(/[\s,;]+/);
	return [...new Set(keys.filter((k) => KEY_RE.test(k) && k !== myKey))];
}

/** @param {Status} s */
function setStatus(s) {
	statusLine = s;
	render();
}

/**
 * @param {unknown} err
 * @returns {Status}
 */
function explain(err) {
	const e = /** @type {PluginError} */ (err);
	if (e.code === 'host-not-allowed') {
		return { text: 'Разреши доступ к серверу — запрос выше, в карточке плагина.', tone: 'error' };
	}
	if (e.code === 'invalid-argument') return { text: `Адрес сервера: ${e.message}`, tone: 'error' };
	return { text: `Сервер недоступен: ${e.message}`, tone: 'error' };
}

/**
 * @param {'GET' | 'PUT'} method
 * @param {string} path
 * @param {object} [body] sent with the secret, so only the owner can write
 */
async function api(method, path, body) {
	const res = await reader.net.fetch(`${serverUrl()}${path}`, {
		method,
		headers: body
			? { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` }
			: undefined,
		body: body ? JSON.stringify(body) : undefined
	});
	return { status: res.status, data: res.body ? JSON.parse(res.body) : null };
}

async function pushName() {
	await api('PUT', `/v1/readers/${myKey}/profile`, { name: settings.name.trim() });
	nameSent = true;
}

async function pushPosition() {
	if (!serverUrl() || !position) return;
	const snapshot = JSON.stringify(position);
	if (snapshot === lastPushed) return;
	try {
		if (!nameSent) await pushName();
		const { bookId, chapter, fraction, percent } = position;
		const res = await api('PUT', `/v1/readers/${myKey}/books/${bookId}`, {
			chapter,
			fraction,
			percent
		});
		if (res.status !== 200) throw new Error(res.data?.error ?? `HTTP ${res.status}`);
		lastPushed = snapshot;
		const time = new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
		setStatus({ text: `Твоя позиция отправлена в ${time}`, tone: 'muted' });
	} catch (err) {
		setStatus(explain(err));
	}
}

function schedulePush() {
	clearTimeout(pushTimer);
	pushTimer = setTimeout(pushPosition, PUSH_DELAY_MS);
}

async function pollFriends() {
	const keys = friendKeys();
	if (!serverUrl() || !position || keys.length === 0) {
		friends = {};
		await showFriends();
		return;
	}
	/** @type {Record<string, FriendState>} */
	const next = {};
	for (const key of keys) {
		try {
			const res = await api('GET', `/v1/readers/${key}/books/${position.bookId}`);
			next[key] = res.status === 200 ? res.data : { missing: true };
		} catch (err) {
			setStatus(explain(err));
			return;
		}
	}
	friends = next;
	await showFriends();
}

async function showFriends() {
	const markers = Object.entries(friends).flatMap(([key, f]) =>
		'missing' in f
			? []
			: [
					{
						id: key,
						label: f.name || key.slice(0, 6),
						hue: hueOf(key),
						chapter: f.chapter,
						fraction: f.fraction
					}
				]
	);
	await reader.markers.set(markers);
	render();
}

/** @returns {Widget[]} */
function friendLines() {
	return Object.entries(friends).map(([key, f]) => {
		if ('missing' in f) {
			return { type: 'text', tone: 'muted', text: `${key.slice(0, 6)} — не открывал(а) эту книгу` };
		}
		const who = f.name || key.slice(0, 6);
		const where = `глава ${f.chapter + 1}, ${Math.round(f.percent * 100)}% книги`;
		return { type: 'text', text: `${who} — ${where}` };
	});
}

function render() {
	/** @type {Widget[]} */
	const widgets = [
		{
			type: 'text',
			tone: 'muted',
			text: 'Друзья с той же книгой видят тебя полоской на шкале и линией в тексте. А ты — их.'
		},
		{
			type: 'field',
			id: 'server',
			label: 'Сервер',
			value: settings.server,
			placeholder: 'https://reading.example.com'
		},
		{
			type: 'field',
			id: 'name',
			label: 'Твоё имя',
			value: settings.name,
			placeholder: 'Как тебя видят друзья'
		},
		{ type: 'code', label: 'Твой ключ — отправь его другу', text: myKey },
		{
			type: 'field',
			id: 'friends',
			label: 'Ключи друзей, по одному в строке',
			value: settings.friends,
			multiline: true
		},
		...friendLines()
	];
	if (statusLine.text) widgets.push({ type: 'text', ...statusLine });
	reader.ui.set(widgets);
}

async function start() {
	Object.assign(settings, (await reader.storage.get('settings')) ?? {});
	const saved = await reader.storage.get('secret');
	if (typeof saved === 'string') {
		secret = saved;
	} else {
		secret = hex(crypto.getRandomValues(new Uint8Array(32)));
		await reader.storage.set('secret', secret);
	}
	myKey = await publicKeyOf(secret);
	render();
	setInterval(pollFriends, POLL_MS);
}

const ready = start();

// Events can arrive before the key is loaded — every handler waits for it

reader.on('position', async (p) => {
	await ready;
	const bookChanged = !position || position.bookId !== p.bookId;
	position = p;
	schedulePush();
	if (bookChanged) pollFriends();
});

reader.on('hosts', async ({ granted }) => {
	await ready;
	const before = grantedHosts.join();
	grantedHosts = granted;
	// Just allowed — try again right away instead of waiting for the next round
	if (before !== granted.join()) {
		lastPushed = '';
		pushPosition();
		pollFriends();
	}
});

reader.on('ui', async ({ id, value }) => {
	await ready;
	if (!(id in settings) || value === undefined) return;
	settings[/** @type {SettingKey} */ (id)] = value;
	await reader.storage.set('settings', { ...settings });
	if (id === 'name') nameSent = false;
	if (id === 'server' || id === 'name') {
		lastPushed = '';
		pushPosition();
	}
	if (id === 'server' || id === 'friends') pollFriends();
	render();
});
