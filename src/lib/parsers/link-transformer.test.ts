import { describe, it, expect } from 'vitest';
import { transformLinks } from './link-transformer';

describe('Link Transformation', () => {
	const navigationMap = new Map<string, number>([
		['EPUB/ch01.xhtml', 0],
		['EPUB/ch02.xhtml', 1],
		['EPUB/ch02s02.xhtml', 2]
	]);

	it('should transform cross-chapter links with fragments', () => {
		const html = '<a href="ch02.xhtml#section1">Link</a>';
		const result = transformLinks(html, 'EPUB/ch01.xhtml', navigationMap);
		expect(result).toContain('data-chapter="1"');
		expect(result).toContain('data-fragment="section1"');
		expect(result).toContain('class="internal-link"');
	});

	it('should transform same-chapter fragment links', () => {
		const html = '<a href="#section1">Link</a>';
		const result = transformLinks(html, 'EPUB/ch01.xhtml', navigationMap);
		expect(result).toContain('data-chapter="0"');
		expect(result).toContain('data-fragment="section1"');
	});

	it('should add external link attributes to http links', () => {
		const html = '<a href="http://example.com">Link</a>';
		const result = transformLinks(html, 'EPUB/ch01.xhtml', navigationMap);
		expect(result).toContain('target="_blank"');
		expect(result).toContain('rel="noopener"');
		expect(result).toContain('class="external-link"');
	});

	it('should mark links to missing files', () => {
		const html = '<a href="missing.xhtml">Link</a>';
		const result = transformLinks(html, 'EPUB/ch01.xhtml', navigationMap);
		expect(result).toContain('data-missing="true"');
		expect(result).toContain('data-original-href="missing.xhtml"');
	});
});
