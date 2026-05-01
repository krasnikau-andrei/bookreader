<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from '@storybook/test';
	import ConfirmSheet from '$lib/components/ConfirmSheet.svelte';

	const { Story } = defineMeta({
		title: 'Library/ConfirmSheet',
		component: ConfirmSheet,
		tags: ['autodocs'],
		argTypes: {
			onConfirm: { action: 'confirmed' },
			onCancel: { action: 'cancelled' }
		},
		args: {
			onConfirm: fn(),
			onCancel: fn()
		}
	});
</script>

<Story
	name="DeleteConfirmation"
	args={{
		bookTitle: 'The Great Gatsby'
	}}
/>

<Story
	name="LongTitle"
	args={{
		bookTitle: 'A Very Long Book Title That Might Wrap To Multiple Lines'
	}}
/>
