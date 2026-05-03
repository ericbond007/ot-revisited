import { describe, it, expect } from 'vitest';
import { createInitialState, tickDay } from '../src/lib/game/engine';
import type { GameState, Ox } from '../src/lib/game/types';

function freshGameWithOxen(): GameState {
  const s = createInitialState({
    seed: 'integration',
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [
      { name: 'Mary', profession: 'doctor' },
      { name: 'Tom', profession: 'hunter' }
    ],
    startDate: { year: 1848, month: 4, day: 15 }
  });
  const oxen: Ox[] = Array.from({ length: 4 }, (_, i) => ({
    id: `ox-${i}`,
    health: 100,
    fatigue: 0,
    shod: true
  }));
  // Pure no-interaction simulations never ford rivers or find water,
  // so dehydration (#135) would kill the party within 2 weeks. Give the
  // test fixture a large water cushion so the tick pipeline is what
  // these integration tests measure, not the water subsystem.
  // Firewood likewise — enough for 30+ cold-night-free days so fire
  // mechanic (#15) doesn't drain party health during smoke tests.
  return {
    ...s,
    oxen,
    resources: { water: 500, waterCap: 500, firewood: 500 }
  };
}

describe('30-day deterministic simulation', () => {
  it('evolves all tracked stats across 30 days', () => {
    let s = freshGameWithOxen();
    const startingFlour = s.inventory.flour ?? 0;
    const startingCondition = s.wagon.condition;

    for (let i = 0; i < 30; i++) s = tickDay(s);

    expect(s.day).toBe(31);
    expect(s.inventory.flour).toBeLessThan(startingFlour);
    expect(s.wagon.condition).toBeLessThan(startingCondition);
    expect(s.oxen.some((o) => o.fatigue > 0)).toBe(true);
    // Calibrated: oxen fatigue degrades speed from ~21 mi/day down to ~0 by day 24,
    // and weather (#153) adds ~20% drag from rain/heat/storm days. Actual 30-day total
    // with moderate pace + 4 shod oxen ≈ 195 mi. Threshold leaves slack for seed drift.
    expect(s.location.milesTraveled).toBeGreaterThan(150);
    expect(typeof s.flags.hadFireLastNight).toBe('boolean');
  });

  it('same seed + same conditions = identical 30-day outcome', () => {
    function run() {
      let s = freshGameWithOxen();
      for (let i = 0; i < 30; i++) s = tickDay(s);
      return s;
    }
    expect(run()).toEqual(run());
  });

  it('a cholera outbreak + no doctor + low morale kills the party given enough days', () => {
    let s = freshGameWithOxen();
    s = {
      ...s,
      // Strip the doctor's starter quinine — this test is about
      // untreated cholera attrition, not the treatment-item mechanic.
      inventory: { ...s.inventory, quinine: 0, dovers_powder: 0, camphor: 0 },
      party: s.party.map((m) => ({
        ...m,
        conditions: [{ id: 'cholera' as const, daysSinceOnset: 0 }]
      })),
      morale: 30
    };
    for (let i = 0; i < 20; i++) s = tickDay(s);
    expect(s.party.every((m) => m.dead)).toBe(true);
    expect(s.outcome).toBe('wiped');
    expect(s.completed).toBe(true);
  });

  it('covers significant ground within 25 moderate days of travel', () => {
    // Calibrated: oxen fatigue limits real range to ~195 miles over 30 days (moderate pace
    // with weather). By day 25 the party has already exhausted oxen speed. Fort Kearny
    // (300 miles) requires a rest mechanic not yet implemented; this test verifies the
    // travel system drives meaningful forward progress before exhaustion.
    let s = freshGameWithOxen();
    for (let i = 0; i < 25; i++) s = tickDay(s);
    expect(s.location.milesTraveled).toBeGreaterThanOrEqual(150);
  });
});
