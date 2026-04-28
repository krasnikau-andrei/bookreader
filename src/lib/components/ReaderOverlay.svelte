<script lang="ts">
	import { fade } from 'svelte/transition';
	import { theme } from '$lib/theme.svelte';

	interface Props {
		show: boolean;
		onBack: () => void;
		onShowToc: () => void;
	}

	let { show, onBack, onShowToc }: Props = $props();
</script>

{#if show}
	<div
		class="overlay"
		transition:fade={{ duration: 200 }}
		style="background: {theme.colors.overlay}"
	>
		<button class="back-button" onclick={onBack} aria-label="Go back">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M19 12H5M12 19l-7-7 7-7" />
			</svg>
		</button>
		<button class="toc-button" onclick={onShowToc} aria-label="Show table of contents">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<line x1="4" y1="6" x2="20" y2="6" />
				<line x1="4" y1="12" x2="20" y2="12" />
				<line x1="4" y1="18" x2="20" y2="18" />
			</svg>
		</button>
	</div>
{/if}

<style>
	.overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		padding: 1rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		z-index: 20;
	}

	.back-button,
	.toc-button {
		background: white;
		border: none;
		border-radius: 50%;
		width: 44px;
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		transition: background-color 0.15s ease;
	}

	.back-button:hover,
	.toc-button:hover {
		background: #f5f5f5;
	}
</style>
