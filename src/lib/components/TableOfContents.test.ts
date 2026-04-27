import { describe, it, expect, vi } from 'vitest';
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
