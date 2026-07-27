import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { createScrollRestore } from './scroll-restore';

describe('Scroll Restore', () => {
	let element: HTMLElement;
	let rafCallbacks: Array<(timestamp: number) => void>;

	// scrollWidth 1600, clientWidth 400 → maxScroll 1200.
	// progress 1/3 → target 400 (exact page boundary, so jumpTo doesn't round).
	function mockLayout() {
		Object.defineProperty(element, 'scrollLeft', { writable: true, value: 0 });
		Object.defineProperty(element, 'clientWidth', { writable: true, value: 400 });
		Object.defineProperty(element, 'scrollWidth', { writable: true, value: 1600 });
	}

	function runRaf() {
		const callbacks = [...rafCallbacks];
		rafCallbacks = [];
		callbacks.forEach((cb) => cb(performance.now()));
	}

	beforeEach(() => {
		element = document.createElement('div');
		document.body.appendChild(element);
		mockLayout();
		rafCallbacks = [];
		vi.stubGlobal('requestAnimationFrame', (callback: (timestamp: number) => void) => {
			rafCallbacks.push(callback);
			return rafCallbacks.length;
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.useRealTimers();
		document.body.removeChild(element);
	});

	describe('restore', () => {
		test('sets scrollLeft synchronously from progress', () => {
			const sr = createScrollRestore(() => true); // skip async safety net
			sr.restore(element, 1 / 3);
			expect(element.scrollLeft).toBe(400);
		});

		test('skipNextRestore suppresses the sync jump but still arms the guard', () => {
			const sr = createScrollRestore(() => true);
			sr.skipNextRestore();
			sr.restore(element, 1 / 3);
			expect(element.scrollLeft).toBe(0);

			// Guard is armed: scroll events are suppressed and position re-applied
			expect(sr.guardScroll(element)).toBe(true);
			expect(element.scrollLeft).toBe(400);
		});

		test('restore applies again after a skipped restore (flag resets)', () => {
			const sr = createScrollRestore(() => true);
			sr.skipNextRestore();
			sr.restore(element, 0);
			sr.restore(element, 1 / 3);
			expect(element.scrollLeft).toBe(400);
		});

		test('does not touch scrollLeft when content fits on one page', () => {
			Object.defineProperty(element, 'scrollWidth', { writable: true, value: 400 });
			const sr = createScrollRestore(() => true);
			element.scrollLeft = 50;
			sr.restore(element, 1);
			expect(element.scrollLeft).toBe(50);
		});
	});

	describe('guardScroll', () => {
		test('returns false when no restore has armed the guard', () => {
			const sr = createScrollRestore(() => true);
			expect(sr.guardScroll(element)).toBe(false);
		});

		test('re-applies restored position when scroll drifts during guard period', () => {
			const sr = createScrollRestore(() => true);
			sr.restore(element, 1 / 3);

			element.scrollLeft = 123; // iOS Safari's stale cached scrollLeft
			expect(sr.guardScroll(element)).toBe(true);
			expect(element.scrollLeft).toBe(400);
		});

		test('expires after 600ms', () => {
			vi.useFakeTimers();
			const sr = createScrollRestore(() => true);
			sr.restore(element, 1 / 3);

			expect(sr.guardScroll(element)).toBe(true);
			vi.advanceTimersByTime(600);
			element.scrollLeft = 123;
			expect(sr.guardScroll(element)).toBe(false);
			expect(element.scrollLeft).toBe(123); // untouched after expiry
		});
	});

	describe('async safety net', () => {
		test('re-applies position after paint if layout shifted', async () => {
			const sr = createScrollRestore(() => false);
			sr.restore(element, 1 / 3);

			element.scrollLeft = 100; // layout shift moved us
			await new Promise((resolve) => setTimeout(resolve, 0)); // let tick() resolve
			runRaf();
			expect(element.scrollLeft).toBe(400);
		});

		test('does not re-apply when a chapter change started before paint', async () => {
			let changing = false;
			const sr = createScrollRestore(() => changing);
			sr.restore(element, 1 / 3);

			changing = true;
			element.scrollLeft = 100;
			await new Promise((resolve) => setTimeout(resolve, 0));
			runRaf();
			expect(element.scrollLeft).toBe(100);
		});
	});
});
