<script lang="ts">
	import type { Widget } from '$lib/plugins/types';

	interface Props {
		widgets: Widget[];
		/** A field lost focus with a new value */
		onField: (id: string, value: string) => void;
		onButton: (id: string) => void;
	}

	let { widgets, onField, onButton }: Props = $props();

	let copied = $state<string | null>(null);

	async function copy(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			copied = text;
			setTimeout(() => (copied = null), 1500);
		} catch {
			// Clipboard can be blocked; the text is selectable, so the user can copy by hand
		}
	}

	function onChange(id: string, event: Event) {
		onField(id, (event.currentTarget as HTMLInputElement | HTMLTextAreaElement).value);
	}
</script>

<!-- Plugin UI is data: only these four kinds exist, and every value is shown as plain text -->
<div class="widgets">
	{#each widgets as widget, i (i)}
		{#if widget.type === 'text'}
			<p class="text {widget.tone ?? 'normal'}" data-testid="plugin-text">{widget.text}</p>
		{:else if widget.type === 'field'}
			<label class="field">
				<span class="label">{widget.label}</span>
				{#if widget.multiline}
					<textarea
						rows="3"
						value={widget.value}
						placeholder={widget.placeholder}
						data-testid="plugin-field-{widget.id}"
						onchange={(e) => onChange(widget.id, e)}
					></textarea>
				{:else}
					<input
						type="text"
						autocapitalize="off"
						autocomplete="off"
						spellcheck="false"
						value={widget.value}
						placeholder={widget.placeholder}
						data-testid="plugin-field-{widget.id}"
						onchange={(e) => onChange(widget.id, e)}
					/>
				{/if}
			</label>
		{:else if widget.type === 'code'}
			<div class="field">
				<span class="label">{widget.label}</span>
				<div class="code-row">
					<code data-testid="plugin-code">{widget.text}</code>
					<button class="small" onclick={() => copy(widget.text)}>
						{copied === widget.text ? 'Скопировано' : 'Копировать'}
					</button>
				</div>
			</div>
		{:else if widget.type === 'button'}
			<button
				class="action"
				data-testid="plugin-button-{widget.id}"
				onclick={() => onButton(widget.id)}
			>
				{widget.label}
			</button>
		{/if}
	{/each}
</div>

<style>
	.widgets {
		display: flex;
		flex-direction: column;
		gap: var(--padding-sm);
	}

	.text {
		margin: 0;
		font-size: var(--font-size-sm);
		color: var(--color-text-primary);
		overflow-wrap: anywhere;
	}

	.text.muted {
		color: var(--color-text-secondary);
	}

	.text.error {
		color: var(--color-error);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--padding-xs);
	}

	.label {
		font-size: var(--font-size-xs);
		color: var(--color-text-secondary);
	}

	input,
	textarea {
		width: 100%;
		box-sizing: border-box;
		padding: var(--padding-sm);
		border: 1px solid var(--color-cardBorder);
		border-radius: var(--radius-sm);
		background: var(--color-backgroundSecondary);
		color: var(--color-text-primary);
		/* 16px stops iOS from zooming the page when the field gets focus */
		font-size: 16px;
		font-family: inherit;
	}

	textarea {
		resize: vertical;
		font-family: ui-monospace, monospace;
	}

	.code-row {
		display: flex;
		align-items: center;
		gap: var(--padding-sm);
	}

	code {
		flex: 1;
		min-width: 0;
		padding: var(--padding-sm);
		border-radius: var(--radius-sm);
		background: var(--color-backgroundTertiary);
		color: var(--color-text-primary);
		font-size: var(--font-size-xs);
		overflow-wrap: anywhere;
		user-select: all;
		-webkit-user-select: all;
	}

	button {
		border: 1px solid var(--color-cardBorder);
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--color-accent);
		font-family: inherit;
		cursor: pointer;
	}

	.small {
		padding: var(--padding-xs) var(--padding-sm);
		font-size: var(--font-size-xs);
		white-space: nowrap;
	}

	.action {
		padding: var(--padding-sm);
		font-size: var(--font-size-sm);
	}
</style>
