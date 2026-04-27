import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { animateScroll, jumpTo } from './animation';

describe('animation', () => {
	let mockElement: HTMLDivElement;
	let scrollLeftValue = 0;
	let rafCallbacks: Array<(timestamp: number) => void> = [];
	let mockTime = 0;

	beforeEach(() => {
		mockElement = document.createElement('div');
		scrollLeftValue = 0;
		rafCallbacks = [];
		mockTime = 0;

		// Mock clientWidth for calculatePagePosition
		Object.defineProperty(mockElement, 'clientWidth', {
			get: () => 400,
			configurable: true
		});

		// Mock scrollLeft property
		Object.defineProperty(mockElement, 'scrollLeft', {
			get: () => scrollLeftValue,
			set: (value: number) => {
				scrollLeftValue = value;
			},
			configurable: true
		});

		// Mock requestAnimationFrame to capture callbacks
		vi.stubGlobal('requestAnimationFrame', (callback: (timestamp: number) => void) => {
			rafCallbacks.push(callback);
			return rafCallbacks.length; // Return ID
		});

		// Mock cancelAnimationFrame
		vi.stubGlobal('cancelAnimationFrame', (id: number) => {
			// Remove callback (id is 1-based index)
			if (id > 0 && id <= rafCallbacks.length) {
				rafCallbacks[id - 1] = null as unknown as (timestamp: number) => void;
			}
		});

		// Mock performance.now()
		vi.stubGlobal('performance', {
			now: () => mockTime
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.clearAllMocks();
	});

	// Helper to run all pending RAF callbacks
	function runRAFCallbacks() {
		const callbacks = [...rafCallbacks];
		rafCallbacks = [];
		callbacks.forEach((cb) => {
			if (cb) cb(mockTime);
		});
	}

	it('should animate scroll to target position', () => {
		// Start animation at time 0
		mockTime = 0;
		animateScroll(mockElement, 400, 100);

		// Run first frame at time 50
		mockTime = 50;
		runRAFCallbacks();

		// Should have initiated scroll (halfway through animation)
		expect(mockElement.scrollLeft).toBeGreaterThan(0);
		expect(mockElement.scrollLeft).toBeLessThan(400);
	});

	it('should cancel previous animation when starting new one', () => {
		// Start first animation
		mockTime = 0;
		animateScroll(mockElement, 400, 100);

		// Run first frame
		mockTime = 50;
		runRAFCallbacks();

		// Start second animation - cancels first
		animateScroll(mockElement, 800, 100);

		// Run first frame of second animation
		mockTime = 100;
		runRAFCallbacks();

		// Should be animating toward second target
		expect(mockElement.scrollLeft).toBeGreaterThanOrEqual(400);
	});

	it('should jump to position immediately', () => {
		// Set initial position
		scrollLeftValue = 100;

		// Jump to new position (800 rounds to 800 with clientWidth=400)
		jumpTo(mockElement, 800);

		// Should be at target immediately (rounded to page boundary)
		expect(mockElement.scrollLeft).toBe(800);
	});

	it('should not animate if already at target', () => {
		// Set initial position (400 is already at page boundary)
		scrollLeftValue = 400;

		// Try to animate to same position
		animateScroll(mockElement, 400, 10);

		// Should still be at target
		expect(mockElement.scrollLeft).toBe(400);
	});
});
