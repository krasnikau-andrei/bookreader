<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from '@storybook/test';
	import PluginHosts from '$lib/components/PluginHosts.svelte';

	const { Story } = defineMeta({
		title: 'Plugins/PluginHosts',
		component: PluginHosts,
		tags: ['autodocs'],
		args: { onAllow: fn(), onDeny: fn(), onRevoke: fn() }
	});
</script>

<Story name="AskingForAServer" args={{ pending: ['reading.example.com'], granted: [] }} />

<Story name="AlreadyAllowed" args={{ pending: [], granted: ['reading.example.com'] }} />

<Story
	name="LongHostName"
	args={{
		pending: ['a-very-long-subdomain.of-a-reading-server.example.com:8443'],
		granted: ['localhost:8787']
	}}
/>
