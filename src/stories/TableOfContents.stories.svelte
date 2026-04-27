<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import TableOfContents from '$lib/components/TableOfContents.svelte';

	const { Story } = defineMeta({
		title: 'Components/TableOfContents',
		component: TableOfContents,
		tags: ['autodocs']
	});
</script>

<script lang="ts">
	const sampleChapters = [
		{ id: 'c1', title: 'Chapter 1: The Beginning', content: '', filePath: 'ch1.html' },
		{ id: 'c2', title: 'Chapter 2: The Journey', content: '', filePath: 'ch2.html' },
		{ id: 'c3', title: 'Chapter 3: The Conclusion', content: '', filePath: 'ch3.html' }
	];

	let showToc = $state(true);
	let currentChapter = $state(0);
</script>

<Story name="Visible">
	{#if showToc}
		<TableOfContents
			show={true}
			chapters={sampleChapters}
			{currentChapter}
			onChapterSelect={(idx) => {
				currentChapter = idx;
				console.log('Navigated to chapter', idx);
			}}
			onClose={() => {
				showToc = false;
				console.log('Closed');
			}}
		/>
	{/if}
	<button onclick={() => (showToc = true)}>Show TOC</button>
</Story>

<Story name="Hidden">
	<TableOfContents
		show={false}
		chapters={sampleChapters}
		currentChapter={0}
		onChapterSelect={(idx) => console.log('Selected:', idx)}
		onClose={() => console.log('Closed')}
	/>
</Story>
