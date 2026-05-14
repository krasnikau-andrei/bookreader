import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { userEvent } from '@testing-library/user-event';
import ImageFullscreen from './ImageFullscreen.svelte';

beforeAll(() => {
	if (!Element.prototype.animate) {
		Element.prototype.animate = () =>
			({
				finished: Promise.resolve(),
				cancel: () => {},
				play: () => {},
				pause: () => {},
				reverse: () => {},
				addEventListener: () => {},
				removeEventListener: () => {},
				currentTime: 0,
				playState: 'finished'
			}) as unknown as Animation;
	}
});

describe('ImageFullscreen', () => {
	it('renders the image with correct source', () => {
		render(ImageFullscreen, { src: 'data:image/png;base64,test', onClose: () => {} });
		const img = screen.getByRole('dialog').querySelector('img');
		expect(img).toBeTruthy();
		expect(img!.src).toBe('data:image/png;base64,test');
	});

	it('renders a close button', () => {
		render(ImageFullscreen, { src: 'data:image/png;base64,test', onClose: () => {} });
		expect(screen.getByLabelText('Close fullscreen image')).toBeTruthy();
	});

	it('calls onClose when close button is clicked', async () => {
		const onClose = vi.fn();
		render(ImageFullscreen, { src: 'data:image/png;base64,test', onClose });
		const closeBtn = screen.getByLabelText('Close fullscreen image');
		await userEvent.click(closeBtn);
		expect(onClose).toHaveBeenCalledTimes(1);
	});
});
