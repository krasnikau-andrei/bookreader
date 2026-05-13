<script lang="ts">
	import { tick } from 'svelte';
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
		language?: string;
		fragment?: string | null;
		showOverlay?: boolean;
		showToc?: boolean;
		onChapterChange: (chapter: number, progress?: number) => void;
		onUrlUpdate: (chapter: number, progress: number) => void;
		onCenterTap: () => void;
		onCloseMenus: () => void;
		onFragmentNavigate?: (fragment: string) => void;
	}

	let {
		bookId,
		chapters,
		currentChapter,
		content,
		initialProgress = 0,
		language = 'en',
		fragment = null,
		showOverlay = false,
		showToc = false,
		onChapterChange,
		onUrlUpdate,
		onCenterTap,
		onCloseMenus,
		onFragmentNavigate
	}: Props = $props();

	let scrollContainer: HTMLDivElement | null = $state(null);
	let isChangingChapter = $state(false);
	let isFragmentNavigation = $state(false);
	/* eslint-disable @typescript-eslint/no-unused-vars */
	let chapterRaf: number | null = null;
	/* eslint-enable @typescript-eslint/no-unused-vars */
	let isUserSwiping = false;
	let swipeStartScrollLeft = 0;
	let isUpdatingUrl = false;
	let swipeHandler: ReturnType<typeof createSwipeHandler> | null = null;
	let safetyNet: ReturnType<typeof createSafetyNet> | null = null;
	let debounceTimer: ReturnType<typeof setTimeout>;

	$effect(() => {
		if (!scrollContainer) return;

		swipeHandler = createSwipeHandler(scrollContainer, {
			onSwipeStart: () => {
				isUserSwiping = true;
				swipeStartScrollLeft = scrollContainer!.scrollLeft;
			},
			onSwipeLeft: () => {
				isUserSwiping = false;
				handleRightTap(swipeStartScrollLeft);
			},
			onSwipeRight: () => {
				isUserSwiping = false;
				handleLeftTap(swipeStartScrollLeft);
			},
			onSwipeCancel: () => {
				isUserSwiping = false;
				if (scrollContainer) {
					animateScroll(scrollContainer, swipeStartScrollLeft, 200);
				}
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

	// Track if we should apply initialProgress to scroll
	let shouldRestoreScroll = $state(true);

	// Restore scroll position when content changes (e.g., on mount or chapter change)
	$effect(() => {
		// This effect re-runs when content, currentChapter, or initialProgress changes
		const _content = content;
		const _progress = initialProgress;
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const _reactiveChapter = currentChapter; // Used to make effect reactive to chapter changes

		if (!scrollContainer || !_content) return;

		const container = scrollContainer;

		// Wait for DOM to update and content to render
		tick().then(() => {
			requestAnimationFrame(() => {
				if (!container) return;

				// Skip restore if fragment navigation will handle scrolling
				// (isFragmentNavigation is set synchronously in the fragment effect body)
				if (isFragmentNavigation) return;

				// Only apply scroll if we should restore it
				// (not when handleLeftTap/handleRightTap just set it)
				if (shouldRestoreScroll) {
					const maxScroll = container.scrollWidth - container.clientWidth;
					const targetScroll = Math.round(maxScroll * _progress);
					jumpTo(container, targetScroll);
				}
				// Reset for next time
				shouldRestoreScroll = true;
			});
		});
	});

	function handleLeftTap(baseScrollLeft?: number) {
		if (showOverlay || showToc) {
			onCloseMenus();
			return;
		}

		if (!scrollContainer || isChangingChapter || isUserSwiping) return;

		const currentScroll = baseScrollLeft ?? scrollContainer.scrollLeft;

		if (currentScroll <= 0) {
			if (currentChapter > 0) {
				const prevChapter = currentChapter - 1;
				isChangingChapter = true;
				// Clear any pending debounced saves to prevent race conditions
				clearTimeout(debounceTimer);
				// Don't let the $effect restore scroll - we'll handle it manually
				shouldRestoreScroll = false;
				// Pass progress=1 to open previous chapter at the end
				onChapterChange(prevChapter, 1);
				onUrlUpdate(prevChapter, 1);

				chapterRaf = requestAnimationFrame(() => {
					if (scrollContainer) {
						jumpTo(scrollContainer, scrollContainer.scrollWidth);
					}
					setTimeout(() => {
						isChangingChapter = false;
						chapterRaf = null;
						// Save progress for the new chapter after transition completes
						saveProgress({
							bookId,
							chapterIndex: prevChapter,
							scrollPercent: 1,
							lastReadAt: new Date()
						});
					}, 100);
				});
			}
			return;
		}

		const newScroll = currentScroll - scrollContainer.clientWidth;
		animateScroll(scrollContainer, Math.max(0, newScroll), 250);
	}

	function handleRightTap(baseScrollLeft?: number) {
		if (showOverlay || showToc) {
			onCloseMenus();
			return;
		}

		if (!scrollContainer || isChangingChapter || isUserSwiping) return;

		const maxScroll = scrollContainer.scrollWidth - scrollContainer.clientWidth;
		const currentScroll = baseScrollLeft ?? scrollContainer.scrollLeft;

		if (currentScroll >= maxScroll - 1) {
			if (currentChapter < chapters.length - 1) {
				const nextChapter = currentChapter + 1;
				isChangingChapter = true;
				// Clear any pending debounced saves to prevent race conditions
				clearTimeout(debounceTimer);
				// Pass progress=0 to open next chapter at the beginning
				onChapterChange(nextChapter, 0);
				onUrlUpdate(nextChapter, 0);

				chapterRaf = requestAnimationFrame(() => {
					if (scrollContainer) {
						jumpTo(scrollContainer, 0);
					}
					setTimeout(() => {
						isChangingChapter = false;
						chapterRaf = null;
						// Save progress for the new chapter after transition completes
						saveProgress({
							bookId,
							chapterIndex: nextChapter,
							scrollPercent: 0,
							lastReadAt: new Date()
						});
					}, 100);
				});
			}
			return;
		}

		const newScroll = currentScroll + scrollContainer.clientWidth;
		animateScroll(scrollContainer, Math.min(maxScroll, newScroll), 250);
	}

	function handleContentClick(event: MouseEvent) {
		if (swipeHandler?.hasSwiped()) return;

		if (showOverlay || showToc) {
			onCloseMenus();
			return;
		}

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
		if (!scrollContainer || isUpdatingUrl || isChangingChapter) return;

		const percent = calculateScrollPercent(
			scrollContainer.scrollLeft,
			scrollContainer.scrollWidth,
			scrollContainer.clientWidth
		);

		onUrlUpdate(currentChapter, percent);

		// Only save progress when not transitioning between chapters
		// to avoid race conditions where we save the old chapter with the new scroll position
		if (!isChangingChapter) {
			debouncedSaveProgress(currentChapter, percent);
		}
	}

	function debouncedSaveProgress(chapterIndex: number, scrollPercent: number) {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			saveProgress({ bookId, chapterIndex, scrollPercent, lastReadAt: new Date() });
		}, 300);
	}

	$effect(() => {
		const frag = fragment;
		if (!frag || !scrollContainer) return;

		isFragmentNavigation = true;

		tick().then(() => {
			requestAnimationFrame(() => {
				if (!scrollContainer) return;
				const el = document.getElementById(frag);
				if (!el) {
					isFragmentNavigation = false;
					return;
				}

				const containerRect = scrollContainer.getBoundingClientRect();
				const elRect = el.getBoundingClientRect();

				const relativeLeft = elRect.left - containerRect.left + scrollContainer.scrollLeft;
				const columnWidth = scrollContainer.clientWidth;
				const targetScroll = Math.floor(relativeLeft / columnWidth) * columnWidth;

				jumpTo(scrollContainer, targetScroll);
				isFragmentNavigation = false;
			});
		});
	});
</script>

<div
	class="content"
	lang={language}
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
		padding: var(--reader-gap-top) 0 var(--reader-gap-bottom);
		box-sizing: border-box;
		line-height: 1.6;
		background: var(--color-readerBackground);
		color: var(--color-readerText);
		font-family: 'Literata', serif;
		font-size: var(--font-size-reader-text);
		scroll-behavior: auto;
	}

	/* Side gap on children, not on .content — putting it on .content would shift
	   scrollLeft by padding-left, breaking scrollContainer.scrollLeft <= 0
	   as the chapter-boundary check in handleLeftTap/handleRightTap */
	.content :global(> *) {
		padding: 0 var(--reader-gap-sides);
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
		hyphens: auto;
		overflow-wrap: break-word;
		padding-top: 0;
		padding-bottom: 0;
		margin-top: 0;
		margin-bottom: 0;
	}

	.content :global(h1),
	.content :global(h2),
	.content :global(h3),
	.content :global(h4),
	.content :global(h5),
	.content :global(h6) {
		text-align: center;
	}

	.content :global(img) {
		filter: var(--image-filter);
		max-width: 100%;
		height: auto;
		-webkit-user-drag: none;
	}

	.content :global(.subchapter-start) {
		break-before: column;
	}
</style>
