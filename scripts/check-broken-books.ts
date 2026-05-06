import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

// Polyfill browser APIs for Bun's standalone runtime
// (DOMParser, XMLSerializer only available in browser/jsdom environments)
if (
	typeof globalThis.DOMParser === 'undefined' ||
	typeof globalThis.XMLSerializer === 'undefined'
) {
	const dom = new JSDOM();
	if (typeof globalThis.DOMParser === 'undefined') {
		globalThis.DOMParser = dom.window.DOMParser;
	}
	if (typeof globalThis.XMLSerializer === 'undefined') {
		globalThis.XMLSerializer = dom.window.XMLSerializer;
	}
}

import { parseEpub, parseEpubChapters } from '../src/lib/parsers/epub.js';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

async function main() {
	const scriptsDir = import.meta.dirname;
	const booksDir = path.resolve(scriptsDir, '..', 'broken_books');

	// Handle missing or empty directory gracefully
	if (!fs.existsSync(booksDir)) {
		console.log('broken_books/ directory not found');
		process.exit(0);
	}

	const files = fs
		.readdirSync(booksDir)
		.filter((f) => f.endsWith('.epub'))
		.sort();

	if (files.length === 0) {
		console.log('No .epub files found in broken_books/');
		process.exit(0);
	}

	let passed = 0;

	for (const file of files) {
		const filePath = path.join(booksDir, file);
		try {
			const fileBuffer = fs.readFileSync(filePath);
			const arrayBuffer = fileBuffer.buffer.slice(
				fileBuffer.byteOffset,
				fileBuffer.byteOffset + fileBuffer.byteLength
			);

			await parseEpub(arrayBuffer);
			await parseEpubChapters(arrayBuffer);

			console.log(`${GREEN}\u2713 ${file}${RESET}`);
			passed++;
		} catch (err) {
			const error = err as Error;
			console.error(`${RED}\u2717 ${file} \u2192 ERROR: ${error.message}${RESET}`);
			console.error(error.stack);
			process.exit(1);
		}
	}

	console.log(`\n${passed}/${files.length} books OK`);
}

main().catch((err) => {
	console.error(`${RED}Unexpected error:${RESET}`, err);
	process.exit(1);
});
