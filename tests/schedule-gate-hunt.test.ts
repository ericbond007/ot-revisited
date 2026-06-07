// #1235 — Schedule-gate tests for the shouldHunt predicate.
// Verifies that behind-schedule personas skip discretionary hunts,
// and that the starvation-floor critical override always allows hunting.

import { describe, it, expect } from 'vitest';
import { balancedPersona } from '../src/lib/game/ai/personas';
import { TOTAL_TRAIL_MI } from '../src/lib/game/ai/schedule';
import type { GameState } from '../src/lib/game/types';

// Fixture math:
//   day=100, milesTraveled=(TOTAL_TRAIL_MI * 100) / 219
//   projectedArrival = 100 * (2195 / miles) = 219
//   balanced target = 185, critical margin = 15 => 219 > 200 => critical
//   suppressCamp(..., hunt, { foodOnHand: 100 }) => 100 > 30 => true (suppress)
//   suppressCamp(..., hunt, { foodOnHand: 20 }) => 20 <= 30 (starvation floor) => false (no suppress)
//
// canHunt requirements: rifle>=1, gunpowder>=5, lead_balls>=5, percussion_caps>=5
// foodOnHand = flour + beans + bacon + ... summed from inventory
function behindHuntable(food: number): GameState {
  return {
    day: 100,
    date: { year: 1849, month: 7, day: 10 },
    location: {
      milesTraveled: (TOTAL_TRAIL_MI * 100) / 219,
      terrain: 'prairie'
    },
    // canHunt=true: rifle + ammo stocked
    // foodOnHand=food: all in flour for simplicity
    inventory: {
      rifle: 1,
      gunpowder: 10,
      lead_balls: 10,
      percussion_caps: 10,
      flour: food
    },
    party: [
      {
        id: 'p0', name: 'Leader', sex: 'male', kind: 'adult',
        isLeader: true, age: 30, health: 80, cleanliness: 80,
        conditions: [], dead: false, profession: 'farmer'
      }
    ],
    oxen: [{ id: 'ox-0', health: 100, fatigue: 0, shod: true }],
    resources: { water: 10, waterCap: 20 },
    morale: 60,
    flags: {}
  } as unknown as GameState;
}

describe('#1235 shouldHunt schedule gate', () => {
  it('balanced skips a discretionary hunt when behind', () => {
    // food=100 < balanced no-hunter threshold (140) => canHunt && food<threshold is TRUE without gate
    // With gate: suppressCamp returns true (100 > starvation floor 30) => return false
    expect(balancedPersona.shouldHunt(behindHuntable(100), {} as never)).toBe(false);
  });

  it('balanced still hunts when near starvation even if behind', () => {
    // food=20 <= starvation floor 30 => suppressCamp returns false (critical override)
    // canHunt=true, food=20 < threshold=140 => return true
    expect(balancedPersona.shouldHunt(behindHuntable(20), {} as never)).toBe(true);
  });
});
