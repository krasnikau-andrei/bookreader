<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import BookProgressBar from '$lib/components/BookProgressBar.svelte';

	const { Story } = defineMeta({
		title: 'Reader/BookProgressBar',
		component: BookProgressBar,
		tags: ['autodocs']
	});
</script>

<Story
	name="WithFriends"
	args={{
		chapterSizes: [800, 1200, 1500, 900, 1100],
		currentChapter: 1,
		scrollPercent: 0.4,
		markers: [
			{ id: 'anya', label: 'Аня', hue: 200, percent: 0.48 },
			{ id: 'petya', label: 'Петя', hue: 330, percent: 0.12 }
		]
	}}
/>

<Story
	name="NoFriends"
	args={{ chapterSizes: [800, 1200, 1500], currentChapter: 0, scrollPercent: 0.7 }}
/>
