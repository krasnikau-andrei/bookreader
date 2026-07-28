<script lang="ts">
	import { tick } from 'svelte';
	import { createSwipeHandler } from '$lib/reader/swipe';
	import { createSafetyNet } from '$lib/reader/safety-net';
	import { createScrollRestore } from '$lib/reader/scroll-restore';
	import { createProgressSaver } from '$lib/reader/progress-saver';
	import { animateScroll, jumpTo } from '$lib/reader/animation';
	import { calculateScrollPercent } from '$lib/reader/pagination';
	import type { Chapter } from '$lib/types';
	import ImageFullscreen from './ImageFullscreen.svelte';

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
	let isAnimatingScroll = $state(false);
	let isFragmentNavigation = $state(false);
	let isUserSwiping = false;
	let isSelecting = false;
	let swipeStartScrollLeft = 0;
	let isUpdatingUrl = false;
	let swipeHandler: ReturnType<typeof createSwipeHandler> | null = null;
	let safetyNet: ReturnType<typeof createSafetyNet> | null = null;
	let fullscreenSrc: string | null = $state(null);

	const scrollRestore = createScrollRestore(() => isChangingChapter);
	const progressSaver = createProgressSaver({
		bookId: () => bookId,
		chapterIndex: () => currentChapter,
		container: () => scrollContainer,
		isChangingChapter: () => isChangingChapter
	});

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
				if (!scrollContainer) return;
				// Don't snap scroll back if user has selected text (vertical drag)
				const sel = window.getSelection();
				if (sel && !sel.isCollapsed) return;
				animateScroll(scrollContainer, swipeStartScrollLeft, 200);
			},
			shouldSkipSwipe: (event: TouchEvent) => {
				const target = event.target as HTMLElement;
				const wrapper = target.closest('.table-scroll-wrapper');
				if (!wrapper) return false;
				return wrapper.scrollWidth > wrapper.clientWidth;
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
		// This effect re-runs when content, currentChapter, or initialProgress changes
		const _content = content;
		const _progress = initialProgress;
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const _reactiveChapter = currentChapter; // Used to make effect reactive to chapter changes

		if (!scrollContainer || !_content) return;

		// Skip restore if fragment navigation will handle scrolling
		// (isFragmentNavigation is set synchronously in the fragment effect body)
		if (isFragmentNavigation) return;

		scrollRestore.restore(scrollContainer, _progress);
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
				progressSaver.cancelPending();
				// Don't let the $effect restore scroll - we'll handle it manually
				scrollRestore.skipNextRestore();
				// Pass progress=1 to open previous chapter at the end
				onChapterChange(prevChapter, 1);
				onUrlUpdate(prevChapter, 1);

				requestAnimationFrame(() => {
					if (scrollContainer) {
						jumpTo(scrollContainer, scrollContainer.scrollWidth);
					}
					setTimeout(() => {
						isChangingChapter = false;
						// Save progress for the new chapter after transition completes
						progressSaver.saveNow(prevChapter, 1);
					}, 100);
				});
			}
			return;
		}

		const newScroll = currentScroll - scrollContainer.clientWidth;
		const targetScroll = Math.max(0, newScroll);
		const targetPercent = calculateScrollPercent(
			targetScroll,
			scrollContainer.scrollWidth,
			scrollContainer.clientWidth
		);
		onUrlUpdate(currentChapter, targetPercent);
		isAnimatingScroll = true;
		animateScroll(scrollContainer, targetScroll, 250);
		setTimeout(() => {
			isAnimatingScroll = false;
			progressSaver.saveNow(currentChapter, targetPercent);
		}, 250);
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
				progressSaver.cancelPending();
				// Pass progress=0 to open next chapter at the beginning
				onChapterChange(nextChapter, 0);
				onUrlUpdate(nextChapter, 0);

				requestAnimationFrame(() => {
					if (scrollContainer) {
						jumpTo(scrollContainer, 0);
					}
					setTimeout(() => {
						isChangingChapter = false;
						// Save progress for the new chapter after transition completes
						progressSaver.saveNow(nextChapter, 0);
					}, 100);
				});
			}
			return;
		}

		const newScroll = currentScroll + scrollContainer.clientWidth;
		const targetScroll = Math.min(maxScroll, newScroll);
		const targetPercent = calculateScrollPercent(
			targetScroll,
			scrollContainer.scrollWidth,
			scrollContainer.clientWidth
		);
		onUrlUpdate(currentChapter, targetPercent);
		isAnimatingScroll = true;
		animateScroll(scrollContainer, targetScroll, 250);
		setTimeout(() => {
			isAnimatingScroll = false;
			progressSaver.saveNow(currentChapter, targetPercent);
		}, 250);
	}

	function handleContentClick(event: MouseEvent) {
		if (swipeHandler?.hasSwiped()) return;

		if (showOverlay || showToc) {
			onCloseMenus();
			return;
		}

		const target = event.target as HTMLElement;

		const tableWrapper = target.closest('.table-scroll-wrapper');
		if (tableWrapper && tableWrapper.scrollWidth > tableWrapper.clientWidth) {
			return;
		}

		if (target.tagName === 'IMG') {
			event.preventDefault();
			event.stopPropagation();
			fullscreenSrc = (target as HTMLImageElement).src;
			return;
		}

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

	function handleScroll() {
		if (!scrollContainer || isUpdatingUrl || isChangingChapter || isAnimatingScroll || isSelecting)
			return;

		// Suppress stale scroll events during the post-restore guard period
		// (iOS Safari auto-scroll-restore); the correct position is re-applied inside.
		if (scrollRestore.guardScroll(scrollContainer)) return;

		const percent = calculateScrollPercent(
			scrollContainer.scrollLeft,
			scrollContainer.scrollWidth,
			scrollContainer.clientWidth
		);

		onUrlUpdate(currentChapter, percent);

		// Only save progress when not transitioning between chapters
		// to avoid race conditions where we save the old chapter with the new scroll position
		if (!isChangingChapter) {
			progressSaver.schedule(currentChapter, percent);
		}
	}

	// Flush any in-flight debounced save when the user switches apps
	$effect(() => {
		progressSaver.attach();
		return () => progressSaver.detach();
	});

	// Wrap tables in scrollable containers for horizontal scrolling
	$effect(() => {
		const _content = content;
		if (!scrollContainer || !_content) return;

		tick().then(() => {
			scrollContainer!.querySelectorAll('table').forEach((table) => {
				if (table.parentElement?.classList.contains('table-scroll-wrapper')) return;
				const wrapper = document.createElement('div');
				wrapper.className = 'table-scroll-wrapper';
				table.parentNode?.insertBefore(wrapper, table);
				wrapper.appendChild(table);
			});
		});
	});

	// Track text selection state to suppress scroll processing during selection
	$effect(() => {
		function onChange() {
			const sel = window.getSelection();
			isSelecting = sel !== null && !sel.isCollapsed;
		}
		document.addEventListener('selectionchange', onChange);
		return () => document.removeEventListener('selectionchange', onChange);
	});

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
	data-testid="reader-content"
>
	<div class="content-inner">
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html content}
	</div>
