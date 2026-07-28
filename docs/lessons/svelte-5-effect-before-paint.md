In Svelte 5, `$effect` runs synchronously after DOM update but **before** the browser paints. You can set layout-affecting properties (`scrollLeft`, `scrollTop`) directly inside `$effect` and the browser paints with those values on the first frame:

```svelte
$effect(() => {
  if (!container) return;
  // Runs before paint — no flash at wrong position
  container.scrollLeft = targetPosition;
});
```

Wrapping in `tick().then(rAF(…))` defers to after paint, causing a visible flash (content renders at position 0, then jumps). Remove the async wrappers when the layout value is deterministic at effect time.
