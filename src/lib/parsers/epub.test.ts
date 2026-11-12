import { describe, test, expect } from 'vitest';
import { parseEpub } from './epub';

describe('EPUB Parser', () => {
	test('extracts title, author, and cover from valid EPUB', async () => {
		// Create a minimal valid EPUB as ArrayBuffer
		const epubBuffer = await createMinimalEpub({
			title: 'Test Book',
			author: 'Test Author',
			cover: createTestImage()
		});

		const result = await parseEpub(epubBuffer);

		expect(result.title).toBe('Test Book');
		expect(result.author).toBe('Test Author');
		expect(result.cover).toBeTruthy();
		expect(result.cover?.startsWith('data:image')).toBe(true);
	});

	test('extracts genres from dc:subject and dc:type', async () => {
		const epubBuffer = await createMinimalEpub({
			title: 'Genre Book',
			author: 'Anonymous',
			extraMetadata: '<dc:subject>sf_epic</dc:subject><dc:subject /><dc:type>Образование</dc:type>'
		});

		const result = await parseEpub(epubBuffer);

		expect(result.subjects, `subjects: ${JSON.stringify(result.subjects)}`).toEqual([
			'sf_epic',
			'Образование'
		]);
	});

	test('handles EPUB without cover', async () => {
		const epubBuffer = await createMinimalEpub({
			title: 'Book Without Cover',
			author: 'Anonymous'
		});

		const result = await parseEpub(epubBuffer);

		expect(result.title).toBe('Book Without Cover');
		expect(result.author).toBe('Anonymous');
		expect(result.cover).toBeNull();
	});

	test('throws error for corrupted EPUB', async () => {
		const corruptedBuffer = new Uint8Array([1, 2, 3, 4]).buffer;

		await expect(parseEpub(corruptedBuffer)).rejects.toThrow();
	});

	test('throws error for non-EPUB file format', async () => {
		const pdfBuffer = createFakePdfBuffer();

		await expect(parseEpub(pdfBuffer)).rejects.toThrow(/Invalid EPUB format/);
	});

	test('accepts mimetype with trailing newline', async () => {
		// Some converters write CRLF after the mimetype string
		const epubBuffer = await createMinimalEpub(
			{
				title: 'CRLF Mimetype',
				author: 'Anonymous'
			},
			'application/epub+zip\r\n'
		);

		const result = await parseEpub(epubBuffer);

		expect(result.title).toBe('CRLF Mimetype');
	});

	test('throws error when mimetype is missing', async () => {
		const epubBuffer = await createMinimalEpub(
			{
				title: 'Missing Mimetype',
				author: 'Anonymous'
			},
			'' // Empty mimetype
		);

		await expect(parseEpub(epubBuffer)).rejects.toThrow(/Invalid EPUB format/);
	});

	test('throws error when mimetype is wrong', async () => {
		const epubBuffer = await createMinimalEpub(
			{
				title: 'Wrong Mimetype',
				author: 'Anonymous'
			},
			'application/pdf'
		);

		await expect(parseEpub(epubBuffer)).rejects.toThrow(
			/mimetype is "application\/pdf" instead of "application\/epub\+zip"/
		);
	});

	test('uses default language when dc:language is missing', async () => {
		const epubBuffer = await createMinimalEpubWithoutLanguage({
			title: 'No Language Book',
			author: 'Anonymous'
		});

		const result = await parseEpub(epubBuffer);

		expect(result.language).toBe('en');
	});

	test('uses Untitled when dc:title is missing', async () => {
		const epubBuffer = await createMinimalEpubWithoutTitle({
			author: 'Author Only'
		});

		const result = await parseEpub(epubBuffer);

		expect(result.title).toBe('Untitled');
	});

	test('uses Unknown Author when dc:creator is missing', async () => {
		const epubBuffer = await createMinimalEpubWithoutAuthor({
			title: 'Title Only'
		});

		const result = await parseEpub(epubBuffer);

		expect(result.author).toBe('Unknown Author');
	});

	test('extracts description when present', async () => {
		const epubBuffer = await createMinimalEpubWithDescription(
			'Book With Description',
			'An interesting book'
		);

		const result = await parseEpub(epubBuffer);

		expect(result.description).toBe('An interesting book');
	});

	test('returns null description when dc:description is missing', async () => {
		const epubBuffer = await createMinimalEpub({
			title: 'No Description',
			author: 'Anonymous'
		});

		const result = await parseEpub(epubBuffer);

		expect(result.description).toBeNull();
	});

	test('throws error for EPUB with missing container.xml', async () => {
		const JSZip = (await import('jszip')).default;
		const zip = new JSZip();

		// Add mimetype but no container.xml
		zip.file('mimetype', 'application/epub+zip');

		const buffer = await zip.generateAsync({ type: 'arraybuffer' });

		await expect(parseEpub(buffer)).rejects.toThrow(/missing container\.xml/);
	});

	test('throws error for EPUB with missing content.opf', async () => {
		const JSZip = (await import('jszip')).default;
		const zip = new JSZip();

		zip.file('mimetype', 'application/epub+zip');

		// container.xml exists but rootfile is missing
		zip.file(
			'META-INF/container.xml',
			`<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
	<rootfiles>
	</rootfiles>
</container>`
		);

		const buffer = await zip.generateAsync({ type: 'arraybuffer' });

		await expect(parseEpub(buffer)).rejects.toThrow(/cannot find content\.opf/);
	});
});

