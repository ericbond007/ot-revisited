// #295 — NPC wagon spoilage. Mirrors player applySpoilage +
// applyHeatSpoilage on `NpcWagonState`. Per-pile clocks live on
// `wagon.spoilDays` (Record<itemId, dayNumber>); heat spoilage on
// bacon / salt_pork takes the same daily attrition as the player and
// the bran-barrel mitigation halves the loss.

import { describe, it, expect } from 'vitest';
import {
  setNpcSpoilClock,
  GAME_MEAT_FRESH_DAYS
} from '../src/lib/game/systems/spoilage';
import { tickNpcWagon } from '../src/lib/game/systems/npc-engine';
import { hunt } from '../src/lib/game/actions/hunt';
import { joinTrain } from '../src/lib/game/systems/wagon-train';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { NpcWagonState, ProfessionId, GameState } from '../src/lib/game/types';

function fakeWagon(over: Partial<NpcWagonState> & { id: string }): NpcWagonState {
  const base: NpcWagonState = {
    id: over.id,
    name: over.name ?? `the ${over.id} family`,
    leaderProfession: over.leaderProfession ?? 'farmer',
    hasChildren: false,
    seed: over.id,
    party: [
      {
        id: `${over.id}-p`,
        name: 'X',
        kind: 'adult',
        sex: 'male',
        age: 30,
        profession: 'farmer',
        isLeader: true,
        health: 100,
        dead: false,
        conditions: []
      }
    ],
    inventory: {},
    oxen: [{ id: `${over.id}-o`, health: 100, fatigue: 0, shod: true }],
    morale: 70,
    cash: 100,
    wagon: { model: 'prairie_schooner', condition: 100, canvas: 100, carryCapacity: 1500, hasBranBarrel: false, impairment: null },
    eventLog: [],
    outcome: 'in-progress',
    rations: 'normal',
    water: 20,
    dirtyWater: 0,
    waterCap: 20,
    dryDays: 0
  };
  return { ...base, ...over };
}

describe('setNpcSpoilClock', () => {
  it('records the spoil day for a known item', () => {
    const w = fakeWagon({ id: 'a', inventory: { game_meat: 50 } });
    const after = setNpcSpoilClock(w, 'game_meat', 10);
    expect(after.spoilDays?.game_meat).toBe(10 + GAME_MEAT_FRESH_DAYS);
  });

  it('refreshes the clock when called again (later add resets the timer)', () => {
    let w = fakeWagon({ id: 'a', inventory: { game_meat: 30 } });
    w = setNpcSpoilClock(w, 'game_meat', 5);
    expect(w.spoilDays?.game_meat).toBe(5 + GAME_MEAT_FRESH_DAYS);
    w = setNpcSpoilClock(w, 'game_meat', 12);
    expect(w.spoilDays?.game_meat).toBe(12 + GAME_MEAT_FRESH_DAYS);
  });

  it('honors daysOverride for weather-sensitive piles (e.g. milk)', () => {
    const w = fakeWagon({ id: 'a', inventory: { milk: 2 } });
    const after = setNpcSpoilClock(w, 'milk', 10, 1); // heat-day milk
    expect(after.spoilDays?.milk).toBe(11);
  });

  it('no-ops on unknown item', () => {
    const w = fakeWagon({ id: 'a' });
    const after = setNpcSpoilClock(w, 'unicorn_steak', 10);
    expect(after.spoilDays).toBeUndefined();
  });
});

// #939b — applyNpcSpoilage + applyNpcHeatSpoilage parallel impls
// removed. The mechanic now runs through the engine's `applySpoilage`
// + `applyHeatSpoilage` via the wagon-synth helper inside
// `tickNpcWagon`. The end-to-end tests below + the engine-side
// spoilage suite cover the same behavior — the wagon-name suffix on
// player news is now applied in `tickNpcWagon` after the engine
// returns its `eventLog` deltas.

