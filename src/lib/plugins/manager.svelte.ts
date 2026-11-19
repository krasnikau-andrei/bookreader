import { deletePlugin, getPluginData, getPlugins, savePlugin, setPluginData } from '$lib/storage';
import { createHostApi } from './host-api';
import { parsePluginSource } from './manifest';
import { startSandbox, type Sandbox } from './sandbox';
import type { PluginManifest, PluginRecord, ReaderMarker, ReadingPosition, Widget } from './types';
import { BUILTIN_PLUGINS } from './builtin';

/** What a running plugin currently shows: its UI, its markers, and what it is waiting for. */
export interface PluginRuntimeState {
	widgets: Widget[];
	markers: ReaderMarker[];
	/** Hosts the plugin tried to reach that the user hasn't answered yet */
	pendingHosts: string[];
	error: string | null;
}

export interface ParsedPlugin {
	manifest: PluginManifest;
	code: string;
}

/** What the plugins UI needs from the manager — lets stories pass a fake */
export type PluginsController = Pick<
	PluginManager,
	| 'plugins'
	| 'runtime'
	| 'available'
	| 'install'
	| 'uninstall'
	| 'setEnabled'
	| 'allowHost'
	| 'denyHost'
	| 'revokeHost'
	| 'uiEvent'
>;

const emptyRuntime = (): PluginRuntimeState => ({
	widgets: [],
	markers: [],
	pendingHosts: [],
	error: null
});

/**
 * Owns installed plugins for one open book: loads them, runs the enabled ones
 * in sandboxes, and keeps what they show in reactive state for the UI.
 */
export class PluginManager {
	plugins = $state<PluginRecord[]>([]);
	runtime = $state<Record<string, PluginRuntimeState>>({});

	/** Every marker from every running plugin that may draw markers */
	markers = $derived(
		this.plugins
			.filter((p) => p.enabled && p.manifest.permissions.includes('markers'))
			// Prefix ids so two plugins can't collide
			.flatMap((p) =>
				(this.runtime[p.id]?.markers ?? []).map((m) => ({ ...m, id: `${p.id}/${m.id}` }))
			)
	);

	/** Built-in plugins the user hasn't installed yet */
	available = $derived(
		BUILTIN_PLUGINS.map((source) => parsePluginSource(source)).filter(
			(b) => !this.plugins.some((p) => p.id === b.manifest.id)
		)
	);

	// Not state: never rendered, only used to reach running sandboxes
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	#sandboxes = new Map<string, Sandbox>();
	#position: ReadingPosition | null = null;

	async load() {
		this.plugins = await getPlugins();
		for (const plugin of this.plugins) if (plugin.enabled) this.#start(plugin);
	}

