<script lang="ts">
	import TypographicCover from './TypographicCover.svelte';
	import { accentFromImage } from '$lib/library/cover-accent';

	interface Props {
		cover: string | null;
		title: string;
		author: string;
		onaccent?: (color: string) => void;
	}

	let { cover, title, author, onaccent }: Props = $props();

	// Hand-made EPUBs sometimes ship 1x1 placeholders or broken images as the cover
	const MIN_COVER_PX = 32;
	let unusable = $state(false);

	function handleLoad(e: Event) {
		const img = e.currentTarget as HTMLImageElement;
		if (img.naturalWidth < MIN_COVER_PX || img.naturalHeight < MIN_COVER_PX) {
			unusable = true;
			return;
		}
		const accent = accentFromImage(img);
		if (accent) onaccent?.(accent);
	}
</script>

{#if cover && !unusable}
	<img
		class="book-cover"
		src={cover}
		alt={title}
		draggable="false"
		onload={handleLoad}
		onerror={() => (unusable = true)}
	/>
{:else}
	<TypographicCover {title} {author} />
{/if}

<style>
	.book-cover {
		display: block;
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
		filter: var(--cover-filter);
	}
</style>
