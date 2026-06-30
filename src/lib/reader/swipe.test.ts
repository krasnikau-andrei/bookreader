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

	beforeEach(() => {
		element = document.createElement('div');
		element.style.width = '400px';
		element.style.height = '600px';
		document.body.appendChild(element);

		// Mock scrollLeft
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

		handler = createSwipeHandler(element, callbacks);
		handler.attach();
	});

	afterEach(() => {
		handler.detach();
		document.body.removeChild(element);
	});

	function createTouchEvent(
		type: string,
		touches: { clientX: number; clientY: number }[]
	): TouchEvent {
		const event = new TouchEvent(type, {
			touches: touches as unknown as TouchList,
			changedTouches: touches as unknown as TouchList,
			bubbles: true,
			cancelable: true
		});
		return event;
	}

	describe('touch start', () => {
		test('activates swipe on single touch', () => {
			const touchStart = createTouchEvent('touchstart', [{ clientX: 100, clientY: 200 }]);
			element.dispatchEvent(touchStart);

			// Swipe should be active - will be verified by subsequent behavior
			expect(callbacks.onSwipeLeft).not.toHaveBeenCalled();
			expect(callbacks.onSwipeRight).not.toHaveBeenCalled();
		});

		test('ignores multi-touch', () => {
			const touchStart = createTouchEvent('touchstart', [
				{ clientX: 100, clientY: 200 },
				{ clientX: 150, clientY: 250 }
			]);
			element.dispatchEvent(touchStart);

			// Complete a swipe - should not trigger any callback
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

			// Complete the gesture
			const touchEnd = createTouchEvent('touchend', [{ clientX: 50, clientY: 100 }]);
			element.dispatchEvent(touchEnd);

			// Should not trigger swipe callbacks due to vertical movement
			expect(callbacks.onSwipeLeft).not.toHaveBeenCalled();
			expect(callbacks.onSwipeRight).not.toHaveBeenCalled();
		});

		test('continues swipe on horizontal movement', () => {
			const touchStart = createTouchEvent('touchstart', [{ clientX: 200, clientY: 200 }]);
			element.dispatchEvent(touchStart);

			const touchMove = createTouchEvent('touchmove', [{ clientX: 150, clientY: 205 }]);
			element.dispatchEvent(touchMove);

			// Complete a strong left swipe
			const touchEnd = createTouchEvent('touchend', [{ clientX: 50, clientY: 205 }]);
			element.dispatchEvent(touchEnd);

			expect(callbacks.onSwipeLeft).toHaveBeenCalled();
		});
	});

	describe('swipe completion by velocity', () => {
		test('triggers onSwipeLeft when velocity exceeds threshold', () => {
			const touchStart = createTouchEvent('touchstart', [{ clientX: 300, clientY: 200 }]);
			element.dispatchEvent(touchStart);

			// Need touchmove to update lastX/lastTime for velocity calculation
			const touchMove = createTouchEvent('touchmove', [{ clientX: 100, clientY: 200 }]);
			element.dispatchEvent(touchMove);

			// Simulate fast swipe: 200px movement detected
			const touchEnd = createTouchEvent('touchend', [{ clientX: 100, clientY: 200 }]);
			element.dispatchEvent(touchEnd);

			expect(callbacks.onSwipeLeft).toHaveBeenCalledTimes(1);
			expect(callbacks.onSwipeRight).not.toHaveBeenCalled();
			expect(callbacks.onSwipeCancel).not.toHaveBeenCalled();
		});

		test('triggers onSwipeRight when velocity exceeds threshold', () => {
			const touchStart = createTouchEvent('touchstart', [{ clientX: 100, clientY: 200 }]);
			element.dispatchEvent(touchStart);

			// Need touchmove to update lastX/lastTime for velocity calculation
			const touchMove = createTouchEvent('touchmove', [{ clientX: 300, clientY: 200 }]);
			element.dispatchEvent(touchMove);

			// Simulate fast right swipe
			const touchEnd = createTouchEvent('touchend', [{ clientX: 300, clientY: 200 }]);
			element.dispatchEvent(touchEnd);

			expect(callbacks.onSwipeRight).toHaveBeenCalledTimes(1);
			expect(callbacks.onSwipeLeft).not.toHaveBeenCalled();
			expect(callbacks.onSwipeCancel).not.toHaveBeenCalled();
		});
	});

	describe('swipe completion by progress', () => {
		test('triggers onSwipeLeft when progress exceeds threshold', () => {
			// Start at scroll position 0
			element.scrollLeft = 0;

			const touchStart = createTouchEvent('touchstart', [{ clientX: 200, clientY: 200 }]);
			element.dispatchEvent(touchStart);

			// Move scroll to 150px (37.5% of viewport, above 30% threshold)
			element.scrollLeft = 150;

			// Need touchmove to update lastX for direction detection
			const touchMove = createTouchEvent('touchmove', [{ clientX: 50, clientY: 200 }]);
			element.dispatchEvent(touchMove);

			const touchEnd = createTouchEvent('touchend', [{ clientX: 50, clientY: 200 }]);
			element.dispatchEvent(touchEnd);

			expect(callbacks.onSwipeLeft).toHaveBeenCalledTimes(1);
		});

		test('triggers onSwipeRight when progress exceeds threshold', () => {
			// For right swipe: finger moves from left to right
			// Start touch at x=50 (left side)
			const touchStart = createTouchEvent('touchstart', [{ clientX: 50, clientY: 200 }]);
			element.dispatchEvent(touchStart);

			// Move finger to x=350 (right side) - 300px movement = 75% progress
			const touchMove = createTouchEvent('touchmove', [{ clientX: 350, clientY: 200 }]);
			element.dispatchEvent(touchMove);

			// End touch at x=350
			const touchEnd = createTouchEvent('touchend', [{ clientX: 350, clientY: 200 }]);
			element.dispatchEvent(touchEnd);

			expect(callbacks.onSwipeRight).toHaveBeenCalledTimes(1);
		});
	});

	describe('swipe cancellation', () => {
		test('calls onSwipeCancel when neither threshold is met', () => {
			element.scrollLeft = 0;

			const touchStart = createTouchEvent('touchstart', [{ clientX: 200, clientY: 200 }]);
			element.dispatchEvent(touchStart);

			// Small movement: 50px = 12.5% progress (below 30% threshold)
			// And slow movement means low velocity
			element.scrollLeft = 50;

			const touchEnd = createTouchEvent('touchend', [{ clientX: 150, clientY: 200 }]);
			element.dispatchEvent(touchEnd);

			expect(callbacks.onSwipeCancel).toHaveBeenCalledTimes(1);
			expect(callbacks.onSwipeLeft).not.toHaveBeenCalled();
			expect(callbacks.onSwipeRight).not.toHaveBeenCalled();
		});
	});

	describe('configuration', () => {
		test('uses default config when not provided', () => {
			const handler = createSwipeHandler(element, callbacks);
			expect(handler).toBeDefined();
		});

		test('accepts custom config', () => {
			const handler = createSwipeHandler(element, callbacks, { velocityThreshold: 1.0, progressThreshold: 0.5 });
			expect(handler).toBeDefined();
		});
	});

	describe('attach and detach', () => {
		test('attach returns handler with attach and detach methods', () => {
			const handler = createSwipeHandler(element, callbacks);
			expect(handler.attach).toBeDefined();
			expect(handler.detach).toBeDefined();
		});

		test('detach removes event listeners', () => {
			const handler = createSwipeHandler(element, callbacks);
			handler.attach();
			handler.detach();

			// After detach, events should not trigger callbacks
			const touchStart = createTouchEvent('touchstart', [{ clientX: 200, clientY: 200 }]);
			element.dispatchEvent(touchStart);

			const touchEnd = createTouchEvent('touchend', [{ clientX: 50, clientY: 200 }]);
			element.dispatchEvent(touchEnd);

			// Callbacks should not be called because listeners are removed
			// Note: In jsdom, removing listeners might not work perfectly,
			// but the API should still be callable
			expect(callbacks.onSwipeLeft).not.toHaveBeenCalled();
		});
	});
});
