import { describe, test, expect } from 'vitest';
import { formatLastOpened } from './last-opened';

describe('formatLastOpened', () => {
	const now = new Date('2026-11-12T12:00:00Z');
	const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600_000);

	test.each([
		[0.5, 'just now'],
		[5, '5h ago'],
		[30, 'yesterday'],
		[24 * 3, '3 days ago'],
		[24 * 15, '2 weeks ago'],
		[24 * 95, '3 months ago']
	])('%f hours ago → %s', (hours, expected) => {
		expect(formatLastOpened(hoursAgo(hours), now)).toBe(expected);
	});
});
