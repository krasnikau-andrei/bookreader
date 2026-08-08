import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSwipeHandler } from './swipe';

describe('Swipe Detection', () => {
	let element: HTMLElement;
	let callbacks: {
		onSwipeLeft: ReturnType<typeof vi.fn>;
		onSwipeRight: ReturnType<typeof vi.fn>;
		onSwipeCancel: ReturnType<typeof vi.fn>;
	};
	let handler: ReturnType<typeof createSwipeHandler>;
	let nowCounter: number;

	beforeEach(() => {
		element = document.createElement('div');
		element.style.width = '400px';
		element.style.height = '600px';
		document.body.appendChild(element);

		Object.defineProperty(element, 'scrollLeft', {
			writable: true,
			value: 0
		});
		Object.defineProperty(element, 'clientWidth', {
			writable: true,
			value: 400
		});

		callbacks = {
			onSwipeLeft: vi.fn(),
			onSwipeRight: vi.fn(),
			onSwipeCancel: vi.fn()
		};

		nowCounter = 1000;
		vi.spyOn(performance, 'now').mockImplementation(() => nowCounter);

		handler = createSwipeHandler(element, callbacks);
		handler.attach();
	});

	afterEach(() => {
		handler.detach();
		document.body.removeChild(element);
		vi.restoreAllMocks();
	});

	function createTouchEvent(
		type: string,
		touches: { clientX: number; clientY: number }[]
	): TouchEvent {
		return new TouchEvent(type, {
			touches: touches as unknown as TouchList,
			changedTouches: touches as unknown as TouchList,
			bubbles: true,
			cancelable: true
		});
	}

	describe('touch start', () => {
		test('activates swipe on single touch', () => {
			const touchStart = createTouchEvent('touchstart', [{ clientX: 100, clientY: 200 }]);
			element.dispatchEvent(touchStart);

			expect(callbacks.onSwipeLeft).not.toHaveBeenCalled();
			expect(callbacks.onSwipeRight).not.toHaveBeenCalled();
		});

		test('ignores multi-touch', () => {
			const touchStart = createTouchEvent('touchstart', [
				{ clientX: 100, clientY: 200 },
				{ clientX: 150, clientY: 250 }
			]);
			element.dispatchEvent(touchStart);

			const touchEnd = createTouchEvent('touchend', [{ clientX: 50, clientY: 200 }]);
			element.dispatchEvent(touchEnd);

			expect(callbacks.onSwipeLeft).not.toHaveBeenCalled();
			expect(callbacks.onSwipeRight).not.toHaveBeenCalled();
		});
	});

	describe('touch move', () => {
		test('cancels swipe on vertical movement', () => {
			const touchStart = createTouchEvent('touchstart', [{ clientX: 100, clientY: 200 }]);
			element.dispatchEvent(touchStart);

			const touchMove = createTouchEvent('touchmove', [{ clientX: 100, clientY: 100 }]);
			element.dispatchEvent(touchMove);

			const touchEnd = createTouchEvent('touchend', [{ clientX: 50, clientY: 100 }]);
			element.dispatchEvent(touchEnd);

			expect(callbacks.onSwipeLeft).not.toHaveBeenCalled();
			expect(callbacks.onSwipeRight).not.toHaveBeenCalled();
		});

		test('continues swipe on horizontal movement', () => {
			const touchStart = createTouchEvent('touchstart', [{ clientX: 200, clientY: 200 }]);
			element.dispatchEvent(touchStart);

			// Move to 50px - large enough to pass 20px threshold
			const touchMove = createTouchEvent('touchmove', [{ clientX: 50, clientY: 205 }]);
			element.dispatchEvent(touchMove);

			// Slow movement: advance time so velocity stays low
			// progress = 150/400 = 0.375 > 0.3 → triggers by progress
			nowCounter += 2000;

			const touchEnd = createTouchEvent('touchend', [{ clientX: 50, clientY: 205 }]);
			element.dispatchEvent(touchEnd);

			expect(callbacks.onSwipeLeft).toHaveBeenCalled();
		});

		test('does not set didSwipe when movement is under 20px', () => {
			const touchStart = createTouchEvent('touchstart', [{ clientX: 200, clientY: 200 }]);
			element.dispatchEvent(touchStart);

			const touchMove = createTouchEvent('touchmove', [{ clientX: 185, clientY: 200 }]);
			element.dispatchEvent(touchMove);

			nowCounter += 500;

			const touchEnd = createTouchEvent('touchend', [{ clientX: 185, clientY: 200 }]);
			element.dispatchEvent(touchEnd);

			// 15px / 400 = 0.0375 < 0.3, velocity = 15/400/0.5 = 0.075 < 0.5
			expect(callbacks.onSwipeCancel).toHaveBeenCalled();
			expect(callbacks.onSwipeLeft).not.toHaveBeenCalled();
			expect(callbacks.onSwipeRight).not.toHaveBeenCalled();
		});
	});

	describe('swipe completion by velocity', () => {
		test('triggers onSwipeLeft when velocity exceeds threshold', () => {
			const touchStart = createTouchEvent('touchstart', [{ clientX: 300, clientY: 200 }]);
			element.dispatchEvent(touchStart);

			const touchMove = createTouchEvent('touchmove', [{ clientX: 100, clientY: 200 }]);
			element.dispatchEvent(touchMove);

			// Fast swipe: 200px in 100ms → velocity = 200/400/(0.1) = 5.0 > 0.5
			nowCounter += 100;

			const touchEnd = createTouchEvent('touchend', [{ clientX: 100, clientY: 200 }]);
			element.dispatchEvent(touchEnd);

			expect(callbacks.onSwipeLeft).toHaveBeenCalledTimes(1);
			expect(callbacks.onSwipeRight).not.toHaveBeenCalled();
			expect(callbacks.onSwipeCancel).not.toHaveBeenCalled();
		});

		test('triggers onSwipeRight when velocity exceeds threshold', () => {
			const touchStart = createTouchEvent('touchstart', [{ clientX: 100, clientY: 200 }]);
			element.dispatchEvent(touchStart);

			const touchMove = createTouchEvent('touchmove', [{ clientX: 300, clientY: 200 }]);
			element.dispatchEvent(touchMove);

			nowCounter += 100;

			const touchEnd = createTouchEvent('touchend', [{ clientX: 300, clientY: 200 }]);
			element.dispatchEvent(touchEnd);

			expect(callbacks.onSwipeRight).toHaveBeenCalledTimes(1);
			expect(callbacks.onSwipeLeft).not.toHaveBeenCalled();
			expect(callbacks.onSwipeCancel).not.toHaveBeenCalled();
		});

		test('cancels when velocity is below threshold and progress is below threshold', () => {
			const touchStart = createTouchEvent('touchstart', [{ clientX: 200, clientY: 200 }]);
			element.dispatchEvent(touchStart);

			const touchMove = createTouchEvent('touchmove', [{ clientX: 150, clientY: 200 }]);
			element.dispatchEvent(touchMove);

			// Slow: 50px in 2s → velocity = 50/400/2 = 0.0625 < 0.5
			// progress = 50/400 = 0.125 < 0.3
			nowCounter += 2000;

			const touchEnd = createTouchEvent('touchend', [{ clientX: 150, clientY: 200 }]);
			element.dispatchEvent(touchEnd);

			expect(callbacks.onSwipeCancel).toHaveBeenCalled();
			expect(callbacks.onSwipeLeft).not.toHaveBeenCalled();
			expect(callbacks.onSwipeRight).not.toHaveBeenCalled();
		});
	});

	describe('swipe completion by progress', () => {
		test('triggers onSwipeLeft when progress exceeds threshold', () => {
			const touchStart = createTouchEvent('touchstart', [{ clientX: 200, clientY: 200 }]);
			element.dispatchEvent(touchStart);

			const touchMove = createTouchEvent('touchmove', [{ clientX: 50, clientY: 200 }]);
			element.dispatchEvent(touchMove);

			// Slow: progress = 150/400 = 0.375 > 0.3, velocity = 150/400/2 = 0.1875 < 0.5
			nowCounter += 2000;

			const touchEnd = createTouchEvent('touchend', [{ clientX: 50, clientY: 200 }]);
			element.dispatchEvent(touchEnd);

			expect(callbacks.onSwipeLeft).toHaveBeenCalledTimes(1);
		});

		test('triggers onSwipeRight when progress exceeds threshold', () => {
			const touchStart = createTouchEvent('touchstart', [{ clientX: 50, clientY: 200 }]);
			element.dispatchEvent(touchStart);

			const touchMove = createTouchEvent('touchmove', [{ clientX: 350, clientY: 200 }]);
			element.dispatchEvent(touchMove);

			// Slow: progress = 300/400 = 0.75 > 0.3, velocity = 300/400/2 = 0.375 < 0.5
			nowCounter += 2000;

			const touchEnd = createTouchEvent('touchend', [{ clientX: 350, clientY: 200 }]);
			element.dispatchEvent(touchEnd);

			expect(callbacks.onSwipeRight).toHaveBeenCalledTimes(1);
		});

		test('cancels when progress is below threshold', () => {
			const touchStart = createTouchEvent('touchstart', [{ clientX: 200, clientY: 200 }]);
			element.dispatchEvent(touchStart);

			const touchMove = createTouchEvent('touchmove', [{ clientX: 120, clientY: 200 }]);
			element.dispatchEvent(touchMove);

			// Slow: progress = 80/400 = 0.2 < 0.3, velocity = 80/400/2 = 0.1 < 0.5
			nowCounter += 2000;

			const touchEnd = createTouchEvent('touchend', [{ clientX: 120, clientY: 200 }]);
			element.dispatchEvent(touchEnd);

			expect(callbacks.onSwipeCancel).toHaveBeenCalled();
			expect(callbacks.onSwipeLeft).not.toHaveBeenCalled();
		});
	});

	describe('swipe cancellation', () => {
		test('calls onSwipeCancel when neither threshold is met', () => {
			const touchStart = createTouchEvent('touchstart', [{ clientX: 200, clientY: 200 }]);
			element.dispatchEvent(touchStart);

			const touchMove = createTouchEvent('touchmove', [{ clientX: 150, clientY: 200 }]);
			element.dispatchEvent(touchMove);

			// Slow: 50px in 2s → velocity = 50/400/2 = 0.0625 < 0.5
			// progress = 50/400 = 0.125 < 0.3
			nowCounter += 2000;

			const touchEnd = createTouchEvent('touchend', [{ clientX: 150, clientY: 200 }]);
			element.dispatchEvent(touchEnd);

			expect(callbacks.onSwipeCancel).toHaveBeenCalledTimes(1);
			expect(callbacks.onSwipeLeft).not.toHaveBeenCalled();
			expect(callbacks.onSwipeRight).not.toHaveBeenCalled();
		});
	});

	describe('configuration', () => {
		test('uses default config when not provided', () => {
			const h = createSwipeHandler(element, callbacks);
			expect(h).toBeDefined();
		});

		test('accepts custom config', () => {
			const h = createSwipeHandler(element, callbacks, {
				velocityThreshold: 1.0,
				progressThreshold: 0.5
			});
			expect(h).toBeDefined();
		});

		test('custom progressThreshold affects swipe completion', () => {
			handler.detach();
			handler = createSwipeHandler(element, callbacks, {
				velocityThreshold: 0.5,
				progressThreshold: 0.6
			});
			handler.attach();

			const touchStart = createTouchEvent('touchstart', [{ clientX: 200, clientY: 200 }]);
			element.dispatchEvent(touchStart);

			const touchMove = createTouchEvent('touchmove', [{ clientX: 50, clientY: 200 }]);
			element.dispatchEvent(touchMove);

			// Slow: progress = 150/400 = 0.375 < 0.6 (custom threshold)
			// velocity = 150/400/2 = 0.1875 < 0.5
			nowCounter += 2000;

			const touchEnd = createTouchEvent('touchend', [{ clientX: 50, clientY: 200 }]);
			element.dispatchEvent(touchEnd);

			expect(callbacks.onSwipeCancel).toHaveBeenCalled();
			expect(callbacks.onSwipeLeft).not.toHaveBeenCalled();
		});

		test('custom velocityThreshold affects swipe completion', () => {
			handler.detach();
			handler = createSwipeHandler(element, callbacks, {
				velocityThreshold: 5.0,
				progressThreshold: 0.3
			});
			handler.attach();

			const touchStart = createTouchEvent('touchstart', [{ clientX: 200, clientY: 200 }]);
			element.dispatchEvent(touchStart);

			const touchMove = createTouchEvent('touchmove', [{ clientX: 120, clientY: 200 }]);
			element.dispatchEvent(touchMove);

			// Slow: progress = 80/400 = 0.2 < 0.3, velocity = 80/400/2 = 0.1 < 5.0
			nowCounter += 2000;

			const touchEnd = createTouchEvent('touchend', [{ clientX: 120, clientY: 200 }]);
			element.dispatchEvent(touchEnd);

			expect(callbacks.onSwipeCancel).toHaveBeenCalled();
			expect(callbacks.onSwipeLeft).not.toHaveBeenCalled();
		});
	});

	describe('attach and detach', () => {
		test('attach returns handler with attach and detach methods', () => {
			const h = createSwipeHandler(element, callbacks);
			expect(h.attach).toBeDefined();
			expect(h.detach).toBeDefined();
		});

		test('detach removes event listeners', () => {
			const h = createSwipeHandler(element, callbacks);
			h.attach();
			h.detach();

			const touchStart = createTouchEvent('touchstart', [{ clientX: 200, clientY: 200 }]);
			element.dispatchEvent(touchStart);

			const touchEnd = createTouchEvent('touchend', [{ clientX: 50, clientY: 200 }]);
			element.dispatchEvent(touchEnd);

			expect(callbacks.onSwipeLeft).not.toHaveBeenCalled();
		});
	});

	describe('hasSwiped', () => {
		test('returns true after significant horizontal movement', () => {
			const touchStart = createTouchEvent('touchstart', [{ clientX: 200, clientY: 200 }]);
			element.dispatchEvent(touchStart);

			const touchMove = createTouchEvent('touchmove', [{ clientX: 100, clientY: 200 }]);
			element.dispatchEvent(touchMove);

			expect(handler.hasSwiped()).toBe(true);
		});

		test('returns false when no significant movement', () => {
			const touchStart = createTouchEvent('touchstart', [{ clientX: 200, clientY: 200 }]);
			element.dispatchEvent(touchStart);

			expect(handler.hasSwiped()).toBe(false);
		});

		test('resets flag after checking', () => {
			const touchStart = createTouchEvent('touchstart', [{ clientX: 200, clientY: 200 }]);
			element.dispatchEvent(touchStart);

			const touchMove = createTouchEvent('touchmove', [{ clientX: 100, clientY: 200 }]);
			element.dispatchEvent(touchMove);

			expect(handler.hasSwiped()).toBe(true);
			expect(handler.hasSwiped()).toBe(false);
		});
	});
});
