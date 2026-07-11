/**
 * Ease-out cubic function
 */
function easeOutCubic(t: number): number {
	return 1 - Math.pow(1 - t, 3);
}

// Track active animation per element
const activeAnimations = new WeakMap<HTMLElement, () => void>();

/**
 * Cancel any active animation on element
 */
function cancelAnimation(element: HTMLElement): void {
	const cancel = activeAnimations.get(element);
	if (cancel) {
		cancel();
		activeAnimations.delete(element);
	}
}

/**
 * Animate scroll to target position.
 * Rounds target to exact page boundary so scroll-snap doesn't fight it.
 * Cancels any running animation and starts fresh.
 */
export function animateScroll(
	element: HTMLElement,
	targetScroll: number,
	duration: number = 250
): void {
	// Cancel existing animation first
	cancelAnimation(element);

	const snapTarget = Math.round(targetScroll / element.clientWidth) * element.clientWidth;
	const startScroll = element.scrollLeft;
	const distance = snapTarget - startScroll;

	// Already at target
	if (Math.abs(distance) < 1) return;

	const startTime = performance.now();
	let rafId: number | null = null;
	let cancelled = false;

	const cancel = () => {
		cancelled = true;
		if (rafId !== null) {
			cancelAnimationFrame(rafId);
		}
	};

	// Store cancel function
	activeAnimations.set(element, cancel);

	const step = (now: number) => {
		if (cancelled) return;

		const elapsed = now - startTime;
		const progress = Math.min(elapsed / duration, 1);
		const eased = easeOutCubic(progress);

		element.scrollLeft = startScroll + distance * eased;

		if (progress < 1) {
			rafId = requestAnimationFrame(step);
		} else {
			// Animation complete - at exact page boundary, scroll-snap is happy
			activeAnimations.delete(element);
		}
	};

	rafId = requestAnimationFrame(step);
}

/**
 * Jump to position without animation
 */
export function jumpTo(element: HTMLElement, targetScroll: number): void {
	cancelAnimation(element);
	element.scrollLeft = Math.round(targetScroll / element.clientWidth) * element.clientWidth;
}
