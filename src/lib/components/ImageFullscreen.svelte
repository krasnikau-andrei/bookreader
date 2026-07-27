<script lang="ts">
	import { fade } from 'svelte/transition';

	interface Props {
		src: string;
		onClose: () => void;
	}

	let { src, onClose }: Props = $props();

	let scale = $state(1);
	let translateX = $state(0);
	let translateY = $state(0);

	let initialPinchDist = 0;
	let initialScale = 1;
	let lastTouchX = 0;
	let lastTouchY = 0;
	let touchStartTime = 0;
	let touchStartX = 0;
	let touchStartY = 0;
	let gestureType: 'none' | 'tap' | 'pan' | 'pinch' = 'none';

	function distance(t1: Touch, t2: Touch): number {
		const dx = t1.clientX - t2.clientX;
		const dy = t1.clientY - t2.clientY;
		return Math.hypot(dx, dy);
	}

	function handleTouchStart(e: TouchEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (e.touches.length === 1) {
			const t = e.touches[0];
			touchStartX = t.clientX;
			touchStartY = t.clientY;
			lastTouchX = t.clientX;
			lastTouchY = t.clientY;
			touchStartTime = Date.now();
			gestureType = scale > 1 ? 'pan' : 'tap';
		} else if (e.touches.length === 2) {
			gestureType = 'pinch';
			initialPinchDist = distance(e.touches[0], e.touches[1]);
			initialScale = scale;
		}
	}

	function handleTouchMove(e: TouchEvent) {
		if (gestureType === 'none') return;
		e.preventDefault();
		e.stopPropagation();

		if (gestureType === 'pinch' && e.touches.length === 2) {
			const currentDist = distance(e.touches[0], e.touches[1]);
			const newScale = initialScale * (currentDist / initialPinchDist);
			scale = Math.max(1, Math.min(5, newScale));
		} else if (gestureType === 'pan' && e.touches.length === 1) {
			const t = e.touches[0];
			translateX += t.clientX - lastTouchX;
			translateY += t.clientY - lastTouchY;
			lastTouchX = t.clientX;
			lastTouchY = t.clientY;
		} else if (gestureType === 'tap' && e.touches.length === 1) {
			const t = e.touches[0];
			const dx = t.clientX - touchStartX;
			const dy = t.clientY - touchStartY;
			if (Math.hypot(dx, dy) > 10) {
				gestureType = scale > 1 ? 'pan' : 'none';
			}
		}
	}

	function handleTouchEnd(e: TouchEvent) {
		if (gestureType === 'tap') {
			const elapsed = Date.now() - touchStartTime;
			if (elapsed < 300) {
				onClose();
				return;
			}
		}
		if (e.touches.length === 0) {
			gestureType = 'none';
		}
	}
</script>

<div
	class="fullscreen"
	role="dialog"
	aria-label="Fullscreen image"
	data-testid="image-fullscreen"
	ontouchstart={handleTouchStart}
	ontouchmove={handleTouchMove}
	ontouchend={handleTouchEnd}
	transition:fade={{ duration: 200 }}
>
	<button
		class="close-btn"
		onclick={(e) => {
			e.stopPropagation();
			onClose();
		}}
		aria-label="Close fullscreen image"
	>
		&times;
	</button>
	<img
		{src}
		alt=""
		style="transform: scale({scale}) translate({translateX}px, {translateY}px)"
		draggable={false}
	/>
</div>

<style>
	.fullscreen {
		position: fixed;
		inset: 0;
		z-index: 200;
		background: rgba(0, 0, 0, 0.95);
		display: flex;
		align-items: center;
		justify-content: center;
		touch-action: none;
	}

	.fullscreen img {
		max-width: 100vw;
		max-height: 100vh;
		object-fit: contain;
		-webkit-user-drag: none;
		user-select: none;
		will-change: transform;
	}

	.close-btn {
		position: fixed;
		top: 12px;
		right: 16px;
		z-index: 201;
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.7);
		font-size: 32px;
		line-height: 1;
		cursor: pointer;
		padding: 8px;
		-webkit-tap-highlight-color: transparent;
	}

	.close-btn:hover {
		color: var(--color-onImage);
	}
</style>