	destroy() {
		for (const sandbox of this.#sandboxes.values()) sandbox.stop();
		this.#sandboxes.clear();
	}

	/** Where the user is reading now. Only plugins with the position permission hear it. */
	setPosition(position: ReadingPosition) {
		const prev = this.#position;
		if (
			prev &&
			prev.bookId === position.bookId &&
			prev.chapter === position.chapter &&
			Math.abs(prev.fraction - position.fraction) < 1e-6
		) {
			return;
		}
		this.#position = position;
		for (const plugin of this.plugins) {
			if (plugin.manifest.permissions.includes('position')) {
				this.#sandboxes.get(plugin.id)?.emit('position', position);
			}
		}
	}

	/** Install after the user confirmed the manifest's permissions. Replaces an older version. */
	async install(parsed: ParsedPlugin) {
		// The UI keeps the parsed plugin in $state; IndexedDB can't store its proxies
		const { manifest, code } = $state.snapshot(parsed) as ParsedPlugin;
		const existing = this.plugins.find((p) => p.id === manifest.id);
		const record: PluginRecord = {
			id: manifest.id,
			manifest,
			code,
			enabled: true,
			// A new version keeps hosts the user already allowed
			grantedHosts: existing ? [...existing.grantedHosts] : [],
			// eslint-disable-next-line svelte/prefer-svelte-reactivity -- a stored timestamp, not state
			installedAt: new Date()
		};
		this.#stop(manifest.id);
		await savePlugin(record);
		this.plugins = [...this.plugins.filter((p) => p.id !== manifest.id), record];
		this.#start(record);
	}

	async uninstall(id: string) {
		this.#stop(id);
		await deletePlugin(id);
		this.plugins = this.plugins.filter((p) => p.id !== id);
		delete this.runtime[id];
	}

	async setEnabled(id: string, enabled: boolean) {
		await this.#update(id, (p) => (p.enabled = enabled));
		const plugin = this.plugins.find((p) => p.id === id)!;
		if (enabled) this.#start(plugin);
		else this.#stop(id);
	}

	async allowHost(id: string, host: string) {
		await this.#update(id, (p) => {
			if (!p.grantedHosts.includes(host)) p.grantedHosts.push(host);
		});
		this.#resolvePending(id, host);
	}

	denyHost(id: string, host: string) {
		this.#resolvePending(id, host);
	}

	async revokeHost(id: string, host: string) {
		await this.#update(id, (p) => (p.grantedHosts = p.grantedHosts.filter((h) => h !== host)));
		this.#emitHosts(id);
	}

	/** The user changed a field or pressed a button in the plugin's UI */
	uiEvent(id: string, widgetId: string, value?: string) {
		this.#sandboxes.get(id)?.emit('ui', { id: widgetId, value });
	}

	#resolvePending(id: string, host: string) {
		const rt = this.runtime[id];
		if (rt) rt.pendingHosts = rt.pendingHosts.filter((h) => h !== host);
		this.#emitHosts(id);
	}

	#emitHosts(id: string) {
		const plugin = this.plugins.find((p) => p.id === id);
		if (plugin) this.#sandboxes.get(id)?.emit('hosts', { granted: [...plugin.grantedHosts] });
	}

	async #update(id: string, change: (p: PluginRecord) => void) {
		const plugin = this.plugins.find((p) => p.id === id);
		if (!plugin) return;
		change(plugin);
		await savePlugin($state.snapshot(plugin) as PluginRecord);
	}

	#start(plugin: PluginRecord) {
		if (this.#sandboxes.has(plugin.id)) return;
		const id = plugin.id;
		this.runtime[id] = emptyRuntime();
		const rt = () => this.runtime[id];

		const call = createHostApi({
			manifest: plugin.manifest,
			grantedHosts: () => this.plugins.find((p) => p.id === id)?.grantedHosts ?? [],
			requestHost: (host) => {
				if (!rt().pendingHosts.includes(host)) rt().pendingHosts.push(host);
			},
			storage: {
				get: (key) => getPluginData(id, key),
				set: (key, value) => setPluginData(id, key, value)
			},
			fetch: (...args) => fetch(...args),
			setMarkers: (markers) => (rt().markers = markers),
			setUi: (widgets) => (rt().widgets = widgets),
			log: (level, message) => {
				if (level === 'error') {
					rt().error = message;
					console.warn(`[PLUGIN ${id}]`, message);
				} else {
					console.info(`[PLUGIN ${id}]`, message);
				}
			}
		});

		const sandbox = startSandbox({
			code: plugin.code,
			call,
			onCrash: (message) => (rt().error = message)
		});
		this.#sandboxes.set(id, sandbox);

		sandbox.emit('hosts', { granted: [...plugin.grantedHosts] });
		if (this.#position && plugin.manifest.permissions.includes('position')) {
			sandbox.emit('position', this.#position);
		}
	}

	#stop(id: string) {
		this.#sandboxes.get(id)?.stop();
		this.#sandboxes.delete(id);
		if (this.runtime[id]) this.runtime[id] = emptyRuntime();
	}
}
