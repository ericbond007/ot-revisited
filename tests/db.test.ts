import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '../src/lib/db/client';
import { devices } from '../src/lib/db/schema';

describe('db client', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'htrail-'));
    dbPath = join(dir, 'test.db');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('creates tables after migrations', async () => {
    const { db, close } = createClient(dbPath);
    const rows = await db.select().from(devices).all();
    expect(rows).toEqual([]);
    close();
  });

  it('inserts and reads a device', async () => {
    const { db, close } = createClient(dbPath);
    await db.insert(devices).values({ id: 'dev-1' }).run();
    const rows = await db.select().from(devices).all();
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('dev-1');
    close();
  });
});
