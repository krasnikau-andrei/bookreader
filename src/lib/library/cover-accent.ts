const MIN_CHROMA = 40;
const MIN_BRIGHTNESS = 50;
const MIN_PIXELS = 20;
const TARGET_BRIGHTNESS = 200;

/**
 * Average of the saturated pixels of an RGBA buffer, lifted to a brightness that
 * reads on pure black. Null for grey/white covers, which have no usable tint.
 */
export function accentFromPixels(data: ArrayLike<number>): string | null {
	let r = 0;
	let g = 0;
	let b = 0;
	let n = 0;
	for (let i = 0; i < data.length; i += 4) {
		const max = Math.max(data[i], data[i + 1], data[i + 2]);
		const min = Math.min(data[i], data[i + 1], data[i + 2]);
		if (max - min < MIN_CHROMA || max < MIN_BRIGHTNESS) continue;
		r += data[i];
		g += data[i + 1];
		b += data[i + 2];
		n++;
	}
	if (n < MIN_PIXELS) return null;
	const k = TARGET_BRIGHTNESS / Math.max(r / n, g / n, b / n);
	const channel = (sum: number) => Math.min(255, Math.round((sum / n) * k));
	return `rgb(${channel(r)}, ${channel(g)}, ${channel(b)})`;
}

const SAMPLE_SIZE = 24;

export function accentFromImage(img: HTMLImageElement): string | null {
	const canvas = document.createElement('canvas');
	canvas.width = canvas.height = SAMPLE_SIZE;
	const ctx = canvas.getContext('2d');
	if (!ctx) return null;
	ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
	return accentFromPixels(ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data);
}
