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
	<div class="demo-container">
		<p>Context menu at position (100, 50)</p>
		<ContextMenu x={100} y={50} onDelete={fn()} />
	</div>
</Story>

<style>
	.demo-container {
		position: relative;
		padding: 2rem;
		background: var(--color-background, #1a1a2e);
		min-height: 200px;
		color: var(--color-text-primary, #ffffff);
	}
</style>
