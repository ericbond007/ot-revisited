import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '../src/lib/db/client';
import { SavesRepo } from '../src/lib/db/saves-repo';
import { createInitialState, tickDay } from '../src/lib/game/engine';

function fresh() {
  return createInitialState({
    seed: 'repo-seed',
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [{ name: 'Mary', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
}

describe('SavesRepo', () => {
  let dir: string;
  let handle: ReturnType<typeof createClient>;
  let repo: SavesRepo;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'htrail-repo-'));
    handle = createClient(join(dir, 'db.sqlite'));
    repo = new SavesRepo(handle.db);
  });

  afterEach(() => {
    handle.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('creates a device and lists no saves', async () => {
    const deviceId = await repo.ensureDevice();
    expect(deviceId).toMatch(/^[0-9a-f-]{36}$/);
    const list = await repo.list(deviceId);
    expect(list).toEqual([]);
  });

  it('saves and loads an exact round-trip', async () => {
    const deviceId = await repo.ensureDevice();
    const state = fresh();
    await repo.save(deviceId, 'slot-1', state);
    const loaded = await repo.load(deviceId, 'slot-1');
    expect(loaded).toEqual(state);
  });

  it('overwrites when saving the same slot twice', async () => {
    const deviceId = await repo.ensureDevice();
    let state = fresh();
    await repo.save(deviceId, 'slot-1', state);
    state = tickDay(state);
    state = tickDay(state);
    await repo.save(deviceId, 'slot-1', state);
    const loaded = await repo.load(deviceId, 'slot-1');
    expect(loaded?.day).toBe(3);
    const list = await repo.list(deviceId);
    expect(list).toHaveLength(1);
  });

  it('keeps multiple slots separate', async () => {
    const deviceId = await repo.ensureDevice();
    const a = fresh();
    const b = tickDay(tickDay(fresh()));
    await repo.save(deviceId, 'slot-a', a);
    await repo.save(deviceId, 'slot-b', b);
    const list = await repo.list(deviceId);
    expect(list.map((s) => s.slotName).sort()).toEqual(['slot-a', 'slot-b']);
    const loadedA = await repo.load(deviceId, 'slot-a');
    const loadedB = await repo.load(deviceId, 'slot-b');
    expect(loadedA?.day).toBe(1);
    expect(loadedB?.day).toBe(3);
  });

  it('isolates saves per device', async () => {
    const d1 = await repo.ensureDevice();
    const d2 = await repo.ensureDevice();
    await repo.save(d1, 'slot-1', fresh());
    const list2 = await repo.list(d2);
    expect(list2).toEqual([]);
  });

  it('load returns null for missing slot', async () => {
    const deviceId = await repo.ensureDevice();
    const loaded = await repo.load(deviceId, 'does-not-exist');
    expect(loaded).toBeNull();
  });

  it('delete removes a save', async () => {
    const deviceId = await repo.ensureDevice();
    await repo.save(deviceId, 'slot-1', fresh());
    await repo.delete(deviceId, 'slot-1');
    const loaded = await repo.load(deviceId, 'slot-1');
    expect(loaded).toBeNull();
  });

  it('list returns summaries that include the leader name', async () => {
    const deviceId = await repo.ensureDevice();
    await repo.save(deviceId, 'slot-1', fresh());
    const list = await repo.list(deviceId);
    expect(list[0].summary).toContain('Ezra');
  });
});
