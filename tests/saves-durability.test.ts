import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { createClient } from '../src/lib/db/client';
import { SavesRepo } from '../src/lib/db/saves-repo';
import { saves } from '../src/lib/db/schema';
import { createInitialState } from '../src/lib/game/engine';

function fresh() {
  return createInitialState({
    seed: 'durability',
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [{ name: 'Mary', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
}

describe('SavesRepo durability', () => {
  let dir: string;
  let handle: ReturnType<typeof createClient>;
  let repo: SavesRepo;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'htrail-dur-'));
    handle = createClient(join(dir, 'db.sqlite'));
    repo = new SavesRepo(handle.db);
  });
  afterEach(() => { handle.close(); rmSync(dir, { recursive: true, force: true }); });

  it('load returns null (not a 500) for a corrupt slot', async () => {
    const deviceId = await repo.createDevice();
    await repo.save(deviceId, 'corrupt', fresh());
    // Corrupt the stored JSON directly.
    await handle.db.update(saves).set({ gameState: '{ not valid json' })
      .where(eq(saves.slotName, 'corrupt')).run();
    await expect(repo.load(deviceId, 'corrupt')).resolves.toBeNull();
  });

  it('load returns null for a schema-drifted slot (missing required field)', async () => {
    const deviceId = await repo.createDevice();
    await repo.save(deviceId, 'drift', fresh());
    await handle.db.update(saves).set({ gameState: JSON.stringify({ version: 1, state: { day: 1 } }) })
      .where(eq(saves.slotName, 'drift')).run();
    await expect(repo.load(deviceId, 'drift')).resolves.toBeNull();
  });

  it('uniqueSlotName suffixes (2),(3)… so same-day journeys do not overwrite', async () => {
    const deviceId = await repo.createDevice();
    const base = 'Journey 6/3/2026';
    expect(await repo.uniqueSlotName(deviceId, base)).toBe(base);
    await repo.save(deviceId, base, fresh());
    const second = await repo.uniqueSlotName(deviceId, base);
    expect(second).toBe(`${base} (2)`);
    await repo.save(deviceId, second, fresh());
    const third = await repo.uniqueSlotName(deviceId, base);
    expect(third).toBe(`${base} (3)`);
    await repo.save(deviceId, third, fresh());
    // all three coexist — nothing was overwritten
    expect((await repo.list(deviceId)).length).toBe(3);
  });
});
