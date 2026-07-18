import { defineConfig } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

const testDir = defineBddConfig({
	features: 'features/*.feature',
	steps: 'steps/**/*.ts'
});

export default defineConfig({
	testDir,
	webServer: {
		command: 'bun run build && bun run preview',
		port: 4173,
		reuseExistingServer: true
	},
	testMatch: '**/*.{spec,e2e}.{ts,js}',
	use: {
		video: 'retain-on-failure',
		trace: 'retain-on-failure'
	},
	outputDir: 'test-results'
});
