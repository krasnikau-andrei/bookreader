<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import {
		getBook,
		getBookFile,
		getProgress,
		saveProgress,
		getChapterCache,
		saveChapterCache
	} from '$lib/storage';
	import BookProgressBar from '$lib/components/BookProgressBar.svelte';
	import { calculateBookProgress, measureChapterContent } from '$lib/reader/progress';
	import { cache } from '$lib/library-cache.svelte';
	import ReaderContent from '$lib/components/ReaderContent.svelte';
	import ReaderOverlay from '$lib/components/ReaderOverlay.svelte';
	import TableOfContents from '$lib/components/TableOfContents.svelte';
	import type { Book, Chapter } from '$lib/types';

	// Core state
	let book: Book | undefined = $state();
	let chapters: Chapter[] = $state([]);
	let currentChapter = $state(0);
	let showOverlay = $state(false);
	let showToc = $state(false);
	let showLoadingFallback = $state(false);
	let bookId = $derived($page.params.bookId);

	let pendingFragment: string | null = $state(null);

	// Progress tracking
	let savedProgress: { chapterIndex: number; scrollPercent: number } | null = $state(null);
	let isUpdatingUrl = false;
	let progressChapterSizes: number[] | undefined = $state();
	let currentScrollPercent = $state(0);

	// Show "Loading..." fallback if content takes more than 500ms
	$effect(() => {
		if (chapters.length > 0) return;
		const timer = setTimeout(() => {
			showLoadingFallback = true;
		}, 500);
		return () => clearTimeout(timer);
	});

	onMount(async () => {
		try {
			if (!bookId) {
				// eslint-disable-next-line svelte/no-navigation-without-resolve
				goto('/');
				return;
			}

			book = await getBook(bookId);
			if (!book) {
				// eslint-disable-next-line svelte/no-navigation-without-resolve
				goto('/');
				return;
			}

			// Try cache first — skips expensive ZIP + DOM parse on repeat opens
			const cachedChapters = await getChapterCache(bookId);
			if (cachedChapters) {
				chapters = cachedChapters;
			} else {
				const fileData = await getBookFile(bookId);
				if (!fileData) {
					// eslint-disable-next-line svelte/no-navigation-without-resolve
					goto('/');
					return;
				}

				const { parseEpubChapters } = await import('$lib/parsers/epub');
				const result = await parseEpubChapters(fileData);
				chapters = result.chapters;

				// Cache parsed chapters for instant open next time
				saveChapterCache(bookId, chapters).catch((e) =>
					console.warn('[STORAGE] Failed to cache chapters:', e)
				);
			}

			// Fetch saved progress from storage
			const progress = await getProgress(bookId);
			if (progress) {
				savedProgress = {
					chapterIndex: progress.chapterIndex,
					scrollPercent: progress.scrollPercent
				};
			}

			// Ensure chapterSizes exist (compute if missing)
			if (chapters.length > 0) {
				if (progress && progress.chapterSizes) {
					progressChapterSizes = progress.chapterSizes;
				} else {
					const sizes = chapters.map((c) => measureChapterContent(c.content));
					const existing = await getProgress(bookId);
					const toSave = existing || {
						bookId,
						chapterIndex: 0,
						scrollPercent: 0,
						lastReadAt: new Date()
					};
					toSave.chapterSizes = sizes;
					await saveProgress(toSave);
					progressChapterSizes = sizes;
				}
			}

			const urlSearchParams = $page.url.searchParams;
			const hasChapterParam = urlSearchParams.has('chapter');
			const hasProgressParam = urlSearchParams.has('progress');

			if (hasChapterParam || hasProgressParam) {
				const targetChapter = parseInt(urlSearchParams.get('chapter') || '0', 10);
				currentChapter = Math.min(targetChapter, chapters.length - 1);
			} else if (savedProgress) {
				currentChapter = Math.min(savedProgress.chapterIndex, chapters.length - 1);
			}

			if (!hasChapterParam && !hasProgressParam) {
				updateUrl(currentChapter, savedProgress?.scrollPercent ?? 0);
			}
		} finally {
			// No explicit loading state — content appears via chapters reactivity
		}
	});

	function updateUrl(chapterIndex: number, progressValue: number) {
		currentScrollPercent = progressValue;
		if (isUpdatingUrl) return;

		isUpdatingUrl = true;
		const url = new URL($page.url);
		const progressInt = Math.round(progressValue * 10000);
		url.searchParams.set('chapter', chapterIndex.toString());
		url.searchParams.set('progress', progressInt.toString());

		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(url.toString(), { replaceState: true, keepFocus: true });

		setTimeout(() => {
			isUpdatingUrl = false;
		}, 0);
	}

	function handleChapterChange(newChapter: number, progress?: number) {
		currentChapter = newChapter;
		// Update savedProgress when chapter changes with a specific progress
		// This ensures navigation to previous chapter opens at the end (progress=1)
		// and navigation to next chapter opens at the beginning (progress=0)
		if (progress !== undefined) {
			savedProgress = { chapterIndex: newChapter, scrollPercent: progress };
		}
	}

	function handleCenterTap() {
		showOverlay = !showOverlay;
	}

	function handleCloseMenus() {
		showOverlay = false;
		showToc = false;
	}

	function handleChapterSelect(chapterIndex: number) {
		currentChapter = chapterIndex;
		// Reset saved progress when switching chapters via TOC
		// so the new chapter starts at the beginning (progress = 0)
		savedProgress = null;
		// Close all menus when selecting a chapter
		showOverlay = false;
		showToc = false;
		updateUrl(chapterIndex, 0, true);
	}

	function handleFragmentNavigate(fragmentId: string) {
		pendingFragment = fragmentId;
	}
