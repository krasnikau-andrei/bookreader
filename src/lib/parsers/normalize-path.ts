export function normalizePath(path: string): string {
	const parts = path.split('/');
	const result: string[] = [];

	for (const part of parts) {
		if (part === '..') {
			if (result.length > 0 && result[result.length - 1] !== '..') {
				result.pop();
			} else {
				result.push(part);
			}
		} else if (part !== '.' && part !== '') {
			result.push(part);
		} else if (part === '' && result.length === 0 && path.startsWith('/')) {
			continue;
		}
	}

	return result.join('/');
}
