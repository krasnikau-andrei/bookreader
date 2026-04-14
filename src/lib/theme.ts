export const theme = {
	colors: {
		background: '#1a1a2e',
		'text-primary': '#ffffff',
		'text-secondary': '#a0a0a0',
		accent: '#4a9eff'
	}
};

export function getThemeCSSVariables(): string {
	return Object.entries(theme.colors)
		.map(([key, value]) => {
			const cssKey = key.replace(/-/g, '-');
			return `--color-${cssKey}: ${value};`;
		})
		.join('\n');
}

export function applyTheme(element: HTMLElement): void {
	Object.entries(theme.colors).forEach(([key, value]) => {
		element.style.setProperty(`--color-${key}`, value);
	});
}
