<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'Reader/ReaderMarkers',
		tags: ['autodocs'],
		parameters: { layout: 'fullscreen' }
	});
</script>

<script lang="ts">
	import ReaderMarkers from '$lib/components/ReaderMarkers.svelte';

	let container: HTMLElement | null = $state(null);
	let root: HTMLElement | null = $state(null);

	const text = Array.from(
		{ length: 6 },
		(_, i) =>
			`<p>Paragraph ${i + 1}. It was a bright cold day in April, and the clocks were striking thirteen. Winston Smith, his chin nuzzled into his breast in an effort to escape the vile wind, slipped quickly through the glass doors of Victory Mansions.</p>`
	).join('');

	const markers = [
		{ id: 'anya', label: 'Аня', hue: 200, fraction: 0.2 },
		{ id: 'petya', label: 'Петя', hue: 330, fraction: 0.6 }
	];
</script>

<Story name="TwoFriendsInOneChapter" asChild>
	<div class="pages" bind:this={container}>
		<div class="inner" bind:this={root}>
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html text}
		</div>
		<ReaderMarkers {container} {root} content={text} {markers} />
	</div>
</Story>

<style>
	/* A cut-down copy of the reader's paged layout */
	.pages {
		position: relative;
		height: 100dvh;
		column-width: calc(100vw - 2rem);
		column-gap: 0;
		overflow-x: scroll;
		padding: 5px 0 25px;
		box-sizing: border-box;
		line-height: 1.6;
		background: var(--color-readerBackground);
		color: var(--color-readerText);
		font-size: var(--font-size-readerText);
	}

	.inner {
		padding: 0 20px;
	}
</style>
