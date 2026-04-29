import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Reader Navigation Position Bug', () => {
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

	test('BUG REPRO: from TOC to chapter N, then prev page (ch N-1, pos ~100%), then next page (ch N, pos should be 0)', async ({
		page
	}) => {
		const reader = page.locator('.reader');
		const content = page.locator('[data-testid="reader-content"]');

		const box = await reader.boundingBox();
		expect(box).toBeTruthy();
		if (!box) return;

		// Step 1: Open TOC and navigate to chapter 2 (index 1)
		// This simulates: "из содержания открываю любую главу n"
		console.log('Step 1: Opening TOC and navigating to chapter 2 (index 1)...');
		await reader.click({ position: { x: box.width * 0.5, y: box.height * 0.5 } });
		await page.waitForTimeout(500);

		const tocButton = page.getByRole('button', { name: 'Show table of contents' });
		await tocButton.click();
		await page.waitForTimeout(500);

		await page.waitForSelector('[data-testid="chapter-item"]', { timeout: 5000 });

		const chapterItems = page.locator('[data-testid="chapter-item"]');
		const chapterCount = await chapterItems.count();
		console.log(`Found ${chapterCount} chapters in TOC`);
		expect(chapterCount).toBeGreaterThan(1);

		await chapterItems.nth(1).click();
		await page.waitForTimeout(1500);

		// Verify we're on chapter N (index 1)
		let url = page.url();
		console.log('URL after TOC navigation:', url);
		let chapterMatch = url.match(/chapter=(\d+)/);
		expect(chapterMatch).toBeTruthy();
		const targetChapter = parseInt(chapterMatch![1], 10);
		console.log('Started at chapter:', targetChapter);

		// Step 2: Navigate to previous PAGE by tapping left at the beginning of chapter
		// This simulates: "тап на прошлую страницу (глава n-1, pos 99%)"
		console.log('Step 2: Navigating to previous page...');
		// Make sure we're at beginning of current chapter first
		await content.evaluate((el) => {
			(el as HTMLElement).scrollLeft = 0;
		});
		await page.waitForTimeout(300);

		// Now tap left to go to previous page
		await reader.click({
			position: { x: box.width * 0.2, y: box.height * 0.5 }
		});
		await page.waitForTimeout(1500);

		url = page.url();
		console.log('URL after going back:', url);
		chapterMatch = url.match(/chapter=(\d+)/);
		expect(chapterMatch).toBeTruthy();
		const prevChapter = parseInt(chapterMatch![1], 10);
		console.log('Now on chapter:', prevChapter);

		// Should be on chapter N-1
		expect(prevChapter).toBe(targetChapter - 1);

		// Verify we're at the END of chapter N-1 (progress ~10000)
		let progressMatch = url.match(/progress=(\d+)/);
		expect(progressMatch).toBeTruthy();
		const progressAfterBack = parseInt(progressMatch![1], 10);
		console.log('Progress after going back (should be ~10000):', progressAfterBack);
		expect(progressAfterBack).toBeGreaterThan(9000); // Should be near 100%

		// Step 3: Navigate forward to next page (should go to chapter N at position 0)
		// This simulates: "тап на следующую страницу (глава n, pos != 0 (BUG))"
		console.log('Step 3: Navigating forward to next page...');
		await reader.click({
			position: { x: box.width * 0.8, y: box.height * 0.5 }
		});
		await page.waitForTimeout(1500);

		// Verify we're back on chapter N
		url = page.url();
		console.log('URL after forward navigation:', url);
		chapterMatch = url.match(/chapter=(\d+)/);
		expect(chapterMatch).toBeTruthy();
		const currentChapter = parseInt(chapterMatch![1], 10);
		console.log('Current chapter:', currentChapter);

		// Should be back on chapter N
		expect(currentChapter).toBe(targetChapter);

		// Get progress from URL
		progressMatch = url.match(/progress=(\d+)/);
		expect(progressMatch).toBeTruthy();
		const progressAfterForward = parseInt(progressMatch![1], 10);
		console.log('Progress after forward:', progressAfterForward);

		// BUG: Progress should be near 0 (beginning of chapter), not some high value
		// The bug causes: "глава n, pos != 0"
		// Expected: progress should be ~0 (at beginning of chapter N)
		// Actual (bug): progress may be at some other position
		if (progressAfterForward > 1000) {
			console.log(
				'BUG DETECTED: Chapter opened at position',
				progressAfterForward,
				'instead of near 0'
			);
		}
		expect(progressAfterForward).toBeLessThan(1000); // Should be near 0

		// Verify scroll position is at beginning
		const scrollPosition = await content.evaluate((el) => (el as HTMLElement).scrollLeft);
		console.log('Scroll position:', scrollPosition);
		expect(scrollPosition).toBeLessThan(100); // Should be near 0

		await page.screenshot({ path: 'test-results/next-chapter-position-bug.png' });
	});
});