</div>

{#if fullscreenSrc}
	<ImageFullscreen src={fullscreenSrc} onClose={() => (fullscreenSrc = null)} />
{/if}

<style>
	.content {
		height: 100dvh;
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
		touch-action: pan-x;
		overscroll-behavior: none;
	}

	.content-inner {
		padding: 0 var(--reader-gap-sides);
		overflow-x: visible;
		-webkit-box-decoration-break: clone;
		box-decoration-break: clone;
	}

	.content :global(p),
	.content :global(span),
	.content :global(div) {
		color: var(--color-readerText) !important;
		background: transparent !important;
	}

	.content :global(p),
	.content :global(div) {
		text-indent: 1.5em;
		text-align: justify !important;
		hyphens: auto !important;
		overflow-wrap: break-word;
		padding-top: 0;
		padding-bottom: 0;
		margin-top: 0;
		margin-bottom: 0;
	}

	.content :global(p img) {
		display: block;
		margin: 0 auto;
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
		display: block;
		margin: 0 auto;
		filter: var(--image-filter);
		max-width: 100% !important;
		height: auto !important;
		-webkit-user-drag: none;
	}

	.content :global(svg) {
		display: block;
		margin: 0 auto;
		text-indent: 0;
	}

	.content :global(figure),
	.content :global(picture) {
		max-width: 100% !important;
		margin: 0 !important;
	}

	.content :global(.subchapter-start) {
		break-before: column;
	}

	.content :global(.table-scroll-wrapper) {
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		margin: 1em auto;
		width: fit-content;
		max-width: 100%;
	}

	.content :global(table) {
		border-collapse: collapse;
		margin: 0;
		font-size: 0.9em;
	}

	.content :global(td),
	.content :global(th) {
		border: 1px solid var(--color-accent);
		padding: 0.3em 0.6em;
	}

	.content :global(td p),
	.content :global(th p) {
		text-indent: 0;
		text-align: left;
	}

	.content :global(th) {
		font-weight: bold;
		text-align: center;
	}

	.content :global(a:has(sup)) {
		color: inherit;
		text-decoration: none;
	}

	.content :global(sup) {
		font-size: 0.6em;
	}
</style>
