<script lang="ts">
	import type { Book } from '$lib/types';
	import { theme } from '$lib/theme.svelte';
	import BookCover from './BookCover.svelte';
	import { splitTitle, cleanText, titleFontSize } from '$lib/library/book-title';
	import { bookMood } from '$lib/library/book-mood';
	import { formatLastOpened } from '$lib/library/last-opened';

	interface Props {
		book: Book;
		progressPercent?: number;
		lastReadAt?: Date;
		isCurrent?: boolean;
		onClick?: () => void;
		onTouchStart?: (e: TouchEvent | MouseEvent) => void;
		onTouchEnd?: () => void;
		onTouchCancel?: () => void;
		onContextMenu?: (e: MouseEvent) => void;
	}

	let {
		book,
		progressPercent = 0,
		lastReadAt,
		isCurrent = false,
		onClick,
		onTouchStart,
		onTouchEnd,
		onTouchCancel,
		onContextMenu
	}: Props = $props();

	let accent = $state(theme.colors.accent);
	const title = $derived(splitTitle(book.title));
	const author = $derived(cleanText(book.author));
	const mood = $derived(bookMood(book.subjects ?? [], book.title));
	const eyebrow = $derived.by(() => {
		if (!lastReadAt) return 'New';
		const ago = formatLastOpened(lastReadAt);
		return isCurrent ? `Continue · ${ago}` : `Opened ${ago}`;
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') onClick?.();
	}
</script>

<div
	class="deck-card"
	style="--book-accent: {accent}"
	role="button"
	tabindex="0"
	data-testid="book-card"
	onclick={onClick}
	onkeydown={handleKeydown}
	oncontextmenu={onContextMenu}
	ontouchstart={onTouchStart}
	ontouchend={onTouchEnd}
	ontouchcancel={onTouchCancel}
	onmousedown={onTouchStart}
	onmouseup={onTouchEnd}
>
	{#if mood}
		<div class="mood" aria-hidden="true">{mood}</div>
	{/if}
	<div class="art">
		<BookCover cover={book.cover} title={title.main} {author} onaccent={(c) => (accent = c)} />
	</div>
	<div class="text">
		<div class="eyebrow">{eyebrow}</div>
		<h2
			class="title"
			data-testid="book-title"
			style="font-size: {titleFontSize(title.main, 52, 28)}px"
		>
			{title.main}
		</h2>
		{#if title.subtitle}
			<div class="subtitle">{title.subtitle}</div>
		{/if}
		<div class="author" data-testid="book-author">{author}</div>
		{#if progressPercent > 0}
			<div class="progress-track" data-testid="progress-bar">
				<div class="progress-fill" style="width: {progressPercent}%"></div>
			</div>
		{/if}
		<div class="foot">
			<span class="action">{progressPercent > 0 ? 'Read' : 'Start'}</span>
			{#if progressPercent > 0}
				<span class="pct" data-testid="progress-percentage">{progressPercent}%</span>
			{/if}
		</div>
	</div>
</div>

<style>
	.deck-card {
		height: 100dvh;
		scroll-snap-align: start;
		scroll-snap-stop: always;
		position: relative;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		padding: calc(env(safe-area-inset-top) + 64px) 26px calc(env(safe-area-inset-bottom) + 40px);
		box-sizing: border-box;
		cursor: pointer;
		user-select: none;
		-webkit-user-select: none;
		-webkit-touch-callout: none;
		outline: none;
	}
	/* Genre mark: huge, faint, cut off by the card edge */
	.mood {
		position: absolute;
		right: -60px;
		bottom: 60px;
		font-size: 280px;
		line-height: 1;
		opacity: 0.14;
		transform: rotate(-14deg);
		pointer-events: none;
	}
	.art {
		flex: 1 1 auto;
		min-height: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		padding-bottom: 24px;
		position: relative;
	}
	.art :global(.cover-placeholder) {
		max-height: 380px;
	}
	.text {
		flex: 0 0 auto;
		position: relative;
		min-width: 0;
	}
	.eyebrow {
		font-size: 10px;
		letter-spacing: 2.5px;
		text-transform: uppercase;
		color: var(--book-accent);
	}
	/* Cormorant's default old-style figures drop below the baseline and get clipped by line-clamp */
	.title {
		margin: 8px 0 6px;
		font-family: 'Cormorant Garamond', serif;
		font-weight: 700;
		font-variant-numeric: lining-nums;
		line-height: 1.1;
		letter-spacing: -0.5px;
		text-wrap: balance;
		overflow-wrap: anywhere;
		hyphens: auto;
		color: var(--color-text-primary);
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		overflow: hidden;
	}
	.subtitle {
		font-family: 'Cormorant Garamond', serif;
		font-style: italic;
		font-size: 15px;
		color: var(--color-text-secondary);
		margin-bottom: 4px;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		overflow: hidden;
	}
	.author {
		font-size: 12px;
		color: var(--color-text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.progress-track {
		height: 2px;
		margin-top: 14px;
		background: var(--color-progressTrack);
	}
	.progress-fill {
		height: 100%;
		background: var(--book-accent);
	}
	.foot {
		display: flex;
		align-items: center;
		gap: 14px;
		margin-top: 18px;
	}
	.action {
		font-weight: 600;
		font-size: 14px;
		background: var(--color-text-primary);
		color: var(--color-background);
		padding: 13px 24px;
		border-radius: 30px;
	}
	.pct {
		font-size: 12px;
		color: var(--color-text-secondary);
	}
</style>
