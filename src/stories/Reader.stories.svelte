<script module lang="ts">
import { defineMeta } from '@storybook/addon-svelte-csf';
import ReaderPage from '../routes/read/[bookId]/+page.svelte';

	const { Story } = defineMeta({
		title: 'Pages/Reader',
		tags: ['autodocs'],
		parameters: {
			layout: 'fullscreen'
		}
	});
</script>

<script lang="ts">
	import { fade } from 'svelte/transition';
</script>

<Story name="ReadingContent" asChild>
	<div class="reader">
		<div class="reader-container">
			<div class="content">
				<h1>Chapter 1</h1>
				<p>
					It was a bright cold day in April, and the clocks were striking thirteen. Winston Smith,
					his chin nuzzled into his breast in an effort to escape the vile wind, slipped quickly
					through the glass doors of Victory Mansions, though not quickly enough to prevent a swirl
					of gritty dust from entering along with him.
				</p>
				<p>
					The hallway smelt of boiled cabbage and old rag mats. At one end of it a coloured poster,
					too large for indoor display, had been tacked to the wall. It depicted simply an enormous
					face, more than a metre wide: the face of a man of about forty-five, with a heavy black
					moustache and ruggedly handsome features.
				</p>
				<p>
					Winston made for the stairs. It was no use trying the lift. Even at the best of times it
					was seldom working, and at present the electric current was cut off during daylight hours.
      </p>
    </div>
  </div>
</div>
</Story>

<Story name="WithMenuOverlay" asChild>
	<div class="reader">
		<div class="reader-container">
			<div class="content">
				<h1>Chapter 1</h1>
				<p>Sample reading content...</p>
			</div>
			<div class="overlay" transition:fade={{ duration: 200 }}>
				<button class="back-button" aria-label="Go back">
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
      </div>
    </div>
  </div>
</Story>

<Story name="LoadingState" asChild>
	<div class="reader">
		<div class="loading">Loading...</div>
	</div>
</Story>

<style>
	.reader {
		position: fixed;
		inset: 0;
		background: #fff;
	}

	.reader-container {
		position: relative;
		width: 100%;
		height: 100%;
	}

	.content {
		height: 100vh;
		column-width: calc(100vw - 2rem);
		column-gap: 0;
		overflow-x: scroll;
		overflow-y: hidden;
		scroll-snap-type: x mandatory;
		scroll-snap-stop: always;
		padding: 1rem;
		box-sizing: border-box;
		line-height: 1.6;
		color: #333;
	}

	.loading {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		font-size: 1.5rem;
		color: #333;
	}

	.overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		padding: 1rem;
		display: flex;
		align-items: center;
		background: linear-gradient(to bottom, rgba(0, 0, 0, 0.5), transparent);
		z-index: 20;
	}

	.back-button {
		background: white;
		border: none;
		border-radius: 50%;
		width: 44px;
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
	}

	.back-button:hover {
		background: #f5f5f5;
	}
</style>
