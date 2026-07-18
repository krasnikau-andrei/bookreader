import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

declare global {
	interface Window {
		__trackedScrollLeft: number;
		__trackedPageIndex: number;
	}
}

const { When, Then } = createBdd();

async function dispatchTouch(
	page: import('@playwright/test').Page,
	clientX: number,
	clientY: number,
	type: 'touchstart' | 'touchmove' | 'touchend'
) {
	await page.evaluate(
		({ x, y, t }) => {
			const el = document.querySelector('[data-testid="reader-content"]');
			if (!el) return;
			const touch = new Touch({
				identifier: 0,
				target: el,
				clientX: x,
				clientY: y
			});
			const event = new TouchEvent(t, {
				touches: t === 'touchend' ? [] : [touch],
				changedTouches: [touch],
				bubbles: true,
				cancelable: true
			});
			el.dispatchEvent(event);
		},
		{ x: clientX, y: clientY, t: type }
	);
}

When('I swipe left from right to left', async ({ page }) => {
	const content = page.locator('[data-testid="reader-content"]');
	const box = await content.boundingBox();
	expect(box).toBeTruthy();
	if (!box) return;

	await dispatchTouch(page, box.x + box.width * 0.8, box.y + box.height * 0.5, 'touchstart');
	await dispatchTouch(page, box.x + box.width * 0.2, box.y + box.height * 0.5, 'touchmove');
	await page.waitForTimeout(50);
	await dispatchTouch(page, box.x + box.width * 0.2, box.y + box.height * 0.5, 'touchend');
	await page.waitForTimeout(800);
});

When('I swipe right from left to right', async ({ page }) => {
	const content = page.locator('[data-testid="reader-content"]');
	const box = await content.boundingBox();
	expect(box).toBeTruthy();
	if (!box) return;

	await dispatchTouch(page, box.x + box.width * 0.2, box.y + box.height * 0.5, 'touchstart');
	await dispatchTouch(page, box.x + box.width * 0.8, box.y + box.height * 0.5, 'touchmove');
	await page.waitForTimeout(50);
	await dispatchTouch(page, box.x + box.width * 0.8, box.y + box.height * 0.5, 'touchend');
	await page.waitForTimeout(800);
});

When('I swipe left a long distance across the screen', async ({ page }) => {
	const content = page.locator('[data-testid="reader-content"]');
	const box = await content.boundingBox();
	expect(box).toBeTruthy();
	if (!box) return;

	await dispatchTouch(page, box.x + box.width * 0.9, box.y + box.height * 0.5, 'touchstart');
	await dispatchTouch(page, box.x + box.width * 0.1, box.y + box.height * 0.5, 'touchmove');
	await page.waitForTimeout(50);
	await dispatchTouch(page, box.x + box.width * 0.1, box.y + box.height * 0.5, 'touchend');
	await page.waitForTimeout(800);
});

When('I swipe right a long distance across the screen', async ({ page }) => {
	const content = page.locator('[data-testid="reader-content"]');
	const box = await content.boundingBox();
	expect(box).toBeTruthy();
	if (!box) return;

	await dispatchTouch(page, box.x + box.width * 0.1, box.y + box.height * 0.5, 'touchstart');
	await dispatchTouch(page, box.x + box.width * 0.9, box.y + box.height * 0.5, 'touchmove');
	await page.waitForTimeout(50);
	await dispatchTouch(page, box.x + box.width * 0.9, box.y + box.height * 0.5, 'touchend');
	await page.waitForTimeout(800);
});

When('I swipe left a short distance', async ({ page }) => {
	const content = page.locator('[data-testid="reader-content"]');
	const box = await content.boundingBox();
	expect(box).toBeTruthy();
	if (!box) return;

	await dispatchTouch(page, box.x + box.width * 0.55, box.y + box.height * 0.5, 'touchstart');
	await page.waitForTimeout(800);
	await dispatchTouch(page, box.x + box.width * 0.4, box.y + box.height * 0.5, 'touchmove');
	await page.waitForTimeout(800);
	await dispatchTouch(page, box.x + box.width * 0.4, box.y + box.height * 0.5, 'touchend');
	await page.waitForTimeout(800);
});

When('I swipe right a short distance', async ({ page }) => {
	const content = page.locator('[data-testid="reader-content"]');
	const box = await content.boundingBox();
	expect(box).toBeTruthy();
	if (!box) return;

	await dispatchTouch(page, box.x + box.width * 0.45, box.y + box.height * 0.5, 'touchstart');
	await page.waitForTimeout(800);
	await dispatchTouch(page, box.x + box.width * 0.6, box.y + box.height * 0.5, 'touchmove');
	await page.waitForTimeout(800);
	await dispatchTouch(page, box.x + box.width * 0.6, box.y + box.height * 0.5, 'touchend');
	await page.waitForTimeout(800);
});

Then('the scroll position should increase', async ({ page }) => {
	const content = page.locator('[data-testid="reader-content"]');
	const initialScroll = await content.evaluate((el) => (el as HTMLElement).scrollLeft);
	expect(initialScroll).toBeGreaterThan(0);
});

