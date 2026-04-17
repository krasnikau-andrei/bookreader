<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import TapZones from '$lib/reader/TapZones.svelte';
	import { calculateScrollPercent } from '$lib/reader/pagination';
	import { getBook, saveProgress, getProgress } from '$lib/storage';
	import type { Book, Chapter } from '$lib/types';

	let book: Book | undefined = $state();
	let chapters: Chapter[] = $state([]);
	let currentChapter = $state(0);
	let scrollContainer: HTMLDivElement | null = $state(null);
	let showOverlay = $state(false);
	let loading = $state(true);
	let bookId = $derived($page.params.bookId);

	onMount(async () => {
		try {
			book = await getBook(bookId);
			if (!book) {
				goto('/');
				return;
			}

			// Parse EPUB to get chapters
			const { parseEpubChapters } = await import('$lib/parsers/epub');
			chapters = await parseEpubChapters(book.fileData);

			// Load saved progress
			const progress = await getProgress(bookId);
			if (progress) {
				currentChapter = Math.min(progress.chapterIndex, chapters.length - 1);
			}

			// Restore scroll position after content renders
			if (scrollContainer && progress) {
				requestAnimationFrame(() => {
					const maxScroll = scrollContainer!.scrollWidth - scrollContainer!.clientWidth;
					scrollContainer!.scrollLeft = maxScroll * progress.scrollPercent;
				});
			}
		} finally {
			loading = false;
		}
	});

	function handleLeftTap() {
		if (!scrollContainer) return;

		// Check if we're at the beginning of the chapter
		if (scrollContainer.scrollLeft <= 0) {
			// Go to previous chapter if available
			if (currentChapter > 0) {
				currentChapter--;
				// Scroll to end of new chapter after it renders
				requestAnimationFrame(() => {
					if (scrollContainer) {
						scrollContainer.scrollLeft = scrollContainer.scrollWidth;
					}
				});
			}
			return;
		}

		// Scroll left within current chapter
		const newScroll = scrollContainer.scrollLeft - scrollContainer.clientWidth;
		scrollContainer.scrollTo({ left: Math.max(0, newScroll), behavior: 'smooth' });
	}

	function handleRightTap() {
		if (!scrollContainer) return;

		const maxScroll = scrollContainer.scrollWidth - scrollContainer.clientWidth;

		// Check if we're at the end of the chapter
		if (scrollContainer.scrollLeft >= maxScroll - 1) {
			// Go to next chapter if available
			if (currentChapter < chapters.length - 1) {
				currentChapter++;
				// Scroll to beginning of new chapter after it renders
				requestAnimationFrame(() => {
					if (scrollContainer) {
						scrollContainer.scrollLeft = 0;
					}
				});
			}
			return;
		}

		// Scroll right within current chapter
		const newScroll = scrollContainer.scrollLeft + scrollContainer.clientWidth;
		scrollContainer.scrollTo({ left: Math.min(maxScroll, newScroll), behavior: 'smooth' });
	}

	function handleCenterTap() {
		showOverlay = !showOverlay;
	}

	function handleScroll() {
		if (!scrollContainer || !bookId) return;

		const percent = calculateScrollPercent(
			scrollContainer.scrollLeft,
			scrollContainer.scrollWidth,
			scrollContainer.clientWidth
		);

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
					data-testid="reader-content"
				>
					{@html chapters[currentChapter]?.content}
				</div>
			{/if}

			<TapZones
				onLeftTap={handleLeftTap}
				onCenterTap={handleCenterTap}
				onRightTap={handleRightTap}
			/>

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
	}

	.content :global(*) {
		scroll-snap-align: start;
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
</style>
