import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: '.',
	testMatch: 'e2e/check-broken-books.spec.ts',
	webServer: {
		command: 'bun run build && bun run preview',
		port: 4173,
		reuseExistingServer: true
	},
	use: {
		baseURL: 'http://localhost:4173'
	},
	projects: [
		{ name: 'chromium', use: { browserName: 'chromium' } },
		{ name: 'firefox', use: { browserName: 'firefox' } },
		{ name: 'webkit', use: { browserName: 'webkit' } }
	]
});
