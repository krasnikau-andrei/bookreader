<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import EmptyState from '$lib/components/EmptyState.svelte';

	const { Story } = defineMeta({
		title: 'Library/EmptyState',
		component: EmptyState,
		tags: ['autodocs'],
		argTypes: {
			title: { control: 'text' },
			subtitle: { control: 'text' }
		}
	});
</script>

<Story
	name="Default"
	args={{
		title: 'Your library is empty',
		subtitle: 'Upload your first book to get started'
	}}
/>

<Story
	name="CustomText"
	args={{
		title: 'No books found',
		subtitle: 'Try searching for something else'
	}}
/>

<Story name="InGrid" asChild>
	<EmptyState />
</Story>
