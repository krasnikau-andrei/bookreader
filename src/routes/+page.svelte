<script lang="ts">
	import '$lib/theme.svelte';
	import { parseEpub } from '$lib/parsers/epub';
	import {
		saveBook,
		getAllBooks,
		deleteBook,
		bookExists,
		getMostRecentProgress,
		getAllProgress,
		saveProgress
	} from '$lib/storage';
	import type { Book } from '$lib/types';
	import { calculateBookProgress, measureChapterContent } from '$lib/reader/progress';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { BookCard, ConfirmSheet, ErrorBanner, InfoBanner, EmptyState } from '$lib/components';
	import { generateFileHash } from '$lib/hash';

	let books: Book[] = $state([]);
	let focusBook: Book | null = $state(null);
	let focusProgress: number = $state(0);
	let bookProgressMap = $state<Record<string, number>>({});
	let chapterSizesReady = $state(false);
	let fileInput: HTMLInputElement | undefined = $state();
	let errorMessage: string | null = $state(null);
	let infoMessage: string | null = $state(null);
	let confirmSheet: { bookId: string; bookTitle: string } | null = $state(null);
	let longPressTimer: ReturnType<typeof setTimeout> | null = null;
	let isLongPress = false;

	onMount(async () => {
		books = await getAllBooks();
		const recent = await getMostRecentProgress();
		if (recent) {
			focusBook = recent.book;
			focusProgress = recent.progress.chapterSizes
				? Math.round(
						calculateBookProgress(
							recent.progress.chapterSizes,
							recent.progress.chapterIndex,
							recent.progress.scrollPercent
						) * 100
					)
				: Math.round((recent.progress.scrollPercent || 0) * 100);
		}
		await loadAllBookProgress();
		computeMissingChapterSizes();
	});

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

	async function computeMissingChapterSizes() {
		const allProgress = await getAllProgress();
		const missing = allProgress.filter((p) => !p.chapterSizes || p.chapterSizes.length === 0);
		if (missing.length === 0) {
			chapterSizesReady = true;
			return;
		}
		for (const progress of missing) {
			const book = books.find((b) => b.id === progress.bookId);
			if (!book) continue;
			try {
				const { parseEpubChapters } = await import('$lib/parsers/epub');
				const result = await parseEpubChapters(book.fileData);
				progress.chapterSizes = result.chapters.map((c) => measureChapterContent(c.content));
				await saveProgress(progress);
			} catch (e) {
				console.error(`[LIBRARY] Failed to compute chapter sizes for ${book.id}:`, e);
			}
		}
		await loadAllBookProgress();
		chapterSizesReady = true;
	}

	function clearError() {
		errorMessage = null;
	}
	function clearInfo() {
		infoMessage = null;
	}
	function handleUploadClick() {
		fileInput?.click();
	}

	async function handleDeleteBook() {
		if (!confirmSheet) return;
		await deleteBook(confirmSheet.bookId);
		books = await getAllBooks();
		if (focusBook?.id === confirmSheet.bookId) {
			focusBook = null;
			focusProgress = 0;
		}
		confirmSheet = null;
	}

	function handleBookClick(bookId: string) {
		if (isLongPress) {
			isLongPress = false;
			return;
		}
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(`/read/${bookId}`);
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

	function handleDeleteConfirm() {
		if (!confirmSheet) return;
		handleDeleteBook();
	}
	function handleDeleteCancel() {
		confirmSheet = null;
	}

	/* eslint-disable svelte/no-navigation-without-resolve */
	function navigateToFocus() {
		if (focusBook) goto(`/read/${focusBook.id}`);
	}

	function navigateToFocusNoPropagate(e: Event) {
		e.stopPropagation();
		if (focusBook) goto(`/read/${focusBook.id}`);
	}
	/* eslint-enable svelte/no-navigation-without-resolve */

	function handleFocusKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') navigateToFocus();
	}

	async function handleFileChange(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
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
				fileData: buffer,
				format: 'epub',
				addedAt: new Date(),
				filename: file.name,
				language: parsed.language
			};
			await saveBook(book);
			books = await getAllBooks();
			if (!focusBook) {
				focusBook = book;
				focusProgress = 0;
			}
		} catch (error) {
			console.error('Upload failed:', error);
			errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		} finally {
			input.value = '';
		}
	}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	void chapterSizesReady;
</script>

