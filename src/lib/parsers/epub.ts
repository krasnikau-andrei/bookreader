import JSZip from 'jszip';
import { transformLinks } from './link-transformer';
import { normalizePath } from './normalize-path';

function parseXml(xml: string, mimeType: DOMParserSupportedType): Document {
	if (xml.charCodeAt(0) === 0xfeff) {
		xml = xml.slice(1);
	}
	return new DOMParser().parseFromString(xml, mimeType);
}

export interface ParsedBook {
	title: string;
	author: string;
	cover: string | null;
	description: string | null;
	language: string;
}

export async function parseEpub(buffer: ArrayBuffer): Promise<ParsedBook> {
	let zip: JSZip;
	try {
		zip = await JSZip.loadAsync(buffer);
	} catch {
		throw new Error('Invalid EPUB format: unable to parse ZIP archive');
	}

	// Check mimetype
	const mimetype = await zip.file('mimetype')?.async('string');
	if (mimetype !== 'application/epub+zip') {
		if (mimetype === undefined) {
			throw new Error('Invalid EPUB format: missing mimetype file');
		}
		throw new Error(
			`Invalid EPUB format: mimetype is "${mimetype.trim()}" instead of "application/epub+zip"`
		);
	}

	// Read container.xml to find content.opf
	const containerXml = await zip.file('META-INF/container.xml')?.async('string');
	if (!containerXml) {
		throw new Error('Invalid EPUB format: missing container.xml');
	}

	// Parse container.xml using DOMParser
	const opfPath = extractOpfPath(containerXml);
	if (!opfPath) {
		throw new Error('Invalid EPUB format: cannot find content.opf');
	}

	// Read content.opf
	const opfContent = await zip.file(opfPath)?.async('string');
	if (!opfContent) {
		throw new Error('Invalid EPUB format: missing content.opf');
	}

	// Parse content.opf using DOMParser
	const opfDoc = parseXml(opfContent, 'application/xml');

	// Check for parsing errors
	const parserError = opfDoc.querySelector('parsererror');
	if (parserError) {
		throw new Error(
			`Invalid EPUB format: malformed content.opf - ${parserError.textContent?.substring(0, 100) || 'XML parsing error'}`
		);
	}

	// Extract metadata using namespace-aware methods
	const dcNamespace = 'http://purl.org/dc/elements/1.1/';
	const titleElements = opfDoc.getElementsByTagNameNS(dcNamespace, 'title');
	const authorElements = opfDoc.getElementsByTagNameNS(dcNamespace, 'creator');
	const languageElements = opfDoc.getElementsByTagNameNS(dcNamespace, 'language');
	const descriptionElements = opfDoc.getElementsByTagNameNS(dcNamespace, 'description');

	const title = titleElements[0]?.textContent?.trim() || null;
	const author = authorElements[0]?.textContent?.trim() || null;
	const language = languageElements[0]?.textContent?.trim() || 'en';
	const description = descriptionElements[0]?.textContent?.trim() || null;

	// Extract cover
	const coverPath = extractCoverPath(opfDoc, opfPath);
	const cover = coverPath ? await extractCoverImage(zip, coverPath) : null;

	return {
		title: title || 'Untitled',
		author: author || 'Unknown Author',
		cover,
		description,
		language
	};
}

function extractOpfPath(containerXml: string): string | null {
	const doc = parseXml(containerXml, 'application/xml');

	const ns = 'urn:oasis:names:tc:opendocument:xmlns:container';
	const rootfiles = doc.getElementsByTagNameNS(ns, 'rootfile');
	for (let i = 0; i < rootfiles.length; i++) {
		const rootfile = rootfiles[i];
		if (rootfile.getAttribute('media-type') === 'application/oebps-package+xml') {
			return rootfile.getAttribute('full-path');
		}
	}

	if (rootfiles.length > 0) {
		return rootfiles[0].getAttribute('full-path');
	}

	return null;
}

