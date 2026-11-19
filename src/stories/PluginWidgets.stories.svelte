<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from '@storybook/test';
	import PluginWidgets from '$lib/components/PluginWidgets.svelte';
	import { togetherWidgets } from './plugin-samples';

	const { Story } = defineMeta({
		title: 'Plugins/PluginWidgets',
		component: PluginWidgets,
		tags: ['autodocs'],
		args: { onField: fn(), onButton: fn() }
	});
</script>

<Story name="ReadingTogether" args={{ widgets: togetherWidgets }} />

<Story
	name="EveryKind"
	args={{
		widgets: [
			{ type: 'text', text: 'Normal text' },
			{ type: 'text', tone: 'muted', text: 'Muted hint' },
			{ type: 'text', tone: 'error', text: 'Something went wrong' },
			{ type: 'field', id: 'one', label: 'One line', value: '', placeholder: 'Type here' },
			{ type: 'field', id: 'many', label: 'Many lines', value: 'a\nb', multiline: true },
			{ type: 'code', label: 'Copy me', text: '0123456789abcdef0123456789abcdef' },
			{ type: 'button', id: 'go', label: 'Do it' }
		]
	}}
/>
