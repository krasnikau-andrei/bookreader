import { createApp } from './app';
import { SqliteStore } from './sqlite-store';

const port = Number(process.env.PORT ?? 8787);
const dbPath = process.env.DB_PATH ?? 'reading-together.sqlite';

const handle = createApp(new SqliteStore(dbPath));

Bun.serve({ port, fetch: handle });
console.log(`Reading Together server on http://localhost:${port} (data: ${dbPath})`);
