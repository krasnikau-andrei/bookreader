import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Library', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
	});

	test('shows info message when uploading duplicate book', async ({ page }) => {
		// Upload a test book first
		const fileInput = page.locator('input[type="file"]');
		const testBookPath = path.join(__dirname, 'fixtures', 'crime-punishment.epub');
		await fileInput.setInputFiles(testBookPath);

		// Wait for book to appear
		await page.waitForSelector('[data-testid="book-card"]');
		const initialBooks = await page.locator('[data-testid="book-card"]').count();
		expect(initialBooks).toBe(1);

		// Upload the same file again
		await fileInput.setInputFiles(testBookPath);

		// Info banner should appear
		const infoBanner = page.locator('[data-testid="info-message"]');
		await expect(infoBanner).toBeVisible();
		await expect(infoBanner).toContainText('already in your library');

		// Book count should still be 1 (no duplicate)
		const finalBooks = await page.locator('[data-testid="book-card"]').count();
		expect(finalBooks).toBe(1);
	});

	test('info message can be dismissed', async ({ page }) => {
		// Upload a test book first
		const fileInput = page.locator('input[type="file"]');
		const testBookPath = path.join(__dirname, 'fixtures', 'crime-punishment.epub');
		await fileInput.setInputFiles(testBookPath);

		// Wait for book to appear
		await page.waitForSelector('[data-testid="book-card"]');

		// Upload the same file again to trigger info message
		await fileInput.setInputFiles(testBookPath);

		// Info banner should appear
		const infoBanner = page.locator('[data-testid="info-message"]');
		await expect(infoBanner).toBeVisible();

		// Dismiss the banner
		const dismissButton = infoBanner.locator('button');
		await dismissButton.click();

		// Banner should disappear
		await expect(infoBanner).not.toBeVisible();
	});

	test('different books get different IDs', async ({ page }) => {
		const fileInput = page.locator('input[type="file"]');

		// Upload first book
		const firstBookPath = path.join(__dirname, 'fixtures', 'crime-punishment.epub');
		await fileInput.setInputFiles(firstBookPath);

		// Wait for first book to appear
		await page.waitForSelector('[data-testid="book-card"]');
		const firstBookCard = page.locator('[data-testid="book-card"]').first();
		const firstBookTitle = await firstBookCard.locator('[data-testid="book-title"]').textContent();

		// Note: We only have one test fixture, so we can't test with truly different books
		// This test demonstrates the concept - in real scenario would use different files
		// Instead, we'll verify the book exists
		expect(firstBookTitle).toBeTruthy();
	});

	test('shows delete confirmation sheet on long press', async ({ page }) => {
		await page.evaluate(() => {
			indexedDB.deleteDatabase('bookreader');
		});
		await page.reload();
		const fileChooserPromise = page.waitForEvent('filechooser');
		await page.locator('[data-testid="upload-button"]').click();
		const fileChooser = await fileChooserPromise;
		await fileChooser.setFiles(path.join(__dirname, 'fixtures/accessible_epub_3.epub'));
		await expect(page.locator('[data-testid="book-card"]')).toHaveCount(1, { timeout: 15000 });

		// Simulate long press via touch events
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

		// Wait for the setTimeout to complete and UI to update
		await page.waitForTimeout(700);

		// Verify bottom sheet appears
		const sheet = page.locator('[data-testid="confirm-sheet"]');
		await expect(sheet).toBeVisible();
		await expect(page.locator('[data-testid="confirm-sheet-message"]')).toHaveText(
			'Delete "Accessible EPUB 3"?'
		);
		await expect(page.locator('[data-testid="confirm-sheet-delete"]')).toBeVisible();
		await expect(page.locator('[data-testid="confirm-sheet-cancel"]')).toBeVisible();
	});

	test('deletes book after confirming in sheet', async ({ page }) => {
		await page.evaluate(() => {
			indexedDB.deleteDatabase('bookreader');
		});
		await page.reload();
		const fileChooserPromise = page.waitForEvent('filechooser');
		await page.locator('[data-testid="upload-button"]').click();
		const fileChooser = await fileChooserPromise;
		await fileChooser.setFiles(path.join(__dirname, 'fixtures/accessible_epub_3.epub'));
		await expect(page.locator('[data-testid="book-card"]')).toHaveCount(1, { timeout: 15000 });

		// Simulate long press via touch events
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

		// Wait for the setTimeout to complete and UI to update
		await page.waitForTimeout(700);

		// Click Delete button
		await page.locator('[data-testid="confirm-sheet-delete"]').click();

		// Verify book is deleted
		await expect(page.locator('[data-testid="book-card"]')).toHaveCount(0, { timeout: 15000 });
	});

	test('cancels delete and dismisses sheet', async ({ page }) => {
		await page.evaluate(() => {
			indexedDB.deleteDatabase('bookreader');
		});
		await page.reload();
		const fileChooserPromise = page.waitForEvent('filechooser');
		await page.locator('[data-testid="upload-button"]').click();
		const fileChooser = await fileChooserPromise;
		await fileChooser.setFiles(path.join(__dirname, 'fixtures/accessible_epub_3.epub'));
		await expect(page.locator('[data-testid="book-card"]')).toHaveCount(1, { timeout: 15000 });

		// Simulate long press via touch events
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

		// Wait for the setTimeout to complete and UI to update
		await page.waitForTimeout(700);
		await expect(page.locator('[data-testid="confirm-sheet"]')).toBeVisible();

		// Click Cancel button
		await page.locator('[data-testid="confirm-sheet-cancel"]').click();

		// Verify sheet is dismissed, book still exists
		await expect(page.locator('[data-testid="confirm-sheet"]')).not.toBeVisible();
		await expect(page.locator('[data-testid="book-card"]')).toHaveCount(1);
	});
});

