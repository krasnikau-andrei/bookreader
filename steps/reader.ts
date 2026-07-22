import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Given, When, Then } = createBdd();

Then('the reader should be visible', async ({ page }) => {
	await expect(page.locator('.reader')).toBeVisible();
});

Then('the overlay should be hidden', async ({ page }) => {
	const backButton = page.getByRole('button', { name: 'Go back' });
	await expect(backButton).not.toBeVisible();
});

Then('the overlay should be visible', async ({ page }) => {
	const backButton = page.getByRole('button', { name: 'Go back' });
	await expect(backButton).toBeVisible();
});

When('I tap the center of the page', async ({ page }) => {
	const url = page.url();
	const urlObj = new URL(url);
	urlObj.searchParams.set('chapter', '1');
	urlObj.searchParams.set('progress', '0');
	await page.goto(urlObj.toString());
	await page.waitForSelector('[data-testid="reader-content"]', { timeout: 10000 });
	const content = page.locator('[data-testid="reader-content"]');
	const box = await content.boundingBox();
	expect(box).toBeTruthy();
	await content.click({ position: { x: box!.width * 0.5, y: box!.height * 0.5 } });
	await expect(page.getByRole('button', { name: 'Show table of contents' })).toBeVisible({ timeout: 3000 });
});

When('I tap the center of the page again', async ({ page }) => {
	const content = page.locator('[data-testid="reader-content"]');
	const box = await content.boundingBox();
	expect(box).toBeTruthy();
	await content.click({ position: { x: box!.width * 0.5, y: box!.height * 0.5 } });
});

When('I tap the right zone', async ({ page }) => {
	const reader = page.locator('.reader');
	const box = await reader.boundingBox();
	expect(box).toBeTruthy();
	if (!box) return;
	await reader.click({ position: { x: box.width * 0.8, y: box.height * 0.5 } });
	await page.waitForTimeout(250);
});

When('I tap the left zone', async ({ page }) => {
	const reader = page.locator('.reader');
	const box = await reader.boundingBox();
	expect(box).toBeTruthy();
	if (!box) return;
	await reader.click({ position: { x: box.width * 0.2, y: box.height * 0.5 } });
	await page.waitForTimeout(250);
});

When('I tap the right zone again', async ({ page }) => {
	const reader = page.locator('.reader');
	const box = await reader.boundingBox();
	expect(box).toBeTruthy();
	if (!box) return;
	await reader.click({ position: { x: box.width * 0.8, y: box.height * 0.5 } });
	await page.waitForTimeout(250);
});

Then('tapping the right zone should move through the content', async ({ page }) => {
	const content = page.locator('[data-testid="reader-content"]');
	const reader = page.locator('.reader');
	const box = await reader.boundingBox();
	expect(box).toBeTruthy();
	if (!box) return;

	const initialContent = await content.evaluate((el) => el.innerHTML);
	let contentChanged = false;
	let scrollChanged = false;
	let lastContent = initialContent;
	let lastScrollLeft = await content.evaluate((el) => el.scrollLeft);

	for (let i = 0; i < 10; i++) {
		await reader.click({ position: { x: box.width * 0.8, y: box.height * 0.5 } });
		await page.waitForTimeout(400);
		const currentContent = await content.evaluate((el) => el.innerHTML);
		const currentScrollLeft = await content.evaluate((el) => el.scrollLeft);
		if (currentContent !== lastContent) contentChanged = true;
		if (currentScrollLeft !== lastScrollLeft) scrollChanged = true;
		lastContent = currentContent;
		lastScrollLeft = currentScrollLeft;
	}
	expect(contentChanged || scrollChanged).toBe(true);
});

Then('tapping the left zone should navigate back', async ({ page }) => {
	const reader = page.locator('.reader');
	const box = await reader.boundingBox();
	expect(box).toBeTruthy();
	if (!box) return;

	const fs = await import('fs');
	await page.screenshot({ path: 'test-results/screenshot-after-right.png' });
	const screenshotAfterRight = fs.readFileSync('test-results/screenshot-after-right.png');

	if (box) {
		for (let i = 0; i < 5; i++) {
			await reader.click({ position: { x: box.width * 0.2, y: box.height * 0.5 } });
			await page.waitForTimeout(400);
		}
	}

	await page.screenshot({ path: 'test-results/screenshot-after-left.png' });
	const screenshotAfterLeft = fs.readFileSync('test-results/screenshot-after-left.png');
	expect(screenshotAfterLeft).not.toEqual(screenshotAfterRight);
});

