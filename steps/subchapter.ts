import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import JSZip from 'jszip';

const { When, Then } = createBdd();

async function createEpubWithSubchapters(): Promise<Buffer> {
	const zip = new JSZip();

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

	const chapter1Content = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Chapter 1</title></head>
<body>
<h1>Chapter 1: The Beginning</h1>
<p>This is the introduction to Chapter 1. It contains some text that leads into the first section.</p>
<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
<h2 id="section1">Section 1.1: First Subchapter</h2>
<p>This is the first subchapter. It should start on a new page.</p>
<p>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
<p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>
<h2 id="section2">Section 1.2: Second Subchapter</h2>
<p>This is the second subchapter. It should also start on a new page.</p>
<p>Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
<p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.</p>
</body>
</html>`;

	zip.file('EPUB/chapter1.xhtml', chapter1Content);

	const navHtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>TOC</title></head>
<body>
<nav epub:type="toc" id="toc">
<h1>Table of Contents</h1>
<ol>
  <li>
    <a href="chapter1.xhtml">Chapter 1: The Beginning</a>
    <ol>
      <li><a href="chapter1.xhtml#section1">Section 1.1: First Subchapter</a></li>
      <li><a href="chapter1.xhtml#section2">Section 1.2: Second Subchapter</a></li>
    </ol>
  </li>
</ol>
</nav>
</body>
</html>`;

	zip.file('EPUB/nav.xhtml', navHtml);

	zip.file(
		'EPUB/content.opf',
		`<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" xmlns="http://www.idpf.org/2007/opf">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Test Book with Subchapters</dc:title>
    <dc:creator>Test Author</dc:creator>
    <dc:identifier id="book-id">test-subchapters</dc:identifier>
    <dc:language>en</dc:language>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ch1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="ch1"/>
  </spine>
</package>`
	);

	const zipBuffer = await zip.generateAsync({ type: 'uint8array' });
	return Buffer.from(zipBuffer);
}

When('I create and upload an EPUB with subchapters', async ({ page }) => {
	await page.goto('/');
	await page.waitForLoadState('networkidle');

	const epubBuffer = await createEpubWithSubchapters();
	await page.evaluate(
		async ({ buffer }) => {
			const uint8Array = new Uint8Array(buffer);
			const blob = new Blob([uint8Array], { type: 'application/epub+zip' });
			const file = new File([blob], 'test-subchapters.epub', { type: 'application/epub+zip' });
			const dataTransfer = new DataTransfer();
			dataTransfer.items.add(file);
			const input = document.querySelector('input[type="file"]') as HTMLInputElement;
			input.files = dataTransfer.files;
			input.dispatchEvent(new Event('change', { bubbles: true }));
		},
		{ buffer: Array.from(epubBuffer) }
	);

	await page.waitForSelector('[data-testid="book-card"]');
});

Then('subchapter headings should have the {string} class', async ({ page }) => {
	const classes = await page.evaluate(() => {
		const section1 = document.getElementById('section1');
		const section2 = document.getElementById('section2');
		return {
			section1HasClass: section1?.classList.contains('subchapter-start') ?? false,
			section2HasClass: section2?.classList.contains('subchapter-start') ?? false
		};
	});
	expect(classes.section1HasClass).toBe(true);
	expect(classes.section2HasClass).toBe(true);
});

Then('each subchapter heading should be at the start of a column', async ({ page }) => {
	await page.evaluate(async () => {
		await document.fonts.ready;
		await new Promise((r) => requestAnimationFrame(r));
	});

	const columnInfo = await page.evaluate(() => {
		const content = document.querySelector('[data-testid="reader-content"]') as HTMLElement;
		if (!content) return { error: 'Content not found' };
		const inner = content.querySelector('.content-inner') as HTMLElement | null;
		const pad = inner ? parseFloat(getComputedStyle(inner).paddingLeft) || 0 : 0;
		const section1 = document.getElementById('section1');
		const section2 = document.getElementById('section2');
		if (!section1 || !section2) {
			return {
				error: 'Subchapter elements not found',
				section1Exists: !!section1,
				section2Exists: !!section2
			};
		}
		const contentRect = content.getBoundingClientRect();
		const columnWidth = contentRect.width;
		const section1Offset = section1.offsetLeft;
		const section2Offset = section2.offsetLeft;
		const section1Column = Math.round(section1Offset / columnWidth);
		const section2Column = Math.round(section2Offset / columnWidth);
		return {
			columnWidth,
			section1: {
				offsetLeft: section1Offset,
				column: section1Column,
				distanceToColumnStart: Math.abs(section1Offset - section1Column * columnWidth - pad)
			},
			section2: {
				offsetLeft: section2Offset,
				column: section2Column,
				distanceToColumnStart: Math.abs(section2Offset - section2Column * columnWidth - pad)
			}
		};
	});

	if ('error' in columnInfo) throw new Error((columnInfo as { error: string }).error);
	const info = columnInfo as {
		section1: { distanceToColumnStart: number };
		section2: { distanceToColumnStart: number };
	};
	expect(info.section1.distanceToColumnStart).toBeLessThan(25);
	expect(info.section2.distanceToColumnStart).toBeLessThan(25);
});

Then('subchapters should be in different columns', async ({ page }) => {
	const columns = await page.evaluate(() => {
		const content = document.querySelector('[data-testid="reader-content"]') as HTMLElement;
		if (!content) return { error: 'Content not found' };
		const section1 = document.getElementById('section1');
		const section2 = document.getElementById('section2');
		if (!section1 || !section2) return { error: 'Subchapter elements not found' };
		const contentRect = content.getBoundingClientRect();
		const columnWidth = contentRect.width;
		return {
			section1Column: Math.round(section1.offsetLeft / columnWidth),
			section2Column: Math.round(section2.offsetLeft / columnWidth)
		};
	});
	if ('error' in columns) throw new Error((columns as { error: string }).error);
	const info = columns as { section1Column: number; section2Column: number };
	expect(info.section1Column).not.toBe(info.section2Column);
});
