<script lang="ts">
	import type { Book } from '$lib/types';

	interface Props {
		book: Book;
		progressPercent: number;
		onclick?: () => void;
		onresume?: (e: Event) => void;
		onkeydown?: (e: KeyboardEvent) => void;
	}

	let { book, progressPercent, onclick, onresume, onkeydown }: Props = $props();

	function handleResume(e: Event) {
		e.stopPropagation();
		onresume?.(e);
	}
</script>

<div class="focus-section" role="button" tabindex="0" {onclick} {onkeydown}>
	<div class="focus-label">The Current Volume</div>
	<div class="focus-row">
		{#if book.cover}
			<img class="cover" src={book.cover} alt={book.title} draggable="false" />
		{:else}
			<div class="cover-placeholder">{book.title.charAt(0)}</div>
		{/if}
		<div class="info">
			<div class="book-title">{book.title}</div>
			<div class="book-author">{book.author}</div>
			{#if book.description}
				<div class="book-description">"{book.description}"</div>
			{/if}
		</div>
	</div>
	<div class="progress-row">
		<span class="percent-label"><strong>{progressPercent}%</strong> complete</span>
	</div>
	<div class="progress-track">
		<div class="progress-fill" style="width: {progressPercent}%"></div>
	</div>
	<button class="resume-btn" onclick={handleResume}>Resume Reading</button>
</div>

<style>
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
		overflow: hidden;
	}
	.cover {
		width: 110px;
		height: 154px;
		object-fit: cover;
		float: right;
		margin: 0 0 8px 20px;
		border: 1px solid var(--color-borderMuted);
		filter: sepia(0.15) brightness(0.85);
	}
	.cover-placeholder {
		width: 110px;
		height: 154px;
		float: right;
		margin: 0 0 8px 20px;
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
		overflow-wrap: break-word;
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
</style>
