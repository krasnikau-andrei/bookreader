<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import PluginPermissions from '$lib/components/PluginPermissions.svelte';

	const { Story } = defineMeta({
		title: 'Plugins/PluginPermissions',
		component: PluginPermissions,
		tags: ['autodocs']
	});
</script>

<Story name="All" args={{ permissions: ['position', 'markers', 'network'] }} />

<Story name="Nothing" args={{ permissions: [] }} />
