import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/lib/game/engine';
import { rest } from '../src/lib/game/actions/rest';
import { applyDailyConsumption, applyDirtyWaterRisk } from '../src/lib/game/systems/consumption';
import { canBoilWater } from '../src/lib/game/systems/water-purity';
import { makeRng } from '../src/lib/game/rng';
import type { GameState } from '../src/lib/game/types';

function newGame(opts: { profession?: 'farmer' | 'doctor' | 'carpenter'; year?: number } = {}): GameState {
  const s = createInitialState({
    seed: 'water',
    leader: { name: 'A', profession: opts.profession ?? 'farmer' },
    companions: [{ name: 'B', profession: 'carpenter' }],
    startDate: { year: opts.year ?? 1848, month: 6, day: 15 }
  });
  return s;
}

describe('clean / dirty water draw', () => {
  it('drinks clean water first when both pools have content', () => {
    const s0 = {
      ...newGame(),
      resources: { water: 10, waterCap: 30, dirtyWater: 10, firewood: 100 }
    };
    const after = applyDailyConsumption(s0);
    // Clean drained first, dirty untouched.
    expect(after.resources.water).toBeLessThan(10);
    expect(after.resources.dirtyWater).toBe(10);
    expect(after.flags._lastDirtyWaterDrawn).toBe(0);
  });

  it('falls back to dirty when clean runs out — flag tracks gal drunk', () => {
    const s0 = {
      ...newGame(),
      resources: { water: 1, waterCap: 30, dirtyWater: 10, firewood: 100 }
    };
    const after = applyDailyConsumption(s0);
    expect(after.resources.water).toBe(0);
    expect(after.resources.dirtyWater).toBeLessThan(10);
    expect(after.flags._lastDirtyWaterDrawn).toBeGreaterThan(0);
  });
});

describe('dirty water disease risk', () => {
  it('rolls per-adult disease when dirty was drawn', () => {
    const s0 = {
      ...newGame(),
      resources: { water: 0, waterCap: 30, dirtyWater: 10, firewood: 100 },
      flags: { _lastDirtyWaterDrawn: 2, hasBoilingKnowledge: false, hadFireLastNight: false }
    };
    let infections = 0;
    for (let i = 0; i < 30; i++) {
      const next = applyDirtyWaterRisk(s0, makeRng(`r-${i}`));
      const hasNew = next.party.some((m) =>
        m.conditions.some((c) => c.id === 'cholera' || c.id === 'dysentery')
      );
      if (hasNew) infections++;
    }
    // 5% per adult × 2 adults ≈ 10% any-infected. Across 30 seeds we
    // should see at least one but not all.
    expect(infections).toBeGreaterThan(0);
    expect(infections).toBeLessThan(30);
  });

  it('skips when no dirty water was drawn (clean only)', () => {
    const s0 = {
      ...newGame(),
      resources: { water: 30, waterCap: 30, dirtyWater: 0, firewood: 100 },
      flags: { _lastDirtyWaterDrawn: 0, hasBoilingKnowledge: false, hadFireLastNight: false }
    };
    for (let i = 0; i < 5; i++) {
      const next = applyDirtyWaterRisk(s0, makeRng(`c-${i}`));
      expect(next).toBe(s0);
    }
  });
});

describe('UI knowledge gate', () => {
  it('1848 farmer party cannot boil water', () => {
    expect(canBoilWater(newGame({ profession: 'farmer', year: 1848 }))).toBe(false);
  });

  it('1855 farmer party CAN boil water (post-1854 germ theory)', () => {
    expect(canBoilWater(newGame({ profession: 'farmer', year: 1855 }))).toBe(true);
  });

  it('1848 doctor party CAN boil water (medical knowledge)', () => {
    expect(canBoilWater(newGame({ profession: 'doctor', year: 1848 }))).toBe(true);
  });
});

describe('camp actions: find_water + boil_water', () => {
  it('find_water adds dirtyWater up to capacity', () => {
    const s0: GameState = {
      ...newGame(),
      resources: { water: 0, waterCap: 30, dirtyWater: 0, firewood: 100 },
      // Plenty of food to keep starvation out of the picture.
      inventory: { flour: 200, bacon: 100 }
    };
    const after = rest(s0, 1, { campActions: ['find_water'] });
    expect(after.resources.dirtyWater ?? 0).toBeGreaterThan(0);
  });

  it('boil_water hidden pre-knowledge', () => {
    const s = newGame({ profession: 'farmer', year: 1848 });
    expect(canBoilWater(s)).toBe(false);
  });

  it('boil_water converts dirty to clean and consumes firewood', () => {
    const s0: GameState = {
      ...newGame({ profession: 'doctor' }),
      resources: { water: 0, waterCap: 30, dirtyWater: 20, firewood: 50 },
      inventory: { flour: 200, bacon: 100 }
    };
    const after = rest(s0, 1, { campActions: ['boil_water'] });
    expect(after.resources.water).toBeGreaterThan(0);
    expect((after.resources.dirtyWater ?? 0)).toBeLessThan(20);
    expect((after.resources.firewood ?? 0)).toBeLessThan(50);
  });
});
