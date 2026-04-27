import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSafetyNet, DEFAULT_SAFETY_NET_CONFIG, SafetyNetConfig } from './safety-net';

describe('Safety Net', () => {
	let element: HTMLElement;
	let onSnapCorrection: ReturnType<typeof vi.fn>;
	let safetyNet: ReturnType<typeof createSafetyNet>;

	beforeEach(() => {
		element = document.createElement('div');
		element.style.width = '400px';
		document.body.appendChild(element);

		// Mock scrollLeft and clientWidth
		Object.defineProperty(element, 'scrollLeft', {
			writable: true,
			value: 0
		});
		Object.defineProperty(element, 'clientWidth', {
			writable: true,
			value: 400
		});

		onSnapCorrection = vi.fn();
	});

	afterEach(() => {
		if (safetyNet) {
			safetyNet.detach();
		}
		document.body.removeChild(element);
	});

	describe('configuration', () => {
		test('exports default config', () => {
			expect(DEFAULT_SAFETY_NET_CONFIG).toEqual({
				checkDelay: 100,
				tolerance: 5
			});
		});

		test('uses default config when not provided', () => {
			safetyNet = createSafetyNet(element, onSnapCorrection);
			expect(safetyNet).toBeDefined();
			expect(safetyNet.attach).toBeDefined();
			expect(safetyNet.detach).toBeDefined();
		});

		test('accepts custom config', () => {
			const customConfig: SafetyNetConfig = {
				checkDelay: 200,
				tolerance: 10
			};
			safetyNet = createSafetyNet(element, onSnapCorrection, customConfig);
			expect(safetyNet).toBeDefined();
		});
	});

	describe('attach and detach', () => {
		test('attach returns safety net with attach and detach methods', () => {
			safetyNet = createSafetyNet(element, onSnapCorrection);
			expect(safetyNet.attach).toBeDefined();
			expect(safetyNet.detach).toBeDefined();
		});

		test('attach adds scroll event listener', () => {
			safetyNet = createSafetyNet(element, onSnapCorrection);
			const addEventListenerSpy = vi.spyOn(element, 'addEventListener');
			safetyNet.attach();
			expect(addEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function), {
				passive: true
			});
		});

		test('detach removes scroll event listener', () => {
			safetyNet = createSafetyNet(element, onSnapCorrection);
			safetyNet.attach();
			const removeEventListenerSpy = vi.spyOn(element, 'removeEventListener');
			safetyNet.detach();
			expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
		});
	});

	describe('snap point detection', () => {
		test('does not trigger correction when at exact snap point', async () => {
			element.scrollLeft = 800; // Exactly at page 2
			safetyNet = createSafetyNet(element, onSnapCorrection);
			safetyNet.attach();

			element.dispatchEvent(new Event('scroll'));

			// Wait for checkDelay
			await new Promise((resolve) => setTimeout(resolve, 150));

			expect(onSnapCorrection).not.toHaveBeenCalled();
		});

		test('does not trigger correction when within tolerance of snap point', async () => {
			element.scrollLeft = 803; // 3px from page 2 snap point (within 5px tolerance)
			safetyNet = createSafetyNet(element, onSnapCorrection);
			safetyNet.attach();

			element.dispatchEvent(new Event('scroll'));

			await new Promise((resolve) => setTimeout(resolve, 150));

			expect(onSnapCorrection).not.toHaveBeenCalled();
		});

		test('triggers correction when outside tolerance of snap point', async () => {
			element.scrollLeft = 820; // 20px from page 2 snap point (outside 5px tolerance)
			safetyNet = createSafetyNet(element, onSnapCorrection);
			safetyNet.attach();

			element.dispatchEvent(new Event('scroll'));

			await new Promise((resolve) => setTimeout(resolve, 150));

			expect(onSnapCorrection).toHaveBeenCalledTimes(1);
			expect(onSnapCorrection).toHaveBeenCalledWith(800); // Should correct to page 2
		});

		test('triggers correction to nearest snap point', async () => {
			element.scrollLeft = 210; // Between page 0 (0px) and page 1 (400px), closer to page 1
			safetyNet = createSafetyNet(element, onSnapCorrection);
			safetyNet.attach();

			element.dispatchEvent(new Event('scroll'));

			await new Promise((resolve) => setTimeout(resolve, 150));

			expect(onSnapCorrection).toHaveBeenCalledTimes(1);
			expect(onSnapCorrection).toHaveBeenCalledWith(400); // Should correct to page 1
		});

		test('triggers correction to previous page when closer', async () => {
			element.scrollLeft = 190; // Between page 0 (0px) and page 1 (400px), closer to page 0
			safetyNet = createSafetyNet(element, onSnapCorrection);
			safetyNet.attach();

			element.dispatchEvent(new Event('scroll'));

			await new Promise((resolve) => setTimeout(resolve, 150));

			expect(onSnapCorrection).toHaveBeenCalledTimes(1);
			expect(onSnapCorrection).toHaveBeenCalledWith(0); // Should correct to page 0
		});
	});

	describe('debouncing', () => {
		test('debounces scroll events', async () => {
			element.scrollLeft = 820;
			safetyNet = createSafetyNet(element, onSnapCorrection);
			safetyNet.attach();

			// Trigger multiple scroll events
			element.dispatchEvent(new Event('scroll'));
			element.dispatchEvent(new Event('scroll'));
			element.dispatchEvent(new Event('scroll'));

			await new Promise((resolve) => setTimeout(resolve, 150));

			// Should only trigger once due to debouncing
			expect(onSnapCorrection).toHaveBeenCalledTimes(1);
		});

		test('uses custom checkDelay', async () => {
			const customConfig: SafetyNetConfig = {
				checkDelay: 50,
				tolerance: 5
			};
			element.scrollLeft = 820;
			safetyNet = createSafetyNet(element, onSnapCorrection, customConfig);
			safetyNet.attach();

			element.dispatchEvent(new Event('scroll'));

			// Should not trigger before 50ms
			await new Promise((resolve) => setTimeout(resolve, 30));
			expect(onSnapCorrection).not.toHaveBeenCalled();

			// Should trigger after 50ms
			await new Promise((resolve) => setTimeout(resolve, 50));
			expect(onSnapCorrection).toHaveBeenCalledTimes(1);
		});
	});

	describe('inactive state', () => {
		test('does not trigger correction after detach', async () => {
			element.scrollLeft = 820;
			safetyNet = createSafetyNet(element, onSnapCorrection);
			safetyNet.attach();
			safetyNet.detach();

			element.dispatchEvent(new Event('scroll'));

			await new Promise((resolve) => setTimeout(resolve, 150));

			expect(onSnapCorrection).not.toHaveBeenCalled();
		});

		test('does not schedule check when not active', async () => {
			safetyNet = createSafetyNet(element, onSnapCorrection);
			// Don't call attach()

			element.dispatchEvent(new Event('scroll'));

			await new Promise((resolve) => setTimeout(resolve, 150));

			expect(onSnapCorrection).not.toHaveBeenCalled();
		});
	});

	describe('edge cases', () => {
		test('handles scroll position at 0', async () => {
			element.scrollLeft = 0;
			safetyNet = createSafetyNet(element, onSnapCorrection);
			safetyNet.attach();

			element.dispatchEvent(new Event('scroll'));

			await new Promise((resolve) => setTimeout(resolve, 150));

			expect(onSnapCorrection).not.toHaveBeenCalled();
		});

		test('handles scroll position at exact page boundary', async () => {
			element.scrollLeft = 400; // Page 1 boundary
			safetyNet = createSafetyNet(element, onSnapCorrection);
			safetyNet.attach();

			element.dispatchEvent(new Event('scroll'));

			await new Promise((resolve) => setTimeout(resolve, 150));

			expect(onSnapCorrection).not.toHaveBeenCalled();
		});

		test('handles tolerance at boundary', async () => {
			element.scrollLeft = 405; // Exactly at tolerance limit
			safetyNet = createSafetyNet(element, onSnapCorrection);
			safetyNet.attach();

			element.dispatchEvent(new Event('scroll'));

			await new Promise((resolve) => setTimeout(resolve, 150));

			expect(onSnapCorrection).not.toHaveBeenCalled();
		});

		test('triggers when just outside tolerance', async () => {
			element.scrollLeft = 406; // Just outside tolerance (5px)
			safetyNet = createSafetyNet(element, onSnapCorrection);
			safetyNet.attach();

			element.dispatchEvent(new Event('scroll'));

			await new Promise((resolve) => setTimeout(resolve, 150));

			expect(onSnapCorrection).toHaveBeenCalledTimes(1);
			expect(onSnapCorrection).toHaveBeenCalledWith(400);
		});
	});
});
