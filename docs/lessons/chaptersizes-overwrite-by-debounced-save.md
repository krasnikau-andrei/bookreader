ReaderContent.svelte calls `saveProgress({ bookId, chapterIndex, scrollPercent, lastReadAt })` without `chapterSizes` in three places (previous-chapter swipe, next-chapter swipe, debounced scroll save). This overwrites the IndexedDB record and silently deletes `chapterSizes`, causing the library to recompute sizes on every visit and creating a visible progress twitch (30% → 35% → 30%).

Fix: `saveProgress` in `storage.ts` merges existing `chapterSizes` from the stored record when the incoming progress omits them.
