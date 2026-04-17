<script lang="ts">
	import { theme, applyTheme } from '$lib/theme';
	import { parseEpub } from '$lib/parsers/epub';
	import { saveBook, getAllBooks, deleteBook } from '$lib/storage';
	import type { Book } from '$lib/types';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { UploadButton, BookCard, ContextMenu, ErrorBanner, EmptyState } from '$lib/components';

	let books: Book[] = $state([]);
	let fileInput: HTMLInputElement | undefined = $state();
	let errorMessage: string | null = $state(null);
	let contextMenu: { bookId: string; x: number; y: number } | null = $state(null);
	let longPressTimer: ReturnType<typeof setTimeout> | null = null;
	let isLongPress = false;

	onMount(async () => {
		applyTheme(document.body);
		books = await getAllBooks();
	});

	function clearError() {
		errorMessage = null;
	}

	function handleUploadClick() {
		fileInput?.click();
	}

	async function handleDeleteBook() {
		if (!contextMenu) return;
		await deleteBook(contextMenu.bookId);
		books = await getAllBooks();
		contextMenu = null;
	}

	function handleBookClick(bookId: string) {
		if (isLongPress) {
			isLongPress = false;
			return;
		}
		goto(`/read/${bookId}`);
	}

	function handleTouchStart(bookId: string, event: TouchEvent | MouseEvent) {
		isLongPress = false;
		longPressTimer = setTimeout(() => {
			isLongPress = true;
			const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
			const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
			contextMenu = { bookId, x: clientX, y: clientY };
		}, 500);
	}

	function handleTouchEnd() {
		if (longPressTimer) {
			clearTimeout(longPressTimer);
			longPressTimer = null;
		}
	}

	function closeContextMenu() {
		contextMenu = null;
	}

	async function handleFileChange(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		if (!file) return;

		try {
			const buffer = await file.arrayBuffer();
			const parsed = await parseEpub(buffer);

			const book: Book = {
				id: crypto.randomUUID(),
				title: parsed.title,
				author: parsed.author,
				cover: parsed.cover,
				fileData: buffer,
				format: 'epub',
				addedAt: new Date(),
				filename: file.name
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

	<div class="books-grid" onclick={closeContextMenu}>
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

	{#if contextMenu}
		<ContextMenu x={contextMenu.x} y={contextMenu.y} onDelete={handleDeleteBook} />
	{/if}
</div>

<style>
	.library-container {
		min-height: 100vh;
		padding: 2rem;
		background-color: var(--color-background, #1a1a2e);
	}

	.library-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
	}

	h1 {
		color: var(--color-text-primary, #ffffff);
		margin: 0;
	}

	.books-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: 1rem;
	}
</style>
