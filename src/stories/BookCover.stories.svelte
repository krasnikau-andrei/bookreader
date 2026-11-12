<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { theme } from '$lib/theme.svelte';
	import BookCover from '$lib/components/BookCover.svelte';
	import TypographicCover from '$lib/components/TypographicCover.svelte';
	import { ONE_PIXEL_COVER } from './deck-samples';

	const { Story } = defineMeta({
		title: 'Library/BookCover',
		component: BookCover,
		tags: ['autodocs']
	});
</script>

<Story name="Portrait" asChild>
	<div class="frame" style="--book-accent: {theme.colors.accent}">
		<BookCover
			cover="https://placehold.co/552x716/3a2a20/d6caba?text=Cover"
			title="Portrait"
			author="Author"
		/>
	</div>
</Story>

<Story name="Wide" asChild>
	<div class="frame" style="--book-accent: {theme.colors.accent}">
		<BookCover
			cover="https://placehold.co/1500x900/eeeeee/111111?text=Wide"
			title="Wide"
			author="Author"
		/>
	</div>
</Story>

<Story name="OnePixelFallsBack" asChild>
	<div class="frame" style="--book-accent: {theme.colors.accent}">
		<BookCover cover={ONE_PIXEL_COVER} title="Book With Cover" author="Test Author" />
	</div>
</Story>

<Story name="Typographic" asChild>
	<div class="frame" style="--book-accent: {theme.colors.accent}">
		<TypographicCover
			title="Невероятные приключения старого смотрителя маяка на краю холодного северного моря"
			author="Выдуманный Автор"
		/>
	</div>
</Story>

<style>
	.frame {
		height: 380px;
		width: 300px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-background);
	}
</style>
