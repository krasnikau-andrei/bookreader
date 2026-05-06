import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import TableOfContents from './TableOfContents.svelte';
import type { Chapter } from '$lib/types';

describe('TableOfContents', () => {
	const mockChapters: Chapter[] = [
		{ id: 'c1', title: 'Chapter 1', content: '', filePath: 'ch1.html' },
		{ id: 'c2', title: 'Chapter 2', content: '', filePath: 'ch2.html' }
	];

	it('renders when show is true', () => {
		render(TableOfContents, {
			props: {
				show: true,
				chapters: mockChapters,
				currentChapter: 0,
				onChapterSelect: vi.fn(),
				onClose: vi.fn()
			}
		});
		expect(screen.getByRole('dialog', { name: 'Table of contents' })).toBeInTheDocument();
	});

	it('does not render when show is false', () => {
		render(TableOfContents, {
			props: {
				show: false,
				chapters: mockChapters,
				currentChapter: 0,
				onChapterSelect: vi.fn(),
				onClose: vi.fn()
			}
		});
		expect(screen.queryByRole('dialog', { name: 'Table of contents' })).not.toBeInTheDocument();
	});

	it('calls onClose when close button is clicked', async () => {
		const onClose = vi.fn();
		render(TableOfContents, {
			props: {
				show: true,
				chapters: mockChapters,
				currentChapter: 0,
				onChapterSelect: vi.fn(),
				onClose
			}
		});
		const closeButton = screen.getByTestId('toc-close-button');
		await fireEvent.click(closeButton);
		expect(onClose).toHaveBeenCalled();
	});

	it('calls onChapterSelect and onClose when chapter is clicked', async () => {
		const onSelect = vi.fn();
		const onClose = vi.fn();
		render(TableOfContents, {
			props: {
				show: true,
				chapters: mockChapters,
				currentChapter: 0,
				onChapterSelect: onSelect,
				onClose
			}
		});
		await fireEvent.click(screen.getByText('Chapter 2'));
		expect(onSelect).toHaveBeenCalledWith(1);
		expect(onClose).toHaveBeenCalled();
	});
});

describe('TableOfContents scrolling', () => {
	const manyChapters: Chapter[] = Array.from({ length: 20 }, (_, i) => ({
		id: `c${i}`,
		title: `Chapter ${i + 1}`,
		content: '',
		filePath: `ch${i}.html`
	}));

	let originalRAF: typeof window.requestAnimationFrame;
	let scrollIntoView: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		originalRAF = window.requestAnimationFrame;
		window.requestAnimationFrame = (cb: FrameRequestCallback) => {
			cb(0);
			return 0;
		};
		scrollIntoView = vi.fn();
		Element.prototype.scrollIntoView =
			scrollIntoView as unknown as typeof Element.prototype.scrollIntoView;
	});

	afterEach(() => {
		window.requestAnimationFrame = originalRAF;
		delete Element.prototype.scrollIntoView;
	});

	it('scrolls current chapter into view centered when TOC opens', async () => {
		render(TableOfContents, {
			props: {
				show: true,
				chapters: manyChapters,
				currentChapter: 5,
				onChapterSelect: vi.fn(),
				onClose: vi.fn()
			}
		});

		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'center' });
	});

	it('does not scroll when TOC is closed', () => {
		render(TableOfContents, {
			props: {
				show: false,
				chapters: manyChapters,
				currentChapter: 5,
				onChapterSelect: vi.fn(),
				onClose: vi.fn()
			}
		});

		expect(scrollIntoView).not.toHaveBeenCalled();
	});
});
