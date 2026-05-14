<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ImageFullscreen from '$lib/components/ImageFullscreen.svelte';

	const { Story } = defineMeta({
		title: 'Components/ImageFullscreen',
		component: ImageFullscreen,
		tags: ['autodocs'],
		argTypes: {
			onClose: { action: 'closed' }
		}
	});
</script>

<Story
	name="Default"
	args={{
		src: 'https://picsum.photos/800/600'
	}}
/>
