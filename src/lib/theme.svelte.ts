// All theme fields are always initialized with values.
// CSS custom properties derived from this object always exist — never use fallback values like var(--x, default).
interface Theme {
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
		cardBorder: string;
		borderMuted: string;
		cardVignette: string;
		error: string;
		overlay: string;
		progressTrack: string;
		onImage: string;
		surfaceHover: string;
	};
	imageFilter: string;
	fontFamily: string;
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
		readerText: string;
	};
	reader: {
		gapTop: string;
		gapBottom: string;
		gapSides: string;
	};
}

export const theme: Theme = {
	colors: {
		background: '#0f0b0a',
		backgroundSecondary: '#16110e',
		backgroundTertiary: '#1c1512',
		readerBackground: '#000000',
		readerText: '#d6caba',
		'text-primary': '#d6caba',
		'text-secondary': '#85705a',
		accent: '#a08868',
		shadow: 'rgba(0, 0, 0, 0.5)',
		cardBackground: '#1c1512',
		cardBorder: '#2a1f1a',
		borderMuted: '#241a15',
		cardVignette: 'rgba(0, 0, 0, 0.8)',
		error: '#c44a4a',
		overlay: 'rgba(15, 11, 10, 0.95)',
		progressTrack: 'rgba(255, 255, 255, 0.15)',
		onImage: '#ffffff',
		surfaceHover: '#f5f5f5'
	},
	imageFilter: 'sepia(0.15) brightness(0.85)',
	fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
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
		xs: '0.75rem',
		sm: '0.875rem',
		md: '1rem',
		lg: '1.125rem',
		xl: '1.5rem',
		readerText: '1.2rem'
	},
	reader: {
		gapTop: '5px',
		gapBottom: '25px',
		gapSides: '20px'
	}
};
