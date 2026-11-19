<script lang="ts">
	import { parsePluginSource } from '$lib/plugins/manifest';
	import type { ParsedPlugin, PluginsController } from '$lib/plugins/manager.svelte';
	import PluginCard from './PluginCard.svelte';
	import PluginInstallConfirm from './PluginInstallConfirm.svelte';

	interface Props {
		plugins: PluginsController;
		onClose: () => void;
	}

	let { plugins, onClose }: Props = $props();

	/** A plugin waiting for the user to read its permissions and say yes */
	let pending = $state<ParsedPlugin | null>(null);
	let fileError = $state<string | null>(null);
	let fileInput: HTMLInputElement | null = $state(null);

	let replacesVersion = $derived(
		pending
			? plugins.plugins.find((p) => p.id === pending!.manifest.id)?.manifest.version
			: undefined
	);

	async function onFile(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		fileError = null;
		try {
			pending = parsePluginSource(await file.text());
		} catch (e) {
			fileError = `Не получилось открыть плагин: ${(e as Error).message}`;
		}
	}

	async function confirmInstall() {
		if (!pending) return;
		try {
			await plugins.install(pending);
			pending = null;
		} catch (e) {
			fileError = `Не получилось установить: ${(e as Error).message}`;
		}
	}
</script>

<div class="backdrop" role="presentation" onclick={onClose}></div>

<div class="sheet" role="dialog" aria-label="Плагины" aria-modal="true" data-testid="plugins-sheet">
	<header>
		<h2>Плагины</h2>
		<button class="close" aria-label="Закрыть" onclick={onClose}>✕</button>
	</header>

	{#if pending}
		<PluginInstallConfirm
			manifest={pending.manifest}
			{replacesVersion}
			onInstall={confirmInstall}
			onCancel={() => (pending = null)}
		/>
	{/if}

	{#each plugins.plugins as plugin (plugin.id)}
		<PluginCard
			{plugin}
			runtime={plugins.runtime[plugin.id]}
			onToggle={(enabled) => plugins.setEnabled(plugin.id, enabled)}
			onUninstall={() => plugins.uninstall(plugin.id)}
			onAllowHost={(host) => plugins.allowHost(plugin.id, host)}
			onDenyHost={(host) => plugins.denyHost(plugin.id, host)}
			onRevokeHost={(host) => plugins.revokeHost(plugin.id, host)}
			onField={(id, value) => plugins.uiEvent(plugin.id, id, value)}
			onButton={(id) => plugins.uiEvent(plugin.id, id)}
		/>
	{/each}

	{#if plugins.available.length > 0 && !pending}
		<h4>Можно установить</h4>
		{#each plugins.available as candidate (candidate.manifest.id)}
			<button
				class="available"
				data-testid="plugin-available"
				onclick={() => (pending = candidate)}
			>
				<span class="name">{candidate.manifest.name}</span>
				<span class="description">{candidate.manifest.description}</span>
			</button>
		{/each}
	{/if}

	{#if plugins.plugins.length === 0 && plugins.available.length === 0 && !pending}
		<p class="empty">Плагинов пока нет.</p>
	{/if}

	<button class="from-file" onclick={() => fileInput?.click()}>Установить из файла…</button>
	<input
		bind:this={fileInput}
		type="file"
		accept=".js,text/javascript"
		hidden
		data-testid="plugin-file-input"
		onchange={onFile}
	/>
	{#if fileError}
		<p class="error" data-testid="plugin-file-error">{fileError}</p>
	{/if}
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 100;
		background: var(--color-shadow);
	}

	.sheet {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 101;
		max-height: 85dvh;
		overflow-y: auto;
		overscroll-behavior: contain;
		display: flex;
		flex-direction: column;
		gap: var(--padding-md);
		padding: var(--padding-lg) var(--padding-md) max(var(--padding-lg), env(safe-area-inset-bottom));
		box-sizing: border-box;
		background: var(--color-cardBackground);
		border-radius: var(--radius-lg) var(--radius-lg) 0 0;
		font-family: var(--font-family);
		animation: slideUp 0.3s ease-out;
	}

	@keyframes slideUp {
		from {
			transform: translateY(100%);
		}
		to {
			transform: translateY(0);
		}
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	h2 {
		margin: 0;
		font-size: var(--font-size-lg);
		color: var(--color-text-primary);
	}

	h4 {
		margin: 0;
		font-size: var(--font-size-sm);
		font-weight: 500;
		color: var(--color-text-secondary);
	}

	.close {
		width: 44px;
		height: 44px;
		border: none;
		background: none;
		color: var(--color-text-secondary);
		font-size: var(--font-size-lg);
		cursor: pointer;
	}

	.available {
		display: flex;
		flex-direction: column;
		gap: var(--padding-xs);
		padding: var(--padding-md);
		border: 1px dashed var(--color-cardBorder);
		border-radius: var(--radius-md);
		background: transparent;
		text-align: left;
		font-family: inherit;
		cursor: pointer;
	}

	.name {
		font-size: var(--font-size-md);
		color: var(--color-text-primary);
	}

	.description,
	.empty {
		margin: 0;
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}

	.from-file {
		padding: var(--padding-sm);
		border: none;
		background: none;
		color: var(--color-accent);
		font-size: var(--font-size-sm);
		font-family: inherit;
		cursor: pointer;
	}

	.error {
		margin: 0;
		font-size: var(--font-size-sm);
		color: var(--color-error);
	}
</style>
