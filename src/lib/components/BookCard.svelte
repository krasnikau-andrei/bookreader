<script lang="ts">
	import type { Book } from '$lib/types';

	interface Props {
		book: Book;
		onClick?: () => void;
		onTouchStart?: (e: TouchEvent | MouseEvent) => void;
		onTouchEnd?: () => void;
		onContextMenu?: (e: MouseEvent) => void;
	}

	let { book, onClick, onTouchStart, onTouchEnd, onContextMenu }: Props = $props();
</script>

<button
	class="book-card"
	onclick={onClick}
	ontouchstart={onTouchStart}
	ontouchend={onTouchEnd}
	onmousedown={onTouchStart}
	onmouseup={onTouchEnd}
	onmouseleave={onTouchEnd}
	oncontextmenu={onContextMenu}
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
		<h3 class="book-title">{book.title}</h3>
		<p class="book-author">{book.author}</p>
	</div>
</button>

<style>
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
		max-width: 160px;
		max-height: 280px;
		-webkit-user-select: none;
		-moz-user-select: none;
		-ms-user-select: none;
		user-select: none;
		-webkit-touch-callout: none;
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
		padding: 0.5rem;
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
</style>
