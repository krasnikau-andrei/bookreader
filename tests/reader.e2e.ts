import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Library', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
	});

	test('shows delete menu on long press', async ({ page }) => {
		// Upload a test book
		const fileInput = page.locator('input[type="file"]');
		const testBookPath = path.join(__dirname, 'fixtures', 'crime-punishment.epub');
		await fileInput.setInputFiles(testBookPath);

		// Wait for book to appear
		await page.waitForSelector('[data-testid="book-card"]');

		// Long press on book card (500ms)
		const bookCard = page.locator('[data-testid="book-card"]').first();
		await bookCard.dispatchEvent('touchstart');
		await page.waitForTimeout(600);

		// Context menu should appear
		const contextMenu = page.locator('.context-menu');
		await expect(contextMenu).toBeVisible();

		// Delete button should be visible in menu
		const deleteButton = page.locator('[data-testid="delete-book-button"]');
		await expect(deleteButton).toBeVisible();
		await expect(deleteButton).toHaveText('Delete');
	});

	test('deletes book from context menu', async ({ page }) => {
		// Upload a test book
		const fileInput = page.locator('input[type="file"]');
		const testBookPath = path.join(__dirname, 'fixtures', 'crime-punishment.epub');
		await fileInput.setInputFiles(testBookPath);

		// Wait for book to appear
		await page.waitForSelector('[data-testid="book-card"]');
		const initialBooks = await page.locator('[data-testid="book-card"]').count();
		expect(initialBooks).toBe(1);

		// Long press on book card
		const bookCard = page.locator('[data-testid="book-card"]').first();
		await bookCard.dispatchEvent('touchstart');
		await page.waitForTimeout(600);

		// Click delete in context menu
		const deleteButton = page.locator('[data-testid="delete-book-button"]');
		await deleteButton.click();

		// Book should be removed
		await page.waitForSelector('[data-testid="empty-state"]');
		const emptyState = page.locator('[data-testid="empty-state"]');
		await expect(emptyState).toBeVisible();
	});

	test('hides context menu when tapping elsewhere', async ({ page }) => {
		// Upload a test book
		const fileInput = page.locator('input[type="file"]');
		const testBookPath = path.join(__dirname, 'fixtures', 'crime-punishment.epub');
		await fileInput.setInputFiles(testBookPath);

		// Wait for book to appear
		await page.waitForSelector('[data-testid="book-card"]');

		// Long press on book card
		const bookCard = page.locator('[data-testid="book-card"]').first();
		await bookCard.dispatchEvent('touchstart');
		await page.waitForTimeout(600);

		// Context menu should appear
		const contextMenu = page.locator('.context-menu');
		await expect(contextMenu).toBeVisible();

		// Click elsewhere (on the grid)
		const grid = page.locator('.books-grid');
		await grid.click();

		// Context menu should disappear
		await expect(contextMenu).not.toBeVisible();
	});
});

