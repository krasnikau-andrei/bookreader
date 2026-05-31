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

async function mockGetAllProgress(): Promise<ReadingProgress[]> {
	return Array.from(mockProgressStore.values());
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

	test('getAllProgress returns all saved progress', async () => {
		mockProgressStore.clear();

		const progress1: ReadingProgress = {
			bookId: 'book-1',
			chapterIndex: 0,
			scrollPercent: 0.5,
			lastReadAt: new Date('2024-01-01'),
			chapterSizes: [100, 200]
		};
		const progress2: ReadingProgress = {
			bookId: 'book-2',
			chapterIndex: 1,
			scrollPercent: 0.3,
			lastReadAt: new Date('2024-01-02'),
			chapterSizes: [150, 250, 100]
		};

		await mockSaveProgress(progress1);
		await mockSaveProgress(progress2);

		const all = await mockGetAllProgress();
		expect(all).toHaveLength(2);
		const map = new Map(all.map((p) => [p.bookId, p]));
		expect(map.get('book-1')?.chapterSizes).toEqual([100, 200]);
		expect(map.get('book-2')?.chapterSizes).toEqual([150, 250, 100]);
	});
});

describe('Book File Storage', () => {
	const mockBookFileStore: Map<string, ArrayBuffer> = new Map();

	async function mockSaveBookWithFile(bookId: string, fileData: ArrayBuffer): Promise<void> {
		mockBookFileStore.set(bookId, fileData);
	}

	async function mockGetBookFile(bookId: string): Promise<ArrayBuffer | undefined> {
		return mockBookFileStore.get(bookId);
	}

	async function mockDeleteBook(bookId: string): Promise<void> {
		mockBookFileStore.delete(bookId);
	}

	test('saves and retrieves book file data', async () => {
		mockBookFileStore.clear();
		const data = new ArrayBuffer(10);
		const view = new Uint8Array(data);
		view[0] = 42;

		await mockSaveBookWithFile('book-1', data);
		const retrieved = await mockGetBookFile('book-1');

		expect(retrieved).toBeTruthy();
		expect(retrieved!.byteLength).toBe(10);
		const retrievedView = new Uint8Array(retrieved!);
		expect(retrievedView[0]).toBe(42);
	});

	test('returns undefined for non-existent book file', async () => {
		mockBookFileStore.clear();
		const result = await mockGetBookFile('non-existent');
		expect(result).toBeUndefined();
	});

	test('delete removes book file', async () => {
		mockBookFileStore.clear();
		const data = new ArrayBuffer(5);
		await mockSaveBookWithFile('book-1', data);
		expect(await mockGetBookFile('book-1')).toBeTruthy();
		await mockDeleteBook('book-1');
		expect(await mockGetBookFile('book-1')).toBeUndefined();
	});
});
