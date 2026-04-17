<script lang="ts">
	interface Props {
		onClick?: () => void;
	}

	let { onClick }: Props = $props();
</script>

<button class="upload-button" onclick={onClick} type="button" data-testid="upload-button">
	Upload Book
</button>

<style>
	.upload-button {
		padding: var(--padding-sm) var(--padding-lg);
		background-color: var(--color-accent);
		color: var(--color-text-primary);
		border: none;
		border-radius: var(--radius-md);
		cursor: pointer;
		font-size: var(--font-size-lg);
	}

	.upload-button:hover {
		opacity: 0.9;
	}
</style>
