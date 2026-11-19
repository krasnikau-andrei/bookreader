/**
 * A reading position that survives different screens and font sizes:
 * "how far into the chapter's text" as a fraction of its characters.
 *
 * Scroll percent can't be shared between devices — a narrow phone has more
 * pages than a wide one, so page 10 of 40 is not page 10 of 30. A character
 * offset points at the same word everywhere, as long as the chapter HTML is
 * the same (same book file, same parser).
 */

export interface TextPoint {
	node: Text;
	offset: number;
}

function textNodes(root: Node): Text[] {
	const nodes: Text[] = [];
	const walker = root.ownerDocument!.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n as Text);
	return nodes;
}

/** Index of characters in `root`: text nodes in reading order plus where each one starts. */
export function indexText(root: Node) {
	const nodes = textNodes(root);
	const starts: number[] = [];
	let total = 0;
	for (const node of nodes) {
		starts.push(total);
		total += node.data.length;
	}

	/** Character number → the text node and offset that hold it. */
	function pointAt(index: number): TextPoint | null {
		if (nodes.length === 0) return null;
		const clamped = Math.max(0, Math.min(index, total - 1));
		// Last node whose start is <= clamped
		let lo = 0;
		let hi = nodes.length - 1;
		while (lo < hi) {
			const mid = (lo + hi + 1) >> 1;
			if (starts[mid] <= clamped) lo = mid;
			else hi = mid - 1;
		}
		// Empty text nodes share a start with the next one; skip to one that has the char
		while (lo < nodes.length - 1 && nodes[lo].data.length === 0) lo++;
		return { node: nodes[lo], offset: Math.min(clamped - starts[lo], nodes[lo].data.length) };
	}

	return { total, pointAt };
}

/** A fraction of the chapter's text (0..1) → the character it lands on. */
export function pointAtFraction(root: Node, fraction: number): TextPoint | null {
	const { total, pointAt } = indexText(root);
	if (total === 0) return null;
	const clamped = Math.max(0, Math.min(1, fraction));
	return pointAt(Math.floor(clamped * total));
}

function charRect(point: TextPoint): DOMRect | null {
	const range = point.node.ownerDocument.createRange();
	const end = Math.min(point.offset + 1, point.node.data.length);
	range.setStart(point.node, point.offset);
	range.setEnd(point.node, end);
	const rect = range.getBoundingClientRect();
	// Collapsed whitespace has no box at all
	return rect.width === 0 && rect.height === 0 ? null : rect;
}

/**
 * The fraction of the chapter's text where the visible page starts.
 *
 * Characters run through the columns in order, so "is this character on the
 * current page or later" flips from false to true exactly once — a binary
 * search finds the first one.
 */
export function fractionAtPageStart(root: Node, pageLeft: number): number {
	const { total, pointAt } = indexText(root);
	if (total === 0) return 0;

	const isOnOrAfterPage = (index: number): boolean => {
		// Walk forward past characters that have no box (collapsed whitespace)
		for (let i = index; i < Math.min(total, index + 64); i++) {
			const rect = charRect(pointAt(i)!);
			if (rect) return rect.right > pageLeft + 1;
		}
		return false;
	};

	let lo = 0;
	let hi = total - 1;
	if (!isOnOrAfterPage(hi)) return 1;
	while (lo < hi) {
		const mid = (lo + hi) >> 1;
		if (isOnOrAfterPage(mid)) hi = mid;
		else lo = mid + 1;
	}
	return lo / total;
}

/** Where to draw a line for a fraction of the text: the box of that character's line. */
export function rectAtFraction(root: Node, fraction: number): DOMRect | null {
	const { total, pointAt } = indexText(root);
	if (total === 0) return null;
	const start = Math.floor(Math.max(0, Math.min(1, fraction)) * total);
	// The exact character may be collapsed whitespace — take the next one with a box
	for (let i = start; i < Math.min(total, start + 64); i++) {
		const rect = charRect(pointAt(i)!);
		if (rect) return rect;
	}
	return null;
}
