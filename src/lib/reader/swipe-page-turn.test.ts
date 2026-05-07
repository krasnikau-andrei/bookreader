import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSwipeHandler } from './swipe';
import { animateScroll } from './animation';

/**
 * Integration tests: swipe handler + page-turn logic (like ReaderContent)
 *
 * These tests reproduce two real swipe bugs on mobile:
 *
 * Bug 1 — Small swipe freezes page:
 *   User swipes <30% of viewport → native scroll moves scrollLeft partway between pages
 *   → swipeHandler cancels → nothing snaps scrollLeft back → page stuck between snap points
 *
 * Bug 2 — Large swipe jumps two pages:
 *   User swipes >30% of viewport → native scroll moves scrollLeft e.g. 65% of a page
 *   → onSwipeLeft fires → handleRightTap reads current scrollLeft (65%) and adds clientWidth
 *   → newScroll = 0.65 + 1.0 = 1.65 viewports → calculatePagePosition rounds to 2.0
 *   → page jumps TWO pages instead of one
 */

describe('swipe + page-turn integration', () => {
	let element: HTMLElement;
	let scrollLeftValue = 0;
	let mockTime = 0;
	let rafCallbacks: Array<(timestamp: number) => void> = [];
	let onSwipeLeft: ReturnType<typeof vi.fn>;
	let onSwipeRight: ReturnType<typeof vi.fn>;
	let onSwipeCancel: ReturnType<typeof vi.fn>;
	let onPageChange: ReturnType<typeof vi.fn>;
	let handler: ReturnType<typeof createSwipeHandler>;
	const CLIENT_WIDTH = 400;

	function mockScrollLeft(value: number) {
		scrollLeftValue = value;
		Object.defineProperty(element, 'scrollLeft', {
			writable: true,
			value: scrollLeftValue
		});
	}

	function simulateNativeScroll(newScrollLeft: number) {
		mockScrollLeft(newScrollLeft);
		element.dispatchEvent(new Event('scroll'));
	}

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

	function runRAFCallbacks() {
		const callbacks = [...rafCallbacks];
		rafCallbacks = [];
		callbacks.forEach((cb) => {
			if (cb) cb(mockTime);
		});
	}

	beforeEach(() => {
		element = document.createElement('div');
		element.style.width = `${CLIENT_WIDTH}px`;
		element.style.height = '600px';
		document.body.appendChild(element);

		scrollLeftValue = 0;
		mockTime = 0;
		rafCallbacks = [];

		vi.stubGlobal('performance', {
			now: () => mockTime
		});

		vi.stubGlobal('requestAnimationFrame', (callback: (timestamp: number) => void) => {
			rafCallbacks.push(callback);
			return rafCallbacks.length;
		});

		vi.stubGlobal('cancelAnimationFrame', (id: number) => {
			if (id > 0 && id <= rafCallbacks.length) {
				rafCallbacks[id - 1] = null as unknown as (timestamp: number) => void;
			}
		});

		Object.defineProperty(element, 'scrollLeft', {
			writable: true,
			value: scrollLeftValue
		});
		Object.defineProperty(element, 'clientWidth', {
			writable: true,
			value: CLIENT_WIDTH
		});
		Object.defineProperty(element, 'scrollWidth', {
			writable: true,
			value: CLIENT_WIDTH * 5
		});

		onSwipeLeft = vi.fn();
		onSwipeRight = vi.fn();
		onSwipeCancel = vi.fn();
		onPageChange = vi.fn();

		let swipeStartScroll = 0;

		handler = createSwipeHandler(element, {
			onSwipeStart: () => {
				swipeStartScroll = element.scrollLeft;
			},
			onSwipeLeft: () => {
				onSwipeLeft();
				const maxScroll = element.scrollWidth - element.clientWidth;
				const newScroll = swipeStartScroll + element.clientWidth;
				const target = Math.min(maxScroll, newScroll);
				onPageChange(target);
				animateScroll(element, target, 250);
			},
			onSwipeRight: () => {
				onSwipeRight();
				const newScroll = swipeStartScroll - element.clientWidth;
				const target = Math.max(0, newScroll);
				onPageChange(target);
				animateScroll(element, target, 250);
			},
			onSwipeCancel: () => {
				onSwipeCancel();
				animateScroll(element, swipeStartScroll, 200);
			}
		});
		handler.attach();
	});

	afterEach(() => {
		handler.detach();
		document.body.removeChild(element);
		vi.unstubAllGlobals();
	});

	describe('Bug 1: small swipe no longer freezes page between snap points', () => {
		test('cancelled swipe animates scroll back to starting page boundary', () => {
			mockScrollLeft(0);

			const touchStart = createTouchEvent('touchstart', [{ clientX: 200, clientY: 200 }]);
			element.dispatchEvent(touchStart);

			mockTime = 300;
			simulateNativeScroll(60);

			const touchMove = createTouchEvent('touchmove', [{ clientX: 140, clientY: 200 }]);
			element.dispatchEvent(touchMove);

			const touchEnd = createTouchEvent('touchend', [{ clientX: 140, clientY: 200 }]);
			element.dispatchEvent(touchEnd);

			expect(onSwipeCancel).toHaveBeenCalledTimes(1);

			// Run cancel animation to completion (200ms duration)
			mockTime = 500;
			runRAFCallbacks();

			expect(element.scrollLeft).toBe(0);
		});

		test('cancelled right-swipe animates scroll back to starting page', () => {
			mockScrollLeft(400);

			const touchStart = createTouchEvent('touchstart', [{ clientX: 200, clientY: 200 }]);
			element.dispatchEvent(touchStart);

			mockTime = 300;
			simulateNativeScroll(440);

			const touchMove = createTouchEvent('touchmove', [{ clientX: 240, clientY: 200 }]);
			element.dispatchEvent(touchMove);

			const touchEnd = createTouchEvent('touchend', [{ clientX: 240, clientY: 200 }]);
			element.dispatchEvent(touchEnd);

			expect(onSwipeCancel).toHaveBeenCalledTimes(1);

			// Run cancel animation to completion (200ms duration)
			mockTime = 500;
			runRAFCallbacks();

			expect(element.scrollLeft).toBe(400);
		});
	});

	describe('Bug 2: large swipe advances exactly one page', () => {
		test('completed left swipe computes target from start scroll, not current native-scrolled position', () => {
			mockScrollLeft(0);

			const touchStart = createTouchEvent('touchstart', [{ clientX: 200, clientY: 200 }]);
			element.dispatchEvent(touchStart);

			mockTime = 300;
			simulateNativeScroll(260);

			const touchMove = createTouchEvent('touchmove', [{ clientX: 60, clientY: 200 }]);
			element.dispatchEvent(touchMove);

			const touchEnd = createTouchEvent('touchend', [{ clientX: 60, clientY: 200 }]);
			element.dispatchEvent(touchEnd);

			expect(onSwipeLeft).toHaveBeenCalledTimes(1);
			expect(onSwipeCancel).not.toHaveBeenCalled();

			// handleRightTap uses swipeStartScroll(=0) + clientWidth(400) = 400
			const calledWith = onPageChange.mock.calls[0][0];
			expect(calledWith).toBe(400);
		});

		test('completed right swipe computes target from start scroll, not current native-scrolled position', () => {
			mockScrollLeft(800);

			const touchStart = createTouchEvent('touchstart', [{ clientX: 200, clientY: 200 }]);
			element.dispatchEvent(touchStart);

			mockTime = 300;
			simulateNativeScroll(520);

			const touchMove = createTouchEvent('touchmove', [{ clientX: 360, clientY: 200 }]);
			element.dispatchEvent(touchMove);

			const touchEnd = createTouchEvent('touchend', [{ clientX: 360, clientY: 200 }]);
			element.dispatchEvent(touchEnd);

			expect(onSwipeRight).toHaveBeenCalledTimes(1);

			// handleLeftTap uses swipeStartScroll(=800) - clientWidth(400) = 400
			const calledWith = onPageChange.mock.calls[0][0];
			expect(calledWith).toBe(400);
		});

		test('extremely fast large swipe still advances exactly one page', () => {
			mockScrollLeft(0);

			const touchStart = createTouchEvent('touchstart', [{ clientX: 400, clientY: 200 }]);
			element.dispatchEvent(touchStart);

			mockTime = 50;
			simulateNativeScroll(350);

			const touchMove = createTouchEvent('touchmove', [{ clientX: 60, clientY: 200 }]);
			element.dispatchEvent(touchMove);

			const touchEnd = createTouchEvent('touchend', [{ clientX: 60, clientY: 200 }]);
			element.dispatchEvent(touchEnd);

			expect(onSwipeLeft).toHaveBeenCalledTimes(1);

			// swipeStartScroll(0) + clientWidth(400) = 400
			const calledWith = onPageChange.mock.calls[0][0];
			expect(calledWith).toBe(400);
		});
	});
});
