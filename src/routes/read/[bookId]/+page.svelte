<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { getBook, getProgress } from '$lib/storage';
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
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	let pendingFragment: string | null = $state(null);

	// Progress tracking
	let savedProgress: { chapterIndex: number; scrollPercent: number } | null = $state(null);
	let isUpdatingUrl = false;

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

	function handleChapterChange(newChapter: number) {
		currentChapter = newChapter;
	}

	function handleCenterTap() {
		showOverlay = !showOverlay;
	}

	function handleChapterSelect(chapterIndex: number) {
		currentChapter = chapterIndex;
		// Reset saved progress when switching chapters via TOC
		// so the new chapter starts at the beginning (progress = 0)
		savedProgress = null;
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
					onChapterChange={handleChapterChange}
					onUrlUpdate={updateUrl}
					onCenterTap={handleCenterTap}
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
</style>
