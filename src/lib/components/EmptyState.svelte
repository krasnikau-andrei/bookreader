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
		padding: var(--padding-xl);
		color: var(--color-text-secondary);
	}

	.empty-state p {
		margin: var(--padding-sm) 0;
	}
</style>
