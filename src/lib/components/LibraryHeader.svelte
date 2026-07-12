<script lang="ts">
	interface Props {
		onfilechange?: (file: File) => void;
	}

	let { onfilechange }: Props = $props();

	let fileInput: HTMLInputElement | undefined = $state();

	function handleClick() {
		fileInput?.click();
	}

	function handleChange(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		onfilechange?.(file);
		input.value = '';
	}
</script>

<div class="header">
	<h1 class="title">Bibliotheca</h1>
	<button
		class="header-add"
		onclick={handleClick}
		type="button"
		aria-label="Add book"
		data-testid="upload-button">+</button
	>
	<input
		type="file"
		accept=".epub"
		bind:this={fileInput}
		onchange={handleChange}
		style="display: none;"
	/>
</div>

<style>
	.header {
		position: relative;
		z-index: 1;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 28px 24px 16px;
		border-bottom: 1px solid var(--color-borderMuted);
		margin: 0 24px;
	}
	.title {
		font-family: 'Cormorant Garamond', serif;
		font-size: 24px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 6px;
		color: var(--color-accent);
		margin: 0;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.header-add {
		flex-shrink: 0;
		width: 40px;
		height: 40px;
		border: 1px solid var(--color-cardBorder);
		background: transparent;
		color: var(--color-accent);
		font-size: 22px;
		cursor: pointer;
		font-family: inherit;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-left: 12px;
	}
	.header-add:active {
		background: var(--color-background);
		border-color: var(--color-accent);
	}
</style>
