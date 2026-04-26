<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { page } from '$app/stores';
import { goto } from '$app/navigation';
import { calculateScrollPercent } from '$lib/reader/pagination';
import { animateScroll, jumpTo } from '$lib/reader/animation';
import { createSwipeHandler } from '$lib/reader/swipe';
import { createSafetyNet } from '$lib/reader/safety-net';
import { getBook, saveProgress, getProgress } from '$lib/storage';
	import type { Book, Chapter } from '$lib/types';

	let book: Book | undefined = $state();
	let chapters: Chapter[] = $state([]);
	let currentChapter = $state(0);
	let scrollContainer: HTMLDivElement | null = $state(null);
	let showOverlay = $state(false);
	let loading = $state(true);
	let bookId = $derived($page.params.bookId);

	// Link click handling
	let showLinkError = $state(false);
	let linkErrorInfo: { originalHref: string; message: string } | null = $state(null);
	let pendingFragment: string | null = $state(null);

// Track if chapter is changing (DOM update in progress)
let isChangingChapter = $state(false);
let chapterRaf: number | null = null;

// Swipe handling
let swipeHandler: ReturnType<typeof createSwipeHandler> | null = $state(null);
let safetyNet: ReturnType<typeof createSafetyNet> | null = $state(null);
let isUserSwiping = $state(false);

// Flag to prevent URL updates during initial load
	let isInitializing = $state(true);

	// Track previous URL params to detect changes
	let lastUrlChapter = $state(-1);
	let lastUrlProgress = $state(-1);

	// Reactive URL params from page store (use progress 0-10000 for font-independent positioning)
	let urlParams = $derived({
		chapter: parseInt($page.url.searchParams.get('chapter') || '-1', 10),
		progress: parseInt($page.url.searchParams.get('progress') || '-1', 10)
	});

	// Store saved progress for fallback
	let savedProgress: { chapterIndex: number; scrollPercent: number } | null = null;

	function updateUrl(chapterIndex: number, progressValue: number, force = false) {
		if (isInitializing && !force) return;
		const url = new URL($page.url);
		url.searchParams.set('chapter', chapterIndex.toString());
		// Store progress as integer 0-10000 (represents 0.00% to 100.00%)
		const progressInt = Math.round(progressValue * 10000);
		url.searchParams.set('progress', progressInt.toString());
		goto(url.toString(), { replaceState: true, keepFocus: true });
	}

	function applyUrlPosition(targetChapter: number, targetProgress: number) {
		if (!scrollContainer || chapters.length === 0) return;

		const clientWidth = scrollContainer.clientWidth;
		const maxScroll = scrollContainer.scrollWidth - clientWidth;

		// Set chapter if different
		if (targetChapter >= 0 && targetChapter !== currentChapter && targetChapter < chapters.length) {
			currentChapter = targetChapter;
		}

		// Set scroll position
		if (targetProgress >= 0) {
			const progressPercent = targetProgress / 10000;
			scrollContainer.scrollLeft = maxScroll * progressPercent;
		}

		// Update last known URL params
		lastUrlChapter = targetChapter;
		lastUrlProgress = targetProgress;
	}

	onMount(async () => {
		try {
			if (!bookId) {
				goto('/');
				return;
			}

			book = await getBook(bookId);
			if (!book) {
				goto('/');
				return;
			}

		// Parse EPUB to get chapters
		const { parseEpubChapters } = await import('$lib/parsers/epub');
		const result = await parseEpubChapters(book.fileData);
		chapters = result.chapters;

			// Get saved progress
			const progress = await getProgress(bookId);
			if (progress) {
				savedProgress = {
					chapterIndex: progress.chapterIndex,
					scrollPercent: progress.scrollPercent
				};
			}

			// Check if URL has explicit params
			const urlSearchParams = $page.url.searchParams;
			const hasChapterParam = urlSearchParams.has('chapter');
			const hasProgressParam = urlSearchParams.has('progress');

			if (hasChapterParam || hasProgressParam) {
				// Use URL params if present - URL params override saved progress
				const targetChapter = urlParams.chapter >= 0 ? urlParams.chapter : 0;
				currentChapter = Math.min(targetChapter, chapters.length - 1);
				lastUrlChapter = urlParams.chapter;
				lastUrlProgress = urlParams.progress;
			} else if (savedProgress) {
				// Fallback to saved progress
				currentChapter = Math.min(savedProgress.chapterIndex, chapters.length - 1);
				// Track that we're loading from saved progress, not URL
				lastUrlChapter = 0; // Will be set to current chapter in $effect
				lastUrlProgress = Math.round(savedProgress.scrollPercent * 10000);
			} else {
				// No saved progress, starting fresh
				lastUrlChapter = 0;
				lastUrlProgress = 0;
			}
		} finally {
			loading = false;
		}
	});

	// React to URL param changes
	$effect(() => {
		if (isInitializing || chapters.length === 0 || !scrollContainer) return;

		const newChapter = urlParams.chapter;
		const newProgress = urlParams.progress;

		// Check if URL params changed from last known values
		if (newChapter !== lastUrlChapter || newProgress !== lastUrlProgress) {
			applyUrlPosition(newChapter, newProgress);
		}
	});

	// Restore scroll position after chapter content renders
	$effect(() => {
		// Track dependencies
		const chapter = currentChapter;
		const container = scrollContainer;
		const isInit = isInitializing;
		const fragment = pendingFragment;

		if (!container || chapters.length === 0 || !isInit) return;

		// Handle pending fragment
		if (fragment) {
			// Wait for DOM to settle
			requestAnimationFrame(() => {
				scrollToFragment(fragment);
				pendingFragment = null;
			});
		}

		// Get current URL state
		const urlSearchParams = $page.url.searchParams;
		const hasProgressParam = urlSearchParams.has('progress');
		const urlProgress = urlParams.progress;

		const clientWidth = container.clientWidth;
		const maxScroll = container.scrollWidth - container.clientWidth;

		let progressValue = 0;
		let hasSetScrollPosition = false;

		// Restore scroll position
		if (hasProgressParam && urlProgress >= 0) {
			// URL params take precedence
			const progressPercent = urlProgress / 10000;
			container.scrollLeft = maxScroll * progressPercent;
			progressValue = progressPercent;
			hasSetScrollPosition = true;
		} else if (savedProgress && chapter === savedProgress.chapterIndex) {
			// Restore from saved progress if on the same chapter
			container.scrollLeft = maxScroll * savedProgress.scrollPercent;
			progressValue = savedProgress.scrollPercent;
			hasSetScrollPosition = true;
		}

		// If we haven't set a scroll position, we're at chapter start (progress 0)
		// This is the default when opening a book without URL params or saved progress

		// Set initial URL if not already set from params
		const hasChapterParam = urlSearchParams.has('chapter');
		if (!hasChapterParam && !hasProgressParam) {
			// Always set URL on initial load
			updateUrl(chapter, progressValue, true);
		}

// Mark initialization complete
	setTimeout(() => {
		isInitializing = false;
	}, 100);
});

