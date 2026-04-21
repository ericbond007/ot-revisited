import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '../src/lib/db/client';
import { SavesRepo } from '../src/lib/db/saves-repo';
import { createInitialState, tickDay } from '../src/lib/game/engine';

describe('foundation smoke test', () => {
  let dir: string;
  let handle: ReturnType<typeof createClient>;
  let repo: SavesRepo;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'htrail-smoke-'));
    handle = createClient(join(dir, 'game.db'));
    repo = new SavesRepo(handle.db);
  });

  afterEach(() => {
    handle.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('new game → tick 10 days → save → load → identical state', async () => {
    const deviceId = await repo.createDevice();

    // Start
    let state = createInitialState({
      seed: 'smoke-42',
      leader: { name: 'Ezra', profession: 'farmer' },
      companions: [
        { name: 'Mary', profession: 'doctor' },
        { name: 'Tom', profession: 'hunter' }
      ],
      startDate: { year: 1848, month: 4, day: 15 }
    });

    // Capture starting provisions
    const startingFlour = state.inventory.flour ?? 0;
    const startingWater = state.resources.water;
    expect(startingFlour).toBeGreaterThan(0);

    // Tick 10 days
    for (let i = 0; i < 10; i++) state = tickDay(state);

    // Verify day advanced
    expect(state.day).toBe(11); // day 1 + 10 ticks
    expect(state.date).toEqual({ year: 1848, month: 4, day: 25 });

    // Verify food and water consumed
    expect(state.inventory.flour).toBeLessThan(startingFlour);
    expect(state.resources.water).toBeLessThan(startingWater);

    // Save
    await repo.save(deviceId, 'Autosave', state);

    // Load
    const loaded = await repo.load(deviceId, 'Autosave');
    expect(loaded).not.toBeNull();
    expect(loaded).toEqual(state);

    // Summary contains expected info
    const slots = await repo.list(deviceId);
    expect(slots).toHaveLength(1);
    expect(slots[0].summary).toContain('Ezra');
    expect(slots[0].summary).toContain('Day 11');
  });

  it('same seed + same actions = identical state (determinism)', async () => {
    function run() {
      let s = createInitialState({
        seed: 'determinism',
        leader: { name: 'Ezra', profession: 'farmer' },
        companions: [{ name: 'Mary', profession: 'doctor' }],
        startDate: { year: 1848, month: 4, day: 15 }
      });
      for (let i = 0; i < 30; i++) s = tickDay(s);
      return s;
    }
    expect(run()).toEqual(run());
  });
});
