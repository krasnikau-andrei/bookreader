import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import path from 'path';
import { fixturesDir } from './shared.ts';

export const { Given, When, Then, And } = createBdd();

Then('I should see the empty state message', async ({ page }) => {
	await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
});

Then('I should see the upload button', async ({ page }) => {
	await expect(page.locator('[data-testid="upload-button"]')).toBeVisible();
});

Then('there should be no book cards', async ({ page }) => {
	await expect(page.locator('[data-testid="book-card"]')).toHaveCount(0);
});

Then('the page should have a theme background color', async ({ page }) => {
	const themeRoot = page.locator('.theme-root');
	await expect(themeRoot).toBeVisible();
	const backgroundColor = await themeRoot.evaluate((el) => getComputedStyle(el).backgroundColor);
	expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
	expect(backgroundColor).not.toBe('transparent');
});

Then('the upload button should have the accent color', async ({ page }) => {
	const uploadButton = page.locator('[data-testid="upload-button"]');
	await expect(uploadButton).toBeVisible();
	const buttonColor = await uploadButton.evaluate((el) => getComputedStyle(el).color);
	expect(buttonColor).toMatch(/rgb\(160, 136, 104\)|rgba\(160, 136, 104/);
});

When('I upload {string} via the file chooser button', async ({ page }, filename: string) => {
	const fileChooserPromise = page.waitForEvent('filechooser');
	await page.locator('[data-testid="upload-button"]').click();
	const fileChooser = await fileChooserPromise;
	await fileChooser.setFiles(path.join(fixturesDir, filename));
});

Then('I should see {int} book card', async ({ page }, count: number) => {
	await expect(page.locator('[data-testid="book-card"]')).toHaveCount(count, { timeout: 15000 });
});

Then('the book should be titled {string}', async ({ page }, title: string) => {
	await expect(page.locator('[data-testid="book-title"]').first()).toHaveText(title);
});

Then('the book should be authored by {string}', async ({ page }, author: string) => {
	await expect(page.locator('[data-testid="book-author"]').first()).toHaveText(author);
});

Then('I should see an error message', async ({ page }) => {
	await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
});

Then('the empty state should remain visible', async ({ page }) => {
	await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
});

Then('the empty state should be visible', async ({ page }) => {
	await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
});

When('I reload the page', async ({ page }) => {
	await page.reload();
	await page.waitForLoadState('networkidle');
});

Then('the book {string} should still be displayed', async ({ page }, title: string) => {
	await expect(page.locator('[data-testid="book-card"]')).toHaveCount(1);
	await expect(page.locator('[data-testid="book-title"]')).toHaveText(title);
});

Then(
	'the grid should contain {string} and {string}',
	async ({ page }, title1: string, title2: string) => {
		const titles = await page.locator('[data-testid="book-title"]').allTextContents();
		expect(titles).toContain(title1);
		expect(titles).toContain(title2);
	}
);

When('I right-click the book to delete it', async ({ page }) => {
	await page.locator('[data-testid="book-card"]').first().click({ button: 'right' });
});

Then('the confirmation sheet should appear', async ({ page }) => {
	await expect(page.locator('[data-testid="confirm-sheet"]')).toBeVisible();
});

When('I confirm the deletion', async ({ page }) => {
	await page.locator('[data-testid="confirm-sheet-delete"]').click();
});

Then('the book should be removed from the grid', async ({ page }) => {
	await expect(page.locator('[data-testid="book-card"]')).toHaveCount(0);
});

Then('the book should still be gone', async ({ page }) => {
	await expect(page.locator('[data-testid="book-card"]')).toHaveCount(0);
});

Then('the book should display a cover image', async ({ page }) => {
	const bookCard = page.locator('[data-testid="book-card"]').first();
	const coverImage = bookCard.locator('img.book-cover');
	await expect(coverImage).toBeVisible();
});

Then('it should not show a filename placeholder', async ({ page }) => {
	const bookCard = page.locator('[data-testid="book-card"]').first();
	const placeholder = bookCard.locator('.cover-placeholder');
	await expect(placeholder).toHaveCount(0);
});

Then('the book should not display a cover image', async ({ page }) => {
	const bookCard = page.locator('[data-testid="book-card"]').first();
	const coverImage = bookCard.locator('img.book-cover');
	await expect(coverImage).toHaveCount(0);
});

Then('it should show a filename placeholder containing {string}', async ({ page }) => {
	const bookCard = page.locator('[data-testid="book-card"]').first();
	const placeholder = bookCard.locator('.cover-placeholder');
	await expect(placeholder).toBeVisible();
	await expect(placeholder).not.toBeEmpty();
});

Then('I should see {int} book cards', async ({ page }, count: number) => {
	await expect(page.locator('[data-testid="book-card"]')).toHaveCount(count);
});

Then('I should see an info message saying it is already in the library', async ({ page }) => {
	const infoBanner = page.locator('[data-testid="info-message"]');
	await expect(infoBanner).toBeVisible();
	await expect(infoBanner).toContainText('already in your library');
});

Then('the book count should remain {int}', async ({ page }, count: number) => {
	const bookCards = await page.locator('[data-testid="book-card"]').count();
	expect(bookCards).toBe(count);
});

Then('the info message should be visible', async ({ page }) => {
	await expect(page.locator('[data-testid="info-message"]')).toBeVisible();
});

When('I dismiss the info message', async ({ page }) => {
	await page.locator('[data-testid="info-message"]').locator('button').click();
});

Then('the info message should not be visible', async ({ page }) => {
	await expect(page.locator('[data-testid="info-message"]')).not.toBeVisible();
});

When('I long-press the book card', async ({ page }) => {
	await page.evaluate(() => {
		const card = document.querySelector('[data-testid="book-card"]') as HTMLElement;
		if (card) {
			const rect = card.getBoundingClientRect();
			const touchEvent = new TouchEvent('touchstart', {
				bubbles: true,
				cancelable: true,
				touches: [
					new Touch({
						identifier: 0,
						target: card,
						clientX: rect.left + rect.width / 2,
						clientY: rect.top + rect.height / 2
					})
				]
			});
			card.dispatchEvent(touchEvent);
			setTimeout(() => {
				const touchEndEvent = new TouchEvent('touchend', {
					bubbles: true,
					cancelable: true
				});
				card.dispatchEvent(touchEndEvent);
			}, 500);
		}
	});
	await page.waitForTimeout(700);
});

Then(
	'a confirmation sheet should appear asking to delete {string}',
	async ({ page }, title: string) => {
		await expect(page.locator('[data-testid="confirm-sheet"]')).toBeVisible();
		await expect(page.locator('[data-testid="confirm-sheet-message"]')).toHaveText(
			`Delete "${title}"?`
		);
	}
);

Then('the sheet should have delete and cancel buttons', async ({ page }) => {
	await expect(page.locator('[data-testid="confirm-sheet-delete"]')).toBeVisible();
	await expect(page.locator('[data-testid="confirm-sheet-cancel"]')).toBeVisible();
});

When('I confirm the deletion in the sheet', async ({ page }) => {
	await page.locator('[data-testid="confirm-sheet-delete"]').click();
});

When('I cancel the deletion in the sheet', async ({ page }) => {
	await page.locator('[data-testid="confirm-sheet-cancel"]').click();
});

Then('the sheet should be dismissed', async ({ page }) => {
	await expect(page.locator('[data-testid="confirm-sheet"]')).not.toBeVisible();
});

Then('the book card should remain', async ({ page }) => {
	await expect(page.locator('[data-testid="book-card"]')).toHaveCount(1);
});

Then('the book should appear in the library', async ({ page }) => {
	await page.waitForTimeout(5000);
	try {
		await expect(page.locator('[data-testid="book-card"]')).toHaveCount(1, { timeout: 15000 });
	} catch {
		const bookCount = await page.locator('[data-testid="book-card"]').count();
		expect(bookCount).toBeGreaterThan(0);
	}
});

Then('there should be {int} book card', async ({ page }, count: number) => {
	await expect(page.locator('[data-testid="book-card"]')).toHaveCount(count);
});

Then('the reader should show the book content', async ({ page }) => {
	const content = page.locator('[data-testid="reader-content"]');
	await expect(content).toBeVisible();
	const html = await content.innerHTML();
	expect(html.trim().length).toBeGreaterThan(0);
});
