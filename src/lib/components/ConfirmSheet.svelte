<script lang="ts">
	interface Props {
		bookTitle: string;
		onConfirm: () => void;
		onCancel: () => void;
	}
	let { bookTitle, onConfirm, onCancel }: Props = $props();
</script>

<!-- Backdrop -->
<div class="backdrop" data-testid="confirm-sheet-backdrop" onclick={onCancel}></div>

<!-- Sheet -->
<div
	class="sheet"
	data-testid="confirm-sheet"
	role="dialog"
	aria-label="Delete confirmation"
	aria-modal="true"
>
	<p class="message" data-testid="confirm-sheet-message">
		Delete "{bookTitle}"?
	</p>
	<div class="actions">
		<button class="btn-delete" data-testid="confirm-sheet-delete" onclick={onConfirm}>
			Delete
		</button>
		<button class="btn-cancel" data-testid="confirm-sheet-cancel" onclick={onCancel}>
			Cancel
		</button>
	</div>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		background: var(--color-overlay);
		z-index: 100;
	}

	.sheet {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		background: var(--color-cardBackground);
		border-radius: var(--radius-lg) var(--radius-lg) 0 0;
		padding: var(--padding-lg);
		z-index: 101;
		transform: translateY(0);
	}

	.message {
		color: var(--color-text-primary);
		font-size: var(--font-size-md);
		text-align: center;
		margin: 0 0 var(--padding-md) 0;
	}

	.actions {
		display: flex;
		flex-direction: column;
		gap: var(--padding-sm);
	}

	.btn-delete {
		background: transparent;
		border: none;
		color: var(--color-error);
		font-size: var(--font-size-lg);
		padding: var(--padding-md);
		cursor: pointer;
		border-radius: var(--radius-sm);
	}

	.btn-cancel {
		background: transparent;
		border: none;
		color: var(--color-accent);
		font-size: var(--font-size-md);
		padding: var(--padding-md);
		cursor: pointer;
		border-radius: var(--radius-sm);
	}
</style>
