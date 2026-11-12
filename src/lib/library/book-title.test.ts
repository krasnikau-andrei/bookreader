import { describe, test, expect } from 'vitest';
import { splitTitle, titleFontSize } from './book-title';

describe('splitTitle', () => {
	test.each([
		[
			'Warhammer 40000: Ересь Хоруса. Омнибус. Том II (warhammer 40000: ересь хоруса)',
			{ main: 'Warhammer 40000', subtitle: 'Ересь Хоруса. Омнибус. Том II' }
		],
		[
			'Как изобрести все. Создай цивилизацию с нуля',
			{ main: 'Как изобрести все', subtitle: 'Создай цивилизацию с нуля' }
		],
		['Accessible EPUB 3', { main: 'Accessible EPUB 3', subtitle: '' }],
		['  The   Great\nGatsby ', { main: 'The Great Gatsby', subtitle: '' }],
		// a short prefix like "Dr. Who" must not be split off
		['Dr. Who and the Daleks', { main: 'Dr. Who and the Daleks', subtitle: '' }]
	])('%s', (raw, expected) => {
		expect(splitTitle(raw), `raw title: ${JSON.stringify(raw)}`).toEqual(expected);
	});
});

describe('titleFontSize', () => {
	test('shrinks with length and stays within bounds', () => {
		const sizes = ['1984', 'Crime and Punishment', 'A'.repeat(80)].map((t) =>
			titleFontSize(t, 52, 28)
		);
		expect(sizes, `sizes: ${sizes}`).toEqual([52, 45, 28]);
	});
});
