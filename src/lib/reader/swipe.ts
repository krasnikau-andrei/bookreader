/**
 * Swipe detection and completion for book reader
 * Tracks touch gestures to ensure pages always snap properly
 */
export interface SwipeCallbacks {
	onSwipeLeft: () => void;
	onSwipeRight: () => void;
	onSwipeCancel: () => void;
	onSwipeStart?: () => void; // Called when swipe starts
}

export function createSwipeHandler(
	element: HTMLElement,
	callbacks: SwipeCallbacks,
	config: { velocityThreshold: number; progressThreshold: number } = {
		velocityThreshold: 0.5,
		progressThreshold: 0.3
	}
) {
	const state: {
		isActive: boolean;
		startX: number;
		startY: number;
		startTime: number;
		startScrollLeft: number;
		lastX: number;
		lastTime: number;
		didSwipe: boolean;
	} = {
		isActive: false,
		startX: 0,
		startY: 0,
		startTime: 0,
		startScrollLeft: 0,
		lastX: 0,
		lastTime: 0,
		didSwipe: false
	};

	function startSwipe(clientX: number, clientY: number) {
		state.isActive = true;
		state.didSwipe = false;
		state.startX = clientX;
		state.startY = clientY;
		state.startTime = performance.now();
		state.startScrollLeft = element.scrollLeft;
		state.lastX = clientX;
		state.lastTime = performance.now();
		callbacks.onSwipeStart?.();
	}

	function moveSwipe(clientX: number, clientY: number) {
		if (!state.isActive) return;
		const deltaX = clientX - state.startX;
		const deltaY = clientY - state.startY;

		// If moving more vertically than horizontally, ignore
		if (Math.abs(deltaY) > Math.abs(deltaX)) {
			state.isActive = false;
			return;
		}

		// Mark as swipe if moved more than 20px horizontally
		// This threshold prevents accidental clicks being detected as swipes
		if (Math.abs(deltaX) > 20) {
			state.didSwipe = true;
		}

		state.lastX = clientX;
		state.lastTime = performance.now();
	}

	function endSwipe() {
		if (!state.isActive) return;
		state.isActive = false;

		const endTime = performance.now();
		const deltaX = state.lastX - state.startX;
		const deltaTime = endTime - state.startTime;
		const viewportWidth = element.clientWidth;

		// Calculate velocity in viewports per second based on FINGER movement, not scroll
		const velocity = deltaTime > 0 ? Math.abs(deltaX) / viewportWidth / (deltaTime / 1000) : 0;

		// Calculate progress based on FINGER movement, not scroll position change
		// This fixes the bug where native scroll-snap could scroll multiple pages,
		// causing progress > 1 and resulting in multiple page turns.
		// We only care about how far the user's finger moved, not how far content scrolled.
		const progress = Math.abs(deltaX) / viewportWidth;

		// Determine if swipe should complete
		const shouldComplete =
			velocity > config.velocityThreshold || progress > config.progressThreshold;

		if (!shouldComplete) {
			// Reset didSwipe since this wasn't a completed swipe
			// This allows subsequent clicks to be processed normally
			state.didSwipe = false;
			callbacks.onSwipeCancel();
			return;
		}

		// Determine direction: negative deltaX means swiping left (going to next page)
		if (deltaX < 0) {
			callbacks.onSwipeLeft();
		} else {
			callbacks.onSwipeRight();
		}
	}

	// Touch event handlers
	function handleTouchStart(event: TouchEvent) {
		if (event.touches.length !== 1) return;
		const touch = event.touches[0];
		startSwipe(touch.clientX, touch.clientY);
	}

	function handleTouchMove(event: TouchEvent) {
		if (!state.isActive || event.touches.length !== 1) return;
		const touch = event.touches[0];
		moveSwipe(touch.clientX, touch.clientY);
	}

	function handleTouchEnd() {
		endSwipe();
	}

	// Mouse event handlers (for desktop testing)
	function handleMouseDown(event: MouseEvent) {
		if (event.button !== 0) return; // Only left mouse button

		// End any previous swipe first
		if (state.isActive) {
			endSwipe();
		}

		startSwipe(event.clientX, event.clientY);
	}

	function handleMouseMove(event: MouseEvent) {
		if (!state.isActive) return;
		moveSwipe(event.clientX, event.clientY);
	}

	function handleMouseUp() {
		endSwipe();
	}

	function handleMouseLeave() {
		// End swipe when leaving the element
		endSwipe();
	}

	function attach() {
		// Touch events
		element.addEventListener('touchstart', handleTouchStart, { passive: true });
		element.addEventListener('touchmove', handleTouchMove, { passive: true });
		element.addEventListener('touchend', handleTouchEnd, { passive: true });

		// Mouse events (for desktop/testing)
		element.addEventListener('mousedown', handleMouseDown);
		element.addEventListener('mousemove', handleMouseMove);
		element.addEventListener('mouseup', handleMouseUp);
		element.addEventListener('mouseleave', handleMouseLeave);
	}

	function detach() {
		// Touch events
		element.removeEventListener('touchstart', handleTouchStart);
		element.removeEventListener('touchmove', handleTouchMove);
		element.removeEventListener('touchend', handleTouchEnd);

		// Mouse events
		element.removeEventListener('mousedown', handleMouseDown);
		element.removeEventListener('mousemove', handleMouseMove);
		element.removeEventListener('mouseup', handleMouseUp);
		element.removeEventListener('mouseleave', handleMouseLeave);
	}

	function hasSwiped() {
		// Return true if there was significant movement during this interaction
		// Reset the flag after checking so subsequent clicks aren't blocked
		const result = state.didSwipe;
		state.didSwipe = false;
		return result;
	}

	return { attach, detach, hasSwiped };
}
