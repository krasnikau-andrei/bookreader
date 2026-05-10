import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import BookProgressBar from './BookProgressBar.svelte';

describe('BookProgressBar', () => {
	test('renders nothing when no chapterSizes', () => {
		const { container } = render(BookProgressBar, {
			props: {
				chapterSizes: undefined as unknown as number[],
				currentChapter: 0,
				scrollPercent: 0
			}
		});
		const bar = container.querySelector('[data-testid="progress-bar"]');
		expect(bar).toBeNull();
	});

	test('renders segments for each chapter', () => {
		const { container } = render(BookProgressBar, {
			props: {
				chapterSizes: [100, 200, 300],
				currentChapter: 1,
				scrollPercent: 0.5
			}
		});
		const segments = container.querySelectorAll('[data-testid="progress-segment"]');
		expect(segments.length).toBe(3);
	});

	test('shows percentage text', () => {
		const { container } = render(BookProgressBar, {
			props: {
				chapterSizes: [100, 200, 300],
				currentChapter: 1,
				scrollPercent: 0.5
			}
		});
		const pct = container.querySelector('[data-testid="progress-percentage"]');
		expect(pct).toBeTruthy();
		expect(pct?.textContent).toContain('33');
	});

	test('first chapter at 0% shows 0%', () => {
		const { container } = render(BookProgressBar, {
			props: {
				chapterSizes: [100, 200],
				currentChapter: 0,
				scrollPercent: 0
			}
		});
		const pct = container.querySelector('[data-testid="progress-percentage"]');
		expect(pct?.textContent).toBe('0%');
	});

	test('last chapter at 100% shows 100%', () => {
		const { container } = render(BookProgressBar, {
			props: {
				chapterSizes: [100, 200],
				currentChapter: 1,
				scrollPercent: 1
			}
		});
		const pct = container.querySelector('[data-testid="progress-percentage"]');
		expect(pct?.textContent).toBe('100%');
	});
});