// Test helpers
async function createMinimalEpub(
	metadata: {
		title: string;
		author: string;
		cover?: Uint8Array;
		extraMetadata?: string;
	},
	mimetypeContent: string = 'application/epub+zip'
): Promise<ArrayBuffer> {
	const JSZip = (await import('jszip')).default;
	const zip = new JSZip();

	// mimetype file
	zip.file('mimetype', mimetypeContent);

	// container.xml
	zip.file(
		'META-INF/container.xml',
		`<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
	<rootfiles>
		<rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>
	</rootfiles>
</container>`
	);

	// content.opf
	const coverManifest = metadata.cover
		? '<item id="cover" href="cover.jpg" media-type="image/jpeg" properties="cover-image"/>'
		: '';
	const coverMeta = metadata.cover ? '<meta name="cover" content="cover"/>' : '';

	zip.file(
		'content.opf',
		`<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" xmlns="http://www.idpf.org/2007/opf">
	<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
		<dc:title>${metadata.title}</dc:title>
		<dc:creator>${metadata.author}</dc:creator>
		<dc:identifier id="bookid">test-id</dc:identifier>
		<dc:language>en</dc:language>
		${coverMeta}
		${metadata.extraMetadata ?? ''}
	</metadata>
	<manifest>
		<item id="toc" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
		${coverManifest}
	</manifest>
	<spine toc="toc">
		<itemref idref="chapter1"/>
	</spine>
</package>`
	);

	// Add cover image if provided
	if (metadata.cover) {
		zip.file('cover.jpg', metadata.cover);
	}

	return await zip.generateAsync({ type: 'arraybuffer' });
}

async function createMinimalEpubWithoutLanguage(
	metadata: {
		title: string;
		author: string;
	},
	mimetypeContent: string = 'application/epub+zip'
): Promise<ArrayBuffer> {
	const JSZip = (await import('jszip')).default;
	const zip = new JSZip();

	zip.file('mimetype', mimetypeContent);

	zip.file(
		'META-INF/container.xml',
		`<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
	<rootfiles>
		<rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>
	</rootfiles>
</container>`
	);

	// content.opf WITHOUT dc:language
	zip.file(
		'content.opf',
		`<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" xmlns="http://www.idpf.org/2007/opf">
	<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
		<dc:title>${metadata.title}</dc:title>
		<dc:creator>${metadata.author}</dc:creator>
		<dc:identifier id="bookid">test-id</dc:identifier>
	</metadata>
	<manifest>
		<item id="toc" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
	</manifest>
	<spine toc="toc">
		<itemref idref="chapter1"/>
	</spine>
</package>`
	);

	return await zip.generateAsync({ type: 'arraybuffer' });
}

