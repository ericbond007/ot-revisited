import { describe, it, expect } from 'vitest';
import { applyEggLay } from '../src/lib/game/systems/eggs';
import { trade } from '../src/lib/game/actions/trade';
import { createInitialState } from '../src/lib/game/engine';
import { getWagon } from '../src/lib/game/content/wagons';
import type { GameState } from '../src/lib/game/types';

function newGame(wagonModel: 'light' | 'prairie_schooner' | 'heavy' = 'prairie_schooner'): GameState {
  return createInitialState({
    seed: 'chicken-test',
    leader: { name: 'A', profession: 'merchant' },
    companions: [{ name: 'B', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 },
    wagonModel
  });
}

describe('chickens', () => {
  it('applyEggLay yields 1 egg per 2 hens per day', () => {
    const s = { ...newGame(), inventory: { ...newGame().inventory, chicken: 4 } };
    const out = applyEggLay(s);
    expect(out.inventory.egg).toBe(2);
  });

  it('applyEggLay is a no-op with no chickens', () => {
    const s = newGame();
    const out = applyEggLay(s);
    expect(out.inventory.egg).toBeUndefined();
  });

  it('applyEggLay yields 0 with only 1 hen (needs a pair to average out)', () => {
    const s = { ...newGame(), inventory: { ...newGame().inventory, chicken: 1 } };
    const out = applyEggLay(s);
    // floor(1/2) = 0
    expect(out.inventory.egg).toBeUndefined();
  });

  it('wagon models have distinct chicken caps (light < prairie < heavy)', () => {
    expect(getWagon('light').chickenCap).toBeLessThan(getWagon('prairie_schooner').chickenCap);
    expect(getWagon('prairie_schooner').chickenCap).toBeLessThan(getWagon('heavy').chickenCap);
  });

  it('trade() rejects chicken buys that exceed the wagon coop cap', () => {
    // Prairie cap = 5. Start with 3 owned, try to buy 3 more = 6. Should throw.
    const s: GameState = {
      ...newGame('prairie_schooner'),
      cash: 100,
      inventory: { ...newGame().inventory, chicken: 3 }
    };
    expect(() => trade(s, { buys: [{ item: 'chicken', qty: 3 }] })).toThrow(/coop/i);
  });

  it('trade() allows chicken buys within the cap', () => {
    const s: GameState = {
      ...newGame('prairie_schooner'),
      cash: 100,
      inventory: { ...newGame().inventory, chicken: 3 }
    };
    // Cap 5, own 3 → can buy 2.
    const out = trade(s, { buys: [{ item: 'chicken', qty: 2 }] });
    expect(out.inventory.chicken).toBe(5);
  });

  it('trade() lets you sell chickens to make room before buying more', () => {
    // At cap. Sell 2, buy 3. Net: -2 + 3 = +1, ending at 6 > cap (5) → throw.
    // But sell 3, buy 3 → same count, should succeed.
    const s: GameState = {
      ...newGame('prairie_schooner'),
      cash: 100,
      inventory: { ...newGame().inventory, chicken: 5 }
    };
    const out = trade(s, {
      buys: [{ item: 'chicken', qty: 3 }],
      sells: [{ item: 'chicken', qty: 3 }]
    });
    expect(out.inventory.chicken).toBe(5);
  });
});