// Set up swipe handling when scroll container is available
$effect(() => {
	if (!scrollContainer) return;

	swipeHandler = createSwipeHandler(
		scrollContainer,
		{
			onSwipeLeft: () => {
				isUserSwiping = false;
				handleRightTap(); // Swipe left = go to next page (right tap direction)
			},
			onSwipeRight: () => {
				isUserSwiping = false;
				handleLeftTap(); // Swipe right = go to previous page (left tap direction)
			},
			onSwipeCancel: () => {
				isUserSwiping = false;
				// Scroll back to start position if swipe cancelled
				// (handled by CSS scroll-snap, but we could animate here)
			}
		}
	);

	safetyNet = createSafetyNet(
		scrollContainer,
		(targetScroll) => {
			// Only correct if not currently animating
			if (!isUserSwiping && !isChangingChapter) {
				animateScroll(scrollContainer!, targetScroll, 200);
			}
		}
	);

	swipeHandler.attach();
	safetyNet.attach();

	return () => {
		swipeHandler?.detach();
		safetyNet?.detach();
	};
});

function handleLeftTap() {
	if (!scrollContainer || isChangingChapter || isUserSwiping) return;

		// Check if we're at the beginning of the chapter
		if (scrollContainer.scrollLeft <= 0) {
			// Go to previous chapter if available
			if (currentChapter > 0) {
				isChangingChapter = true;
				currentChapter--;
				// Update URL immediately for chapter change
				updateUrl(currentChapter, 1, true); // 1 = 100% = end of chapter
				// Scroll to end of new chapter after it renders
				chapterRaf = requestAnimationFrame(() => {
					if (scrollContainer) {
						// Jump without animation for chapter changes
						jumpTo(scrollContainer, scrollContainer.scrollWidth);
					}
					// Allow navigation again after transition
					setTimeout(() => {
						isChangingChapter = false;
						chapterRaf = null;
					}, 100);
				});
			}
			return;
		}

		// Scroll left with smooth animation
		// animateScroll cancels any running animation and starts fresh
		const newScroll = scrollContainer.scrollLeft - scrollContainer.clientWidth;
		animateScroll(scrollContainer, Math.max(0, newScroll), 250);
	}

