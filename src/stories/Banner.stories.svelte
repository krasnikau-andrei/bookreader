<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from '@storybook/test';
	import Banner from '$lib/components/Banner.svelte';

	const { Story } = defineMeta({
		title: 'Library/Banner',
		component: Banner,
		tags: ['autodocs'],
		argTypes: {
			message: { control: 'text' },
			variant: { control: 'select', options: ['error', 'info'] },
			onDismiss: { action: 'dismissed' }
		}
	});
</script>

<Story
	name="Error"
	args={{
		message: 'Failed to upload book. Please try again.',
		variant: 'error',
		onDismiss: fn()
	}}
/>

<Story
	name="Info"
	args={{
		message: '"book.epub" is already in your library.',
		variant: 'info',
		onDismiss: fn()
	}}
/>

<Story
	name="LongMessage"
	args={{
		message:
			'An unexpected error occurred while processing your EPUB file. Please check the file format and try again.',
		variant: 'error',
		onDismiss: fn()
	}}
/>