function extractCoverPath(opfDoc: Document, opfPath: string): string | null {
	// First, try to find cover by meta tag reference
	const metaTags = opfDoc.querySelectorAll('meta');
	for (const meta of metaTags) {
		if (meta.getAttribute('name') === 'cover') {
			const coverId = meta.getAttribute('content');
			if (coverId) {
				// Find item with matching id
				const items = opfDoc.querySelectorAll('item');
				for (const item of items) {
					if (item.getAttribute('id') === coverId) {
						const href = item.getAttribute('href');
						if (href) {
							return resolvePath(opfPath, href);
						}
					}
				}
			}
		}
	}

	// Try to find by properties="cover-image"
	const items = opfDoc.querySelectorAll('item');
	for (const item of items) {
		if (item.getAttribute('properties')?.includes('cover-image')) {
			const href = item.getAttribute('href');
			if (href) {
				return resolvePath(opfPath, href);
			}
		}
	}

	return null;
}

function resolvePath(opfPath: string, href: string): string {
	const basePath = opfPath.substring(0, opfPath.lastIndexOf('/') + 1);
	return normalizePath(basePath + href);
}

async function extractCoverImage(zip: JSZip, coverPath: string): Promise<string | null> {
	const coverFile = zip.file(coverPath);
	if (!coverFile) {
		return null;
	}

	const coverData = await coverFile.async('uint8array');
	const extension = coverPath.split('.').pop()?.toLowerCase() || 'jpg';
	const mimeType = getMimeType(extension);
	const base64 = arrayBufferToBase64(coverData);

	return `data:${mimeType};base64,${base64}`;
}

function getMimeType(extension: string): string {
	const mimeTypes: Record<string, string> = {
		jpg: 'image/jpeg',
		jpeg: 'image/jpeg',
		png: 'image/png',
		gif: 'image/gif',
		svg: 'image/svg+xml',
		webp: 'image/webp'
	};
	return mimeTypes[extension] || 'image/jpeg';
}

