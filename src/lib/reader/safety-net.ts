/**
 * Safety net to ensure scroll position is always at a valid snap point
 * Monitors scroll position and corrects if stuck between pages
 */
export function createSafetyNet(
	element: HTMLElement,
	onSnapCorrection: (targetScroll: number) => void,
	config: { checkDelay: number; tolerance: number } = { checkDelay: 100, tolerance: 5 }
) {
	let checkTimeout: ReturnType<typeof setTimeout> | null = null;
	let isActive = false;

	function isAtSnapPoint(): boolean {
		const clientWidth = element.clientWidth;
		const expectedPage = Math.round(element.scrollLeft / clientWidth);
		const expectedScroll = expectedPage * clientWidth;
		return Math.abs(element.scrollLeft - expectedScroll) <= config.tolerance;
	}

	function getNearestSnapScroll(): number {
		const clientWidth = element.clientWidth;
		const pageIndex = Math.round(element.scrollLeft / clientWidth);
		return pageIndex * clientWidth;
	}

	function scheduleCheck() {
		if (!isActive) return;
		if (checkTimeout) {
			clearTimeout(checkTimeout);
		}
		checkTimeout = setTimeout(() => {
			if (!isActive) return;
			if (!isAtSnapPoint()) {
				const targetScroll = getNearestSnapScroll();
				onSnapCorrection(targetScroll);
			}
		}, config.checkDelay);
	}

	function handleScroll() {
		scheduleCheck();
	}

	function attach() {
		isActive = true;
		element.addEventListener('scroll', handleScroll, { passive: true });
	}

	function detach() {
		isActive = false;
		if (checkTimeout) {
			clearTimeout(checkTimeout);
			checkTimeout = null;
		}
		element.removeEventListener('scroll', handleScroll);
	}

	return { attach, detach };
}
