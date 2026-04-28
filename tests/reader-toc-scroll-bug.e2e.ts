import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('TOC Chapter Switch Scroll Bug', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
	});

	test('switching chapters via TOC should reset scroll position', async ({ page }) => {
		// Upload a test book
		const fileInput = page.locator('input[type="file"]');
		const testBookPath = path.join(__dirname, 'fixtures', 'crime-punishment.epub');
		await fileInput.setInputFiles(testBookPath);
		await page.waitForSelector('[data-testid="book-card"]');

		const bookCard = page.locator('[data-testid="book-card"]').first();
		await bookCard.click();
		await page.waitForSelector('.reader');
		await page.waitForSelector('[data-testid="reader-content"]', { timeout: 10000 });
		await page.waitForTimeout(500);

		const content = page.locator('[data-testid="reader-content"]');

		// Step 1: Navigate to chapter 2 using right taps
		console.log('[TEST] Navigating to chapter 2...');
		const box = await content.boundingBox();
		expect(box).toBeTruthy();

		if (!box) return;

		// Navigate forward to reach chapter 2
		for (let i = 0; i < 3; i++) {
			await content.click({
				position: { x: box.width * 0.8, y: box.height * 0.5 }
			});
			await page.waitForTimeout(400);
		}

		// Wait for URL to update with chapter info
		await page.waitForTimeout(500);

		// Step 2: Scroll within chapter 2
		console.log('[TEST] Scrolling within chapter 2...');
		for (let i = 0; i < 3; i++) {
			await content.click({
				position: { x: box.width * 0.8, y: box.height * 0.5 }
			});
			await page.waitForTimeout(400);
		}

		await page.waitForTimeout(500);

		// Get the scroll position after scrolling
		const scrollAfterScrolling = await content.evaluate((el) => el.scrollLeft);
		console.log('[TEST] Scroll position after scrolling in chapter 2:', scrollAfterScrolling);

		// Verify we actually scrolled (not at position 0)
		expect(scrollAfterScrolling).toBeGreaterThan(0);

		// Get the current chapter from URL
		const urlBeforeToc = page.url();
		const chapterBeforeMatch = urlBeforeToc.match(/chapter=(\d+)/);
		const chapterBefore = chapterBeforeMatch ? parseInt(chapterBeforeMatch[1], 10) : 0;
		console.log('[TEST] Current chapter before TOC:', chapterBefore);

		// Step 3: Open TOC by tapping center
		console.log('[TEST] Opening TOC...');
		await content.click({
			position: { x: box.width * 0.5, y: box.height * 0.5 }
		});
		await page.waitForTimeout(300);

		// Click TOC button
		const tocButton = page.getByRole('button', { name: 'Show table of contents' });
		await tocButton.click();
		await page.waitForSelector('[data-testid="toc-overlay"]');

		// Step 4: Click on a different chapter (skip to chapter 5)
		console.log('[TEST] Clicking on chapter 5 in TOC...');
		const chapterItems = page.locator('[data-testid="chapter-item"]');
		const chapterCount = await chapterItems.count();
		console.log('[TEST] Total chapters:', chapterCount);

		// Make sure we have enough chapters
		expect(chapterCount).toBeGreaterThan(4);

		// Click on chapter 5 (index 4)
		await chapterItems.nth(4).click();

		// Wait for TOC to close and content to load
		await expect(page.locator('[data-testid="toc-overlay"]')).not.toBeVisible();
		await page.waitForTimeout(1000);

		// Verify chapter actually changed
		const urlAfterToc = page.url();
		const chapterAfterMatch = urlAfterToc.match(/chapter=(\d+)/);
		const chapterAfter = chapterAfterMatch ? parseInt(chapterAfterMatch[1], 10) : 0;
		console.log('[TEST] Chapter after TOC switch:', chapterAfter);

		// Verify chapter changed
		expect(chapterAfter).not.toBe(chapterBefore);

		// Step 5: Check that the new chapter starts at scroll position 0
		const scrollAfterChapterSwitch = await content.evaluate((el) => el.scrollLeft);
		console.log('[TEST] Scroll position after switching to chapter 5:', scrollAfterChapterSwitch);

		// Take screenshot for debugging
		await page.screenshot({ path: 'test-results/toc-scroll-bug.png' });

		// The bug: scroll position should be 0 (at the beginning of the chapter)
		// but it retains the old scroll position from previous chapter
		expect(
			scrollAfterChapterSwitch,
			'New chapter should start at scroll position 0, but retained old scroll position from previous chapter. ' +
				`Expected 0, got ${scrollAfterChapterSwitch}. Previous chapter scroll was ${scrollAfterScrolling}.`
		).toBe(0);
	});
});
