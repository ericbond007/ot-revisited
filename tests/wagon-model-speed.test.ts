// Integration tests for the wagon-model speed & overload mechanics wired in
// commit 2 of #103: wagon.baseSpeedMult, team factor from optimalTeam,
// load factor, overload fatigue + hazard multipliers, min-team gate.

import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/lib/game/engine';
import { milesPerDay } from '../src/lib/game/systems/travel';
import { tickOxen } from '../src/lib/game/systems/oxen';
import {
  totalInventoryWeight,
  loadPct,
  loadOverPct,
  loadSpeedMult,
  loadFatigueMult,
  wagonHazardMult
} from '../src/lib/game/systems/load';
import { makeRng } from '../src/lib/game/rng';
import type { GameState, Ox } from '../src/lib/game/types';
import type { WagonModelId } from '../src/lib/game/content/wagons';

function fourHealthyOxen(): Ox[] {
  return [0, 1, 2, 3].map((i) => ({ id: `o${i}`, health: 100, fatigue: 0, shod: true }));
}
function nHealthyOxen(n: number): Ox[] {
  return Array.from({ length: n }, (_, i) => ({ id: `o${i}`, health: 100, fatigue: 0, shod: true }));
}

function baseGame(wagonModel: WagonModelId = 'prairie_schooner', oxen: Ox[] = fourHealthyOxen()): GameState {
  const s = createInitialState({
    seed: 't',
    leader: { name: 'A', profession: 'farmer' },
    companions: [{ name: 'B', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 },
    wagonModel
  });
  // Start with an empty-ish inventory so load tests start at 0 weight.
  // Keep enough yokes to hitch all the test oxen — these tests measure
  // travel speed mechanics, not the #107 yoke-gating.
  return { ...s, oxen, inventory: { yoke: Math.ceil(oxen.length / 2) } };
}

describe('load helpers', () => {
  it('totalInventoryWeight sums qty × weightLbPerUnit', () => {
    const s = baseGame();
    s.inventory = { flour: 100, bacon: 50 }; // 100×1 + 50×1 = 150
    expect(totalInventoryWeight(s)).toBe(150);
  });

  it('loadPct is weight / cap', () => {
    const s = baseGame();
    s.inventory = { flour: 500 }; // 500 / 2500 = 0.2
    expect(loadPct(s)).toBeCloseTo(0.2);
  });

  it('loadOverPct is 0 when at or under cap, > 0 over', () => {
    const s = baseGame();
    s.inventory = { flour: 2500 }; // exactly at cap
    expect(loadOverPct(s)).toBe(0);
    s.inventory = { flour: 3000 }; // 20% over
    expect(loadOverPct(s)).toBeCloseTo(0.2);
  });

  it('loadSpeedMult is 1 at or under cap', () => {
    const s = baseGame();
    s.inventory = { flour: 0 };
    expect(loadSpeedMult(s)).toBe(1);
    s.inventory = { flour: 2500 };
    expect(loadSpeedMult(s)).toBe(1);
  });

  it('loadSpeedMult drops quadratically past cap and floors at 0.40', () => {
    const s = baseGame();
    s.inventory = { flour: 3125 }; // 125%
    expect(loadSpeedMult(s)).toBeCloseTo(0.925);
    s.inventory = { flour: 3750 }; // 150%
    expect(loadSpeedMult(s)).toBeCloseTo(0.7);
    s.inventory = { flour: 10000 }; // insane overload → floor
    expect(loadSpeedMult(s)).toBe(0.4);
  });

  it('loadFatigueMult grows past cap', () => {
    const s = baseGame();
    s.inventory = { flour: 2500 };
    expect(loadFatigueMult(s)).toBe(1);
    s.inventory = { flour: 3125 }; // 125%
    expect(loadFatigueMult(s)).toBeCloseTo(1.0625);
    s.inventory = { flour: 3750 }; // 150%
    expect(loadFatigueMult(s)).toBeCloseTo(1.25);
  });

  it('wagonHazardMult grows past cap', () => {
    const s = baseGame();
    s.inventory = { flour: 2500 };
    expect(wagonHazardMult(s)).toBe(1);
    s.inventory = { flour: 3125 }; // 125%
    expect(wagonHazardMult(s)).toBeCloseTo(1.125);
    s.inventory = { flour: 5000 }; // 200%
    expect(wagonHazardMult(s)).toBeCloseTo(3);
  });
});

describe('milesPerDay with wagon models', () => {
  it('light wagon at 2 oxen (optimal) moves', () => {
    const s = baseGame('light', nHealthyOxen(2));
    expect(milesPerDay(s)).toBeGreaterThan(0);
  });

  it('heavy wagon at 3 oxen = stranded (minTeam=4)', () => {
    const s = baseGame('heavy', nHealthyOxen(3));
    expect(milesPerDay(s)).toBe(0);
  });

  it('heavy wagon at 4 oxen moves, but slower than prairie-at-4', () => {
    const prairie = baseGame('prairie_schooner', fourHealthyOxen());
    const heavy = baseGame('heavy', fourHealthyOxen());
    expect(milesPerDay(heavy)).toBeLessThan(milesPerDay(prairie));
  });

  it('heavy wagon at 6 oxen (optimal) is only slightly slower than prairie-at-4', () => {
    const prairie = baseGame('prairie_schooner', fourHealthyOxen());
    const heavy = baseGame('heavy', nHealthyOxen(6));
    const ratio = milesPerDay(heavy) / milesPerDay(prairie);
    // Heavy base speed is 0.85, so heavy-at-optimal ≈ 85% of prairie-at-optimal.
    expect(ratio).toBeGreaterThan(0.8);
    expect(ratio).toBeLessThan(0.95);
  });

  it('light wagon empty > prairie wagon empty at matching team', () => {
    const light = baseGame('light', nHealthyOxen(2));
    const prairie = baseGame('prairie_schooner', fourHealthyOxen());
    expect(milesPerDay(light)).toBeGreaterThan(milesPerDay(prairie));
  });

  it('heavy with maxed spares (1.1 team cap) cannot catch prairie at proper team', () => {
    const prairie = baseGame('prairie_schooner', fourHealthyOxen());
    const heavyMaxed = baseGame('heavy', nHealthyOxen(8)); // well above optimal 6, cap at 1.1
    expect(milesPerDay(heavyMaxed)).toBeLessThan(milesPerDay(prairie));
  });

  it('prairie wagon full (2500 lb) moves same speed as empty', () => {
    const empty = baseGame('prairie_schooner', fourHealthyOxen());
    const full = { ...empty, inventory: { flour: 2500, yoke: 2 } };
    expect(milesPerDay(full)).toBe(milesPerDay(empty));
  });

  it('prairie wagon at 150% overload moves slower than at cap', () => {
    const cap = { ...baseGame('prairie_schooner', fourHealthyOxen()), inventory: { flour: 2500, yoke: 2 } };
    const over = { ...baseGame('prairie_schooner', fourHealthyOxen()), inventory: { flour: 3750, yoke: 2 } };
    expect(milesPerDay(over)).toBeLessThan(milesPerDay(cap));
  });
});

describe('tickOxen + overload fatigue', () => {
  it('overloaded wagon accelerates ox fatigue', () => {
    const empty = baseGame('prairie_schooner', fourHealthyOxen());
    const over = { ...baseGame('prairie_schooner', fourHealthyOxen()), inventory: { flour: 3750 } };
    const emptyAfter = tickOxen(empty, makeRng('t'));
    const overAfter = tickOxen(over, makeRng('t'));
    expect(overAfter.oxen[0].fatigue).toBeGreaterThan(emptyAfter.oxen[0].fatigue);
  });
});