function arrayBufferToBase64(buffer: Uint8Array): string {
	let binary = '';
	const bytes = new Uint8Array(buffer);
	const len = bytes.byteLength;
	for (let i = 0; i < len; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

import type { Chapter } from '$lib/types';

export interface ParsedChapters {
	chapters: Chapter[];
	navigationMap: { filePathToChapterIndex: Map<string, number> };
}

interface TocEntry {
	href: string;
	label: string;
	level: number;
}

function parseTocHierarchy(
	olElement: Element,
	entries: TocEntry[],
	level: number,
	basePath: string,
	bookTitle: string,
	isFirstEntry: boolean
): void {
	const items = olElement.querySelectorAll(':scope > li');

	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		const link = item.querySelector(':scope > a');

		if (link) {
			const href = link.getAttribute('href');
			const label = link.textContent?.trim();

			if (href && label) {
				// Skip book title/cover entries
				if (isBookTitleEntry(label, bookTitle, isFirstEntry && entries.length === 0)) {
					// Still need to parse children of this entry
					const nestedOl = item.querySelector(':scope > ol');
					if (nestedOl) {
						parseTocHierarchy(nestedOl, entries, level, basePath, bookTitle, isFirstEntry);
					}
					continue;
				}

				const fullPath = resolvePath(basePath, href);
				entries.push({
					href: fullPath,
					label,
					level
				});
			}
		}

		// Recursively parse nested ol
		const nestedOl = item.querySelector(':scope > ol');
		if (nestedOl) {
			parseTocHierarchy(nestedOl, entries, level + 1, basePath, bookTitle, isFirstEntry);
		}
	}
}

function isBookTitleEntry(label: string, bookTitle: string, isFirstEntry: boolean): boolean {
	// Skip if it's the first entry and matches book title
	if (isFirstEntry && label.toLowerCase() === bookTitle.toLowerCase()) {
		return true;
	}

	return /^(cover|title page|table of contents|contents|toc|front matter|copyright|dedication|acknowledgments|about the author)$/i.test(
		label
	);
}

async function extractTocHierarchy(
	zip: JSZip,
	opfDoc: Document,
	opfPath: string,
	bookTitle: string
): Promise<TocEntry[]> {
	const entries: TocEntry[] = [];

	// Try EPUB 3 nav.xhtml first (look for item with properties="nav")
	const navItem = opfDoc.querySelector('item[properties~="nav"]');
	if (navItem) {
		const navHref = navItem.getAttribute('href');
		if (navHref) {
			const navPath = resolvePath(opfPath, navHref);
			const navContent = await zip.file(navPath)?.async('string');
			if (navContent) {
				const navDoc = parseXml(navContent, 'application/xhtml+xml');
				// Look for nav element with epub:type="toc" or id="toc"
				const tocNav = navDoc.querySelector('nav[epub\\:type="toc"], nav#toc');
				if (tocNav) {
					const topLevelOl = tocNav.querySelector(':scope > ol');
					if (topLevelOl) {
						parseTocHierarchy(topLevelOl, entries, 0, navPath, bookTitle, true);
					}
				}
				return entries;
			}
		}
	}

	// Try EPUB 2 toc.ncx (look for item with media-type="application/x-dtbncx+xml")
	const ncxItem = opfDoc.querySelector('item[media-type="application/x-dtbncx+xml"]');
	if (ncxItem) {
		const ncxHref = ncxItem.getAttribute('href');
		if (ncxHref) {
			const ncxPath = resolvePath(opfPath, ncxHref);
			const ncxContent = await zip.file(ncxPath)?.async('string');
			if (ncxContent) {
				const ncxDoc = parseXml(ncxContent, 'application/xml');
				const navPoints = ncxDoc.querySelectorAll('navPoint');
				let isFirst = true;
				for (const navPoint of navPoints) {
					const content = navPoint.querySelector('content');
					const navLabel = navPoint.querySelector('navLabel text');
					const href = content?.getAttribute('src');
					const label = navLabel?.textContent?.trim();
					if (href && label) {
						// Skip book title entries
						if (isBookTitleEntry(label, bookTitle, isFirst)) {
							isFirst = false;
							continue;
						}
						isFirst = false;

						const fullPath = resolvePath(ncxPath, href);
						entries.push({
							href: fullPath,
							label,
							level: 0 // NCX has flat structure or uses nesting differently
						});
					}
				}
				return entries;
			}
		}
	}

	return entries;
}

export async function parseEpubChapters(buffer: ArrayBuffer): Promise<ParsedChapters> {
	let zip: JSZip;
	try {
		zip = await JSZip.loadAsync(buffer);
	} catch {
		throw new Error('Invalid EPUB format: unable to parse ZIP archive');
	}

	// Read container.xml to find content.opf
	const containerXml = await zip.file('META-INF/container.xml')?.async('string');
	if (!containerXml) {
		throw new Error('Invalid EPUB format: missing container.xml');
	}

	const opfPath = extractOpfPath(containerXml);
	if (!opfPath) {
		throw new Error('Invalid EPUB format: cannot find content.opf');
	}

	// Read content.opf
	const opfContent = await zip.file(opfPath)?.async('string');
	if (!opfContent) {
		throw new Error('Invalid EPUB format: missing content.opf');
	}

	// Parse content.opf
	const opfDoc = parseXml(opfContent, 'application/xml');

	// Extract book title for filtering TOC entries
	const dcNamespace = 'http://purl.org/dc/elements/1.1/';
	const titleElements = opfDoc.getElementsByTagNameNS(dcNamespace, 'title');
	const bookTitle = titleElements[0]?.textContent?.trim() || '';

	// Extract TOC labels before processing chapters
	const tocEntries = await extractTocHierarchy(zip, opfDoc, opfPath, bookTitle);

	// Build lookup maps
	const tocLabels = new Map<string, string>();
	const tocLevels = new Map<string, number>();
	// Map of filePath -> array of { fragmentId, level } for nested TOC entries
	const subchapterFragments = new Map<string, Array<{ fragmentId: string; level: number }>>();

	for (const entry of tocEntries) {
		tocLabels.set(entry.href, entry.label);
		tocLevels.set(entry.href, entry.level);
		const shortPath = entry.href.replace(/^EPUB\//, '');
		if (shortPath !== entry.href) {
			tocLabels.set(shortPath, entry.label);
			tocLevels.set(shortPath, entry.level);
		}

		// Store label keyed by file path without fragment (first entry wins)
		// so chapter title lookup by filePath works even when TOC uses fragment links
		const hashIndex = entry.href.indexOf('#');
		if (hashIndex !== -1) {
			const baseHref = entry.href.substring(0, hashIndex);
			if (!tocLabels.has(baseHref)) {
				tocLabels.set(baseHref, entry.label);
				tocLevels.set(baseHref, entry.level);
			}
			const shortBaseHref = baseHref.replace(/^EPUB\//, '');
			if (shortBaseHref !== baseHref && !tocLabels.has(shortBaseHref)) {
				tocLabels.set(shortBaseHref, entry.label);
				tocLevels.set(shortBaseHref, entry.level);
			}
		}

		// Track subchapter fragments (level > 0 with fragment identifiers)
		if (hashIndex !== -1 && entry.level > 0) {
			const filePart = entry.href.substring(0, hashIndex);
			const fragmentId = entry.href.substring(hashIndex + 1);
			const normalizedPath = filePart.replace(/^EPUB\//, '');

			// Add for both full and normalized paths
			for (const path of [filePart, normalizedPath].filter((p) => p)) {
				if (!subchapterFragments.has(path)) {
					subchapterFragments.set(path, []);
				}
				subchapterFragments.get(path)!.push({ fragmentId, level: entry.level });
			}
		}
	}

	// Extract spine items (reading order)
	const spine = opfDoc.querySelector('spine');
	const itemrefs = spine?.querySelectorAll('itemref') || [];

	// Build manifest map (id -> href)
	const manifest = opfDoc.querySelector('manifest');
	const items = manifest?.querySelectorAll('item') || [];
	const manifestMap = new Map<string, string>();

	for (const item of items) {
		const id = item.getAttribute('id');
		const href = item.getAttribute('href');
		if (id && href) {
			manifestMap.set(id, href);
		}
	}

	// FIRST PASS: Build complete navigation map for all chapters
	const filePathToChapterIndex = new Map<string, number>();
	const chapterFiles: { idref: string; filePath: string; index: number }[] = [];
	let chapterIndex = 0;

	for (const itemref of itemrefs) {
		const idref = itemref.getAttribute('idref');
		if (!idref) continue;

		const href = manifestMap.get(idref);
		if (!href) continue;

		const filePath = resolvePath(opfPath, href);

		// Build navigation map with both full and short paths
		filePathToChapterIndex.set(filePath, chapterIndex);
		const shortPath = filePath.replace(/^EPUB\//, '');
		if (shortPath !== filePath) {
			filePathToChapterIndex.set(shortPath, chapterIndex);
		}

		// Store for second pass
		chapterFiles.push({ idref, filePath, index: chapterIndex });
		chapterIndex++;
	}

	// SECOND PASS: Process chapter content with complete navigation map
	const chapters: Chapter[] = [];

	for (const chapterFile of chapterFiles) {
		const { idref, filePath } = chapterFile;

		const content = await zip.file(filePath)?.async('string');
		if (!content) continue;

		// Parse chapter content
		const chapterDoc = parseXml(content, 'application/xhtml+xml');
		const shortPath = filePath.replace(/^EPUB\//, '');

		// Extract chapter title from HTML headers (H1 first, then H2, then title tag),
		// fall back to TOC label if the book doesn't use heading elements
		const htmlH1 = chapterDoc.querySelector('h1')?.textContent?.trim();
		const htmlH2 = chapterDoc.querySelector('h2')?.textContent?.trim();
		const htmlTitle = chapterDoc.querySelector('title')?.textContent?.trim();
		const tocLabel = tocLabels.get(filePath) || tocLabels.get(shortPath);
		const title = htmlH1 || htmlH2 || htmlTitle || tocLabel || 'Untitled';

		// Process images in chapter content - convert to data URIs
		const chapterDir = filePath.substring(0, filePath.lastIndexOf('/') + 1);
		const images = chapterDoc.querySelectorAll('img');

		for (const img of images) {
			const src = img.getAttribute('src');
			if (src && !src.startsWith('data:') && !src.startsWith('http')) {
				// Resolve relative path
				const imagePath = resolvePath(chapterDir, src);
				const imageDataUri = await extractImageAsDataUri(zip, imagePath);
				if (imageDataUri) {
					img.setAttribute('src', imageDataUri);
				}
			}
		}

		// Process SVG image elements (xlink:href references in SVG)
		const svgNamespace = 'http://www.w3.org/2000/svg';
		const xlinkNamespace = 'http://www.w3.org/1999/xlink';
		const svgImages = chapterDoc.getElementsByTagNameNS(svgNamespace, 'image');

		for (const svgImg of Array.from(svgImages)) {
			const href = svgImg.getAttribute('href') || svgImg.getAttributeNS(xlinkNamespace, 'href');
			if (href && !href.startsWith('data:') && !href.startsWith('http')) {
				const imagePath = resolvePath(chapterDir, href);
				const imageDataUri = await extractImageAsDataUri(zip, imagePath);
				if (imageDataUri) {
					svgImg.setAttribute('href', imageDataUri);
				}
			}
		}

		// Mark subchapter elements (nested TOC entries with fragments) for page breaks
		const chapterFragments =
			subchapterFragments.get(filePath) || subchapterFragments.get(shortPath) || [];
		for (const { fragmentId } of chapterFragments) {
			const element = chapterDoc.getElementById(fragmentId);
			if (element) {
				const existingClass = element.getAttribute('class') || '';
				element.setAttribute(
					'class',
					existingClass ? `${existingClass} subchapter-start` : 'subchapter-start'
				);
			}
		}

		// Serialize the modified HTML back to string
		const serializer = new XMLSerializer();
		let processedContent = serializer.serializeToString(chapterDoc);

		// Strip lang/xml:lang — EPUB-internal lang overrides our .content lang
		// and breaks CSS hyphens which depend on the attribute.
		processedContent = processedContent.replace(/\s+(?:lang|xml:lang)="[^"]*"/gi, '');

		// Transform internal links for navigation
		// Now filePathToChapterIndex contains ALL chapters
		processedContent = transformLinks(processedContent, filePath, filePathToChapterIndex);

		const tocInfo = tocLevels.get(filePath) || tocLevels.get(shortPath);
		const level = tocInfo !== undefined ? tocInfo : 0;

		chapters.push({
			id: idref,
			title,
			content: processedContent,
			filePath,
			level
		});
	}

	return {
		chapters,
		navigationMap: {
			filePathToChapterIndex
		}
	};
}

async function extractImageAsDataUri(zip: JSZip, imagePath: string): Promise<string | null> {
	const imageFile = zip.file(imagePath);
	if (!imageFile) {
		return null;
	}

	const imageData = await imageFile.async('uint8array');
	const extension = imagePath.split('.').pop()?.toLowerCase() || 'jpg';
	const mimeType = getMimeType(extension);
	const base64 = arrayBufferToBase64(imageData);

	return `data:${mimeType};base64,${base64}`;
}
