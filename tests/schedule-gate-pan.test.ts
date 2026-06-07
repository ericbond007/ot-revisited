// #1235 — Schedule-gate tests for the shouldPan predicate.
// Verifies that panning is suppressed when the party is behind schedule,
// even when canPanForGold would otherwise return true.

import { describe, it, expect } from 'vitest';
import { balancedPersona } from '../src/lib/game/ai/personas';
import { TOTAL_TRAIL_MI } from '../src/lib/game/ai/schedule';
import type { GameState } from '../src/lib/game/types';

// Fixture math:
//   day=120, milesTraveled=(TOTAL_TRAIL_MI * 120) / 230
//   projectedArrival = 120 * (2195 / miles) = 230
//   balanced target = 185, critical margin = 15 => 230 > 200 => critical
//   suppressCamp(..., pan) => always true when pressure != ok => return false
//
// canPanForGold gates (all must pass on-time):
//   year >= 1849 (date.year=1850 OK)
//   terrain = river
//   milesTraveled >= 700 (TOTAL_TRAIL_MI*120/230 = 2195*120/230 ≈ 1145, OK)
//   cooldown: lastPannedDay absent or day-last >= 7 (flags={} OK)
function behindGold(): GameState {
  return {
    day: 120,
    date: { year: 1850, month: 8, day: 2 },
    location: {
      milesTraveled: (TOTAL_TRAIL_MI * 120) / 230,
      terrain: 'river'
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
    inventory: {},
    morale: 60,
    flags: {}
  } as unknown as GameState;
}

describe('#1235 shouldPan schedule gate', () => {
  it('skips panning when behind', () => {
    // canPanForGold would return true (year=1850, terrain=river, miles≈1145>=700, no cooldown)
    // but suppressCamp(state, balanced, pan) => pressure=critical => true => return false
    expect(balancedPersona.shouldPan(behindGold(), {} as never)).toBe(false);
  });
});
