<script lang="ts">
	import { tick } from 'svelte';
	import { rectAtFraction } from '$lib/reader/text-position';
	import { markerColor } from '$lib/theme.svelte';
	import type { TextMarker } from '$lib/types';

	interface Props {
		/** The paged scroll container; lines are placed in its scroll coordinates */
		container: HTMLElement | null;
		/** The element holding the chapter text */
		root: HTMLElement | null;
		/** Changes whenever the chapter HTML does, so lines are placed again */
		content: string;
		markers: TextMarker[];
	}

	let { container, root, content, markers }: Props = $props();

	interface Line {
		id: string;
		label: string;
		color: string;
		left: number;
		top: number;
		width: number;
		/** Width of the page margin left of the text; the name chip starts inside it */
		margin: number;
	}

	let lines: Line[] = $state([]);

	/** A line in the gap above the text line where each marker's character sits */
	function layout() {
		if (!container || !root) return;
		const box = container.getBoundingClientRect();
		const pageWidth = container.clientWidth;
		const style = getComputedStyle(root);
		const padLeft = parseFloat(style.paddingLeft) || 0;
		const padRight = parseFloat(style.paddingRight) || 0;
		const lineHeight = parseFloat(style.lineHeight);

		lines = markers.flatMap((m) => {
			const rect = rectAtFraction(root!, m.fraction);
			if (!rect) return [];
			const page = Math.floor((rect.left - box.left + container!.scrollLeft) / pageWidth);
			// The character's box is shorter than the line; the rest is the gap between lines
			const gap = Number.isFinite(lineHeight) ? Math.max(0, lineHeight - rect.height) : 0;
			return [
				{
					id: m.id,
					label: m.label,
					color: markerColor(m.hue),
					left: page * pageWidth + padLeft,
					top: rect.top - box.top - gap / 2,
					width: pageWidth - padLeft - padRight,
					margin: padLeft
				}
			];
		});
	}

	$effect(() => {
		// Re-place when markers, chapter text or the elements change
		void [markers, content, container, root];
		let frame = 0;
		tick().then(() => (frame = requestAnimationFrame(layout)));
		window.addEventListener('resize', layout);
		return () => {
			cancelAnimationFrame(frame);
			window.removeEventListener('resize', layout);
		};
	});
</script>

<!-- aside/hr/mark on purpose: the reader forces colours on every div and span inside the page -->
{#each lines as line (line.id)}
	<aside
		class="marker"
		data-testid="reader-marker"
		style="left: {line.left}px; top: {line.top}px; width: {line.width}px; --marker: {line.color}; --margin: {line.margin}px"
	>
		<hr />
		<mark>{line.label}</mark>
	</aside>
{/each}

<style>
	/* Centred in the gap between two text lines, never takes taps from the page */
	.marker {
		position: absolute;
		height: 2px;
		margin-top: -1px;
		pointer-events: none;
		z-index: 1;
	}

	/* Strong at the name, fading out to the right so it reads as a bookmark, not an underline */
	hr {
		margin: 0;
		border: none;
		border-top: 2px solid var(--marker);
		border-radius: 1px;
		-webkit-mask-image: linear-gradient(to right, var(--marker) 20%, transparent);
		mask-image: linear-gradient(to right, var(--marker) 20%, transparent);
	}

	/* A name chip sitting on the line, starting in the page margin */
	mark {
		position: absolute;
		top: 1px;
		left: calc(4px - var(--margin));
		transform: translateY(-50%);
		padding: 2px 7px;
		border: 1px solid var(--marker);
		border-radius: 999px;
		font-family: var(--font-family);
		font-size: var(--font-size-xs);
		font-weight: 600;
		line-height: 1;
		color: var(--marker);
		background: var(--color-readerBackground);
		white-space: nowrap;
	}
</style>
