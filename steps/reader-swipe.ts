import { expect, type Page } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

interface ScrollBeforeSwipe {
	scrollLeft: number;
	clientWidth: number;
}

/** Read before the finger touches: the page follows the finger, so after touchend it has already moved. */
async function readScrollBeforeSwipe(page: Page): Promise<ScrollBeforeSwipe | -1> {
	return page.evaluate(() => {
		const el = document.querySelector('[data-testid="reader-content"]');
		if (!el) return -1;
		return { scrollLeft: el.scrollLeft, clientWidth: (el as HTMLElement).clientWidth };
	});
}

async function waitForScrollSnap(page: Page, initialScroll: ScrollBeforeSwipe | -1) {
	if (initialScroll === -1) return;
	await page.waitForFunction(
		(init: { scrollLeft: number; clientWidth: number }) => {
			const el = document.querySelector('[data-testid="reader-content"]') as HTMLElement | null;
			if (!el) return false;
			const snap = Math.round(el.scrollLeft / el.clientWidth) * el.clientWidth;
			return (
				Math.abs(el.scrollLeft - snap) < 1 &&
				Math.abs(el.scrollLeft - init.scrollLeft) > init.clientWidth * 0.2
			);
		},
		initialScroll,
		// The scroll animation itself takes 250ms, but with four webkit workers
		// running in parallel the page can be starved of frames for several
		// seconds, so this budget only has to exceed the contention — not the
		// animation. The assertion below stays strict.
		{ timeout: 15000 }
	);
}

/** Waits until the content rests on a page boundary, wherever that is (used after cancelled swipes). */
async function waitForSnapSettled(page: Page) {
	await page.waitForFunction(
		() => {
			const el = document.querySelector('[data-testid="reader-content"]') as HTMLElement | null;
			if (!el) return false;
			const w = window as unknown as { __lastSnapCheck?: number };
			const prev = w.__lastSnapCheck;
			w.__lastSnapCheck = el.scrollLeft;
			const snap = Math.round(el.scrollLeft / el.clientWidth) * el.clientWidth;
			return prev === el.scrollLeft && Math.abs(el.scrollLeft - snap) < 1;
		},
		undefined,
		{ polling: 100, timeout: 10000 }
	);
}

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
	const content = page.locator('[data-testid="reader-content"]');
	const touch = { identifier: 0, clientX, clientY };
	await content.dispatchEvent(type, {
		touches: type === 'touchend' ? [] : [touch],
		changedTouches: [touch]
	});
}

When('I swipe left from right to left', async ({ page }) => {
	const content = page.locator('[data-testid="reader-content"]');
	const box = await content.boundingBox();
	expect(box).toBeTruthy();
	if (!box) return;

	const before = await readScrollBeforeSwipe(page);
	await dispatchTouch(page, box.x + box.width * 0.8, box.y + box.height * 0.5, 'touchstart');
	await dispatchTouch(page, box.x + box.width * 0.2, box.y + box.height * 0.5, 'touchmove');
	await dispatchTouch(page, box.x + box.width * 0.2, box.y + box.height * 0.5, 'touchend');
	await waitForScrollSnap(page, before);
});

When('I swipe right from left to right', async ({ page }) => {
	const content = page.locator('[data-testid="reader-content"]');
	const box = await content.boundingBox();
	expect(box).toBeTruthy();
	if (!box) return;

	const before = await readScrollBeforeSwipe(page);
	await dispatchTouch(page, box.x + box.width * 0.2, box.y + box.height * 0.5, 'touchstart');
	await dispatchTouch(page, box.x + box.width * 0.8, box.y + box.height * 0.5, 'touchmove');
	await dispatchTouch(page, box.x + box.width * 0.8, box.y + box.height * 0.5, 'touchend');
	await waitForScrollSnap(page, before);
});

When('I swipe left a long distance across the screen', async ({ page }) => {
	const content = page.locator('[data-testid="reader-content"]');
	const box = await content.boundingBox();
	expect(box).toBeTruthy();
	if (!box) return;

	const before = await readScrollBeforeSwipe(page);
	await dispatchTouch(page, box.x + box.width * 0.9, box.y + box.height * 0.5, 'touchstart');
	await dispatchTouch(page, box.x + box.width * 0.1, box.y + box.height * 0.5, 'touchmove');
	await dispatchTouch(page, box.x + box.width * 0.1, box.y + box.height * 0.5, 'touchend');
	await waitForScrollSnap(page, before);
});

When('I swipe right a long distance across the screen', async ({ page }) => {
	const content = page.locator('[data-testid="reader-content"]');
	const box = await content.boundingBox();
	expect(box).toBeTruthy();
	if (!box) return;

	const before = await readScrollBeforeSwipe(page);
	await dispatchTouch(page, box.x + box.width * 0.1, box.y + box.height * 0.5, 'touchstart');
	await dispatchTouch(page, box.x + box.width * 0.9, box.y + box.height * 0.5, 'touchmove');
	await dispatchTouch(page, box.x + box.width * 0.9, box.y + box.height * 0.5, 'touchend');
	await waitForScrollSnap(page, before);
});

