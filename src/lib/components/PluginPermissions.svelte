<script lang="ts">
	import type { Permission } from '$lib/plugins/types';

	interface Props {
		permissions: Permission[];
	}

	let { permissions }: Props = $props();

	const TEXT: Record<Permission, string> = {
		position: 'Знать, какую книгу ты читаешь и где ты в ней',
		markers: 'Показывать отметки на шкале прогресса и в тексте',
		network: 'Связываться с серверами — каждый сервер ты разрешишь отдельно'
	};
</script>

{#if permissions.length === 0}
	<p class="none">Ничего не просит: не видит книгу и не ходит в сеть.</p>
{:else}
	<ul data-testid="plugin-permissions">
		{#each permissions as permission (permission)}
			<li>{TEXT[permission]}</li>
		{/each}
	</ul>
{/if}

<style>
	ul {
		margin: 0;
		padding-left: 1.2em;
		display: flex;
		flex-direction: column;
		gap: var(--padding-xs);
		font-size: var(--font-size-sm);
		color: var(--color-text-primary);
	}

	.none {
		margin: 0;
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}
</style>
