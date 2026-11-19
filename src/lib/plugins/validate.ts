import type { ReaderMarker, Widget } from './types';

/**
 * Everything a plugin sends is untrusted. These turn it into well-formed data
 * or throw — the reader never renders a value it hasn't checked.
 */

export class PluginCallError extends Error {
	constructor(
		readonly code: string,
		message: string
	) {
		super(message);
	}
}

const bad = (message: string) => new PluginCallError('invalid-argument', message);

function isObject(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(obj: Record<string, unknown>, key: string, max: number, optional = false): string {
	const v = obj[key];
	if (v === undefined && optional) return '';
	if (typeof v !== 'string') throw bad(`"${key}" must be a string`);
	if (v.length > max) throw bad(`"${key}" is longer than ${max} characters`);
	return v;
}

const MAX_WIDGETS = 30;

export function validateWidgets(input: unknown): Widget[] {
	if (!Array.isArray(input)) throw bad('ui.set expects an array of widgets');
	if (input.length > MAX_WIDGETS) throw bad(`At most ${MAX_WIDGETS} widgets`);

	return input.map((w, i): Widget => {
		if (!isObject(w)) throw bad(`Widget ${i} must be an object`);
		switch (w.type) {
			case 'text': {
				const tone = w.tone ?? 'normal';
				if (tone !== 'normal' && tone !== 'muted' && tone !== 'error') {
					throw bad(`Widget ${i}: unknown tone "${tone}"`);
				}
				return { type: 'text', text: str(w, 'text', 1000), tone };
			}
			case 'field':
				return {
					type: 'field',
					id: str(w, 'id', 64),
					label: str(w, 'label', 80),
					value: str(w, 'value', 4000, true),
					placeholder: str(w, 'placeholder', 120, true),
					multiline: w.multiline === true
				};
			case 'code':
				return { type: 'code', label: str(w, 'label', 80), text: str(w, 'text', 200) };
			case 'button':
				return { type: 'button', id: str(w, 'id', 64), label: str(w, 'label', 60) };
			default:
				throw bad(`Widget ${i}: unknown type "${String(w.type)}"`);
		}
	});
}

const MAX_MARKERS = 20;

export function validateMarkers(input: unknown): ReaderMarker[] {
	if (!Array.isArray(input)) throw bad('markers.set expects an array');
	if (input.length > MAX_MARKERS) throw bad(`At most ${MAX_MARKERS} markers`);

	return input.map((m, i): ReaderMarker => {
		if (!isObject(m)) throw bad(`Marker ${i} must be an object`);
		const { hue, chapter, fraction } = m;
		if (typeof hue !== 'number' || !Number.isFinite(hue)) throw bad(`Marker ${i}: bad hue`);
		if (!Number.isInteger(chapter) || (chapter as number) < 0) {
			throw bad(`Marker ${i}: chapter must be a whole number >= 0`);
		}
		if (typeof fraction !== 'number' || !(fraction >= 0 && fraction <= 1)) {
			throw bad(`Marker ${i}: fraction must be between 0 and 1`);
		}
		return {
			id: str(m, 'id', 64),
			label: str(m, 'label', 40),
			hue: ((Math.round(hue) % 360) + 360) % 360,
			chapter: chapter as number,
			fraction
		};
	});
}

export interface NetRequest {
	url: URL;
	method: string;
	headers: Record<string, string>;
	body?: string;
}

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
export const MAX_BODY = 64 * 1024;

function isLoopback(hostname: string) {
	return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

export function validateNetRequest(input: unknown): NetRequest {
	if (!isObject(input)) throw bad('net.fetch expects { url, method?, headers?, body? }');

	let url: URL;
	try {
		url = new URL(str(input, 'url', 2000));
	} catch {
		throw bad(`Not a valid URL: ${String(input.url)}`);
	}
	// Plain http only for a server on this device — anything else could be read on the way
	if (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLoopback(url.hostname))) {
		throw bad('Only https:// URLs are allowed');
	}
	if (url.username || url.password) throw bad('Credentials in the URL are not allowed');

	const method = (input.method === undefined ? 'GET' : String(input.method)).toUpperCase();
	if (!METHODS.includes(method)) throw bad(`Method ${method} is not allowed`);

	const headers: Record<string, string> = {};
	if (input.headers !== undefined) {
		if (!isObject(input.headers)) throw bad('headers must be an object of strings');
		for (const [k, v] of Object.entries(input.headers)) {
			if (typeof v !== 'string') throw bad(`Header ${k} must be a string`);
			headers[k] = v;
		}
	}

	const body = input.body === undefined ? undefined : str(input, 'body', MAX_BODY);
	if (body !== undefined && method === 'GET') throw bad('GET requests cannot have a body');

	return { url, method, headers, body };
}
