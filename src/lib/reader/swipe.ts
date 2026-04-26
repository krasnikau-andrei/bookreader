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
}

export interface SwipeCallbacks {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onSwipeCancel: () => void;
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
    lastTime: 0
  };

  function handleTouchStart(event: TouchEvent) {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    state.isActive = true;
    state.startX = touch.clientX;
    state.startY = touch.clientY;
    state.startTime = performance.now();
    state.startScrollLeft = element.scrollLeft;
    state.lastX = touch.clientX;
    state.lastTime = performance.now();
  }

  function handleTouchMove(event: TouchEvent) {
    if (!state.isActive || event.touches.length !== 1) return;
    const touch = event.touches[0];
    const deltaX = touch.clientX - state.startX;
    const deltaY = touch.clientY - state.startY;

    // If moving more vertically than horizontally, ignore
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      state.isActive = false;
      return;
    }

    state.lastX = touch.clientX;
    state.lastTime = performance.now();
  }

  function handleTouchEnd(event: TouchEvent) {
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

  function attach() {
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
  }

  function detach() {
    element.removeEventListener('touchstart', handleTouchStart);
    element.removeEventListener('touchmove', handleTouchMove);
    element.removeEventListener('touchend', handleTouchEnd);
  }

  return { attach, detach };
}
