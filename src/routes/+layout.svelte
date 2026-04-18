<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { theme } from '$lib/theme.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="manifest" href="/manifest.json" />
	<meta name="theme-color" content="#ff3e00" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
	<meta name="apple-mobile-web-app-title" content="BookReader" />
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
		--color-error: {theme.colors.error};
		--color-overlay: {theme.colors.overlay};
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
--font-family: {theme.fontFamily}
"
>
	{@render children()}
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
	}

	.theme-root {
		min-height: 100vh;
		background-color: var(--color-background);
		color: var(--color-text-primary);
		font-family: var(--font-family);
	}
</style>