describe('tickNpcWagon — spoilage wired into the daily pipeline', () => {
  it('rotted meat is gone before food consumption fires (no eating spoiled food)', () => {
    let w = fakeWagon({
      id: 'a',
      inventory: { game_meat: 50 } // only food
    });
    w = setNpcSpoilClock(w, 'game_meat', 0);
    const r = tickNpcWagon(w, { day: GAME_MEAT_FRESH_DAYS, traveled: true, pace: 'moderate', terrain: 'prairie', weather: 'clear' }, makeRng('a'));
    // Meat zeroed by spoilage; food consumption then sees no food →
    // starvation onset begins. The patient took an HP hit from
    // starvation but didn't eat poisoned game.
    expect(r.wagon.inventory.game_meat).toBe(0);
    // Player log records the spoilage.
    expect(r.playerLogs.some((l) => /game meat spoiled/i.test(l))).toBe(true);
  });

  it('heat-day attrition runs through the tick (bacon drops without eating it)', () => {
    const w = fakeWagon({
      id: 'a',
      inventory: { bacon: 50, flour: 200 } // flour as alternative food so the bacon isn't consumed
    });
    const r = tickNpcWagon(w, { day: 1, traveled: true, pace: 'moderate', terrain: 'prairie', weather: 'heat' }, makeRng('h'));
    // Bacon dropped by heat. Flour drop reflects normal food consumption.
    expect(r.wagon.inventory.bacon).toBeLessThan(50);
    expect(r.playerLogs.some((l) => /heat/i.test(l))).toBe(true);
  });

  it('clear-weather travel day with old game_meat clock still in window → meat survives', () => {
    let w = fakeWagon({ id: 'a', inventory: { game_meat: 30, flour: 100 } });
    w = setNpcSpoilClock(w, 'game_meat', 0);
    const r = tickNpcWagon(w, { day: 1, traveled: true, pace: 'moderate', terrain: 'prairie', weather: 'clear' }, makeRng('q'));
    // Meat consumed (it's first in FOOD_DRAW_ORDER) but not spoiled.
    // game_meat may drop a bit from consumption but should NOT be 0
    // unless the wagon ate the whole 30 lb in one tick (unlikely with
    // 1 eater on normal rations = 2 lb).
    expect(r.wagon.inventory.game_meat).toBeGreaterThan(0);
  });
});

describe('#294 + #295 integration — company hunt sets the spoil clock on receivers', () => {
  function game(): GameState {
    return createInitialState({
      seed: 'h295',
      leader: { name: 'L', profession: 'hunter' },
      companions: [{ name: 'C', profession: 'doctor' }],
      startDate: { year: 1849, month: 4, day: 15 }
    });
  }
  function stockedHunter(): GameState {
    const s = game();
    return {
      ...s,
      inventory: {
        ...s.inventory,
        rifle: 1,
        gunpowder: 50,
        lead_balls: 50,
        percussion_caps: 50
      }
    };
  }

  it('after a company hunt, every receiving companion has spoilDays.game_meat set', () => {
    let s = stockedHunter();
    s = joinTrain(s, makeRng('jt')).state;
    const dayBeforeHunt = s.day;
    const after = hunt(s, { target: 'big', ammo: 'heavy', hunters: 2, mode: 'company' });
    const receivers = after.wagonTrain!.companions.filter(
      (c) => c.outcome === 'in-progress' && (c.inventory.game_meat ?? 0) > 0
    );
    expect(receivers.length).toBeGreaterThan(0);
    // hunt() advances the day at the end; the spoil clock is set
    // BEFORE that advance, anchored to the kill day.
    for (const c of receivers) {
      expect(c.spoilDays?.game_meat).toBe(dayBeforeHunt + GAME_MEAT_FRESH_DAYS);
    }
  });

  it('non-receivers (no game_meat share) do NOT have a spoil clock set', () => {
    let s = stockedHunter();
    s = joinTrain(s, makeRng('jt')).state;
    // Solo hunt — no companion gets meat.
    const after = hunt(s, { target: 'big', ammo: 'heavy', hunters: 2, mode: 'solo' });
    for (const c of after.wagonTrain!.companions) {
      expect(c.spoilDays?.game_meat).toBeUndefined();
    }
  });
});
