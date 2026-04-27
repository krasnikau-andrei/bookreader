import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import ReaderOverlay from './ReaderOverlay.svelte';

describe('ReaderOverlay', () => {
	it('renders back button and TOC button when show is true', () => {
		render(ReaderOverlay, {
			props: { show: true, onBack: vi.fn(), onShowToc: vi.fn() }
		});

		expect(screen.getByLabelText('Go back')).toBeInTheDocument();
		expect(screen.getByLabelText('Show table of contents')).toBeInTheDocument();
	});

	it('does not render when show is false', () => {
		render(ReaderOverlay, {
			props: { show: false, onBack: vi.fn(), onShowToc: vi.fn() }
		});

		expect(screen.queryByLabelText('Go back')).not.toBeInTheDocument();
		expect(screen.queryByLabelText('Show table of contents')).not.toBeInTheDocument();
	});

	it('calls onBack when back button is clicked', async () => {
		const onBack = vi.fn();
		render(ReaderOverlay, {
			props: { show: true, onBack, onShowToc: vi.fn() }
		});

		await fireEvent.click(screen.getByLabelText('Go back'));
		expect(onBack).toHaveBeenCalled();
	});

	it('calls onShowToc when TOC button is clicked', async () => {
		const onShowToc = vi.fn();
		render(ReaderOverlay, {
			props: { show: true, onBack: vi.fn(), onShowToc }
		});

		await fireEvent.click(screen.getByLabelText('Show table of contents'));
		expect(onShowToc).toHaveBeenCalled();
	});
});
