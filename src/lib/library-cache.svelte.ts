import type { Book, ReadingProgress } from './types';
import {
	getAllBooks,
	getMostRecentProgress,
	getAllProgress,
	getBookFile,
	saveProgress,
	saveBook,
	saveBookWithFile,
	deleteBook,
	bookExists
} from './storage';
import { calculateBookProgress, measureChapterContent } from './reader/progress';
import { parseEpub } from './parsers/epub';
import { generateFileHash } from './hash';

class LibraryCache {
	books = $state<Book[]>([]);
	bookProgressMap = $state<Record<string, number>>({});
	lastReadMap = $state<Record<string, Date>>({});
	focusBook = $state<Book | null>(null);
	focusProgress = $state(0);

	async refresh() {
		const [allBooks, recent, allProgress] = await Promise.all([
			getAllBooks(),
			getMostRecentProgress(),
			getAllProgress()
		]);

		const lastRead = new Map(allProgress.map((p) => [p.bookId, p.lastReadAt]));
		allBooks.sort((a, b) => (lastRead.get(b.id) ?? 0) - (lastRead.get(a.id) ?? 0));

		this.books = allBooks;
		this.lastReadMap = Object.fromEntries(lastRead);
		this.bookProgressMap = this.buildProgressMap(allProgress);
		this.focusBook = recent?.book ?? null;

		let focusPct = 0;
		if (recent) {
			focusPct = recent.progress.chapterSizes
				? Math.round(
						calculateBookProgress(
							recent.progress.chapterSizes,
							recent.progress.chapterIndex,
							recent.progress.scrollPercent
						) * 100
					)
				: Math.round((recent.progress.scrollPercent || 0) * 100);
		}
		this.focusProgress = focusPct;

		this.computeMissingChapterSizes(allBooks, allProgress);
		this.backfillSubjects(allBooks);
	}

	/** Status is 'duplicate' if the file is already in the library; throws on parse/save failure. */
	async upload(file: File): Promise<{ status: 'ok' | 'duplicate'; bookId: string }> {
		const buffer = await file.arrayBuffer();
		const id = await generateFileHash(buffer);
		if (await bookExists(id)) return { status: 'duplicate', bookId: id };

		const parsed = await parseEpub(buffer);
		const book: Book = {
			id,
			title: parsed.title,
			author: parsed.author,
			cover: parsed.cover,
			description: parsed.description,
			format: 'epub',
			addedAt: new Date(),
			filename: file.name,
			language: parsed.language,
			subjects: parsed.subjects
		};
		await saveBookWithFile(book, buffer);
		this.books = [book, ...this.books];
		if (!this.focusBook) {
			this.focusBook = book;
		}
		// Awaited so callers see the book at its final, sorted position
		await this.refresh();
		return { status: 'ok', bookId: id };
	}

	async remove(bookId: string) {
		await deleteBook(bookId);
		this.books = this.books.filter((b) => b.id !== bookId);
		if (this.focusBook?.id === bookId) {
			this.focusBook = null;
			this.focusProgress = 0;
		}
		this.refresh();
	}

	private buildProgressMap(allProgress: ReadingProgress[]): Record<string, number> {
		const map: Record<string, number> = {};
		for (const p of allProgress) {
			if (p.chapterSizes && p.chapterSizes.length > 0) {
				const pct = calculateBookProgress(p.chapterSizes, p.chapterIndex, p.scrollPercent);
				map[p.bookId] = Math.round(pct * 100);
			}
		}
		return map;
	}

	/** Books saved before genres were extracted get them once, from the stored file. */
	private async backfillSubjects(allBooks: Book[]) {
		for (const book of allBooks.filter((b) => b.subjects === undefined)) {
			try {
				const fileData = await getBookFile(book.id);
				if (!fileData) continue;
				const { subjects } = await parseEpub(fileData);
				await saveBook({ ...$state.snapshot(book), subjects });
				this.books = this.books.map((b) => (b.id === book.id ? { ...b, subjects } : b));
			} catch (e) {
				console.error(`[LIBRARY] Failed to backfill subjects for ${book.id}:`, e);
			}
		}
	}

	private async computeMissingChapterSizes(allBooks: Book[], allProgress: ReadingProgress[]) {
		const missing = allProgress.filter((p) => !p.chapterSizes || p.chapterSizes.length === 0);
		if (missing.length === 0) return;
		for (const progress of missing) {
			const book = allBooks.find((b) => b.id === progress.bookId);
			if (!book) continue;
			try {
				const fileData = await getBookFile(progress.bookId);
				if (!fileData) continue;
				const { parseEpubChapters } = await import('./parsers/epub');
				const result = await parseEpubChapters(fileData);
				progress.chapterSizes = result.chapters.map((c) => measureChapterContent(c.content));
				await saveProgress(progress);
			} catch (e) {
				console.error(`[LIBRARY] Failed to compute chapter sizes for ${book.id}:`, e);
			}
		}
		const freshProgress = await getAllProgress();
		const map = this.buildProgressMap(freshProgress);
		this.bookProgressMap = map;
		if (this.focusBook && map[this.focusBook.id] !== undefined) {
			this.focusProgress = map[this.focusBook.id];
		}
	}
}

export const cache = new LibraryCache();
