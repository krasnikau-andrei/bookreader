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
		background-color: #ff4444;
		color: white;
		padding: 1rem;
		margin-bottom: 1rem;
		border-radius: 0.5rem;
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
		color: white;
		padding: 0.5rem 1rem;
		border-radius: 0.25rem;
		cursor: pointer;
	}
</style>
