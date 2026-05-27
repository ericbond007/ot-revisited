import { createClient } from '$lib/db/client';
import { SavesRepo } from '$lib/db/saves-repo';
import { resolve } from 'node:path';

const DB_PATH = process.env.DATABASE_URL?.replace('file:', '') ?? resolve(process.cwd(), 'dev.db');

// Eager init at module load: hooks.server.ts imports this file, and
// SvelteKit loads hooks at server boot — so createClient (which runs
// migrate) fires before any request lands. If migrate throws, the
// process crashes on startup instead of quietly serving with a stale
// schema. The #1181 feedback table shipped in code but never landed on
// prod because the previous lazy path silently failed to apply 0001 on
// the first request.
const t0 = Date.now();
const handle = createClient(DB_PATH);
console.log(`[db] ${DB_PATH} ready (migrations in ${Date.now() - t0}ms)`);
const repo = new SavesRepo(handle.db);

export function getRepo(): SavesRepo {
  return repo;
}
