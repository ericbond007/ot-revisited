// #1235 — Schedule-gate tests for the rest predicate.
// Verifies that non-sacred personas skip Sunday rest when behind schedule,
// while faithful/sunday_rester keep it sacred regardless of pace.

import { describe, it, expect } from 'vitest';
import {
  balancedPersona,
  faithfulPersona,
  sundayResterPersona
} from '../src/lib/game/ai/personas';
import { TOTAL_TRAIL_MI } from '../src/lib/game/ai/schedule';
import type { GameState } from '../src/lib/game/types';

// A Sunday (1849-06-17 verified in sunday-layby-224.test.ts),
// healthy party, far behind schedule.
//
// Fixture math: day=100, milesTraveled=1000
//   projectedArrival = 100 * (2195 / 1000) = 219.5
//   balanced target = 185  =>  219 > 185+15  =>  'critical'
//   allowsSabbathRest(state, 'balanced') = false  (non-sacred, not ok)
//   allowsSabbathRest(state, 'faithful') = true   (sabbathSacred)
//
// No doctor in party => hpFloor = 25.  party health = 100, oxen fatigue = 0
// => minPartyHealth >= hpFloor and oxenWornOut = false => no crisis rest.
// morale = 80 > 10 => no voluntary rest.
// The ONLY rest trigger that could fire is the Sunday branch.
function behindSunday(): GameState {
  return {
    day: 100,
    date: { year: 1849, month: 6, day: 17 },
    location: { milesTraveled: (TOTAL_TRAIL_MI * 100) / 219.5 }, // projects to day ~219.5 (critical for target 185)
    morale: 80,
    party: [
      {
        id: 'p0',
        name: 'Leader',
        sex: 'male',
        kind: 'adult',
        isLeader: true,
        age: 30,
        health: 100,
        cleanliness: 100,
        conditions: [],
        dead: false,
        profession: 'farmer'
      }
    ],
    oxen: [
      { id: 'ox-0', health: 100, fatigue: 0, shod: true },
      { id: 'ox-1', health: 100, fatigue: 0, shod: true }
    ],
    inventory: {},
    flags: {}
  } as unknown as GameState;
}

// Silence the TOTAL_TRAIL_MI import — it is used by schedule.ts (imported
// transitively) and having an explicit reference here documents the
// constant the fixture math relies on.

describe('#1235 shouldRest schedule gate', () => {
  it('balanced (non-sacred) skips Sunday rest when behind + healthy', () => {
    expect(balancedPersona.shouldRest(behindSunday(), {} as never)).toBe(false);
  });

  it('faithful keeps Sunday rest sacred even when behind', () => {
    expect(faithfulPersona.shouldRest(behindSunday(), {} as never)).toBe(true);
  });

  it('sunday_rester keeps Sunday rest sacred even when behind', () => {
    expect(sundayResterPersona.shouldRest(behindSunday(), {} as never)).toBe(true);
  });
});
