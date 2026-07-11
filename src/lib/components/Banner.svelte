<script lang="ts">
	interface Props {
		message: string;
		variant?: 'error' | 'info';
		onDismiss?: () => void;
	}

	let { message, variant = 'error', onDismiss }: Props = $props();
</script>

<div class="banner {variant}" data-testid="{variant}-message">
	<p>{message}</p>
	<button onclick={onDismiss} type="button">Dismiss</button>
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

	.banner button {
		background: rgba(255, 255, 255, 0.2);
		border: none;
		color: var(--color-text-primary);
		padding: var(--padding-sm) var(--padding-md);
		border-radius: var(--radius-sm);
		cursor: pointer;
		font-size: var(--font-size-sm);
	}
</style>
