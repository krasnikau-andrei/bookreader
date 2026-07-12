<script lang="ts">
	import '$lib/theme.svelte';
	import { parseEpub } from '$lib/parsers/epub';
	import { cache } from '$lib/library-cache.svelte';
	import {
		saveBookWithFile,
		getAllBooks,
		getBookFile,
		deleteBook,
		bookExists,
		getMostRecentProgress,
		getAllProgress,
		saveProgress
	} from '$lib/storage';
	import type { Book, ReadingProgress } from '$lib/types';
	import { calculateBookProgress, measureChapterContent } from '$lib/reader/progress';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		BookCard,
		ConfirmSheet,
		Banner,
		EmptyState,
		LibraryHeader,
		CurrentBook
	} from '$lib/components';
	import { generateFileHash } from '$lib/hash';

	let books: Book[] = $state([]);
	let focusBook: Book | null = $state(null);
	let focusProgress: number = $state(0);
	let bookProgressMap = $state<Record<string, number>>({});
	let chapterSizesReady = $state(false);

	let errorMessage: string | null = $state(null);
	let infoMessage: string | null = $state(null);
	let confirmSheet: { bookId: string; bookTitle: string } | null = $state(null);
	let longPressTimer: ReturnType<typeof setTimeout> | null = null;
	let isLongPress = false;

	onMount(() => {
		books = cache.books;
		focusBook = cache.focusBook;
		focusProgress = cache.focusProgress;
		bookProgressMap = cache.bookProgressMap;
		chapterSizesReady = cache.chapterSizesReady;

		refresh();

		function onCancel() {
			handleTouchEnd();
		}
		document.addEventListener('touchcancel', onCancel, { passive: true });
		return () => document.removeEventListener('touchcancel', onCancel);
	});

	async function refresh() {
		const [allBooks, recent, allProgress] = await Promise.all([
			getAllBooks(),
			getMostRecentProgress(),
			getAllProgress()
		]);

		const lastRead = new Map(allProgress.map((p) => [p.bookId, p.lastReadAt]));
		allBooks.sort((a, b) => (lastRead.get(b.id) ?? 0) - (lastRead.get(a.id) ?? 0));

		const map: Record<string, number> = {};
		for (const p of allProgress) {
			if (p.chapterSizes && p.chapterSizes.length > 0) {
				const pct = calculateBookProgress(p.chapterSizes, p.chapterIndex, p.scrollPercent);
				map[p.bookId] = Math.round(pct * 100);
			}
		}

		let focusPct = 0;
		if (recent) {
			focusPct = recent.progress.chapterSizes
				? Math.round(
						calculateBookProgress(
							recent.progress.chapterSizes,
							recent.progress.chapterIndex,
							recent.progress.scrollPercent
						) * 100
					)
				: Math.round((recent.progress.scrollPercent || 0) * 100);
		}

		books = cache.books = allBooks;
		bookProgressMap = cache.bookProgressMap = map;
		focusBook = cache.focusBook = recent?.book ?? null;
		focusProgress = cache.focusProgress = focusPct;

		computeMissingChapterSizes(allBooks, allProgress);
	}

	async function loadAllBookProgress() {
		const allProgress = await getAllProgress();
		const map: Record<string, number> = {};
		for (const p of allProgress) {
			if (p.chapterSizes && p.chapterSizes.length > 0) {
				const pct = calculateBookProgress(p.chapterSizes, p.chapterIndex, p.scrollPercent);
				map[p.bookId] = Math.round(pct * 100);
			}
		}
		bookProgressMap = map;
		if (focusBook && map[focusBook.id] !== undefined) {
			focusProgress = map[focusBook.id];
		}
	}

	async function computeMissingChapterSizes(allBooks: Book[], allProgress: ReadingProgress[]) {
		const missing = allProgress.filter((p) => !p.chapterSizes || p.chapterSizes.length === 0);
		if (missing.length === 0) {
			chapterSizesReady = cache.chapterSizesReady = true;
			return;
		}
		for (const progress of missing) {
			const book = allBooks.find((b) => b.id === progress.bookId);
			if (!book) continue;
			try {
				const fileData = await getBookFile(progress.bookId);
				if (!fileData) continue;
				const { parseEpubChapters } = await import('$lib/parsers/epub');
				const result = await parseEpubChapters(fileData);
				progress.chapterSizes = result.chapters.map((c) => measureChapterContent(c.content));
				await saveProgress(progress);
			} catch (e) {
				console.error(`[LIBRARY] Failed to compute chapter sizes for ${book.id}:`, e);
			}
		}
		await loadAllBookProgress();
		cache.bookProgressMap = bookProgressMap;
		if (focusBook && bookProgressMap[focusBook.id] !== undefined) {
			cache.focusProgress = bookProgressMap[focusBook.id];
		}
		chapterSizesReady = cache.chapterSizesReady = true;
	}

	function clearError() {
		errorMessage = null;
	}
	function clearInfo() {
		infoMessage = null;
	}
	async function handleDeleteBook() {
		if (!confirmSheet) return;
		await deleteBook(confirmSheet.bookId);
		cache.books = cache.books.filter((b) => b.id !== confirmSheet!.bookId);
		books = cache.books;
		if (focusBook?.id === confirmSheet.bookId) {
			focusBook = cache.focusBook = null;
			focusProgress = cache.focusProgress = 0;
		}
		confirmSheet = null;
		refresh();
	}

	function navigateToRead(path: string) {
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(path).catch(() => {
			window.location.href = path;
		});
	}

	function handleBookClick(bookId: string) {
		if (isLongPress) {
			isLongPress = false;
			return;
		}
		navigateToRead(`/read/${bookId}`);
	}

	function handleTouchStart(bookId: string) {
		isLongPress = false;
		longPressTimer = setTimeout(() => {
			isLongPress = true;
			const book = books.find((b) => b.id === bookId);
			if (book) confirmSheet = { bookId, bookTitle: book.title };
		}, 500);
	}

	function handleTouchEnd() {
		if (longPressTimer) {
			clearTimeout(longPressTimer);
			longPressTimer = null;
		}
	}

	function navigateToFocus() {
		if (focusBook) navigateToRead(`/read/${focusBook.id}`);
	}

	function navigateToFocusNoPropagate(e: Event) {
		e.stopPropagation();
		if (focusBook) navigateToRead(`/read/${focusBook.id}`);
	}

	function handleFocusKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') navigateToFocus();
	}

	async function handleFileChange(file: File) {
		try {
			const buffer = await file.arrayBuffer();
			const id = await generateFileHash(buffer);
			if (await bookExists(id)) {
				infoMessage = `"${file.name}" is already in your library`;
				return;
			}
			const parsed = await parseEpub(buffer);
			const book: Book = {
				id,
				title: parsed.title,
				author: parsed.author,
				cover: parsed.cover,
				description: parsed.description,
				format: 'epub',
				addedAt: new Date(),
				filename: file.name,
				language: parsed.language
			};
			await saveBookWithFile(book, buffer);
			cache.books = [book, ...cache.books];
			books = cache.books;
			if (!focusBook) {
				focusBook = cache.focusBook = book;
			}
			refresh();
		} catch (error) {
			console.error('Upload failed:', error);
			errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		}
	}
	void chapterSizesReady;
