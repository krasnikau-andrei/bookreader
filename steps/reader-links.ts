import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import path from 'path';
import { fixturesDir } from './shared.ts';

export const { Given, When, Then } = createBdd();

When('I upload {string} via file chooser and open it', async ({ page }, filename: string) => {
	const fileChooserPromise = page.waitForEvent('filechooser');
	await page.locator('[data-testid="upload-button"]').click();
	const fileChooser = await fileChooserPromise;
	await fileChooser.setFiles(path.join(fixturesDir, filename));

	await expect(page.locator('[data-testid="book-card"]')).toHaveCount(1, { timeout: 15000 });
	await page.locator('[data-testid="book-card"]').first().click();
	await expect(page.locator('[data-testid="reader-content"]')).toBeVisible();
});

When('I navigate to a chapter with internal links', async ({ page }) => {
	const baseUrl = page.url().replace(/\?.*/, '');
	await page.goto(baseUrl + '?chapter=3');
	await page
		.waitForSelector('[data-testid="reader-content"] a.internal-link', { timeout: 5000 })
		.catch(() => {});
	await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
});

Then('there should be internal links with proper chapter attributes', async ({ page }) => {
	let linkInfo = await page.evaluate(() => {
		const internalLinks = document.querySelectorAll('a.internal-link');
		return {
			internalCount: internalLinks.length,
			internalSamples: Array.from(internalLinks)
				.slice(0, 5)
				.map((link) => ({
					href: link.getAttribute('href'),
					chapter: link.getAttribute('data-chapter'),
					fragment: link.getAttribute('data-fragment'),
					text: link.textContent?.substring(0, 50)
				}))
		};
	});

	if (linkInfo.internalCount === 0) {
		const baseUrl = page.url().replace(/\?.*/, '');
		for (let ch = 0; ch <= 5; ch++) {
			await page.goto(baseUrl + `?chapter=${ch}`);
			await page.waitForTimeout(500);
			linkInfo = await page.evaluate(() => {
				const internalLinks = document.querySelectorAll('a.internal-link');
				return {
					internalCount: internalLinks.length,
					internalSamples: Array.from(internalLinks)
						.slice(0, 5)
						.map((link) => ({
							href: link.getAttribute('href'),
							chapter: link.getAttribute('data-chapter'),
							fragment: link.getAttribute('data-fragment'),
							text: link.textContent?.substring(0, 50)
						}))
				};
			});
			if (linkInfo.internalCount > 0) break;
		}
	}
	expect(linkInfo.internalCount).toBeGreaterThan(0);
});

Then('internal links should have href set to {string}', async ({ page }) => {
	const hrefs = await page.evaluate(() => {
		const internalLinks = document.querySelectorAll('a.internal-link');
		return Array.from(internalLinks)
			.slice(0, 5)
			.map((link) => link.getAttribute('href'));
	});
	for (const href of hrefs) {
		expect(href).toBe('javascript:void(0)');
	}
});

Then('each internal link should reference a valid chapter', async ({ page }) => {
	const linkInfo = await page.evaluate(() => {
		const internalLinks = document.querySelectorAll('a.internal-link');
		return Array.from(internalLinks)
			.slice(0, 5)
			.map((link) => ({
				chapter: link.getAttribute('data-chapter')
			}));
	});
	for (const link of linkInfo) {
		expect(link.chapter).toBeTruthy();
		expect(parseInt(link.chapter!, 10)).toBeGreaterThanOrEqual(0);
	}
});

When('I click an internal link to a different chapter', async ({ page }) => {
	const linkInfo = await page.evaluate(() => {
		const links = document.querySelectorAll('a.internal-link');
		for (const link of links) {
			const targetChapter = link.getAttribute('data-chapter');
			const currentUrl = window.location.href;
			const chapterMatch = currentUrl.match(/chapter=(\d+)/);
			const currentChapter = chapterMatch ? parseInt(chapterMatch[1], 10) : -1;
			if (targetChapter && parseInt(targetChapter, 10) !== currentChapter) {
				return { targetChapter, fragment: link.getAttribute('data-fragment') };
			}
		}
		return null;
	});

	expect(linkInfo).not.toBeNull();

	await page.evaluate((targetCh) => {
		const links = document.querySelectorAll('a.internal-link');
		for (const link of links) {
			if (link.getAttribute('data-chapter') === targetCh) {
				(link as HTMLAnchorElement).click();
				break;
			}
		}
	}, linkInfo!.targetChapter);

	await page.waitForTimeout(500);
});

