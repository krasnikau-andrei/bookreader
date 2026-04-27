// src/lib/components/ChapterTree.test.ts
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import ChapterTree from './ChapterTree.svelte';
import type { Chapter } from '$lib/types';

describe('ChapterTree', () => {
	const mockChapters: Chapter[] = [
		{ id: 'c1', title: 'Chapter 1', content: '', filePath: 'ch1.html' },
		{ id: 'c2', title: 'Chapter 2', content: '', filePath: 'ch2.html' },
		{ id: 'c3', title: 'Chapter 3', content: '', filePath: 'ch3.html' }
	];

	it('renders all chapter titles', () => {
		render(ChapterTree, {
			props: {
				chapters: mockChapters,
				currentChapter: 0,
				onChapterSelect: vi.fn()
			}
		});
		expect(screen.getByText('Chapter 1')).toBeInTheDocument();
		expect(screen.getByText('Chapter 2')).toBeInTheDocument();
		expect(screen.getByText('Chapter 3')).toBeInTheDocument();
	});

	it('calls onChapterSelect when chapter is clicked', async () => {
		const onSelect = vi.fn();
		render(ChapterTree, {
			props: {
				chapters: mockChapters,
				currentChapter: 0,
				onChapterSelect: onSelect
			}
		});
		await fireEvent.click(screen.getByText('Chapter 2'));
		expect(onSelect).toHaveBeenCalledWith(1);
	});

	it('highlights current chapter', () => {
		render(ChapterTree, {
			props: {
				chapters: mockChapters,
				currentChapter: 1,
				onChapterSelect: vi.fn()
			}
		});
		const buttons = screen.getAllByTestId('chapter-item');
		expect(buttons[1]).toHaveClass('current');
		expect(buttons[0]).not.toHaveClass('current');
	});
});
