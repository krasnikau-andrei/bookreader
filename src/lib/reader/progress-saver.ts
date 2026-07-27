import { saveProgress } from '$lib/storage';
import { calculateScrollPercent } from './pagination';

export interface ProgressSaverOptions {
	bookId: () => string;
	chapterIndex: () => number;
	container: () => HTMLElement | null;
	isChangingChapter: () => boolean;
}

/**
 * Reading-progress persistence: debounced saves on scroll (300ms trailing),
 * immediate saves on page-turn completion, and a visibilitychange/pagehide
 * flush so an in-flight debounce isn't lost when the user switches apps.
 */
export function createProgressSaver(options: ProgressSaverOptions) {
	let debounceTimer: ReturnType<typeof setTimeout>;

	function saveNow(chapterIndex: number, scrollPercent: number) {
		saveProgress({
			bookId: options.bookId(),
			chapterIndex,
			scrollPercent,
			lastReadAt: new Date()
		});
	}

	function schedule(chapterIndex: number, scrollPercent: number) {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => saveNow(chapterIndex, scrollPercent), 300);
	}

	// Clear pending debounced saves to prevent race conditions around
	// chapter transitions (old chapter saved with new scroll position).
	function cancelPending() {
		clearTimeout(debounceTimer);
	}

	function flushIfHidden() {
		if (document.visibilityState !== 'hidden') return;
		const container = options.container();
		if (!container || options.isChangingChapter()) return;
		clearTimeout(debounceTimer);
		const percent = calculateScrollPercent(
			container.scrollLeft,
			container.scrollWidth,
			container.clientWidth
		);
		saveNow(options.chapterIndex(), percent);
	}

	function attach() {
		document.addEventListener('visibilitychange', flushIfHidden);
		document.addEventListener('pagehide', flushIfHidden);
	}

	function detach() {
		document.removeEventListener('visibilitychange', flushIfHidden);
		document.removeEventListener('pagehide', flushIfHidden);
	}

	return { schedule, saveNow, cancelPending, attach, detach };
}