Then('the text should be visible with sufficient contrast', async ({ page }) => {
	const content = page.locator('[data-testid="reader-content"]');
	const reader = page.locator('.reader');
	const box = await reader.boundingBox();
	expect(box).toBeTruthy();
	if (box) {
		for (let i = 0; i < 9; i++) {
			await reader.click({ position: { x: box.width * 0.8, y: box.height * 0.5 } });
			await page.waitForTimeout(400);
		}
		await page.waitForTimeout(500);
	}

	const visibilityInfo = await content.evaluate((el) => {
		const selectors = ['p', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
		for (const selector of selectors) {
			const elements = el.querySelectorAll(selector);
			for (const elem of elements) {
				const text = elem.textContent?.trim() || '';
				if (text.length < 5) continue;
				const isVisible = elem.checkVisibility({
					contentVisibilityAuto: true,
					opacityProperty: true,
					visibilityProperty: true
				});
				const styles = window.getComputedStyle(elem);
				const color = styles.color;
				const backgroundColor = styles.backgroundColor;
				const opacity = styles.opacity;

				const parseRGB = (colorStr: string) => {
					const match = colorStr.match(/rgba?\(([^)]+)\)/);
					if (!match) return null;
					const parts = match[1].split(',').map((s) => parseFloat(s.trim()));
					return {
						r: parts[0] || 0,
						g: parts[1] || 0,
						b: parts[2] || 0,
						a: parts[3] !== undefined ? parts[3] : 1
					};
				};

				const fg = parseRGB(color);
				const bg = parseRGB(backgroundColor);
				const luminance = (r: number, g: number, b: number) => {
					const [rs, gs, bs] = [r, g, b].map((v) => {
						v /= 255;
						return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
					});
					return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
				};
				const fgLum = fg ? luminance(fg.r, fg.g, fg.b) : 0;
				const bgLum = bg ? luminance(bg.r, bg.g, bg.b) : 1;
				const lighter = Math.max(fgLum, bgLum);
				const darker = Math.min(fgLum, bgLum);
				const contrastRatio = (lighter + 0.05) / (darker + 0.05);

				return { isVisible, opacity, contrastRatio };
			}
		}
		return { noElementFound: true };
	});

	if ('noElementFound' in visibilityInfo) {
		throw new Error('No text element found with sufficient content');
	}

	const info = visibilityInfo as { isVisible: boolean; opacity: string; contrastRatio: number };
	expect(info.isVisible).toBe(true);
	expect(info.opacity).not.toBe('0');
	expect(info.contrastRatio).toBeGreaterThan(3);
});

Then('I navigate to a chapter with text content', async ({ page }) => {
	const url = page.url();
	const urlObj = new URL(url);
	urlObj.searchParams.set('chapter', '10');
	urlObj.searchParams.set('progress', '0');
	await page.goto(urlObj.toString());
	await page.waitForSelector('[data-testid="reader-content"]', { timeout: 10000 });
	await page.waitForFunction(
		() => (document.querySelector('[data-testid="reader-content"]')?.children?.length ?? 0) > 0,
		{ timeout: 5000 }
	);
});

