import { Database } from 'bun:sqlite';
import type { Position, Store } from './app';

export class SqliteStore implements Store {
	#db: Database;

	constructor(path: string) {
		this.#db = new Database(path, { create: true });
		this.#db.exec('PRAGMA journal_mode = WAL');
		this.#db.exec(`
			CREATE TABLE IF NOT EXISTS profiles (
				pub TEXT PRIMARY KEY,
				name TEXT NOT NULL
			);
			CREATE TABLE IF NOT EXISTS positions (
				pub TEXT NOT NULL,
				book_id TEXT NOT NULL,
				chapter INTEGER NOT NULL,
				fraction REAL NOT NULL,
				percent REAL NOT NULL,
				updated_at INTEGER NOT NULL,
				PRIMARY KEY (pub, book_id)
			);
		`);
	}

	async getName(pub: string) {
		const row = this.#db.query('SELECT name FROM profiles WHERE pub = ?').get(pub) as {
			name: string;
		} | null;
		return row?.name;
	}

	async setName(pub: string, name: string) {
		this.#db
			.query(
				'INSERT INTO profiles (pub, name) VALUES (?, ?) ON CONFLICT(pub) DO UPDATE SET name = excluded.name'
			)
			.run(pub, name);
	}

	async getPosition(pub: string, bookId: string) {
		const row = this.#db
			.query(
				'SELECT chapter, fraction, percent, updated_at AS updatedAt FROM positions WHERE pub = ? AND book_id = ?'
			)
			.get(pub, bookId) as Position | null;
		return row ?? undefined;
	}

	async setPosition(pub: string, bookId: string, p: Position) {
		this.#db
			.query(
				`INSERT INTO positions (pub, book_id, chapter, fraction, percent, updated_at)
				 VALUES (?, ?, ?, ?, ?, ?)
				 ON CONFLICT(pub, book_id) DO UPDATE SET
				   chapter = excluded.chapter, fraction = excluded.fraction,
				   percent = excluded.percent, updated_at = excluded.updated_at`
			)
			.run(pub, bookId, p.chapter, p.fraction, p.percent, p.updatedAt);
	}
}
