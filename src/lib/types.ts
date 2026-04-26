export interface Book {
	id: string;
	title: string;
	author: string;
	cover: string | null;
	fileData: ArrayBuffer;
	format: 'epub';
	addedAt: Date;
	filename: string;
}

export interface ReadingProgress {
	bookId: string;
	chapterIndex: number;
	scrollPercent: number; // 0.0 - 1.0
	lastReadAt: Date;
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  filePath: string;
}

export interface ChapterNavigationMap {
  filePathToChapterIndex: Map<string, number>;
}
