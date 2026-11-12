<script lang="ts">
	interface Props {
		position?: number;
		total?: number;
		onadd?: () => void;
	}

	let { position = 0, total = 0, onadd }: Props = $props();
</script>

<header class="top-bar">
	<span class="brand">Bibliotheca</span>
	<span class="right">
		{#if total > 0 && position > 0}
			<span class="counter">{position} / {total}</span>
		{/if}
		<button
			class="add"
			type="button"
			aria-label="Add book"
			data-testid="upload-button"
			onclick={onadd}>+</button
		>
	</span>
</header>

<style>
	.top-bar {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 2;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: calc(env(safe-area-inset-top) + 14px) 18px 0 26px;
		pointer-events: none;
	}
	.brand {
		font-family: 'Cormorant Garamond', serif;
		font-size: 12px;
		letter-spacing: 7px;
		text-transform: uppercase;
		color: var(--color-text-primary);
	}
	.right {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.counter {
		font-size: 11px;
		color: var(--color-text-secondary);
	}
	.add {
		pointer-events: auto;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		border: 1px solid var(--color-cardBorder);
		background: var(--color-background);
		color: var(--color-accent);
		font-size: 22px;
		line-height: 1;
		font-family: inherit;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		cursor: pointer;
	}
</style>
