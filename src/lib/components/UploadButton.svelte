<script lang="ts">
	interface Props {
		onClick?: () => void;
	}

	let { onClick }: Props = $props();
</script>

<button class="upload-button" onclick={onClick} type="button"> Upload Book </button>

<style>
	.upload-button {
		padding: 0.75rem 1.5rem;
		background-color: var(--color-accent, #4a9eff);
		color: var(--color-text-primary, #ffffff);
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		font-size: 1rem;
	}

	.upload-button:hover {
		opacity: 0.9;
	}
</style>
