import { describe, test, expect, afterEach, vi } from 'vitest';
import { indexText, pointAtFraction, fractionAtPageStart, rectAtFraction } from './text-position';

function html(markup: string): HTMLElement {
	const root = document.createElement('div');
	root.innerHTML = markup;
	return root;
}

/** The text a point lands on, plus some context, for readable failures. */
function describePoint(root: HTMLElement, fraction: number) {
	const point = pointAtFraction(root, fraction);
	if (!point) return null;
	return { char: point.node.data[point.offset], rest: point.node.data.slice(point.offset) };
}

describe('indexText / pointAtFraction', () => {
	test('counts characters across nested elements in reading order', () => {
		const root = html('<p>Hello <em>big</em> world</p><p>Again</p>');
		const { total } = indexText(root);
		expect(total, 'Hello big world + Again').toBe('Hello big world'.length + 'Again'.length);
	});

	test('a fraction lands on the same character no matter how the text is split', () => {
		const plain = html('<p>abcdefghij</p>');
		const split = html('<p>ab<b>cd</b><i>e<span>fg</span></i>hij</p>');
		for (const f of [0, 0.25, 0.5, 0.79, 0.99]) {
			expect(describePoint(split, f)?.char, `fraction ${f}`).toBe(describePoint(plain, f)?.char);
		}
	});

	test('skips empty text nodes instead of pointing into them', () => {
		const root = html('<p>abc</p>');
		root.querySelector('p')!.append(document.createTextNode(''), document.createTextNode('def'));
		expect(describePoint(root, 0.5)).toEqual({ char: 'd', rest: 'def' });
	});

	test('clamps fractions outside 0..1 to the first and last character', () => {
		const root = html('<p>abc</p><p>xyz</p>');
		expect(describePoint(root, -1)?.char).toBe('a');
		expect(describePoint(root, 1)?.char).toBe('z');
		expect(describePoint(root, 5)?.char).toBe('z');
	});

	test('no text means no point', () => {
		expect(pointAtFraction(html('<img src="x">'), 0.5)).toBeNull();
	});
});

describe('layout-based lookups', () => {
	afterEach(() => vi.restoreAllMocks());

	/**
	 * Fake a paged layout: 10 characters per page, each page 100px wide,
	 * spaces collapse to nothing. Character i sits on page floor(i / 10).
	 */
	function fakePages(root: HTMLElement) {
		const { pointAt, total } = indexText(root);
		// Where each text node starts, so a Range can be turned back into a char number
		const nodeStart = new Map<Text, number>();
		for (let i = 0; i < total; i++) {
			const p = pointAt(i)!;
			if (!nodeStart.has(p.node)) nodeStart.set(p.node, i - p.offset);
		}
		// jsdom has no layout, so Range has no getBoundingClientRect to spy on
		Range.prototype.getBoundingClientRect ??= () => new DOMRect();
		vi.spyOn(Range.prototype, 'getBoundingClientRect').mockImplementation(function (this: Range) {
			const node = this.startContainer as Text;
			const i = nodeStart.get(node)! + this.startOffset;
			if (node.data[this.startOffset] === ' ') return new DOMRect(0, 0, 0, 0);
			const page = Math.floor(i / 10);
			return new DOMRect(page * 100 + (i % 10) * 10, 0, 10, 20);
		});
		return total;
	}

	test('finds the first character of the visible page', () => {
		const root = html('<p>aaaaaaaaaa</p><p>bbbbbbbbbb</p><p>cccccccccc</p><p>dddddddddd</p>');
		const total = fakePages(root);
		expect(fractionAtPageStart(root, 0)).toBe(0);
		expect(fractionAtPageStart(root, 200), 'page 3 starts at char 20').toBe(20 / total);
		expect(fractionAtPageStart(root, 300), 'page 4 starts at char 30').toBe(30 / total);
	});

	test('steps over collapsed whitespace at a page boundary', () => {
		// Chars 18..21 are spaces — no boxes — page 3 starts on the first real char after them
		const root = html('<p>aaaaaaaaaaaaaaaaaa    bbbbbbbbbbbbbb</p>');
		const total = fakePages(root);
		const fraction = fractionAtPageStart(root, 200);
		expect(fraction * total, `got char ${fraction * total}`).toBeGreaterThanOrEqual(18);
		expect(fraction * total).toBeLessThanOrEqual(22);
	});

	test('past the last page reports the end of the chapter', () => {
		const root = html('<p>aaaaaaaaaa</p>');
		fakePages(root);
		expect(fractionAtPageStart(root, 5000)).toBe(1);
	});

	test('rectAtFraction gives the box of the character the fraction lands on', () => {
		const root = html('<p>aaaaaaaaaa</p><p>bbbbbbbbbb</p><p>cccccccccc</p>');
		fakePages(root);
		const rect = rectAtFraction(root, 0.5);
		expect(rect?.left, 'char 15 is on page 2, 5th slot').toBe(150);
	});
});
