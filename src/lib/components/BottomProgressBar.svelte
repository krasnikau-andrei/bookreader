<script lang="ts">
	import BookProgressBar from './BookProgressBar.svelte';

	interface Props {
		chapterSizes: number[];
		currentChapter: number;
		scrollPercent: number;
	}

	let { chapterSizes, currentChapter, scrollPercent }: Props = $props();
</script>

{#if chapterSizes.length}
	<div class="progress-bottom-bar" data-testid="progress-bottom-bar">
		<BookProgressBar {chapterSizes} {currentChapter} {scrollPercent} />
	</div>
{/if}

<style>
	.progress-bottom-bar {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 10;
		padding: 4px 20px 8px;
		background: var(--color-readerBackground);
	}

	.progress-bottom-bar :global(.progress-track) {
		height: 3px !important;
	}

	.progress-bottom-bar :global(.progress-percentage) {
		font-size: 10px !important;
	}
</style>
