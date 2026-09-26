import { describe, test, expect } from 'vitest';
import { createReaderHistory, isAheadOf } from './history';

describe('Reader History', () => {
	test('a fresh history has nothing to go back to', () => {
		const history = createReaderHistory({ chapter: 2, progress: 0.4 });

		expect(history.previous()).toBeNull();
		expect(history.back()).toBeNull();
	});

	test('push exposes the entry we jumped away from', () => {
		const history = createReaderHistory({ chapter: 2, progress: 0.4 });

		history.push({ chapter: 2, progress: 0.4 });
		// Footnote jump inside the same chapter, resolved to a real position
		history.sync({ chapter: 2, progress: 0.8 });

		expect(history.previous()).toEqual({ chapter: 2, progress: 0.4 });
		expect(history.back()).toEqual({ chapter: 2, progress: 0.4 });
	});

	test('page turns sync the current entry instead of stacking entries', () => {
		const history = createReaderHistory({ chapter: 2, progress: 0 });

		// Turning pages, then crossing into the next chapter by swiping
		history.sync({ chapter: 2, progress: 0.5 });
		history.sync({ chapter: 3, progress: 0 });

		expect(history.previous()).toBeNull();
	});

	test('sync after back re-aligns the entry we returned to', () => {
		const history = createReaderHistory({ chapter: 2, progress: 0.4 });
		history.push({ chapter: 7, progress: 0 });
		history.sync({ chapter: 7, progress: 0.25 });

		expect(history.back()).toEqual({ chapter: 2, progress: 0.4 });
		// Rounding to a page boundary can nudge the restored position
		history.sync({ chapter: 2, progress: 0.41 });
		history.push({ chapter: 7, progress: 0.25 });

		expect(history.back()).toEqual({ chapter: 2, progress: 0.41 });
	});

	test('back walks the whole stack one entry at a time', () => {
		const history = createReaderHistory({ chapter: 0, progress: 0 });
		history.push({ chapter: 5, progress: 0.3 });
		history.sync({ chapter: 5, progress: 0.5 });
		history.push({ chapter: 9, progress: 0.1 });

		expect(history.back()).toEqual({ chapter: 5, progress: 0.5 });
		expect(history.back()).toEqual({ chapter: 0, progress: 0 });
		expect(history.back()).toBeNull();
	});

	test('jumping after a rewind discards the abandoned branch', () => {
		const history = createReaderHistory({ chapter: 0, progress: 0 });
		history.push({ chapter: 5, progress: 0.5 });
		history.push({ chapter: 9, progress: 0.1 });

		history.back(); // → 5
		history.push({ chapter: 12, progress: 0.2 });

		expect(history.back()).toEqual({ chapter: 5, progress: 0.5 });
		expect(history.back()).toEqual({ chapter: 0, progress: 0 });
		expect(history.back()).toBeNull();
	});

	test('entries are copies, so the caller cannot mutate stored positions', () => {
		const history = createReaderHistory({ chapter: 1, progress: 0.1 });
		const origin = { chapter: 1, progress: 0.1 };
		history.push(origin);

		origin.chapter = 99;

		expect(history.back()).toEqual({ chapter: 1, progress: 0.1 });
	});
});

describe('isAheadOf', () => {
	test('a later chapter is ahead, whatever the progress is', () => {
		expect(isAheadOf({ chapter: 12, progress: 0 }, { chapter: 5, progress: 1 })).toBe(true);
		expect(isAheadOf({ chapter: 5, progress: 1 }, { chapter: 12, progress: 0 })).toBe(false);
	});

	test('inside one chapter, the deeper position is ahead', () => {
		expect(isAheadOf({ chapter: 5, progress: 0.8 }, { chapter: 5, progress: 0.2 })).toBe(true);
		expect(isAheadOf({ chapter: 5, progress: 0.2 }, { chapter: 5, progress: 0.8 })).toBe(false);
	});

	test('standing exactly on the target is not "ahead"', () => {
		expect(isAheadOf({ chapter: 5, progress: 0.4 }, { chapter: 5, progress: 0.4 })).toBe(false);
	});
});
