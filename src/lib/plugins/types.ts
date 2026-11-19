/**
 * What a plugin may ask for. Shown to the user before install.
 * - position: read which book is open and where the reader is in it
 * - markers:  draw other readers' positions on the progress bar and in the text
 * - network:  talk to servers — each host still needs the user's OK at runtime
 */
export type Permission = 'position' | 'markers' | 'network';

export const PERMISSIONS: readonly Permission[] = ['position', 'markers', 'network'];

export interface PluginManifest {
	id: string;
	name: string;
	version: string;
	description: string;
	permissions: Permission[];
}

/** An installed plugin as stored in IndexedDB. */
export interface PluginRecord {
	id: string;
	manifest: PluginManifest;
	code: string;
	enabled: boolean;
	/** Hosts the user allowed this plugin to reach, e.g. "sync.example.com" */
	grantedHosts: string[];
	installedAt: Date;
}

/** Plugin UI is data, drawn by the reader — plugins never get to render HTML. */
export type Widget =
	| { type: 'text'; text: string; tone?: 'normal' | 'muted' | 'error' }
	| {
			type: 'field';
			id: string;
			label: string;
			value: string;
			placeholder?: string;
			multiline?: boolean;
	  }
	| { type: 'code'; label: string; text: string }
	| { type: 'button'; id: string; label: string };

/** Another reader's position in the open book. */
export interface ReaderMarker {
	id: string;
	label: string;
	/** 0..359, the reader turns it into a theme-consistent colour */
	hue: number;
	chapter: number;
	/** How far into the chapter's text, 0..1 — see text-position.ts */
	fraction: number;
}

/** Where the user is right now, as sent to plugins with the position permission. */
export interface ReadingPosition {
	bookId: string;
	chapter: number;
	fraction: number;
	/** Whole-book progress, 0..1 */
	percent: number;
}
