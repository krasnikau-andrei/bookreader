<script lang="ts">
	import type { Book } from '$lib/types';
	import DeckCard from './DeckCard.svelte';
	import DeckAddCard from './DeckAddCard.svelte';
	import DeckTopBar from './DeckTopBar.svelte';

	interface Props {
		books: Book[];
		progressMap?: Record<string, number>;
		lastReadMap?: Record<string, Date>;
		onopen?: (bookId: string) => void;
		onpressstart?: (bookId: string) => void;
		onpressend?: () => void;
		onfilechange?: (file: File) => void;
	}

	let {
		books,
		progressMap = {},
		lastReadMap = {},
		onopen,
		onpressstart,
		onpressend,
		onfilechange
	}: Props = $props();

	let fileInput: HTMLInputElement | undefined = $state();
	let deck: HTMLDivElement | undefined = $state();
	let position = $state(1);

	// Before the library loads the deck holds only the add card, and scroll snapping
	// would keep it in view once the books arrive. Start from the first book instead.
	let hadBooks = false;
	$effect(() => {
		const hasBooks = books.length > 0;
		if (hasBooks && !hadBooks && deck) deck.scrollTop = 0;
		hadBooks = hasBooks;
	});

	/** Brings a book's card into view, e.g. right after it was uploaded. */
	export function scrollToBook(bookId: string) {
		const index = books.findIndex((b) => b.id === bookId);
		if (deck && index >= 0) deck.scrollTo({ top: index * deck.clientHeight });
	}

	function pickFile() {
		fileInput?.click();
	}

	function handleChange(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		onfilechange?.(file);
		input.value = '';
	}

	function handleScroll(e: Event) {
		const el = e.currentTarget as HTMLElement;
		position = Math.round(el.scrollTop / el.clientHeight) + 1;
	}
</script>

<DeckTopBar
	position={position <= books.length ? position : 0}
	total={books.length}
	onadd={pickFile}
/>

<div class="deck" bind:this={deck} onscroll={handleScroll}>
	{#each books as book, i (book.id)}
		<DeckCard
			{book}
			progressPercent={progressMap[book.id] || 0}
			lastReadAt={lastReadMap[book.id]}
			isCurrent={i === 0}
			onClick={() => onopen?.(book.id)}
			onTouchStart={() => onpressstart?.(book.id)}
			onTouchEnd={onpressend}
			onTouchCancel={onpressend}
			onContextMenu={(e) => {
				e.preventDefault();
				onpressstart?.(book.id);
			}}
		/>
	{/each}
	<DeckAddCard isEmpty={books.length === 0} onadd={pickFile} />
</div>

<input type="file" accept=".epub" bind:this={fileInput} onchange={handleChange} hidden />

<style>
	.deck {
		height: 100dvh;
		overflow-y: auto;
		scroll-snap-type: y mandatory;
		overscroll-behavior: contain;
		scrollbar-width: none;
		background: var(--color-background);
	}
	.deck::-webkit-scrollbar {
		display: none;
	}
</style>
