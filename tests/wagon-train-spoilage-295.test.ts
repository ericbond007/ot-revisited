// #295 — NPC wagon spoilage. Mirrors player applySpoilage +
// applyHeatSpoilage on `NpcWagonState`. Per-pile clocks live on
// `wagon.spoilDays` (Record<itemId, dayNumber>); heat spoilage on
// bacon / salt_pork takes the same daily attrition as the player and
// the bran-barrel mitigation halves the loss.

import { describe, it, expect } from 'vitest';
import {
  setNpcSpoilClock,
  applyNpcSpoilage,
  applyNpcHeatSpoilage,
  GAME_MEAT_FRESH_DAYS,
  BACON_HEAT_LB_PER_DAY,
  SALT_PORK_HEAT_LB_PER_DAY
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
    wagon: { model: 'prairie_schooner', condition: 100, canvas: 100, carryCapacity: 1500, hasBranBarrel: false },
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

describe('applyNpcSpoilage', () => {
  it('no spoilDays object → no-op, no logs', () => {
    const w = fakeWagon({ id: 'a', inventory: { game_meat: 10 } });
    const r = applyNpcSpoilage(w, 5);
    expect(r.wagon).toBe(w);
    expect(r.logs).toEqual([]);
  });

  it('clock not yet reached → pile intact, no log', () => {
    const w = setNpcSpoilClock(
      fakeWagon({ id: 'a', inventory: { game_meat: 25 } }),
      'game_meat',
      5
    );
    const r1 = applyNpcSpoilage(w, 5);
    expect(r1.wagon.inventory.game_meat).toBe(25);
    expect(r1.logs).toEqual([]);
    // Right at the spoil day → rotted (>= triggers).
    const r2 = applyNpcSpoilage(w, 5 + GAME_MEAT_FRESH_DAYS);
    expect(r2.wagon.inventory.game_meat).toBe(0);
    expect(r2.logs.length).toBe(1);
    expect(r2.logs[0]).toMatch(/game meat spoiled/);
  });

  it('zeroed pile + stale clock cleans up the clock without a log', () => {
    let w = fakeWagon({ id: 'a', inventory: { game_meat: 0 } });
    w = setNpcSpoilClock(w, 'game_meat', 5);
    expect(w.spoilDays?.game_meat).toBeDefined();
    const r = applyNpcSpoilage(w, 5);
    expect(r.wagon.spoilDays?.game_meat).toBeUndefined();
    expect(r.logs).toEqual([]);
  });

  it('log lines include the wagon name (so the player knows whose food rotted)', () => {
    const w = setNpcSpoilClock(
      fakeWagon({ id: 's', name: 'the Sager family', inventory: { game_meat: 30 } }),
      'game_meat',
      0
    );
    const r = applyNpcSpoilage(w, GAME_MEAT_FRESH_DAYS);
    expect(r.logs[0]).toMatch(/the Sager family/);
  });

  it('multiple piles spoil independently in one tick', () => {
    let w = fakeWagon({ id: 'a', inventory: { game_meat: 10, berries: 5 } });
    w = setNpcSpoilClock(w, 'game_meat', 0);
    w = setNpcSpoilClock(w, 'berries', 0);
    const r = applyNpcSpoilage(w, GAME_MEAT_FRESH_DAYS);
    expect(r.wagon.inventory.game_meat).toBe(0);
    expect(r.wagon.inventory.berries).toBe(0);
    expect(r.logs.length).toBe(2);
  });
});

describe('applyNpcHeatSpoilage', () => {
  it('non-heat weather → no-op', () => {
    const w = fakeWagon({ id: 'a', inventory: { bacon: 50, salt_pork: 30 } });
    const r = applyNpcHeatSpoilage(w, 'clear');
    expect(r.wagon).toBe(w);
    expect(r.log).toBeNull();
  });

  it('no bacon and no salt_pork → no-op even on heat', () => {
    const w = fakeWagon({ id: 'a', inventory: { flour: 100 } });
    const r = applyNpcHeatSpoilage(w, 'heat');
    expect(r.wagon).toBe(w);
    expect(r.log).toBeNull();
  });

  it('drops bacon + salt_pork at the player rates without bran barrel', () => {
    const w = fakeWagon({
      id: 'a',
      inventory: { bacon: 50, salt_pork: 30 },
      wagon: { model: 'prairie_schooner', condition: 100, canvas: 100, carryCapacity: 1500, hasBranBarrel: false }
    });
    const r = applyNpcHeatSpoilage(w, 'heat');
    // Engine applies Math.round so the salt_pork constant (1.5) lands at 2.
    expect(r.wagon.inventory.bacon).toBe(50 - Math.round(BACON_HEAT_LB_PER_DAY));
    expect(r.wagon.inventory.salt_pork).toBe(30 - Math.round(SALT_PORK_HEAT_LB_PER_DAY));
    expect(r.log).toMatch(/heat/i);
    expect(r.log).toMatch(/bacon/);
    expect(r.log).toMatch(/salt pork/);
  });

  it('bran barrel halves the daily loss', () => {
    const w = fakeWagon({
      id: 'a',
      inventory: { bacon: 50, salt_pork: 30 },
      wagon: { model: 'prairie_schooner', condition: 100, canvas: 100, carryCapacity: 1500, hasBranBarrel: true }
    });
    const r = applyNpcHeatSpoilage(w, 'heat');
    const expectedBaconLoss = Math.round(BACON_HEAT_LB_PER_DAY * 0.5);
    const expectedSaltPorkLoss = Math.round(SALT_PORK_HEAT_LB_PER_DAY * 0.5);
    expect(r.wagon.inventory.bacon).toBe(50 - expectedBaconLoss);
    expect(r.wagon.inventory.salt_pork).toBe(30 - expectedSaltPorkLoss);
  });

  it('floors loss at the held quantity (no negative inventory)', () => {
    const w = fakeWagon({ id: 'a', inventory: { bacon: 1, salt_pork: 1 } });
    const r = applyNpcHeatSpoilage(w, 'heat');
    expect(r.wagon.inventory.bacon).toBe(0);
    expect(r.wagon.inventory.salt_pork).toBe(0);
  });
});

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
