<script lang="ts">
	import type { PluginRecord } from '$lib/plugins/types';
	import type { PluginRuntimeState } from '$lib/plugins/manager.svelte';
	import PluginWidgets from './PluginWidgets.svelte';
	import PluginHosts from './PluginHosts.svelte';
	import PluginPermissions from './PluginPermissions.svelte';

	interface Props {
		plugin: PluginRecord;
		runtime: PluginRuntimeState | undefined;
		onToggle: (enabled: boolean) => void;
		onUninstall: () => void;
		onAllowHost: (host: string) => void;
		onDenyHost: (host: string) => void;
		onRevokeHost: (host: string) => void;
		onField: (id: string, value: string) => void;
		onButton: (id: string) => void;
	}

	let {
		plugin,
		runtime,
		onToggle,
		onUninstall,
		onAllowHost,
		onDenyHost,
		onRevokeHost,
		onField,
		onButton
	}: Props = $props();

	let showDetails = $state(false);
</script>

<section class="card" data-testid="plugin-card" data-plugin-id={plugin.id}>
	<header>
		<div class="title">
			<h3>{plugin.manifest.name}</h3>
			<span class="version">{plugin.manifest.version}</span>
		</div>
		<button
			class="switch"
			role="switch"
			aria-checked={plugin.enabled}
			aria-label="Включить {plugin.manifest.name}"
			data-testid="plugin-toggle"
			onclick={() => onToggle(!plugin.enabled)}
		>
			<span class="knob"></span>
		</button>
	</header>

	{#if plugin.enabled && runtime}
		<PluginHosts
			pending={runtime.pendingHosts}
			granted={plugin.grantedHosts}
			onAllow={onAllowHost}
			onDeny={onDenyHost}
			onRevoke={onRevokeHost}
		/>
		<PluginWidgets widgets={runtime.widgets} {onField} {onButton} />
		{#if runtime.error}
			<p class="error" data-testid="plugin-error">{runtime.error}</p>
		{/if}
	{:else}
		<p class="description">{plugin.manifest.description}</p>
	{/if}

	<button class="link" onclick={() => (showDetails = !showDetails)}>
		{showDetails ? 'Скрыть' : 'Что может плагин'}
	</button>
	{#if showDetails}
		<PluginPermissions permissions={plugin.manifest.permissions} />
		<button class="link danger" data-testid="plugin-uninstall" onclick={onUninstall}>
			Удалить плагин и его данные
		</button>
	{/if}
</section>

<style>
	.card {
		display: flex;
		flex-direction: column;
		gap: var(--padding-sm);
		padding: var(--padding-md);
		border: 1px solid var(--color-cardBorder);
		border-radius: var(--radius-md);
		background: var(--color-backgroundSecondary);
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--padding-sm);
	}

	.title {
		display: flex;
		align-items: baseline;
		gap: var(--padding-sm);
		min-width: 0;
	}

	h3 {
		margin: 0;
		font-size: var(--font-size-md);
		color: var(--color-text-primary);
	}

	.version {
		font-size: var(--font-size-xs);
		color: var(--color-text-secondary);
	}

	.description {
		margin: 0;
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}

	.error {
		margin: 0;
		font-size: var(--font-size-xs);
		color: var(--color-error);
		overflow-wrap: anywhere;
	}

	.switch {
		position: relative;
		flex-shrink: 0;
		width: 44px;
		height: 26px;
		padding: 0;
		border: none;
		border-radius: 13px;
		background: var(--color-progressTrack);
		cursor: pointer;
		transition: background-color 0.15s ease;
	}

	.switch[aria-checked='true'] {
		background: var(--color-accent);
	}

	.knob {
		position: absolute;
		top: 3px;
		left: 3px;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: var(--color-text-primary);
		transition: transform 0.15s ease;
	}

	.switch[aria-checked='true'] .knob {
		transform: translateX(18px);
	}

	.link {
		align-self: flex-start;
		padding: 0;
		border: none;
		background: none;
		color: var(--color-accent);
		font-size: var(--font-size-xs);
		font-family: inherit;
		cursor: pointer;
	}

	.link.danger {
		color: var(--color-error);
	}
</style>
