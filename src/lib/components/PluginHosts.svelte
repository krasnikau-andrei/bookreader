<script lang="ts">
	interface Props {
		/** Servers the plugin tried to reach that the user hasn't answered yet */
		pending: string[];
		/** Servers the user already allowed */
		granted: string[];
		onAllow: (host: string) => void;
		onDeny: (host: string) => void;
		onRevoke: (host: string) => void;
	}

	let { pending, granted, onAllow, onDeny, onRevoke }: Props = $props();
</script>

{#each pending as host (host)}
	<div class="request" data-testid="plugin-host-request">
		<p>Плагин хочет связаться с <strong>{host}</strong></p>
		<div class="buttons">
			<button class="allow" data-testid="plugin-host-allow" onclick={() => onAllow(host)}>
				Разрешить
			</button>
			<button class="deny" onclick={() => onDeny(host)}>Нет</button>
		</div>
	</div>
{/each}

{#if granted.length > 0}
	<div class="granted">
		<span class="label">Разрешённые серверы</span>
		{#each granted as host (host)}
			<div class="host">
				<span>{host}</span>
				<button class="deny" onclick={() => onRevoke(host)}>Убрать</button>
			</div>
		{/each}
	</div>
{/if}

<style>
	.request {
		padding: var(--padding-sm);
		border: 1px solid var(--color-accent);
		border-radius: var(--radius-sm);
	}

	.request p {
		margin: 0 0 var(--padding-sm);
		font-size: var(--font-size-sm);
		color: var(--color-text-primary);
		overflow-wrap: anywhere;
	}

	.buttons {
		display: flex;
		gap: var(--padding-sm);
	}

	.granted {
		display: flex;
		flex-direction: column;
		gap: var(--padding-xs);
	}

	.label {
		font-size: var(--font-size-xs);
		color: var(--color-text-secondary);
	}

	.host {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: var(--font-size-sm);
		color: var(--color-text-primary);
		overflow-wrap: anywhere;
	}

	button {
		padding: var(--padding-xs) var(--padding-md);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-sm);
		font-family: inherit;
		cursor: pointer;
	}

	.allow {
		border: none;
		background: var(--color-accent);
		color: var(--color-background);
	}

	.deny {
		border: 1px solid var(--color-cardBorder);
		background: transparent;
		color: var(--color-text-secondary);
	}
</style>
