// #1235 — Schedule-gate tests for the shouldFindWater predicate.
// Key test: the critical-override must keep find-water alive even when behind,
// as long as the keg ratio is below the critical floor (0.25).

import { describe, it, expect } from 'vitest';
import { balancedPersona } from '../src/lib/game/ai/personas';
import { TOTAL_TRAIL_MI } from '../src/lib/game/ai/schedule';
import type { GameState } from '../src/lib/game/types';

// Fixture math:
//   day=100, milesTraveled=(TOTAL_TRAIL_MI * 100) / 219
//   projectedArrival = 219 => critical for balanced (target 185 + margin 15 = 200)
//   waterRatio(state) = water / cap
//   suppressCamp(..., findWater, { waterRatio: r }) suppresses when r >= 0.25
//   At ratio 0.05 (water=1, cap=20): 0.05 < 0.25 => NOT suppressed (critical override)
//   AND 0.05 < balanced non-desert floor 0.10 => base predicate fires
function behindWater(water: number, cap: number): GameState {
  return {
    day: 100,
    date: { year: 1849, month: 7, day: 10 },
    location: {
      milesTraveled: (TOTAL_TRAIL_MI * 100) / 219,
      terrain: 'prairie'
    },
    resources: { water, waterCap: cap },
    party: [
      {
        id: 'p0', name: 'Leader', sex: 'male', kind: 'adult',
        isLeader: true, age: 30, health: 80, cleanliness: 80,
        conditions: [], dead: false, profession: 'farmer'
      }
    ],
    oxen: [{ id: 'ox-0', health: 100, fatigue: 0, shod: true }],
    inventory: {},
    morale: 60,
    flags: {}
  } as unknown as GameState;
}

describe('#1235 shouldFindWater schedule gate', () => {
  it('still finds water on a near-empty keg when behind (critical override)', () => {
    // ratio = 1/20 = 0.05
    // 0.05 < critical floor 0.25 => suppressCamp returns false (no veto)
    // 0.05 < balanced non-desert floor 0.10 => base predicate returns true
    expect(balancedPersona.shouldFindWater(behindWater(1, 20), {} as never)).toBe(true);
  });
});
