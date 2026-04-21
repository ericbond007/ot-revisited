import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { resolve } from 'node:path';
import * as schema from './schema';

const DEFAULT_MIGRATIONS_FOLDER = resolve(process.cwd(), 'drizzle');

export interface CreateClientOptions {
  migrationsFolder?: string;
}

export function createClient(dbPath: string, options: CreateClientOptions = {}) {
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  const db = drizzle(sqlite, { schema });
  migrate(db, {
    migrationsFolder: options.migrationsFolder ?? DEFAULT_MIGRATIONS_FOLDER
  });
  return {
    db,
    close: () => sqlite.close()
  };
}

export type AppDb = ReturnType<typeof createClient>['db'];
