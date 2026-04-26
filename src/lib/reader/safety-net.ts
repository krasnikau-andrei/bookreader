/**
 * Safety net to ensure scroll position is always at a valid snap point
 * Monitors scroll position and corrects if stuck between pages
 */
export interface SafetyNetConfig {
  checkDelay: number; // ms to wait before correcting
  tolerance: number; // pixels from snap point to trigger correction
}

export const DEFAULT_SAFETY_NET_CONFIG: SafetyNetConfig = {
  checkDelay: 100,
  tolerance: 5,
};

export function createSafetyNet(
  element: HTMLElement,
  onSnapCorrection: (targetScroll: number) => void,
  config: SafetyNetConfig = DEFAULT_SAFETY_NET_CONFIG
) {
  let checkTimeout: ReturnType<typeof setTimeout> | null = null;
  let isActive = false;

  function isAtSnapPoint(): boolean {
    const clientWidth = element.clientWidth;
    const expectedPage = Math.round(element.scrollLeft / clientWidth);
    const expectedScroll = expectedPage * clientWidth;
    return Math.abs(element.scrollLeft - expectedScroll) <= config.tolerance;
  }

  function getNearestSnapScroll(): number {
    const clientWidth = element.clientWidth;
    const pageIndex = Math.round(element.scrollLeft / clientWidth);
    return pageIndex * clientWidth;
  }

  function scheduleCheck() {
    if (!isActive) return;
    if (checkTimeout) {
      clearTimeout(checkTimeout);
    }
    checkTimeout = setTimeout(() => {
      if (!isActive) return;
      if (!isAtSnapPoint()) {
        const targetScroll = getNearestSnapScroll();
        onSnapCorrection(targetScroll);
      }
    }, config.checkDelay);
  }

  function handleScroll() {
    scheduleCheck();
  }

  function attach() {
    isActive = true;
    element.addEventListener('scroll', handleScroll, { passive: true });
  }

  function detach() {
    isActive = false;
    if (checkTimeout) {
      clearTimeout(checkTimeout);
      checkTimeout = null;
    }
    element.removeEventListener('scroll', handleScroll);
  }

  return { attach, detach };
}
