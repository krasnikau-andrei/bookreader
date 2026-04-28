import { describe, it, expect } from 'vitest';
import { parseEpubChapters } from './epub';
import JSZip from 'jszip';

async function createEpub3WithNavToc(chapters: { id: string; title: string; href: string }[]) {
	const zip = new JSZip();

	// Create nav.xhtml with TOC
	const tocHtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>TOC</title></head>
<body>
<nav epub:type="toc" id="toc">
<h2>Table of Contents</h2>
<ol>
${chapters.map((c) => `<li><a href="${c.href}">${c.title}</a></li>`).join('\n')}
</ol>
</nav>
</body>
</html>`;

	// Create chapter files with H1 titles
	chapters.forEach((c) => {
		zip.file(
			`EPUB/${c.href}`,
			`<?xml version="1.0"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${c.id}</title></head>
<body><h1>${c.title}</h1><p>Content</p></body>
</html>`
		);
	});

	zip.file('EPUB/nav.xhtml', tocHtml);
	zip.file('mimetype', 'application/epub+zip');
	zip.file(
		'META-INF/container.xml',
		`<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles>
<rootfile full-path="EPUB/content.opf" media-type="application/oebps-package+xml"/>
</rootfiles>
</container>`
	);

	zip.file(
		'EPUB/content.opf',
		`<?xml version="1.0"?>
<package version="3.0" xmlns="http://www.idpf.org/2007/opf">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:title>Test Book</dc:title>
<dc:creator>Test Author</dc:creator>
</metadata>
<manifest>
<item id="toc" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
${chapters.map((c) => `<item id="${c.id}" href="${c.href}" media-type="application/xhtml+xml"/>`).join('\n')}
</manifest>
<spine>
${chapters.map((c) => `<itemref idref="${c.id}"/>`).join('\n')}
</spine>
</package>`
	);

	return zip.generateAsync({ type: 'arraybuffer' });
}

async function createEpub2WithNcxToc(chapters: { id: string; title: string; href: string }[]) {
	const zip = new JSZip();

	// Create toc.ncx with TOC
	const ncxContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
<head>
<meta name="dtb:uid" content="test-book"/>
<meta name="dtb:depth" content="1"/>
<meta name="dtb:totalPageCount" content="0"/>
<meta name="dtb:maxPageNumber" content="0"/>
</head>
<docTitle><text>Test Book</text></docTitle>
<navMap>
${chapters
	.map(
		(c, i) => `<navPoint id="${c.id}" playOrder="${i + 1}">
<navLabel><text>${c.title}</text></navLabel>
<content src="${c.href}"/>
</navPoint>`
	)
	.join('\n')}
</navMap>
</ncx>`;

	// Create chapter files with H1 titles
	chapters.forEach((c) => {
		zip.file(
			`EPUB/${c.href}`,
			`<?xml version="1.0"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${c.id}</title></head>
<body><h1>${c.title}</h1><p>Content</p></body>
</html>`
		);
	});

	zip.file('EPUB/toc.ncx', ncxContent);
	zip.file('mimetype', 'application/epub+zip');
	zip.file(
		'META-INF/container.xml',
		`<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles>
<rootfile full-path="EPUB/content.opf" media-type="application/oebps-package+xml"/>
</rootfiles>
</container>`
	);

	zip.file(
		'EPUB/content.opf',
		`<?xml version="1.0"?>
<package version="2.0" xmlns="http://www.idpf.org/2007/opf">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:title>Test Book</dc:title>
<dc:creator>Test Author</dc:creator>
</metadata>
<manifest>
<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
${chapters.map((c) => `<item id="${c.id}" href="${c.href}" media-type="application/xhtml+xml"/>`).join('\n')}
</manifest>
<spine toc="ncx">
${chapters.map((c) => `<itemref idref="${c.id}"/>`).join('\n')}
</spine>
</package>`
	);

	return zip.generateAsync({ type: 'arraybuffer' });
}

