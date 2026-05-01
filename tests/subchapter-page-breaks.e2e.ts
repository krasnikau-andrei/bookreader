import { test, expect } from '@playwright/test';
import JSZip from 'jszip';

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

	// Chapter 1 with subchapters (sections that should start on new pages)
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

	// nav.xhtml with nested TOC
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

	// content.opf
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

test.describe('Subchapter Page Breaks', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
	});

	test('marks subchapter elements with subchapter-start class', async ({ page }) => {
		// Create and upload test EPUB
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

		// Wait for book to appear
		await page.waitForSelector('[data-testid="book-card"]');

		// Open the book
		const bookCard = page.locator('[data-testid="book-card"]').first();
		await bookCard.click();
		await page.waitForSelector('.reader');
		await page.waitForSelector('[data-testid="reader-content"]', { timeout: 10000 });

		// Check that subchapter elements have the subchapter-start class
		const subchapterClasses = await page.evaluate(() => {
			const section1 = document.getElementById('section1');
			const section2 = document.getElementById('section2');
			return {
				section1HasClass: section1?.classList.contains('subchapter-start') ?? false,
				section2HasClass: section2?.classList.contains('subchapter-start') ?? false,
				section1Classes: section1?.className ?? '',
				section2Classes: section2?.className ?? ''
			};
		});

		expect(subchapterClasses.section1HasClass).toBe(true);
		expect(subchapterClasses.section2HasClass).toBe(true);
	});

	test('subchapters start on new pages (columns)', async ({ page }) => {
		// Create and upload test EPUB
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

		// Wait for book to appear and open it
		await page.waitForSelector('[data-testid="book-card"]');
		const bookCard = page.locator('[data-testid="book-card"]').first();
		await bookCard.click();
		await page.waitForSelector('.reader');
		await page.waitForSelector('[data-testid="reader-content"]', { timeout: 10000 });

		// Wait for layout to settle
		await page.waitForTimeout(500);

		// Check that subchapter elements are at column boundaries
		const columnInfo = await page.evaluate(() => {
			const content = document.querySelector('[data-testid="reader-content"]') as HTMLElement;
			if (!content) return { error: 'Content not found' };

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

			// Calculate column index for each element
			// Elements at column start should have offsetLeft close to a multiple of columnWidth
			const section1Offset = section1.offsetLeft;
			const section2Offset = section2.offsetLeft;

			const section1Column = Math.round(section1Offset / columnWidth);
			const section2Column = Math.round(section2Offset / columnWidth);

			const section1ColumnStart = section1Column * columnWidth;
			const section2ColumnStart = section2Column * columnWidth;

			// Calculate how close each element is to a column start
			const section1DistanceToColumnStart = Math.abs(section1Offset - section1ColumnStart);
			const section2DistanceToColumnStart = Math.abs(section2Offset - section2ColumnStart);

			return {
				columnWidth,
				section1: {
					offsetLeft: section1Offset,
					column: section1Column,
					columnStart: section1ColumnStart,
					distanceToColumnStart: section1DistanceToColumnStart
				},
				section2: {
					offsetLeft: section2Offset,
					column: section2Column,
					columnStart: section2ColumnStart,
					distanceToColumnStart: section2DistanceToColumnStart
				}
			};
		});

		// Debug output
		console.log('Column info:', JSON.stringify(columnInfo, null, 2));

		if ('error' in columnInfo) {
			throw new Error(`Column check failed: ${(columnInfo as { error: string }).error}`);
		}

		const info = columnInfo as {
			columnWidth: number;
			section1: {
				offsetLeft: number;
				column: number;
				columnStart: number;
				distanceToColumnStart: number;
			};
			section2: {
				offsetLeft: number;
				column: number;
				columnStart: number;
				distanceToColumnStart: number;
			};
		};

		// Each subchapter should be at the start of a column (within 10px tolerance)
		expect(info.section1.distanceToColumnStart).toBeLessThan(10);
		expect(info.section2.distanceToColumnStart).toBeLessThan(10);

		// Subchapters should be in different columns
		expect(info.section1.column).not.toBe(info.section2.column);
	});
});
