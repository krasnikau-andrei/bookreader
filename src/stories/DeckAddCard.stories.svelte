<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from '@storybook/test';
	import DeckAddCard from '$lib/components/DeckAddCard.svelte';

	const { Story } = defineMeta({
		title: 'Library/DeckAddCard',
		component: DeckAddCard,
		tags: ['autodocs'],
		parameters: { layout: 'fullscreen' },
		args: { onadd: fn() }
	});
</script>

<Story name="EndOfDeck" />

<Story name="EmptyLibrary" args={{ isEmpty: true }} />