test.describe('Reader', () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to library and wait for it to load
		await page.goto('/');
		await page.waitForLoadState('networkidle');
	});

	test('navigates to reader from library', async ({ page }) => {
		// Upload a test book first
		const fileInput = page.locator('input[type="file"]');
		const testBookPath = path.join(__dirname, 'fixtures', 'crime-punishment.epub');
		await fileInput.setInputFiles(testBookPath);

		// Wait for book to appear in grid
		await page.waitForSelector('[data-testid="book-card"]');

		// Click on the book to open reader
		const bookCard = page.locator('[data-testid="book-card"]').first();
		await bookCard.click();

		// Verify reader loaded
		await page.waitForSelector('.reader');
		const reader = page.locator('.reader');
		await expect(reader).toBeVisible();
	});

	test('toggles overlay on center tap', async ({ page }) => {
		// Upload and open a book
		const fileInput = page.locator('input[type="file"]');
		const testBookPath = path.join(__dirname, 'fixtures', 'crime-punishment.epub');
		await fileInput.setInputFiles(testBookPath);
		await page.waitForSelector('[data-testid="book-card"]');

		const bookCard = page.locator('[data-testid="book-card"]').first();
		await bookCard.click();
		await page.waitForSelector('.reader');

		// Initially overlay should be hidden (no back button visible)
		const backButton = page.getByRole('button', { name: 'Go back' });
		await expect(backButton).not.toBeVisible();

		// Tap center to show overlay
		const reader = page.locator('.reader');
		const box = await reader.boundingBox();
		if (box) {
			await reader.click({
				position: { x: box.width * 0.5, y: box.height * 0.5 }
			});
		}

		// Back button should now be visible
		await expect(backButton).toBeVisible();

		// Tap center again to hide overlay
		if (box) {
			await reader.click({
				position: { x: box.width * 0.5, y: box.height * 0.5 }
			});
		}

		await expect(backButton).not.toBeVisible();
	});

	test('navigates chapters with left/right taps', async ({ page }) => {
		// Upload and open a book with actual chapters
		const fileInput = page.locator('input[type="file"]');
		const testBookPath = path.join(__dirname, 'fixtures', 'crime-punishment.epub');
		await fileInput.setInputFiles(testBookPath);
		await page.waitForSelector('[data-testid="book-card"]');

		const bookCard = page.locator('[data-testid="book-card"]').first();
		await bookCard.click();
		await page.waitForSelector('.reader');

		// Wait for content to load
		await page.waitForSelector('[data-testid="reader-content"]', { timeout: 10000 });

		const reader = page.locator('.reader');
		const content = page.locator('[data-testid="reader-content"]');

		// Get initial content
		const initialContent = await content.evaluate((el) => el.innerHTML);

		const box = await reader.boundingBox();
		expect(box).toBeTruthy();

		if (box) {
			// Take screenshot before navigation
			await page.screenshot({ path: 'test-results/screenshot-before.png' });

			// Tap right zone - this should advance to next chapter when at end of current chapter
			await reader.click({
				position: { x: box.width * 0.8, y: box.height * 0.5 }
			});

			// Wait for chapter transition animation
			await page.waitForTimeout(600);

			// Take screenshot after right tap
			await page.screenshot({ path: 'test-results/screenshot-after-right.png' });

			// Get content after right tap - should have advanced to next chapter
			const afterRightContent = await content.evaluate((el) => el.innerHTML);

			// Content should have changed (new chapter loaded)
			expect(afterRightContent).not.toEqual(initialContent);

			// Tap right zone again to go to chapter 3
			await reader.click({
				position: { x: box.width * 0.8, y: box.height * 0.5 }
			});
			await page.waitForTimeout(600);

			// Take screenshot
			await page.screenshot({ path: 'test-results/screenshot-chapter3.png' });

			// Get content after second right tap
			const afterSecondRightContent = await content.evaluate((el) => el.innerHTML);

			// Content should have changed again
			expect(afterSecondRightContent).not.toEqual(afterRightContent);

			// Tap left zone to go back to previous chapter
			await reader.click({
				position: { x: box.width * 0.2, y: box.height * 0.5 }
			});
			await page.waitForTimeout(600);

			// Take screenshot after left tap
			await page.screenshot({ path: 'test-results/screenshot-after-left.png' });

			// Get content after left tap - should have gone back to previous chapter
			const afterLeftContent = await content.evaluate((el) => el.innerHTML);

			// Content should have changed back
			expect(afterLeftContent).not.toEqual(afterSecondRightContent);

			// Compare screenshots to verify visual changes
			const fs = await import('fs');
			const screenshotBefore = fs.readFileSync('test-results/screenshot-before.png');
			const screenshotAfterRight = fs.readFileSync('test-results/screenshot-after-right.png');
			const screenshotChapter3 = fs.readFileSync('test-results/screenshot-chapter3.png');
			const screenshotAfterLeft = fs.readFileSync('test-results/screenshot-after-left.png');

			// Screenshots should be different after navigation
			expect(screenshotAfterRight).not.toEqual(screenshotBefore);
			expect(screenshotChapter3).not.toEqual(screenshotAfterRight);
			expect(screenshotAfterLeft).not.toEqual(screenshotChapter3);
		}
	});

	test('content fills viewport width - no leakage to next page', async ({ page }) => {
		// Upload and open a book
		const fileInput = page.locator('input[type="file"]');
		const testBookPath = path.join(__dirname, 'fixtures', 'crime-punishment.epub');
		await fileInput.setInputFiles(testBookPath);
		await page.waitForSelector('[data-testid="book-card"]');

		const bookCard = page.locator('[data-testid="book-card"]').first();
		await bookCard.click();
		await page.waitForSelector('.reader');
		await page.waitForSelector('[data-testid="reader-content"]', { timeout: 10000 });

		const reader = page.locator('.reader');
		const content = page.locator('[data-testid="reader-content"]');

		const box = await reader.boundingBox();
		expect(box).toBeTruthy();

		if (box) {
			// Navigate to a chapter with actual text content
			// Skip past cover pages (c1, c2) to reach text chapters
			for (let i = 0; i < 9; i++) {
				await reader.click({
					position: { x: box.width * 0.8, y: box.height * 0.5 }
				});
				await page.waitForTimeout(400);
			}

			// Wait for content to settle
			await page.waitForTimeout(500);

			// Take screenshot to see what's actually displayed
			await page.screenshot({ path: 'test-results/viewport-width-check.png' });

			// Check the viewport width and first VISIBLE text element width
			const viewportInfo = await content.evaluate((el) => {
				const containerRect = el.getBoundingClientRect();
				const viewportWidth = containerRect.width;
				const viewportLeft = containerRect.left;
				const viewportRight = containerRect.right;

				// Find first substantial text element that is VISIBLE in the current viewport
				const selectors = ['p', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
				let firstVisibleElement = null;

				for (const selector of selectors) {
					const elements = el.querySelectorAll(selector);
					for (const elem of elements) {
						const text = elem.textContent?.trim() || '';
						if (text.length < 10) continue;

						const rect = elem.getBoundingClientRect();

						// Check if this element is visible in the current viewport
						// Element should be within the viewport bounds
						if (rect.left >= viewportLeft && rect.left < viewportRight) {
							firstVisibleElement = elem;
							break;
						}
					}
					if (firstVisibleElement) break;
				}

				if (!firstVisibleElement) {
					// Log what we found for debugging
					const debugInfo = {
						htmlPreview: el.innerHTML.substring(0, 300),
						childCount: el.children.length,
						textContent: el.textContent?.substring(0, 200) || 'empty',
						scrollLeft: el.scrollLeft
					};
					return { error: 'No visible text element found', debug: debugInfo };
				}

				const elemRect = firstVisibleElement.getBoundingClientRect();

				return {
					viewportWidth,
					elementWidth: elemRect.width,
					elementRight: elemRect.right,
					elementLeft: elemRect.left,
					viewportLeft,
					viewportRight,
					gap: viewportRight - elemRect.right,
					tagName: firstVisibleElement.tagName,
					textPreview: firstVisibleElement.textContent?.substring(0, 50)
				};
			});

			console.log('Viewport info:', viewportInfo);

			// If no element was found, that's also a failure
			if ('error' in viewportInfo) {
				console.log('Debug info:', viewportInfo.debug);
				throw new Error(`Failed to find text element: ${viewportInfo.error}`);
			}

			// The gap between element right edge and viewport right edge should be minimal
			// If element is narrower than viewport, user sees next page content
			// Allow for some padding/margin (max 60px which is ~14% on mobile)
			const maxAllowedGap = viewportInfo.viewportWidth * 0.15; // 15% tolerance
			expect(viewportInfo.gap).toBeLessThan(maxAllowedGap);

			// Element should fill most of the viewport width (at least 85%)
			const minElementWidth = viewportInfo.viewportWidth * 0.85;
			expect(viewportInfo.elementWidth).toBeGreaterThan(minElementWidth);
		}
	});
});
