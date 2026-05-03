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
    const { wagon: next } = tickNpcWagon(
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
    for (let i = 0; i < 5; i++) {
      wagon = tickNpcWagon(
        wagon,
        { day: i + 1, traveled: true, pace: 'moderate', terrain: 'prairie' },
        makeRng('tt' + i)
      ).wagon;
    }
    const traveled = wagon.oxen[0].fatigue;
    expect(traveled).toBeGreaterThan(0);

    for (let i = 0; i < 3; i++) {
      wagon = tickNpcWagon(
        wagon,
        { day: 6 + i, traveled: false, pace: 'moderate', terrain: 'prairie' },
        makeRng('rr' + i)
      ).wagon;
    }
    expect(wagon.oxen[0].fatigue).toBeLessThan(traveled);
  });

  it('starves the party when food runs out', () => {
    const train = freshTrain();
    let wagon: NpcWagonState = { ...train.companions[0], inventory: {} };
    const startHp = wagon.party[0].health;
    for (let i = 0; i < 5; i++) {
      wagon = tickNpcWagon(
        wagon,
        { day: i + 1, traveled: true, pace: 'moderate', terrain: 'prairie' },
        makeRng('s' + i)
      ).wagon;
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
    for (let i = 0; i < 4; i++) {
      wagon = tickNpcWagon(
        wagon,
        { day: i + 1, traveled: true, pace: 'moderate', terrain: 'prairie' },
        makeRng('d' + i)
      ).wagon;
    }
    const dead = wagon.party.filter((p) => p.dead);
    expect(dead.length).toBeGreaterThan(0);
    expect(wagon.eventLog.some((e) => /died|trail took|too young/i.test(e.text))).toBe(true);
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
      ).wagon;
    }
    expect(wagon.outcome).toBe('wiped');
    const sealed = tickNpcWagon(
      wagon,
      { day: 99, traveled: true, pace: 'moderate', terrain: 'prairie' },
      makeRng('post')
    );
    expect(sealed.wagon).toBe(wagon);
    expect(sealed.playerLogs).toEqual([]);
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
    ).wagon;
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
    const distinct = new Set(endFood);
    expect(distinct.size).toBeGreaterThan(1);
  });
});

describe('#280c — NPC events bubble to player eventLog', () => {
  it('over a 60-day rest, the train fires events that surface on the player eventLog', () => {
    let s = joinTrain(game(), makeRng('events-1')).state;
    const startLogLen = s.eventLog.length;
    s = rest(s, 60);
    const newEntries = s.eventLog.slice(startLogLen);
    // Filter for entries that look like NPC news (mention a "wagon" or
    // a family-style label "the X family"). Not every rest day fires
    // events but ~60 days × N wagons × 6% should produce several.
    const npcNews = newEntries.filter((e) =>
      /wagon|family|brothers|party/i.test(e.text)
    );
    expect(npcNews.length).toBeGreaterThan(0);
  });

  it('event-driven wagon damage and condition changes persist on the wagon state', () => {
    // Force the dice — feed a deterministic seed and rest a long time.
    let s = joinTrain(game(), makeRng('events-2')).state;
    const beforeWagons = s.wagonTrain!.companions.map((c) => ({
      condition: c.wagon.condition,
      conditions: c.party.flatMap((p) => p.conditions.map((co) => co.id))
    }));
    s = rest(s, 120);
    const afterWagons = s.wagonTrain!.companions.map((c) => ({
      condition: c.wagon.condition,
      conditions: c.party.flatMap((p) => p.conditions.map((co) => co.id))
    }));
    // At least one wagon should have lost some condition (wheel
    // breaks, ox lameness, etc.) OR picked up a disease condition
    // somewhere in the party.
    const someChange = afterWagons.some((after, i) =>
      after.condition < beforeWagons[i].condition
      || after.conditions.length > beforeWagons[i].conditions.length
    );
    expect(someChange).toBe(true);
  });

  it('finished wagons (outcome != in-progress) do not fire further events', () => {
    let s = joinTrain(game(), makeRng('events-3')).state;
    // Wipe one companion manually — set outcome=wiped and party dead.
    s = {
      ...s,
      wagonTrain: {
        ...s.wagonTrain!,
        companions: s.wagonTrain!.companions.map((c, i) =>
          i === 0
            ? { ...c, outcome: 'wiped' as const, party: c.party.map((p) => ({ ...p, dead: true, health: 0 })) }
            : c
        )
      }
    };
    const beforeWagon0 = s.wagonTrain!.companions[0];
    s = rest(s, 30);
    const afterWagon0 = s.wagonTrain!.companions[0];
    // Wiped wagon's state is frozen — no inventory change, no
    // condition adds, no event log entries.
    expect(afterWagon0.inventory).toEqual(beforeWagon0.inventory);
    expect(afterWagon0.party.every((p) => p.dead)).toBe(true);
    expect(afterWagon0.outcome).toBe('wiped');
  });
});
