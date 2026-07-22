import { readFile } from 'fs/promises';
import { parseEpubChapters } from './src/lib/parsers/epub';

const file = 'broken_books/2026-07-16T13-29-31-682Z_Как изобрести все. Создай цивилизацию с нуля (Райан Норт) (z-library.sk, 1lib.sk, z-lib.sk).epub';
const buf = await readFile(file);
const result = await parseEpubChapters(buf.buffer);
console.log('Chapters:', result.chapters.length);
result.chapters.slice(0, 10).forEach((c, i) => {
  const textLen = c.content.replace(/<[^>]+>/g, '').trim().length;
  console.log('  [' + i + '] title="' + c.title + '" textChars=' + textLen);
});
if (result.chapters.length > 10) {
  console.log('  ... (' + (result.chapters.length - 10) + ' more)');
}