<div class="library" data-testid="library-container">
	{#if errorMessage}
		<ErrorBanner message={errorMessage} onDismiss={clearError} />
	{/if}
	{#if infoMessage}
		<InfoBanner message={infoMessage} onDismiss={clearInfo} />
	{/if}

	<div class="header">
		<h1 class="title">Bibliotheca</h1>
		<button
			class="header-add"
			onclick={handleUploadClick}
			type="button"
			aria-label="Add book"
			data-testid="upload-button">+</button
		>
		<input
			type="file"
			accept=".epub"
			bind:this={fileInput}
			onchange={handleFileChange}
			style="display: none;"
		/>
	</div>

	{#if books.length === 0}
		<EmptyState />
	{:else}
		{#if focusBook}
			<div
				class="focus-section"
				role="button"
				tabindex="0"
				onclick={navigateToFocus}
				onkeydown={handleFocusKeydown}
			>
				<div class="focus-label">The Current Volume</div>
				<div class="focus-row">
					{#if focusBook.cover}
						<img class="cover" src={focusBook.cover} alt={focusBook.title} draggable="false" />
					{:else}
						<div class="cover-placeholder">{focusBook.title.charAt(0)}</div>
					{/if}
					<div class="info">
						<div class="book-title">{focusBook.title}</div>
						<div class="book-author">{focusBook.author}</div>
						{#if focusBook.description}
							<div class="book-description">"{focusBook.description}"</div>
						{/if}
					</div>
				</div>
				<div class="progress-row">
					<span class="percent-label"><strong>{focusProgress}%</strong> complete</span>
				</div>
				<div class="progress-track">
					<div class="progress-fill" style="width: {focusProgress}%"></div>
				</div>
				<button class="resume-btn" onclick={navigateToFocusNoPropagate}>Resume Reading</button>
			</div>
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
			onConfirm={handleDeleteConfirm}
			onCancel={handleDeleteCancel}
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

	.header {
		position: relative;
		z-index: 1;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 28px 24px 16px;
		border-bottom: 1px solid var(--color-borderMuted);
		margin: 0 24px;
	}
	.title {
		font-family: 'Cormorant Garamond', serif;
		font-size: 24px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 6px;
		color: var(--color-accent);
		margin: 0;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.header-add {
		flex-shrink: 0;
		width: 40px;
		height: 40px;
		border: 1px solid var(--color-cardBorder);
		background: transparent;
		color: var(--color-accent);
		font-size: 22px;
		cursor: pointer;
		font-family: inherit;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-left: 12px;
	}
	.header-add:active {
		background: var(--color-background);
		border-color: var(--color-accent);
	}

	.focus-section {
		position: relative;
		z-index: 1;
		padding: 24px;
		margin: 24px;
		background: var(--color-backgroundSecondary);
		border: 1px solid var(--color-cardBackground);
	}
	.focus-section::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 2px;
		background: linear-gradient(90deg, transparent, var(--color-accent), transparent);
		opacity: 0.2;
	}
	.focus-label {
		font-family: 'Cormorant Garamond', serif;
		font-size: 17px;
		font-style: italic;
		color: var(--color-accent);
		margin-bottom: 20px;
		letter-spacing: 0.5px;
	}
	.focus-row {
		display: flex;
		gap: 20px;
	}
	.cover {
		width: 110px;
		height: 154px;
		object-fit: cover;
		flex-shrink: 0;
		border: 1px solid var(--color-borderMuted);
		filter: sepia(0.15) brightness(0.85);
	}
	.cover-placeholder {
		width: 110px;
		height: 154px;
		flex-shrink: 0;
		border: 1px solid var(--color-borderMuted);
		background: var(--color-backgroundTertiary);
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: 'Cormorant Garamond', serif;
		font-size: 40px;
		color: var(--color-accent);
	}
	.info {
		flex: 1;
		min-width: 0;
	}
	.book-title {
		font-family: 'Cormorant Garamond', serif;
		font-size: 28px;
		font-weight: 600;
		font-style: italic;
		color: var(--color-text-primary);
		letter-spacing: 0.3px;
		margin: 0;
		word-break: break-word;
	}
	.book-author {
		font-size: 15px;
		color: var(--color-text-secondary);
		margin-top: 4px;
		font-style: italic;
	}
	.book-description {
		font-size: 15px;
		color: var(--color-text-secondary);
		margin-top: 10px;
		font-style: italic;
		line-height: 1.6;
		padding-left: 16px;
		border-left: 2px solid color-mix(in srgb, var(--color-accent) 8%, transparent);
		overflow: hidden;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
	}
	.progress-row {
		display: flex;
		justify-content: space-between;
		font-size: 14px;
		color: var(--color-text-secondary);
		letter-spacing: 0.5px;
		margin-top: 20px;
	}
	.percent-label strong {
		color: var(--color-accent);
	}
	.progress-track {
		margin-top: 8px;
		height: 2px;
		background: var(--color-borderMuted);
		overflow: hidden;
	}
	.progress-fill {
		height: 100%;
		background: var(--color-accent);
		transition: width 0.3s ease;
	}
	.resume-btn {
		margin-top: 20px;
		padding: 14px 0;
		width: 100%;
		border: 1px solid var(--color-cardBorder);
		background: transparent;
		color: var(--color-accent);
		font-size: 16px;
		font-weight: 500;
		cursor: pointer;
		font-family: 'Cormorant Garamond', serif;
		font-style: italic;
		letter-spacing: 1.5px;
		transition: all 0.2s;
	}
	.resume-btn:active {
		background: var(--color-background);
		border-color: var(--color-accent);
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
