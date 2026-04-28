<script lang="ts">
	import type { Chapter } from '$lib/types';

	interface Props {
		chapters: Chapter[];
		currentChapter: number;
		onChapterSelect: (chapterIndex: number) => void;
	}

	let { chapters, currentChapter, onChapterSelect }: Props = $props();

	function handleChapterClick(index: number) {
		onChapterSelect(index);
	}

	function isCurrentChapter(index: number): boolean {
		return index === currentChapter;
	}
</script>

<nav class="chapter-tree" aria-label="Table of contents">
	<ul class="chapter-list">
		{#each chapters as chapter, index (chapter.id)}
			<li class="chapter-item">
				<button
					class="chapter-button"
					class:current={isCurrentChapter(index)}
					onclick={() => handleChapterClick(index)}
					aria-current={isCurrentChapter(index) ? 'page' : undefined}
					data-testid="chapter-item"
					data-chapter-index={index}
				>
					<span class="chapter-title">{chapter.title}</span>
				</button>
			</li>
		{/each}
	</ul>
</nav>

<style>
	.chapter-tree {
		padding: 0.5rem 0;
	}

	.chapter-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.chapter-item {
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.chapter-item:last-child {
		border-bottom: none;
	}

	.chapter-button {
		width: 100%;
		padding: 1rem 1.5rem;
		background: none;
		border: none;
		text-align: left;
		cursor: pointer;
		font-size: 1rem;
		color: #ffffff;
		transition: background-color 0.15s ease;
		display: flex;
		align-items: center;
	}

	.chapter-button:hover {
		background-color: rgba(255, 255, 255, 0.1);
	}

	.chapter-button.current {
		background-color: rgba(74, 158, 255, 0.2);
		font-weight: 600;
	}

	.chapter-title {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
