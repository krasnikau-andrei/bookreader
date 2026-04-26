import { describe, test, expect } from 'vitest';
import { parseEpubChapters } from './epub';

describe('parseEpubChapters', () => {
	test('extracts chapters from EPUB spine', async () => {
		const epubBuffer = await createEpubWithChapters([
			{ id: 'chapter1', title: 'Chapter 1', content: '<p>First chapter content</p>' },
			{ id: 'chapter2', title: 'Chapter 2', content: '<p>Second chapter content</p>' }
		]);

		const result = await parseEpubChapters(epubBuffer);

		expect(result.chapters).toHaveLength(2);
		expect(result.chapters[0].id).toBe('chapter1');
		expect(result.chapters[0].title).toBe('Chapter 1');
		expect(result.chapters[0].content).toContain('First chapter content');
		expect(result.chapters[1].id).toBe('chapter2');
		expect(result.chapters[1].title).toBe('Chapter 2');
	});

	test('handles EPUB with single chapter', async () => {
		const epubBuffer = await createEpubWithChapters([
			{ id: 'intro', title: 'Introduction', content: '<p>Intro content</p>' }
		]);

		const result = await parseEpubChapters(epubBuffer);

		expect(result.chapters).toHaveLength(1);
		expect(result.chapters[0].title).toBe('Introduction');
	});

	test('should extract filePath for each chapter', async () => {
		const epubBuffer = await createEpubWithChapters([
			{ id: 'chapter1', title: 'Chapter 1', content: '<p>Content</p>' },
			{ id: 'chapter2', title: 'Chapter 2', content: '<p>Content</p>' }
		]);

		const result = await parseEpubChapters(epubBuffer);

		// Check that chapters have correct file paths
		expect(result.chapters[0].filePath).toBeDefined();
		expect(result.chapters[0].filePath).toBe('chapter1.xhtml');
		expect(result.chapters[1].filePath).toBe('chapter2.xhtml');
	});

	test('should build file-to-chapter index map', async () => {
		const epubBuffer = await createEpubWithChapters([
			{ id: 'chapter1', title: 'Chapter 1', content: '<p>Content</p>' },
			{ id: 'chapter2', title: 'Chapter 2', content: '<p>Content</p>' }
		]);

		const result = await parseEpubChapters(epubBuffer);

		// Should return both chapters and navigation map
		expect(result.chapters).toBeDefined();
		expect(result.navigationMap).toBeDefined();
		expect(result.navigationMap.filePathToChapterIndex.size).toBeGreaterThan(0);

		// Check mapping is correct
		expect(result.navigationMap.filePathToChapterIndex.get('chapter1.xhtml')).toBe(0);
		expect(result.navigationMap.filePathToChapterIndex.get('chapter2.xhtml')).toBe(1);
	});
});

async function createEpubWithChapters(
	chapters: Array<{ id: string; title: string; content: string }>
): Promise<ArrayBuffer> {
	const JSZip = (await import('jszip')).default;
	const zip = new JSZip();

	zip.file('mimetype', 'application/epub+zip');

	zip.file(
		'META-INF/container.xml',
		`<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
	);

	// Create chapter files
	const manifestItems: string[] = [];
	const spineItems: string[] = [];

	for (const chapter of chapters) {
		const fileName = `${chapter.id}.xhtml`;
		zip.file(
			fileName,
			`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${chapter.title}</title>
</head>
<body>
  <h1>${chapter.title}</h1>
  ${chapter.content}
</body>
</html>`
		);

		manifestItems.push(
			`<item id="${chapter.id}" href="${fileName}" media-type="application/xhtml+xml"/>`
		);
		spineItems.push(`<itemref idref="${chapter.id}"/>`);
	}

	zip.file(
		'content.opf',
		`<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" xmlns="http://www.idpf.org/2007/opf">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Test Book</dc:title>
    <dc:creator>Test Author</dc:creator>
    <dc:identifier id="bookid">test-id</dc:identifier>
    <dc:language>en</dc:language>
  </metadata>
  <manifest>
    ${manifestItems.join('\n')}
  </manifest>
  <spine>
    ${spineItems.join('\n')}
  </spine>
</package>`
	);

	return await zip.generateAsync({ type: 'arraybuffer' });
}
