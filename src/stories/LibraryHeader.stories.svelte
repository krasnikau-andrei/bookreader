<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from '@storybook/test';
	import LibraryHeader from '$lib/components/LibraryHeader.svelte';

	const { Story } = defineMeta({
		title: 'Library/LibraryHeader',
		component: LibraryHeader,
		tags: ['autodocs'],
		argTypes: {
			onfilechange: { action: 'file selected' }
		}
	});
</script>

<Story
	name="Default"
	args={{
		onfilechange: fn()
	}}
/>
