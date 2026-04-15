import { describe, test, expect } from 'vitest';
import type { ReadingProgress } from './types';

// In-memory implementation for unit testing
const mockProgressStore: Map<string, ReadingProgress> = new Map();

async function mockSaveProgress(progress: ReadingProgress): Promise<void> {
	mockProgressStore.set(progress.bookId, { ...progress });
}

async function mockGetProgress(bookId: string): Promise<ReadingProgress | undefined> {
	return mockProgressStore.get(bookId);
}

describe('Progress Storage', () => {
	test('saves reading progress', async () => {
		mockProgressStore.clear();

		const progress: ReadingProgress = {
			bookId: 'book-123',
			chapterIndex: 2,
			scrollPercent: 0.5,
			lastReadAt: new Date()
		};

		await mockSaveProgress(progress);
		const saved = await mockGetProgress('book-123');

		expect(saved).toBeTruthy();
		expect(saved?.chapterIndex).toBe(2);
		expect(saved?.scrollPercent).toBe(0.5);
	});

	test('returns undefined for non-existent progress', async () => {
		mockProgressStore.clear();
		const progress = await mockGetProgress('non-existent');
		expect(progress).toBeUndefined();
	});

	test('updates existing progress', async () => {
		mockProgressStore.clear();

		const progress1: ReadingProgress = {
			bookId: 'book-123',
			chapterIndex: 1,
			scrollPercent: 0.3,
			lastReadAt: new Date('2024-01-01')
		};

		await mockSaveProgress(progress1);

		const progress2: ReadingProgress = {
			bookId: 'book-123',
			chapterIndex: 2,
			scrollPercent: 0.7,
			lastReadAt: new Date('2024-01-15')
		};

		await mockSaveProgress(progress2);
		const saved = await mockGetProgress('book-123');

		expect(saved?.chapterIndex).toBe(2);
		expect(saved?.scrollPercent).toBe(0.7);
	});
});
