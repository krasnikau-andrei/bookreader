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
	oncontextmenu={onContextMenu}
	ontouchstart={onTouchStart}
	ontouchend={onTouchEnd}
	type="button"
	data-testid="book-card"
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

<style>
	.book-card {
		background: var(--color-cardBackground);
		border-radius: var(--radius-md);
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
		box-shadow: 0 8px 24px var(--color-shadow);
	}

	.book-cover,
	.book-cover-placeholder {
		width: 100%;
		aspect-ratio: 2/3;
		object-fit: contain;
		background: linear-gradient(
			135deg,
			var(--color-backgroundSecondary) 0%,
			var(--color-backgroundTertiary) 100%
		);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.book-cover {
		object-fit: contain;
	}

	.book-cover-placeholder .filename {
		color: var(--color-text-primary);
		font-size: var(--font-size-sm);
		word-break: break-all;
		text-align: center;
		opacity: 0.8;
		padding: var(--padding-sm);
	}

	.book-info {
		padding: var(--padding-sm);
	}

	.book-title {
		color: var(--color-text-primary);
		font-size: var(--font-size-sm);
		font-weight: 600;
		margin: 0 0 0.125rem 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.book-author {
		color: var(--color-text-secondary);
		font-size: var(--font-size-xs);
		margin: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
