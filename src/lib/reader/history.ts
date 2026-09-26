/**
 * In-book reading history — our own browser-style history, kept in memory for
 * the lifetime of the reader screen.
 *
 * An entry is a concrete *position* (chapter + scroll percent), not just a
 * chapter, so going back drops the reader on the exact spot they jumped from.
 * Positions are captured by syncing the current entry on every reader position
 * update (see `sync`), so the entry the user is at always matches what is on
 * screen.
 *
 * Only explicit jumps (footnotes, internal links, table of contents) add
 * entries. Ordinary page turns sync the current entry instead — otherwise
 * swiping through a chapter would fill the history with every page.
 */
export interface ReaderPosition {
	chapter: number;
	/** Scroll position within the chapter, 0..1. */
	progress: number;
}

export interface ReaderHistory {
	/** The position a back press would return to; null when there is none. */
	previous(): ReaderPosition | null;
	/** Record a jump: the destination becomes the new current entry. */
	push(position: ReaderPosition): void;
	/** Keep the current entry aligned with the actual reader position. */
	sync(position: ReaderPosition): void;
	/** Step one entry back and return it; null when at the oldest entry. */
	back(): ReaderPosition | null;
}

/**
 * True when `target` sits further into the book than `current`.
 *
 * The position a jump left behind is not always behind us: following a
 * backlink from the notes chapter into the text leaves a target that lies
 * *ahead* in the book, and the back affordance has to point that way.
 */
export function isAheadOf(target: ReaderPosition, current: ReaderPosition): boolean {
	if (target.chapter !== current.chapter) return target.chapter > current.chapter;
	return target.progress > current.progress;
}

export function createReaderHistory(initial: ReaderPosition): ReaderHistory {
	let entries: ReaderPosition[] = [{ ...initial }];
	let cursor = 0;

	function previous(): ReaderPosition | null {
		return cursor > 0 ? { ...entries[cursor - 1] } : null;
	}

	function push(position: ReaderPosition) {
		// A jump from a rewound point discards the branch we came from,
		// exactly like navigating in a browser.
		entries = [...entries.slice(0, cursor + 1), { ...position }];
		cursor = entries.length - 1;
	}

	function sync(position: ReaderPosition) {
		entries[cursor] = { ...position };
	}

	function back(): ReaderPosition | null {
		if (cursor === 0) return null;
		cursor -= 1;
		return { ...entries[cursor] };
	}

	return { previous, push, sync, back };
}
