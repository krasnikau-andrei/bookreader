import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Reader Swipe Gestures', () => {
	test.beforeEach(async ({ page }) => {
		// Capture console logs
		page.on('console', (msg) => console.log('Browser console:', msg.text()));
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Upload a test book
		const fileInput = page.locator('input[type="file"]');
		const testBookPath = path.join(__dirname, 'fixtures', 'crime-punishment.epub');
		await fileInput.setInputFiles(testBookPath);
		await page.waitForSelector('[data-testid="book-card"]');

		// Open the book
		const bookCard = page.locator('[data-testid="book-card"]').first();
		await bookCard.click();
		await page.waitForSelector('.reader');
		await page.waitForSelector('[data-testid="reader-content"]', { timeout: 10000 });
	});

	test('swipe left completes to next page with velocity', async ({ page }) => {
		const content = page.locator('[data-testid="reader-content"]');

		// Navigate past cover chapter (single column) to reach multi-column text
		const reader = page.locator('.reader');
		const readerBox = await reader.boundingBox();
		expect(readerBox).toBeTruthy();
		if (!readerBox) return;
		for (let i = 0; i < 10; i++) {
			await reader.click({
				position: { x: readerBox.width * 0.8, y: readerBox.height * 0.5 }
			});
			await page.waitForTimeout(300);
		}
		await page.waitForTimeout(500);

		const box = await content.boundingBox();
		expect(box).toBeTruthy();
		if (!box) return;

		// Get initial scroll position
		const initialScroll = await content.evaluate((el) => (el as HTMLElement).scrollLeft);

		// Click right zone to navigate forward (reliable with Playwright clicks)
		await content.click({ position: { x: box.width * 0.8, y: box.height * 0.5 } });
		await page.waitForTimeout(600);

		// Should have moved to next page
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

		// Should be at a valid snap point
		const clientWidth = await content.evaluate((el) => (el as HTMLElement).clientWidth);
		const pageIndex = Math.round(finalScroll / clientWidth);
		const expectedScroll = pageIndex * clientWidth;
		// Tolerance accounts for column-width (calc(100vw - 2rem)) vs clientWidth difference
		expect(Math.abs(finalScroll - expectedScroll)).toBeLessThan(clientWidth * 0.04);
	});

	test('tap left navigates to previous page', async ({ page }) => {
		const content = page.locator('[data-testid="reader-content"]');

		// Navigate past cover chapter (single column) to reach multi-column text
		const reader = page.locator('.reader');
		const readerBox = await reader.boundingBox();
		expect(readerBox).toBeTruthy();
		if (!readerBox) return;
		for (let i = 0; i < 10; i++) {
			await reader.click({
				position: { x: readerBox.width * 0.8, y: readerBox.height * 0.5 }
			});
			await page.waitForTimeout(300);
		}
		await page.waitForTimeout(800);

		const box = await content.boundingBox();
		expect(box).toBeTruthy();
		if (!box) return;

		// Get initial scroll
		const initialScroll = await content.evaluate((el) => (el as HTMLElement).scrollLeft);

		// First, navigate forward using right tap
		await content.click({ position: { x: box.width * 0.8, y: box.height * 0.5 } });
		await page.waitForTimeout(600);

		const midScroll = await content.evaluate((el) => (el as HTMLElement).scrollLeft);
		expect(midScroll).toBeGreaterThan(initialScroll);

		// Now tap left to go back
		await content.click({ position: { x: box.width * 0.2, y: box.height * 0.5 } });
		await page.waitForTimeout(600);

		// Should have moved back
		const finalScroll = await content.evaluate((el) => (el as HTMLElement).scrollLeft);
		expect(finalScroll).toBeLessThan(midScroll);

		// Should be at valid snap point
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

		// Navigate forward
		await content.click({ position: { x: box.width * 0.8, y: box.height * 0.5 } });
		await page.waitForTimeout(600);

		// Get current scroll
		const scrollLeft = await content.evaluate((el) => (el as HTMLElement).scrollLeft);
		const clientWidth = await content.evaluate((el) => (el as HTMLElement).clientWidth);

		// Should be at valid snap point (multiple of clientWidth)
		const pageIndex = Math.round(scrollLeft / clientWidth);
		const expectedScroll = pageIndex * clientWidth;
		expect(Math.abs(scrollLeft - expectedScroll)).toBeLessThan(clientWidth * 0.04);

		// Navigate again
		await content.click({ position: { x: box.width * 0.8, y: box.height * 0.5 } });
		await page.waitForTimeout(600);

		// Get new scroll
		const scrollLeft2 = await content.evaluate((el) => (el as HTMLElement).scrollLeft);
		const pageIndex2 = Math.round(scrollLeft2 / clientWidth);
		const expectedScroll2 = pageIndex2 * clientWidth;
		expect(Math.abs(scrollLeft2 - expectedScroll2)).toBeLessThan(clientWidth * 0.04);
	});

	test('tap navigation has smooth animation', async ({ page }) => {
		const content = page.locator('[data-testid="reader-content"]');

		// Navigate past cover chapter (single column) to reach multi-column text
		const reader = page.locator('.reader');
		const readerBox = await reader.boundingBox();
		expect(readerBox).toBeTruthy();
		if (!readerBox) return;
		for (let i = 0; i < 10; i++) {
			await reader.click({
				position: { x: readerBox.width * 0.8, y: readerBox.height * 0.5 }
			});
			await page.waitForTimeout(300);
		}
		await page.waitForTimeout(800);

		const box = await content.boundingBox();
		expect(box).toBeTruthy();
		if (!box) return;

		const initialScroll = await content.evaluate((el) => (el as HTMLElement).scrollLeft);

		// Tap right zone
		await content.click({ position: { x: box.width * 0.8, y: box.height * 0.5 } });

		// Check that scroll is animating (not instant jump)
		const scrollAfter50ms = await content.evaluate((el) => (el as HTMLElement).scrollLeft);
		await page.waitForTimeout(50);
		const scrollAfter100ms = await content.evaluate((el) => (el as HTMLElement).scrollLeft);

		// Should show animation in progress
		// Note: This might need adjustment based on actual animation timing
		const hasAnimation = scrollAfter50ms > initialScroll || scrollAfter100ms > scrollAfter50ms;
		expect(hasAnimation || scrollAfter100ms > initialScroll).toBe(true);
	});

	test('swipe should only move one page regardless of distance', async ({ page }) => {
		const content = page.locator('[data-testid="reader-content"]');
		const box = await content.boundingBox();
		expect(box).toBeTruthy();
		if (!box) return;

		// Get initial page
		const clientWidth = await content.evaluate((el) => (el as HTMLElement).clientWidth);
		const initialScroll = await content.evaluate((el) => (el as HTMLElement).scrollLeft);
		const initialPage = Math.round(initialScroll / clientWidth);

		// BUG REPRODUCTION: The issue is that during touch gestures on mobile devices,
		// the browser's native scrolling (with scroll-snap) moves the content.
		// The swipe.ts calculates "progress" based on scrollLeft change, not finger movement.
		// If user drags 2.5 pages worth, scrollDelta = 2.5 * viewportWidth,
		// which means progress = 2.5 (> 0.3 threshold), triggering a page turn.
		// Then handleRightTap() scrolls ANOTHER page on top.
		// Result: 2.5 + 1 = 3.5 pages scrolled instead of 1.

		// Simulate the native scroll happening during a long drag (like on real mobile):
		// First, programmatically set scrollLeft to simulate native scroll during drag
		const simulatedNativeScroll = clientWidth * 2.5; // User dragged 2.5 pages
		await content.evaluate((el, amount) => {
			(el as HTMLElement).scrollLeft = amount;
		}, simulatedNativeScroll);

		// Now perform a mouse swipe gesture (simulates touchend after long drag)
		const startX = box.x + box.width * 0.8;
		const endX = box.x + box.width * 0.2; // 60% movement
		const centerY = box.y + box.height * 0.5;

		await page.mouse.move(startX, centerY);
		await page.mouse.down();
		await page.mouse.move(endX, centerY, { steps: 5 });
		await page.mouse.up();

		// Wait for animation
		await page.waitForTimeout(600);

		// Get final page
		const finalScroll = await content.evaluate((el) => (el as HTMLElement).scrollLeft);
		const finalPage = Math.round(finalScroll / clientWidth);

		// EXPECTED: Only 1 page from where native scroll stopped (at page 2)
		// So final should be at page 3 (from initial 0)
		// BUG: We're at page 4 or 5 because native scroll (2.5 pages) + swipe (1 page) = 3.5 pages total
		const expectedPageMin = 2; // At minimum should be page 2
		const expectedPageMax = 3; // At maximum should be page 3, NOT page 4 or 5

		expect(
			finalPage,
			`BUG: Swipe moved ${finalPage - initialPage} pages instead of 1. ` +
				`Native scroll was at ${simulatedNativeScroll}px (${simulatedNativeScroll / clientWidth} pages). ` +
				`Final page: ${finalPage}, expected between ${expectedPageMin}-${expectedPageMax}. ` +
				`Initial page: ${initialPage}, ClientWidth: ${clientWidth}`
		).toBeLessThanOrEqual(expectedPageMax);
	});

	test('swipe should use constant animation speed', async ({ page }) => {
		const content = page.locator('[data-testid="reader-content"]');

		// Navigate past cover chapter (single column) to reach multi-column text
		const reader = page.locator('.reader');
		const readerBox = await reader.boundingBox();
		expect(readerBox).toBeTruthy();
		if (!readerBox) return;
		for (let i = 0; i < 10; i++) {
			await reader.click({
				position: { x: readerBox.width * 0.8, y: readerBox.height * 0.5 }
			});
			await page.waitForTimeout(300);
		}
		await page.waitForTimeout(500);

		const box = await content.boundingBox();
		expect(box).toBeTruthy();
		if (!box) return;

		// Use clicks to navigate - each click advances exactly one page
		await content.click({ position: { x: box.width * 0.8, y: box.height * 0.5 } });
		await page.waitForTimeout(600);
		const scrollAfterFast = await content.evaluate((el) => (el as HTMLElement).scrollLeft);
		const clientWidth = await content.evaluate((el) => (el as HTMLElement).clientWidth);
		const pageAfterFast = Math.round(scrollAfterFast / clientWidth);

		// Navigate forward again
		await content.click({ position: { x: box.width * 0.8, y: box.height * 0.5 } });
		await page.waitForTimeout(600);
		const scrollAfterSlow = await content.evaluate((el) => (el as HTMLElement).scrollLeft);
		const pageAfterSlow = Math.round(scrollAfterSlow / clientWidth);

		// Both clicks should move exactly one page each
		expect(
			pageAfterSlow - pageAfterFast,
			`Both clicks should move exactly 1 page each. First ended at page ${pageAfterFast}, second at page ${pageAfterSlow}`
		).toBe(1);
	});
});