async function createMinimalEpubWithoutTitle(
	metadata: {
		author: string;
	},
	mimetypeContent: string = 'application/epub+zip'
): Promise<ArrayBuffer> {
	const JSZip = (await import('jszip')).default;
	const zip = new JSZip();

	zip.file('mimetype', mimetypeContent);

	zip.file(
		'META-INF/container.xml',
		`<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
	<rootfiles>
		<rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>
	</rootfiles>
</container>`
	);

	// content.opf WITHOUT dc:title
	zip.file(
		'content.opf',
		`<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" xmlns="http://www.idpf.org/2007/opf">
	<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
		<dc:creator>${metadata.author}</dc:creator>
		<dc:identifier id="bookid">test-id</dc:identifier>
		<dc:language>en</dc:language>
	</metadata>
	<manifest>
		<item id="toc" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
	</manifest>
	<spine toc="toc">
		<itemref idref="chapter1"/>
	</spine>
</package>`
	);

	return await zip.generateAsync({ type: 'arraybuffer' });
}

async function createMinimalEpubWithoutAuthor(
	metadata: {
		title: string;
	},
	mimetypeContent: string = 'application/epub+zip'
): Promise<ArrayBuffer> {
	const JSZip = (await import('jszip')).default;
	const zip = new JSZip();

	zip.file('mimetype', mimetypeContent);

	zip.file(
		'META-INF/container.xml',
		`<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
	<rootfiles>
		<rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>
	</rootfiles>
</container>`
	);

	// content.opf WITHOUT dc:creator
	zip.file(
		'content.opf',
		`<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" xmlns="http://www.idpf.org/2007/opf">
	<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
		<dc:title>${metadata.title}</dc:title>
		<dc:identifier id="bookid">test-id</dc:identifier>
		<dc:language>en</dc:language>
	</metadata>
	<manifest>
		<item id="toc" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
	</manifest>
	<spine toc="toc">
		<itemref idref="chapter1"/>
	</spine>
</package>`
	);

	return await zip.generateAsync({ type: 'arraybuffer' });
}

async function createMinimalEpubWithDescription(
	title: string,
	description: string,
	mimetypeContent: string = 'application/epub+zip'
): Promise<ArrayBuffer> {
	const JSZip = (await import('jszip')).default;
	const zip = new JSZip();

	zip.file('mimetype', mimetypeContent);

	zip.file(
		'META-INF/container.xml',
		`<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
	<rootfiles>
		<rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>
	</rootfiles>
</container>`
	);

	zip.file(
		'content.opf',
		`<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" xmlns="http://www.idpf.org/2007/opf">
	<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
		<dc:title>${title}</dc:title>
		<dc:creator>Test Author</dc:creator>
		<dc:description>${description}</dc:description>
		<dc:identifier id="bookid">test-id</dc:identifier>
		<dc:language>en</dc:language>
	</metadata>
	<manifest>
		<item id="toc" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
	</manifest>
	<spine toc="toc">
		<itemref idref="chapter1"/>
	</spine>
</package>`
	);

	return await zip.generateAsync({ type: 'arraybuffer' });
}

function createTestImage(): Uint8Array {
	// Minimal 1x1 JPEG image data
	return new Uint8Array([
		0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
		0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
		0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
		0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
		0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27,
		0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
		0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
		0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
		0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xc4, 0x00, 0xb5, 0x10, 0x00, 0x02, 0x01, 0x03,
		0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7d, 0x01, 0x02, 0x03, 0x00,
		0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06, 0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32,
		0x81, 0x91, 0xa1, 0x08, 0x23, 0x42, 0xb1, 0xc1, 0x15, 0x52, 0xd1, 0xf0, 0x24, 0x33, 0x62, 0x72,
		0x82, 0x09, 0x0a, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2a, 0x34, 0x35,
		0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4a, 0x53, 0x54, 0x55,
		0x56, 0x57, 0x58, 0x59, 0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x73, 0x74, 0x75,
		0x76, 0x77, 0x78, 0x79, 0x7a, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x92, 0x93, 0x94,
		0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3, 0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2,
		0xb3, 0xb4, 0xb5, 0xb6, 0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9,
		0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe1, 0xe2, 0xe3, 0xe4, 0xe5, 0xe6,
		0xe7, 0xe8, 0xe9, 0xea, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa, 0xff, 0xda,
		0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0xfb, 0xbe, 0xb8, 0x58, 0xf1, 0x8b, 0xe1, 0xff,
		0xd9
	]);
}

function createFakePdfBuffer(): ArrayBuffer {
	// Fake PDF header to simulate wrong format
	const encoder = new TextEncoder();
	return encoder.encode('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\n').buffer;
}
