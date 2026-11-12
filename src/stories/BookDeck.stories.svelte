<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from '@storybook/test';
	import BookDeck from '$lib/components/BookDeck.svelte';
	import { sampleBooks, sampleLastRead, sampleProgress } from './deck-samples';

	const { Story } = defineMeta({
		title: 'Library/BookDeck',
		component: BookDeck,
		tags: ['autodocs'],
		parameters: { layout: 'fullscreen' },
		args: {
			onopen: fn(),
			onpressstart: fn(),
			onpressend: fn(),
			onfilechange: fn()
		}
	});
</script>

<Story
	name="Default"
	args={{ books: sampleBooks, progressMap: sampleProgress, lastReadMap: sampleLastRead }}
/>

<Story name="Empty" args={{ books: [] }} />
