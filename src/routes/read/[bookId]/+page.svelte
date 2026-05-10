<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { getBook, getProgress, saveProgress } from '$lib/storage';
	import BookProgressBar from '$lib/components/BookProgressBar.svelte';
	import ReaderContent from '$lib/components/ReaderContent.svelte';
	import ReaderOverlay from '$lib/components/ReaderOverlay.svelte';
	import LinkErrorPopup from '$lib/components/LinkErrorPopup.svelte';
	import TableOfContents from '$lib/components/TableOfContents.svelte';
	import type { Book, Chapter } from '$lib/types';

	// Core state
	let book: Book | undefined = $state();
	let chapters: Chapter[] = $state([]);
	let currentChapter = $state(0);
	let showOverlay = $state(false);
	let showToc = $state(false);
	let loading = $state(true);
	let bookId = $derived($page.params.bookId);

	// Link handling
	let showLinkError = $state(false);
	let linkErrorInfo: { originalHref: string; message: string } | null = $state(null);
	let pendingFragment: string | null = $state(null);

	// Progress tracking
	let savedProgress: { chapterIndex: number; scrollPercent: number } | null = $state(null);
	let isUpdatingUrl = false;
	let progressChapterSizes: number[] | undefined = $state();
	let currentScrollPercent = $state(0);

	onMount(async () => {
		try {
			console.log('[DEBUG] Reader page onMount started');
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

			const { parseEpubChapters } = await import('$lib/parsers/epub');
			const result = await parseEpubChapters(book.fileData);
			chapters = result.chapters;

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
					const sizes = chapters.map((c) => c.content.length);
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

			await new Promise((resolve) => setTimeout(resolve, 200));

			if (!hasChapterParam && !hasProgressParam) {
				updateUrl(currentChapter, savedProgress?.scrollPercent ?? 0);
			}
		} finally {
			loading = false;
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

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	function handleLinkClick(event: MouseEvent) {
		const target = event.target as HTMLElement;
		const link = target.closest('a');

		if (link?.classList.contains('missing-link')) {
			event.preventDefault();
			event.stopPropagation();

			const originalHref = link.getAttribute('data-original-href') || 'unknown';
			linkErrorInfo = {
				originalHref,
				message: `This link points to "${originalHref}" which is not available in this book.`
			};
			showLinkError = true;
		}
	}

	function handleFragmentNavigate(fragmentId: string) {
		pendingFragment = fragmentId;
	}
</script>

<div class="reader">
	{#if loading}
		<div class="loading" data-testid="reader-loading">Loading...</div>
	{:else if book}
		<div class="reader-container">
			{#if chapters.length > 0}
				<ReaderContent
					{bookId}
					{chapters}
					{currentChapter}
					content={chapters[currentChapter]?.content}
					initialProgress={savedProgress?.scrollPercent ?? 0}
					language={book.language}
					fragment={pendingFragment}
					{showOverlay}
					{showToc}
					onChapterChange={handleChapterChange}
					onUrlUpdate={updateUrl}
					onCenterTap={handleCenterTap}
					onCloseMenus={handleCloseMenus}
					onFragmentNavigate={handleFragmentNavigate}
				/>
			{/if}

			<ReaderOverlay
				show={showOverlay}
				onBack={() => {
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

			<LinkErrorPopup
				show={showLinkError}
				originalHref={linkErrorInfo?.originalHref || ''}
				message={linkErrorInfo?.message || ''}
				onClose={() => (showLinkError = false)}
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
