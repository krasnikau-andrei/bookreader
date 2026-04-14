<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { theme } from '$lib/theme';
	import { onMount } from 'svelte';

	let { children } = $props();

	onMount(() => {
		const body = document.body;
		Object.entries(theme.colors).forEach(([key, value]) => {
			body.style.setProperty(`--color-${key}`, value);
		});
		body.style.backgroundColor = theme.colors.background;
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="manifest" href="/manifest.json" />
	<meta name="theme-color" content="#ff3e00" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
	<meta name="apple-mobile-web-app-title" content="BookReader" />
</svelte:head>

{@render children()}
