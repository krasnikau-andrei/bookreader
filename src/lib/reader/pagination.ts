export function calculateScrollPercent(
	scrollLeft: number,
	scrollWidth: number,
	clientWidth: number
): number {
	const maxScroll = scrollWidth - clientWidth;
	if (maxScroll <= 0) return 0;
	return Math.min(1, Math.max(0, scrollLeft / maxScroll));
}
