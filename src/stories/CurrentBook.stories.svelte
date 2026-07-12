<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from '@storybook/test';
	import CurrentBook from '$lib/components/CurrentBook.svelte';
	import type { Book } from '$lib/types';

	const { Story } = defineMeta({
		title: 'Library/CurrentBook',
		component: CurrentBook,
		tags: ['autodocs'],
		argTypes: {
			onclick: { action: 'click' },
			onresume: { action: 'resume' }
		}
	});

	const sampleBook: Book = {
		id: '1',
		title: 'The Great Gatsby',
		author: 'F. Scott Fitzgerald',
		cover: null,
		description: 'A story of the fabulously wealthy Jay Gatsby.',
		format: 'epub',
		addedAt: new Date(),
		filename: 'gatsby.epub',
		language: 'en'
	};
</script>

<Story
	name="Default"
	args={{
		book: sampleBook,
		progressPercent: 42,
		onclick: fn(),
		onresume: fn()
	}}
/>

<Story
	name="WithCover"
	args={{
		book: { ...sampleBook, cover: 'https://picsum.photos/seed/book/220/308' },
		progressPercent: 73,
		onclick: fn(),
		onresume: fn()
	}}
/>
