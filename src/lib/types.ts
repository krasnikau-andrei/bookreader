export interface Book {
	id: string;
	title: string;
	author: string;
	cover: string | null;
	description: string | null;
	format: 'epub';
	addedAt: Date;
	filename: string;
	language: string;
	// Absent on books saved before genres were extracted; backfilled by the library cache
	subjects?: string[];
}

export interface ReadingProgress {
	bookId: string;
	chapterIndex: number;
	scrollPercent: number; // 0.0 - 1.0
	lastReadAt: Date;
	chapterSizes?: number[];
}

export interface BookFile {
	id: string;
	fileData: ArrayBuffer;
}

export interface Chapter {
	id: string;
	title: string;
	content: string;
	filePath: string;
	level?: number; // 0 = root, 1 = nested, etc. for tree structure
}

/** Another reader's place in the book, drawn as a stripe in their colour */
export interface ProgressMarker {
	id: string;
	label: string;
	hue: number;
	/** Whole-book progress, 0..1 */
	percent: number;
}

/** Another reader's place in the open chapter, drawn as a line over the text */
export interface TextMarker {
	id: string;
	label: string;
	hue: number;
	/** How far into this chapter's text, 0..1 — see reader/text-position.ts */
	fraction: number;
}
