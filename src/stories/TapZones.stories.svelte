<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from '@storybook/test';
	import TapZones from '$lib/reader/TapZones.svelte';

	const { Story } = defineMeta({
		title: 'Reader/TapZones',
		component: TapZones,
		tags: ['autodocs'],
		argTypes: {
			onLeftTap: { action: 'leftTap' },
			onCenterTap: { action: 'centerTap' },
			onRightTap: { action: 'rightTap' }
		}
	});
</script>

<Story
	name="Default"
	args={{
		onLeftTap: fn(),
		onCenterTap: fn(),
		onRightTap: fn()
	}}
/>

<Story
	name="WithCallbacks"
	args={{
		onLeftTap: () => console.log('Left tapped'),
		onCenterTap: () => console.log('Center tapped'),
		onRightTap: () => console.log('Right tapped')
	}}
/>

<Story name="InContext" asChild>
	<div class="story-container">
		<div class="content-area">
			<p>Click/tap anywhere in this area to trigger zones</p>
		</div>
		<TapZones
			onLeftTap={() => alert('Previous page')}
			onCenterTap={() => alert('Show menu')}
			onRightTap={() => alert('Next page')}
		/>
	</div>
</Story>

<style>
	.story-container {
		position: relative;
		width: 375px;
		height: 667px;
		background: #1a1a2e;
		border-radius: 8px;
		overflow: hidden;
	}

	.content-area {
		padding: 2rem;
		color: white;
		text-align: center;
	}
</style>
