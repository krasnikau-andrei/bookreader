function simpleHash(data: Uint8Array): string {
	let h = 0;
	for (let i = 0; i < data.length; i++) {
		h = (Math.imul(31, h) + data[i]) | 0;
	}
	return Math.abs(h).toString(36);
}

export async function generateFileHash(buffer: ArrayBuffer): Promise<string> {
	const typedArray = new Uint8Array(buffer);
	try {
		const hashBuffer = await crypto.subtle.digest('SHA-256', typedArray);
		const hashArray = new Uint8Array(hashBuffer);
		return Array.from(hashArray)
			.map((b) => b.toString(16).padStart(2, '0'))
			.join('');
	} catch {
		return `${simpleHash(typedArray)}-${Date.now()}`;
	}
}
