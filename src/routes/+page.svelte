<script lang="ts">
	// Theme import kept for side effects (CSS variables)
	import '$lib/theme.svelte';
	import { parseEpub } from '$lib/parsers/epub';
	import { saveBook, getAllBooks, deleteBook, bookExists } from '$lib/storage';
	import type { Book } from '$lib/types';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		UploadButton,
		BookCard,
		ConfirmSheet,
		ErrorBanner,
		InfoBanner,
		EmptyState
	} from '$lib/components';
	import { generateFileHash } from '$lib/hash';

	let books: Book[] = $state([]);
	let fileInput: HTMLInputElement | undefined = $state();
	let errorMessage: string | null = $state(null);
	let infoMessage: string | null = $state(null);
	let confirmSheet: { bookId: string; bookTitle: string } | null = $state(null);
	let longPressTimer: ReturnType<typeof setTimeout> | null = null;
	let isLongPress = false;

	onMount(async () => {
		books = await getAllBooks();
	});

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
			if (book) {
				confirmSheet = { bookId, bookTitle: book.title };
			}
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

	async function handleFileChange(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		if (!file) return;

		try {
			const buffer = await file.arrayBuffer();

			// Generate ID from file content hash
			const id = await generateFileHash(buffer);

			// Check if book already exists
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
				fileData: buffer,
				format: 'epub',
				addedAt: new Date(),
				filename: file.name,
				language: parsed.language
			};

			await saveBook(book);
			books = await getAllBooks();
		} catch (error) {
			console.error('Upload failed:', error);
			errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		} finally {
			input.value = '';
		}
	}
</script>

<div class="library-container" data-testid="library-container">
	{#if errorMessage}
		<ErrorBanner message={errorMessage} onDismiss={clearError} />
	{/if}
	{#if infoMessage}
		<InfoBanner message={infoMessage} onDismiss={clearInfo} />
	{/if}
	<div class="library-header">
		<h1>My Library</h1>
		<UploadButton onClick={handleUploadClick} />
		<input
			type="file"
			accept=".epub"
			bind:this={fileInput}
			onchange={handleFileChange}
			style="display: none;"
		/>
	</div>

	<div class="books-grid">
		{#if books.length === 0}
			<EmptyState />
		{:else}
			{#each books as book (book.id)}
				<BookCard
					{book}
					onClick={() => handleBookClick(book.id)}
					onTouchStart={(e) => handleTouchStart(book.id, e)}
					onTouchEnd={handleTouchEnd}
					onContextMenu={(e) => {
						e.preventDefault();
						handleTouchStart(book.id, e);
					}}
				/>
			{/each}
		{/if}
	</div>

	{#if confirmSheet}
		<ConfirmSheet
			bookTitle={confirmSheet.bookTitle}
			onConfirm={handleDeleteConfirm}
			onCancel={handleDeleteCancel}
		/>
	{/if}
</div>

<style>
	.library-container {
		min-height: 100vh;
		padding: var(--padding-lg);
		background-color: var(--color-background);
	}

	.library-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--padding-lg);
	}

	h1 {
		color: var(--color-text-primary);
		margin: 0;
	}

	.books-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: var(--padding-md);
	}
</style>
