import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Given, Then } = createBdd();

Given('I navigate to the demo page', async ({ page }) => {
	await page.goto('/demo/playwright');
});

Then('an h1 heading should be visible', async ({ page }) => {
	await expect(page.locator('h1')).toBeVisible();
});
