<script lang="ts">
	import '$lib/theme.svelte';
	import { cache } from '$lib/library-cache.svelte';
	import { onMount, tick } from 'svelte';
	import { goto, preloadCode } from '$app/navigation';
	import ConfirmSheet from '$lib/components/ConfirmSheet.svelte';
	import Banner from '$lib/components/Banner.svelte';
	import BookDeck from '$lib/components/BookDeck.svelte';

	let errorMessage: string | null = $state(null);
	let infoMessage: string | null = $state(null);
	let failedBookFile: File | null = $state(null);
	let confirmSheet: { bookId: string; bookTitle: string } | null = $state(null);
	let longPressTimer: ReturnType<typeof setTimeout> | null = null;
	let isLongPress = false;
	let deck: BookDeck | undefined = $state();

	onMount(() => {
		cache.refresh();
	});

	$effect(() => {
		if (cache.focusBook) {
			preloadCode(`/read/${cache.focusBook.id}`);
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
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(`/read/${bookId}`);
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

	async function handleFileChange(file: File) {
		try {
			const { status, bookId } = await cache.upload(file);
			if (status === 'duplicate') {
				infoMessage = `"${file.name}" is already in your library`;
			}
			await tick();
			deck?.scrollToBook(bookId);
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
	{#if errorMessage || infoMessage}
		<div class="banners">
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
		</div>
	{/if}

	<BookDeck
		bind:this={deck}
		books={cache.books}
		progressMap={cache.bookProgressMap}
		lastReadMap={cache.lastReadMap}
		onopen={handleBookClick}
		onpressstart={handleTouchStart}
		onpressend={handleTouchEnd}
		onfilechange={handleFileChange}
	/>

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
		height: 100dvh;
		background: var(--color-background);
		position: relative;
	}
	.banners {
		position: fixed;
		top: calc(env(safe-area-inset-top) + 64px);
		left: 0;
		right: 0;
		z-index: 3;
	}
</style>
