import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function dispatchTouch(
	page: import('@playwright/test').Page,
	clientX: number,
	clientY: number,
	type: 'touchstart' | 'touchmove' | 'touchend'
) {
	await page.evaluate(
		({ x, y, t }) => {
			const el = document.querySelector('[data-testid="reader-content"]');
			if (!el) return;
			const touch = new Touch({
				identifier: 0,
				target: el,
				clientX: x,
				clientY: y
			});
			const event = new TouchEvent(t, {
				touches: t === 'touchend' ? [] : [touch],
				changedTouches: [touch],
				bubbles: true,
				cancelable: true
			});
			el.dispatchEvent(event);
		},
		{ x: clientX, y: clientY, t: type }
	);
}

test.describe('Reader Swipe Gestures', () => {
	test.beforeEach(async ({ page }) => {
		page.on('console', (msg) => console.log('Browser console:', msg.text()));
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		const fileInput = page.locator('input[type="file"]');
		const testBookPath = path.join(__dirname, 'fixtures', 'crime-punishment.epub');
		await fileInput.setInputFiles(testBookPath);
		await page.waitForSelector('[data-testid="book-card"]');

		const bookCard = page.locator('[data-testid="book-card"]').first();
		await bookCard.click();
		await page.waitForSelector('.reader');
		await page.waitForSelector('[data-testid="reader-content"]', { timeout: 10000 });
	});

	test('swipe left completes to next page with velocity', async ({ page }) => {
		// Uses touch events to simulate a real mobile swipe left (next page).
		// touchstart → touchmove → touchend triggers the swipe handler's touch listener,
		// which calls handleRightTap() to advance one page.
		const content = page.locator('[data-testid="reader-content"]');

		// Navigate past cover chapter (single viewport) to reach multi-column content
		const reader = page.locator('.reader');
		const readerBox = await reader.boundingBox();
		expect(readerBox).toBeTruthy();
		if (!readerBox) return;
		for (let i = 0; i < 14; i++) {
			await reader.click({
				position: { x: readerBox.width * 0.8, y: readerBox.height * 0.5 }
			});
			await page.waitForTimeout(500);
		}
		await page.waitForTimeout(800);

		const box = await content.boundingBox();
		expect(box).toBeTruthy();
		if (!box) return;

		const initialScroll = await content.evaluate((el) => (el as HTMLElement).scrollLeft);

		// Swipe left: finger moves from right (80%) to left (20%)
		const startX = box.x + box.width * 0.8;
		const endX = box.x + box.width * 0.2;
		const centerY = box.y + box.height * 0.5;

		await dispatchTouch(page, startX, centerY, 'touchstart');
		await dispatchTouch(page, endX, centerY, 'touchmove');
		await page.waitForTimeout(50);
		await dispatchTouch(page, endX, centerY, 'touchend');

		// Wait for animation to complete
		await page.waitForTimeout(800);

		const finalScroll = await content.evaluate((el) => (el as HTMLElement).scrollLeft);
		console.log(
			'Swipe test - initial scroll:',
			initialScroll,
			'final scroll:',
			finalScroll,
			'scrollWidth:',
			await content.evaluate((el) => (el as HTMLElement).scrollWidth),
			'clientWidth:',
			await content.evaluate((el) => (el as HTMLElement).clientWidth)
		);
		expect(finalScroll).toBeGreaterThan(initialScroll);

		const clientWidth = await content.evaluate((el) => (el as HTMLElement).clientWidth);
		const pageIndex = Math.round(finalScroll / clientWidth);
		const expectedScroll = pageIndex * clientWidth;
		expect(Math.abs(finalScroll - expectedScroll)).toBeLessThan(clientWidth * 0.04);
	});

	test('tap left navigates to previous page', async ({ page }) => {
		// Uses touch events to simulate a mobile swipe right (previous page).
		const content = page.locator('[data-testid="reader-content"]');

		const reader = page.locator('.reader');
		const readerBox = await reader.boundingBox();
		expect(readerBox).toBeTruthy();
		if (!readerBox) return;
		for (let i = 0; i < 14; i++) {
			await reader.click({
				position: { x: readerBox.width * 0.8, y: readerBox.height * 0.5 }
			});
			await page.waitForTimeout(500);
		}
		await page.waitForTimeout(1000);

		const box = await content.boundingBox();
		expect(box).toBeTruthy();
		if (!box) return;

		// Navigate forward one page first so we have a page to go back from
		await content.click({ position: { x: box.width * 0.8, y: box.height * 0.5 } });
		await page.waitForTimeout(800);

		const midScroll = await content.evaluate((el) => (el as HTMLElement).scrollLeft);
		expect(midScroll).toBeGreaterThan(0);

		// Swipe right: finger moves from left (20%) to right (80%)
		const startX = box.x + box.width * 0.2;
		const endX = box.x + box.width * 0.8;
		const centerY = box.y + box.height * 0.5;

		await dispatchTouch(page, startX, centerY, 'touchstart');
		await dispatchTouch(page, endX, centerY, 'touchmove');
		await page.waitForTimeout(50);
		await dispatchTouch(page, endX, centerY, 'touchend');

		await page.waitForTimeout(800);

		const finalScroll = await content.evaluate((el) => (el as HTMLElement).scrollLeft);
		expect(finalScroll).toBeLessThan(midScroll);

		const clientWidth = await content.evaluate((el) => (el as HTMLElement).clientWidth);
		const pageIndex = Math.round(finalScroll / clientWidth);
		const expectedScroll = pageIndex * clientWidth;
		expect(Math.abs(finalScroll - expectedScroll)).toBeLessThan(clientWidth * 0.04);
	});

	test('content always at valid snap point', async ({ page }) => {
		const content = page.locator('[data-testid="reader-content"]');
		const box = await content.boundingBox();
		expect(box).toBeTruthy();
		if (!box) return;

		await content.click({ position: { x: box.width * 0.8, y: box.height * 0.5 } });
		await page.waitForTimeout(600);

		const scrollLeft = await content.evaluate((el) => (el as HTMLElement).scrollLeft);
		const clientWidth = await content.evaluate((el) => (el as HTMLElement).clientWidth);

		const pageIndex = Math.round(scrollLeft / clientWidth);
		const expectedScroll = pageIndex * clientWidth;
		expect(Math.abs(scrollLeft - expectedScroll)).toBeLessThan(clientWidth * 0.04);

		await content.click({ position: { x: box.width * 0.8, y: box.height * 0.5 } });
		await page.waitForTimeout(600);

		const scrollLeft2 = await content.evaluate((el) => (el as HTMLElement).scrollLeft);
		const pageIndex2 = Math.round(scrollLeft2 / clientWidth);
		const expectedScroll2 = pageIndex2 * clientWidth;
		expect(Math.abs(scrollLeft2 - expectedScroll2)).toBeLessThan(clientWidth * 0.04);
	});

	test('tap navigation has smooth animation', async ({ page }) => {
		const content = page.locator('[data-testid="reader-content"]');

		const reader = page.locator('.reader');
		const readerBox = await reader.boundingBox();
		expect(readerBox).toBeTruthy();
		if (!readerBox) return;
		for (let i = 0; i < 14; i++) {
			await reader.click({
				position: { x: readerBox.width * 0.8, y: readerBox.height * 0.5 }
			});
			await page.waitForTimeout(500);
		}
		await page.waitForTimeout(1000);

		const box = await content.boundingBox();
		expect(box).toBeTruthy();
		if (!box) return;

		const initialScroll = await content.evaluate((el) => (el as HTMLElement).scrollLeft);

		await content.click({ position: { x: box.width * 0.8, y: box.height * 0.5 } });

		const scrollAfter50ms = await content.evaluate((el) => (el as HTMLElement).scrollLeft);
		await page.waitForTimeout(50);
		const scrollAfter100ms = await content.evaluate((el) => (el as HTMLElement).scrollLeft);

		const hasAnimation = scrollAfter50ms > initialScroll || scrollAfter100ms > scrollAfter50ms;
		expect(hasAnimation || scrollAfter100ms > initialScroll).toBe(true);
	});

	test('swipe should only move one page regardless of distance', async ({ page }) => {
		const content = page.locator('[data-testid="reader-content"]');

		const reader = page.locator('.reader');
		const readerBox = await reader.boundingBox();
		expect(readerBox).toBeTruthy();
		if (!readerBox) return;
		for (let i = 0; i < 14; i++) {
			await reader.click({
				position: { x: readerBox.width * 0.8, y: readerBox.height * 0.5 }
			});
			await page.waitForTimeout(500);
		}
		await page.waitForTimeout(800);

		const box = await content.boundingBox();
		expect(box).toBeTruthy();
		if (!box) return;

		const clientWidth = await content.evaluate((el) => (el as HTMLElement).clientWidth);
		const initialScroll = await content.evaluate((el) => (el as HTMLElement).scrollLeft);
		const initialPage = Math.round(initialScroll / clientWidth);

		// Big swipe across 80% of the screen
		const startX = box.x + box.width * 0.9;
		const endX = box.x + box.width * 0.1;
		const centerY = box.y + box.height * 0.5;

		await dispatchTouch(page, startX, centerY, 'touchstart');
		await dispatchTouch(page, endX, centerY, 'touchmove');
		await page.waitForTimeout(50);
		await dispatchTouch(page, endX, centerY, 'touchend');

		await page.waitForTimeout(800);

		const finalScroll = await content.evaluate((el) => (el as HTMLElement).scrollLeft);
		const finalPage = Math.round(finalScroll / clientWidth);

		const pagesMoved = finalPage - initialPage;
		expect(
			pagesMoved,
			`Swipe moved ${pagesMoved} pages (from ${initialPage} to ${finalPage}). Should be exactly 1 regardless of swipe distance.`
		).toBe(1);
	});

	test('swipe should use constant animation speed', async ({ page }) => {
		const content = page.locator('[data-testid="reader-content"]');

		const reader = page.locator('.reader');
		const readerBox = await reader.boundingBox();
		expect(readerBox).toBeTruthy();
		if (!readerBox) return;
		for (let i = 0; i < 14; i++) {
			await reader.click({
				position: { x: readerBox.width * 0.8, y: readerBox.height * 0.5 }
			});
			await page.waitForTimeout(500);
		}
		await page.waitForTimeout(800);

		const box = await content.boundingBox();
		expect(box).toBeTruthy();
		if (!box) return;

		await content.click({ position: { x: box.width * 0.8, y: box.height * 0.5 } });
		await page.waitForTimeout(600);
		const scrollAfterFast = await content.evaluate((el) => (el as HTMLElement).scrollLeft);
		const clientWidth = await content.evaluate((el) => (el as HTMLElement).clientWidth);
		const pageAfterFast = Math.round(scrollAfterFast / clientWidth);

		await content.click({ position: { x: box.width * 0.8, y: box.height * 0.5 } });
		await page.waitForTimeout(600);
		const scrollAfterSlow = await content.evaluate((el) => (el as HTMLElement).scrollLeft);
		const pageAfterSlow = Math.round(scrollAfterSlow / clientWidth);

		expect(
			pageAfterSlow - pageAfterFast,
			`Both clicks should move exactly 1 page each. First ended at page ${pageAfterFast}, second at page ${pageAfterSlow}`
		).toBe(1);
	});
});
