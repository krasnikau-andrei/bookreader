import type { Book } from '$lib/types';

// 1x1 PNG, like the placeholder cover some converters ship
export const ONE_PIXEL_COVER =
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const base: Omit<Book, 'id' | 'title' | 'author' | 'cover'> = {
	description: null,
	format: 'epub',
	addedAt: new Date(),
	filename: 'book.epub',
	language: 'ru'
};

export const sampleBooks: Book[] = [
	{
		...base,
		id: 'warhammer',
		title: 'Warhammer 40000: Ересь Хоруса. Омнибус. Том II (warhammer 40000: ересь хоруса)',
		author: 'Дэн  Абнетт',
		cover: 'https://placehold.co/552x716/3a2a20/d6caba?text=Horus',
		subjects: ['sf_epic']
	},
	{
		...base,
		id: 'lighthouse',
		title: 'Невероятные приключения старого смотрителя маяка на краю холодного северного моря',
		author: 'Выдуманный Автор',
		cover: null,
		subjects: ['humor_prose']
	},
	{
		...base,
		id: 'wide',
		title: 'Как изобрести все. Создай цивилизацию с нуля',
		author: 'Райан Норт',
		cover: 'https://placehold.co/1500x900/eeeeee/111111?text=Wide+cover',
		subjects: []
	},
	{
		...base,
		id: 'pixel',
		title: 'Book With Cover',
		author: 'Test Author',
		cover: ONE_PIXEL_COVER,
		subjects: []
	},
	{
		...base,
		id: 'epub3',
		title: 'Accessible EPUB 3',
		author: 'Matt Garrish',
		cover: 'https://placehold.co/2100x2756/a32a2a/eeeeee?text=Accessible+EPUB+3',
		subjects: []
	}
];

const HOUR = 3600_000;
export const sampleLastRead: Record<string, Date> = {
	warhammer: new Date(Date.now() - 2 * HOUR),
	lighthouse: new Date(Date.now() - 5 * HOUR),
	wide: new Date(Date.now() - 80 * HOUR)
};

export const sampleProgress: Record<string, number> = { warhammer: 37, lighthouse: 55, wide: 12 };
