<script lang="ts">
	import EmptyState from './EmptyState.svelte';

	interface Props {
		isEmpty?: boolean;
		onadd?: () => void;
	}

	let { isEmpty = false, onadd }: Props = $props();
</script>

<section class="add-card">
	<button class="slot" type="button" aria-label="Add book" data-testid="add-card" onclick={onadd}
		>+</button
	>
	{#if isEmpty}
		<EmptyState />
	{:else}
		<h2 class="title">Add a book</h2>
		<p class="hint">Any .epub file. The end of the deck is always where the next one goes.</p>
	{/if}
</section>

<style>
	.add-card {
		height: 100dvh;
		scroll-snap-align: start;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 18px;
		padding: 0 26px;
		text-align: center;
		box-sizing: border-box;
	}
	.slot {
		width: 180px;
		aspect-ratio: 2 / 3;
		border: 1px dashed var(--color-cardBorder);
		background: var(--color-background);
		color: var(--color-text-secondary);
		font-size: 56px;
		font-weight: 300;
		font-family: inherit;
		cursor: pointer;
	}
	.title {
		margin: 0;
		font-family: 'Cormorant Garamond', serif;
		font-size: 34px;
		font-weight: 700;
		color: var(--color-text-primary);
	}
	.hint {
		margin: 0;
		max-width: 240px;
		font-size: 12px;
		line-height: 1.5;
		color: var(--color-text-secondary);
	}
</style>
