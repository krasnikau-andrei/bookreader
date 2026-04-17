<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import LibraryPage from '../routes/+page.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';

	const { Story } = defineMeta({
		title: 'Pages/Library',
		component: LibraryPage,
		tags: ['autodocs'],
		parameters: {
			layout: 'fullscreen'
		}
	});
</script>

<Story name="Default" />

<Story name="EmptyState">
	<EmptyState />
</Story>
