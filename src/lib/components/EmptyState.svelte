<script lang="ts">
	interface Props {
		title?: string;
		subtitle?: string;
	}

	let {
		title = 'Your library is empty',
		subtitle = 'Upload your first book to get started'
	}: Props = $props();
</script>

<div class="empty-state" data-testid="empty-state">
	<p>{title}</p>
	<p>{subtitle}</p>
</div>

<style>
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
