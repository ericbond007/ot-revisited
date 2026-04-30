import { describe, it, expect } from 'vitest';
import { hitchedOxenCount, oxenSpeedFactor, oxenSpeedFactorFor } from '../src/lib/game/systems/oxen';
import { milesPerDay } from '../src/lib/game/systems/travel';
import { upgradeState } from '../src/lib/game/upgrade';
import { createInitialState } from '../src/lib/game/engine';
import { buildStarterKit } from '../src/lib/game/content/starter-kit';
import type { GameState, Ox } from '../src/lib/game/types';

function newGame(overrides: Partial<GameState> = {}): GameState {
  const s = createInitialState({
    seed: 'yoke',
    leader: { name: 'A', profession: 'carpenter' },
    companions: [{ name: 'B', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
  return { ...s, ...overrides };
}

function ox(id: string, kind?: 'mule'): Ox {
  const o: Ox = { id, health: 100, fatigue: 0, shod: true };
  if (kind) o.kind = kind;
  return o;
}

describe('hitchedOxenCount', () => {
  it('caps at yokes × 2', () => {
    const s = newGame({
      oxen: [ox('a'), ox('b'), ox('c'), ox('d')],
      inventory: { yoke: 1 } // 1 yoke = 2 hitched
    });
    expect(hitchedOxenCount(s)).toBe(2);
  });

  it('returns all alive oxen when yokes are sufficient', () => {
    const s = newGame({
      oxen: [ox('a'), ox('b'), ox('c'), ox('d')],
      inventory: { yoke: 2 }
    });
    expect(hitchedOxenCount(s)).toBe(4);
  });

  it('mules are not gated by yokes', () => {
    const s = newGame({
      oxen: [ox('a'), ox('b'), ox('m1', 'mule'), ox('m2', 'mule')],
      inventory: { yoke: 1 }
    });
    // 2 oxen + 1 yoke → only 2 hitched oxen counted; mules pass through.
    expect(hitchedOxenCount(s)).toBe(2);
  });

  it('zero yokes = no hitched oxen', () => {
    const s = newGame({
      oxen: [ox('a'), ox('b')],
      inventory: {}
    });
    expect(hitchedOxenCount(s)).toBe(0);
  });

  it('dead oxen do not count', () => {
    const s = newGame({
      oxen: [ox('a'), { ...ox('b'), health: 0 }],
      inventory: { yoke: 5 }
    });
    expect(hitchedOxenCount(s)).toBe(1);
  });
});

describe('travel respects yoke supply', () => {
  it('full yokes vs zero yokes — speed difference', () => {
    const s = newGame({
      oxen: [ox('a'), ox('b'), ox('c'), ox('d')]
    });
    const yoked = { ...s, inventory: { yoke: 2 } };
    const unyoked = { ...s, inventory: {} };
    expect(milesPerDay(yoked)).toBeGreaterThan(0);
    // No yokes = no hitched oxen = no movement (the wagon's minTeam
    // gate also kicks in once hitched count drops below it).
    expect(milesPerDay(unyoked)).toBe(0);
  });

  it('partial yokes = effective team capped at yokes × 2', () => {
    const s = newGame({
      oxen: [ox('a'), ox('b'), ox('c'), ox('d')]
    });
    const allYoked = { ...s, inventory: { yoke: 2 } };
    const halfYoked = { ...s, inventory: { yoke: 1 } };
    // halfYoked: only 2 of 4 oxen hitched; below optimalTeam(=4) so
    // team factor < 1.0 → slower than fully yoked.
    expect(milesPerDay(halfYoked)).toBeLessThan(milesPerDay(allYoked));
  });

  it('mixed mule/ox team — mules pull regardless of yokes', () => {
    const s = newGame({
      oxen: [ox('a'), ox('b'), ox('m1', 'mule'), ox('m2', 'mule')]
    });
    const noYokes = { ...s, inventory: {} };
    // 2 mules contribute even with no yokes.
    expect(milesPerDay(noYokes)).toBeGreaterThan(0);
  });
});

describe('starter kit yokes per wagon', () => {
  it('light wagon → 1 yoke', () => {
    const kit = buildStarterKit([], 'light');
    expect(kit.inventory.yoke).toBe(1);
  });

  it('prairie schooner → 2 yokes', () => {
    const kit = buildStarterKit([], 'prairie_schooner');
    expect(kit.inventory.yoke).toBe(2);
  });

  it('heavy → 3 yokes (spares no longer pre-loaded; player buys at outfit)', () => {
    const kit = buildStarterKit([], 'heavy');
    expect(kit.inventory.yoke).toBe(3);
    expect(kit.inventory.wheel ?? 0).toBe(0);
    expect(kit.inventory.spare_plank ?? 0).toBe(0);
  });
});

describe('upgrade.ts yoke top-up', () => {
  it('legacy save with 1 yoke + heavy wagon gets bumped to 3', () => {
    const legacy: GameState = {
      ...newGame(),
      wagon: { model: 'heavy', condition: 100, canvas: 100, carryCapacity: 3500 },
      inventory: { yoke: 1 }
    };
    const upgraded = upgradeState(legacy);
    expect(upgraded.inventory.yoke).toBe(3);
  });

  it('save with sufficient yokes is left alone', () => {
    const fine: GameState = {
      ...newGame(),
      wagon: { model: 'prairie_schooner', condition: 100, canvas: 100, carryCapacity: 2500 },
      inventory: { yoke: 5 }
    };
    const upgraded = upgradeState(fine);
    expect(upgraded.inventory.yoke).toBe(5);
  });
});

describe('oxenSpeedFactor honors hitchedCount', () => {
  it('without hitchedCount, defaults to all alive oxen', () => {
    const oxen = [ox('a'), ox('b'), ox('c'), ox('d')];
    expect(oxenSpeedFactor(oxen, 4)).toBeCloseTo(1.0);
  });

  it('hitchedCount caps the team factor', () => {
    const oxen = [ox('a'), ox('b'), ox('c'), ox('d')];
    const fullTeam = oxenSpeedFactor(oxen, 4);
    const halfTeam = oxenSpeedFactor(oxen, 4, 2);
    expect(halfTeam).toBeLessThan(fullTeam);
  });

  it('hitchedCount of 0 → speed factor 0', () => {
    const oxen = [ox('a'), ox('b')];
    expect(oxenSpeedFactor(oxen, 2, 0)).toBe(0);
  });

  it('oxenSpeedFactorFor reads yokes off state', () => {
    const s = newGame({ oxen: [ox('a'), ox('b'), ox('c'), ox('d')], inventory: { yoke: 1 } });
    const factor = oxenSpeedFactorFor(s);
    // 4-ox team + 1 yoke = 2 hitched + 0 mules. Below optimalTeam(4)
    // so factor < 1.0.
    expect(factor).toBeLessThan(1.0);
    expect(factor).toBeGreaterThan(0);
  });
});