</script>

<div class="library" data-testid="library-container">
	{#if errorMessage}
		<Banner message={errorMessage} onDismiss={clearError} variant="error" />
	{/if}
	{#if infoMessage}
		<Banner message={infoMessage} onDismiss={clearInfo} variant="info" />
	{/if}

	<LibraryHeader onfilechange={handleFileChange} />

	{#if books.length === 0}
		<EmptyState />
	{:else}
		{#if focusBook}
			<CurrentBook
				book={focusBook}
				progressPercent={focusProgress}
				onclick={navigateToFocus}
				onresume={navigateToFocusNoPropagate}
				onkeydown={handleFocusKeydown}
			/>
		{/if}

		<div class="rest-hdr">
			<h2>The Stacks <span>· {books.length} {books.length === 1 ? 'book' : 'books'}</span></h2>
		</div>

		<div class="books-grid">
			{#each books as book (book.id)}
				<BookCard
					{book}
					progressPercent={bookProgressMap[book.id] || 0}
					onClick={() => handleBookClick(book.id)}
					onTouchStart={() => handleTouchStart(book.id)}
					onTouchEnd={handleTouchEnd}
					onContextMenu={(e) => {
						e.preventDefault();
						handleTouchStart(book.id);
					}}
				/>
			{/each}
		</div>
	{/if}

	{#if confirmSheet}
		<ConfirmSheet
			bookTitle={confirmSheet.bookTitle}
			onConfirm={handleDeleteBook}
			onCancel={() => (confirmSheet = null)}
		/>
	{/if}
</div>

<style>
	.library {
		min-height: 100vh;
		background: var(--color-background);
		position: relative;
	}
	.library::before {
		content: '';
		position: fixed;
		inset: 0;
		background: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.015'/%3E%3C/svg%3E");
		pointer-events: none;
		z-index: 0;
	}

	.rest-hdr {
		position: relative;
		z-index: 1;
		padding: 0 24px;
		margin-bottom: 16px;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.rest-hdr h2 {
		font-family: 'Cormorant Garamond', serif;
		font-size: 22px;
		font-weight: 400;
		color: var(--color-text-primary);
		margin: 0;
	}
	.rest-hdr h2 span {
		color: var(--color-text-secondary);
	}

	.books-grid {
		position: relative;
		z-index: 1;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 16px 8px;
		padding: 0 24px 48px;
		overflow: hidden;
	}

	.books-grid > :global(*) {
		min-width: 0;
	}
</style>
