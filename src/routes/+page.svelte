<script lang="ts">
	import '$lib/theme.svelte';
	import { cache } from '$lib/library-cache.svelte';
	import { onMount } from 'svelte';
	import { goto, preloadCode } from '$app/navigation';
	import { resolve } from '$app/paths';
	import BookCard from '$lib/components/BookCard.svelte';
	import ConfirmSheet from '$lib/components/ConfirmSheet.svelte';
	import Banner from '$lib/components/Banner.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import LibraryHeader from '$lib/components/LibraryHeader.svelte';
	import CurrentBook from '$lib/components/CurrentBook.svelte';

	let errorMessage: string | null = $state(null);
	let infoMessage: string | null = $state(null);
	let failedBookFile: File | null = $state(null);
	let confirmSheet: { bookId: string; bookTitle: string } | null = $state(null);
	let longPressTimer: ReturnType<typeof setTimeout> | null = null;
	let isLongPress = false;

	onMount(() => {
		cache.refresh();
	});

	$effect(() => {
		if (cache.focusBook) {
			preloadCode(resolve('/read/[bookId]', { bookId: cache.focusBook.id }));
		}
	});

	function clearError() {
		errorMessage = null;
		failedBookFile = null;
	}
	function clearInfo() {
		infoMessage = null;
	}
	async function handleDeleteBook() {
		if (!confirmSheet) return;
		await cache.remove(confirmSheet.bookId);
		confirmSheet = null;
	}

	function handleBookClick(bookId: string) {
		if (isLongPress) {
			isLongPress = false;
			return;
		}
		goto(resolve('/read/[bookId]', { bookId }));
	}

	function handleTouchStart(bookId: string) {
		isLongPress = false;
		longPressTimer = setTimeout(() => {
			isLongPress = true;
			const book = cache.books.find((b) => b.id === bookId);
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
		if (cache.focusBook) goto(resolve('/read/[bookId]', { bookId: cache.focusBook.id }));
	}

	function navigateToFocusNoPropagate(e: Event) {
		e.stopPropagation();
		if (cache.focusBook) goto(resolve('/read/[bookId]', { bookId: cache.focusBook.id }));
	}

	function handleFocusKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') navigateToFocus();
	}

	async function handleFileChange(file: File) {
		try {
			const result = await cache.upload(file);
			if (result === 'duplicate') {
				infoMessage = `"${file.name}" is already in your library`;
			}
		} catch (error) {
			console.error('Upload failed:', error);
			errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
			failedBookFile = file;
		}
	}
	async function uploadForDebug() {
		if (!failedBookFile) return;
		try {
			const formData = new FormData();
			formData.append('file', failedBookFile);
			const response = await fetch('/api/upload-broken-book', {
				method: 'POST',
				body: formData
			});
			if (response.ok) {
				infoMessage = `Uploaded "${failedBookFile.name}" for debug`;
				failedBookFile = null;
				errorMessage = null;
			} else {
				console.error('Upload failed:', await response.text());
			}
		} catch (e) {
			console.error('Upload failed:', e);
		}
	}
</script>

<div class="library" data-testid="library-container">
	{#if errorMessage}
		<Banner message={errorMessage} onDismiss={clearError} variant="error">
			{#if failedBookFile}
				<button onclick={uploadForDebug} type="button">Upload for Debug</button>
			{/if}
		</Banner>
	{/if}
	{#if infoMessage}
		<Banner message={infoMessage} onDismiss={clearInfo} variant="info" />
	{/if}

	<LibraryHeader onfilechange={handleFileChange} />

	{#if cache.books.length === 0}
		<EmptyState />
	{:else}
		{#if cache.focusBook}
			<CurrentBook
				book={cache.focusBook}
				progressPercent={cache.focusProgress}
				onclick={navigateToFocus}
				onresume={navigateToFocusNoPropagate}
				onkeydown={handleFocusKeydown}
			/>
		{/if}

		<div class="rest-hdr">
			<h2>
				The Stacks <span>· {cache.books.length} {cache.books.length === 1 ? 'book' : 'books'}</span>
			</h2>
		</div>

		<div class="books-grid">
			{#each cache.books as book (book.id)}
				<BookCard
					{book}
					progressPercent={cache.bookProgressMap[book.id] || 0}
					onClick={() => handleBookClick(book.id)}
					onTouchStart={() => handleTouchStart(book.id)}
					onTouchEnd={handleTouchEnd}
					onTouchCancel={handleTouchEnd}
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
