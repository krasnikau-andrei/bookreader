import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Reader Previous Chapter Bug', () => {
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

	test('navigating to previous chapter should open at the end, not beginning', async ({ page }) => {
		const reader = page.locator('.reader');
		const content = page.locator('[data-testid="reader-content"]');

		const box = await reader.boundingBox();
		expect(box).toBeTruthy();
		if (!box) return;

		// Navigate forward to reach the next chapter
		// We need to go far enough to ensure we're in chapter 2
		console.log('Navigating forward to reach chapter 2...');
		for (let i = 0; i < 10; i++) {
			await reader.click({
				position: { x: box.width * 0.8, y: box.height * 0.5 }
			});
			await page.waitForTimeout(500);
		}

		// Wait for chapter transition and URL update
		await page.waitForTimeout(1000);

		// Get current URL to confirm we're on chapter 2
		const urlBeforeBack = page.url();
		console.log('URL before going back:', urlBeforeBack);

		const chapterMatch = urlBeforeBack.match(/chapter=(\d+)/);
		expect(chapterMatch).toBeTruthy();
		const currentChapter = parseInt(chapterMatch![1], 10);
		console.log('Current chapter:', currentChapter);

		// We should be on chapter 1 or higher (not chapter 0)
		expect(currentChapter).toBeGreaterThan(0);

		// Get scroll position before going back
		const scrollBeforeBack = await content.evaluate((el) => (el as HTMLElement).scrollLeft);
		const maxScrollBeforeBack = await content.evaluate(
			(el) => (el as HTMLElement).scrollWidth - (el as HTMLElement).clientWidth
		);
		console.log(
			'Scroll position before back:',
			scrollBeforeBack,
			'Max scroll:',
			maxScrollBeforeBack
		);

		// Now navigate back to previous chapter using left tap
		// This should take us to the END of the previous chapter, not the beginning
		console.log('Navigating back to previous chapter...');

		// We need to be at the beginning of current chapter for left tap to trigger chapter change
		// First, scroll to beginning of current chapter
		await content.evaluate((el) => {
			(el as HTMLElement).scrollLeft = 0;
		});
		await page.waitForTimeout(300);

		// Now tap left to go to previous chapter
		await reader.click({
			position: { x: box.width * 0.2, y: box.height * 0.5 }
		});

		// Wait for chapter transition
		await page.waitForTimeout(1500);

		// Get URL after going back
		const urlAfterBack = page.url();
		console.log('URL after going back:', urlAfterBack);

		// Verify we're now on the previous chapter
		const backChapterMatch = urlAfterBack.match(/chapter=(\d+)/);
		expect(backChapterMatch).toBeTruthy();
		const backChapter = parseInt(backChapterMatch![1], 10);
		console.log('Chapter after back:', backChapter);

		// Should be on previous chapter
		expect(backChapter).toBe(currentChapter - 1);

		// Check the progress in URL - should be at or near 100% (progress=10000)
		const progressMatch = urlAfterBack.match(/progress=(\d+)/);
		expect(progressMatch).toBeTruthy();
		const progress = parseInt(progressMatch![1], 10);
		console.log('Progress after going back:', progress);

		// Progress should be at the end (10000 = 100%)
		// The bug causes progress to be 0 (beginning) instead of 10000 (end)
		expect(progress).toBeGreaterThan(9000); // Should be at end, not beginning

		// Also verify scroll position is at the end
		const scrollAfterBack = await content.evaluate((el) => (el as HTMLElement).scrollLeft);
		const maxScrollAfterBack = await content.evaluate(
			(el) => (el as HTMLElement).scrollWidth - (el as HTMLElement).clientWidth
		);
		console.log('Scroll after back:', scrollAfterBack, 'Max scroll:', maxScrollAfterBack);

		// Scroll should be at or near max (end of chapter)
		// The bug would show scroll near 0 (beginning)
		const scrollPercent = maxScrollAfterBack > 0 ? scrollAfterBack / maxScrollAfterBack : 0;
		console.log('Scroll percent after back:', scrollPercent);

		expect(scrollPercent).toBeGreaterThan(0.9); // Should be at least 90% through the chapter

		// Take screenshot for debugging
		await page.screenshot({ path: 'test-results/previous-chapter-bug.png' });
	});
});
