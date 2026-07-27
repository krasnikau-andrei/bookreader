<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from '@storybook/test';
	import BookCard from '$lib/components/BookCard.svelte';
	import type { Book } from '$lib/types';

	const { Story } = defineMeta({
		title: 'Library/BookCard',
		component: BookCard,
		tags: ['autodocs'],
		argTypes: {
			onClick: { action: 'clicked' },
			onTouchStart: { action: 'touchStarted' },
			onTouchEnd: { action: 'touchEnded' },
			onContextMenu: { action: 'contextMenu' }
		}
	});
</script>

<script lang="ts">
	const sampleBook: Book = {
		id: '1',
		title: 'The Great Gatsby',
		author: 'F. Scott Fitzgerald',
		cover: null,
		format: 'epub',
		addedAt: new Date(),
		filename: 'great-gatsby.epub'
	};

	const sampleBookWithCover: Book = {
		id: '2',
		title: '1984',
		author: 'George Orwell',
		cover: 'https://placehold.co/200x300/2a2a4a/ffffff?text=1984',
		format: 'epub',
		addedAt: new Date(),
		filename: '1984.epub'
	};
</script>

<Story
	name="WithCover"
	args={{
		book: sampleBookWithCover,
		onClick: fn()
	}}
/>

<Story
	name="WithoutCover"
	args={{
		book: sampleBook,
		onClick: fn()
	}}
/>

<Story name="Grid" asChild>
	<div class="books-grid">
		<BookCard book={sampleBookWithCover} onClick={fn()} />
		<BookCard book={sampleBook} onClick={fn()} />
		<BookCard
			book={{
				...sampleBookWithCover,
				id: '3',
				title: 'Pride and Prejudice',
				author: 'Jane Austen',
				cover: 'https://placehold.co/200x300/4a2a4a/ffffff?text=P%26P'
			}}
			onClick={fn()}
		/>
		<BookCard
			book={{
				...sampleBook,
				id: '4',
				title: 'Moby Dick',
				author: 'Herman Melville',
				filename: 'moby-dick.epub'
			}}
			onClick={fn()}
		/>
	</div>
</Story>

<style>
	.books-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: 1rem;
		padding: 1rem;
		max-width: 600px;
	}
</style>
