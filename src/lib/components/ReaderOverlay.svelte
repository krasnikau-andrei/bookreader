<script lang="ts">
	import { fade } from 'svelte/transition';
	import { theme } from '$lib/theme.svelte';
	import { env } from '$env/dynamic/public';

	interface Props {
		show: boolean;
		onBack: () => void;
		onShowToc: () => void;
		onUploadBook: () => Promise<void>;
	}

	let { show, onBack, onShowToc, onUploadBook }: Props = $props();

	let showMenu = $state(false);
	let uploadStatus: 'idle' | 'uploading' | 'success' | 'error' = $state('idle');

	function closeMenu() {
		showMenu = false;
		uploadStatus = 'idle';
	}

	function toggleMenu(e: MouseEvent) {
		e.stopPropagation();
		showMenu = !showMenu;
		if (showMenu) uploadStatus = 'idle';
	}

	async function handleUpload(e: MouseEvent) {
		e.stopPropagation();
		uploadStatus = 'uploading';
		try {
			await onUploadBook();
			uploadStatus = 'success';
			setTimeout(closeMenu, 1500);
		} catch {
			uploadStatus = 'error';
		}
	}
</script>

{#if show}
	<div
		class="overlay"
		role="presentation"
		transition:fade={{ duration: 200 }}
		style="background: {theme.colors.overlay}"
		onclick={closeMenu}
	>
		<button class="icon-button" onclick={onBack} aria-label="Go back">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M19 12H5M12 19l-7-7 7-7" />
			</svg>
		</button>
		<div class="right-buttons">
			{#if env.PUBLIC_DEBUG_UPLOAD}
				<div class="more-wrapper">
					<button
						class="icon-button"
						onclick={toggleMenu}
						aria-label="More actions"
						aria-expanded={showMenu}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<circle cx="12" cy="5" r="1" />
							<circle cx="12" cy="12" r="1" />
							<circle cx="12" cy="19" r="1" />
						</svg>
					</button>
					{#if showMenu}
						<div class="popover" role="presentation" onclick={(e) => e.stopPropagation()}>
							<button
								class="menu-item"
								onclick={handleUpload}
								disabled={uploadStatus === 'uploading'}
							>
								<span class="menu-icon">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
										<polyline points="17 8 12 3 7 8" />
										<line x1="12" y1="3" x2="12" y2="15" />
									</svg>
								</span>
								{uploadStatus === 'uploading'
									? 'Загрузка...'
									: uploadStatus === 'success'
										? 'Загружено'
										: 'Загрузить на сервер'}
							</button>
						</div>
					{/if}
				</div>
			{/if}
			<button class="icon-button" onclick={onShowToc} aria-label="Show table of contents">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<line x1="4" y1="6" x2="20" y2="6" />
					<line x1="4" y1="12" x2="20" y2="12" />
					<line x1="4" y1="18" x2="20" y2="18" />
				</svg>
			</button>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		padding: 1rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		z-index: 20;
	}

	.right-buttons {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.more-wrapper {
		position: relative;
	}

	.icon-button {
		background: var(--color-onImage);
		border: none;
		border-radius: 50%;
		width: 44px;
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		box-shadow: 0 2px 8px var(--color-shadowSm);
		transition: background-color 0.15s ease;
	}

	.icon-button:hover {
		background: var(--color-surfaceHover);
	}

	.popover {
		position: absolute;
		top: calc(100% + 8px);
		right: 0;
		background: var(--color-cardBackground);
		border: 1px solid var(--color-cardBorder);
		border-radius: 12px;
		box-shadow: 0 8px 24px var(--color-shadowMd);
		min-width: 200px;
		overflow: hidden;
		z-index: 30;
	}

	.menu-item {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		padding: 12px 16px;
		border: none;
		background: transparent;
		color: var(--color-text-primary);
		font-size: 0.875rem;
		font-family: inherit;
		cursor: pointer;
		text-align: left;
		white-space: nowrap;
		transition: background-color 0.15s ease;
	}

	.menu-item:hover:not(:disabled) {
		background: var(--color-backgroundSecondary);
	}

	.menu-item:disabled {
		opacity: 0.6;
		cursor: default;
	}

	.menu-icon {
		display: flex;
		align-items: center;
		opacity: 0.7;
		flex-shrink: 0;
	}
</style>
