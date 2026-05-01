import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import ConfirmSheet from './ConfirmSheet.svelte';

describe('ConfirmSheet', () => {
	it('renders with correct book title', () => {
		render(ConfirmSheet, {
			props: { bookTitle: 'Test Book', onConfirm: vi.fn(), onCancel: vi.fn() }
		});
		expect(screen.getByText('Delete "Test Book"?')).toBeInTheDocument();
	});

	it('calls onConfirm when Delete tapped', async () => {
		const onConfirm = vi.fn();
		render(ConfirmSheet, {
			props: { bookTitle: 'Test Book', onConfirm, onCancel: vi.fn() }
		});
		const deleteBtn = screen.getByText('Delete');
		await fireEvent.click(deleteBtn);
		expect(onConfirm).toHaveBeenCalledTimes(1);
	});

	it('calls onCancel when Cancel tapped', async () => {
		const onCancel = vi.fn();
		render(ConfirmSheet, {
			props: { bookTitle: 'Test Book', onConfirm: vi.fn(), onCancel }
		});
		const cancelBtn = screen.getByText('Cancel');
		await fireEvent.click(cancelBtn);
		expect(onCancel).toHaveBeenCalledTimes(1);
	});

	it('renders with slide-up animation class', () => {
		render(ConfirmSheet, {
			props: { bookTitle: 'Test Book', onConfirm: vi.fn(), onCancel: vi.fn() }
		});
		const sheet = screen.getByTestId('confirm-sheet');
		expect(sheet).toBeInTheDocument();
		expect(sheet).toHaveClass('sheet');
	});

	it('calls onCancel when backdrop tapped', async () => {
		const onCancel = vi.fn();
		render(ConfirmSheet, {
			props: { bookTitle: 'Test Book', onConfirm: vi.fn(), onCancel }
		});
		const backdrop = document.querySelector('.backdrop');
		await fireEvent.click(backdrop!);
		expect(onCancel).toHaveBeenCalledTimes(1);
	});
});
