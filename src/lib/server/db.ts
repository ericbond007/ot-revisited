import { createClient } from '$lib/db/client';
import { SavesRepo } from '$lib/db/saves-repo';
import { resolve } from 'node:path';

const DB_PATH = process.env.DATABASE_URL?.replace('file:', '') ?? resolve(process.cwd(), 'dev.db');

let cached: { repo: SavesRepo; close: () => void } | null = null;

export function getRepo(): SavesRepo {
  if (!cached) {
    const handle = createClient(DB_PATH);
    cached = { repo: new SavesRepo(handle.db), close: handle.close };
  }
  return cached.repo;
}
