import type { Preview } from '@storybook/svelte';

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
			body.style.backgroundColor = '#1a1a2e';
			body.style.color = '#ffffff';
			body.style.setProperty('--color-background', '#1a1a2e');
			body.style.setProperty('--color-text-primary', '#ffffff');
			body.style.setProperty('--color-text-secondary', '#a0a0a0');
			body.style.setProperty('--color-accent', '#4a9eff');
			return story();
		}
	]
};

export default preview;
