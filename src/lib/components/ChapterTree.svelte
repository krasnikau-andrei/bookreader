<script lang="ts">
	import type { Chapter } from '$lib/types';

	interface Props {
		chapters: Chapter[];
		currentChapter: number;
		onChapterSelect: (chapterIndex: number) => void;
	}

	let { chapters, currentChapter, onChapterSelect }: Props = $props();

	function getIndentation(level: number | undefined): string {
		const basePadding = 1.5; // rem
		const indentPerLevel = 1.5; // rem
		return `${basePadding + (level || 0) * indentPerLevel}rem`;
	}
</script>

<nav class="chapter-tree" aria-label="Table of contents">
	<ul class="chapter-list" role="tree">
		{#each chapters as chapter, index (chapter.id)}
			<li class="chapter-item" role="treeitem" aria-level={(chapter.level || 0) + 1}>
				<button
					class="chapter-button"
					class:current={index === currentChapter}
					class:nested={(chapter.level || 0) > 0}
					style="padding-left: {getIndentation(chapter.level)}"
					onclick={() => onChapterSelect(index)}
					aria-current={index === currentChapter ? 'page' : undefined}
					aria-selected={index === currentChapter ? 'true' : 'false'}
					data-testid="chapter-item"
					data-chapter-index={index}
					data-level={chapter.level || 0}
					title={chapter.title}
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
		border-bottom: 1px solid var(--color-borderMuted);
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
		color: var(--color-text-primary);
		transition: background-color 0.15s ease;
		display: flex;
		align-items: center;
	}

	.chapter-button:hover {
		background-color: var(--color-backgroundTertiary);
	}

	.chapter-button.current {
		background-color: var(--color-backgroundTertiary);
		border-left: 3px solid var(--color-accent);
		font-weight: 600;
	}

	.chapter-button.nested {
		font-size: 0.9375rem;
		color: var(--color-text-secondary);
	}

	.chapter-title {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		line-height: 1.4;
	}
</style>
