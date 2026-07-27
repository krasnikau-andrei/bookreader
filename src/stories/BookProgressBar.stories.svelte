<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import BookProgressBar from '$lib/components/BookProgressBar.svelte';

	const { Story } = defineMeta({
		title: 'Components/BookProgressBar',
		component: BookProgressBar,
		tags: ['autodocs']
	});

	const chapterSizes = [1200, 3400, 2100, 1800, 2600];
</script>

<Story
	name="NotStarted"
	args={{
		chapterSizes,
		currentChapter: 0,
		scrollPercent: 0
	}}
/>

<Story
	name="MidBook"
	args={{
		chapterSizes,
		currentChapter: 2,
		scrollPercent: 0.19
	}}
/>

<Story
	name="Finished"
	args={{
		chapterSizes,
		currentChapter: 4,
		scrollPercent: 1
	}}
/>
