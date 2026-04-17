<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from '@storybook/test';
	import ErrorBanner from '$lib/components/ErrorBanner.svelte';

	const { Story } = defineMeta({
		title: 'Library/ErrorBanner',
		component: ErrorBanner,
		tags: ['autodocs'],
		argTypes: {
			message: { control: 'text' },
			onDismiss: { action: 'dismissed' }
		}
	});
</script>

<Story
	name="Default"
	args={{
		message: 'Failed to upload book. Please try again.',
		onDismiss: fn()
	}}
/>

<Story
	name="LongMessage"
	args={{
		message:
			'An unexpected error occurred while processing your EPUB file. Please check the file format and try again.',
		onDismiss: fn()
	}}
/>
