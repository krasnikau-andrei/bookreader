import Dexie, { type Table } from 'dexie';
import type { Book } from './types';

export class BookDatabase extends Dexie {
	books!: Table<Book, string>;

	constructor() {
		super('bookreader');
		this.version(1).stores({
			books: 'id, title, author, addedAt'
		});
	}
}

export const db = new BookDatabase();

export async function saveBook(book: Book): Promise<void> {
	try {
		await db.books.put(book);
	} catch (error) {
		if (error instanceof Error && error.name === 'QuotaExceededError') {
			throw new Error('Storage quota exceeded. Please free up space and try again.');
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

export async function deleteBook(id: string): Promise<void> {
	await db.books.delete(id);
}
