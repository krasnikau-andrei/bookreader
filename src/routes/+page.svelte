<script lang="ts">
	import { theme, applyTheme } from '$lib/theme';
	import { parseEpub } from '$lib/parsers/epub';
	import { saveBook, getAllBooks, deleteBook } from '$lib/storage';
	import type { Book } from '$lib/types';
	import { onMount } from 'svelte';

	let books: Book[] = $state([]);
	let fileInput: HTMLInputElement | undefined = $state();
	let errorMessage: string | null = $state(null);

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

	<div class="books-grid">
		{#if books.length === 0}
			<!-- Empty state -->
			<div class="empty-state" data-testid="empty-state">
				<p>Your library is empty</p>
				<p>Upload your first book to get started</p>
			</div>
		{:else}
			{#each books as book (book.id)}
				<div class="book-card" data-testid="book-card">
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
					<button
						class="delete-button"
						data-testid="delete-book-button"
						onclick={() => handleDeleteBook(book.id)}
						aria-label="Delete {book.title}"
					>
						Delete
					</button>
				</div>
			{/each}
		{/if}
	</div>
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

	.delete-button {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		background: rgba(255, 68, 68, 0.9);
		color: white;
		border: none;
		padding: 0.5rem 0.75rem;
		border-radius: 0.25rem;
		cursor: pointer;
		font-size: 0.75rem;
		opacity: 0;
		transition: opacity 0.2s;
	}

	.book-card:hover .delete-button {
		opacity: 1;
	}

	.delete-button:hover {
		background: rgba(255, 68, 68, 1);
	}
</style>
