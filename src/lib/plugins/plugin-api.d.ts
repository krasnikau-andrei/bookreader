/**
 * The `reader` object a plugin gets inside its sandbox.
 * Plugin authors can point their editor at this file for autocomplete.
 */
import type { ReaderMarker, ReadingPosition, Widget } from './types';

export interface PluginError extends Error {
	/** permission-denied | host-not-allowed | invalid-argument | rate-limited | network-error | ... */
	code: string;
}

export interface PluginEvents {
	/** Where the user is reading. Needs the "position" permission. */
	position: ReadingPosition;
	/** Hosts the user has allowed so far. Sent on start and whenever it changes. */
	hosts: { granted: string[] };
	/** The user edited a field (on blur) or pressed a button in the plugin's UI. */
	ui: { id: string; value?: string };
}

export interface PluginApi {
	on<K extends keyof PluginEvents>(
		event: K,
		handler: (data: PluginEvents[K]) => void | Promise<void>
	): void;
	storage: {
		get(key: string): Promise<unknown>;
		set(key: string, value: unknown): Promise<void>;
	};
	net: {
		/**
		 * Needs the "network" permission and the user's OK for the host.
		 * The first call to a new host fails with code "host-not-allowed" and
		 * shows the user a request; a "hosts" event follows when they answer.
		 */
		fetch(
			url: string,
			init?: { method?: string; headers?: Record<string, string>; body?: string }
		): Promise<{ status: number; body: string }>;
	};
	markers: {
		/** Replaces this plugin's markers. Needs the "markers" permission. */
		set(markers: ReaderMarker[]): Promise<void>;
	};
	ui: {
		/** Replaces this plugin's UI in its card. */
		set(widgets: Widget[]): Promise<void>;
	};
	log(...parts: unknown[]): Promise<void>;
}
