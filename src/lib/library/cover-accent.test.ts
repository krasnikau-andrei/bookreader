import { describe, test, expect } from 'vitest';
import { accentFromPixels } from './cover-accent';

function pixels(...colors: [number, number, number, number][]): number[] {
	return colors.flatMap(([r, g, b, count]) => Array(count).fill([r, g, b, 255]).flat());
}

describe('accentFromPixels', () => {
	test('ignores grey pixels and brightens the saturated ones', () => {
		const data = pixels([100, 20, 20, 30], [128, 128, 128, 500]);
		expect(accentFromPixels(data)).toBe('rgb(200, 40, 40)');
	});

	test('returns null for a grey or white cover', () => {
		const data = pixels([240, 240, 240, 500], [10, 10, 10, 76]);
		expect(accentFromPixels(data)).toBeNull();
	});
});
