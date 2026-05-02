import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Reader Menu Gestures', () => {
	test.beforeEach(async ({ page }) => {
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

	test('tap with overlay open closes overlay instead of turning page', async ({ page }) => {
		const content = page.locator('[data-testid="reader-content"]');
		const box = await content.boundingBox();
		expect(box).toBeTruthy();
		if (!box) return;

		// Get initial scroll position
		const initialScroll = await content.evaluate((el) => (el as HTMLElement).scrollLeft);

		// Show overlay by tapping center
		await content.click({ position: { x: box.width * 0.5, y: box.height * 0.5 } });
		await page.waitForTimeout(300);

		const backButton = page.getByRole('button', { name: 'Go back' });
		await expect(backButton).toBeVisible({ message: 'Overlay should be visible' });

		// Tap right zone using page.mouse to avoid element-level intercept issues
		const rightX = box.x + box.width * 0.8;
		const centerY = box.y + box.height * 0.5;
		await page.mouse.click(rightX, centerY);
		await page.waitForTimeout(500);

		// Overlay should be closed
		await expect(backButton).not.toBeVisible({ message: 'Overlay should close on tap' });

		// Scroll position should not have changed
		const scrollAfterTap = await content.evaluate((el) => (el as HTMLElement).scrollLeft);
		expect(
			scrollAfterTap,
			`Page should not turn when overlay is open. Initial: ${initialScroll}, After tap: ${scrollAfterTap}`
		).toBe(initialScroll);
	});

	test('swipe with overlay open closes overlay instead of turning page', async ({ page }) => {
		const content = page.locator('[data-testid="reader-content"]');
		const box = await content.boundingBox();
		expect(box).toBeTruthy();
		if (!box) return;

		// Get initial scroll position
		const initialScroll = await content.evaluate((el) => (el as HTMLElement).scrollLeft);

		// Show overlay by tapping center
		await content.click({ position: { x: box.width * 0.5, y: box.height * 0.5 } });
		await page.waitForTimeout(300);

		const backButton = page.getByRole('button', { name: 'Go back' });
		await expect(backButton).toBeVisible({ message: 'Overlay should be visible' });

		// Swipe left - should close overlay instead of turning page
		const startX = box.x + box.width * 0.8;
		const endX = box.x + box.width * 0.2;
		const centerY = box.y + box.height * 0.5;

		await page.mouse.move(startX, centerY);
		await page.mouse.down();
		await page.mouse.move(endX, centerY, { steps: 5 });
		await page.mouse.up();
		await page.waitForTimeout(300);

		// Overlay should be closed
		await expect(backButton).not.toBeVisible({ message: 'Overlay should close on swipe' });

		// Scroll position should not have changed
		const scrollAfterSwipe = await content.evaluate((el) => (el as HTMLElement).scrollLeft);
		expect(
			scrollAfterSwipe,
			`Page should not turn when overlay is open. Initial: ${initialScroll}, After swipe: ${scrollAfterSwipe}`
		).toBe(initialScroll);
	});

	test('tap with TOC open closes TOC instead of turning page', async ({ page }) => {
		const content = page.locator('[data-testid="reader-content"]');
		const box = await content.boundingBox();
		expect(box).toBeTruthy();
		if (!box) return;

		// Get initial scroll position
		const initialScroll = await content.evaluate((el) => (el as HTMLElement).scrollLeft);

		// Show overlay
		await content.click({ position: { x: box.width * 0.5, y: box.height * 0.5 } });
		await page.waitForTimeout(300);

		// Open TOC
		const tocButton = page.getByRole('button', { name: 'Show table of contents' });
		await tocButton.click();
		await page.waitForSelector('[data-testid="toc-overlay"]');

		// TOC should be visible
		const tocOverlay = page.locator('[data-testid="toc-overlay"]');
		await expect(tocOverlay).toBeVisible({ message: 'TOC should be visible' });

		// Tap on TOC overlay background - should close TOC instead of turning page
		// Click at a position that's on the overlay background (not the panel)
		const overlayBox = await tocOverlay.boundingBox();
		expect(overlayBox).toBeTruthy();
		if (overlayBox) {
			// Click on the overlay background (avoid the panel area)
			await page.mouse.click(overlayBox.x + 10, overlayBox.y + 10);
		}
		await page.waitForTimeout(300);

		// TOC should be closed
		await expect(tocOverlay).not.toBeVisible({ message: 'TOC should close on tap' });

		// Scroll position should not have changed (page should not turn)
		const scrollAfterTap = await content.evaluate((el) => (el as HTMLElement).scrollLeft);
		expect(
			scrollAfterTap,
			`Page should not turn when TOC is open. Initial: ${initialScroll}, After tap: ${scrollAfterTap}`
		).toBe(initialScroll);
	});

	test('swipe with TOC open closes TOC instead of turning page', async ({ page }) => {
		const content = page.locator('[data-testid="reader-content"]');
		const box = await content.boundingBox();
		expect(box).toBeTruthy();
		if (!box) return;

		// Get initial scroll position
		const initialScroll = await content.evaluate((el) => (el as HTMLElement).scrollLeft);

		// Show overlay
		await content.click({ position: { x: box.width * 0.5, y: box.height * 0.5 } });
		await page.waitForTimeout(300);

		// Open TOC
		const tocButton = page.getByRole('button', { name: 'Show table of contents' });
		await tocButton.click();
		await page.waitForSelector('[data-testid="toc-overlay"]');

		// TOC should be visible
		const tocOverlay = page.locator('[data-testid="toc-overlay"]');
		await expect(tocOverlay).toBeVisible({ message: 'TOC should be visible' });

		// Swipe left - should close TOC instead of turning page
		const startX = box.x + box.width * 0.8;
		const endX = box.x + box.width * 0.2;
		const centerY = box.y + box.height * 0.5;

		await page.mouse.move(startX, centerY);
		await page.mouse.down();
		await page.mouse.move(endX, centerY, { steps: 5 });
		await page.mouse.up();
		await page.waitForTimeout(300);

		// TOC should be closed
		await expect(tocOverlay).not.toBeVisible({ message: 'TOC should close on swipe' });

		// Scroll position should not have changed
		const scrollAfterSwipe = await content.evaluate((el) => (el as HTMLElement).scrollLeft);
		expect(
			scrollAfterSwipe,
			`Page should not turn when TOC is open. Initial: ${initialScroll}, After swipe: ${scrollAfterSwipe}`
		).toBe(initialScroll);
	});

	test('selecting chapter from TOC hides TOC', async ({ page }) => {
		const content = page.locator('[data-testid="reader-content"]');
		const box = await content.boundingBox();
		expect(box).toBeTruthy();
		if (!box) return;

		// Show overlay
		await content.click({ position: { x: box.width * 0.5, y: box.height * 0.5 } });
		await page.waitForTimeout(300);

		// Open TOC
		const tocButton = page.getByRole('button', { name: 'Show table of contents' });
		await tocButton.click();
		await page.waitForSelector('[data-testid="toc-overlay"]');

		// TOC should be visible
		const tocOverlay = page.locator('[data-testid="toc-overlay"]');
		await expect(tocOverlay).toBeVisible({ message: 'TOC should be visible' });

		// Click on a chapter
		const chapterItems = page.locator('[data-testid="chapter-item"]');
		await expect(chapterItems.nth(1)).toBeVisible();
		await chapterItems.nth(1).click();

		// TOC should be closed after selecting a chapter
		await expect(tocOverlay).not.toBeVisible({
			message: 'TOC should be hidden after selecting a chapter'
		});
	});

	test('selecting chapter from TOC hides overlay', async ({ page }) => {
		const content = page.locator('[data-testid="reader-content"]');
		const box = await content.boundingBox();
		expect(box).toBeTruthy();
		if (!box) return;

		// Show overlay
		await content.click({ position: { x: box.width * 0.5, y: box.height * 0.5 } });
		await page.waitForTimeout(300);

		const backButton = page.getByRole('button', { name: 'Go back' });
		await expect(backButton).toBeVisible({ message: 'Overlay should be visible' });

		// Open TOC
		const tocButton = page.getByRole('button', { name: 'Show table of contents' });
		await tocButton.click();
		await page.waitForSelector('[data-testid="toc-overlay"]');

		// Click on a chapter
		const chapterItems = page.locator('[data-testid="chapter-item"]');
		await expect(chapterItems.nth(1)).toBeVisible();
		await chapterItems.nth(1).click();
		await page.waitForTimeout(500);

		// Both TOC and overlay should be hidden
		const tocOverlay = page.locator('[data-testid="toc-overlay"]');
		await expect(tocOverlay).not.toBeVisible({ message: 'TOC should be hidden' });
		await expect(backButton).not.toBeVisible({ message: 'Overlay should be hidden' });
	});
});
