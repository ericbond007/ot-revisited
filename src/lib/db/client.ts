import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import * as schema from './schema';

const migrationsFolder = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../drizzle'
);

export function createClient(dbPath: string) {
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder });
  return {
    db,
    close: () => sqlite.close()
  };
}

export type AppDb = ReturnType<typeof createClient>['db'];
