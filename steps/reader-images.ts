import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import JSZip from 'jszip';
import zlib from 'zlib';

const { Given, When, Then } = createBdd();

function createPngBuffer(width: number, height: number): Buffer {
	// Minimal valid PNG — solid white image
	// PNG signature
	const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

	// IHDR chunk (width, height, 8-bit RGB)
	const ihdrData = Buffer.alloc(13);
	ihdrData.writeUInt32BE(width, 0);
	ihdrData.writeUInt32BE(height, 4);
	ihdrData[8] = 8; // bit depth
	ihdrData[9] = 2; // color type: RGB
	ihdrData[10] = 0; // compression
	ihdrData[11] = 0; // filter
	ihdrData[12] = 0; // interlace

	const ihdr = createChunk('IHDR', ihdrData);

	// Raw image data: filter byte (0) + RGB pixels (white)
	const rawRow = Buffer.alloc(1 + width * 3); // filter byte + RGB
	rawRow[0] = 0; // no filter
	for (let x = 0; x < width; x++) {
		rawRow[1 + x * 3] = 0xff; // R
		rawRow[2 + x * 3] = 0xff; // G
		rawRow[3 + x * 3] = 0xff; // B
	}

	// Repeat for all rows
	const rawData = Buffer.alloc(height * rawRow.length);
	for (let y = 0; y < height; y++) {
		rawRow.copy(rawData, y * rawRow.length);
	}

	const compressed = zlib.deflateSync(rawData);
	const idat = createChunk('IDAT', compressed);

	// IEND chunk
	const iend = createChunk('IEND', Buffer.alloc(0));

	return Buffer.concat([signature, ihdr, idat, iend]);
}

function createChunk(type: string, data: Buffer): Buffer {
	const length = Buffer.alloc(4);
	length.writeUInt32BE(data.length, 0);
	const typeBuffer = Buffer.from(type, 'ascii');
	const crcData = Buffer.concat([typeBuffer, data]);

	// Compute CRC32
	let crc = 0xffffffff;
	for (let i = 0; i < crcData.length; i++) {
		crc ^= crcData[i];
		for (let j = 0; j < 8; j++) {
			crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
		}
	}
	crc ^= 0xffffffff;

	const crcBuf = Buffer.alloc(4);
	crcBuf.writeUInt32BE(crc >>> 0, 0);

	return Buffer.concat([length, typeBuffer, data, crcBuf]);
}

async function createEpubWithImage(): Promise<Buffer> {
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

	const imagePath = 'images/test.png';
	const imageBytes = createPngBuffer(400, 200);
	zip.file(`EPUB/${imagePath}`, imageBytes);

	const chapterContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Chapter 1</title></head>
<body>
<h1>Chapter with Image</h1>
<p>Here is an image:</p>
<p><img src="${imagePath}" alt="Test image" /></p>
<p>More text after the image.</p>
</body>
</html>`;

	zip.file('EPUB/chapter1.xhtml', chapterContent);

	const navHtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>TOC</title></head>
<body>
<nav epub:type="toc" id="toc">
<h1>Table of Contents</h1>
<ol>
  <li><a href="chapter1.xhtml">Chapter with Image</a></li>
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
    <dc:title>Test Book with Image</dc:title>
    <dc:creator>Test Author</dc:creator>
    <dc:identifier id="book-id">test-image-book</dc:identifier>
    <dc:language>en</dc:language>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ch1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
    <item id="img1" href="${imagePath}" media-type="image/png"/>
  </manifest>
  <spine>
    <itemref idref="ch1"/>
  </spine>
</package>`
	);

	const zipBuffer = await zip.generateAsync({ type: 'uint8array' });
	return Buffer.from(zipBuffer);
}

