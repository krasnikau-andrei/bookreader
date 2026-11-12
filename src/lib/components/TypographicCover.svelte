<script lang="ts">
	import { titleFontSize } from '$lib/library/book-title';

	interface Props {
		title: string;
		author: string;
	}

	let { title, author }: Props = $props();
</script>

<!-- Stand-in for books without a usable cover image -->
<div class="cover-placeholder">
	<div>
		<div class="author">{author}</div>
		<div class="rule"></div>
	</div>
	<div class="title" style="font-size: {titleFontSize(title, 40, 20)}px">{title}</div>
</div>

<style>
	.cover-placeholder {
		height: 100%;
		aspect-ratio: 2 / 3;
		max-width: 100%;
		border: 1px solid var(--color-cardBorder);
		background: var(--color-background);
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		padding: 10% 9%;
		box-sizing: border-box;
		overflow: hidden;
	}
	.author {
		font-size: 9px;
		letter-spacing: 1px;
		text-transform: uppercase;
		color: var(--color-text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.rule {
		height: 1px;
		width: 30%;
		margin: 8px 0;
		background: var(--book-accent);
	}
	.title {
		font-family: 'Cormorant Garamond', serif;
		font-weight: 700;
		font-variant-numeric: lining-nums;
		line-height: 1.12;
		text-wrap: balance;
		overflow-wrap: anywhere;
		hyphens: auto;
		color: var(--color-text-primary);
	}
</style>
