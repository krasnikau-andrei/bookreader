<script lang="ts">
	import type { Book } from '$lib/types';

	interface Props {
		book: Book;
		progressPercent?: number;
		onClick?: () => void;
		onTouchStart?: (e: TouchEvent | MouseEvent) => void;
		onTouchEnd?: () => void;
		onTouchCancel?: () => void;
		onContextMenu?: (e: MouseEvent) => void;
	}

	let {
		book,
		progressPercent = 0,
		onClick,
		onTouchStart,
		onTouchEnd,
		onTouchCancel,
		onContextMenu
	}: Props = $props();
</script>

<button
	class="book-card"
	onclick={onClick}
	oncontextmenu={onContextMenu}
	ontouchstart={onTouchStart}
	ontouchend={onTouchEnd}
	ontouchcancel={onTouchCancel}
	onmousedown={onTouchStart}
	onmouseup={onTouchEnd}
	type="button"
	data-testid="book-card"
>
	<div class="cover-wrap">
		{#if book.cover}
			<img src={book.cover} alt={book.title} class="book-cover" draggable="false" />
		{:else}
			<div class="cover-placeholder">{book.title.charAt(0) || '?'}</div>
		{/if}
	</div>
	{#if progressPercent > 0}
		<div class="progress-track" data-testid="progress-bar">
			<div class="progress-fill" style="width: {progressPercent}%"></div>
		</div>
		<span class="progress-pct" data-testid="progress-percentage">{progressPercent}%</span>
	{/if}
	<div class="book-title" data-testid="book-title">{book.title}</div>
	<div class="book-author" data-testid="book-author">{book.author}</div>
</button>

<style>
	.book-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		background: var(--color-cardBackground);
		border: 1px solid var(--color-cardBorder);
		padding: 0;
		cursor: pointer;
		text-align: center;
		font-family: inherit;
		position: relative;
		overflow: hidden;
		-webkit-user-select: none;
		user-select: none;
		-webkit-touch-callout: none;
	}
	.book-card::after {
		content: '';
		position: absolute;
		inset: 0;
		box-shadow: inset 0 0 20px var(--color-cardVignette);
		pointer-events: none;
	}
	.book-card:active .book-cover,
	.book-card:active .cover-placeholder {
		opacity: 0.7;
	}

	.cover-wrap {
		position: relative;
		width: 100%;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}
	.book-cover {
		width: 100%;
		height: auto;
		display: block;
		object-fit: contain;
		filter: sepia(0.1) brightness(0.85);
		transition: opacity 0.2s;
	}
	.cover-placeholder {
		width: 100%;
		aspect-ratio: 3/4;
		transition: opacity 0.2s;
		background: linear-gradient(
			135deg,
			var(--color-cardBackground) 0%,
			var(--color-cardBorder) 50%,
			var(--color-backgroundSecondary) 100%
		);
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: 'Cormorant Garamond', serif;
		font-size: 28px;
		color: var(--color-accent);
	}
	.progress-track {
		width: 100%;
		height: 3px;
		background: var(--color-borderMuted);
		flex-shrink: 0;
	}
	.progress-fill {
		height: 100%;
		background: var(--color-accent);
		transition: width 0.3s ease;
	}
	.progress-pct {
		position: absolute;
		right: 4px;
		top: 4px;
		font-size: 10px;
		color: var(--color-accent);
		background: var(--color-cardBackground);
		padding: 0 3px;
		line-height: 1.4;
	}

	.book-title {
		font-family: 'Cormorant Garamond', serif;
		font-size: 14px;
		font-style: italic;
		padding: 8px 8px 2px;
		color: var(--color-text-primary);
		letter-spacing: 0.3px;
		word-break: break-word;
	}
	.book-author {
		font-size: 11px;
		color: var(--color-text-secondary);
		padding: 0 8px 8px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 100%;
	}
</style>
