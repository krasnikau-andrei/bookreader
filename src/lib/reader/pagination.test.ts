import { describe, test, expect } from 'vitest';
import { calculateCurrentPage, calculateTotalPages, calculateScrollPercent } from './pagination';

describe('Pagination', () => {
	describe('calculateCurrentPage', () => {
		test('calculates current page from scroll position', () => {
			expect(calculateCurrentPage(0, 100)).toBe(0);
			expect(calculateCurrentPage(100, 100)).toBe(1);
			expect(calculateCurrentPage(200, 100)).toBe(2);
			expect(calculateCurrentPage(350, 100)).toBe(4);
		});
	});

	describe('calculateTotalPages', () => {
		test('calculates total pages from scroll dimensions', () => {
			expect(calculateTotalPages(300, 100)).toBe(3);
			expect(calculateTotalPages(500, 100)).toBe(5);
			expect(calculateTotalPages(250, 100)).toBe(3);
		});
	});

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
