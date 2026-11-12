import type { Preview } from '@storybook/svelte';
import { theme } from '../src/lib/theme.svelte';

const preview: Preview = {
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i
			}
		},
		viewport: {
			viewports: {
				mobile: {
					name: 'Mobile',
					styles: {
						width: '375px',
						height: '667px'
					}
				},
				tablet: {
					name: 'Tablet',
					styles: {
						width: '768px',
						height: '1024px'
					}
				}
			},
			defaultViewport: 'mobile'
		}
	},
	decorators: [
		(story) => {
			const body = document.body;
			body.style.backgroundColor = theme.colors.background;
			body.style.color = theme.colors['text-primary'];
			Object.entries(theme.colors).forEach(([key, value]) => {
				body.style.setProperty(`--color-${key}`, value);
			});
			Object.entries(theme.padding).forEach(([key, value]) => {
				body.style.setProperty(`--padding-${key}`, value);
			});
			Object.entries(theme.radius).forEach(([key, value]) => {
				body.style.setProperty(`--radius-${key}`, value);
			});
			Object.entries(theme.fontSize).forEach(([key, value]) => {
				body.style.setProperty(`--font-size-${key}`, value);
			});
			body.style.setProperty('--cover-filter', theme.coverFilter);
			return story();
		}
	]
};

export default preview;
