<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { theme } from '$lib/theme.svelte';
	import { closeDatabase } from '$lib/storage';
	import { onMount } from 'svelte';
	import { asset } from '$app/paths';

	let { children } = $props();

	onMount(() => {
		// Close the IndexedDB connection on pagehide: iOS Safari won't restore a
		// page from bfcache while a connection is open — it reloads it instead,
		// causing the flash on resume. Operations reopen lazily via ensureOpen().
		window.addEventListener('pagehide', () => {
			setTimeout(closeDatabase, 0);
		});
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="manifest" href={asset('/manifest.json')} />
	<meta name="theme-color" content="#000000" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
	<meta name="apple-mobile-web-app-title" content="BookReader" />
	<link
		href="https://fonts.googleapis.com/css2?family=Literata:ital,wght@0,200..900;1,200..900&display=optional"
		rel="stylesheet"
	/>
</svelte:head>

<div
	class="theme-root"
	style="
		--color-background: {theme.colors.background};
		--color-backgroundSecondary: {theme.colors.backgroundSecondary};
		--color-backgroundTertiary: {theme.colors.backgroundTertiary};
		--color-readerBackground: {theme.colors.readerBackground};
		--color-readerText: {theme.colors.readerText};
		--color-text-primary: {theme.colors['text-primary']};
		--color-text-secondary: {theme.colors['text-secondary']};
		--color-accent: {theme.colors.accent};
		--color-shadow: {theme.colors.shadow};
		--color-cardBackground: {theme.colors.cardBackground};
		--color-cardBorder: {theme.colors.cardBorder};
		--color-borderMuted: {theme.colors.borderMuted};
		--color-cardVignette: {theme.colors.cardVignette};
		--color-error: {theme.colors.error};
		--color-overlay: {theme.colors.overlay};
		--color-progressTrack: {theme.colors.progressTrack};
		--color-onImage: {theme.colors.onImage};
		--color-surfaceHover: {theme.colors.surfaceHover};
		--padding-xs: {theme.padding.xs};
		--padding-sm: {theme.padding.sm};
		--padding-md: {theme.padding.md};
		--padding-lg: {theme.padding.lg};
		--padding-xl: {theme.padding.xl};
		--radius-sm: {theme.radius.sm};
		--radius-md: {theme.radius.md};
		--radius-lg: {theme.radius.lg};
		--radius-xl: {theme.radius.xl};
		--font-size-xs: {theme.fontSize.xs};
		--font-size-sm: {theme.fontSize.sm};
		--font-size-md: {theme.fontSize.md};
		--font-size-lg: {theme.fontSize.lg};
--font-size-xl: {theme.fontSize.xl};
    --font-size-reader-text: {theme.fontSize.readerText};
    --reader-gap-top: {theme.reader.gapTop};
    --reader-gap-bottom: {theme.reader.gapBottom};
    --reader-gap-sides: {theme.reader.gapSides};
    --font-family: {theme.fontFamily};
    --image-filter: {theme.imageFilter}
"
>
	{@render children()}
</div>

<style>
	/* DO NOT CHANGE: #000000 keeps the status bar (notch/battery/time) black on mobile */
	:global(html) {
		background-color: #000000;
	}

	:global(body) {
		margin: 0;
		padding: 0;
		background-color: #000000;
	}

	:global(a) {
		color: var(--color-accent);
	}

	.theme-root {
		min-height: 100vh;
		background-color: var(--color-background);
		color: var(--color-text-primary);
		font-family: var(--font-family);
	}
</style>
