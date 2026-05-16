const BASE64_DATA_RE = /<(?:img|image)\b[^>]*(?:src|href)\s*=\s*"data:[^"]*"[^>]*\/?>/gi;

export function measureChapterContent(content: string): number {
	return content.replace(BASE64_DATA_RE, '').length;
}

export function calculateBookProgress(
	chapterSizes: number[],
	currentChapter: number,
	scrollPercent: number
): number {
	if (!chapterSizes || chapterSizes.length === 0) return 0;
	const safeChapter = Math.max(0, Math.min(currentChapter, chapterSizes.length - 1));
	const totalSize = chapterSizes.reduce((a, b) => a + b, 0);
	if (totalSize === 0) return 0;
	const beforeCurrent = chapterSizes.slice(0, safeChapter).reduce((a, b) => a + b, 0);
	const clampedPercent = Math.max(0, Math.min(1, scrollPercent));
	const currentProgress = chapterSizes[safeChapter] * clampedPercent;
	return (beforeCurrent + currentProgress) / totalSize;
}
