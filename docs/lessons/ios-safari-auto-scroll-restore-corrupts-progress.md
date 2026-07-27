# iOS Safari auto-scroll-restore corrupts reading progress

iOS Safari caches `scrollLeft` of scrollable elements during page load (before
JS runs) and restores it asynchronously AFTER JS has programmatically set the
correct position. The resulting scroll event triggers `handleScroll`, which
saves the stale position to IndexedDB, causing a multi-page rollback on the
next page load.

## The fix

After programmatic scroll restoration in the `$effect`, set a 600ms guard
(`scrollRestoreGuard` timeout) that blocks `handleScroll` from saving or
updating the URL. If a scroll event fires during the guard period, re-apply
the correct `scrollLeft` via `jumpTo` instead of persisting the stale
position.

Also added an additional check: when a scroll event fires during the guard
period and `scrollLeft` differs from the restored target, the event is
suppressed and the correct position is re-applied. This handles the case where
Safari's restore happens after the safety net has already run.

## Related

- `saveProgress` debounce (300ms trailing) meant saves could still be in-flight
  when the user switched apps — added `visibilitychange`/`pagehide` handler to
  flush immediately.
- Page-turn animations (`animateScroll`) generated scroll events on every
  frame, calling `handleScroll` with intermediate positions — added
  `isAnimatingScroll` flag to block `handleScroll` during animation, and
  explicitly save the target position after animation completes.
