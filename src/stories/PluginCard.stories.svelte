<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from '@storybook/test';
	import PluginCard from '$lib/components/PluginCard.svelte';
	import { togetherRecord, togetherRuntime } from './plugin-samples';

	const { Story } = defineMeta({
		title: 'Plugins/PluginCard',
		component: PluginCard,
		tags: ['autodocs'],
		args: {
			onToggle: fn(),
			onUninstall: fn(),
			onAllowHost: fn(),
			onDenyHost: fn(),
			onRevokeHost: fn(),
			onField: fn(),
			onButton: fn()
		}
	});
</script>

<Story name="Running" args={{ plugin: togetherRecord, runtime: togetherRuntime }} />

<Story
	name="WaitingForServerPermission"
	args={{
		plugin: { ...togetherRecord, grantedHosts: [] },
		runtime: { ...togetherRuntime, pendingHosts: ['reading.example.com'] }
	}}
/>

<Story
	name="Crashed"
	args={{
		plugin: togetherRecord,
		runtime: { ...togetherRuntime, widgets: [], error: 'SyntaxError: Unexpected token' }
	}}
/>

<Story
	name="TurnedOff"
	args={{ plugin: { ...togetherRecord, enabled: false }, runtime: undefined }}
/>
