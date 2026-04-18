import { describe, test, expect } from 'vitest';
import { generateFileHash } from './hash';

describe('File Hash', () => {
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
});
