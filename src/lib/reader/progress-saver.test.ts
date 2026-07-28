import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { createProgressSaver } from './progress-saver';
import { saveProgress } from '$lib/storage';

vi.mock('$lib/storage', () => ({
	saveProgress: vi.fn()
}));

describe('Progress Saver', () => {
	let element: HTMLElement;
	let saver: ReturnType<typeof createProgressSaver>;
	let chapterIndex: number;
	let changing: boolean;

	// scrollWidth 1000, clientWidth 400 → maxScroll 600
	function createSaver() {
		return createProgressSaver({
			bookId: () => 'book-1',
			chapterIndex: () => chapterIndex,
			container: () => element,
			isChangingChapter: () => changing
		});
	}

	function setVisibility(state: string) {
		Object.defineProperty(document, 'visibilityState', {
			configurable: true,
			value: state
		});
	}

	beforeEach(() => {
		vi.useFakeTimers();
		element = document.createElement('div');
		document.body.appendChild(element);
		Object.defineProperty(element, 'scrollLeft', { writable: true, value: 0 });
		Object.defineProperty(element, 'clientWidth', { writable: true, value: 400 });
		Object.defineProperty(element, 'scrollWidth', { writable: true, value: 1000 });
		chapterIndex = 3;
		changing = false;
		saver = createSaver();
	});

	afterEach(() => {
		saver.detach();
		setVisibility('visible');
		vi.useRealTimers();
		vi.clearAllMocks();
		document.body.removeChild(element);
	});

	describe('schedule', () => {
		test('debounces multiple calls into one save with the latest position', () => {
			saver.schedule(3, 0.1);
			saver.schedule(3, 0.2);
			saver.schedule(3, 0.3);

			vi.advanceTimersByTime(299);
			expect(saveProgress).not.toHaveBeenCalled();

			vi.advanceTimersByTime(1);
			expect(saveProgress).toHaveBeenCalledTimes(1);
			expect(saveProgress).toHaveBeenCalledWith({
				bookId: 'book-1',
				chapterIndex: 3,
				scrollPercent: 0.3,
				lastReadAt: expect.any(Date)
			});
		});
	});

	describe('cancelPending', () => {
		test('prevents a scheduled save from firing', () => {
			saver.schedule(3, 0.5);
			saver.cancelPending();
			vi.advanceTimersByTime(300);
			expect(saveProgress).not.toHaveBeenCalled();
		});
	});

	describe('saveNow', () => {
		test('saves immediately without debounce', () => {
			saver.saveNow(4, 1);
			expect(saveProgress).toHaveBeenCalledTimes(1);
			expect(saveProgress).toHaveBeenCalledWith({
				bookId: 'book-1',
				chapterIndex: 4,
				scrollPercent: 1,
				lastReadAt: expect.any(Date)
			});
		});
	});

	describe('visibility flush', () => {
		test('saves current position immediately when page becomes hidden', () => {
			element.scrollLeft = 300; // percent = 300 / 600 = 0.5
			saver.attach();
			setVisibility('hidden');
			document.dispatchEvent(new Event('visibilitychange'));

			expect(saveProgress).toHaveBeenCalledTimes(1);
			expect(saveProgress).toHaveBeenCalledWith({
				bookId: 'book-1',
				chapterIndex: 3,
				scrollPercent: 0.5,
				lastReadAt: expect.any(Date)
			});
		});

		test('discards a pending debounced save when flushing', () => {
			saver.schedule(3, 0.9);
			saver.attach();
			setVisibility('hidden');
			element.scrollLeft = 300;
			document.dispatchEvent(new Event('visibilitychange'));

			vi.advanceTimersByTime(300);
			expect(saveProgress).toHaveBeenCalledTimes(1);
			expect(saveProgress).toHaveBeenCalledWith(expect.objectContaining({ scrollPercent: 0.5 }));
		});

		test('does not save when page is visible', () => {
			saver.attach();
			document.dispatchEvent(new Event('visibilitychange'));
			expect(saveProgress).not.toHaveBeenCalled();
		});

		test('does not save during a chapter transition', () => {
			changing = true;
			saver.attach();
			setVisibility('hidden');
			document.dispatchEvent(new Event('visibilitychange'));
			expect(saveProgress).not.toHaveBeenCalled();
		});

		test('does not save after detach', () => {
			saver.attach();
			saver.detach();
			setVisibility('hidden');
			document.dispatchEvent(new Event('visibilitychange'));
			expect(saveProgress).not.toHaveBeenCalled();
		});
	});
});