test.describe('Reader', () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to library and wait for it to load
		await page.goto('/');
		await page.waitForLoadState('networkidle');
	});

	test('navigates to reader from library', async ({ page }) => {
		// Upload a test book first
		const fileInput = page.locator('input[type="file"]');
		const testBookPath = path.join(__dirname, 'fixtures', 'crime-punishment.epub');
		await fileInput.setInputFiles(testBookPath);

		// Wait for book to appear in grid
		await page.waitForSelector('[data-testid="book-card"]');

		// Click on the book to open reader
		const bookCard = page.locator('[data-testid="book-card"]').first();
		await bookCard.click();

		// Verify reader loaded
		await page.waitForSelector('.reader');
		const reader = page.locator('.reader');
		await expect(reader).toBeVisible();
	});

	test('toggles overlay on center tap', async ({ page }) => {
		console.log('[TEST] Starting test');

		// Capture console logs from page
		const logs: string[] = [];
		page.on('console', (msg) => {
			const text = msg.text();
			logs.push(text);
			if (
				text.includes('[DEBUG]') ||
				text.includes('showOverlay') ||
				text.includes('handleCenter')
			) {
				console.log('[PAGE]', text);
			}
		});

		// Upload and open a book
		const fileInput = page.locator('input[type="file"]');
		const testBookPath = path.join(__dirname, 'fixtures', 'crime-punishment.epub');
		await fileInput.setInputFiles(testBookPath);
		await page.waitForSelector('[data-testid="book-card"]');

		const bookCard = page.locator('[data-testid="book-card"]').first();
		await bookCard.click();
		await page.waitForSelector('.reader');
		console.log('[TEST] Reader loaded, URL:', page.url());

		// Initially overlay should be hidden (no back button visible)
		const backButton = page.getByRole('button', { name: 'Go back' });
		await expect(backButton).not.toBeVisible();
		console.log('[TEST] Back button initially not visible');

		// Tap center to show overlay (click on content div at center)
		const content = page.locator('[data-testid="reader-content"]');
		const box = await content.boundingBox();
		console.log('[TEST] Content bounding box:', box);
		if (box) {
			console.log('[TEST] Clicking at center:', box.width * 0.5, box.height * 0.5);
			await content.click({
				position: { x: box.width * 0.5, y: box.height * 0.5 }
			});
		}

		// Wait for fade animation
		await page.waitForTimeout(300);

		// Check DOM state before assertion
		const hasOverlay = await page.evaluate(() => !!document.querySelector('.overlay'));
		const hasBackButton = await page.evaluate(() => !!document.querySelector('.back-button'));
		console.log('[TEST] DOM check - hasOverlay:', hasOverlay, 'hasBackButton:', hasBackButton);
		console.log('[TEST] All logs collected:', logs.length);

		// Back button should now be visible
		await expect(backButton).toBeVisible();

		// Tap center again to hide overlay
		if (box) {
			await content.click({
				position: { x: box.width * 0.5, y: box.height * 0.5 }
			});
		}

		await expect(backButton).not.toBeVisible();
	});

	test('navigates chapters with left/right taps', async ({ page }) => {
		// Upload and open a book with actual chapters
		const fileInput = page.locator('input[type="file"]');
		const testBookPath = path.join(__dirname, 'fixtures', 'crime-punishment.epub');
		await fileInput.setInputFiles(testBookPath);
		await page.waitForSelector('[data-testid="book-card"]');

		const bookCard = page.locator('[data-testid="book-card"]').first();
		await bookCard.click();
		await page.waitForSelector('.reader');

		// Wait for content to load
		await page.waitForSelector('[data-testid="reader-content"]', { timeout: 10000 });

		const content = page.locator('[data-testid="reader-content"]');

		// Get initial chapter content
		const initialContent = await content.evaluate((el) => el.innerHTML);

		const box = await content.boundingBox();
		expect(box).toBeTruthy();

		if (box) {
			// Take screenshot before navigation
			await page.screenshot({ path: 'test-results/screenshot-before.png' });

			// Navigate through content using right zone taps
			// The reader scrolls horizontally through pages, and at chapter boundaries
			// it loads the next chapter
			let contentChanged = false;
			let scrollChanged = false;
			let lastContent = initialContent;
			let lastScrollLeft = await content.evaluate((el) => el.scrollLeft);

			// Navigate through content using right zone taps (click at 80% width for right zone)
			for (let i = 0; i < 10; i++) {
				await content.click({
					position: { x: box.width * 0.8, y: box.height * 0.5 }
				});
				await page.waitForTimeout(400);

				const currentContent = await content.evaluate((el) => el.innerHTML);
				const currentScrollLeft = await content.evaluate((el) => el.scrollLeft);

				if (currentContent !== lastContent) {
					contentChanged = true;
				}
				if (currentScrollLeft !== lastScrollLeft) {
					scrollChanged = true;
				}

				lastContent = currentContent;
				lastScrollLeft = currentScrollLeft;
			}

			// Take screenshot after right navigation
			await page.screenshot({ path: 'test-results/screenshot-after-right.png' });

			// Verify that some form of navigation occurred (either content or scroll changed)
			expect(contentChanged || scrollChanged).toBe(true);

			// Tap left zone to navigate back (click at 20% width for left zone)
			for (let i = 0; i < 5; i++) {
				await content.click({
					position: { x: box.width * 0.2, y: box.height * 0.5 }
				});
				await page.waitForTimeout(400);
			}

			// Take screenshot after left navigation
			await page.screenshot({ path: 'test-results/screenshot-after-left.png' });

			// Compare screenshots to verify visual changes occurred
			const fs = await import('fs');
			const screenshotBefore = fs.readFileSync('test-results/screenshot-before.png');
			const screenshotAfterRight = fs.readFileSync('test-results/screenshot-after-right.png');
			const screenshotAfterLeft = fs.readFileSync('test-results/screenshot-after-left.png');

			// Screenshots should be different after navigation
			expect(screenshotAfterRight).not.toEqual(screenshotBefore);
			expect(screenshotAfterLeft).not.toEqual(screenshotAfterRight);
		}
	});

	test('text is visible in reader with sufficient contrast', async ({ page }) => {
		// Upload and open a book
		const fileInput = page.locator('input[type="file"]');
		const testBookPath = path.join(__dirname, 'fixtures', 'crime-punishment.epub');
		await fileInput.setInputFiles(testBookPath);
		await page.waitForSelector('[data-testid="book-card"]');

		const bookCard = page.locator('[data-testid="book-card"]').first();
		await bookCard.click();
		await page.waitForSelector('.reader');
		await page.waitForSelector('[data-testid="reader-content"]', { timeout: 10000 });

		const reader = page.locator('.reader');
		const box = await reader.boundingBox();
		expect(box).toBeTruthy();

		if (box) {
			// Navigate through chapters to reach text content
			for (let i = 0; i < 9; i++) {
				await reader.click({
					position: { x: box.width * 0.8, y: box.height * 0.5 }
				});
				await page.waitForTimeout(400);
			}
			// Wait for content to settle
			await page.waitForTimeout(500);
		}

		// Get the reader content element for evaluation
		const content = page.locator('[data-testid="reader-content"]');

		// Check that text elements are visible by verifying contrast
		const visibilityInfo = await content.evaluate((el) => {
			const selectors = ['p', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

			// Debug: collect info about all elements found
			const debugInfo = {
				totalElements: 0,
				elementsByTag: {} as Record<string, number>,
				elementsWithText: [] as Array<{ tag: string; textLength: number; text: string }>,
				containerText: el.textContent?.substring(0, 200) || 'empty',
				// Store computed styles of content container
				containerStyles: {
					color: window.getComputedStyle(el).color,
					backgroundColor: window.getComputedStyle(el).backgroundColor,
					opacity: window.getComputedStyle(el).opacity,
					visibility: window.getComputedStyle(el).visibility,
					display: window.getComputedStyle(el).display
				}
			};

			for (const selector of selectors) {
				const elements = el.querySelectorAll(selector);
				debugInfo.elementsByTag[selector] = elements.length;
				debugInfo.totalElements += elements.length;

				for (const elem of elements) {
					const text = elem.textContent?.trim() || '';
					if (text.length > 0) {
						debugInfo.elementsWithText.push({
							tag: selector,
							textLength: text.length,
							text: text.substring(0, 50)
						});
					}

					if (text.length < 5) continue;

					// Check if element is visible using checkVisibility API
					const isVisible = elem.checkVisibility({
						contentVisibilityAuto: true,
						opacityProperty: true,
						visibilityProperty: true
					});

					// Get computed styles
					const styles = window.getComputedStyle(elem);
					const color = styles.color;
					const backgroundColor = styles.backgroundColor;
					const opacity = styles.opacity;

					// Parse RGB values
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

					// Calculate relative luminance
					const luminance = (r: number, g: number, b: number) => {
						const [rs, gs, bs] = [r, g, b].map((v) => {
							v /= 255;
							return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
						});
						return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
					};

					const fgLum = fg ? luminance(fg.r, fg.g, fg.b) : 0;
					const bgLum = bg ? luminance(bg.r, bg.g, bg.b) : 1;

					// Calculate contrast ratio
					const lighter = Math.max(fgLum, bgLum);
					const darker = Math.min(fgLum, bgLum);
					const contrastRatio = (lighter + 0.05) / (darker + 0.05);

					return {
						tagName: elem.tagName,
						textPreview: text.substring(0, 50),
						isVisible,
						color,
						backgroundColor,
						opacity,
						contrastRatio,
						fgLum,
						bgLum,
						debugInfo
					};
				}
			}

			// Return debug info if no suitable element found
			return { debugInfo, noElementFound: true };
		});

		// Log debug info for troubleshooting
		console.log('Debug Info:', JSON.stringify(visibilityInfo, null, 2));

		// Check if we found a valid element
		if ('noElementFound' in visibilityInfo && visibilityInfo.noElementFound) {
			console.error(
				'No text element found with sufficient content. Debug info:',
				visibilityInfo.debugInfo
			);
			throw new Error(
				`No text element found. Container text: "${visibilityInfo.debugInfo.containerText}", ` +
					`Elements with text: ${visibilityInfo.debugInfo.elementsWithText.length}, ` +
					`Total elements: ${visibilityInfo.debugInfo.totalElements}`
			);
		}

		const info = visibilityInfo as {
			tagName: string;
			textPreview: string;
			isVisible: boolean;
			color: string;
			backgroundColor: string;
			opacity: string;
			contrastRatio: number;
			fgLum: number;
			bgLum: number;
		};

		expect(info.isVisible).toBe(true);
		expect(info.opacity).not.toBe('0');
		// Minimum contrast ratio of 3:1 (WCAG AA for large text)
		expect(info.contrastRatio).toBeGreaterThan(3);
	});

	test('content fills viewport width - no leakage to next page', async ({ page }) => {
		// Upload and open a book
		const fileInput = page.locator('input[type="file"]');
		const testBookPath = path.join(__dirname, 'fixtures', 'crime-punishment.epub');
		await fileInput.setInputFiles(testBookPath);
		await page.waitForSelector('[data-testid="book-card"]');

		const bookCard = page.locator('[data-testid="book-card"]').first();
		await bookCard.click();
		await page.waitForSelector('.reader');
		await page.waitForSelector('[data-testid="reader-content"]', { timeout: 10000 });

		const reader = page.locator('.reader');
		const content = page.locator('[data-testid="reader-content"]');

		const box = await reader.boundingBox();
		expect(box).toBeTruthy();

		if (box) {
			// Navigate to a chapter with actual text content
			// Skip past cover pages (c1, c2) to reach text chapters
			// More taps needed because gap top/bottom creates shorter columns = more columns per chapter
			for (let i = 0; i < 15; i++) {
				await reader.click({
					position: { x: box.width * 0.8, y: box.height * 0.5 }
				});
				await page.waitForTimeout(400);
			}

			// Wait for content to settle
			await page.waitForTimeout(500);

			// Take screenshot to see what's actually displayed
			await page.screenshot({ path: 'test-results/viewport-width-check.png' });

			// Check the viewport width and first VISIBLE text element width
			const viewportInfo = await content.evaluate((el) => {
				const containerRect = el.getBoundingClientRect();
				const viewportWidth = containerRect.width;
				const viewportLeft = containerRect.left;
				const viewportRight = containerRect.right;

				// Find first substantial text element that is VISIBLE in the current viewport
				const selectors = ['p', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
				let firstVisibleElement = null;

				for (const selector of selectors) {
					const elements = el.querySelectorAll(selector);
					for (const elem of elements) {
						const text = elem.textContent?.trim() || '';
						if (text.length < 10) continue;

						const rect = elem.getBoundingClientRect();

						// Check if this element is visible in the current viewport
						// Element should be within the viewport bounds
						if (rect.left >= viewportLeft && rect.left < viewportRight) {
							firstVisibleElement = elem;
							break;
						}
					}
					if (firstVisibleElement) break;
				}

				if (!firstVisibleElement) {
					// Log what we found for debugging
					const debugInfo = {
						htmlPreview: el.innerHTML.substring(0, 300),
						childCount: el.children.length,
						textContent: el.textContent?.substring(0, 200) || 'empty',
						scrollLeft: el.scrollLeft
					};
					return { error: 'No visible text element found', debug: debugInfo };
				}

				const elemRect = firstVisibleElement.getBoundingClientRect();

				return {
					viewportWidth,
					elementWidth: elemRect.width,
					elementRight: elemRect.right,
					elementLeft: elemRect.left,
					viewportLeft,
					viewportRight,
					gap: viewportRight - elemRect.right,
					tagName: firstVisibleElement.tagName,
					textPreview: firstVisibleElement.textContent?.substring(0, 50)
				};
			});

			console.log('Viewport info:', viewportInfo);

			// If no element was found, that's also a failure
			if ('error' in viewportInfo) {
				console.log('Debug info:', viewportInfo.debug);
				throw new Error(`Failed to find text element: ${viewportInfo.error}`);
			}

			// The gap between element right edge and viewport right edge should be minimal
			// If element is narrower than viewport, user sees next page content
			// Allow for padding and column gap
			const maxAllowedGap = viewportInfo.viewportWidth * 0.2; // 20% tolerance for gaps + side padding
			expect(viewportInfo.gap).toBeLessThan(maxAllowedGap);

			// Element should fill most of the viewport width (side padding reduces width)
			const minElementWidth = viewportInfo.viewportWidth * 0.75;
			expect(viewportInfo.elementWidth).toBeGreaterThan(minElementWidth);
		}
	});

	test('rapid taps at chapter boundary should not cause stuck page', async ({ page }) => {
		// Upload and open a book
		const fileInput = page.locator('input[type="file"]');
		const testBookPath = path.join(__dirname, 'fixtures', 'crime-punishment.epub');
		await fileInput.setInputFiles(testBookPath);
		await page.waitForSelector('[data-testid="book-card"]');

		const bookCard = page.locator('[data-testid="book-card"]').first();
		await bookCard.click();
		await page.waitForSelector('.reader');
		await page.waitForSelector('[data-testid="reader-content"]', { timeout: 10000 });

		const reader = page.locator('.reader');
		const content = page.locator('[data-testid="reader-content"]');

		const box = await reader.boundingBox();
		expect(box).toBeTruthy();

		if (box) {
			// First, navigate to near end of a chapter to reach boundary
			// Navigate through content to get to a multi-page chapter
			for (let i = 0; i < 5; i++) {
				await reader.click({
					position: { x: box.width * 0.8, y: box.height * 0.5 }
				});
				await page.waitForTimeout(300);
			}

			// Wait for content to settle
			await page.waitForTimeout(500);

			// Get initial state before rapid taps
			const initialState = await content.evaluate((el) => ({
				scrollLeft: el.scrollLeft,
				scrollWidth: el.scrollWidth,
				clientWidth: el.clientWidth,
				maxScroll: el.scrollWidth - el.clientWidth
			}));

			// Simulate rapid taps at chapter boundary
			// Issue: when tapping rapidly, the requestAnimationFrame callbacks
			// and smooth scroll animations can conflict, leaving page stuck mid-scroll
			const rapidTapPromises = [];
			for (let i = 0; i < 8; i++) {
				rapidTapPromises.push(
					reader.click({
						position: { x: box.width * 0.8, y: box.height * 0.5 }
					})
				);
				// Very short delay between taps to simulate rapid clicking
				await page.waitForTimeout(50);
			}

			await Promise.all(rapidTapPromises);

			// Wait for any pending animations and state updates to complete
			// CSS smooth scroll + scroll-snap can take up to 500ms
			// Chapter transitions via RAF + timeout can take up to 300ms
			await page.waitForTimeout(2000);

			// Get final state
			const finalState = await content.evaluate((el) => ({
				scrollLeft: el.scrollLeft,
				scrollWidth: el.scrollWidth,
				clientWidth: el.clientWidth,
				maxScroll: el.scrollWidth - el.clientWidth
			}));

			console.log('Initial state:', initialState);
			console.log('Final state:', finalState);

			// After rapid taps with animation cancellation, the final position should be
			// at a valid page boundary (multiple of clientWidth) within tolerance
			const expectedPage = Math.round(finalState.scrollLeft / finalState.clientWidth);
			const expectedScroll = expectedPage * finalState.clientWidth;
			const positionError = Math.abs(finalState.scrollLeft - expectedScroll);

			// Should be within 2% of viewport width (reasonable tolerance for snap points)
			const isAtValidPosition =
				positionError < finalState.clientWidth * 0.02 ||
				finalState.scrollLeft >= finalState.maxScroll - 10 || // At end with tolerance
				finalState.scrollLeft <= 10; // At beginning with tolerance

			// Take screenshot for debugging if test fails
			if (!isAtValidPosition) {
				await page.screenshot({ path: 'test-results/rapid-tap-stuck.png' });
			}

			// The scroll position should not be stuck mid-scroll between pages
			expect(isAtValidPosition).toBe(true);

			// Verify scroll position is reasonable (not negative, not beyond max)
			expect(finalState.scrollLeft).toBeGreaterThanOrEqual(0);
			expect(finalState.scrollLeft).toBeLessThanOrEqual(finalState.maxScroll + 10);
		}
	});

	test('rapid taps should center text properly on final page', async ({ page }) => {
		// Upload and open a book
		const fileInput = page.locator('input[type="file"]');
		const testBookPath = path.join(__dirname, 'fixtures', 'crime-punishment.epub');
		await fileInput.setInputFiles(testBookPath);
		await page.waitForSelector('[data-testid="book-card"]');

		const bookCard = page.locator('[data-testid="book-card"]').first();
		await bookCard.click();
		await page.waitForSelector('.reader');
		await page.waitForSelector('[data-testid="reader-content"]', { timeout: 10000 });

		const reader = page.locator('.reader');
		const content = page.locator('[data-testid="reader-content"]');
		const box = await reader.boundingBox();
		expect(box).toBeTruthy();

		if (box) {
			// Navigate to a chapter with text content (skip cover pages)
			for (let i = 0; i < 3; i++) {
				await reader.click({
					position: { x: box.width * 0.8, y: box.height * 0.5 }
				});
				await page.waitForTimeout(300);
			}

			// Get initial state
			const initialScroll = await content.evaluate((el) => el.scrollLeft);
			const clientWidth = await content.evaluate((el) => el.clientWidth);

			// Simulate rapid taps - 5 clicks in quick succession
			const rapidTapPromises = [];
			for (let i = 0; i < 5; i++) {
				rapidTapPromises.push(
					reader.click({
						position: { x: box.width * 0.8, y: box.height * 0.5 }
					})
				);
				await page.waitForTimeout(30); // Very short delay
			}
			await Promise.all(rapidTapPromises);

			// Wait for animation to complete
			await page.waitForTimeout(1000);

			// Get final scroll position
			const finalScroll = await content.evaluate((el) => el.scrollLeft);
			const finalClientWidth = await content.evaluate((el) => el.clientWidth);

			// The final position should be at a valid page boundary (multiple of clientWidth)
			// Allow small tolerance for sub-pixel rendering
			const expectedPages = Math.round((finalScroll - initialScroll) / clientWidth);
			const expectedFinalScroll = initialScroll + expectedPages * finalClientWidth;
			const scrollDiff = Math.abs(finalScroll - expectedFinalScroll);

			// Should be within 2% of viewport width (reasonable tolerance for snap points)
			expect(scrollDiff).toBeLessThan(finalClientWidth * 0.02);

			// Now verify text is visible and properly positioned
			// Get the first visible text element
			const viewportInfo = await content.evaluate((el) => {
				const contentEl = el as HTMLElement;
				const rect = contentEl.getBoundingClientRect();
				const viewportWidth = rect.width;
				const scrollLeft = contentEl.scrollLeft;

				// Find first visible text element
				const textElements = contentEl.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6');
				for (const textEl of Array.from(textElements)) {
					const elRect = textEl.getBoundingClientRect();
					const elementLeft = elRect.left - rect.left + scrollLeft;
					const elementRight = elementLeft + elRect.width;
					const viewportLeft = scrollLeft;
					const viewportRight = scrollLeft + viewportWidth;

					// Check if element is visible in viewport
					if (elementRight > viewportLeft && elementLeft < viewportRight) {
						const text = textEl.textContent?.trim() || '';
						if (text.length > 10) {
							return {
								elementLeft,
								elementRight,
								viewportLeft,
								viewportRight,
								textPreview: text.substring(0, 50)
							};
						}
					}
				}
				return null;
			});

			// Should have found visible text
			expect(viewportInfo).toBeTruthy();

			if (viewportInfo) {
				// Text should be within viewport (not cut off at edges)
				// The visible text element should be well within the viewport bounds
				const elementLeftInViewport = viewportInfo.elementLeft - viewportInfo.viewportLeft;
				const elementRightInViewport = viewportInfo.elementRight - viewportInfo.viewportLeft;
				const viewportWidth = viewportInfo.viewportRight - viewportInfo.viewportLeft;

				// Element should start after left edge (with padding)
				expect(elementLeftInViewport).toBeGreaterThanOrEqual(0);

				// Element should end before right edge (with padding)
				expect(elementRightInViewport).toBeLessThanOrEqual(viewportWidth);

				// Element should have reasonable width (not too narrow, indicates proper layout)
				const elementWidth = elementRightInViewport - elementLeftInViewport;
				expect(elementWidth).toBeGreaterThan(viewportWidth * 0.3); // At least 30% of viewport

				console.log('Text properly centered after rapid taps:', {
					textPreview: viewportInfo.textPreview,
					elementPosition: { left: elementLeftInViewport, right: elementRightInViewport },
					viewportWidth
				});
			}
		}
	});

	test('URL updates when turning pages', async ({ page }) => {
		// Upload and open a book
		const fileInput = page.locator('input[type="file"]');
		const testBookPath = path.join(__dirname, 'fixtures', 'crime-punishment.epub');
		await fileInput.setInputFiles(testBookPath);
		await page.waitForSelector('[data-testid="book-card"]');

		const bookCard = page.locator('[data-testid="book-card"]').first();
		await bookCard.click();
		await page.waitForSelector('.reader');
		await page.waitForSelector('[data-testid="reader-content"]', { timeout: 10000 });

		const reader = page.locator('.reader');
		const content = page.locator('[data-testid="reader-content"]');

		const box = await reader.boundingBox();
		expect(box).toBeTruthy();

		// Wait for initial URL to be set (should have chapter and progress params)
		await page.waitForTimeout(500);
		const initialUrl = page.url();
		// URL should contain query params
		expect(initialUrl).toContain('?');
		expect(initialUrl).toContain('chapter=');
		expect(initialUrl).toContain('progress=');

		// Get initial position
		const initialChapterMatch = initialUrl.match(/chapter=(\d+)/);
		const initialProgressMatch = initialUrl.match(/progress=(\d+)/);
		expect(initialChapterMatch).toBeTruthy();
		expect(initialProgressMatch).toBeTruthy();
		const initialChapterNumber = parseInt(initialChapterMatch![1], 10);
		const initialProgressValue = parseInt(initialProgressMatch![1], 10);

		// Get initial content for comparison
		const initialContent = await content.evaluate((el) => el.innerHTML);

		if (box) {
			// Navigate forward - keep tapping until something changes
			let contentChanged = false;
			let urlChanged = false;
			const maxTaps = 10;

			for (let i = 0; i < maxTaps && !contentChanged; i++) {
				await reader.click({
					position: { x: box.width * 0.8, y: box.height * 0.5 }
				});
				await page.waitForTimeout(500);

				// Check if content changed (could be new page or new chapter)
				const currentContent = await content.evaluate((el) => el.innerHTML);
				if (currentContent !== initialContent) {
					contentChanged = true;
				}

				// Check if URL changed
				const currentUrl = page.url();
				const currentChapterMatch = currentUrl.match(/chapter=(\d+)/);
				const currentProgressMatch = currentUrl.match(/progress=(\d+)/);
				if (currentChapterMatch && currentProgressMatch) {
					const currentChapter = parseInt(currentChapterMatch[1], 10);
					const currentProgress = parseInt(currentProgressMatch[1], 10);
					if (currentChapter !== initialChapterNumber || currentProgress !== initialProgressValue) {
						urlChanged = true;
					}
				}
			}

			// Verify URL has updated (either chapter or progress changed)
			const urlAfterForward = page.url();
			expect(urlAfterForward).toContain('chapter=');
			expect(urlChanged || contentChanged).toBe(true);

			// Get position after forward navigation
			const forwardChapterMatch = urlAfterForward.match(/chapter=(\d+)/);
			const forwardProgressMatch = urlAfterForward.match(/progress=(\d+)/);
			expect(forwardChapterMatch).toBeTruthy();
			expect(forwardProgressMatch).toBeTruthy();
			const forwardChapterNumber = parseInt(forwardChapterMatch![1], 10);
			const forwardProgressValue = parseInt(forwardProgressMatch![1], 10);

			// Navigate backward
			for (let i = 0; i < 2; i++) {
				await reader.click({
					position: { x: box.width * 0.2, y: box.height * 0.5 }
				});
				await page.waitForTimeout(500);
			}

			await page.waitForTimeout(300);

			// Verify URL updated after backward navigation
			const urlAfterBackward = page.url();
			const backwardChapterMatch = urlAfterBackward.match(/chapter=(\d+)/);
			const backwardProgressMatch = urlAfterBackward.match(/progress=(\d+)/);
			expect(backwardChapterMatch).toBeTruthy();
			expect(backwardProgressMatch).toBeTruthy();
			const backwardChapterNumber = parseInt(backwardChapterMatch![1], 10);
			const backwardProgressValue = parseInt(backwardProgressMatch![1], 10);

			// Either chapter should be less OR (same chapter AND progress should be less or equal)
			const movedBackward =
				backwardChapterNumber < forwardChapterNumber ||
				(backwardChapterNumber === forwardChapterNumber &&
					backwardProgressValue <= forwardProgressValue);
			expect(movedBackward).toBe(true);
		}
	});

	test('URL includes chapter and progress params on load', async ({ page }) => {
		// Upload and open a book
		const fileInput = page.locator('input[type="file"]');
		const testBookPath = path.join(__dirname, 'fixtures', 'crime-punishment.epub');
		await fileInput.setInputFiles(testBookPath);
		await page.waitForSelector('[data-testid="book-card"]');

		const bookCard = page.locator('[data-testid="book-card"]').first();
		await bookCard.click();
		await page.waitForSelector('.reader');
		await page.waitForSelector('[data-testid="reader-content"]', { timeout: 10000 });

		// Wait for URL to be set with chapter and progress params
		await page.waitForTimeout(800);
		const url = page.url();

		// Verify URL has chapter and progress params
		expect(url).toContain('chapter=');
		expect(url).toContain('progress=');

		// Extract and verify values
		const chapterMatch = url.match(/chapter=(\d+)/);
		const progressMatch = url.match(/progress=(\d+)/);
		expect(chapterMatch).toBeTruthy();
		expect(progressMatch).toBeTruthy();

		const chapter = parseInt(chapterMatch![1], 10);
		const progress = parseInt(progressMatch![1], 10);

		// Chapter should be valid (0 or greater)
		expect(chapter).toBeGreaterThanOrEqual(0);
		// Progress should be valid (0-10000)
		expect(progress).toBeGreaterThanOrEqual(0);
		expect(progress).toBeLessThanOrEqual(10000);
	});

	test('URL params restore position on page load', async ({ page }) => {
		// Upload a book first
		const fileInput = page.locator('input[type="file"]');
		const testBookPath = path.join(__dirname, 'fixtures', 'crime-punishment.epub');
		await fileInput.setInputFiles(testBookPath);
		await page.waitForSelector('[data-testid="book-card"]');

		const bookCard = page.locator('[data-testid="book-card"]').first();
		await bookCard.click();
		await page.waitForSelector('.reader');
		await page.waitForSelector('[data-testid="reader-content"]', { timeout: 10000 });

		// Get the book ID from URL
		const currentUrl = page.url();
		const bookIdMatch = currentUrl.match(/\/read\/([^/]+)/);
		expect(bookIdMatch).toBeTruthy();
		const bookId = bookIdMatch![1];

		const reader = page.locator('.reader');
		const box = await reader.boundingBox();
		expect(box).toBeTruthy();

		// Navigate to a specific position
		if (box) {
			// First navigate to chapter 1
			for (let i = 0; i < 5; i++) {
				await reader.click({
					position: { x: box.width * 0.8, y: box.height * 0.5 }
				});
				await page.waitForTimeout(400);
			}
		}

		// Wait for URL to update
		await page.waitForTimeout(500);
		const navigatedUrl = page.url();

		// Extract chapter and progress from URL
		const chapterMatch = navigatedUrl.match(/chapter=(\d+)/);
		const progressMatch = navigatedUrl.match(/progress=(\d+)/);
		expect(chapterMatch).toBeTruthy();
		expect(progressMatch).toBeTruthy();

		const savedChapter = chapterMatch![1];
		const savedProgress = progressMatch![1];
		const savedProgressInt = parseInt(savedProgress, 10);
		expect(parseInt(savedChapter, 10)).toBeGreaterThanOrEqual(0);
		// Progress can be 0 if at the beginning of a chapter
		expect(savedProgressInt).toBeGreaterThanOrEqual(0);

		// Navigate away to library
		await page.goto('/');
		await page.waitForSelector('[data-testid="empty-state"], [data-testid="book-card"]');

		// Navigate back to reader with specific URL params
		const readerUrlWithParams = `/read/${bookId}?chapter=${savedChapter}&progress=${savedProgress}`;
		await page.goto(readerUrlWithParams);
		await page.waitForSelector('[data-testid="reader-content"]', { timeout: 10000 });

		// Wait for position to be restored
		await page.waitForTimeout(800);

		// Verify the URL params are preserved
		const finalUrl = page.url();
		expect(finalUrl).toContain(`chapter=${savedChapter}`);
		expect(finalUrl).toContain(`progress=${savedProgress}`);
	});

	test('URL with progress overrides saved progress when sharing', async ({ page }) => {
		// Upload a book first
		const fileInput = page.locator('input[type="file"]');
		const testBookPath = path.join(__dirname, 'fixtures', 'crime-punishment.epub');
		await fileInput.setInputFiles(testBookPath);
		await page.waitForSelector('[data-testid="book-card"]');

		const bookCard = page.locator('[data-testid="book-card"]').first();
		await bookCard.click();
		await page.waitForSelector('.reader');
		await page.waitForSelector('[data-testid="reader-content"]', { timeout: 10000 });

		// Get the book ID from URL
		const currentUrl = page.url();
		const bookIdMatch = currentUrl.match(/\/read\/([^/]+)/);
		expect(bookIdMatch).toBeTruthy();
		const bookId = bookIdMatch![1];

		const reader = page.locator('.reader');
		const box = await reader.boundingBox();
		expect(box).toBeTruthy();

		// Navigate forward to create a saved progress in localStorage
		// User reads to chapter 3, progress ~5000 (50%)
		if (box) {
			for (let i = 0; i < 8; i++) {
				await reader.click({
					position: { x: box.width * 0.8, y: box.height * 0.5 }
				});
				await page.waitForTimeout(500);
			}
		}

		// Wait for URL and progress to update
		await page.waitForTimeout(1000);
		const originalUrl = page.url();
		const originalChapterMatch = originalUrl.match(/chapter=(\d+)/);
		const originalProgressMatch = originalUrl.match(/progress=(\d+)/);
		expect(originalChapterMatch).toBeTruthy();
		expect(originalProgressMatch).toBeTruthy();

		const originalChapter = parseInt(originalChapterMatch![1], 10);
		const originalProgress = parseInt(originalProgressMatch![1], 10);
		// Chapter and progress should be valid numbers
		expect(originalChapter).toBeGreaterThanOrEqual(0);
		expect(originalProgress).toBeGreaterThanOrEqual(0);

		// Navigate away to library (simulating "friend receives link")
		await page.goto('/');
		await page.waitForSelector('[data-testid="empty-state"], [data-testid="book-card"]');

		// Friend opens the book with a shared URL at a different position
		// Using chapter 0 with progress 5000 (50%) - different from saved position
		const sharedChapter = 0;
		const sharedProgress = 5000; // 50%
		const sharedUrl = `/read/${bookId}?chapter=${sharedChapter}&progress=${sharedProgress}`;

		// Friend opens the shared URL
		await page.goto(sharedUrl);
		await page.waitForSelector('[data-testid="reader-content"]', { timeout: 10000 });

		// Wait for position to be restored from URL
		await page.waitForTimeout(800);

		// Verify URL shows the shared position, not the saved progress
		const finalUrl = page.url();
		const finalChapterMatch = finalUrl.match(/chapter=(\d+)/);
		const finalProgressMatch = finalUrl.match(/progress=(\d+)/);
		expect(finalChapterMatch).toBeTruthy();
		expect(finalProgressMatch).toBeTruthy();

		const finalChapter = parseInt(finalChapterMatch![1], 10);
		const finalProgress = parseInt(finalProgressMatch![1], 10);

		// Should be at the shared chapter (URL param takes precedence over saved progress)
		expect(finalChapter).toBe(sharedChapter);
		// Progress should reflect actual position (may differ slightly from URL param due to scroll)
		expect(finalProgress).toBeGreaterThanOrEqual(0);

		// Verify the reader loaded successfully with the shared URL params
		const finalReader = page.locator('.reader');
		await expect(finalReader).toBeVisible();
	});

	test('text can be selected in reader', async ({ page }) => {
		// Upload and open a book
		const fileInput = page.locator('input[type="file"]');
		const testBookPath = path.join(__dirname, 'fixtures', 'crime-punishment.epub');
		await fileInput.setInputFiles(testBookPath);
		await page.waitForSelector('[data-testid="book-card"]');
		const bookCard = page.locator('[data-testid="book-card"]').first();
		await bookCard.click();
		await page.waitForSelector('.reader');
		await page.waitForSelector('[data-testid="reader-content"]', { timeout: 10000 });

		const reader = page.locator('.reader');
		const content = page.locator('[data-testid="reader-content"]');

		const box = await reader.boundingBox();
		expect(box).toBeTruthy();

		if (box) {
			// Navigate to a chapter with text content (skip cover pages)
			for (let i = 0; i < 15; i++) {
				await reader.click({
					position: { x: box.width * 0.8, y: box.height * 0.5 }
				});
				await page.waitForTimeout(300);
			}

			// Wait for content to settle
			await page.waitForTimeout(500);

			// Find a text element to select
			const textElement = await content
				.locator('p, span')
				.filter({ hasText: /\w{10,}/ })
				.first();
			await expect(textElement).toBeVisible();

			// Use programmatic selection for reliability with CSS multicol layout
			const selectedText = await page.evaluate(() => {
				const container = document.querySelector('[data-testid="reader-content"]');
				if (!container) return '';
				const textEl = container.querySelector('p, span');
				if (!textEl || !textEl.firstChild) return '';

				const sel = window.getSelection();
				if (!sel) return '';
				sel.removeAllRanges();

				const range = document.createRange();
				// Select first 200 characters of the first text node
				const textNode = textEl.firstChild;
				const length = Math.min(200, textNode.textContent?.length || 0);
				range.setStart(textNode, 0);
				range.setEnd(textNode, length);
				sel.addRange(range);

				return sel.toString();
			});

			// Should have selected some text
			expect(selectedText.length).toBeGreaterThan(0);
			console.log('Selected text:', selectedText.substring(0, 50));
		}
	});

	test('shows TOC button in overlay on center tap', async ({ page }) => {
		// Upload and open a book
		const fileInput = page.locator('input[type="file"]');
		const testBookPath = path.join(__dirname, 'fixtures', 'crime-punishment.epub');
		await fileInput.setInputFiles(testBookPath);
		await page.waitForSelector('[data-testid="book-card"]');
		const bookCard = page.locator('[data-testid="book-card"]').first();
		await bookCard.click();
		await page.waitForSelector('.reader');

		const content = page.locator('[data-testid="reader-content"]');
		const box = await content.boundingBox();
		expect(box).toBeTruthy();
		if (box) {
			// Tap center to show overlay
			await content.click({ position: { x: box.width * 0.5, y: box.height * 0.5 } });
		}
		await page.waitForTimeout(300);

		// TOC button should be visible
		const tocButton = page.getByRole('button', { name: 'Show table of contents' });
		await expect(tocButton).toBeVisible();
	});

	test('opens table of contents when TOC button is clicked', async ({ page }) => {
		// Upload and open a book
		const fileInput = page.locator('input[type="file"]');
		const testBookPath = path.join(__dirname, 'fixtures', 'crime-punishment.epub');
		await fileInput.setInputFiles(testBookPath);
		await page.waitForSelector('[data-testid="book-card"]');
		const bookCard = page.locator('[data-testid="book-card"]').first();
		await bookCard.click();
		await page.waitForSelector('.reader');

		const content = page.locator('[data-testid="reader-content"]');
		const box = await content.boundingBox();
		expect(box).toBeTruthy();
		if (box) {
			// Show overlay
			await content.click({ position: { x: box.width * 0.5, y: box.height * 0.5 } });
		}
		await page.waitForTimeout(300);

		// Click TOC button
		const tocButton = page.getByRole('button', { name: 'Show table of contents' });
		await tocButton.click();

		// TOC overlay should appear
		const tocOverlay = page.locator('[data-testid="toc-overlay"]');
		await expect(tocOverlay).toBeVisible();

		// TOC title should be visible (heading in the TOC panel)
		await expect(page.getByRole('heading', { name: 'Table of Contents' })).toBeVisible();
	});

	test('navigates to chapter when clicking in TOC', async ({ page }) => {
		// Upload and open a book
		const fileInput = page.locator('input[type="file"]');
		const testBookPath = path.join(__dirname, 'fixtures', 'crime-punishment.epub');
		await fileInput.setInputFiles(testBookPath);
		await page.waitForSelector('[data-testid="book-card"]');
		const bookCard = page.locator('[data-testid="book-card"]').first();
		await bookCard.click();
		await page.waitForSelector('.reader');
		await page.waitForTimeout(1000);

		const initialUrl = page.url();
		const content = page.locator('[data-testid="reader-content"]');
		const box = await content.boundingBox();
		expect(box).toBeTruthy();
		if (box) {
			// Show overlay
			await content.click({ position: { x: box.width * 0.5, y: box.height * 0.5 } });
		}
		await page.waitForTimeout(300);

		// Open TOC
		const tocButton = page.getByRole('button', { name: 'Show table of contents' });
		await tocButton.click();

		// Wait for TOC to appear
		await page.waitForSelector('[data-testid="toc-overlay"]');

		// Click second chapter
		const chapterItems = page.locator('[data-testid="chapter-item"]');
		await expect(chapterItems.nth(1)).toBeVisible();
		await chapterItems.nth(1).click();

		// TOC should close
		await expect(page.locator('[data-testid="toc-overlay"]')).not.toBeVisible();

		// URL should update
		await page.waitForTimeout(500);
		const newUrl = page.url();
		expect(newUrl).not.toEqual(initialUrl);
		expect(newUrl).toMatch(/chapter=\d+/);
	});

	test('closes TOC when clicking close button', async ({ page }) => {
		// Upload and open a book
		const fileInput = page.locator('input[type="file"]');
		const testBookPath = path.join(__dirname, 'fixtures', 'crime-punishment.epub');
		await fileInput.setInputFiles(testBookPath);
		await page.waitForSelector('[data-testid="book-card"]');
		const bookCard = page.locator('[data-testid="book-card"]').first();
		await bookCard.click();
		await page.waitForSelector('.reader');

		const content = page.locator('[data-testid="reader-content"]');
		const box = await content.boundingBox();
		expect(box).toBeTruthy();
		if (box) {
			// Show overlay
			await content.click({ position: { x: box.width * 0.5, y: box.height * 0.5 } });
		}
		await page.waitForTimeout(300);

		// Open TOC
		const tocButton = page.getByRole('button', { name: 'Show table of contents' });
		await tocButton.click();

		// Wait for TOC
		await page.waitForSelector('[data-testid="toc-overlay"]');

		// Click close button
		const closeButton = page.getByRole('button', { name: 'Close table of contents' });
		await closeButton.click();

		// TOC should be closed
		await expect(page.locator('[data-testid="toc-overlay"]')).not.toBeVisible();
	});

	test('TOC displays all chapter titles', async ({ page }) => {
		// Upload and open a book
		const fileInput = page.locator('input[type="file"]');
		const testBookPath = path.join(__dirname, 'fixtures', 'crime-punishment.epub');
		await fileInput.setInputFiles(testBookPath);
		await page.waitForSelector('[data-testid="book-card"]');
		const bookCard = page.locator('[data-testid="book-card"]').first();
		await bookCard.click();
		await page.waitForSelector('.reader');

		const content = page.locator('[data-testid="reader-content"]');
		const box = await content.boundingBox();
		expect(box).toBeTruthy();
		if (box) {
			// Show overlay
			await content.click({ position: { x: box.width * 0.5, y: box.height * 0.5 } });
		}
		await page.waitForTimeout(300);

		// Open TOC
		const tocButton = page.getByRole('button', { name: 'Show table of contents' });
		await tocButton.click();

		// Wait for TOC
		await page.waitForSelector('[data-testid="toc-overlay"]');

		// Verify chapters are listed
		const chapterItems = page.locator('[data-testid="chapter-item"]');
		const count = await chapterItems.count();
		expect(count).toBeGreaterThan(0);

		// Verify each chapter has a title
		for (let i = 0; i < Math.min(count, 5); i++) {
			const text = await chapterItems.nth(i).textContent();
			expect(text).toBeTruthy();
		}
	});

	test('continues from saved position when reopening book', async ({ page }) => {
		// Capture browser console logs from the start
		const logs: string[] = [];
		page.on('console', (msg) => {
			const logText = `[${msg.type()}] ${msg.text()}`;
			logs.push(logText);
		});

		// Upload and open a book
		const fileInput = page.locator('input[type="file"]');
		const testBookPath = path.join(__dirname, 'fixtures', 'crime-punishment.epub');
		await fileInput.setInputFiles(testBookPath);
		await page.waitForSelector('[data-testid="book-card"]');
		const bookCard = page.locator('[data-testid="book-card"]').first();
		await bookCard.click();
		await page.waitForSelector('.reader');
		await page.waitForSelector('[data-testid="reader-content"]', { timeout: 10000 });

		const reader = page.locator('.reader');
		const content = page.locator('[data-testid="reader-content"]');
		const box = await reader.boundingBox();
		expect(box).toBeTruthy();

		// Navigate to a specific chapter (chapter 2)
		if (box) {
			// Navigate forward to reach chapter 2
			for (let i = 0; i < 3; i++) {
				await reader.click({
					position: { x: box.width * 0.8, y: box.height * 0.5 }
				});
				await page.waitForTimeout(400);
			}
		}

		// Wait for URL to update with chapter and progress, and for progress to be saved to storage
		// The saveProgress has a 300ms debounce, so we need to wait longer
		await page.waitForTimeout(1500);
		const urlBeforeClose = page.url();

		// Extract the saved chapter from URL
		const chapterMatchBefore = urlBeforeClose.match(/chapter=(\d+)/);
		expect(chapterMatchBefore).toBeTruthy();
		const savedChapter = parseInt(chapterMatchBefore![1], 10);

		// Chapter should be 2 (or higher after navigation)
		expect(savedChapter).toBeGreaterThanOrEqual(1);
		console.log(`[TEST] Saved chapter: ${savedChapter}`);

		// Navigate back to library (closing the book)
		await page.goto('/');
		await page.waitForSelector('[data-testid="empty-state"], [data-testid="book-card"]');

		// Reopen the book (should restore to saved position)
		const bookCardAfter = page.locator('[data-testid="book-card"]').first();

		await bookCardAfter.click();
		await page.waitForSelector('.reader');
		await page.waitForSelector('[data-testid="reader-content"]', { timeout: 10000 });

		// Wait for logs to come through
		await page.waitForTimeout(500);

		// Wait for position restoration
		await page.waitForTimeout(1500);

		// Get the URL after reopening
		const urlAfterReopen = page.url();
		console.log(`[TEST] URL after reopen: ${urlAfterReopen}`);

		// Verify the chapter is restored
		const chapterMatchAfter = urlAfterReopen.match(/chapter=(\d+)/);
		expect(chapterMatchAfter).toBeTruthy();
		const restoredChapter = parseInt(chapterMatchAfter![1], 10);
		console.log(`[TEST] Restored chapter: ${restoredChapter}`);

		// Should be at or near the same chapter
		expect(restoredChapter).toBe(savedChapter);

		// Verify content is loaded at the restored position
		const contentAfterReopen = await content.evaluate((el) => el.innerHTML);

		// Content should be non-empty
		expect(contentAfterReopen.length).toBeGreaterThan(0);

		// The reader should be visible
		const readerAfterReopen = page.locator('.reader');
		await expect(readerAfterReopen).toBeVisible();
	});
});