function handleRightTap() {
	if (!scrollContainer || isChangingChapter || isUserSwiping) return;

		const maxScroll = scrollContainer.scrollWidth - scrollContainer.clientWidth;

		// Check if we're at the end of the chapter
		if (scrollContainer.scrollLeft >= maxScroll - 1) {
			// Go to next chapter if available
			if (currentChapter < chapters.length - 1) {
				isChangingChapter = true;
				currentChapter++;
				// Update URL immediately for chapter change
				updateUrl(currentChapter, 0, true); // 0 = start of chapter
				// Scroll to beginning of new chapter after it renders
				chapterRaf = requestAnimationFrame(() => {
					if (scrollContainer) {
						// Jump without animation for chapter changes
						jumpTo(scrollContainer, 0);
					}
					// Allow navigation again after transition
					setTimeout(() => {
						isChangingChapter = false;
						chapterRaf = null;
					}, 100);
				});
			}
			return;
		}

		// Scroll right with smooth animation
		// animateScroll cancels any running animation and starts fresh
		const newScroll = scrollContainer.scrollLeft + scrollContainer.clientWidth;
		animateScroll(scrollContainer, Math.min(maxScroll, newScroll), 250);
	}

function handleCenterTap() {
	showOverlay = !showOverlay;
}

function handleContentClick(event: MouseEvent) {
		const target = event.target as HTMLElement;
		const link = target.closest('a');

		if (link) {
			// Handle internal links
			if (link.classList.contains('internal-link')) {
				event.preventDefault();
				event.stopPropagation();

				const chapterAttr = link.getAttribute('data-chapter');
				const fragmentAttr = link.getAttribute('data-fragment');

				if (chapterAttr) {
					const targetChapter = parseInt(chapterAttr, 10);

					if (targetChapter !== currentChapter) {
						// Navigate to different chapter
						currentChapter = targetChapter;

						// If fragment exists, scroll after chapter loads
						if (fragmentAttr) {
							pendingFragment = fragmentAttr;
						}

						// Update URL
						updateUrl(targetChapter, 0, true);
					} else if (fragmentAttr) {
						// Same chapter, just scroll to fragment
						scrollToFragment(fragmentAttr);
					}
				}
				return;
			}

			// Handle missing links
			if (link.classList.contains('missing-link')) {
				event.preventDefault();
				event.stopPropagation();

				const originalHref = link.getAttribute('data-original-href') || 'unknown';
				linkErrorInfo = {
					originalHref,
					message: `This link points to "${originalHref}" which is not available in this book.`
				};
				showLinkError = true;
				return;
			}

			// External links - let browser handle with target="_blank"
			if (link.classList.contains('external-link')) {
				// Browser will handle due to target="_blank"
				return;
			}
		}

		// Original tap zone logic
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const x = event.clientX - rect.left;
		const relativeX = x / rect.width;

		if (relativeX < 0.33) {
			handleLeftTap();
		} else if (relativeX < 0.67) {
			handleCenterTap();
		} else {
			handleRightTap();
		}
	}

	function scrollToFragment(fragmentId: string) {
		if (!scrollContainer) return;

		const element = scrollContainer.querySelector(`#${CSS.escape(fragmentId)}`);
		if (element) {
			// Scroll to element
			element.scrollIntoView({ behavior: 'smooth', inline: 'start' });

			// Update URL with fragment for sharing
			const url = new URL($page.url);
			url.searchParams.set('fragment', fragmentId);
			goto(url.toString(), { replaceState: true, keepFocus: true });
		}
	}

