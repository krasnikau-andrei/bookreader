import type { PluginRecord, Widget } from '$lib/plugins/types';
import type { PluginRuntimeState, PluginsController } from '$lib/plugins/manager.svelte';
import { parsePluginSource } from '$lib/plugins/manifest';
import { BUILTIN_PLUGINS } from '$lib/plugins/builtin';

export const togetherWidgets: Widget[] = [
	{
		type: 'text',
		tone: 'muted',
		text: 'Друзья с той же книгой видят тебя полоской на шкале и линией в тексте. А ты — их.'
	},
	{
		type: 'field',
		id: 'server',
		label: 'Сервер',
		value: 'https://reading.example.com',
		placeholder: 'https://reading.example.com'
	},
	{ type: 'field', id: 'name', label: 'Твоё имя', value: 'Андрей', placeholder: '' },
	{
		type: 'code',
		label: 'Твой ключ — отправь его другу',
		text: '3f9a1c0be47d22e18a6c5b90d1f04e7a'
	},
	{
		type: 'field',
		id: 'friends',
		label: 'Ключи друзей, по одному в строке',
		value: 'c19e0a7d3b5f4e2a9c8d7b6a5f4e3d2c',
		multiline: true
	},
	{ type: 'text', text: 'Аня — глава 4, 37% книги' },
	{ type: 'text', tone: 'error', text: 'Сервер недоступен: Load failed' }
];

const together = parsePluginSource(BUILTIN_PLUGINS[0]);

export const togetherRecord: PluginRecord = {
	id: together.manifest.id,
	manifest: together.manifest,
	code: together.code,
	enabled: true,
	grantedHosts: ['reading.example.com'],
	installedAt: new Date('2026-11-01')
};

export const togetherRuntime: PluginRuntimeState = {
	widgets: togetherWidgets,
	markers: [],
	pendingHosts: [],
	error: null
};

/** A stand-in for PluginManager: same shape, no sandboxes, logs instead of acting */
export function fakeController(
	plugins: PluginRecord[],
	runtime: Record<string, PluginRuntimeState>
): PluginsController {
	const log =
		(name: string) =>
		async (...args: unknown[]) =>
			console.log(`[story] ${name}`, ...args);
	return {
		plugins,
		runtime,
		available: BUILTIN_PLUGINS.map((s) => parsePluginSource(s)).filter(
			(b) => !plugins.some((p) => p.id === b.manifest.id)
		),
		install: log('install'),
		uninstall: log('uninstall'),
		setEnabled: log('setEnabled'),
		allowHost: log('allowHost'),
		denyHost: log('denyHost'),
		revokeHost: log('revokeHost'),
		uiEvent: log('uiEvent') as unknown as PluginsController['uiEvent']
	};
}
