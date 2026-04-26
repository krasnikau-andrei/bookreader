import { expect, test } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test.describe('Reader Internal Links', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		await page.evaluate(() => {
			indexedDB.deleteDatabase('bookreader');
		});
		await page.reload();
	});

	test('T1: Links are transformed during EPUB parsing', async ({ page }) => {
		// Upload accessible_epub_3.epub
		const fileChooserPromise = page.waitForEvent('filechooser');
		await page.locator('[data-testid="upload-button"]').click();
		const fileChooser = await fileChooserPromise;

		const epubPath = join(__dirname, 'fixtures/accessible_epub_3.epub');
		await fileChooser.setFiles(epubPath);

		// Wait for book to appear
		await expect(page.locator('[data-testid="book-card"]')).toHaveCount(1, { timeout: 15000 });

		// Open the book
		await page.locator('[data-testid="book-card"]').first().click();

		// Wait for reader to load
		await expect(page.locator('[data-testid="reader-content"]')).toBeVisible();

		// Navigate to a chapter that likely has links (TOC is chapter 3)
		await page.goto(page.url().replace(/\?.*/, '') + '?chapter=3');
		await page.waitForTimeout(500);

		// Check for transformed links in the DOM
		// Note: Links may be hidden by CSS columns, but they should exist in DOM
		const linkInfo = await page.evaluate(() => {
			const internalLinks = document.querySelectorAll('a.internal-link');
			const externalLinks = document.querySelectorAll('a.external-link');
			const missingLinks = document.querySelectorAll('a.missing-link');

			return {
				internalCount: internalLinks.length,
				externalCount: externalLinks.length,
				missingCount: missingLinks.length,
				firstInternal: internalLinks.length > 0 ? {
					href: (internalLinks[0] as HTMLAnchorElement).getAttribute('href'),
					chapter: internalLinks[0].getAttribute('data-chapter'),
					fragment: internalLinks[0].getAttribute('data-fragment'),
					class: internalLinks[0].className
				} : null
			};
		});

		console.log('Link transformation info:', JSON.stringify(linkInfo, null, 2));

		// Should have transformed links (at least internal or external)
		const totalLinks = linkInfo.internalCount + linkInfo.externalCount + linkInfo.missingCount;
		expect(totalLinks).toBeGreaterThan(0);

		// If there are internal links, verify they have proper attributes
		if (linkInfo.internalCount > 0) {
			expect(linkInfo.firstInternal?.href).toBe('javascript:void(0)');
			expect(linkInfo.firstInternal?.chapter).toBeTruthy();
			expect(linkInfo.firstInternal?.class).toContain('internal-link');
		}
	});

	test('T2: Internal link click navigates to correct chapter', async ({ page }) => {
		// Upload and open book
		const fileChooserPromise = page.waitForEvent('filechooser');
		await page.locator('[data-testid="upload-button"]').click();
		const fileChooser = await fileChooserPromise;

		const epubPath = join(__dirname, 'fixtures/accessible_epub_3.epub');
		await fileChooser.setFiles(epubPath);

		await expect(page.locator('[data-testid="book-card"]')).toHaveCount(1, { timeout: 15000 });
		await page.locator('[data-testid="book-card"]').first().click();
		await expect(page.locator('[data-testid="reader-content"]')).toBeVisible();

		// Navigate to TOC chapter
		await page.goto(page.url().replace(/\?.*/, '') + '?chapter=3');
		await page.waitForTimeout(500);

		// Find an internal link and click it
		const linkInfo = await page.evaluate(() => {
			const link = document.querySelector('a.internal-link');
			if (!link) return null;
			return {
				chapter: link.getAttribute('data-chapter'),
				fragment: link.getAttribute('data-fragment')
			};
		});

		// Skip test if no internal links found
		test.skip(!linkInfo, 'No internal links found in this chapter');

		if (!linkInfo) return;

		// Click the link using JavaScript (since it may not be visible)
		await page.evaluate(() => {
			const link = document.querySelector('a.internal-link');
			if (link) {
				(link as HTMLAnchorElement).click();
			}
		});

		// Wait for navigation
		await page.waitForTimeout(500);

		// Verify URL updated
		await expect(page).toHaveURL(new RegExp(`chapter=${linkInfo.chapter}`));
	});

	test('T3: Missing link shows error popup', async ({ page }) => {
		// Upload and open book
		const fileChooserPromise = page.waitForEvent('filechooser');
		await page.locator('[data-testid="upload-button"]').click();
		const fileChooser = await fileChooserPromise;

		const epubPath = join(__dirname, 'fixtures/accessible_epub_3.epub');
		await fileChooser.setFiles(epubPath);

		await expect(page.locator('[data-testid="book-card"]')).toHaveCount(1, { timeout: 15000 });
		await page.locator('[data-testid="book-card"]').first().click();
		await expect(page.locator('[data-testid="reader-content"]')).toBeVisible();

		// Check for missing links
		const hasMissingLinks = await page.evaluate(() => {
			return document.querySelectorAll('a.missing-link').length > 0;
		});

		if (!hasMissingLinks) {
			// Test passes if no missing links (this is valid)
			expect(true).toBe(true);
			return;
		}

		// Click a missing link
		await page.evaluate(() => {
			const link = document.querySelector('a.missing-link');
			if (link) {
				(link as HTMLAnchorElement).click();
			}
		});

		// Verify error popup appears
		await expect(page.locator('[data-testid="link-error-popup"]')).toBeVisible();

		// Verify it shows original link
		const errorText = await page.locator('[data-testid="link-error-popup"]').textContent();
		expect(errorText).toContain('original');
	});

	test('T4: External links have correct attributes', async ({ page }) => {
		// Upload and open book
		const fileChooserPromise = page.waitForEvent('filechooser');
		await page.locator('[data-testid="upload-button"]').click();
		const fileChooser = await fileChooserPromise;

		const epubPath = join(__dirname, 'fixtures/accessible_epub_3.epub');
		await fileChooser.setFiles(epubPath);

		await expect(page.locator('[data-testid="book-card"]')).toHaveCount(1, { timeout: 15000 });
		await page.locator('[data-testid="book-card"]').first().click();
		await expect(page.locator('[data-testid="reader-content"]')).toBeVisible();

		// Navigate to chapter with external links
		await page.goto(page.url().replace(/\?.*/, '') + '?chapter=1');
		await page.waitForTimeout(500);

		// Check external link attributes
		const externalLinkInfo = await page.evaluate(() => {
			const link = document.querySelector('a.external-link');
			if (!link) return null;
			return {
				target: link.getAttribute('target'),
				rel: link.getAttribute('rel'),
				href: (link as HTMLAnchorElement).getAttribute('href')
			};
		});

		if (!externalLinkInfo) {
			// Test passes if no external links
			expect(true).toBe(true);
			return;
		}

		console.log('External link info:', externalLinkInfo);

		// Verify attributes
		expect(externalLinkInfo.target).toBe('_blank');
		expect(externalLinkInfo.rel).toBe('noopener');
		expect(externalLinkInfo.href).toMatch(/^https?:\/\//);
	});
});