When('I swipe left a short distance', async ({ page }) => {
	const content = page.locator('[data-testid="reader-content"]');
	const box = await content.boundingBox();
	expect(box).toBeTruthy();
	if (!box) return;

	await dispatchTouch(page, box.x + box.width * 0.55, box.y + box.height * 0.5, 'touchstart');
	await page.waitForTimeout(400);
	await dispatchTouch(page, box.x + box.width * 0.4, box.y + box.height * 0.5, 'touchmove');
	await page.waitForTimeout(400);
	await dispatchTouch(page, box.x + box.width * 0.4, box.y + box.height * 0.5, 'touchend');
	await waitForSnapSettled(page);
});

When('I swipe right a short distance', async ({ page }) => {
	const content = page.locator('[data-testid="reader-content"]');
	const box = await content.boundingBox();
	expect(box).toBeTruthy();
	if (!box) return;

	await dispatchTouch(page, box.x + box.width * 0.45, box.y + box.height * 0.5, 'touchstart');
	await page.waitForTimeout(400);
	await dispatchTouch(page, box.x + box.width * 0.6, box.y + box.height * 0.5, 'touchmove');
	await page.waitForTimeout(400);
	await dispatchTouch(page, box.x + box.width * 0.6, box.y + box.height * 0.5, 'touchend');
	await waitForSnapSettled(page);
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
	const scrollMid = await page.waitForFunction(
		(initial: number) => {
			const el = document.querySelector('[data-testid="reader-content"]') as HTMLElement | null;
			return el && el.scrollLeft > initial ? el.scrollLeft : false;
		},
		initialScroll,
		{ timeout: 2000 }
	);
	expect(await scrollMid.jsonValue()).toBeGreaterThan(initialScroll);
});

When('I start tracking the scroll position', async ({ page }) => {
	const content = page.locator('[data-testid="reader-content"]');
	const scrollLeft = await content.evaluate((el) => (el as HTMLElement).scrollLeft);
	const clientWidth = await content.evaluate((el) => (el as HTMLElement).clientWidth);
	const pageIndex = Math.round(scrollLeft / clientWidth);
	await page.evaluate(
		({ scroll, page: p }) => {
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

interface DragRecord {
	touchAction: string;
	startScrollLeft: number;
	moves: { fingerDx: number; prevented: boolean; scrollLeft: number }[];
}

declare global {
	interface Window {
		__drag: DragRecord;
	}
}

When('I drag a finger left across the page in small steps', async ({ page }) => {
	const content = page.locator('[data-testid="reader-content"]');
	const box = await content.boundingBox();
	expect(box).toBeTruthy();
	if (!box) return;

	// Record, after the reader's own handler has run, whether each touchmove was
	// cancelled and where the page was. A listener on window runs last (bubbling).
	await page.evaluate(() => {
		const el = document.querySelector('[data-testid="reader-content"]') as HTMLElement;
		const record: DragRecord = {
			touchAction: getComputedStyle(el).touchAction,
			startScrollLeft: el.scrollLeft,
			moves: []
		};
		let startX: number | null = null;
		window.addEventListener('touchmove', (e) => {
			const x = e.touches[0].clientX;
			startX ??= x;
			record.moves.push({
				fingerDx: x - startX,
				prevented: e.defaultPrevented,
				scrollLeft: el.scrollLeft
			});
		});
		window.__drag = record;
	});

	// Small steps like a real finger: the first moves are well under the 20px
	// "is this a swipe" threshold, which is exactly where native scroll used to start.
	const y = box.y + box.height * 0.5;
	const startX = box.x + box.width * 0.8;
	const step = 8;
	const steps = Math.round((box.width * 0.5) / step);
	const before = await readScrollBeforeSwipe(page);
	await dispatchTouch(page, startX, y, 'touchstart');
	await dispatchTouch(page, startX, y, 'touchmove');
	for (let i = 1; i <= steps; i++) {
		await dispatchTouch(page, startX - i * step, y, 'touchmove');
	}
	await dispatchTouch(page, startX - steps * step, y, 'touchend');
	await waitForScrollSnap(page, before);
});

Then('the browser was never allowed to scroll the page natively', async ({ page }) => {
	const drag = await page.evaluate(() => window.__drag);
	expect(drag.moves.length).toBeGreaterThan(0);

	expect(
		drag.touchAction,
		`reader content has touch-action "${drag.touchAction}", expected "none": ` +
			`any other value lets the browser pan natively and fling past the page`
	).toBe('none');

	const notPrevented = drag.moves
		.map((m, i) => ({ i, ...m }))
		.filter((m) => !m.prevented)
		.map((m) => `#${m.i} (finger moved ${m.fingerDx}px)`);
	expect(
		notPrevented,
		`touchmove events not cancelled by the reader: ${notPrevented.join(', ')}. ` +
			`An uncancelled touchmove lets the browser take over the gesture as a native scroll.`
	).toEqual([]);
});

Then('the page should have followed the finger during the drag', async ({ page }) => {
	const drag = await page.evaluate(() => window.__drag);
	const trace = drag.moves
		.map((m) => `finger ${m.fingerDx}px → page ${m.scrollLeft - drag.startScrollLeft}px`)
		.join('; ');
	const lagging = drag.moves.filter(
		(m) => Math.abs(drag.startScrollLeft - m.scrollLeft - m.fingerDx) > 1
	);
	expect(lagging.length, `page did not track the finger. Trace: ${trace}`).toBe(0);
});
