<script lang="ts">
	interface Props {
		onLeftTap?: () => void;
		onCenterTap?: () => void;
		onRightTap?: () => void;
	}

	let { onLeftTap, onCenterTap, onRightTap }: Props = $props();

	function handleTap(event: MouseEvent) {
		const target = event.currentTarget as HTMLElement;
		const rect = target.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const width = rect.width;
		const relativeX = x / width;

		if (relativeX < 0.33) {
			onLeftTap?.();
		} else if (relativeX < 0.67) {
			onCenterTap?.();
		} else {
			onRightTap?.();
		}
	}
</script>

<button type="button" class="tap-zones" onclick={handleTap} aria-label="Reader tap zones">
	<!-- Invisible overlay for tap detection -->
</button>

<style>
	.tap-zones {
		position: absolute;
		inset: 0;
		background: transparent;
		border: none;
		cursor: default;
		z-index: 10;
	}
</style>
