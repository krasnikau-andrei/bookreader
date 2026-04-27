<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ChapterTree from '$lib/components/ChapterTree.svelte';

	const { Story } = defineMeta({
		title: 'Components/ChapterTree',
		component: ChapterTree,
		tags: ['autodocs']
	});
</script>

<script lang="ts">
	const sampleChapters = [
		{ id: 'c1', title: 'Chapter 1: The Beginning', content: '', filePath: 'ch1.html' },
		{ id: 'c2', title: 'Chapter 2: The Journey', content: '', filePath: 'ch2.html' },
		{ id: 'c3', title: 'Chapter 3: The Conclusion', content: '', filePath: 'ch3.html' }
	];

	let selectedChapter = $state(0);
</script>

<Story name="Default">
	<ChapterTree
		chapters={sampleChapters}
		currentChapter={selectedChapter}
		onChapterSelect={(idx) => (selectedChapter = idx)}
	/>
</Story>

<Story name="SecondChapterSelected">
	<ChapterTree
		chapters={sampleChapters}
		currentChapter={1}
		onChapterSelect={(idx) => console.log('Selected:', idx)}
	/>
</Story>

<Story name="ManyChapters">
	<ChapterTree
		chapters={Array.from({ length: 20 }, (_, i) => ({
			id: `c${i}`,
			title: `Chapter ${i + 1}: ${['The Beginning', 'The Journey', 'The Discovery', 'The Conflict', 'The Resolution'][i % 5]}`,
			content: '',
			filePath: `ch${i}.html`
		}))}
		currentChapter={5}
		onChapterSelect={(idx) => console.log('Selected:', idx)}
	/>
</Story>
