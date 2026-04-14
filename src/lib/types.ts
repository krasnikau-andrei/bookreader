export interface Book {
	id: string;
	title: string;
	author: string;
	cover: string | null;
	fileData: ArrayBuffer;
	format: 'epub';
	addedAt: Date;
}
