<script lang="ts">
	interface Props {
		message: string;
		onDismiss?: () => void;
	}

	let { message, onDismiss }: Props = $props();
</script>

<div class="error-banner" data-testid="error-message">
	<p>{message}</p>
	<button onclick={onDismiss} type="button">Dismiss</button>
</div>

<style>
	.error-banner {
		background-color: var(--color-error);
		color: var(--color-text-primary);
		padding: var(--padding-md);
		margin-bottom: var(--padding-md);
		border-radius: var(--radius-md);
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.error-banner p {
		margin: 0;
	}

	.error-banner button {
		background: rgba(255, 255, 255, 0.2);
		border: none;
		color: var(--color-text-primary);
		padding: var(--padding-sm) var(--padding-md);
		border-radius: var(--radius-sm);
		cursor: pointer;
		font-size: var(--font-size-sm);
	}
</style>
