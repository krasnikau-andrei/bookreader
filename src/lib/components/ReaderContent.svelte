<script lang="ts">
	import { createSwipeHandler } from '$lib/reader/swipe';
	import { createSafetyNet } from '$lib/reader/safety-net';
	import { animateScroll, jumpTo } from '$lib/reader/animation';
	import { calculateScrollPercent } from '$lib/reader/pagination';
	import { saveProgress } from '$lib/storage';
	import type { Chapter } from '$lib/types';

	interface Props {
		bookId: string;
		chapters: Chapter[];
		currentChapter: number;
		content: string;
		initialProgress?: number;
		onChapterChange: (chapter: number) => void;
		onUrlUpdate: (chapter: number, progress: number) => void;
		onCenterTap: () => void;
		onFragmentNavigate?: (fragment: string) => void;
	}

	let {
		bookId,
		chapters,
		currentChapter,
		content,
		initialProgress = 0,
		onChapterChange,
		onUrlUpdate,
		onCenterTap,
		onFragmentNavigate
	}: Props = $props();

	let scrollContainer: HTMLDivElement | null = $state(null);
	let isChangingChapter = false;
	/* eslint-disable @typescript-eslint/no-unused-vars */
	let chapterRaf: number | null = null;
	/* eslint-enable @typescript-eslint/no-unused-vars */
	let isUserSwiping = false;
	let isUpdatingUrl = false;
	let swipeHandler: ReturnType<typeof createSwipeHandler> | null = null;
	let safetyNet: ReturnType<typeof createSafetyNet> | null = null;
	let debounceTimer: ReturnType<typeof setTimeout>;

	$effect(() => {
		if (!scrollContainer) return;

		swipeHandler = createSwipeHandler(scrollContainer, {
			onSwipeStart: () => {
				isUserSwiping = true;
			},
			onSwipeLeft: () => {
				isUserSwiping = false;
				handleRightTap();
			},
			onSwipeRight: () => {
				isUserSwiping = false;
				handleLeftTap();
			},
			onSwipeCancel: () => {
				isUserSwiping = false;
			}
		});

		safetyNet = createSafetyNet(scrollContainer, (targetScroll) => {
			if (!isUserSwiping && !isChangingChapter) {
				animateScroll(scrollContainer!, targetScroll, 200);
			}
		});

		swipeHandler.attach();
		safetyNet.attach();

		return () => {
			swipeHandler?.detach();
			safetyNet?.detach();
		};
	});

	// Restore scroll position when content changes (e.g., on mount or chapter change)
	$effect(() => {
		if (!scrollContainer || !content) return;

		// Capture current values to avoid re-triggering
		const progressToRestore = initialProgress;
		const container = scrollContainer;

		// Wait for content to render
		requestAnimationFrame(() => {
			if (!container) return;

			// Always set scroll position, even if it's 0
			// When progressToRestore is 0, we should reset to beginning
			// (important for chapter changes via TOC)
			const maxScroll = container.scrollWidth - container.clientWidth;
			const targetScroll = Math.round(maxScroll * progressToRestore);
			jumpTo(container, targetScroll);
		});
	});

	function handleLeftTap() {
		if (!scrollContainer || isChangingChapter || isUserSwiping) return;

		if (scrollContainer.scrollLeft <= 0) {
			if (currentChapter > 0) {
				isChangingChapter = true;
				onChapterChange(currentChapter - 1);
				onUrlUpdate(currentChapter - 1, 1);

				chapterRaf = requestAnimationFrame(() => {
					if (scrollContainer) {
						jumpTo(scrollContainer, scrollContainer.scrollWidth);
					}
					setTimeout(() => {
						isChangingChapter = false;
						chapterRaf = null;
					}, 100);
				});
			}
			return;
		}

		const newScroll = scrollContainer.scrollLeft - scrollContainer.clientWidth;
		animateScroll(scrollContainer, Math.max(0, newScroll), 250);
	}

	function handleRightTap() {
		if (!scrollContainer || isChangingChapter || isUserSwiping) return;

		const maxScroll = scrollContainer.scrollWidth - scrollContainer.clientWidth;

		if (scrollContainer.scrollLeft >= maxScroll - 1) {
			if (currentChapter < chapters.length - 1) {
				isChangingChapter = true;
				onChapterChange(currentChapter + 1);
				onUrlUpdate(currentChapter + 1, 0);

				chapterRaf = requestAnimationFrame(() => {
					if (scrollContainer) {
						jumpTo(scrollContainer, 0);
					}
					setTimeout(() => {
						isChangingChapter = false;
						chapterRaf = null;
					}, 100);
				});
			}
			return;
		}

		const newScroll = scrollContainer.scrollLeft + scrollContainer.clientWidth;
		animateScroll(scrollContainer, Math.min(maxScroll, newScroll), 250);
	}

	function handleContentClick(event: MouseEvent) {
		if (swipeHandler?.hasSwiped()) return;

		const target = event.target as HTMLElement;
		const link = target.closest('a');

		if (link) {
			if (link.classList.contains('internal-link')) {
				event.preventDefault();
				event.stopPropagation();

				const chapterAttr = link.getAttribute('data-chapter');
				const fragmentAttr = link.getAttribute('data-fragment');

				if (chapterAttr) {
					const targetChapter = parseInt(chapterAttr, 10);
					if (targetChapter !== currentChapter) {
						onChapterChange(targetChapter);
						if (fragmentAttr && onFragmentNavigate) {
							onFragmentNavigate(fragmentAttr);
						}
						onUrlUpdate(targetChapter, 0);
					} else if (fragmentAttr && onFragmentNavigate) {
						onFragmentNavigate(fragmentAttr);
					}
				}
				return;
			}
			return;
		}

		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const x = event.clientX - rect.left;
		const relativeX = x / rect.width;

		if (relativeX < 0.33) {
			handleLeftTap();
		} else if (relativeX < 0.67) {
			onCenterTap();
		} else {
			handleRightTap();
		}
	}

	function handleContentMouseDown() {
		swipeHandler?.resetSwipe();
	}

	function handleScroll() {
		if (!scrollContainer || isUpdatingUrl) return;

		const percent = calculateScrollPercent(
			scrollContainer.scrollLeft,
			scrollContainer.scrollWidth,
			scrollContainer.clientWidth
		);

		onUrlUpdate(currentChapter, percent);
		debouncedSaveProgress(currentChapter, percent);
	}

	function debouncedSaveProgress(chapterIndex: number, scrollPercent: number) {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			saveProgress({ bookId, chapterIndex, scrollPercent, lastReadAt: new Date() });
		}, 300);
	}
</script>

<div
	class="content"
	bind:this={scrollContainer}
	onscroll={handleScroll}
	onclick={handleContentClick}
	onmousedown={handleContentMouseDown}
	data-testid="reader-content"
>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html content}
</div>

<style>
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

	.content :global(p) {
		text-indent: 1.5em;
		text-align: justify;
		text-align-last: left;
		hyphens: auto;
		overflow-wrap: break-word;
		padding-top: 0;
		padding-bottom: 0;
		margin-top: 0;
		margin-bottom: 0;
	}

	.content :global(img) {
		filter: var(--image-filter, none);
		max-width: 100%;
		height: auto;
	}
</style>
