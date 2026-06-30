export interface Book {
	id: string;
	title: string;
	author: string;
	cover: string | null;
	description: string | null;
	fileData?: ArrayBuffer;
	format: 'epub';
	addedAt: Date;
	filename: string;
	language: string;
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
	language?: string;
}
