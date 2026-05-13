import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

export const { Given, When, Then } = createBdd();

When('I go back to the library', async ({ page }) => {
	await page.goto('/');
	await page.waitForSelector('[data-testid="book-card"]');
});

Then('the book card should not show a progress bar', async ({ page }) => {
	const bookCard = page.locator('[data-testid="book-card"]').first();
	const progressBar = bookCard.locator('[data-testid="progress-bar"]');
	await expect(progressBar).not.toBeVisible();
});

Then('the book card should show a progress bar', async ({ page }) => {
	const bookCard = page.locator('[data-testid="book-card"]').first();
	const progressBar = bookCard.locator('[data-testid="progress-bar"]');
	await expect(progressBar).toBeVisible();
});

Then('a progress bar should be visible at the bottom of the reader', async ({ page }) => {
	const bottomBar = page.locator('[data-testid="progress-bottom-bar"]');
	await expect(bottomBar).toBeVisible();
	const progressBar = bottomBar.locator('[data-testid="progress-bar"]');
	await expect(progressBar).toBeVisible();
});

Then('the reader progress should show {string}', async ({ page }, expected: string) => {
	const percentage = page.locator(
		'[data-testid="progress-bottom-bar"] [data-testid="progress-percentage"]'
	);
	await expect(percentage).toHaveText(expected);
});

Then('the progress percentage should increase', async ({ page }) => {
	const bottomBar = page.locator('[data-testid="progress-bottom-bar"]');
	const percentage = bottomBar.locator('[data-testid="progress-percentage"]');
	await expect(percentage).toBeVisible();
	const text = await percentage.textContent();
	const value = parseInt((text || '0').replace('%', ''), 10);
	// Book opens at chapter 0 with 0% progress; navigating forward must increase it
	expect(value).toBeGreaterThan(0);
});

Then('the card progress should be greater than 0%', async ({ page }) => {
	const bookCard = page.locator('[data-testid="book-card"]').first();
	const percentage = bookCard.locator('[data-testid="progress-percentage"]');
	await expect(percentage).toBeVisible();
	const text = await percentage.textContent();
	const value = parseInt((text || '0').replace('%', ''), 10);
	expect(value).toBeGreaterThan(0);
});

Then('the reader progress should match the saved position', async ({ page }) => {
	// Verify restored position via URL params (most precise indicator)
	const url = page.url();
	const chapterMatch = url.match(/chapter=(\d+)/);
	expect(chapterMatch, 'URL should have chapter param').toBeTruthy();
	const chapter = parseInt(chapterMatch![1], 10);
	expect(chapter).toBeGreaterThanOrEqual(2);
	const progressMatch = url.match(/progress=(\d+)/);
	expect(progressMatch, 'URL should have progress param').toBeTruthy();

	// DOM percentage should also reflect non-zero progress
	const bottomBar = page.locator('[data-testid="progress-bottom-bar"]');
	const percentage = bottomBar.locator('[data-testid="progress-percentage"]');
	await expect(percentage).toBeVisible();
	const text = await percentage.textContent();
	const pctValue = parseInt((text || '0').replace('%', ''), 10);
	expect(pctValue).toBeGreaterThan(0);
});

Then('the progress bar should contain chapter segments', async ({ page }) => {
	const bottomBar = page.locator('[data-testid="progress-bottom-bar"]');
	const segments = bottomBar.locator('[data-testid="progress-segment"]');
	const count = await segments.count();
	expect(count).toBeGreaterThan(1);
});
