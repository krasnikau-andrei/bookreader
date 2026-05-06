import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const booksDir = path.resolve(__dirname, '..', 'broken_books');

const files = fs.existsSync(booksDir)
	? fs
			.readdirSync(booksDir)
			.filter((f) => f.endsWith('.epub'))
			.sort()
	: [];

if (files.length === 0) {
	test('no books to check in broken_books/', () => {});
} else {
	for (const file of files) {
		const bookPath = path.join(booksDir, file);

		test(`${file} uploads and parses successfully`, async ({ page }) => {
			test.setTimeout(60_000);

			const consoleErrors: string[] = [];
			page.on('console', (msg) => {
				if (msg.type() === 'error') consoleErrors.push(msg.text());
			});

			await page.goto('/', { waitUntil: 'networkidle', timeout: 20000 });

			const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 10000 });
			await page.locator('[data-testid="upload-button"]').click();
			const fileChooser = await fileChooserPromise;
			await fileChooser.setFiles(bookPath);

			const bookCard = page.locator('[data-testid="book-card"]').first();

			await expect(bookCard).toBeVisible({ timeout: 30000 });

			if (consoleErrors.length > 0) {
				console.log('Console errors during upload:', consoleErrors.join('; '));
			}

			const title = await page.locator('[data-testid="book-title"]').first().textContent();
			expect(title).toBeTruthy();
		});
	}
}
