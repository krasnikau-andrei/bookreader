<script lang="ts">
	import { calculateBookProgress } from '$lib/reader/progress';
	import { markerColor } from '$lib/theme.svelte';
	import type { ProgressMarker } from '$lib/types';

	interface Props {
		chapterSizes: number[];
		currentChapter: number;
		scrollPercent: number;
		markers?: ProgressMarker[];
	}

	let { chapterSizes, currentChapter, scrollPercent, markers = [] }: Props = $props();

	const toPct = (fraction: number) => Math.max(0, Math.min(100, fraction * 100));

	let bookProgressPct = $derived(
		Math.round(calculateBookProgress(chapterSizes, currentChapter, scrollPercent) * 100)
	);
</script>

{#if chapterSizes?.length}
	<div class="book-progress-bar" data-testid="progress-bar">
		<div class="track-wrap">
			<div class="progress-track">
				{#each chapterSizes as size, i (i)}
					<div
						class="progress-segment"
						data-testid="progress-segment"
						class:filled={i < currentChapter}
						class:partial={i === currentChapter}
						style="flex: {size}"
					>
						{#if i < currentChapter}
							<div class="segment-fill full"></div>
						{:else if i === currentChapter && scrollPercent > 0}
							<div
								class="segment-fill"
								style="width: {Math.max(0, Math.min(100, scrollPercent * 100))}%"
							></div>
						{/if}
					</div>
				{/each}
			</div>
			{#each markers as marker (marker.id)}
				<div
					class="marker"
					data-testid="progress-marker"
					aria-label={marker.label}
					title={marker.label}
					style="left: {toPct(marker.percent)}%; background: {markerColor(marker.hue)}"
				></div>
			{/each}
		</div>
		<span class="progress-percentage" data-testid="progress-percentage">{bookProgressPct}%</span>
	</div>
{/if}

<style>
	.book-progress-bar {
		display: flex;
		align-items: center;
		gap: 6px;
		width: 100%;
	}

	.track-wrap {
		position: relative;
		flex: 1;
		display: flex;
	}

	/* Sticks out above and below the track so it reads even on a thin bar */
	.marker {
		position: absolute;
		top: -3px;
		bottom: -3px;
		width: 3px;
		border-radius: 1px;
		transform: translateX(-50%);
		pointer-events: none;
	}

	.progress-track {
		display: flex;
		flex: 1;
		height: 4px;
		background: var(--color-progressTrack);
		border-radius: 2px;
		overflow: hidden;
	}

	.progress-segment {
		position: relative;
		height: 100%;
		min-width: 1px;
	}

	.progress-segment + .progress-segment {
		border-left: 1px solid var(--color-background);
	}

	.segment-fill {
		height: 100%;
		background: var(--color-accent);
		border-radius: 2px;
		transition: width 0.15s ease;
	}

	.segment-fill.full {
		width: 100% !important;
		border-radius: 0;
	}

	.progress-percentage {
		font-size: var(--font-size-xs);
		color: var(--color-text-secondary);
		white-space: nowrap;
		min-width: 2.5em;
		text-align: right;
		flex-shrink: 0;
	}
</style>
