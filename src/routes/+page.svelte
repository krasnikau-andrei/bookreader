<script lang="ts">
	import { theme, applyTheme } from '$lib/theme';
	import { parseEpub } from '$lib/parsers/epub';
	import { saveBook, getAllBooks, deleteBook } from '$lib/storage';
	import type { Book } from '$lib/types';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

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

	async function handleDeleteBook(bookId: string) {
		await deleteBook(bookId);
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
		<div class="error-banner" data-testid="error-message">
			<p>{errorMessage}</p>
			<button onclick={clearError}>Dismiss</button>
		</div>
	{/if}
	<div class="library-header">
		<h1>My Library</h1>
		<button class="upload-button" data-testid="upload-button" onclick={handleUploadClick}>
			Upload Book
		</button>
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
			<!-- Empty state -->
			<div class="empty-state" data-testid="empty-state">
				<p>Your library is empty</p>
				<p>Upload your first book to get started</p>
			</div>
		{:else}
			{#each books as book (book.id)}
				<button
					class="book-card"
					data-testid="book-card"
					onclick={() => handleBookClick(book.id)}
					ontouchstart={(e) => handleTouchStart(book.id, e)}
					ontouchend={handleTouchEnd}
					onmousedown={(e) => handleTouchStart(book.id, e)}
					onmouseup={handleTouchEnd}
					onmouseleave={handleTouchEnd}
					oncontextmenu={(e) => {
						e.preventDefault();
						handleTouchStart(book.id, e);
					}}
					aria-label="Read {book.title}"
					type="button"
				>
					{#if book.cover}
						<img src={book.cover} alt={book.title} class="book-cover" />
					{:else}
						<div class="book-cover-placeholder">
							<span class="filename">{book.filename}</span>
						</div>
					{/if}
					<div class="book-info">
						<h3 class="book-title" data-testid="book-title">{book.title}</h3>
						<p class="book-author" data-testid="book-author">{book.author}</p>
					</div>
				</button>
			{/each}
		{/if}
	</div>

	{#if contextMenu}
		<div class="context-menu" style="left: {contextMenu.x}px; top: {contextMenu.y}px;">
			<button
				class="context-menu-item"
				data-testid="delete-book-button"
				onclick={() => handleDeleteBook(contextMenu!.bookId)}
			>
				Delete
			</button>
		</div>
	{/if}
</div>

<style>
	.library-container {
		min-height: 100vh;
		padding: 2rem;
		background-color: var(--color-background, #1a1a2e);
	}

	.error-banner {
		background-color: #ff4444;
		color: white;
		padding: 1rem;
		margin-bottom: 1rem;
		border-radius: 0.5rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.error-banner p {
		margin: 0;
	}

	.error-banner button {
		background: rgba(255, 255, 255, 0.2);
		border: none;
		color: white;
		padding: 0.5rem 1rem;
		border-radius: 0.25rem;
		cursor: pointer;
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

	.upload-button {
		padding: 0.75rem 1.5rem;
		background-color: var(--color-accent, #4a9eff);
		color: var(--color-text-primary, #ffffff);
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		font-size: 1rem;
	}

	.upload-button:hover {
		opacity: 0.9;
	}

	.books-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: 1rem;
	}

	.empty-state {
		grid-column: 1 / -1;
		text-align: center;
		padding: 4rem;
		color: var(--color-text-secondary, #a0a0a0);
	}

	.empty-state p {
		margin: 0.5rem 0;
	}

	.book-card {
		background: rgba(255, 255, 255, 0.05);
		border-radius: 0.5rem;
		overflow: hidden;
		transition:
			transform 0.2s,
			box-shadow 0.2s;
		border: none;
		padding: 0;
		cursor: pointer;
		text-align: left;
		position: relative;
		width: 100%;
	}

	.book-card:hover {
		transform: translateY(-4px);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
	}

	.book-cover,
	.book-cover-placeholder {
		width: 100%;
		aspect-ratio: 2/3;
		object-fit: contain;
		background: linear-gradient(135deg, #2a2a4a 0%, #1a1a3a 100%);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.book-cover {
		object-fit: contain;
	}

	.book-cover-placeholder .filename {
		color: var(--color-text-primary, #ffffff);
		font-size: 0.75rem;
		word-break: break-all;
		text-align: center;
		opacity: 0.8;
	}

	.book-info {
		padding: 0.5rem;
	}

	.book-title {
		color: var(--color-text-primary, #ffffff);
		font-size: 0.75rem;
		font-weight: 600;
		margin: 0 0 0.125rem 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.book-author {
		color: var(--color-text-secondary, #a0a0a0);
		font-size: 0.625rem;
		margin: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.context-menu {
		position: fixed;
		background: rgba(40, 40, 60, 0.95);
		border-radius: 0.5rem;
		padding: 0.25rem;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
		z-index: 100;
		min-width: 120px;
	}

	.context-menu-item {
		display: block;
		width: 100%;
		padding: 0.75rem 1rem;
		background: transparent;
		border: none;
		color: #ff4444;
		font-size: 0.875rem;
		text-align: left;
		cursor: pointer;
		border-radius: 0.25rem;
	}

	.context-menu-item:hover {
		background: rgba(255, 68, 68, 0.1);
	}

	/* Prevent text selection during long press */
	.book-card {
		-webkit-user-select: none;
		-moz-user-select: none;
		-ms-user-select: none;
		user-select: none;
		-webkit-touch-callout: none;
	}
</style>
