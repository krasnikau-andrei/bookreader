export async function generateFileHash(buffer: ArrayBuffer): Promise<string> {
	const typedArray = new Uint8Array(buffer);
	const hashBuffer = await crypto.subtle.digest('SHA-256', typedArray);
	const hashArray = new Uint8Array(hashBuffer);
	return Array.from(hashArray)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}
