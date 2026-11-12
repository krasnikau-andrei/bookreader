const HOUR = 60 * 60 * 1000;

/** "just now", "5h ago", "yesterday", "3 days ago", "2 weeks ago", "3 months ago" */
export function formatLastOpened(at: Date, now: Date = new Date()): string {
	const hours = Math.floor((now.getTime() - at.getTime()) / HOUR);
	if (hours < 1) return 'just now';
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days === 1) return 'yesterday';
	if (days < 14) return `${days} days ago`;
	if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
	return `${Math.floor(days / 30)} months ago`;
}
