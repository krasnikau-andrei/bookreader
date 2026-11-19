<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from '@storybook/test';
	import PluginInstallConfirm from '$lib/components/PluginInstallConfirm.svelte';
	import { togetherRecord } from './plugin-samples';

	const { Story } = defineMeta({
		title: 'Plugins/PluginInstallConfirm',
		component: PluginInstallConfirm,
		tags: ['autodocs'],
		args: { onInstall: fn(), onCancel: fn() }
	});
</script>

<Story name="NewPlugin" args={{ manifest: togetherRecord.manifest }} />

<Story
	name="Update"
	args={{ manifest: { ...togetherRecord.manifest, version: '1.1.0' }, replacesVersion: '1.0.0' }}
/>

<Story
	name="AsksForNothing"
	args={{
		manifest: {
			id: 'quiet',
			name: 'Тихий плагин',
			version: '0.1.0',
			description: 'Ничего не видит и никуда не ходит.',
			permissions: []
		}
	}}
/>
