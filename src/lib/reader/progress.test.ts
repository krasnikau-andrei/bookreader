import { describe, test, expect } from 'vitest';
import { calculateBookProgress, measureChapterContent } from './progress';

describe('calculateBookProgress', () => {
	test('returns 0 for empty chapterSizes', () => {
		const result = calculateBookProgress([], 0, 0);
		expect(result).toBe(0);
	});

	test('returns 0 for missing chapterSizes', () => {
		const result = calculateBookProgress(undefined as unknown as number[], 0, 0);
		expect(result).toBe(0);
	});

	test('progress is sum of completed chapters + current partial / total', () => {
		// Chapters: [100, 200, 300] total = 600
		// currentChapter = 1, scrollPercent = 0.5
		// beforeCurrent = 100, currentProgress = 200 * 0.5 = 100
		// result = (100 + 100) / 600 = 200/600 = 0.333...
		const result = calculateBookProgress([100, 200, 300], 1, 0.5);
		expect(result).toBeCloseTo(0.3333, 4);
	});

	test('progress is 1.0 when on last chapter at 100%', () => {
		const result = calculateBookProgress([100, 200], 1, 1);
		expect(result).toBe(1);
	});

	test('progress is 0 when on first chapter at 0%', () => {
		const result = calculateBookProgress([100, 200], 0, 0);
		expect(result).toBe(0);
	});

	test('clamps scrollPercent between 0 and 1', () => {
		const result = calculateBookProgress([100, 200], 1, -0.5);
		expect(result).toBeCloseTo(0.3333, 4);
	});

	test('handles very large chapter size differences', () => {
		const result = calculateBookProgress([1, 999], 0, 0.5);
		expect(result).toBeCloseTo(0.0005, 4);
	});
});

describe('measureChapterContent', () => {
	test('plain text length is unchanged', () => {
		const content = '<p>Hello world</p>';
		expect(measureChapterContent(content)).toBe(content.length);
	});

	test('strips long base64 data URIs from length', () => {
		const fakeImg = 'x'.repeat(500);
		const content = `<p>Text</p><img src="data:image/jpeg;base64,${fakeImg}" />`;
		const stripped = measureChapterContent(content);
		expect(stripped).toBeLessThan(content.length);
		expect(stripped).toBe('<p>Text</p>'.length);
	});

	test('strips short data URIs', () => {
		const content = '<p>Hello</p><img src="data:image/svg+xml,<svg></svg>" />';
		const stripped = measureChapterContent(content);
		expect(stripped).toBeLessThan(content.length);
		expect(stripped).toBe('<p>Hello</p>'.length);
	});

	test('strips SVG image href data URIs', () => {
		const content = '<p>Text</p><image href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAE" />';
		const stripped = measureChapterContent(content);
		expect(stripped).toBeLessThan(content.length);
		expect(stripped).toBe('<p>Text</p>'.length);
	});
});
