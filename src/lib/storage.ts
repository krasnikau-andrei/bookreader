import Dexie, { type Table } from 'dexie';
import type { Book, ReadingProgress } from './types';

export class BookDatabase extends Dexie {
	books!: Table<Book, string>;
	readingProgress!: Table<ReadingProgress, string>;

	constructor() {
		super('bookreader');
		this.version(2).stores({
			books: 'id, title, author, addedAt',
			readingProgress: 'bookId, lastReadAt'
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
	return await db.books.toArray();
}

export async function getBook(id: string): Promise<Book | undefined> {
	return await db.books.get(id);
}

export async function bookExists(id: string): Promise<boolean> {
	const count = await db.books.where('id').equals(id).count();
	return count > 0;
}

export async function deleteBook(id: string): Promise<void> {
	await db.books.delete(id);
}

export async function saveProgress(progress: ReadingProgress): Promise<void> {
	await db.readingProgress.put(progress);
}

export async function getProgress(bookId: string): Promise<ReadingProgress | undefined> {
	return await db.readingProgress.get(bookId);
}
