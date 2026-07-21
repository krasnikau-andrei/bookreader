import { defineConfig } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

const testDir = defineBddConfig({
	features: 'features/*.feature',
	steps: 'steps/**/*.ts'
});

export default defineConfig({
	testDir,
	webServer: {
		command: 'lsof -ti :4173 | xargs kill -9 2>/dev/null; bun run build && bun run preview',
		port: 4173,
		reuseExistingServer: true
	},
	testMatch: '**/*.{spec,e2e}.{ts,js}',
	timeout: 30000,
	globalTimeout: 300000,
	fullyParallel: true,
	use: {
		video: 'retain-on-failure',
		trace: 'retain-on-failure'
	},
	outputDir: 'test-results'
});
