/**
 * Swipe detection and completion for book reader
 * Tracks touch gestures to ensure pages always snap properly
 */
export interface SwipeConfig {
  velocityThreshold: number; // viewports per second
  progressThreshold: number; // fraction of viewport
}

export const DEFAULT_SWIPE_CONFIG: SwipeConfig = {
  velocityThreshold: 0.5,
  progressThreshold: 0.3
};

interface SwipeState {
	isActive: boolean;
	startX: number;
	startY: number;
	startTime: number;
	startScrollLeft: number;
	lastX: number;
	lastTime: number;
	didSwipe: boolean; // Track if a swipe occurred to prevent click
}

export interface SwipeCallbacks {
	onSwipeLeft: () => void;
	onSwipeRight: () => void;
	onSwipeCancel: () => void;
	onSwipeStart?: () => void; // Called when swipe starts
}

export function createSwipeHandler(
	element: HTMLElement,
	callbacks: SwipeCallbacks,
	config: SwipeConfig = DEFAULT_SWIPE_CONFIG
) {
	const state: SwipeState = {
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

		// Mark as swipe if moved more than 10px horizontally
		if (Math.abs(deltaX) > 10) {
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

		// Calculate velocity in viewports per second
		const velocity = deltaTime > 0 ? Math.abs(deltaX) / viewportWidth / (deltaTime / 1000) : 0;

		// Calculate progress based on scroll change
		const scrollDelta = element.scrollLeft - state.startScrollLeft;
		const progress = Math.abs(scrollDelta) / viewportWidth;

		// Determine if swipe should complete
		const shouldComplete = velocity > config.velocityThreshold || progress > config.progressThreshold;

  if (!shouldComplete) {
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

	function handleTouchEnd(event: TouchEvent) {
		endSwipe();
	}

// Mouse event handlers (for desktop testing and mouse users)
function handleMouseDown(event: MouseEvent) {
  if (event.button !== 0) return; // Only left mouse button
  // If already active, end the previous swipe first
  if (state.isActive) {
    endSwipe();
  }
  startSwipe(event.clientX, event.clientY);
  // Attach document listeners to handle drag outside element
  // Use capture phase to ensure we get the events
  document.addEventListener('mousemove', handleDocumentMouseMove, { capture: true });
  document.addEventListener('mouseup', handleDocumentMouseUp, { capture: true });
}

	function handleMouseMove(event: MouseEvent) {
		if (!state.isActive) return;
		moveSwipe(event.clientX, event.clientY);
	}

function handleDocumentMouseMove(event: MouseEvent) {
  if (!state.isActive) return;
  moveSwipe(event.clientX, event.clientY);
}

	function handleMouseUp(event: MouseEvent) {
		// Handled by document listener
	}

function handleDocumentMouseUp(event: MouseEvent) {
  // Remove document listeners - use same options as when adding
  document.removeEventListener('mousemove', handleDocumentMouseMove, { capture: true });
  document.removeEventListener('mouseup', handleDocumentMouseUp, { capture: true });
  endSwipe();
}

	function handleMouseLeave(event: MouseEvent) {
		// Don't end swipe on mouseleave - let document handlers handle it
	}

	function attach() {
		// Touch events
		element.addEventListener('touchstart', handleTouchStart, { passive: true });
		element.addEventListener('touchmove', handleTouchMove, { passive: true });
		element.addEventListener('touchend', handleTouchEnd, { passive: true });

		// Mouse events
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

		// Clean up document listeners if still attached
		document.removeEventListener('mousemove', handleDocumentMouseMove);
		document.removeEventListener('mouseup', handleDocumentMouseUp);
	}

	function hasSwiped() {
		return state.didSwipe;
	}

	function resetSwipe() {
		state.didSwipe = false;
	}

	return { attach, detach, hasSwiped, resetSwipe };
}
