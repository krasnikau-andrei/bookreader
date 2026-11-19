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
	}

	let lines: Line[] = $state([]);

	/** A horizontal line over the text line where each marker's character sits */
	function layout() {
		if (!container || !root) return;
		const box = container.getBoundingClientRect();
		const pageWidth = container.clientWidth;
		const style = getComputedStyle(root);
		const padLeft = parseFloat(style.paddingLeft) || 0;
		const padRight = parseFloat(style.paddingRight) || 0;

		lines = markers.flatMap((m) => {
			const rect = rectAtFraction(root!, m.fraction);
			if (!rect) return [];
			const page = Math.floor((rect.left - box.left + container!.scrollLeft) / pageWidth);
			return [
				{
					id: m.id,
					label: m.label,
					color: markerColor(m.hue),
					left: page * pageWidth + padLeft,
					top: rect.top - box.top,
					width: pageWidth - padLeft - padRight
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

{#each lines as line (line.id)}
	<div
		class="line"
		data-testid="reader-marker"
		style="left: {line.left}px; top: {line.top}px; width: {line.width}px; --marker: {line.color}"
	>
		<span class="label">{line.label}</span>
	</div>
{/each}

<style>
	/* Sits just above the text line, never takes taps from the page */
	.line {
		position: absolute;
		height: 2px;
		margin-top: -3px;
		background: var(--marker);
		border-radius: 1px;
		pointer-events: none;
		z-index: 1;
	}

	.label {
		position: absolute;
		right: 0;
		bottom: 3px;
		font-family: var(--font-family);
		font-size: var(--font-size-xs);
		line-height: 1;
		color: var(--marker);
		white-space: nowrap;
	}
</style>
