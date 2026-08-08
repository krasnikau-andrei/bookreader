import { jumpTo } from './animation';

/**
 * Scroll position restoration with iOS Safari guards.
 * See docs/lessons/ios-safari-auto-scroll-restore-corrupts-progress.md
 *
 * Restores the position rounded to the exact page boundary (so the first
 * paint is already at a snap point and neither Safari's snap engine nor the
 * drift guard have anything to move — no visible jerk on open), then runs a
 * drift guard: iOS restores its cached scrollLeft after layout settles,
 * sometimes later than a fixed short timeout and sometimes with no scroll
 * event at all.
 *
 * The FIRST restore (book open / page load) gets the full guard window —
 * that's the only time iOS does its own scroll restoration. Later restores
 * (chapter changes, always user-driven) only need to survive layout settling
 * and disarm as soon as the position matches.
 */
export function createScrollRestore(
	isChangingChapter: () => boolean,
	isUserInteracting: () => boolean = () => false
) {
	let shouldRestore = true;
	let restoredProgress = 0;
	let armed = false;
	let longGuard = true;
	let guardUntil = 0;
	let settleFrames = 0;
	let rafId: number | null = null;

	const GUARD_MS = 3000;
	const SETTLE_MS = 1000;
	const SETTLE_FRAMES = 2;

	// Component calls this before driving a chapter change manually,
	// so the next restore() applies the guard but skips the jump.
	function skipNextRestore() {
		shouldRestore = false;
	}

	function targetScroll(container: HTMLElement): number {
		const maxScroll = container.scrollWidth - container.clientWidth;
		if (maxScroll <= 0) return -1;
		return Math.round(maxScroll * restoredProgress);
	}

	function restore(container: HTMLElement, progress: number) {
		restoredProgress = progress;

		if (shouldRestore) {
			// Round to the page boundary exactly like jumpTo, so the first paint
			// is already at a snap point: Safari's snap engine and the drift
			// guard below then have nothing to fix — no visible jerk on open.
			const target = targetScroll(container);
			if (target >= 0) jumpTo(container, target);
		}
		shouldRestore = true;

		guardUntil = performance.now() + (longGuard ? GUARD_MS : SETTLE_MS);
		longGuard = false;
		settleFrames = 0;
		cancelAnimationFrame(rafId ?? 0);
		armed = true;
		rafId = requestAnimationFrame(() => watch(container));
	}

	function watch(container: HTMLElement) {
		if (!armed) return;
		if (performance.now() >= guardUntil) {
			armed = false;
			return;
		}
		if (isChangingChapter()) {
			// Position is mid-transition (manual jumpTo will land it); keep
			// watching without correcting until the change completes.
			rafId = requestAnimationFrame(() => watch(container));
			return;
		}
		if (isUserInteracting()) {
			armed = false;
			return;
		}
		const target = targetScroll(container);
		if (target >= 0) {
			const boundary = Math.round(target / container.clientWidth) * container.clientWidth;
			if (container.scrollLeft !== boundary) {
				jumpTo(container, target);
				settleFrames = 0;
			} else if (!longGuard && ++settleFrames >= SETTLE_FRAMES) {
				armed = false;
				return;
			}
		}
		rafId = requestAnimationFrame(() => watch(container));
	}

	// Call from the scroll handler. Returns true if the event was suppressed:
	// iOS Safari restores cached scrollLeft after JS sets it — if we detect
	// a non-user scroll while the drift guard is armed, re-apply the correct
	// position and suppress the save/URL-update. Any user interaction disarms
	// the guard for good (iOS restore is done by the time the user touches).
	function guardScroll(container: HTMLElement): boolean {
		if (!armed) return false;
		if (isUserInteracting()) {
			armed = false;
			return false;
		}
		const target = targetScroll(container);
		if (target >= 0) {
			const boundary = Math.round(target / container.clientWidth) * container.clientWidth;
			if (container.scrollLeft !== boundary) {
				jumpTo(container, target);
			}
		}
		return true;
	}

	return { restore, skipNextRestore, guardScroll };
}