</script>

<div class="reader">
	<div class="reader-container">
		{#if chapters.length > 0}
			<div transition:fade={{ duration: 300 }}>
				<ReaderContent
					{bookId}
					{chapters}
					{currentChapter}
					content={chapters[currentChapter]?.content}
					initialProgress={savedProgress?.scrollPercent ?? 0}
					language={book?.language}
					fragment={pendingFragment}
					{showOverlay}
					{showToc}
					onChapterChange={handleChapterChange}
					onUrlUpdate={updateUrl}
					onCenterTap={handleCenterTap}
					onCloseMenus={handleCloseMenus}
					onFragmentNavigate={handleFragmentNavigate}
				/>
			</div>
		{:else if showLoadingFallback}
			<div class="loading" data-testid="reader-loading">Loading...</div>
		{/if}

		<ReaderOverlay
			show={showOverlay}
			onBack={() => {
				if (book && progressChapterSizes) {
					const pct = calculateBookProgress(
						progressChapterSizes,
						currentChapter,
						currentScrollPercent
					);
					cache.focusBook = book;
					cache.focusProgress = Math.round(pct * 100);
				}
				// eslint-disable-next-line svelte/no-navigation-without-resolve
				goto('/');
			}}
			onShowToc={() => (showToc = true)}
		/>
		<TableOfContents
			show={showToc}
			{chapters}
			{currentChapter}
			onChapterSelect={handleChapterSelect}
			onClose={() => (showToc = false)}
		/>
	</div>

	{#if progressChapterSizes}
		<div class="progress-bottom-bar" data-testid="progress-bottom-bar">
			<BookProgressBar
				chapterSizes={progressChapterSizes}
				{currentChapter}
				scrollPercent={currentScrollPercent}
			/>
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

	.progress-bottom-bar {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 10;
		padding: 4px 20px 8px;
		background: var(--color-readerBackground);
	}

	.progress-bottom-bar :global(.progress-track) {
		height: 3px !important;
	}

	.progress-bottom-bar :global(.progress-percentage) {
		font-size: 10px !important;
	}
</style>
