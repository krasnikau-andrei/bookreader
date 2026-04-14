import JSZip from 'jszip';

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
		throw new Error('Invalid EPUB format');
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
		throw new Error('Invalid EPUB format: malformed content.opf');
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
	return basePath + href;
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
