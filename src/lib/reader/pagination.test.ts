import { describe, test, expect } from 'vitest';
import { calculateScrollPercent } from './pagination';

describe('Pagination', () => {
	describe('calculateScrollPercent', () => {
		test('calculates scroll percentage', () => {
			expect(calculateScrollPercent(0, 300, 100)).toBe(0);
			expect(calculateScrollPercent(100, 300, 100)).toBe(0.5);
			expect(calculateScrollPercent(200, 300, 100)).toBe(1);
		});

		test('handles edge cases', () => {
			expect(calculateScrollPercent(0, 100, 100)).toBe(0);
			expect(calculateScrollPercent(50, 100, 100)).toBe(0);
		});
	});
});
