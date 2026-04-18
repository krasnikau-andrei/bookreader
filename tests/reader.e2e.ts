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

	test('shows delete menu on long press', async ({ page }) => {
		// Upload a test book
		const fileInput = page.locator('input[type="file"]');
		const testBookPath = path.join(__dirname, 'fixtures', 'crime-punishment.epub');
		await fileInput.setInputFiles(testBookPath);

		// Wait for book to appear
		await page.waitForSelector('[data-testid="book-card"]');

		// Long press on book card (500ms) using right-click since Playwright desktop doesn't support touch
		const bookCard = page.locator('[data-testid="book-card"]').first();
		await bookCard.click({ button: 'right' });

		// Context menu should appear
		const contextMenu = page.locator('.context-menu');
		await expect(contextMenu).toBeVisible();

		// Delete button should be visible in menu
		const deleteButton = page.locator('[data-testid="delete-book-button"]');
		await expect(deleteButton).toBeVisible();
		await expect(deleteButton).toHaveText('Delete');
	});

	test('deletes book from context menu', async ({ page }) => {
		// Upload a test book
		const fileInput = page.locator('input[type="file"]');
		const testBookPath = path.join(__dirname, 'fixtures', 'crime-punishment.epub');
		await fileInput.setInputFiles(testBookPath);

		// Wait for book to appear
		await page.waitForSelector('[data-testid="book-card"]');
		const initialBooks = await page.locator('[data-testid="book-card"]').count();
		expect(initialBooks).toBe(1);

		// Right-click on book card to open context menu
		const bookCard = page.locator('[data-testid="book-card"]').first();
		await bookCard.click({ button: 'right' });

		// Click delete in context menu
		const deleteButton = page.locator('[data-testid="delete-book-button"]');
		await deleteButton.click();

		// Book should be removed
		await page.waitForSelector('[data-testid="empty-state"]');
		const emptyState = page.locator('[data-testid="empty-state"]');
		await expect(emptyState).toBeVisible();
	});

	test('hides context menu when tapping elsewhere', async ({ page }) => {
		// Upload a test book
		const fileInput = page.locator('input[type="file"]');
		const testBookPath = path.join(__dirname, 'fixtures', 'crime-punishment.epub');
		await fileInput.setInputFiles(testBookPath);

		// Wait for book to appear
		await page.waitForSelector('[data-testid="book-card"]');

		// Right-click on book card to open context menu
		const bookCard = page.locator('[data-testid="book-card"]').first();
		await bookCard.click({ button: 'right' });

		// Context menu should appear
		const contextMenu = page.locator('.context-menu');
		await expect(contextMenu).toBeVisible();

		// Click elsewhere (on the grid)
		const grid = page.locator('.books-grid');
		await grid.click();

		// Context menu should disappear
		await expect(contextMenu).not.toBeVisible();
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
		// Upload and open a book
		const fileInput = page.locator('input[type="file"]');
		const testBookPath = path.join(__dirname, 'fixtures', 'crime-punishment.epub');
		await fileInput.setInputFiles(testBookPath);
		await page.waitForSelector('[data-testid="book-card"]');

		const bookCard = page.locator('[data-testid="book-card"]').first();
		await bookCard.click();
		await page.waitForSelector('.reader');

		// Initially overlay should be hidden (no back button visible)
		const backButton = page.getByRole('button', { name: 'Go back' });
		await expect(backButton).not.toBeVisible();

		// Tap center to show overlay (click on tap-zones button)
		const tapZones = page.locator('button[aria-label="Reader tap zones"]');
		const box = await tapZones.boundingBox();
		if (box) {
			await tapZones.click({
				position: { x: box.width * 0.5, y: box.height * 0.5 }
			});
		}

		// Back button should now be visible
		await expect(backButton).toBeVisible();

		// Tap center again to hide overlay
		if (box) {
			await tapZones.click({
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

		const tapZones = page.locator('button[aria-label="Reader tap zones"]');
		const content = page.locator('[data-testid="reader-content"]');

		// Get initial chapter content
		const initialContent = await content.evaluate((el) => el.innerHTML);

		const box = await tapZones.boundingBox();
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

			// Tap right zone multiple times to navigate through pages/chapters
			for (let i = 0; i < 10; i++) {
				await tapZones.click({
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

			// Tap left zone to navigate back
			for (let i = 0; i < 5; i++) {
				await tapZones.click({
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
		const content = page.locator('[data-testid="reader-content"]');

		// Navigate past cover pages to reach text chapters (skip c1, c2)
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
			for (let i = 0; i < 9; i++) {
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
			// Allow for some padding/margin (max 60px which is ~14% on mobile)
			const maxAllowedGap = viewportInfo.viewportWidth * 0.15; // 15% tolerance
			expect(viewportInfo.gap).toBeLessThan(maxAllowedGap);

			// Element should fill most of the viewport width (at least 85%)
			const minElementWidth = viewportInfo.viewportWidth * 0.85;
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
				maxScroll: el.scrollWidth - el.clientWidth,
				// Check if scroll position is at a valid snap point
				// scroll-snap-type: x mandatory should align to page boundaries
				// CSS scroll-snap may not perfectly align due to sub-pixel rendering
				isAtSnapPoint:
					el.scrollLeft % el.clientWidth === 0 ||
					Math.abs(el.scrollLeft % el.clientWidth) < el.clientWidth * 0.05 // Allow 5% of viewport width tolerance
			}));

			console.log('Initial state:', initialState);
			console.log('Final state:', finalState);

			// The page should end at a valid scroll position
			// Either at a snap point (page boundary) or at max scroll (end of chapter)
			const isValidPosition =
				finalState.isAtSnapPoint ||
				finalState.scrollLeft >= finalState.maxScroll - 10 || // At end with tolerance
				finalState.scrollLeft <= 10; // At beginning with tolerance

			// Take screenshot for debugging if test fails
			if (!isValidPosition) {
				await page.screenshot({ path: 'test-results/rapid-tap-stuck.png' });
			}

			// The scroll position should not be stuck mid-scroll between pages
			// This assertion will FAIL if the race condition occurs
			expect(isValidPosition).toBe(true);

			// Verify scroll position is reasonable (not negative, not beyond max)
			expect(finalState.scrollLeft).toBeGreaterThanOrEqual(0);
			expect(finalState.scrollLeft).toBeLessThanOrEqual(finalState.maxScroll + 10);
		}
	});
});
