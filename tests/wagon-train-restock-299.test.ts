// #299 NPC food restock at trading posts. Verifies the engine hook
// fires once per (landmark, day), respects cash gate + post tier
// multiplier + per-wagon basket, logs summaries, and is idempotent
// across multiple TownStage hits.

import { describe, it, expect } from 'vitest';
import { applyNpcPostRestock, joinTrain } from '../src/lib/game/systems/wagon-train';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState } from '../src/lib/game/types';

function game(): GameState {
  return createInitialState({
    seed: 'r299',
    leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'doctor' }],
    startDate: { year: 1849, month: 4, day: 15 }
  });
}

function arriveAt(s: GameState, landmarkId: string): GameState {
  return { ...s, location: { ...s.location, atLandmarkId: landmarkId } };
}

describe('#299 — applyNpcPostRestock', () => {
  it('no-op when player not in a train', () => {
    const s = arriveAt(game(), 'ft_kearny');
    const result = applyNpcPostRestock(s);
    expect(result).toBe(s);
  });

  it('no-op when not at any landmark', () => {
    const s = joinTrain(game(), makeRng('r')).state;
    const result = applyNpcPostRestock(s);
    expect(result).toBe(s);
  });

  it('no-op at non-trading-post landmarks (rivers, scenic, end)', () => {
    let s = joinTrain(game(), makeRng('r')).state;
    s = arriveAt(s, 'big_blue_river'); // a river kind
    const result = applyNpcPostRestock(s);
    expect(result.eventLog).toEqual(s.eventLog);
  });

  it('fires at a trading_post — wagons buy food, cash drops, inventory rises', () => {
    let s = joinTrain(game(), makeRng('r')).state;
    s = arriveAt(s, 'ft_kearny');
    // Drop one companion's flour to 0 so it triggers the floor
    s = {
      ...s,
      wagonTrain: {
        ...s.wagonTrain!,
        companions: s.wagonTrain!.companions.map((c, i) =>
          i === 0 ? { ...c, inventory: { ...c.inventory, flour: 0 }, cash: 50 } : c
        )
      }
    };
    const beforeFlour = s.wagonTrain!.companions[0].inventory.flour ?? 0;
    const beforeCash = s.wagonTrain!.companions[0].cash;
    const result = applyNpcPostRestock(s);
    const afterFlour = result.wagonTrain!.companions[0].inventory.flour ?? 0;
    const afterCash = result.wagonTrain!.companions[0].cash;
    expect(afterFlour).toBeGreaterThan(beforeFlour);
    expect(afterCash).toBeLessThan(beforeCash);
  });

  it('skips wagons with cash < $10', () => {
    let s = joinTrain(game(), makeRng('r')).state;
    s = arriveAt(s, 'ft_kearny');
    s = {
      ...s,
      wagonTrain: {
        ...s.wagonTrain!,
        companions: s.wagonTrain!.companions.map((c, i) =>
          i === 0 ? { ...c, inventory: { ...c.inventory, flour: 0 }, cash: 5 } : c
        )
      }
    };
    const before = s.wagonTrain!.companions[0];
    const result = applyNpcPostRestock(s);
    const after = result.wagonTrain!.companions[0];
    expect(after.cash).toBe(before.cash);
    expect(after.inventory.flour ?? 0).toBe(0);
  });

  it('skips wiped / arrived / stranded companions', () => {
    let s = joinTrain(game(), makeRng('r')).state;
    s = arriveAt(s, 'ft_kearny');
    s = {
      ...s,
      wagonTrain: {
        ...s.wagonTrain!,
        companions: s.wagonTrain!.companions.map((c, i) =>
          i === 0 ? { ...c, outcome: 'wiped' as const } : c
        )
      }
    };
    const before = s.wagonTrain!.companions[0];
    const result = applyNpcPostRestock(s);
    const after = result.wagonTrain!.companions[0];
    expect(after.cash).toBe(before.cash);
    expect(after.inventory).toBe(before.inventory);
  });

  it('logs a summary line per restocking wagon naming the post', () => {
    let s = joinTrain(game(), makeRng('r')).state;
    s = arriveAt(s, 'ft_kearny');
    s = {
      ...s,
      wagonTrain: {
        ...s.wagonTrain!,
        companions: s.wagonTrain!.companions.map((c) => ({
          ...c,
          inventory: { ...c.inventory, flour: 0 },
          cash: 50
        }))
      }
    };
    const startLogs = s.eventLog.length;
    const result = applyNpcPostRestock(s);
    const newLogs = result.eventLog.slice(startLogs);
    expect(newLogs.length).toBeGreaterThan(0);
    expect(newLogs[0].text).toMatch(/bought.+at Fort Kearny/i);
  });

  it('idempotent — second call same day returns unchanged state', () => {
    let s = joinTrain(game(), makeRng('r')).state;
    s = arriveAt(s, 'ft_kearny');
    s = {
      ...s,
      wagonTrain: {
        ...s.wagonTrain!,
        companions: s.wagonTrain!.companions.map((c) => ({
          ...c,
          inventory: { ...c.inventory, flour: 0 },
          cash: 50
        }))
      }
    };
    const after1 = applyNpcPostRestock(s);
    const after2 = applyNpcPostRestock(after1);
    expect(after2.eventLog.length).toBe(after1.eventLog.length);
    expect(after2.wagonTrain!.companions[0].cash).toBe(
      after1.wagonTrain!.companions[0].cash
    );
  });

  it('applies post priceMultiplier (Bridger 1.5× gouge)', () => {
    let kearny = joinTrain(game(), makeRng('r')).state;
    let bridger = joinTrain(game(), makeRng('r')).state;
    kearny = arriveAt(kearny, 'ft_kearny');
    bridger = arriveAt(bridger, 'ft_bridger');
    // Equalize companion state in both — same flour=0, cash=200
    const seedCompanions = (s: GameState): GameState => ({
      ...s,
      wagonTrain: {
        ...s.wagonTrain!,
        companions: s.wagonTrain!.companions.map((c, i) =>
          i === 0 ? { ...c, inventory: { ...c.inventory, flour: 0 }, cash: 200 } : c
        )
      }
    });
    kearny = seedCompanions(kearny);
    bridger = seedCompanions(bridger);
    const baseCash = 200;
    const kearnyAfter = applyNpcPostRestock(kearny);
    const bridgerAfter = applyNpcPostRestock(bridger);
    const kearnySpent = baseCash - kearnyAfter.wagonTrain!.companions[0].cash;
    const bridgerSpent = baseCash - bridgerAfter.wagonTrain!.companions[0].cash;
    // Bridger gouges 1.5×, so spent more than Kearny on the same buys
    // (assuming the same buys fit in $200 at both posts).
    expect(bridgerSpent).toBeGreaterThan(kearnySpent);
  });

  it('caps spend at wagon cash on hand (drops tail items if buy list overflows)', () => {
    let s = joinTrain(game(), makeRng('r')).state;
    s = arriveAt(s, 'ft_bridger'); // 1.5× gouge
    s = {
      ...s,
      wagonTrain: {
        ...s.wagonTrain!,
        companions: s.wagonTrain!.companions.map((c, i) =>
          i === 0 ? {
            ...c,
            // Force cautious so #906's shouldTradeAtPost gate passes
            // (cautious gates on cash < 10; balanced gates on < 20).
            personaId: 'cautious' as const,
            inventory: { ...c.inventory, flour: 0, bacon: 0, sugar: 0 },
            cash: 15 // tight budget — won't cover full basket at 1.5×
          } : c
        )
      }
    };
    const result = applyNpcPostRestock(s);
    // Result cash should be ≥ 0 (no overdraft)
    expect(result.wagonTrain!.companions[0].cash).toBeGreaterThanOrEqual(0);
    // Wagon got SOMETHING (at least flour, top priority)
    expect(result.wagonTrain!.companions[0].inventory.flour ?? 0).toBeGreaterThan(0);
  });
});
