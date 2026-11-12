export interface BookTitle {
	main: string;
	subtitle: string;
}

/** Collapses the stray whitespace that hand-made EPUB metadata is full of. */
export function cleanText(text: string): string {
	return text.replace(/\s+/g, ' ').trim();
}

/**
 * Splits "Main: subtitle" / "Main. Subtitle" and drops a trailing "(series name)"
 * that converters often append, so the big headline stays short.
 */
export function splitTitle(raw: string): BookTitle {
	const title = cleanText(raw).replace(/\s*\([^)]*\)$/, '');
	const match = title.match(/^(.{4,}?)(?::|\.\s)\s*(.+)$/);
	if (!match) return { main: title, subtitle: '' };
	return { main: match[1], subtitle: match[2] };
}

/** Short titles get the full size, long ones shrink linearly down to `min`. */
export function titleFontSize(title: string, max: number, min: number): number {
	const t = Math.min(1, Math.max(0, (title.length - 8) / 40));
	return Math.round(max - (max - min) * t);
}
