<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		message: string;
		variant?: 'error' | 'info';
		onDismiss?: () => void;
		children?: Snippet;
	}

	let { message, variant = 'error', onDismiss, children }: Props = $props();
</script>

<div class="banner {variant}" data-testid="{variant}-message">
	<p>{message}</p>
	<div class="banner-actions">
		{@render children?.()}
		<button onclick={onDismiss} type="button">Dismiss</button>
	</div>
</div>

<style>
	.banner {
		color: var(--color-text-primary);
		padding: var(--padding-md);
		margin-bottom: var(--padding-md);
		border-radius: var(--radius-md);
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.banner.error {
		background-color: var(--color-error);
	}

	.banner.info {
		background-color: var(--color-accent);
	}

	.banner p {
		margin: 0;
	}

	.banner-actions {
		display: flex;
		gap: 8px;
		align-items: center;
	}

	.banner-actions :global(*) {
		background: var(--color-bannerAction);
		border: none;
		color: var(--color-text-primary);
		padding: var(--padding-sm) var(--padding-md);
		border-radius: var(--radius-sm);
		cursor: pointer;
		font-size: var(--font-size-sm);
	}
</style>
