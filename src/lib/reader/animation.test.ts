import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { animateScroll, jumpTo } from './animation';

describe('animation', () => {
	let mockElement: HTMLDivElement;
	let scrollLeftValue = 0;

	beforeEach(() => {
		mockElement = document.createElement('div');
		scrollLeftValue = 0;

		// Mock scrollLeft property
		Object.defineProperty(mockElement, 'scrollLeft', {
			get: () => scrollLeftValue,
			set: (value: number) => {
				scrollLeftValue = value;
			}
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should animate scroll to target position', () => {
		// Start animation
		animateScroll(mockElement, 400, 10);

		// Should have initiated scroll
		expect(mockElement.scrollLeft).toBeGreaterThan(0);
	});

	it('should cancel previous animation when starting new one', () => {
		// Start first animation
		animateScroll(mockElement, 400, 100);

		// Start second animation - cancels first and jumps
		animateScroll(mockElement, 800, 100);

		// Should be animating toward second target
		expect(mockElement.scrollLeft).toBeGreaterThanOrEqual(400);
	});

	it('should jump to position immediately', () => {
		// Set initial position
		scrollLeftValue = 100;

		// Jump to new position
		jumpTo(mockElement, 800);

		// Should be at target immediately
		expect(mockElement.scrollLeft).toBe(800);
	});

	it('should not animate if already at target', () => {
		// Set initial position
		scrollLeftValue = 400;

		// Try to animate to same position
		animateScroll(mockElement, 400, 10);

		// Should still be at target
		expect(mockElement.scrollLeft).toBe(400);
	});
});
