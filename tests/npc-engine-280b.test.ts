// #280b — per-wagon engine tick tests. Companion wagons should eat,
// get tired, fall sick, and possibly die over time.

import { describe, it, expect } from 'vitest';
import { tickNpcWagon } from '../src/lib/game/systems/npc-engine';
import { advanceTrain, joinTrain } from '../src/lib/game/systems/wagon-train';
import { generateTrain } from '../src/lib/game/content/trains';
import { createInitialState } from '../src/lib/game/engine';
import { tickDayPausable } from '../src/lib/game/engine-pausable';
import { rest } from '../src/lib/game/actions/rest';
import { makeRng } from '../src/lib/game/rng';
import type { GameState, NpcWagonState } from '../src/lib/game/types';

function game(): GameState {
  return createInitialState({
    seed: 'npc',
    leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'doctor' }],
    startDate: { year: 1849, month: 4, day: 15 }
  });
}

function freshTrain(seed = 'fresh') {
  return generateTrain(seed, 1, 'independence_mo', makeRng(seed), { fresh: true });
}

const FOOD_KEYS = [
  'game_meat', 'berries', 'egg', 'milk',
  'jerky', 'pemmican', 'salt_pork', 'bacon',
  'flour', 'cornmeal', 'beans', 'hardtack',
  'dried_fruit', 'cheese', 'butter'
];

function totalFood(inv: Record<string, number>): number {
  return FOOD_KEYS.reduce((sum, k) => sum + (inv[k] ?? 0), 0);
}

describe('tickNpcWagon — per-wagon attrition', () => {
  it('drains food on a travel day proportional to alive eaters and rations', () => {
    const train = freshTrain();
    const wagon = train.companions[0];
    const before = totalFood(wagon.inventory);
    const next = tickNpcWagon(
      wagon,
      { day: 1, traveled: true, pace: 'moderate', terrain: 'prairie' },
      makeRng('t1')
    );
    const after = totalFood(next.inventory);
    expect(after).toBeLessThan(before);
  });

  it('accumulates ox fatigue on travel days, recovers on rest days', () => {
    const train = freshTrain();
    let wagon = train.companions[0];
    // 5 travel days at moderate → +20 fatigue per ox.
    for (let i = 0; i < 5; i++) {
      wagon = tickNpcWagon(
        wagon,
        { day: i + 1, traveled: true, pace: 'moderate', terrain: 'prairie' },
        makeRng('tt' + i)
      );
    }
    const traveled = wagon.oxen[0].fatigue;
    expect(traveled).toBeGreaterThan(0);

    // 3 rest days on prairie → big recovery.
    for (let i = 0; i < 3; i++) {
      wagon = tickNpcWagon(
        wagon,
        { day: 6 + i, traveled: false, pace: 'moderate', terrain: 'prairie' },
        makeRng('rr' + i)
      );
    }
    expect(wagon.oxen[0].fatigue).toBeLessThan(traveled);
  });

  it('starves the party when food runs out', () => {
    const train = freshTrain();
    let wagon: NpcWagonState = { ...train.companions[0], inventory: {} };
    const startHp = wagon.party[0].health;
    // 5 starvation days.
    for (let i = 0; i < 5; i++) {
      wagon = tickNpcWagon(
        wagon,
        { day: i + 1, traveled: true, pace: 'moderate', terrain: 'prairie' },
        makeRng('s' + i)
      );
    }
    expect(wagon.party[0].health).toBeLessThan(startHp);
  });

  it('reaps dead party members and logs an entry on the wagon eventLog', () => {
    const train = freshTrain();
    let wagon: NpcWagonState = {
      ...train.companions[0],
      inventory: {},
      party: train.companions[0].party.map((p, i) => i === 0
        ? { ...p, health: 1 }
        : p)
    };
    // First starvation day will probably kill the lead member.
    for (let i = 0; i < 4; i++) {
      wagon = tickNpcWagon(
        wagon,
        { day: i + 1, traveled: true, pace: 'moderate', terrain: 'prairie' },
        makeRng('d' + i)
      );
    }
    const dead = wagon.party.filter((p) => p.dead);
    expect(dead.length).toBeGreaterThan(0);
    expect(wagon.eventLog.some((e) => /died|trail took/i.test(e.text))).toBe(true);
  });

  it('marks outcome=wiped when every party member is dead', () => {
    const train = freshTrain();
    let wagon: NpcWagonState = {
      ...train.companions[0],
      inventory: {},
      party: train.companions[0].party.map((p) => ({ ...p, health: 1 }))
    };
    for (let i = 0; i < 10; i++) {
      wagon = tickNpcWagon(
        wagon,
        { day: i + 1, traveled: true, pace: 'moderate', terrain: 'prairie' },
        makeRng('w' + i)
      );
    }
    expect(wagon.outcome).toBe('wiped');
    // Subsequent ticks should be no-op once wiped.
    const sealed = tickNpcWagon(
      wagon,
      { day: 99, traveled: true, pace: 'moderate', terrain: 'prairie' },
      makeRng('post')
    );
    expect(sealed).toBe(wagon);
  });

  it('treats conditions when a treatment item is on hand', () => {
    const train = freshTrain();
    let wagon: NpcWagonState = {
      ...train.companions[0],
      inventory: { ...train.companions[0].inventory, quinine: 5 },
      party: [
        {
          ...train.companions[0].party[0],
          conditions: [{ id: 'cholera', daysSinceOnset: 0 }]
        },
        ...train.companions[0].party.slice(1)
      ]
    };
    const beforeQuinine = wagon.inventory.quinine ?? 0;
    wagon = tickNpcWagon(
      wagon,
      { day: 1, traveled: true, pace: 'moderate', terrain: 'prairie' },
      makeRng('treat')
    );
    expect((wagon.inventory.quinine ?? 0)).toBe(beforeQuinine - 1);
  });
});

