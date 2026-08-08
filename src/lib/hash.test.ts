import { describe, test, expect, vi, afterEach } from 'vitest';
import { generateFileHash } from './hash';

describe('File Hash', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test('generates consistent hash for same content', async () => {
		const buffer1 = new Uint8Array([1, 2, 3, 4, 5]).buffer;
		const buffer2 = new Uint8Array([1, 2, 3, 4, 5]).buffer;

		const hash1 = await generateFileHash(buffer1);
		const hash2 = await generateFileHash(buffer2);

		expect(hash1).toBe(hash2);
		expect(hash1).toHaveLength(64); // SHA-256 hex string
	});

	test('generates different hash for different content', async () => {
		const buffer1 = new Uint8Array([1, 2, 3, 4, 5]).buffer;
		const buffer2 = new Uint8Array([1, 2, 3, 4, 6]).buffer;

		const hash1 = await generateFileHash(buffer1);
		const hash2 = await generateFileHash(buffer2);

		expect(hash1).not.toBe(hash2);
	});

	test('generates valid hex string', async () => {
		const buffer = new Uint8Array([1, 2, 3, 4, 5]).buffer;
		const hash = await generateFileHash(buffer);

		expect(hash).toMatch(/^[a-f0-9]{64}$/);
	});

	test('handles empty buffer', async () => {
		const buffer = new Uint8Array([]).buffer;
		const hash = await generateFileHash(buffer);

		expect(hash).toHaveLength(64);
		expect(hash).toMatch(/^[a-f0-9]{64}$/);
	});

	test('fallback hash is deterministic when crypto.subtle is unavailable', async () => {
		vi.stubGlobal('crypto', { subtle: undefined });
		const hashes = await Promise.all(
			Array.from({ length: 10 }, () => generateFileHash(new Uint8Array([1, 2, 3, 4, 5]).buffer))
		);
		expect(
			new Set(hashes).size,
			`expected identical hashes for identical bytes, got: ${hashes.join(', ')}`
		).toBe(1);
	});

	test('fallback hash includes byte length in output', async () => {
		vi.stubGlobal('crypto', { subtle: undefined });
		const buffer = new Uint8Array([1, 2, 3, 4, 5]).buffer;
		const hash = await generateFileHash(buffer);
		expect(hash).toContain('-5');
	});

	test('fallback hash produces different results for different input sizes', async () => {
		vi.stubGlobal('crypto', { subtle: undefined });
		const hash5 = await generateFileHash(new Uint8Array([1, 2, 3, 4, 5]).buffer);
		const hash10 = await generateFileHash(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).buffer);
		expect(hash5).not.toBe(hash10);
	});

	test('fallback hash produces different results for different content of same size', async () => {
		vi.stubGlobal('crypto', { subtle: undefined });
		const hash1 = await generateFileHash(new Uint8Array([1, 2, 3, 4, 5]).buffer);
		const hash2 = await generateFileHash(new Uint8Array([5, 4, 3, 2, 1]).buffer);
		expect(hash1).not.toBe(hash2);
	});
});