function handleScroll() {
		if (!scrollContainer || !bookId || isInitializing) return;

		const percent = calculateScrollPercent(
			scrollContainer.scrollLeft,
			scrollContainer.scrollWidth,
			scrollContainer.clientWidth
		);

		// Update URL with current position (using progress for font-independent sharing)
		updateUrl(currentChapter, percent);

		// Debounced save
		debouncedSaveProgress(bookId, currentChapter, percent);
	}

	let debounceTimer: ReturnType<typeof setTimeout>;
	function debouncedSaveProgress(bookId: string, chapterIndex: number, scrollPercent: number) {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			saveProgress({
				bookId,
				chapterIndex,
				scrollPercent,
				lastReadAt: new Date()
			});
		}, 300);
	}

	function goBack() {
		goto('/');
	}
</script>

<div class="reader">
	{#if loading}
		<div class="loading" data-testid="reader-loading">Loading...</div>
	{:else if book}
		<div class="reader-container">
			{#if chapters.length > 0}
				<div
					class="content"
					bind:this={scrollContainer}
					onscroll={handleScroll}
					onclick={handleContentClick}
					data-testid="reader-content"
				>
					{@html chapters[currentChapter]?.content}
				</div>
			{/if}

{#if showOverlay}
			<div class="overlay" transition:fade={{ duration: 200 }}>
				<button class="back-button" onclick={goBack} aria-label="Go back">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M19 12H5M12 19l-7-7 7-7" />
					</svg>
				</button>
			</div>
		{/if}

		{#if showLinkError && linkErrorInfo}
			<div class="link-error-popup" data-testid="link-error-popup" transition:fade={{ duration: 200 }}>
				<div class="popup-content">
					<h3>Link Not Available</h3>
					<p>{linkErrorInfo.message}</p>
					<p class="debug-info">Original link: {linkErrorInfo.originalHref}</p>
					<button onclick={() => showLinkError = false}>Close</button>
				</div>
			</div>
		{/if}
		</div>
	{/if}
</div>

<style>
	.reader {
		position: fixed;
		inset: 0;
		background: var(--color-readerBackground);
	}

	.loading {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		font-size: 1.5rem;
		color: var(--color-readerText);
	}

	.reader-container {
		position: relative;
		width: 100%;
		height: 100%;
	}

	.content {
		height: 100vh;
		column-width: calc(100vw - 2rem);
		column-gap: 0;
		overflow-x: scroll;
		overflow-y: hidden;
		scroll-snap-type: x mandatory;
		scroll-snap-stop: always;
		padding: 0;
		box-sizing: border-box;
		line-height: 1.6;
		background: var(--color-readerBackground);
		color: var(--color-readerText);
		font-size: var(--font-size-reader-text, 1.5rem);
		/* Use JS-based animation, not CSS smooth scroll */
		scroll-behavior: auto;
	}

	.content :global(> *) {
		padding: var(--reader-content-padding, 1rem);
		margin: 0;
	}

	.content :global(p),
	.content :global(span),
	.content :global(div) {
		color: var(--color-readerText) !important;
		background: transparent !important;
	}

	.content :global(img) {
		filter: var(--image-filter, none);
		max-width: 100%;
		height: auto;
	}

	.overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		padding: 1rem;
		display: flex;
		align-items: center;
		background: linear-gradient(to bottom, rgba(0, 0, 0, 0.5), transparent);
		z-index: 20;
	}

	.back-button {
		background: white;
		border: none;
		border-radius: 50%;
		width: 44px;
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
	}

	.back-button:hover {
		background: #f5f5f5;
	}

	.link-error-popup {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}

	.popup-content {
		background: white;
		padding: 1.5rem;
		border-radius: 8px;
		max-width: 80%;
		text-align: center;
	}

	.popup-content h3 {
		margin-top: 0;
		color: #d32f2f;
	}

	.debug-info {
		font-family: monospace;
		font-size: 0.85rem;
		color: #666;
		background: #f5f5f5;
		padding: 0.5rem;
		border-radius: 4px;
		margin: 1rem 0;
		word-break: break-all;
	}

	.popup-content button {
		background: #4a9eff;
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 1rem;
	}
</style>
