import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';

test('upload Crime and Punishment EPUB', async ({ page }) => {
	// Capture console logs
	const consoleLogs: string[] = [];
	page.on('console', (msg) => {
		consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
	});

	// Capture page errors
	page.on('pageerror', (error) => {
		console.log('Page error:', error.message);
	});

	await page.goto('/');

	// Clear IndexedDB
	await page.evaluate(() => {
		indexedDB.deleteDatabase('bookreader');
	});
	await page.reload();

	// Wait for upload button
	await expect(page.locator('[data-testid="upload-button"]')).toBeVisible();

	// Upload the file
	const fileChooserPromise = page.waitForEvent('filechooser');
	await page.locator('[data-testid="upload-button"]').click();
	const fileChooser = await fileChooserPromise;

	await fileChooser.setFiles('tests/fixtures/crime-punishment-real.epub');

	// Wait a bit for processing
	await page.waitForTimeout(5000);

	// Check if error message appeared
	const errorVisible = await page
		.locator('[data-testid="error-message"]')
		.isVisible()
		.catch(() => false);
	if (errorVisible) {
		const errorText = await page.locator('[data-testid="error-message"]').textContent();
		console.log('Error message:', errorText);
	}

	// Check if book appeared
	const bookCount = await page.locator('[data-testid="book-card"]').count();
	console.log('Book cards count:', bookCount);

	if (bookCount > 0) {
		const title = await page.locator('[data-testid="book-title"]').first().textContent();
		const author = await page.locator('[data-testid="book-author"]').first().textContent();
		console.log('Book title:', title);
		console.log('Book author:', author);
	}

	// Print all console logs
	console.log('\n=== Console Logs ===');
	consoleLogs.forEach((log) => console.log(log));
});
