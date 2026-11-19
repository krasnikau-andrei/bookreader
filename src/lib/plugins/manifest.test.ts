import { describe, test, expect } from 'vitest';
import { parsePluginSource } from './manifest';

const header = (json: string) => `/* reader-plugin\n${json}\n*/\nreader.on('position', () => {});`;

/** Parse and return either the manifest or the error message, for readable failures. */
function parse(source: string) {
	try {
		return { manifest: parsePluginSource(source).manifest };
	} catch (e) {
		return { error: (e as Error).message };
	}
}

describe('parsePluginSource', () => {
	test('reads the manifest from the header comment and keeps the whole file as code', () => {
		const source = header(
			'{"id":"together","name":"Together","version":"1.0.0","permissions":["position","position"]}'
		);
		const { manifest, code } = parsePluginSource(source);
		expect(manifest).toEqual({
			id: 'together',
			name: 'Together',
			version: '1.0.0',
			description: '',
			permissions: ['position']
		});
		expect(code).toBe(source);
	});

	test('a file without the header is not a plugin', () => {
		expect(parse('console.log(1)').error).toMatch(/reader-plugin/);
	});

	test('broken JSON says so', () => {
		expect(parse(header('{ id: together }')).error).toMatch(/not valid JSON/);
	});

	test('unknown permissions are refused, so a typo cannot slip past the user', () => {
		const result = parse(
			header('{"id":"x","name":"X","version":"1","permissions":["position","books"]}')
		);
		expect(result.error).toMatch(/Unknown permission "books"/);
	});

	test('ids are plain slugs', () => {
		const result = parse(header('{"id":"../../evil","name":"X","version":"1"}'));
		expect(result.error).toMatch(/"id"/);
	});
});
