<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from '@storybook/test';
	import ContextMenu from '$lib/components/ContextMenu.svelte';

	const { Story } = defineMeta({
		title: 'Library/ContextMenu',
		component: ContextMenu,
		tags: ['autodocs'],
		argTypes: {
			x: { control: 'number' },
			y: { control: 'number' },
			onDelete: { action: 'deleted' }
		}
	});
</script>

<Story
	name="Default"
	args={{
		x: 0,
		y: 0,
		onDelete: fn()
	}}
/>

<Story name="AtPosition" asChild>
	<ContextMenu x={100} y={50} onDelete={fn()} />
</Story>
