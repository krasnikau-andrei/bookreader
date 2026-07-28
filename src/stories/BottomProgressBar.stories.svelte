<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import BottomProgressBar from '$lib/components/BottomProgressBar.svelte';

	const { Story } = defineMeta({
		title: 'Components/BottomProgressBar',
		component: BottomProgressBar,
		tags: ['autodocs']
	});

	const chapterSizes = [1200, 3400, 2100, 1800, 2600];
</script>

<Story
	name="MidBook"
	args={{
		chapterSizes,
		currentChapter: 2,
		scrollPercent: 0.19
	}}
/>

<Story
	name="ChapterSizesMissing"
	args={{
		chapterSizes: undefined,
		currentChapter: 0,
		scrollPercent: 0
	}}
/>
