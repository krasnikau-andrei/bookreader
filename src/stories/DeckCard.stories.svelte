<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from '@storybook/test';
	import DeckCard from '$lib/components/DeckCard.svelte';
	import { sampleBooks, sampleLastRead } from './deck-samples';

	const [warhammer, lighthouse, wide, pixel, epub3] = sampleBooks;

	const { Story } = defineMeta({
		title: 'Library/DeckCard',
		component: DeckCard,
		tags: ['autodocs'],
		parameters: { layout: 'fullscreen' },
		args: { onClick: fn(), onTouchStart: fn(), onTouchEnd: fn(), onContextMenu: fn() }
	});
</script>

<Story
	name="CurrentWithGenre"
	args={{
		book: warhammer,
		progressPercent: 37,
		lastReadAt: sampleLastRead.warhammer,
		isCurrent: true
	}}
/>

<Story
	name="TenWordTitleNoCover"
	args={{ book: lighthouse, progressPercent: 55, lastReadAt: sampleLastRead.lighthouse }}
/>

<Story name="WideCover" args={{ book: wide, lastReadAt: sampleLastRead.wide }} />

<Story name="OnePixelCover" args={{ book: pixel }} />

<Story name="DigitInTitle" args={{ book: epub3 }} />