Given('I upload an EPUB with an image', async ({ page }) => {
	await page.goto('/');
	await page.waitForLoadState('networkidle');

	const epubBuffer = await createEpubWithImage();
	await page.evaluate(
		async ({ buffer }) => {
			const uint8Array = new Uint8Array(buffer);
			const blob = new Blob([uint8Array], { type: 'application/epub+zip' });
			const file = new File([blob], 'test-image-book.epub', { type: 'application/epub+zip' });
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

Then('the image should be contained within the readable area', async ({ page }) => {
	const content = page.locator('[data-testid="reader-content"]');
	const img = content.locator('img');
	await expect(img).toBeVisible();

	const contentBox = await content.boundingBox();
	expect(contentBox).toBeTruthy();
	if (!contentBox) return;

	const imgBox = await img.boundingBox();
	expect(imgBox).toBeTruthy();
	if (!imgBox) return;

	const imgRightEdge = imgBox.x + imgBox.width;
	const contentRightEdge = contentBox.x + contentBox.width;

	expect(imgRightEdge).toBeLessThanOrEqual(
		contentRightEdge + 1,
		`BUG: image overflows readable area. img right=${imgRightEdge}, content right=${contentRightEdge}`
	);
});

When('I click on the image in the reader', async ({ page }) => {
	const content = page.locator('[data-testid="reader-content"]');
	await content.waitFor({ state: 'visible', timeout: 10000 });

	const img = content.locator('img');
	await expect(img).toBeVisible({ timeout: 5000 });
	await img.first().click();
	await page.waitForTimeout(300);
});

Then('the image fullscreen should be visible', async ({ page }) => {
	const fullscreen = page.locator('[data-testid="image-fullscreen"]');
	await expect(fullscreen).toBeVisible();
});

Then('the fullscreen image should have the same source as the inline image', async ({ page }) => {
	const content = page.locator('[data-testid="reader-content"]');
	const inlineImg = content.locator('img');
	const inlineSrc = await inlineImg.getAttribute('src');

	const fullscreen = page.locator('[data-testid="image-fullscreen"]');
	const fullscreenImg = fullscreen.locator('img');
	const fullscreenSrc = await fullscreenImg.getAttribute('src');

	expect(fullscreenSrc).toBe(inlineSrc);
});

When('I tap on the fullscreen overlay', async ({ page }) => {
	const fullscreen = page.locator('[data-testid="image-fullscreen"]');
	await fullscreen.dispatchEvent('touchstart', {
		touches: [{ clientX: 100, clientY: 100, identifier: 0 }],
		cancelable: true
	});
	await page.waitForTimeout(50);
	await fullscreen.dispatchEvent('touchend', {
		changedTouches: [{ clientX: 100, clientY: 100, identifier: 0 }],
		cancelable: true
	});
	await page.waitForTimeout(200);
});

Then('the image fullscreen should be closed', async ({ page }) => {
	const fullscreen = page.locator('[data-testid="image-fullscreen"]');
	await expect(fullscreen).not.toBeVisible();
});

When('I pinch to zoom on the image', async ({ page }) => {
	const fullscreen = page.locator('[data-testid="image-fullscreen"]');
	const img = fullscreen.locator('img');
	const box = await img.boundingBox();
	expect(box).toBeTruthy();
	if (!box) return;

	const cx = box.x + box.width / 2;
	const cy = box.y + box.height / 2;
	const startDist = 50;
	const endDist = 150;

	await page.evaluate(
		({ cx, cy, d }: { cx: number; cy: number; d: number }) => {
			const el = document.querySelector('[data-testid="image-fullscreen"]');
			if (!el) return;
			const t1 = new Touch({ identifier: 0, target: el, clientX: cx - d / 2, clientY: cy });
			const t2 = new Touch({ identifier: 1, target: el, clientX: cx + d / 2, clientY: cy });
			el.dispatchEvent(
				new TouchEvent('touchstart', {
					touches: [t1, t2],
					changedTouches: [t1, t2],
					bubbles: true,
					cancelable: true
				})
			);
		},
		{ cx, cy, d: startDist }
	);

	await page.waitForTimeout(50);

	await page.evaluate(
		({ cx, cy, d }: { cx: number; cy: number; d: number }) => {
			const el = document.querySelector('[data-testid="image-fullscreen"]');
			if (!el) return;
			const t1 = new Touch({ identifier: 0, target: el, clientX: cx - d / 2, clientY: cy });
			const t2 = new Touch({ identifier: 1, target: el, clientX: cx + d / 2, clientY: cy });
			el.dispatchEvent(
				new TouchEvent('touchmove', {
					touches: [t1, t2],
					changedTouches: [t1, t2],
					bubbles: true,
					cancelable: true
				})
			);
		},
		{ cx, cy, d: endDist }
	);

	await page.waitForTimeout(50);

	await page.evaluate(
		({ cx, cy, d }: { cx: number; cy: number; d: number }) => {
			const el = document.querySelector('[data-testid="image-fullscreen"]');
			if (!el) return;
			const t1 = new Touch({ identifier: 0, target: el, clientX: cx - d / 2, clientY: cy });
			const t2 = new Touch({ identifier: 1, target: el, clientX: cx + d / 2, clientY: cy });
			el.dispatchEvent(
				new TouchEvent('touchend', {
					touches: [],
					changedTouches: [t1, t2],
					bubbles: true,
					cancelable: true
				})
			);
		},
		{ cx, cy, d: endDist }
	);

	await page.waitForTimeout(200);
});

Then('the image should be zoomed in', async ({ page }) => {
	const scale = await page.evaluate(() => {
		const el = document.querySelector('[data-testid="image-fullscreen"] img') as HTMLElement;
		const transform = el.style.transform;
		const match = transform.match(/scale\(([\d.]+)\)/);
		return match ? parseFloat(match[1]) : 1;
	});
	expect(scale).toBeGreaterThan(
		1,
		`BUG: image scale is ${scale}, expected > 1 after pinch-to-zoom`
	);
});
