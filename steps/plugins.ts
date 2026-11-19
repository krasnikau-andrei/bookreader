import { expect, type Page } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { createApp, MemoryStore, publicKeyOf } from '../server/src/app.ts';
import { fixturesDir } from './shared.ts';

const { Given, When, Then } = createBdd();

interface ReadingServer {
	url: string;
	host: string;
	store: MemoryStore;
	bookId: string;
	friendKey: string;
}

// One server and one request log per test page, so parallel workers don't share state
const servers = new WeakMap<Page, ReadingServer>();
const watchedRequests = new WeakMap<Page, string[]>();

/** The real Reading Together app on a random localhost port, behind node:http. */
async function startServer(store: MemoryStore): Promise<{ url: string; close: () => void }> {
	const handle = createApp(store);
	const server = http.createServer(async (req, res) => {
		const chunks: Buffer[] = [];
		for await (const chunk of req) chunks.push(chunk as Buffer);
		const body = chunks.length ? Buffer.concat(chunks) : undefined;
		const response = await handle(
			new Request(`http://localhost${req.url}`, {
				method: req.method,
				headers: req.headers as Record<string, string>,
				body: req.method === 'GET' || req.method === 'OPTIONS' ? undefined : body
			})
		);
		res.writeHead(response.status, Object.fromEntries(response.headers));
		res.end(Buffer.from(await response.arrayBuffer()));
	});
	await new Promise<void>((resolve) => server.listen(0, 'localhost', resolve));
	const { port } = server.address() as AddressInfo;
	return { url: `http://localhost:${port}`, close: () => server.close() };
}

function serverFor(page: Page): ReadingServer {
	const server = servers.get(page);
	if (!server) throw new Error('No reading server — add the "Given a reading server…" step');
	return server;
}

/** All text lines a plugin shows, for assertions and for debug output on failure. */
async function pluginTexts(page: Page): Promise<string[]> {
	return page.locator('[data-testid="plugin-text"]').allTextContents();
}

Given(
	'a reading server where {string} reads {string} in chapter {int} at {int}% of its text',
	async ({ page }, name: string, book: string, chapter: number, percent: number) => {
		const store = new MemoryStore();
		const friendSecret = 'f'.repeat(64);
		const friendKey = await publicKeyOf(friendSecret);
		// The reader's book id is the SHA-256 of the file
		const bookId = createHash('sha256')
			.update(readFileSync(path.join(fixturesDir, book)))
			.digest('hex');
		await store.setName(friendKey, name);
		await store.setPosition(friendKey, bookId, {
			chapter: chapter - 1,
			fraction: percent / 100,
			percent: 0.5,
			updatedAt: Date.now()
		});

		const { url, close } = await startServer(store);
		page.on('close', close);
		servers.set(page, { url, host: new URL(url).host, store, bookId, friendKey });
	}
);

Given('I watch for requests to {string}', async ({ page }, host: string) => {
	const seen: string[] = [];
	watchedRequests.set(page, seen);
	page.on('request', (req) => {
		if (new URL(req.url()).hostname === host) seen.push(`${req.method()} ${req.url()}`);
	});
});

When('I open the plugins sheet', async ({ page }) => {
	const content = page.locator('[data-testid="reader-content"]');
	const box = (await content.boundingBox())!;
	await content.click({ position: { x: box.width / 2, y: box.height / 2 } });
	await page.getByRole('button', { name: 'More actions' }).click();
	await page.locator('[data-testid="menu-plugins"]').click();
	await expect(page.locator('[data-testid="plugins-sheet"]')).toBeVisible();
});

When('I close the plugins sheet', async ({ page }) => {
	await page.getByRole('button', { name: 'Закрыть' }).click();
	await expect(page.locator('[data-testid="plugins-sheet"]')).toBeHidden();
});

When('I install the built-in plugin {string}', async ({ page }, name: string) => {
	await page.locator('[data-testid="plugin-available"]', { hasText: name }).click();
	await expect(page.locator('[data-testid="plugin-permissions"]')).toBeVisible();
	await page.locator('[data-testid="plugin-install"]').click();
	await expect(page.locator('[data-testid="plugin-card"]', { hasText: name })).toBeVisible();
});

When('I install the plugin file {string}', async ({ page }, file: string) => {
	await page
		.locator('[data-testid="plugin-file-input"]')
		.setInputFiles(path.join(fixturesDir, file));
	await page.locator('[data-testid="plugin-install"]').click();
	await expect(page.locator('[data-testid="plugin-card"]')).toHaveCount(1);
});

/** Fields report on blur, like a real user leaving the field */
async function fillPluginField(page: Page, id: string, value: string) {
	const field = page.locator(`[data-testid="plugin-field-${id}"]`);
	await field.fill(value);
	await field.evaluate((el: HTMLElement) => el.blur());
}

