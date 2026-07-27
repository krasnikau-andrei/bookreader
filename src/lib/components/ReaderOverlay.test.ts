import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import ReaderOverlay from './ReaderOverlay.svelte';

// The More-actions menu (debug upload) is gated behind PUBLIC_DEBUG_UPLOAD
vi.mock('$env/dynamic/public', () => ({ env: { PUBLIC_DEBUG_UPLOAD: '1' } }));

describe('ReaderOverlay', () => {
	it('renders back button and TOC button when show is true', () => {
		render(ReaderOverlay, {
			props: { show: true, onBack: vi.fn(), onShowToc: vi.fn(), onUploadBook: vi.fn() }
		});

		expect(screen.getByLabelText('Go back')).toBeInTheDocument();
		expect(screen.getByLabelText('Show table of contents')).toBeInTheDocument();
		expect(screen.getByLabelText('More actions')).toBeInTheDocument();
	});

	it('does not render when show is false', () => {
		render(ReaderOverlay, {
			props: { show: false, onBack: vi.fn(), onShowToc: vi.fn(), onUploadBook: vi.fn() }
		});

		expect(screen.queryByLabelText('Go back')).not.toBeInTheDocument();
		expect(screen.queryByLabelText('Show table of contents')).not.toBeInTheDocument();
		expect(screen.queryByLabelText('More actions')).not.toBeInTheDocument();
	});

	it('calls onBack when back button is clicked', async () => {
		const onBack = vi.fn();
		render(ReaderOverlay, {
			props: { show: true, onBack, onShowToc: vi.fn(), onUploadBook: vi.fn() }
		});

		await fireEvent.click(screen.getByLabelText('Go back'));
		expect(onBack).toHaveBeenCalled();
	});

	it('calls onShowToc when TOC button is clicked', async () => {
		const onShowToc = vi.fn();
		render(ReaderOverlay, {
			props: { show: true, onBack: vi.fn(), onShowToc, onUploadBook: vi.fn() }
		});

		await fireEvent.click(screen.getByLabelText('Show table of contents'));
		expect(onShowToc).toHaveBeenCalled();
	});

	it('opens popover when more button is clicked', async () => {
		render(ReaderOverlay, {
			props: { show: true, onBack: vi.fn(), onShowToc: vi.fn(), onUploadBook: vi.fn() }
		});

		await fireEvent.click(screen.getByLabelText('More actions'));
		expect(screen.getByText('Загрузить на сервер')).toBeInTheDocument();
	});

	it('calls onUploadBook when menu item is clicked', async () => {
		const onUploadBook = vi.fn().mockResolvedValue(undefined);
		render(ReaderOverlay, {
			props: { show: true, onBack: vi.fn(), onShowToc: vi.fn(), onUploadBook }
		});

		await fireEvent.click(screen.getByLabelText('More actions'));
		await fireEvent.click(screen.getByText('Загрузить на сервер'));
		expect(onUploadBook).toHaveBeenCalled();
	});
});
