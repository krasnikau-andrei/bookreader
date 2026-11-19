import { PERMISSIONS, type Permission, type PluginManifest } from './types';

/**
 * A plugin is one .js file that starts with its manifest in a comment:
 *
 *   /* reader-plugin
 *   { "id": "my-plugin", "name": "My plugin", "version": "1.0.0",
 *     "description": "...", "permissions": ["position"] }
 *   *\/
 *
 * One file is easy to share and to install from the phone's Files app.
 */
const HEADER_RE = /^\s*\/\*\s*reader-plugin\s*([\s\S]*?)\*\//;

export class ManifestError extends Error {}

function requireString(obj: Record<string, unknown>, key: string, max: number): string {
	const value = obj[key];
	if (typeof value !== 'string' || value.trim() === '') {
		throw new ManifestError(`"${key}" must be a non-empty string`);
	}
	if (value.length > max) throw new ManifestError(`"${key}" is longer than ${max} characters`);
	return value.trim();
}

export function validateManifest(raw: unknown): PluginManifest {
	if (!raw || typeof raw !== 'object') throw new ManifestError('Manifest must be an object');
	const obj = raw as Record<string, unknown>;

	const id = requireString(obj, 'id', 64);
	if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) {
		throw new ManifestError(`"id" may only hold lowercase letters, digits and dashes: "${id}"`);
	}

	const permissions = obj.permissions ?? [];
	if (!Array.isArray(permissions)) throw new ManifestError('"permissions" must be an array');
	for (const p of permissions) {
		if (!PERMISSIONS.includes(p as Permission)) {
			throw new ManifestError(`Unknown permission "${p}". Known: ${PERMISSIONS.join(', ')}`);
		}
	}

	return {
		id,
		name: requireString(obj, 'name', 60),
		version: requireString(obj, 'version', 20),
		description: typeof obj.description === 'string' ? obj.description.slice(0, 300) : '',
		permissions: [...new Set(permissions as Permission[])]
	};
}

export function parsePluginSource(source: string): { manifest: PluginManifest; code: string } {
	const match = HEADER_RE.exec(source);
	if (!match) {
		throw new ManifestError('The file must start with a /* reader-plugin { ... } */ header');
	}
	let raw: unknown;
	try {
		raw = JSON.parse(match[1]);
	} catch (e) {
		throw new ManifestError(`The reader-plugin header is not valid JSON: ${(e as Error).message}`);
	}
	return { manifest: validateManifest(raw), code: source };
}
