import Dexie, { type Table } from 'dexie';
import type { Book, BookFile, Chapter, ReadingProgress } from './types';

export interface ChapterCache {
	bookId: string;
	chapters: Chapter[];
	cachedAt: Date;
}

export class BookDatabase extends Dexie {
	books!: Table<Book, string>;
	readingProgress!: Table<ReadingProgress, string>;
	bookFiles!: Table<BookFile, string>;
	chapterCache!: Table<ChapterCache, string>;

	constructor() {
		super('bookreader');
		this.version(2).stores({
			books: 'id, title, author, addedAt',
			readingProgress: 'bookId, lastReadAt'
		});
		this.version(3)
			.stores({
				books: 'id, title, author, addedAt',
				readingProgress: 'bookId, lastReadAt',
				bookFiles: 'id'
			})
			.upgrade(async (tx) => {
				// v2 rows may carry fileData inline; move it to bookFiles
				type LegacyBook = Book & { fileData?: ArrayBuffer };
				const books = (await tx.table('books').toArray()) as LegacyBook[];
				const bookFiles = tx.table('bookFiles');
				for (const book of books) {
					if (book.fileData) {
						await bookFiles.put({ id: book.id, fileData: book.fileData });
					}
				}
			});
		this.version(4).stores({
			books: 'id, title, author, addedAt',
			readingProgress: 'bookId, lastReadAt',
			bookFiles: 'id',
			chapterCache: 'bookId'
		});
	}
}

export const db = new BookDatabase();

export async function saveBook(book: Book): Promise<void> {
	try {
		await db.books.put(book);
	} catch (error) {
		if (error instanceof Error && error.name === 'QuotaExceededError') {
			throw new Error('Storage quota exceeded. Please free up space and try again.', {
				cause: error
			});
		}
		throw error;
	}
}

export async function getAllBooks(): Promise<Book[]> {
	const books = await db.books.toArray();
	// Strip legacy inline fileData blobs (pre-v3 rows); file data lives in bookFiles
	for (const book of books) {
		delete (book as { fileData?: ArrayBuffer }).fileData;
	}
	return books;
}

export async function getBook(id: string): Promise<Book | undefined> {
	return await db.books.get(id);
}

export async function bookExists(id: string): Promise<boolean> {
	const count = await db.books.where('id').equals(id).count();
	return count > 0;
}

export async function saveChapterCache(bookId: string, chapters: Chapter[]): Promise<void> {
	await db.chapterCache.put({ bookId, chapters, cachedAt: new Date() });
}

export async function getChapterCache(bookId: string): Promise<Chapter[] | undefined> {
	const entry = await db.chapterCache.get(bookId);
	return entry?.chapters;
}

export async function deleteChapterCache(bookId: string): Promise<void> {
	await db.chapterCache.delete(bookId);
}

export async function deleteBook(id: string): Promise<void> {
	await db.books.delete(id);
	await db.bookFiles.delete(id);
	await deleteChapterCache(id);
}

export async function saveBookWithFile(book: Book, fileData: ArrayBuffer): Promise<void> {
	await saveBook(book);
	await db.bookFiles.put({ id: book.id, fileData });
}

export async function getBookFile(id: string): Promise<ArrayBuffer | undefined> {
	const entry = await db.bookFiles.get(id);
	return entry?.fileData;
}

export async function saveProgress(progress: ReadingProgress): Promise<void> {
	try {
		await db.transaction('rw', db.readingProgress, async () => {
			if (!progress.chapterSizes) {
				const existing = await db.readingProgress.get(progress.bookId);
				if (existing?.chapterSizes) {
					progress.chapterSizes = existing.chapterSizes;
				}
			}
			await db.readingProgress.put(progress);
		});
	} catch (e) {
		console.error('[STORAGE] saveProgress error:', e);
		throw e;
	}
}

export async function getProgress(bookId: string): Promise<ReadingProgress | undefined> {
	try {
		const result = await db.readingProgress.get(bookId);
		return result;
	} catch (e) {
		console.error('[STORAGE] getProgress error:', e);
		throw e;
	}
}

export async function getAllProgress(): Promise<ReadingProgress[]> {
	try {
		return await db.readingProgress.toArray();
	} catch (e) {
		console.error('[STORAGE] getAllProgress error:', e);
		throw e;
	}
}

export async function getMostRecentProgress(): Promise<
	{ book: Book; progress: ReadingProgress } | undefined
> {
	try {
		const allProgress = await db.readingProgress.orderBy('lastReadAt').reverse().toArray();
		if (allProgress.length === 0) return;
		const latest = allProgress[0];
		const book = await db.books.get(latest.bookId);
		if (!book) return;
		return { book, progress: latest };
	} catch (e) {
		console.error('[STORAGE] getMostRecentProgress error:', e);
		throw e;
	}
}
