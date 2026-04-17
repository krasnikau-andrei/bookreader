<script lang="ts">
	interface Props {
		x: number;
		y: number;
		onDelete?: () => void;
	}

	let { x, y, onDelete }: Props = $props();
</script>

<div class="context-menu" style="left: {x}px; top: {y}px;">
	<button
		class="context-menu-item"
		onclick={onDelete}
		type="button"
		data-testid="delete-book-button"
	>
		Delete
	</button>
</div>

<style>
	.context-menu {
		position: fixed;
		background: var(--color-overlay);
		border-radius: var(--radius-md);
		padding: var(--padding-xs);
		box-shadow: 0 4px 16px var(--color-shadow);
		z-index: 100;
		min-width: 120px;
	}

	.context-menu-item {
		display: block;
		width: 100%;
		padding: var(--padding-sm) var(--padding-md);
		background: transparent;
		border: none;
		color: var(--color-error);
		font-size: var(--font-size-md);
		text-align: left;
		cursor: pointer;
		border-radius: var(--radius-sm);
	}

	.context-menu-item:hover {
		background: rgba(255, 68, 68, 0.1);
	}
</style>
