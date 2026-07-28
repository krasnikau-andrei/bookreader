<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from '@storybook/test';
	import ReaderOverlay from '$lib/components/ReaderOverlay.svelte';

	const { Story } = defineMeta({
		title: 'Components/ReaderOverlay',
		component: ReaderOverlay,
		tags: ['autodocs'],
		argTypes: {
			onBack: { action: 'back' },
			onShowToc: { action: 'showToc' },
			onUploadBook: { action: 'uploadBook' }
		},
		args: {
			onBack: fn(),
			onShowToc: fn(),
			onUploadBook: fn(async () => {})
		}
	});
</script>

<Story
	name="Shown"
	args={{
		show: true
	}}
/>
