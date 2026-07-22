import { createBdd } from 'playwright-bdd';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const fixturesDir = path.join(__dirname, '..', 'tests', 'fixtures');

export const { Given, When, Then } = createBdd();

Given('the library page is open', async ({ page }) => {
	await page.goto('/');
	await page.waitForLoadState('networkidle');
});

Given('the database is cleared', async ({ page }) => {
	await page.goto('/');
	await page.waitForLoadState('networkidle');
	await page.evaluate(() => {
		indexedDB.deleteDatabase('bookreader');
	});
	await page.reload();
	await page.waitForLoadState('networkidle');
});

When('I upload {string} via file input', async ({ page }, filename: string) => {
	const fileInput = page.locator('input[type="file"]');
	await fileInput.setInputFiles(path.join(fixturesDir, filename));
});

When('I upload {string} via file input again', async ({ page }, filename: string) => {
	const fileInput = page.locator('input[type="file"]');
	await fileInput.setInputFiles(path.join(fixturesDir, filename));
});

When('I open the book from the library', async ({ page }) => {
	await page.waitForSelector('[data-testid="book-card"]');
	const bookCard = page.locator('[data-testid="book-card"]').first();
	await bookCard.click();
	await page.waitForSelector('.reader');
	await page.waitForSelector('[data-testid="reader-content"]', { timeout: 10000 });
});
