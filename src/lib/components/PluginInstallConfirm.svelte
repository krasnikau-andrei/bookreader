<script lang="ts">
	import type { PluginManifest } from '$lib/plugins/types';
	import PluginPermissions from './PluginPermissions.svelte';

	interface Props {
		manifest: PluginManifest;
		/** Set when a plugin with this id is already installed */
		replacesVersion?: string;
		onInstall: () => void;
		onCancel: () => void;
	}

	let { manifest, replacesVersion, onInstall, onCancel }: Props = $props();
</script>

<div class="confirm" data-testid="plugin-install-confirm">
	<h3>{manifest.name} <span class="version">{manifest.version}</span></h3>
	{#if replacesVersion}
		<p class="note">Заменит установленную версию {replacesVersion}.</p>
	{/if}
	{#if manifest.description}
		<p class="description">{manifest.description}</p>
	{/if}
	<p class="label">Плагин сможет:</p>
	<PluginPermissions permissions={manifest.permissions} />
	<p class="note">
		Плагин работает в песочнице: он не видит твою библиотеку и другие плагины и не может ничего
		отправить без твоего разрешения.
	</p>
	<div class="actions">
		<button class="install" data-testid="plugin-install" onclick={onInstall}>Установить</button>
		<button class="cancel" onclick={onCancel}>Отмена</button>
	</div>
</div>

<style>
	.confirm {
		display: flex;
		flex-direction: column;
		gap: var(--padding-sm);
		padding: var(--padding-md);
		border: 1px solid var(--color-accent);
		border-radius: var(--radius-md);
	}

	h3 {
		margin: 0;
		font-size: var(--font-size-md);
		color: var(--color-text-primary);
	}

	.version,
	.label,
	.note {
		font-size: var(--font-size-xs);
		color: var(--color-text-secondary);
	}

	p {
		margin: 0;
	}

	.description {
		font-size: var(--font-size-sm);
		color: var(--color-text-primary);
	}

	.actions {
		display: flex;
		gap: var(--padding-sm);
	}

	button {
		flex: 1;
		padding: var(--padding-sm);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-sm);
		font-family: inherit;
		cursor: pointer;
	}

	.install {
		border: none;
		background: var(--color-accent);
		color: var(--color-background);
	}

	.cancel {
		border: 1px solid var(--color-cardBorder);
		background: transparent;
		color: var(--color-text-secondary);
	}
</style>
