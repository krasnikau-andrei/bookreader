import { expect, test } from '@playwright/test';

test.describe('Library Page', () => {
	test.beforeEach(async ({ page }) => {
		// Clear IndexedDB before each test
		await page.goto('/');
		await page.evaluate(() => {
			indexedDB.deleteDatabase('bookreader');
		});
		await page.reload();
	});

	test('T1: Empty State - shows empty state message and upload button', async ({ page }) => {
		await page.goto('/');

		// Empty state message should be visible
		await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();

		// Upload button should be visible
		await expect(page.locator('[data-testid="upload-button"]')).toBeVisible();

		// No book cards should be present
		await expect(page.locator('[data-testid="book-card"]')).toHaveCount(0);
	});

	test('T6: Theme Colors Applied - page has theme background color', async ({ page }) => {
		await page.goto('/');

		// Check that body has CSS custom property for background
		const body = page.locator('body');
		await expect(body).toBeVisible();

		// Verify computed styles use theme values
		const backgroundColor = await body.evaluate((el) => getComputedStyle(el).backgroundColor);

		// Should have some background color (not default transparent)
		expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
		expect(backgroundColor).not.toBe('transparent');
	});

	test('T6: Upload button has theme accent color', async ({ page }) => {
		await page.goto('/');

		const uploadButton = page.locator('[data-testid="upload-button"]');
		await expect(uploadButton).toBeVisible();

		// Check that button has some background color (theme accent)
		const buttonBg = await uploadButton.evaluate((el) => getComputedStyle(el).backgroundColor);

		expect(buttonBg).not.toBe('rgba(0, 0, 0, 0)');
		expect(buttonBg).not.toBe('transparent');
	});
});
