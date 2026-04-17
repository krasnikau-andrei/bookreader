import { expect, test } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test.describe('Library Page', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		await page.evaluate(() => {
			indexedDB.deleteDatabase('bookreader');
		});
		await page.reload();
	});

	test('T1: Empty State - shows empty state message and upload button', async ({ page }) => {
		await page.goto('/');

		await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
		await expect(page.locator('[data-testid="upload-button"]')).toBeVisible();
		await expect(page.locator('[data-testid="book-card"]')).toHaveCount(0);
	});

	test('T6: Theme Colors Applied - page has theme background color', async ({ page }) => {
		await page.goto('/');

		const themeRoot = page.locator('.theme-root');
		await expect(themeRoot).toBeVisible();

		const backgroundColor = await themeRoot.evaluate((el) => getComputedStyle(el).backgroundColor);
		expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
		expect(backgroundColor).not.toBe('transparent');
	});

	test('T6: Upload button has theme accent color', async ({ page }) => {
		await page.goto('/');

		const uploadButton = page.locator('[data-testid="upload-button"]');
		await expect(uploadButton).toBeVisible();

		const buttonBg = await uploadButton.evaluate((el) => getComputedStyle(el).backgroundColor);
		expect(buttonBg).not.toBe('rgba(0, 0, 0, 0)');
		expect(buttonBg).not.toBe('transparent');
		// Verify it has actual color (accent is rgb(74, 158, 255))
		expect(buttonBg).toMatch(/rgb\(74, 158, 255\)|rgba\(74, 158, 255/);
	});

	test('T2: Upload Success - displays uploaded book in grid', async ({ page }) => {
		await page.goto('/');

		// Capture console logs
		const consoleLogs: string[] = [];
		page.on('console', (msg) => consoleLogs.push(msg.text()));
		page.on('pageerror', (error) => consoleLogs.push(`PAGE ERROR: ${error.message}`));

		// Use filechooser to upload EPUB
		const fileChooserPromise = page.waitForEvent('filechooser');
		await page.locator('[data-testid="upload-button"]').click();
		const fileChooser = await fileChooserPromise;

		const epubPath = join(__dirname, '../../tests/fixtures/great-gatsby.epub');
		console.log(`Uploading file from: ${epubPath}`);
		await fileChooser.setFiles(epubPath);

		// Wait for book to appear in grid with longer timeout
		try {
			await expect(page.locator('[data-testid="book-card"]')).toHaveCount(1, { timeout: 15000 });
		} catch (e) {
			console.log('Console logs during upload:', consoleLogs.join('\n'));
			throw e;
		}

		// Verify book details
		const bookCard = page.locator('[data-testid="book-card"]').first();
		await expect(bookCard.locator('[data-testid="book-title"]')).toHaveText('The Great Gatsby');
		await expect(bookCard.locator('[data-testid="book-author"]')).toHaveText('F. Scott Fitzgerald');
	});

	test('T4: Invalid Format Error - shows error for non-EPUB file', async ({ page }) => {
		await page.goto('/');

		// Upload a PDF file
		const fileChooserPromise = page.waitForEvent('filechooser');
		await page.locator('[data-testid="upload-button"]').click();
		const fileChooser = await fileChooserPromise;

		const pdfPath = join(__dirname, '../../tests/fixtures/invalid-format.pdf');
		await fileChooser.setFiles(pdfPath);

		// Error message should be visible
		await expect(page.locator('[data-testid="error-message"]')).toBeVisible();

		// No book cards should be added
		await expect(page.locator('[data-testid="book-card"]')).toHaveCount(0);

		// Empty state should still be visible
		await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
	});

	test('T5: Corrupted EPUB Error - shows error for corrupted file', async ({ page }) => {
		await page.goto('/');

		// Upload a corrupted EPUB file
		const fileChooserPromise = page.waitForEvent('filechooser');
		await page.locator('[data-testid="upload-button"]').click();
		const fileChooser = await fileChooserPromise;

		const corruptedPath = join(__dirname, '../../tests/fixtures/corrupted.epub');
		await fileChooser.setFiles(corruptedPath);

		// Error message should be visible
		await expect(page.locator('[data-testid="error-message"]')).toBeVisible();

		// No book cards should be added
		await expect(page.locator('[data-testid="book-card"]')).toHaveCount(0);

		// Empty state should still be visible
		await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
	});

	test('T3: Persistence - book persists after page reload', async ({ page }) => {
		await page.goto('/');

		// Upload a book
		const fileChooserPromise = page.waitForEvent('filechooser');
		await page.locator('[data-testid="upload-button"]').click();
		const fileChooser = await fileChooserPromise;

		const epubPath = join(__dirname, '../../tests/fixtures/great-gatsby.epub');
		await fileChooser.setFiles(epubPath);

		// Wait for book to appear
		await expect(page.locator('[data-testid="book-card"]')).toHaveCount(1);
		await expect(page.locator('[data-testid="book-title"]')).toHaveText('The Great Gatsby');

		// Reload page
		await page.reload();

		// Book should still be there
		await expect(page.locator('[data-testid="book-card"]')).toHaveCount(1);
		await expect(page.locator('[data-testid="book-title"]')).toHaveText('The Great Gatsby');
		await expect(page.locator('[data-testid="book-author"]')).toHaveText('F. Scott Fitzgerald');
	});

	test('T7: Multiple Books Grid - displays multiple uploaded books', async ({ page }) => {
		await page.goto('/');

		// Upload first book
		let fileChooserPromise = page.waitForEvent('filechooser');
		await page.locator('[data-testid="upload-button"]').click();
		let fileChooser = await fileChooserPromise;
		await fileChooser.setFiles(join(__dirname, '../../tests/fixtures/great-gatsby.epub'));
		await expect(page.locator('[data-testid="book-card"]')).toHaveCount(1);

		// Upload second book
		fileChooserPromise = page.waitForEvent('filechooser');
		await page.locator('[data-testid="upload-button"]').click();
		fileChooser = await fileChooserPromise;
		await fileChooser.setFiles(join(__dirname, '../../tests/fixtures/1984.epub'));
		await expect(page.locator('[data-testid="book-card"]')).toHaveCount(2);

		// Verify both books are displayed
		const titles = await page.locator('[data-testid="book-title"]').allTextContents();
		expect(titles).toContain('The Great Gatsby');
		expect(titles).toContain('1984');
	});

	test('T8: Delete Book - removes book from grid', async ({ page }) => {
		await page.goto('/');

		// Upload a book
		let fileChooserPromise = page.waitForEvent('filechooser');
		await page.locator('[data-testid="upload-button"]').click();
		let fileChooser = await fileChooserPromise;
		await fileChooser.setFiles(join(__dirname, '../../tests/fixtures/great-gatsby.epub'));
		await expect(page.locator('[data-testid="book-card"]')).toHaveCount(1);

		// Right-click on book to open context menu
		await page.locator('[data-testid="book-card"]').first().click({ button: 'right' });

		// Click delete button in context menu
		await page.locator('[data-testid="delete-book-button"]').click();

		// Book should be removed
		await expect(page.locator('[data-testid="book-card"]')).toHaveCount(0);
		await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();

		// Reload and verify persistence
		await page.reload();
		await expect(page.locator('[data-testid="book-card"]')).toHaveCount(0);
	});

	test('T9: Book with cover displays cover image', async ({ page }) => {
		await page.goto('/');

		// Upload book with cover
		const fileChooserPromise = page.waitForEvent('filechooser');
		await page.locator('[data-testid="upload-button"]').click();
		const fileChooser = await fileChooserPromise;
		await fileChooser.setFiles(join(__dirname, '../../tests/fixtures/book-with-cover.epub'));

		// Wait for book to appear
		await expect(page.locator('[data-testid="book-card"]')).toHaveCount(1);

		// Verify cover image is displayed (img element with data URL)
		const bookCard = page.locator('[data-testid="book-card"]').first();
		const coverImage = bookCard.locator('img.book-cover');
		await expect(coverImage).toBeVisible();

		// Verify filename is NOT shown (cover exists)
		const placeholder = bookCard.locator('.book-cover-placeholder');
		await expect(placeholder).toHaveCount(0);

		// Verify title and author
		await expect(bookCard.locator('[data-testid="book-title"]')).toHaveText('Book With Cover');
		await expect(bookCard.locator('[data-testid="book-author"]')).toHaveText('Test Author');
	});

	test('T10: Book without cover displays filename', async ({ page }) => {
		await page.goto('/');

		// Upload book without cover
		const fileChooserPromise = page.waitForEvent('filechooser');
		await page.locator('[data-testid="upload-button"]').click();
		const fileChooser = await fileChooserPromise;
		await fileChooser.setFiles(join(__dirname, '../../tests/fixtures/great-gatsby.epub'));

		// Wait for book to appear
		await expect(page.locator('[data-testid="book-card"]')).toHaveCount(1);

		// Verify cover image is NOT displayed
		const bookCard = page.locator('[data-testid="book-card"]').first();
		const coverImage = bookCard.locator('img.book-cover');
		await expect(coverImage).toHaveCount(0);

		// Verify placeholder is shown with filename
		const placeholder = bookCard.locator('.book-cover-placeholder');
		await expect(placeholder).toBeVisible();
		await expect(placeholder.locator('.filename')).toContainText('.epub');

		// Verify title and author
		await expect(bookCard.locator('[data-testid="book-title"]')).toHaveText('The Great Gatsby');
		await expect(bookCard.locator('[data-testid="book-author"]')).toHaveText('F. Scott Fitzgerald');
	});
});
