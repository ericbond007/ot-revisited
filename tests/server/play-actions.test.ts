import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '../../src/lib/db/client';
import { SavesRepo } from '../../src/lib/db/saves-repo';
import { createInitialState, tickDay } from '../../src/lib/game/engine';
import { rest } from '../../src/lib/game/actions/rest';

function fresh() {
  return createInitialState({
    seed: 'play',
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [{ name: 'Mary', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
}

describe('play action persistence', () => {
  let dir: string;
  let handle: ReturnType<typeof createClient>;
  let repo: SavesRepo;
  let deviceId: string;

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'ht-play-'));
    handle = createClient(join(dir, 'db.sqlite'));
    repo = new SavesRepo(handle.db);
    deviceId = await repo.createDevice();
    await repo.save(deviceId, 'slot-1', fresh());
  });

  afterEach(() => {
    handle.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('travel action advances day and persists', async () => {
    let state = await repo.load(deviceId, 'slot-1');
    expect(state).not.toBeNull();
    for (let i = 0; i < 3 && !state!.completed; i++) {
      state = tickDay(state!);
    }
    await repo.save(deviceId, 'slot-1', state!);

    const reloaded = await repo.load(deviceId, 'slot-1');
    expect(reloaded?.day).toBe(4);
  });

  it('rest action advances days, recovers ox fatigue', async () => {
    let state = (await repo.load(deviceId, 'slot-1'))!;
    state = rest(state, 3);
    await repo.save(deviceId, 'slot-1', state);

    const reloaded = await repo.load(deviceId, 'slot-1');
    expect(reloaded?.day).toBe(4);
  });

  it('camp action advances one day and saves', async () => {
    let state = (await repo.load(deviceId, 'slot-1'))!;
    state = rest(state, 1);
    await repo.save(deviceId, 'slot-1', state);

    const reloaded = await repo.load(deviceId, 'slot-1');
    expect(reloaded?.day).toBe(2);
  });
});
