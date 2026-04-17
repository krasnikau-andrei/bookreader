<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import LibraryPage from '../routes/+page.svelte';

	const { Story } = defineMeta({
		title: 'Pages/Library',
		component: LibraryPage,
		tags: ['autodocs'],
		parameters: {
			layout: 'fullscreen'
		}
	});
</script>

<Story name="Default" />

<Story name="EmptyState">
	<div class="library-container" data-testid="library-container">
		<div class="library-header">
			<h1>My Library</h1>
			<button class="upload-button">Upload Book</button>
		</div>
		<div class="books-grid">
			<div class="empty-state" data-testid="empty-state">
				<p>Your library is empty</p>
				<p>Upload your first book to get started</p>
			</div>
		</div>
	</div>
</Story>

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

	.books-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: 1rem;
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