When('I set the plugin field {string} to the reading server', async ({ page }, id: string) => {
	await fillPluginField(page, id, serverFor(page).url);
});

Then('the plugin asks to reach the reading server', async ({ page }) => {
	const request = page.locator('[data-testid="plugin-host-request"]');
	await expect(request, `texts: ${await pluginTexts(page)}`).toContainText(serverFor(page).host);
});

Then('the plugin asks to reach {string}', async ({ page }, host: string) => {
	await expect(page.locator('[data-testid="plugin-host-request"]')).toContainText(host);
});

When('I allow the plugin to reach the server', async ({ page }) => {
	await page.locator('[data-testid="plugin-host-allow"]').click();
	await expect(page.locator('[data-testid="plugin-host-request"]')).toHaveCount(0);
});

When("I add the key of {string} to the plugin's friends", async ({ page }) => {
	await fillPluginField(page, 'friends', serverFor(page).friendKey);
});

Then('the plugin shows {string}', async ({ page }, text: string) => {
	await expect
		.poll(async () => (await pluginTexts(page)).join(' | '), { timeout: 10000 })
		.toContain(text);
});

Then('my reading position reaches the server', async ({ page }) => {
	const { store, bookId } = serverFor(page);
	const myKey = (await page.locator('[data-testid="plugin-code"]').textContent())!.trim();
	// The plugin waits a few seconds after the last page turn before sending
	await expect
		.poll(async () => store.getPosition(myKey, bookId), {
			timeout: 12000,
			message: `no position for ${myKey}; plugin says: ${await pluginTexts(page)}`
		})
		.toMatchObject({ chapter: 0 });
});

Then(
	'a marker for {string} sits in chapter {int} of the progress bar',
	async ({ page }, name: string, chapter: number) => {
		const marker = page.locator(`[data-testid="progress-marker"][aria-label="${name}"]`);
		await expect(marker).toBeVisible();
		const segment = page.locator('[data-testid="progress-segment"]').nth(chapter - 1);
		const m = (await marker.boundingBox())!;
		const s = (await segment.boundingBox())!;
		const center = m.x + m.width / 2;
		expect(
			center >= s.x && center <= s.x + s.width,
			`marker at x=${center}, chapter ${chapter} spans ${s.x}..${s.x + s.width}`
		).toBe(true);
	}
);

When('I go to chapter {int}', async ({ page }, chapter: number) => {
	const url = new URL(page.url());
	url.searchParams.set('chapter', String(chapter - 1));
	url.searchParams.set('progress', '0');
	await page.goto(url.toString());
	await page.waitForSelector('[data-testid="reader-content"]');
});

Then('a line for {string} is drawn over the text', async ({ page }, name: string) => {
	const line = page.locator('[data-testid="reader-marker"]', { hasText: name });
	await expect(line).toHaveCount(1, { timeout: 10000 });

	// Turn to the line's page, then check it sits right above real text
	const result = await line.evaluate((el: HTMLElement) => {
		const container = el.closest('[data-testid="reader-content"]') as HTMLElement;
		const width = container.clientWidth;
		container.scrollLeft = Math.floor(el.offsetLeft / width) * width;
		const rect = el.getBoundingClientRect();
		const probeX = rect.left + rect.width / 2;
		const probeY = rect.bottom + 12;
		const under = document.elementFromPoint(probeX, probeY);
		return {
			rect: { left: rect.left, top: rect.top, width: rect.width },
			viewport: { width: window.innerWidth, height: window.innerHeight },
			under: under?.closest('.content-inner') ? under.tagName : `outside text: ${under?.tagName}`
		};
	});
	const debug = JSON.stringify(result);
	expect(result.rect.left, debug).toBeGreaterThanOrEqual(0);
	expect(result.rect.left + result.rect.width, debug).toBeLessThanOrEqual(result.viewport.width);
	expect(result.rect.top, debug).toBeGreaterThan(0);
	expect(result.rect.top, debug).toBeLessThan(result.viewport.height);
	expect(result.under, debug).not.toContain('outside text');
});

Then('every escape attempt by the plugin failed', async ({ page }) => {
	await expect.poll(async () => pluginTexts(page), { timeout: 15000 }).toContain('done');
	const lines = (await pluginTexts(page)).filter((t) => t !== 'done');
	// Fail with the full report, so it shows which way out worked
	expect(lines.length, lines.join('\n')).toBeGreaterThan(10);
	expect(
		lines.filter((l) => l.includes('ESCAPED')),
		lines.join('\n')
	).toEqual([]);
	expect(lines.join('\n')).toContain('hostFetch: blocked (host-not-allowed)');
	expect(lines.join('\n')).toContain('markersWithoutPermission: blocked (permission-denied)');
});

Then('no request went to {string}', async ({ page }) => {
	const seen = watchedRequests.get(page) ?? [];
	expect(seen, seen.join('\n')).toEqual([]);
});