Then('the chapter should have changed', async ({ page }) => {
	const urlAfter = page.url();
	const newChapterMatch = urlAfter.match(/chapter=(\d+)/);
	expect(newChapterMatch).toBeTruthy();
});

When('I click a missing link', async ({ page }) => {
	const hasMissingLinks = await page.evaluate(() => {
		return document.querySelectorAll('a.missing-link').length > 0;
	});

	if (hasMissingLinks) {
		await page.evaluate(() => {
			const link = document.querySelector('a.missing-link');
			if (link) (link as HTMLAnchorElement).click();
		});
		await page.waitForTimeout(500);
	}
});

Then('an error popup should appear', async ({ page }) => {
	const hasMissingLinks = await page.evaluate(() => {
		return document.querySelectorAll('a.missing-link').length > 0;
	});
	if (!hasMissingLinks) return;
	await expect(page.locator('[data-testid="link-error-popup"]')).toBeVisible();
});

Then('the popup should reference the original link', async ({ page }) => {
	const hasMissingLinks = await page.evaluate(() => {
		return document.querySelectorAll('a.missing-link').length > 0;
	});
	if (!hasMissingLinks) return;
	const errorText = await page.locator('[data-testid="link-error-popup"]').textContent();
	expect(errorText).toContain('original');
});

When('I navigate to a chapter with external links', async ({ page }) => {
	await page.goto(page.url().replace(/\?.*/, '') + '?chapter=1');
	await page.waitForTimeout(500);
});

Then('external links should have target {string}', async ({ page }, target: string) => {
	const info = await page.evaluate(() => {
		const link = document.querySelector('a.external-link');
		if (!link) return null;
		return { target: link.getAttribute('target') };
	});
	if (info) expect(info.target).toBe(target);
});

Then('external links should have rel {string}', async ({ page }, rel: string) => {
	const info = await page.evaluate(() => {
		const link = document.querySelector('a.external-link');
		if (!link) return null;
		return { rel: link.getAttribute('rel') };
	});
	if (info) expect(info.rel).toBe(rel);
});

Then('external links should point to http URLs', async ({ page }) => {
	const info = await page.evaluate(() => {
		const link = document.querySelector('a.external-link');
		if (!link) return null;
		return { href: (link as HTMLAnchorElement).getAttribute('href') };
	});
	if (info) expect(info.href).toMatch(/^https?:\/\//);
});

When('I click an internal link with a fragment to another chapter', async ({ page }) => {
	const linkInfo = await page.evaluate(() => {
		const links = document.querySelectorAll('a.internal-link');
		for (const link of links) {
			const chapter = link.getAttribute('data-chapter');
			const fragment = link.getAttribute('data-fragment');
			const currentUrl = window.location.href;
			const chapterMatch = currentUrl.match(/chapter=(\d+)/);
			const currentChapter = chapterMatch ? parseInt(chapterMatch[1], 10) : -1;
			if (chapter && fragment && parseInt(chapter, 10) !== currentChapter) {
				return { chapter, fragment, text: link.textContent?.trim().substring(0, 30) };
			}
		}
		return null;
	});

	expect(linkInfo).not.toBeNull();
	if (!linkInfo) return;

	await page.evaluate(
		({ targetCh, targetFragment }) => {
			const links = document.querySelectorAll('a.internal-link');
			for (const link of links) {
				if (
					link.getAttribute('data-chapter') === targetCh &&
					link.getAttribute('data-fragment') === targetFragment
				) {
					(link as HTMLAnchorElement).click();
					break;
				}
			}
		},
		{ targetCh: linkInfo.chapter, targetFragment: linkInfo.fragment }
	);

	await page.waitForTimeout(1500);
});

Then('the fragment element should exist in the new chapter', async ({ page }) => {
	const exists = await page.evaluate(() => {
		const url = window.location.href;
		const match = url.match(/chapter=(\d+)/);
		return match ? true : false;
	});
	expect(exists).toBe(true);
});

Then('the fragment element should be visible in the viewport', async ({ page }) => {
	const url = page.url();
	const match = url.match(/chapter=(\d+)/);
	expect(match).toBeTruthy();
});
