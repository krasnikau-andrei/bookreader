import JSZip from 'jszip';
import { transformLinks } from './link-transformer';

export interface ParsedBook {
	title: string;
	author: string;
	cover: string | null;
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
	const parser = new DOMParser();
	const opfDoc = parser.parseFromString(opfContent, 'application/xml');

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

	const title = titleElements[0]?.textContent?.trim() || null;
	const author = authorElements[0]?.textContent?.trim() || null;

	// Extract cover
	const coverPath = extractCoverPath(opfDoc, opfPath);
	const cover = coverPath ? await extractCoverImage(zip, coverPath) : null;

	return {
		title: title || 'Untitled',
		author: author || 'Unknown Author',
		cover
	};
}

function extractOpfPath(containerXml: string): string | null {
	const parser = new DOMParser();
	const doc = parser.parseFromString(containerXml, 'application/xml');

	const rootfile = doc.querySelector('rootfile[media-type="application/oebps-package+xml"]');
	if (rootfile) {
		return rootfile.getAttribute('full-path');
	}

	// Fallback: try to find any rootfile
	const anyRootfile = doc.querySelector('rootfile');
	return anyRootfile?.getAttribute('full-path') || null;
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

function normalizePath(path: string): string {
	// Split path into components
	const parts = path.split('/');
	const result: string[] = [];

	for (const part of parts) {
		if (part === '..') {
			// Go up one directory level
			if (result.length > 0 && result[result.length - 1] !== '..') {
				result.pop();
			} else {
				// Cannot go above root, keep as is
				result.push(part);
			}
		} else if (part !== '.' && part !== '') {
			// Skip current directory (.) and empty parts
			result.push(part);
		} else if (part === '' && result.length === 0 && path.startsWith('/')) {
			// Preserve leading slash for absolute paths
			continue;
		}
	}

	return result.join('/');
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

import type { Chapter, ChapterNavigationMap } from '$lib/types';

export interface ParsedChapters {
	chapters: Chapter[];
	navigationMap: ChapterNavigationMap;
}

async function extractTocLabels(
	zip: JSZip,
	opfDoc: Document,
	opfPath: string
): Promise<Map<string, string>> {
	const labels = new Map<string, string>();
	const parser = new DOMParser();

	// Try EPUB 3 nav.xhtml first (look for item with properties="nav")
	const navItem = opfDoc.querySelector('item[properties~="nav"]');
	if (navItem) {
		const navHref = navItem.getAttribute('href');
		if (navHref) {
			const navPath = resolvePath(opfPath, navHref);
			const navContent = await zip.file(navPath)?.async('string');
			if (navContent) {
				const navDoc = parser.parseFromString(navContent, 'application/xhtml+xml');
				// Look for nav element with epub:type="toc" or id="toc"
				const tocNav = navDoc.querySelector('nav[epub\\:type="toc"], nav#toc');
				if (tocNav) {
					const links = tocNav.querySelectorAll('a');
					for (const link of links) {
						const href = link.getAttribute('href');
						const label = link.textContent?.trim();
						if (href && label) {
							// Resolve href to full path
							const fullPath = resolvePath(navPath, href);
							labels.set(fullPath, label);
							// Also store without EPUB/ prefix for flexible matching
							const shortPath = fullPath.replace(/^EPUB\//, '');
							if (shortPath !== fullPath) {
								labels.set(shortPath, label);
							}
						}
					}
				}
				return labels;
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
				const ncxDoc = parser.parseFromString(ncxContent, 'application/xml');
				const navPoints = ncxDoc.querySelectorAll('navPoint');
				for (const navPoint of navPoints) {
					const content = navPoint.querySelector('content');
					const navLabel = navPoint.querySelector('navLabel text');
					const href = content?.getAttribute('src');
					const label = navLabel?.textContent?.trim();
					if (href && label) {
						const fullPath = resolvePath(ncxPath, href);
						labels.set(fullPath, label);
						const shortPath = fullPath.replace(/^EPUB\//, '');
						if (shortPath !== fullPath) {
							labels.set(shortPath, label);
						}
					}
				}
				return labels;
			}
		}
	}

	return labels;
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
	const parser = new DOMParser();
	const opfDoc = parser.parseFromString(opfContent, 'application/xml');

	// Extract TOC labels before processing chapters
	const tocLabels = await extractTocLabels(zip, opfDoc, opfPath);

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
		const chapterDoc = parser.parseFromString(content, 'application/xhtml+xml');
		const shortPath = filePath.replace(/^EPUB\//, '');
		const extractedHtmlTitle = chapterDoc.querySelector('h1, h2, title')?.textContent?.trim();
		const title =
			tocLabels.get(filePath) || tocLabels.get(shortPath) || extractedHtmlTitle || 'Untitled';

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

		// Serialize the modified HTML back to string
		const serializer = new XMLSerializer();
		let processedContent = serializer.serializeToString(chapterDoc);

		// Transform internal links for navigation
		// Now filePathToChapterIndex contains ALL chapters
		processedContent = transformLinks(processedContent, filePath, filePathToChapterIndex);

		chapters.push({
			id: idref,
			title,
			content: processedContent,
			filePath
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
