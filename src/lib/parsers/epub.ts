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

	// Parse container.xml to find content.opf path
	const opfPath = extractOpfPath(containerXml);
	if (!opfPath) {
		throw new Error('Invalid EPUB format: cannot find content.opf');
	}

	// Read content.opf
	const opfContent = await zip.file(opfPath)?.async('string');
	if (!opfContent) {
		throw new Error('Invalid EPUB format: missing content.opf');
	}

	// Extract metadata
	const title = extractMetadata(opfContent, 'title');
	const author = extractMetadata(opfContent, 'creator');

	// Extract cover
	const coverPath = extractCoverPath(opfContent, opfPath);
	const cover = coverPath ? await extractCoverImage(zip, coverPath) : null;

	return {
		title: title || 'Untitled',
		author: author || 'Unknown Author',
		cover
	};
}

function extractOpfPath(containerXml: string): string | null {
	const match = containerXml.match(/full-path="([^"]+)"/);
	return match ? match[1] : null;
}

function extractMetadata(opfContent: string, field: string): string | null {
	// Match dc:title or dc:creator with optional namespace prefix
	const regex = new RegExp(`<dc:${field}[^>]*>([^<]+)</dc:${field}>`, 'i');
	const match = opfContent.match(regex);
	return match ? match[1].trim() : null;
}

function extractCoverPath(opfContent: string, opfPath: string): string | null {
	// First, try to find cover by meta tag reference
	const coverMetaMatch = opfContent.match(/<meta[^>]*name="cover"[^>]*content="([^"]+)"/i);
	if (coverMetaMatch) {
		const coverId = coverMetaMatch[1];
		const itemMatch = opfContent.match(
			new RegExp(`<item[^>]*id="${coverId}"[^>]*href="([^"]+)"`, 'i')
		);
		if (itemMatch) {
			return resolvePath(opfPath, itemMatch[1]);
		}
	}

	// Try to find by properties="cover-image"
	const coverItemMatch = opfContent.match(/<item[^>]*properties="cover-image"[^>]*href="([^"]+)"/i);
	if (coverItemMatch) {
		return resolvePath(opfPath, coverItemMatch[1]);
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
