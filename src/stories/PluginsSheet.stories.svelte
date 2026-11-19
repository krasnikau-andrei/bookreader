<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from '@storybook/test';
	import PluginsSheet from '$lib/components/PluginsSheet.svelte';
	import { fakeController, togetherRecord, togetherRuntime } from './plugin-samples';

	const { Story } = defineMeta({
		title: 'Plugins/PluginsSheet',
		component: PluginsSheet,
		tags: ['autodocs'],
		parameters: { layout: 'fullscreen' },
		args: { onClose: fn() }
	});
</script>

<Story
	name="Installed"
	args={{ plugins: fakeController([togetherRecord], { [togetherRecord.id]: togetherRuntime }) }}
/>

<Story name="NothingInstalled" args={{ plugins: fakeController([], {}) }} />
