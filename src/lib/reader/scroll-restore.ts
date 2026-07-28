import { tick } from 'svelte';
import { jumpTo } from './animation';

/**
 * Scroll position restoration with iOS Safari guards.
 * See docs/lessons/ios-safari-auto-scroll-restore-corrupts-progress.md
 *
 * Owns the "should restore" flag, the 600ms post-restore guard that blocks
 * stale scroll events, and the post-paint safety net that re-applies the
 * position if layout shifts (images, fonts) changed scrollWidth.
 */
export function createScrollRestore(isChangingChapter: () => boolean) {
	let shouldRestore = true;
	let guard: ReturnType<typeof setTimeout> | undefined;
	let restoredProgress = 0;

	// Component calls this before driving a chapter change manually,
	// so the next restore() applies the guard but skips the jump.
	function skipNextRestore() {
		shouldRestore = false;
	}

	function restore(container: HTMLElement, progress: number) {
		// Synchronous scroll restoration — sets scrollLeft before first paint,
		// preventing a flash of content at scroll=0 before jumping to saved position
		if (shouldRestore) {
			const maxScroll = container.scrollWidth - container.clientWidth;
			if (maxScroll > 0) {
				container.scrollLeft = Math.round(maxScroll * progress);
			}
		}
		shouldRestore = true;
		restoredProgress = progress;

		// Block scroll events for 600ms after programmatic scroll restoration
		// to prevent iOS Safari's auto-scroll-restore from corrupting the
		// correct progress position with a stale cached scrollLeft
		clearTimeout(guard);
		guard = setTimeout(() => {
			guard = undefined;
		}, 600);

		// Async safety net: re-apply after paint in case layout shifts
		// (e.g., images load, fonts swap) changed scrollWidth
		if (!isChangingChapter()) {
			tick().then(() => {
				requestAnimationFrame(() => {
					if (isChangingChapter()) return;
					const maxScroll = container.scrollWidth - container.clientWidth;
					if (maxScroll > 0) {
						const targetScroll = Math.round(maxScroll * progress);
						if (Math.abs(container.scrollLeft - targetScroll) > 1) {
							jumpTo(container, targetScroll);
						}
					}
				});
			});
		}
	}

	// Call from the scroll handler. Returns true if the event was suppressed:
	// iOS Safari restores cached scrollLeft after JS sets it — if we detect
	// a non-user scroll during the restore guard period, re-apply the correct
	// position and suppress the save/URL-update.
	function guardScroll(container: HTMLElement): boolean {
		if (!guard) return false;
		const maxScroll = container.scrollWidth - container.clientWidth;
		if (maxScroll > 0) {
			const targetScroll = Math.round(maxScroll * restoredProgress);
			if (Math.abs(container.scrollLeft - targetScroll) > 1) {
				jumpTo(container, targetScroll);
			}
		}
		return true;
	}

	return { restore, skipNextRestore, guardScroll };
}