describe('advanceTrain — engine integration', () => {
  it('is a no-op when player is not in a train', () => {
    const s = game();
    const after = advanceTrain(s, true);
    expect(after).toBe(s);
  });

  it('ticks every companion when in a train', () => {
    let s = joinTrain(game(), makeRng('j')).state;
    const before = totalFood(s.wagonTrain!.companions[0].inventory);
    s = advanceTrain(s, true);
    const after = totalFood(s.wagonTrain!.companions[0].inventory);
    expect(after).toBeLessThan(before);
  });

  it('tickDayPausable advances NPCs alongside the player', () => {
    let s = joinTrain(game(), makeRng('j')).state;
    const before = totalFood(s.wagonTrain!.companions[0].inventory);
    const result = tickDayPausable(s);
    if (!result.pendingEvent) {
      const after = totalFood(result.state.wagonTrain!.companions[0].inventory);
      expect(after).toBeLessThan(before);
    }
  });

  it('rest action advances NPCs (food drains even on rest days)', () => {
    let s = joinTrain(game(), makeRng('j')).state;
    const before = totalFood(s.wagonTrain!.companions[0].inventory);
    s = rest(s, 3);
    const after = totalFood(s.wagonTrain!.companions[0].inventory);
    expect(after).toBeLessThan(before);
  });

  it('NPC wagons accumulate divergent state over many days', () => {
    let s = joinTrain(game(), makeRng('j')).state;
    const startFood = s.wagonTrain!.companions.map((c) => totalFood(c.inventory));
    s = rest(s, 30);
    const endFood = s.wagonTrain!.companions.map((c) => totalFood(c.inventory));
    for (let i = 0; i < startFood.length; i++) {
      expect(endFood[i]).toBeLessThan(startFood[i]);
    }
    // Wagon-to-wagon food levels should diverge — different starting
    // amounts + different consumption (party sizes vary).
    const distinct = new Set(endFood);
    expect(distinct.size).toBeGreaterThan(1);
  });
});
