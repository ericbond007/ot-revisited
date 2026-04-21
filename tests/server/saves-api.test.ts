import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '../../src/lib/db/client';
import { SavesRepo } from '../../src/lib/db/saves-repo';
import { createInitialState } from '../../src/lib/game/engine';

describe('saves API shape (via SavesRepo)', () => {
  let dir: string;
  let handle: ReturnType<typeof createClient>;
  let repo: SavesRepo;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'ht-api-'));
    handle = createClient(join(dir, 'db.sqlite'));
    repo = new SavesRepo(handle.db);
  });

  afterEach(() => {
    handle.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('list returns empty for new device', async () => {
    const deviceId = await repo.createDevice();
    const saves = await repo.list(deviceId);
    expect(saves).toEqual([]);
  });

  it('list → save → list flow returns the saved summary', async () => {
    const deviceId = await repo.createDevice();
    const state = createInitialState({
      seed: 'api',
      leader: { name: 'Ezra', profession: 'farmer' },
      companions: [{ name: 'Mary', profession: 'doctor' }],
      startDate: { year: 1848, month: 4, day: 15 }
    });
    await repo.save(deviceId, 'slot-1', state);
    const saves = await repo.list(deviceId);
    expect(saves).toHaveLength(1);
    expect(saves[0].summary).toContain('Ezra');
  });

  it('save → save same slot (upsert) does not duplicate', async () => {
    const deviceId = await repo.createDevice();
    const state = createInitialState({
      seed: 'up',
      leader: { name: 'A', profession: 'farmer' },
      companions: [{ name: 'B', profession: 'doctor' }],
      startDate: { year: 1848, month: 4, day: 15 }
    });
    await repo.save(deviceId, 'slot-1', state);
    await repo.save(deviceId, 'slot-1', state);
    const saves = await repo.list(deviceId);
    expect(saves).toHaveLength(1);
  });
});
