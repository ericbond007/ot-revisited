import { describe, it, expect } from 'vitest';
import { tickNpcWagon, type NpcTickContext } from '../src/lib/game/systems/npc-engine';
import { makeRng } from '../src/lib/game/rng';
import type { NpcWagonState } from '../src/lib/game/types';

// Minimal NPC wagon fixture for hot-drink clock tests.
// 2 adults, coffee:1, ample food + water, 4 healthy oxen.
// No children (children don't brew), no conditions, no special
// profession that would change food draw or recovery.
//
// Math for the invariant:
//   2 adults × 1 oz/day × 8 days = 16 oz total
//   floor(16 / 16) = 1 lb consumed  →  coffee 1 → 0
//   16 % 16        = 0 oz remainder  →  persistentFlags._hotDrinkClock = 0
//   (day 9+: no coffee/tea → clock key is deleted by applyHotDrinks)
//
// Pre-#1266: the clock was discarded every synth tick, so
// totalOz each day was adults × 1 oz fresh → floor(2/16) = 0 → coffee never moved.
// Post-#1266: the clock persists, accumulates 2 oz/day, hits 16 oz on day 8.
function freshWagon(): NpcWagonState {
  return {
    id: 'hd-test',
    name: 'the Hotdrink party',
    leaderProfession: 'farmer',
    hasChildren: false,
    seed: 'hd',
    eventLog: [],
    outcome: 'in-progress',
    rations: 'normal',
    party: [
      {
        id: 'hd-p0',
        name: 'John Hotdrink',
        sex: 'male',
        kind: 'adult',
        isLeader: true,
        profession: 'farmer',
        age: 32,
        health: 100,
        cleanliness: 100,
        conditions: [],
        dead: false
      },
      {
        id: 'hd-p1',
        name: 'Mary Hotdrink',
        sex: 'female',
        kind: 'adult',
        isLeader: false,
        age: 28,
        health: 100,
        cleanliness: 100,
        conditions: [],
        dead: false
      }
    ],
    inventory: {
      coffee: 1,
      flour: 600,
      bacon: 300,
      beans: 200
    },
    oxen: [
      { id: 'hd-ox-0', health: 100, fatigue: 0, shod: true },
      { id: 'hd-ox-1', health: 100, fatigue: 0, shod: true },
      { id: 'hd-ox-2', health: 100, fatigue: 0, shod: true },
      { id: 'hd-ox-3', health: 100, fatigue: 0, shod: true }
    ],
    cash: 50,
    morale: 60,
    water: 30,
    dirtyWater: 0,
    waterCap: 30,
    dryDays: 0,
    wagon: {
      model: 'prairie_schooner',
      condition: 100,
      canvas: 100,
      carryCapacity: 2000,
      impairment: null
    }
  } as NpcWagonState;
}

// Build a ctx for a given day in mid-May 1849.
// May avoids July 4 (month=7) and Christmas / Thanksgiving triggers.
// companyRestMode:'travel' bypasses the #937 voluntary-rest gate
// so all 8 days are guaranteed travel days.
function ctx(day: number): NpcTickContext {
  return {
    day,
    traveled: true,
    pace: 'moderate',
    terrain: 'prairie',
    weather: 'clear',
    date: { year: 1849, month: 5, day: day },
    companyRestMode: 'travel'
  };
}

describe('#1266 — NPC coffee depletes (hot-drink clock now persists)', () => {
  it('a 2-adult coffee-drinking wagon consumes a pound within 8 days', () => {
    // 2 adults × 1 oz/day = 2 oz/day. Clock needs 16 oz to consume 1 lb.
    // 16 / 2 = 8 days exactly.
    let w: NpcWagonState = freshWagon();

    expect(w.inventory.coffee ?? 0).toBe(1);
    expect(w.persistentFlags?._hotDrinkClock).toBeUndefined();

    for (let d = 1; d <= 8; d++) {
      const result = tickNpcWagon(w, ctx(d), makeRng(`hd-${d}`));
      w = result.wagon;
      if (w.outcome !== 'in-progress') break;
    }

    expect(w.outcome).toBe('in-progress');
    // Coffee must have been consumed: 16 oz / 16 = 1 lb → 1 - 1 = 0.
    expect(w.inventory.coffee ?? 0).toBe(0);
    // Remainder oz: 16 % 16 = 0.
    // _hotDrinkClock is 0 on the depletion tick; on subsequent ticks with
    // no coffee it would be deleted — but at the 8-day boundary it's still 0.
    expect(w.persistentFlags?._hotDrinkClock).toBe(0);
  });
});