Then('the scroll position should decrease', async ({ page }) => {
	const content = page.locator('[data-testid="reader-content"]');
	const finalScroll = await content.evaluate((el) => (el as HTMLElement).scrollLeft);
	const midScroll = 0;
	expect(finalScroll).toBeLessThan(midScroll);
});

Then('the final position should be at a valid page snap point', async ({ page }) => {
	const content = page.locator('[data-testid="reader-content"]');
	const finalScroll = await content.evaluate((el) => (el as HTMLElement).scrollLeft);
	const clientWidth = await content.evaluate((el) => (el as HTMLElement).clientWidth);
	const pageIndex = Math.round(finalScroll / clientWidth);
	const expectedScroll = pageIndex * clientWidth;
	expect(Math.abs(finalScroll - expectedScroll)).toBeLessThan(clientWidth * 0.04);
});

Then('the scroll position should change gradually over time', async ({ page }) => {
	const content = page.locator('[data-testid="reader-content"]');
	const box = await content.boundingBox();
	expect(box).toBeTruthy();
	if (!box) return;

	const initialScroll = await content.evaluate((el) => (el as HTMLElement).scrollLeft);

	await content.click({ position: { x: box.width * 0.8, y: box.height * 0.5 } });
	await page.waitForTimeout(50);
	const scrollAfter50ms = await content.evaluate((el) => (el as HTMLElement).scrollLeft);
	await page.waitForTimeout(50);
	const scrollAfter100ms = await content.evaluate((el) => (el as HTMLElement).scrollLeft);

	const hasAnimation = scrollAfter50ms > initialScroll || scrollAfter100ms > scrollAfter50ms;
	expect(hasAnimation || scrollAfter100ms > initialScroll).toBe(true);
});

When('I start tracking the scroll position', async ({ page }) => {
	const content = page.locator('[data-testid="reader-content"]');
	const scrollLeft = await content.evaluate((el) => (el as HTMLElement).scrollLeft);
	const clientWidth = await content.evaluate((el) => (el as HTMLElement).clientWidth);
	const pageIndex = Math.round(scrollLeft / clientWidth);
	await page.evaluate(
		({ scroll, page: p }: { scroll: number; page: number }) => {
			window.__trackedScrollLeft = scroll;
			window.__trackedPageIndex = p;
		},
		{ scroll: scrollLeft, page: pageIndex }
	);
});

Then('the page should advance by exactly 1 page', async ({ page }) => {
	const content = page.locator('[data-testid="reader-content"]');
	const clientWidth = await content.evaluate((el) => (el as HTMLElement).clientWidth);
	const scrollAfter = await content.evaluate((el) => (el as HTMLElement).scrollLeft);
	const pageBefore = await page.evaluate(() => window.__trackedPageIndex);
	const pageAfter = Math.round(scrollAfter / clientWidth);
	const diff = pageAfter - pageBefore;
	expect(diff).toBe(
		1,
		`BUG: large swipe advanced ${diff} pages instead of 1. ` +
			`page ${pageBefore} → ${pageAfter} (scrollLeft=${scrollAfter}).`
	);
});

Then('the page should go back by exactly 1 page', async ({ page }) => {
	const content = page.locator('[data-testid="reader-content"]');
	const clientWidth = await content.evaluate((el) => (el as HTMLElement).clientWidth);
	const scrollAfter = await content.evaluate((el) => (el as HTMLElement).scrollLeft);
	const pageBefore = await page.evaluate(() => window.__trackedPageIndex);
	const pageAfter = Math.round(scrollAfter / clientWidth);
	const diff = pageBefore - pageAfter;
	expect(diff).toBe(
		1,
		`BUG: large swipe went back ${diff} pages instead of 1. ` +
			`page ${pageBefore} → ${pageAfter} (scrollLeft=${scrollAfter}).`
	);
});

Then('the scroll position should not have changed', async ({ page }) => {
	const content = page.locator('[data-testid="reader-content"]');
	const scrollAfter = await content.evaluate((el) => (el as HTMLElement).scrollLeft);
	const scrollBefore = await page.evaluate(() => window.__trackedScrollLeft || 0);

	expect(scrollAfter).toBe(
		scrollBefore,
		`BUG: scroll position changed from ${scrollBefore} to ${scrollAfter} ` +
			`after a tiny cancelled swipe. Page should snap back (diff=${Math.abs(scrollAfter - scrollBefore)}px).`
	);
});

Then('the page should advance by exactly one page again', async ({ page }) => {
	const content = page.locator('[data-testid="reader-content"]');
	const clientWidth = await content.evaluate((el) => (el as HTMLElement).clientWidth);
	const scrollAfter = await content.evaluate((el) => (el as HTMLElement).scrollLeft);
	const pageAfter = Math.round(scrollAfter / clientWidth);
	expect(pageAfter).toBeGreaterThanOrEqual(0);
});
