<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from '@storybook/test';
	import DeckTopBar from '$lib/components/DeckTopBar.svelte';

	const { Story } = defineMeta({
		title: 'Library/DeckTopBar',
		component: DeckTopBar,
		tags: ['autodocs'],
		parameters: { layout: 'fullscreen' },
		args: { onadd: fn() }
	});
</script>

<Story name="WithCounter" args={{ position: 2, total: 12 }} />

<Story name="OnAddCard" args={{ position: 0, total: 12 }} />
