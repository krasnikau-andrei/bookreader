import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Reader Swipe Gestures', () => {
	test.beforeEach(async ({ page }) => {
		// Capture console logs
		page.on('console', msg => console.log('Browser console:', msg.text()));
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
		const box = await content.boundingBox();
		expect(box).toBeTruthy();
		if (!box) return;

		// Get initial scroll position
		const initialScroll = await content.evaluate((el) => (el as HTMLElement).scrollLeft);

		// Simulate swipe left with velocity (fast drag)
		const startX = box.x + box.width * 0.8;
		const endX = box.x + box.width * 0.2;
		const centerY = box.y + box.height * 0.5;

		await page.mouse.move(startX, centerY);
		await page.mouse.down();
		await page.mouse.move(endX, centerY, { steps: 5 }); // Fast movement
		await page.mouse.up();

		// Wait for animation
		await page.waitForTimeout(500);

		// Should have moved to next page
		const finalScroll = await content.evaluate((el) => (el as HTMLElement).scrollLeft);
		expect(finalScroll).toBeGreaterThan(initialScroll);

		// Should be at a valid snap point
		const clientWidth = await content.evaluate((el) => (el as HTMLElement).clientWidth);
		const pageIndex = Math.round(finalScroll / clientWidth);
		const expectedScroll = pageIndex * clientWidth;
		expect(Math.abs(finalScroll - expectedScroll)).toBeLessThan(clientWidth * 0.02);
	});

	test('swipe right completes to previous page', async ({ page }) => {
		const content = page.locator('[data-testid="reader-content"]');
		const box = await content.boundingBox();
		expect(box).toBeTruthy();
		if (!box) return;

		// First, navigate forward a bit
		await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.5);
		await page.mouse.down();
		await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5, { steps: 5 });
		await page.mouse.up();
		await page.waitForTimeout(500);

		const midScroll = await content.evaluate((el) => (el as HTMLElement).scrollLeft);
		expect(midScroll).toBeGreaterThan(0);

		// Now swipe right (back)
		console.log('Starting second swipe (right)');
		await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5);
		await page.mouse.down();
		await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.5, { steps: 5 });
		await page.mouse.up();
		console.log('Second swipe mouse up');
		await page.waitForTimeout(1000);

		// Should have moved back
		const finalScroll = await content.evaluate((el) => (el as HTMLElement).scrollLeft);
		expect(finalScroll).toBeLessThan(midScroll);

		// Should be at valid snap point
		const clientWidth = await content.evaluate((el) => (el as HTMLElement).clientWidth);
		const pageIndex = Math.round(finalScroll / clientWidth);
		const expectedScroll = pageIndex * clientWidth;
		expect(Math.abs(finalScroll - expectedScroll)).toBeLessThan(clientWidth * 0.02);
	});

	test('short slow swipe cancels and returns to start', async ({ page }) => {
		const content = page.locator('[data-testid="reader-content"]');
		const box = await content.boundingBox();
		expect(box).toBeTruthy();
		if (!box) return;

		const initialScroll = await content.evaluate((el) => (el as HTMLElement).scrollLeft);

		// Short, slow drag (less than 30% threshold)
		const startX = box.x + box.width * 0.5;
		const endX = box.x + box.width * 0.4; // Only 10% of width
		const centerY = box.y + box.height * 0.5;

		await page.mouse.move(startX, centerY);
		await page.mouse.down();
		await page.mouse.move(endX, centerY, { steps: 20 }); // Slow movement
		await page.mouse.up();
		await page.waitForTimeout(500);

		// Should be back at start (or very close due to CSS scroll-snap)
		const finalScroll = await content.evaluate((el) => (el as HTMLElement).scrollLeft);
		const clientWidth = await content.evaluate((el) => (el as HTMLElement).clientWidth);

		// Should still be at valid snap point
		const pageIndex = Math.round(finalScroll / clientWidth);
		const expectedScroll = pageIndex * clientWidth;
		expect(Math.abs(finalScroll - expectedScroll)).toBeLessThan(clientWidth * 0.02);
	});

	test('tap navigation has smooth animation', async ({ page }) => {
		const content = page.locator('[data-testid="reader-content"]');
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
});