describe('TOC label parsing', () => {
	describe('EPUB 3 nav.xhtml', () => {
		it('uses HTML h1 title instead of TOC label', async () => {
			const epubBuffer = await createEpub3WithNavToc([
				{ id: 'ch1', title: 'Chapter 1: The Beginning', href: 'chapter1.xhtml' },
				{ id: 'ch2', title: 'Chapter 2: The Journey', href: 'chapter2.xhtml' }
			]);

			const result = await parseEpubChapters(epubBuffer);

			expect(result.chapters).toHaveLength(2);
			// Uses HTML h1 title (not TOC label)
			expect(result.chapters[0].title).toBe('Chapter 1: The Beginning');
			expect(result.chapters[1].title).toBe('Chapter 2: The Journey');
		});

		it('handles chapters in subdirectories', async () => {
			const epubBuffer = await createEpub3WithNavToc([
				{ id: 'ch1', title: 'Part 1: Introduction', href: 'part1/chapter1.xhtml' },
				{ id: 'ch2', title: 'Part 2: Main Content', href: 'part2/chapter2.xhtml' }
			]);

			const result = await parseEpubChapters(epubBuffer);

			expect(result.chapters).toHaveLength(2);
			expect(result.chapters[0].title).toBe('Part 1: Introduction');
			expect(result.chapters[1].title).toBe('Part 2: Main Content');
		});

		it('handles empty or missing TOC labels gracefully', async () => {
			const zip = new JSZip();

			// Create nav.xhtml with empty TOC entries
			const tocHtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>TOC</title></head>
<body>
<nav epub:type="toc" id="toc">
<h2>Table of Contents</h2>
<ol>
<li><a href="chapter1.xhtml"></a></li>
<li><a href="chapter2.xhtml">Chapter 2: Valid</a></li>
</ol>
</nav>
</body>
</html>`;

			zip.file(
				'EPUB/chapter1.xhtml',
				`<?xml version="1.0"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>ch1</title></head>
<body><h1>Chapter One</h1><p>Content</p></body>
</html>`
			);
			zip.file(
				'EPUB/chapter2.xhtml',
				`<?xml version="1.0"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>ch2</title></head>
<body><h1>Chapter 2: Valid</h1><p>Content</p></body>
</html>`
			);

			zip.file('EPUB/nav.xhtml', tocHtml);
			zip.file('mimetype', 'application/epub+zip');
			zip.file(
				'META-INF/container.xml',
				`<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles>
<rootfile full-path="EPUB/content.opf" media-type="application/oebps-package+xml"/>
</rootfiles>
</container>`
			);

			zip.file(
				'EPUB/content.opf',
				`<?xml version="1.0"?>
<package version="3.0" xmlns="http://www.idpf.org/2007/opf">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:title>Test Book</dc:title>
<dc:creator>Test Author</dc:creator>
</metadata>
<manifest>
<item id="toc" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
<item id="ch1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
<item id="ch2" href="chapter2.xhtml" media-type="application/xhtml+xml"/>
</manifest>
<spine>
<itemref idref="ch1"/>
<itemref idref="ch2"/>
</spine>
</package>`
			);

			const epubBuffer = await zip.generateAsync({ type: 'arraybuffer' });
			const result = await parseEpubChapters(epubBuffer);

			expect(result.chapters).toHaveLength(2);
			// Falls back to h1 when TOC label is empty
			expect(result.chapters[0].title).toBe('Chapter One');
			expect(result.chapters[1].title).toBe('Chapter 2: Valid');
		});
	});

	describe('EPUB 2 toc.ncx', () => {
		it('uses HTML h1 title instead of NCX labels', async () => {
			const epubBuffer = await createEpub2WithNcxToc([
				{ id: 'ch1', title: 'Chapter 1: The Beginning', href: 'chapter1.xhtml' },
				{ id: 'ch2', title: 'Chapter 2: The Journey', href: 'chapter2.xhtml' }
			]);

			const result = await parseEpubChapters(epubBuffer);

			expect(result.chapters).toHaveLength(2);
			// Uses HTML h1 title (not NCX label)
			expect(result.chapters[0].title).toBe('Chapter 1: The Beginning');
			expect(result.chapters[1].title).toBe('Chapter 2: The Journey');
		});

		it('handles chapters in subdirectories', async () => {
			const epubBuffer = await createEpub2WithNcxToc([
				{ id: 'ch1', title: 'Part 1: Introduction', href: 'part1/chapter1.xhtml' },
				{ id: 'ch2', title: 'Part 2: Main Content', href: 'part2/chapter2.xhtml' }
			]);

			const result = await parseEpubChapters(epubBuffer);

			expect(result.chapters).toHaveLength(2);
			expect(result.chapters[0].title).toBe('Part 1: Introduction');
			expect(result.chapters[1].title).toBe('Part 2: Main Content');
		});
	});

	describe('Fallback behavior', () => {
		it('falls back to HTML title when no h1/h2', async () => {
			const zip = new JSZip();

			// Create chapter with title element only
			zip.file(
				'EPUB/chapter1.xhtml',
				`<?xml version="1.0"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>HTML Title Chapter 1</title></head>
<body><p>Content without h1</p></body>
</html>`
			);

			zip.file(
				'EPUB/chapter2.xhtml',
				`<?xml version="1.0"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>HTML Title Chapter 2</title></head>
<body><p>Content without h1</p></body>
</html>`
			);

			zip.file('mimetype', 'application/epub+zip');
			zip.file(
				'META-INF/container.xml',
				`<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles>
<rootfile full-path="EPUB/content.opf" media-type="application/oebps-package+xml"/>
</rootfiles>
</container>`
			);

			zip.file(
				'EPUB/content.opf',
				`<?xml version="1.0"?>
<package version="3.0" xmlns="http://www.idpf.org/2007/opf">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:title>Test Book</dc:title>
<dc:creator>Test Author</dc:creator>
</metadata>
<manifest>
<item id="ch1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
<item id="ch2" href="chapter2.xhtml" media-type="application/xhtml+xml"/>
</manifest>
<spine>
<itemref idref="ch1"/>
<itemref idref="ch2"/>
</spine>
</package>`
			);

			const epubBuffer = await zip.generateAsync({ type: 'arraybuffer' });
			const result = await parseEpubChapters(epubBuffer);

			expect(result.chapters).toHaveLength(2);
			// Falls back to HTML <title> element
			expect(result.chapters[0].title).toBe('HTML Title Chapter 1');
			expect(result.chapters[1].title).toBe('HTML Title Chapter 2');
		});

		it('falls back to h2 when h1 unavailable', async () => {
			const zip = new JSZip();

			// Create chapter without title or h1 element
			zip.file(
				'EPUB/chapter1.xhtml',
				`<?xml version="1.0"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head></head>
<body><h2>Fallback H2 Title</h2><p>Content</p></body>
</html>`
			);

			zip.file('mimetype', 'application/epub+zip');
			zip.file(
				'META-INF/container.xml',
				`<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles>
<rootfile full-path="EPUB/content.opf" media-type="application/oebps-package+xml"/>
</rootfiles>
</container>`
			);

			zip.file(
				'EPUB/content.opf',
				`<?xml version="1.0"?>
<package version="3.0" xmlns="http://www.idpf.org/2007/opf">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:title>Test Book</dc:title>
<dc:creator>Test Author</dc:creator>
</metadata>
<manifest>
<item id="ch1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
</manifest>
<spine>
<itemref idref="ch1"/>
</spine>
</package>`
			);

			const epubBuffer = await zip.generateAsync({ type: 'arraybuffer' });
			const result = await parseEpubChapters(epubBuffer);

			expect(result.chapters).toHaveLength(1);
			expect(result.chapters[0].title).toBe('Fallback H2 Title');
		});

		it('uses "Untitled" when no title source available', async () => {
			const zip = new JSZip();

			// Create chapter without any title element
			zip.file(
				'EPUB/chapter1.xhtml',
				`<?xml version="1.0"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head></head>
<body><p>Content without title</p></body>
</html>`
			);

			zip.file('mimetype', 'application/epub+zip');
			zip.file(
				'META-INF/container.xml',
				`<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles>
<rootfile full-path="EPUB/content.opf" media-type="application/oebps-package+xml"/>
</rootfiles>
</container>`
			);

			zip.file(
				'EPUB/content.opf',
				`<?xml version="1.0"?>
<package version="3.0" xmlns="http://www.idpf.org/2007/opf">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:title>Test Book</dc:title>
<dc:creator>Test Author</dc:creator>
</metadata>
<manifest>
<item id="ch1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
</manifest>
<spine>
<itemref idref="ch1"/>
</spine>
</package>`
			);

			const epubBuffer = await zip.generateAsync({ type: 'arraybuffer' });
			const result = await parseEpubChapters(epubBuffer);

			expect(result.chapters).toHaveLength(1);
			expect(result.chapters[0].title).toBe('Untitled');
		});
	});

	describe('Title priority', () => {
		it('prefers h1 over TOC label, title, and h2', async () => {
			const zip = new JSZip();

			// Create chapter with all title sources
			zip.file(
				'EPUB/chapter1.xhtml',
				`<?xml version="1.0"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Title Tag</title></head>
<body><h1>H1 Title Preferred</h1><h2>H2 Title</h2><p>Content</p></body>
</html>`
			);

			// Create nav.xhtml with TOC label
			const tocHtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>TOC</title></head>
<body>
<nav epub:type="toc" id="toc">
<h2>Table of Contents</h2>
<ol>
<li><a href="chapter1.xhtml">TOC Label - Not Preferred</a></li>
</ol>
</nav>
</body>
</html>`;

			zip.file('EPUB/nav.xhtml', tocHtml);
			zip.file('mimetype', 'application/epub+zip');
			zip.file(
				'META-INF/container.xml',
				`<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles>
<rootfile full-path="EPUB/content.opf" media-type="application/oebps-package+xml"/>
</rootfiles>
</container>`
			);

			zip.file(
				'EPUB/content.opf',
				`<?xml version="1.0"?>
<package version="3.0" xmlns="http://www.idpf.org/2007/opf">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:title>Test Book</dc:title>
<dc:creator>Test Author</dc:creator>
</metadata>
<manifest>
<item id="toc" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
<item id="ch1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
</manifest>
<spine>
<itemref idref="ch1"/>
</spine>
</package>`
			);

			const epubBuffer = await zip.generateAsync({ type: 'arraybuffer' });
			const result = await parseEpubChapters(epubBuffer);

			expect(result.chapters).toHaveLength(1);
			// Should use h1, not TOC label
			expect(result.chapters[0].title).toBe('H1 Title Preferred');
		});
	});
});
