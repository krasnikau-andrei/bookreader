export interface Theme {
	colors: {
		background: string;
		backgroundSecondary: string;
		backgroundTertiary: string;
		readerBackground: string;
		readerText: string;
		'text-primary': string;
		'text-secondary': string;
		accent: string;
		shadow: string;
		cardBackground: string;
		error: string;
		overlay: string;
	};
	padding: {
		xs: string;
		sm: string;
		md: string;
		lg: string;
		xl: string;
	};
	radius: {
		sm: string;
		md: string;
		lg: string;
		xl: string;
	};
	fontSize: {
		xs: string;
		sm: string;
		md: string;
		lg: string;
		xl: string;
	};
}

export const theme: Theme = {
	colors: {
		background: '#1a1a2e',
		backgroundSecondary: '#2a2a4a',
		backgroundTertiary: '#1a1a3a',
		readerBackground: '#000000',
		readerText: '#ffffff',
		'text-primary': '#ffffff',
		'text-secondary': '#a0a0a0',
		accent: '#4a9eff',
		shadow: 'rgba(0, 0, 0, 0.3)',
		cardBackground: 'rgba(255, 255, 255, 0.05)',
		error: '#ff4444',
		overlay: 'rgba(40, 40, 60, 0.95)'
	},
	padding: {
		xs: '4px',
		sm: '8px',
		md: '16px',
		lg: '24px',
		xl: '32px'
	},
	radius: {
		sm: '4px',
		md: '8px',
		lg: '12px',
		xl: '16px'
	},
	fontSize: {
		xs: '0.625rem',
		sm: '0.75rem',
		md: '0.875rem',
		lg: '1rem',
		xl: '1.25rem'
	}
};
