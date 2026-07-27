import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { error, json } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';

const BROKEN_BOOKS_DIR = join(process.cwd(), 'broken_books');

export async function POST({ request }) {
	// Debug-only endpoint: gated behind PUBLIC_DEBUG_UPLOAD, absent in production.
	if (!env.PUBLIC_DEBUG_UPLOAD) {
		throw error(404, 'Not found');
	}

	const formData = await request.formData();
	const file = formData.get('file');

	if (!file || !(file instanceof File)) {
		throw error(400, 'No file provided');
	}

	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	const filename = `${timestamp}_${file.name}`;
	const filepath = join(BROKEN_BOOKS_DIR, filename);

	await mkdir(BROKEN_BOOKS_DIR, { recursive: true });
	const buffer = Buffer.from(await file.arrayBuffer());
	await writeFile(filepath, buffer);

	return json({ success: true, filename });
}
