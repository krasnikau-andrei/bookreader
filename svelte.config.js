import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		// Static build for GitHub Pages. 404.html is the SPA fallback:
		// Pages serves it for deep links like /read/<id>, and the client router takes over.
		adapter: adapter({ fallback: '404.html' }),
		paths: {
			// GitHub Pages serves the site from /<repo-name>. CI sets BASE_PATH; local dev stays at /.
			base: process.env.BASE_PATH ?? ''
		}
	}
};

export default config;
