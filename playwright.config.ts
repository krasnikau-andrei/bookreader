import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'bun run build && bun run preview',
		port: 4173,
		reuseExistingServer: true
	},
	testMatch: '**/*.e2e.{ts,js}',
	use: {
		video: 'on',
		trace: 'on'
	},
	outputDir: 'test-results'
});
