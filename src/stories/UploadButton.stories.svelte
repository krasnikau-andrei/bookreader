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
	<div class="library-header">
		<h1>My Library</h1>
		<UploadButton onClick={fn()} />
	</div>
</Story>

<style>
	.library-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		background: var(--color-background, #1a1a2e);
	}

	h1 {
		color: var(--color-text-primary, #ffffff);
		margin: 0;
	}
</style>