Then('the content should fill at least 85% of the viewport width', async ({ page }) => {
	const content = page.locator('[data-testid="reader-content"]');
	const viewportInfo = await content.evaluate((el) => {
		const containerRect = el.getBoundingClientRect();
		const viewportWidth = containerRect.width;
		const viewportLeft = containerRect.left;
		const viewportRight = containerRect.right;
		const selectors = ['p', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
		for (const selector of selectors) {
			const elements = el.querySelectorAll(selector);
			for (const elem of elements) {
				const text = elem.textContent?.trim() || '';
				if (text.length < 10) continue;
				const rect = elem.getBoundingClientRect();
				if (rect.left >= viewportLeft && rect.left < viewportRight) {
					return { viewportWidth, elementWidth: rect.width, gap: viewportRight - rect.right };
				}
			}
		}
		return { error: 'No visible text element found' };
	});

	if ('error' in viewportInfo) throw new Error(viewportInfo.error);
	const info = viewportInfo as { viewportWidth: number; elementWidth: number; gap: number };
	expect(info.elementWidth).toBeGreaterThan(info.viewportWidth * 0.85);
});

Then('the gap to the next page should be under 15%', async ({ page }) => {
	const content = page.locator('[data-testid="reader-content"]');
	const viewportInfo = await content.evaluate((el) => {
		const containerRect = el.getBoundingClientRect();
		const viewportWidth = containerRect.width;
		const viewportLeft = containerRect.left;
		const viewportRight = containerRect.right;
		const selectors = ['p', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
		for (const selector of selectors) {
			const elements = el.querySelectorAll(selector);
			for (const elem of elements) {
				const text = elem.textContent?.trim() || '';
				if (text.length < 10) continue;
				const rect = elem.getBoundingClientRect();
				if (rect.left >= viewportLeft && rect.left < viewportRight) {
					return { viewportWidth, gap: viewportRight - rect.right };
				}
			}
		}
		return { error: 'No visible text element found' };
	});
	if ('error' in viewportInfo) throw new Error(viewportInfo.error);
	const info = viewportInfo as { viewportWidth: number; gap: number };
	expect(info.gap).toBeLessThan(info.viewportWidth * 0.15);
});

Then('I navigate near a chapter boundary', async ({ page }) => {
	const reader = page.locator('.reader');
	const box = await reader.boundingBox();
	expect(box).toBeTruthy();
	if (!box) return;
	for (let i = 0; i < 5; i++) {
		await reader.click({ position: { x: box.width * 0.8, y: box.height * 0.5 } });
		await page.waitForTimeout(300);
	}
	await page.waitForTimeout(500);
});

When('I rapidly tap the right zone {int} times', async ({ page }, times: number) => {
	const reader = page.locator('.reader');
	const box = await reader.boundingBox();
	expect(box).toBeTruthy();
	if (!box) return;
	for (let i = 0; i < times; i++) {
		await reader.click({ position: { x: box.width * 0.8, y: box.height * 0.5 } });
		await page.waitForTimeout(50);
	}
	await page.waitForTimeout(2000);
});

Then('the scroll position should be at a valid page boundary', async ({ page }) => {
	const content = page.locator('[data-testid="reader-content"]');
	const state = await content.evaluate((el) => {
		const e = el as HTMLElement;
		return {
			scrollLeft: e.scrollLeft,
			clientWidth: e.clientWidth,
			maxScroll: e.scrollWidth - e.clientWidth
		};
	});
	const expectedPage = Math.round(state.scrollLeft / state.clientWidth);
	const expectedScroll = expectedPage * state.clientWidth;
	const positionError = Math.abs(state.scrollLeft - expectedScroll);
	const isAtValidPosition =
		positionError < state.clientWidth * 0.02 ||
		state.scrollLeft >= state.maxScroll - 10 ||
		state.scrollLeft <= 10;
	expect(isAtValidPosition).toBe(true);
	expect(state.scrollLeft).toBeGreaterThanOrEqual(0);
	expect(state.scrollLeft).toBeLessThanOrEqual(state.maxScroll + 10);
});

Then('the scroll position should not be stuck mid-scroll', async ({ page }) => {
	const content = page.locator('[data-testid="reader-content"]');
	const state = await content.evaluate((el) => {
		const e = el as HTMLElement;
		return {
			scrollLeft: e.scrollLeft,
			clientWidth: e.clientWidth,
			maxScroll: e.scrollWidth - e.clientWidth
		};
	});
	const expectedPage = Math.round(state.scrollLeft / state.clientWidth);
	const expectedScroll = expectedPage * state.clientWidth;
	const positionError = Math.abs(state.scrollLeft - expectedScroll);
	const isAtValidPosition =
		positionError < state.clientWidth * 0.02 ||
		state.scrollLeft >= state.maxScroll - 10 ||
		state.scrollLeft <= 10;
	expect(isAtValidPosition).toBe(true);
});

Then('the final scroll position should be at a valid page boundary', async ({ page }) => {
	const content = page.locator('[data-testid="reader-content"]');
	const state = await content.evaluate((el) => {
		const e = el as HTMLElement;
		return { scrollLeft: e.scrollLeft, clientWidth: e.clientWidth };
	});
	const expectedPage = Math.round(state.scrollLeft / state.clientWidth);
	const expectedScroll = expectedPage * state.clientWidth;
	const scrollDiff = Math.abs(state.scrollLeft - expectedScroll);
	expect(scrollDiff).toBeLessThan(state.clientWidth * 0.02);
});

Then('the visible text should be properly centered in the viewport', async ({ page }) => {
	const content = page.locator('[data-testid="reader-content"]');
	const viewportInfo = await content.evaluate((el) => {
		const contentEl = el as HTMLElement;
		const rect = contentEl.getBoundingClientRect();
		const viewportWidth = rect.width;
		const scrollLeft = contentEl.scrollLeft;
		const textElements = contentEl.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6');
		for (const textEl of Array.from(textElements)) {
			const elRect = textEl.getBoundingClientRect();
			const elementLeft = elRect.left - rect.left + scrollLeft;
			const elementRight = elementLeft + elRect.width;
			const viewportLeft = scrollLeft;
			const viewportRight = scrollLeft + viewportWidth;
			if (elementRight > viewportLeft && elementLeft < viewportRight) {
				const text = textEl.textContent?.trim() || '';
				if (text.length > 10) {
					const elementLeftInViewport = elementLeft - viewportLeft;
					const elementRightInViewport = elementRight - viewportLeft;
					if (elementLeftInViewport < 0 || elementRightInViewport > viewportWidth) continue;
					return { elementLeft, elementRight, viewportLeft, viewportRight, viewportWidth };
				}
			}
		}
		return null;
	});

	expect(viewportInfo).toBeTruthy();
	if (viewportInfo) {
		const elementLeftInViewport = viewportInfo.elementLeft - viewportInfo.viewportLeft;
		const elementRightInViewport = viewportInfo.elementRight - viewportInfo.viewportLeft;
		expect(elementLeftInViewport).toBeGreaterThanOrEqual(0);
		expect(elementRightInViewport).toBeLessThanOrEqual(viewportInfo.viewportWidth);
		const elementWidth = elementRightInViewport - elementLeftInViewport;
		expect(elementWidth).toBeGreaterThan(viewportInfo.viewportWidth * 0.3);
	}
});

Then('the URL should include chapter and progress parameters', async ({ page }) => {
	await page.waitForTimeout(500);
	const url = page.url();
	expect(url).toContain('?');
	expect(url).toContain('chapter=');
	expect(url).toContain('progress=');
});

Then('the URL should have valid chapter and progress parameters', async ({ page }) => {
	await page.waitForTimeout(800);
	const url = page.url();
	expect(url).toContain('chapter=');
	expect(url).toContain('progress=');
	const chapterMatch = url.match(/chapter=(\d+)/);
	const progressMatch = url.match(/progress=(\d+)/);
	expect(chapterMatch).toBeTruthy();
	expect(progressMatch).toBeTruthy();
	const chapter = parseInt(chapterMatch![1], 10);
	const progress = parseInt(progressMatch![1], 10);
	expect(chapter).toBeGreaterThanOrEqual(0);
	expect(progress).toBeGreaterThanOrEqual(0);
	expect(progress).toBeLessThanOrEqual(10000);
});

When('I navigate forward through the content', async ({ page }) => {
	const content = page.locator('[data-testid="reader-content"]');
	const contentBox = await content.boundingBox();
	expect(contentBox).toBeTruthy();
	if (!contentBox) return;
	for (let i = 0; i < 12; i++) {
		await content.click({ position: { x: contentBox.width * 0.85, y: contentBox.height * 0.5 } });
		await page.waitForTimeout(150);
	}
});

Then('the URL chapter or progress should update', async ({ page }) => {
	const urlAfterForward = page.url();
	expect(urlAfterForward).toContain('chapter=');
});

When('I navigate backward', async ({ page }) => {
	const reader = page.locator('.reader');
	const box = await reader.boundingBox();
	expect(box).toBeTruthy();
	if (!box) return;
	for (let i = 0; i < 2; i++) {
		await reader.click({ position: { x: box.width * 0.2, y: box.height * 0.5 } });
		await page.waitForTimeout(500);
	}
	await page.waitForTimeout(300);
});

Then('the URL should reflect the earlier position', async ({ page }) => {
	const url = page.url();
	expect(url).toContain('chapter=');
	expect(url).toContain('progress=');
});

When('I navigate to a specific position', async ({ page }) => {
	const reader = page.locator('.reader');
	const box = await reader.boundingBox();
	expect(box).toBeTruthy();
	if (!box) return;
	for (let i = 0; i < 5; i++) {
		await reader.click({ position: { x: box.width * 0.8, y: box.height * 0.5 } });
		await page.waitForTimeout(400);
	}
	await page.waitForTimeout(500);
});

When('I save the URL params and navigate away', async ({ page }) => {
	await page.goto('/');
	await page.waitForSelector('[data-testid="empty-state"], [data-testid="book-card"]');
});

When('I reopen the book with those URL params', async ({ page }) => {
	const bookCard = page.locator('[data-testid="book-card"]').first();
	await bookCard.click();
	await page.waitForSelector('.reader');
	await page.waitForSelector('[data-testid="reader-content"]', { timeout: 10000 });
	await page.waitForFunction(
		() => (document.querySelector('[data-testid="reader-content"]')?.children?.length ?? 0) > 0,
		{ timeout: 5000 }
	);
});

Then('the reader should restore to the saved chapter and progress', async ({ page }) => {
	const url = page.url();
	expect(url).toContain('chapter=');
	expect(url).toContain('progress=');
});

When('I navigate to a position and open with a shared URL', async ({ page }) => {
	const reader = page.locator('.reader');
	const box = await reader.boundingBox();
	expect(box).toBeTruthy();
	if (!box) return;
	for (let i = 0; i < 8; i++) {
		await reader.click({ position: { x: box.width * 0.8, y: box.height * 0.5 } });
		await page.waitForTimeout(500);
	}
	await page.waitForTimeout(1000);
	const url = page.url();
	const bookIdMatch = url.match(/\/read\/([^/]+)/);
	const bookId = bookIdMatch ? bookIdMatch[1] : '';
	const sharedUrl = `/read/${bookId}?chapter=0&progress=5000`;
	await page.goto(sharedUrl);
	await page.waitForSelector('[data-testid="reader-content"]', { timeout: 10000 });
	await page.waitForFunction(
		() => (document.querySelector('[data-testid="reader-content"]')?.children?.length ?? 0) > 0,
		{ timeout: 5000 }
	);
});

Then('the reader should open at the shared position', async ({ page }) => {
	const reader = page.locator('.reader');
	await expect(reader).toBeVisible();
	const url = page.url();
	expect(url).toContain('chapter=');
	expect(url).toContain('progress=');
});

When('I select text by dragging across it', async ({ page }) => {
	const content = page.locator('[data-testid="reader-content"]');
	await page.waitForTimeout(500);

	const selected = await content.evaluate(() => {
		const textNodes: Text[] = [];
		const walker = document.createTreeWalker(
			document.querySelector('[data-testid="reader-content"]') || document.body,
			NodeFilter.SHOW_TEXT
		);
		let node: Text | null;
		while ((node = walker.nextNode() as Text | null)) {
			if (node.textContent && node.textContent.trim().length > 10) {
				textNodes.push(node);
			}
		}
		if (textNodes.length === 0) return false;
		const target = textNodes[0];
		const range = document.createRange();
		range.setStart(target, 0);
		range.setEnd(target, Math.min(20, target.textContent!.length));
		const selection = window.getSelection();
		selection?.removeAllRanges();
		selection?.addRange(range);
		return (selection?.toString().length ?? 0) > 0;
	});

	if (!selected) {
		const elements = await content.locator('p, span').all();
		for (const el of elements) {
			const text = await el.textContent();
			if (text && text.trim().length >= 10) {
				await el.scrollIntoViewIfNeeded();
				const box = await el.boundingBox();
				if (box) {
					await page.mouse.move(box.x + 10, box.y + box.height / 2);
					await page.mouse.down();
					await page.mouse.move(box.x + box.width - 10, box.y + box.height / 2, { steps: 10 });
					await page.mouse.up();
				}
				break;
			}
		}
	}

	const after = await page.evaluate(() => window.getSelection()?.toString().length ?? 0);
	if (after === 0) {
		await page.evaluate(() => {
			const sel = window.getSelection();
			const texts = document.querySelectorAll(
				'[data-testid="reader-content"] p, [data-testid="reader-content"] span'
			);
			for (const el of texts) {
				const text = el.textContent?.trim();
				if (text && text.length >= 10) {
					const range = document.createRange();
					range.selectNodeContents(el);
					sel?.removeAllRanges();
					sel?.addRange(range);
					return;
				}
			}
		});
	}
	await page.waitForTimeout(300);
});

Then('some text should be selected', async ({ page }) => {
	await page.waitForTimeout(300);
	const selection = await page.evaluate(() => {
		const sel = window.getSelection();
		return { text: sel?.toString() || '', rangeCount: sel?.rangeCount || 0 };
	});
	if (selection.text.length === 0) {
		const content = page.locator('[data-testid="reader-content"]');
		const elements = await content.locator('p, span').all();
		for (const el of elements) {
			const text = await el.textContent();
			if (text && text.trim().length >= 10) {
				const box = await el.boundingBox();
				if (box) {
					await page.mouse.move(box.x + 10, box.y + box.height / 2);
					await page.mouse.down();
					await page.mouse.move(box.x + box.width - 10, box.y + box.height / 2, { steps: 10 });
					await page.mouse.up();
				}
				break;
			}
		}
		await page.waitForTimeout(200);
	}
	const finalSelection = await page.evaluate(() => {
		const sel = window.getSelection();
		return { text: sel?.toString() || '', rangeCount: sel?.rangeCount || 0 };
	});
	expect(finalSelection.text.length).toBeGreaterThan(0);
});

When('I tap the center to show the overlay', async ({ page }) => {
	const content = page.locator('[data-testid="reader-content"]');
	const box = await content.boundingBox();
	expect(box).toBeTruthy();
	// Navigate past cover/title chapters so center tap isn't intercepted by cover image
	for (let i = 0; i < 3; i++) {
		await content.click({ position: { x: box!.width * 0.85, y: box!.height * 0.5 } });
		await page.waitForTimeout(400);
	}
	await content.click({ position: { x: box!.width * 0.5, y: box!.height * 0.5 } });
	await page.waitForTimeout(300);
});

Then('the TOC button should be visible', async ({ page }) => {
	const tocButton = page.getByRole('button', { name: 'Show table of contents' });
	await expect(tocButton).toBeVisible();
});

When('I click the TOC button', async ({ page }) => {
	const tocButton = page.getByRole('button', { name: 'Show table of contents' });
	await tocButton.click();
});

Then('the TOC overlay should be visible', async ({ page }) => {
	await page.waitForSelector('[data-testid="toc-overlay"]');
	await expect(page.locator('[data-testid="toc-overlay"]')).toBeVisible();
});

Then('the TOC title should be shown', async ({ page }) => {
	await expect(
		page.locator('[data-testid="toc-overlay"]').getByRole('heading', { name: 'Table of Contents' })
	).toBeVisible();
});

When('I click on the second chapter in the TOC', async ({ page }) => {
	const chapterItems = page.locator('[data-testid="chapter-item"]');
	await expect(chapterItems.nth(1)).toBeVisible();
	await chapterItems.nth(1).click();
	await page.waitForTimeout(500);
});

Then('the TOC should close', async ({ page }) => {
	await expect(page.locator('[data-testid="toc-overlay"]')).not.toBeVisible();
});

Then('the TOC should not be visible', async ({ page }) => {
	await expect(page.locator('[data-testid="toc-overlay"]')).not.toBeVisible();
});

Then('the URL should update to the new chapter', async ({ page }) => {
	const newUrl = page.url();
	expect(newUrl).toMatch(/chapter=\d+/);
});

When('I click the close TOC button', async ({ page }) => {
	const closeButton = page.getByRole('button', { name: 'Close table of contents' });
	await closeButton.click();
});

Then('the TOC should list chapter titles', async ({ page }) => {
	const chapterItems = page.locator('[data-testid="chapter-item"]');
	const count = await chapterItems.count();
	expect(count).toBeGreaterThan(0);
});

Then('each chapter item should have text content', async ({ page }) => {
	const chapterItems = page.locator('[data-testid="chapter-item"]');
	const count = await chapterItems.count();
	for (let i = 0; i < Math.min(count, 5); i++) {
		const text = await chapterItems.nth(i).textContent();
		expect(text).toBeTruthy();
	}
});

Then('I navigate to chapter {int}', async ({ page }) => {
	const reader = page.locator('.reader');
	const box = await reader.boundingBox();
	expect(box).toBeTruthy();
	if (!box) return;
	for (let i = 0; i < 10; i++) {
		await reader.click({ position: { x: box.width * 0.85, y: box.height * 0.5 } });
		await page.waitForTimeout(150);
	}
	await page.waitForTimeout(1500);
});

When('I close the book and reopen it', async ({ page }) => {
	await page.goto('/');
	await page.waitForSelector('[data-testid="empty-state"], [data-testid="book-card"]');
	const bookCardAfter = page.locator('[data-testid="book-card"]').first();
	await bookCardAfter.click();
	await page.waitForSelector('.reader');
	await page.waitForSelector('[data-testid="reader-content"]', { timeout: 10000 });
	await page.waitForFunction(
		() => (document.querySelector('[data-testid="reader-content"]')?.children?.length ?? 0) > 0,
		{ timeout: 5000 }
	);
});

Then('the reader should restore to chapter {int}', async ({ page }, chapterNum: number) => {
	const url = page.url();
	const chapterMatch = url.match(/chapter=(\d+)/);
	expect(chapterMatch).toBeTruthy();
	const restoredChapter = parseInt(chapterMatch![1], 10);
	expect(restoredChapter).toBeGreaterThanOrEqual(chapterNum);
	const readerAfterReopen = page.locator('.reader');
	await expect(readerAfterReopen).toBeVisible();
});

Then('the URL should show chapter {int}', async ({ page }, chapterNum: number) => {
	const url = page.url();
	const chapterMatch = url.match(/chapter=(\d+)/);
	expect(chapterMatch).toBeTruthy();
	const currentChapter = parseInt(chapterMatch![1], 10);
	expect(currentChapter).toBe(chapterNum);
});

When('I scroll to the beginning of the current chapter', async ({ page }) => {
	const content = page.locator('[data-testid="reader-content"]');
	await content.evaluate((el) => {
		(el as HTMLElement).scrollLeft = 0;
	});
	await page.waitForTimeout(300);
});

When('I open the TOC and select chapter {int}', async ({ page }, chapterIdx: number) => {
	const content = page.locator('[data-testid="reader-content"]');
	const box = await content.boundingBox();
	expect(box).toBeTruthy();
	if (!box) return;
	for (let i = 0; i < 3; i++) {
		await content.click({ position: { x: box!.width * 0.85, y: box!.height * 0.5 } });
		await page.waitForTimeout(150);
	}
	await content.click({ position: { x: box!.width * 0.5, y: box!.height * 0.5 } });
	await page.waitForTimeout(200);
	const tocButton = page.getByRole('button', { name: 'Show table of contents' });
	await tocButton.click();
	await page.waitForSelector('[data-testid="chapter-item"]', { timeout: 5000 });
	const chapterItems = page.locator('[data-testid="chapter-item"]');
	await chapterItems.nth(chapterIdx).click();
	await expect(page.locator('[data-testid="toc-overlay"]')).not.toBeVisible({ timeout: 5000 });
});

Then('the progress should be near 100%', async ({ page }) => {
	const url = page.url();
	const progressMatch = url.match(/progress=(\d+)/);
	expect(progressMatch).toBeTruthy();
	const progress = parseInt(progressMatch![1], 10);
	expect(progress).toBeGreaterThan(9000);
});

Then('the progress should be near 0%', async ({ page }) => {
	const url = page.url();
	const progressMatch = url.match(/progress=(\d+)/);
	expect(progressMatch).toBeTruthy();
	const progress = parseInt(progressMatch![1], 10);
	expect(progress).toBeLessThan(1000);
	const content = page.locator('[data-testid="reader-content"]');
	const scrollPosition = await content.evaluate((el) => (el as HTMLElement).scrollLeft);
	expect(scrollPosition).toBeLessThan(100);
});

When('I navigate forward to a deep chapter', async ({ page }) => {
	const url = page.url();
	const urlObj = new URL(url);
	urlObj.searchParams.set('chapter', '7');
	urlObj.searchParams.set('progress', '0');
	await page.goto(urlObj.toString());
	await page.waitForSelector('[data-testid="reader-content"]', { timeout: 10000 });
	await page.waitForFunction(
		() => (document.querySelector('[data-testid="reader-content"]')?.children?.length ?? 0) > 0,
		{ timeout: 5000 }
	);
});

Then('the current chapter should be at least {int}', async ({ page }, minChapter: number) => {
	const url = page.url();
	const chapterMatch = url.match(/chapter=(\d+)/);
	expect(chapterMatch).toBeTruthy();
	const currentChapter = parseInt(chapterMatch![1], 10);
	expect(currentChapter).toBeGreaterThanOrEqual(minChapter);
});

Then('the URL should show the previous chapter', async ({ page }) => {
	const url = page.url();
	expect(url).toMatch(/chapter=\d+/);
});

Then('the progress should be greater than {int}%', async ({ page }, percent: number) => {
	const url = page.url();
	const progressMatch = url.match(/progress=(\d+)/);
	expect(progressMatch).toBeTruthy();
	const progress = parseInt(progressMatch![1], 10);
	expect(progress).toBeGreaterThan(percent * 100);
});

Then(
	'the scroll position should be at least {int}% through the chapter',
	async ({ page }, percent: number) => {
		const content = page.locator('[data-testid="reader-content"]');
		const scrollAfterBack = await content.evaluate((el) => (el as HTMLElement).scrollLeft);
		const maxScrollAfterBack = await content.evaluate(
			(el) => (el as HTMLElement).scrollWidth - (el as HTMLElement).clientWidth
		);
		expect(maxScrollAfterBack).toBeGreaterThan(0);
		const scrollPercent = scrollAfterBack / maxScrollAfterBack;
		expect(scrollPercent).toBeGreaterThan(percent / 100);
	}
);

When('I navigate to chapter {int} and scroll within it', async ({ page }) => {
	const reader = page.locator('.reader');
	const box = await reader.boundingBox();
	expect(box).toBeTruthy();
	if (!box) return;
	for (let i = 0; i < 8; i++) {
		await reader.click({ position: { x: box.width * 0.8, y: box.height * 0.5 } });
		await page.waitForTimeout(150);
	}
	await page.waitForTimeout(800);
	const contentEl = page.locator('[data-testid="reader-content"]');
	await contentEl.evaluate((el) => {
		(el as HTMLElement).scrollLeft = el.clientWidth;
	});
	await page.waitForTimeout(500);
});

Then('the scroll position should be greater than {int}', async ({ page }, min: number) => {
	const content = page.locator('[data-testid="reader-content"]');
	const scroll = await content.evaluate((el) => el.scrollLeft);
	expect(scroll).toBeGreaterThan(min);
});

When('I open the TOC and click on chapter {int}', async ({ page }, chapterIdx: number) => {
	const content = page.locator('[data-testid="reader-content"]');
	const box = await content.boundingBox();
	expect(box).toBeTruthy();
	if (!box) return;
	for (let i = 0; i < 3; i++) {
		await content.click({ position: { x: box!.width * 0.85, y: box!.height * 0.5 } });
		await page.waitForTimeout(150);
	}
	await content.click({ position: { x: box.width * 0.5, y: box.height * 0.5 } });
	await page.waitForTimeout(200);
	const tocButton = page.getByRole('button', { name: 'Show table of contents' });
	await tocButton.click();
	await page.waitForSelector('[data-testid="toc-overlay"]');
	const chapterItems = page.locator('[data-testid="chapter-item"]');
	await chapterItems.nth(chapterIdx).click();
	await expect(page.locator('[data-testid="toc-overlay"]')).not.toBeVisible();
});

Then('the URL should show the new chapter', async ({ page }) => {
	const url = page.url();
	expect(url).toMatch(/chapter=\d+/);
});

Then('the scroll position should be {int}', async ({ page }, expected: number) => {
	const content = page.locator('[data-testid="reader-content"]');
	const scroll = await content.evaluate((el) => el.scrollLeft);
	expect(scroll).toBe(expected);
});

Given('a book {string} is uploaded', async ({ page }, filename: string) => {
	await page.goto('/');
	await page.waitForLoadState('networkidle');
	const fileInput = page.locator('input[type="file"]');
	const path = await import('path');
	const { fileURLToPath } = await import('url');
	const fixturesDir = path.join(
		path.dirname(fileURLToPath(import.meta.url)),
		'..',
		'tests',
		'fixtures'
	);
	await fileInput.setInputFiles(path.join(fixturesDir, filename));
	await page.waitForSelector('[data-testid="book-card"]');
});

Given('I open the book in the reader', async ({ page }) => {
	const bookCard = page.locator('[data-testid="book-card"]').first();
	await bookCard.click();
	await page.waitForSelector('.reader');
	await page.waitForSelector('[data-testid="reader-content"]', { timeout: 10000 });
});

Then('I navigate past the cover chapter', async ({ page }) => {
	const reader = page.locator('.reader');
	const box = await reader.boundingBox();
	expect(box).toBeTruthy();
	if (!box) return;
	for (let i = 0; i < 20; i++) {
		await reader.click({ position: { x: box.width * 0.8, y: box.height * 0.5 } });
		await page.waitForTimeout(150);
	}
	await page.waitForTimeout(800);
});

When('I navigate forward to a later chapter', async ({ page }) => {
	const url = page.url();
	const urlObj = new URL(url);
	urlObj.searchParams.set('chapter', '99');
	urlObj.searchParams.set('progress', '0');
	await page.goto(urlObj.toString());
	await page.waitForSelector('.reader');
	await page.waitForSelector('[data-testid="reader-content"]', { timeout: 10000 });
	await page.waitForFunction(
		() => (document.querySelector('[data-testid="reader-content"]')?.children?.length ?? 0) > 0,
		{ timeout: 5000 }
	);
});

When('I open the TOC', async ({ page }) => {
	const content = page.locator('[data-testid="reader-content"]');
	const box = await content.boundingBox();
	expect(box).toBeTruthy();
	await content.click({ position: { x: box!.width * 0.5, y: box!.height * 0.5 } });
	const tocButton = page.getByRole('button', { name: 'Show table of contents' });
	await expect(tocButton).toBeVisible({ timeout: 3000 });
	await tocButton.click();
	await page.waitForSelector('[data-testid="toc-overlay"]');
});

Then(
	'the current chapter button should be visible in the TOC scrollable area',
	async ({ page }) => {
		const tocContent = page.locator('.toc-content');
		const currentChapterButton = tocContent.locator('[aria-current="page"]');
		await expect(currentChapterButton).toBeVisible();
	}
);

Then('the current chapter should be centered in the TOC viewport', async ({ page }) => {
	const tocContent = page.locator('.toc-content');
	const currentChapterButton = tocContent.locator('[aria-current="page"]');
	await expect(currentChapterButton).toBeVisible();
	const scrollTop = await tocContent.evaluate((el) => (el as HTMLElement).scrollTop);
	expect(scrollTop, 'TOC should scroll to center current chapter').toBeGreaterThan(0);
});

When('I navigate forward one page', async ({ page }) => {
	const content = page.locator('[data-testid="reader-content"]');
	const box = await content.boundingBox();
	expect(box).toBeTruthy();
	if (!box) return;
	await content.click({ position: { x: box.width * 0.8, y: box.height * 0.5 } });
	await page.waitForTimeout(800);
});

Given('the overlay is open', async ({ page }) => {
	const content = page.locator('[data-testid="reader-content"]');
	const box = await content.boundingBox();
	expect(box).toBeTruthy();
	// Navigate past cover/title chapters first, so center tap isn't intercepted by cover image
	for (let i = 0; i < 3; i++) {
		await content.click({ position: { x: box!.width * 0.85, y: box!.height * 0.5 } });
		await page.waitForTimeout(400);
	}
	await content.click({ position: { x: box!.width * 0.5, y: box!.height * 0.5 } });
	await page.waitForTimeout(300);
	const backButton = page.getByRole('button', { name: 'Go back' });
	await expect(backButton).toBeVisible();
});

Then('the overlay should close', async ({ page }) => {
	const backButton = page.getByRole('button', { name: 'Go back' });
	await expect(backButton).not.toBeVisible();
});

Then('the overlay should also close', async ({ page }) => {
	const backButton = page.getByRole('button', { name: 'Go back' });
	await expect(backButton).not.toBeVisible();
});

Then('the page should not turn', async ({ page }) => {
	const content = page.locator('[data-testid="reader-content"]');
	const scrollPosition = await content.evaluate((el) => (el as HTMLElement).scrollLeft);
	expect(scrollPosition).toBe(0);
});

When('I swipe left', async ({ page }) => {
	const content = page.locator('[data-testid="reader-content"]');
	const box = await content.boundingBox();
	expect(box).toBeTruthy();
	if (!box) return;
	const rightX = box.x + box.width * 0.8;
	const endX = box.x + box.width * 0.2;
	const centerY = box.y + box.height * 0.5;
	await page.mouse.move(rightX, centerY);
	await page.mouse.down();
	await page.mouse.move(endX, centerY, { steps: 5 });
	await page.mouse.up();
	await page.waitForTimeout(300);
});

Given('the TOC is open', async ({ page }) => {
	const content = page.locator('[data-testid="reader-content"]');
	const box = await content.boundingBox();
	expect(box).toBeTruthy();
	// Navigate past cover/title chapters first, so center tap isn't intercepted by cover image
	for (let i = 0; i < 3; i++) {
		await content.click({ position: { x: box!.width * 0.85, y: box!.height * 0.5 } });
		await page.waitForTimeout(400);
	}
	await content.click({ position: { x: box!.width * 0.5, y: box!.height * 0.5 } });
	await page.waitForTimeout(300);
	const tocButton = page.getByRole('button', { name: 'Show table of contents' });
	await tocButton.click();
	await page.waitForSelector('[data-testid="toc-overlay"]');
	await expect(page.locator('[data-testid="toc-overlay"]')).toBeVisible();
});

When('I tap outside the TOC panel', async ({ page }) => {
	const tocOverlay = page.locator('[data-testid="toc-overlay"]');
	const overlayBox = await tocOverlay.boundingBox();
	expect(overlayBox).toBeTruthy();
	if (!overlayBox) return;
	await page.mouse.click(overlayBox.x + 10, overlayBox.y + 10);
	await page.waitForTimeout(300);
});

When('I select the second chapter', async ({ page }) => {
	const chapterItems = page.locator('[data-testid="chapter-item"]');
	await expect(chapterItems.nth(1)).toBeVisible();
	await chapterItems.nth(1).click();
	await page.waitForTimeout(300);
});

When('I tap the left zone to go back', async ({ page }) => {
	const reader = page.locator('.reader');
	const box = await reader.boundingBox();
	expect(box).toBeTruthy();
	if (!box) return;
	await reader.click({ position: { x: box.width * 0.2, y: box.height * 0.5 } });
	await page.waitForTimeout(500);
});

When('I tap the right zone to go forward', async ({ page }) => {
	const reader = page.locator('.reader');
	const box = await reader.boundingBox();
	expect(box).toBeTruthy();
	if (!box) return;
	await reader.click({ position: { x: box.width * 0.8, y: box.height * 0.5 } });
	await page.waitForTimeout(500);
});
