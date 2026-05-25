import type { Book } from './types';

class LibraryCache {
	books = $state<Book[]>([]);
	bookProgressMap = $state<Record<string, number>>({});
	focusBook = $state<Book | null>(null);
	focusProgress = $state(0);
	chapterSizesReady = $state(false);
}

export const cache = new LibraryCache();
