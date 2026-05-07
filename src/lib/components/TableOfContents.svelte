<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import ChapterTree from './ChapterTree.svelte';
	import type { Chapter } from '$lib/types';

	interface Props {
		show: boolean;
		chapters: Chapter[];
		currentChapter: number;
		onChapterSelect: (chapterIndex: number) => void;
		onClose: () => void;
	}

	let { show, chapters, currentChapter, onChapterSelect, onClose }: Props = $props();

	let tocContentEl: HTMLDivElement | undefined = $state();

	function scrollToCurrentChapter() {
		if (!tocContentEl) return;
		const button = tocContentEl.querySelector(
			`[data-chapter-index="${currentChapter}"]`
		) as HTMLElement | null;
		button?.scrollIntoView?.({ behavior: 'auto', block: 'center' });
	}

	$effect(() => {
		if (show) {
			requestAnimationFrame(scrollToCurrentChapter);
		}
	});

	function handleChapterSelect(index: number) {
		onChapterSelect(index);
		onClose();
	}
</script>

{#if show}
	<div
		class="toc-overlay"
		data-testid="toc-overlay"
		transition:fade={{ duration: 200 }}
		onclick={onClose}
	>
		<div
			class="toc-panel"
			role="dialog"
			aria-label="Table of contents"
			transition:fly={{ y: 50, duration: 300 }}
			onclick={(e) => e.stopPropagation()}
		>
			<header class="toc-header">
				<h2 class="toc-title">Table of Contents</h2>
				<button
					type="button"
					class="close-button"
					aria-label="Close table of contents"
					data-testid="toc-close-button"
					onclick={(e) => {
						e.stopPropagation();
						onClose();
					}}
				>
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
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
			</header>
			<div class="toc-content" bind:this={tocContentEl}>
				<ChapterTree {chapters} {currentChapter} onChapterSelect={handleChapterSelect} />
			</div>
		</div>
	</div>
{/if}

<style>
	.toc-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.8);
		z-index: 100;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}

	.toc-panel {
		background: #1a1a2e;
		border-radius: 12px;
		width: 100%;
		max-width: 500px;
		max-height: 80vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.toc-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.toc-title {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #ffffff;
	}

	.close-button {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.5rem;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #ffffff;
		transition: background-color 0.15s ease;
	}

	.close-button:hover {
		background-color: rgba(255, 255, 255, 0.1);
	}

	.toc-content {
		overflow-y: auto;
		flex: 1;
	}
</style>
