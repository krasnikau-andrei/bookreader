// djb2 hash - simple but effective for non-secure contexts
function djb2Hash(buffer: ArrayBuffer): string {
  const uint8Array = new Uint8Array(buffer);
  let hash = 5381;
  for (let i = 0; i < uint8Array.length; i++) {
    hash = ((hash << 5) + hash) + uint8Array[i];
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export async function generateFileHash(buffer: ArrayBuffer): Promise<string> {
  // Check if crypto.subtle is available (requires secure context: HTTPS or localhost)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const typedArray = new Uint8Array(buffer);
    const hashBuffer = await crypto.subtle.digest('SHA-256', typedArray);
    const hashArray = new Uint8Array(hashBuffer);
    return Array.from(hashArray)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Fallback for non-secure contexts (HTTP on mobile devices)
  // Combines multiple hash approaches to reduce collision probability
  const hash1 = djb2Hash(buffer);
  const hash2 = djb2Hash(
    buffer.slice(0, Math.min(buffer.byteLength, 1024))
  );
  const hash3 = djb2Hash(
    buffer.slice(Math.max(0, buffer.byteLength - 1024))
  );
  return `${hash1}-${hash2}-${hash3}`;
}
