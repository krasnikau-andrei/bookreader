<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from '@storybook/test';
	import UploadButton from '$lib/components/UploadButton.svelte';

	const { Story } = defineMeta({
		title: 'Library/UploadButton',
		component: UploadButton,
		tags: ['autodocs'],
		argTypes: {
			onClick: { action: 'clicked' }
		}
	});
</script>

<Story
	name="Default"
	args={{
		onClick: fn()
	}}
/>

<Story name="InHeader" asChild>
	<UploadButton onClick={fn()} />
</Story>
