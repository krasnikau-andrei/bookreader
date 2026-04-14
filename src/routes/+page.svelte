<script>
	import { theme, applyTheme } from '$lib/theme';
	import { onMount } from 'svelte';

	onMount(() => {
		applyTheme(document.body);
	});
</script>

<div class="library-container" data-testid="library-container">
	<div class="library-header">
		<h1>My Library</h1>
		<button class="upload-button" data-testid="upload-button"> Upload Book </button>
	</div>

	<div class="books-grid">
		<!-- Empty state -->
		<div class="empty-state" data-testid="empty-state">
			<p>Your library is empty</p>
			<p>Upload your first book to get started</p>
		</div>
	</div>
</div>

<style>
	.library-container {
		min-height: 100vh;
		padding: 2rem;
		background-color: var(--color-background, #1a1a2e);
	}

	.library-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
	}

	h1 {
		color: var(--color-text-primary, #ffffff);
		margin: 0;
	}

	.upload-button {
		padding: 0.75rem 1.5rem;
		background-color: var(--color-accent, #4a9eff);
		color: var(--color-text-primary, #ffffff);
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		font-size: 1rem;
	}

	.upload-button:hover {
		opacity: 0.9;
	}

	.books-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 1.5rem;
	}

	.empty-state {
		grid-column: 1 / -1;
		text-align: center;
		padding: 4rem;
		color: var(--color-text-secondary, #a0a0a0);
	}

	.empty-state p {
		margin: 0.5rem 0;
	}
</style>
