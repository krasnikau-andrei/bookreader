<script lang="ts">
	interface Props {
		/** Название главы, к которой возвращаемся. Обрезается многоточием. */
		chapterTitle: string;
		/**
		 * Which way the target lies relative to the current position. A jump
		 * from the notes chapter back into the text leaves a target *ahead*,
		 * so the arrow and the anchoring side follow it.
		 */
		direction?: 'back' | 'forward';
		onBack: () => void;
	}

	let { chapterTitle, direction = 'back', onBack }: Props = $props();

	let label = $derived(
		direction === 'forward' ? `Вперёд: ${chapterTitle}` : `Назад: ${chapterTitle}`
	);
</script>

<button
	type="button"
	class="back-button"
	class:forward={direction === 'forward'}
	data-testid="reader-back-button"
	onclick={onBack}
	title={chapterTitle}
	aria-label={label}
>
	<svg
		class="arrow"
		xmlns="http://www.w3.org/2000/svg"
		width="18"
		height="18"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<path d="M19 12H5M12 19l-7-7 7-7" />
	</svg>
	<span class="title">{chapterTitle}</span>
</button>

<style>
	.back-button {
		position: fixed;
		left: 14px;
		/* Clears the fixed progress bar, which pads itself with the safe-area inset */
		bottom: calc(max(8px, env(safe-area-inset-bottom)) + 28px);
		z-index: 12;
		display: flex;
		align-items: center;
		gap: var(--padding-sm);
		max-width: 62%;
		padding: 10px 16px;
		background: var(--color-cardBackground);
		/* Accent outline: cardBorder is nearly invisible on the black reader
	   background, so the button blended into the page. Ties in with the arrow. */
		border: 1px solid var(--color-accent);
		border-radius: 999px;
		box-shadow: 0 6px 20px var(--color-shadow);
		color: var(--color-text-primary);
		font-family: inherit;
		font-size: var(--font-size-sm);
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		transition: background-color 0.15s ease;
	}

	.back-button:hover {
		background: var(--color-backgroundSecondary);
	}

	.back-button:active {
		background: var(--color-backgroundTertiary);
	}

	/* Target lies ahead in the book: arrow points right, button hugs the right edge */
	.back-button.forward {
		left: auto;
		right: 14px;
		flex-direction: row-reverse;
	}

	.arrow {
		color: var(--color-accent);
		flex-shrink: 0;
	}

	.back-button.forward .arrow {
		transform: rotate(180deg);
	}

	.title {
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
