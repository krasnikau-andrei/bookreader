<script lang="ts">
	import { fade } from 'svelte/transition';

	interface Props {
		show: boolean;
		originalHref: string;
		message: string;
		onClose: () => void;
	}

	let { show, originalHref, message, onClose }: Props = $props();
</script>

{#if show}
	<div class="link-error-popup" data-testid="link-error-popup" transition:fade={{ duration: 200 }}>
		<div class="popup-content">
			<h3>Link Not Available</h3>
			<p>{message}</p>
			<p class="debug-info">Original link: {originalHref}</p>
			<button onclick={onClose}>Close</button>
		</div>
	</div>
{/if}

<style>
	.link-error-popup {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}

	.popup-content {
		background: white;
		padding: 1.5rem;
		border-radius: 8px;
		max-width: 80%;
		text-align: center;
	}

	.popup-content h3 {
		margin-top: 0;
		color: #d32f2f;
	}

	.debug-info {
		font-family: monospace;
		font-size: 0.85rem;
		color: #666;
		background: #f5f5f5;
		padding: 0.5rem;
		border-radius: 4px;
		margin: 1rem 0;
		word-break: break-all;
	}

	.popup-content button {
		background: #4a9eff;
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 1rem;
	}
</style>
