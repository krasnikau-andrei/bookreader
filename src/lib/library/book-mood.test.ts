import { describe, test, expect } from 'vitest';
import { bookMood } from './book-mood';

// Subjects and titles taken from real EPUBs in broken_books/ and tests/fixtures/
describe('bookMood', () => {
	test.each([
		[['romance_sf', 'literature_short'], 'Рассказы о пилоте Пирксе', '🚀'],
		[['sci_psychology', 'popular_business'], 'Как привести дела в порядок', '🧠'],
		[['Образование'], 'Как делать полезные заметки', '🎓'],
		[['Fiction', 'Classics'], 'Crime and Punishment', '🏛️'],
		[[], 'Экстремальное программирование', '💻'],
		[[], 'The Great Gatsby', '']
	])('%j / %s', (subjects, title, expected) => {
		expect(bookMood(subjects, title)).toBe(expected);
	});
});
