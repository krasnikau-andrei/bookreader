<script lang="ts">
	import { fade } from 'svelte/transition';
	import { goto } from '$app/navigation';

	interface Props {
		show: boolean;
	}

	let { show }: Props = $props();

	function goBack() {
		goto('/');
	}
</script>

{#if show}
	<div class="overlay" transition:fade={{ duration: 200 }}>
		<button class="back-button" onclick={goBack} aria-label="Go back">
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
		background: linear-gradient(to bottom, rgba(0, 0, 0, 0.5), transparent);
		z-index: 20;
	}

	.back-button {
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
	}

	.back-button:hover {
		background: #f5f5f5;
	}
</style>
