import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import * as schema from './schema';

function defaultMigrationsFolder(): string {
  try {
    const modDir = dirname(fileURLToPath(import.meta.url));
    const relative = resolve(modDir, '../../../drizzle');
    if (existsSync(relative)) return relative;
  } catch {
    // SSR-bundled contexts: import.meta.url may be a data: URL.
  }
  return process.env.DRIZZLE_MIGRATIONS_DIR ?? resolve(process.cwd(), 'drizzle');
}

export interface CreateClientOptions {
  migrationsFolder?: string;
}

export function createClient(dbPath: string, options: CreateClientOptions = {}) {
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  const db = drizzle(sqlite, { schema });
  migrate(db, {
    migrationsFolder: options.migrationsFolder ?? defaultMigrationsFolder()
  });
  return {
    db,
    close: () => sqlite.close()
  };
}

export type AppDb = ReturnType<typeof createClient>['db'];
