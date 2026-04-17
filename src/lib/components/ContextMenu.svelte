<script lang="ts">
	interface Props {
		x: number;
		y: number;
		onDelete?: () => void;
	}

	let { x, y, onDelete }: Props = $props();
</script>

<div class="context-menu" style="left: {x}px; top: {y}px;">
	<button class="context-menu-item" onclick={onDelete} type="button"> Delete </button>
</div>

<style>
	.context-menu {
		position: fixed;
		background: rgba(40, 40, 60, 0.95);
		border-radius: 0.5rem;
		padding: 0.25rem;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
		z-index: 100;
		min-width: 120px;
	}

	.context-menu-item {
		display: block;
		width: 100%;
		padding: 0.75rem 1rem;
		background: transparent;
		border: none;
		color: #ff4444;
		font-size: 0.875rem;
		text-align: left;
		cursor: pointer;
		border-radius: 0.25rem;
	}

	.context-menu-item:hover {
		background: rgba(255, 68, 68, 0.1);
	}
</style>
