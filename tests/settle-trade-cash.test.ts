import { describe, it, expect } from 'vitest';
import { settleTrade } from '../src/lib/game/systems/settle-trade';
import { createInitialState } from '../src/lib/game/engine';
import { restockPostIfDue } from '../src/lib/game/systems/post-stock';
import { getLandmark } from '../src/lib/game/content/landmarks';
import type { GameState } from '../src/lib/game/types';

function atPost(id: string, over: Partial<GameState> = {}): GameState {
  const s0 = createInitialState({
    seed: 'settle-test',
    leader: { name: 'A', profession: 'farmer', sex: 'male' },
    companions: [{ name: 'B', profession: 'farmer', sex: 'female' }],
    startDate: { year: 1850, month: 6, day: 15 },
    includeStarterKit: true
  });
  let s: GameState = { ...s0, cash: 200, location: { ...s0.location, atLandmarkId: id }, ...over };
  s = restockPostIfDue(s, getLandmark(id));
  return s;
}

describe('settleTrade — cash mode', () => {
  it('cash buy debits cash, adds goods, decrements stock', () => {
    const s = atPost('ft_kearny');
    const r = settleTrade(s, { mode: 'cash', get: { flour: 10 }, give: {} });
    expect(r.state.inventory.flour).toBe((s.inventory.flour ?? 0) + 10);
    expect(r.netCash).toBeGreaterThan(0);
    expect(r.state.cash).toBe(s.cash - r.netCash);
  });
  it('cash sell at a cash post credits cash', () => {
    const s = atPost('ft_kearny');
    const s2 = { ...s, inventory: { bacon: 5 } };
    const r = settleTrade(s2, { mode: 'cash', get: {}, give: { bacon: 5 } });
    expect(r.state.inventory.bacon ?? 0).toBe(0);
    expect(r.netCash).toBeLessThan(0);
    expect(r.state.cash).toBeGreaterThan(s2.cash);
  });
  it('cash sell at a NO-cash post throws', () => {
    const s = { ...atPost('ft_hall'), inventory: { bacon: 5 } };
    expect(() => settleTrade(s, { mode: 'cash', get: {}, give: { bacon: 5 } })).toThrow(/won't buy/i);
  });
  it('nothing-gained guard: empty get + no cash in throws', () => {
    const s = { ...atPost('ft_kearny'), inventory: { bacon: 0 } };
    expect(() => settleTrade(s, { mode: 'cash', get: {}, give: {} })).toThrow(/nothing gained/i);
  });
  it('insufficient cash throws', () => {
    const s = atPost('ft_kearny', { cash: 1 });
    expect(() => settleTrade(s, { mode: 'cash', get: { flour: 50 }, give: {} })).toThrow(/not enough cash/i);
  });
  it('out-of-stock get throws', () => {
    const s = atPost('ft_kearny');
    expect(() => settleTrade(s, { mode: 'cash', get: { flour: 99999 }, give: {} })).toThrow(/out of stock/i);
  });
});

describe('settleTrade — waterCap recompute', () => {
  // ft_laramie stocks water_bag (confirmed in landmarks.ts line 383)
  // and buysForCashFromYear: 1849, so year 1850 enables cash sells.
  // prairie_schooner baseWaterCapGal = 20; WATER_BAG_GAL = 5.
  // Buy 2 water_bags → waterCap should rise by 2 * 5 = 10.
  it('buying water_bags raises waterCap by WATER_BAG_GAL each', () => {
    const s = atPost('ft_laramie', { inventory: {} });
    const capBefore = s.resources.waterCap;
    const r = settleTrade(s, { mode: 'cash', get: { water_bag: 2 }, give: {} });
    expect(r.state.resources.waterCap).toBe(capBefore + 10);
  });

  it('selling water_bags lowers waterCap and clamps water if needed', () => {
    // Start with 3 water_bags; cap = 20 + 15 = 35. Water = 35.
    // Sell 2 water_bags → new cap = 20 + 5 = 25; water clamped to 25.
    const s = atPost('ft_laramie', {
      inventory: { water_bag: 3 },
      resources: { water: 35, waterCap: 35, firewood: 20 }
    });
    const r = settleTrade(s, { mode: 'cash', get: {}, give: { water_bag: 2 } });
    expect(r.state.resources.waterCap).toBe(25);
    expect(r.state.resources.water).toBe(25);
  });
});

describe('settleTrade — chicken coop cap', () => {
  // prairie_schooner chickenCap = 5 (confirmed in wagons.ts).
  // ft_kearny stocks chicken (confirmed in landmarks.ts line 304).
  it('buying more chickens than the coop fits throws', () => {
    // Start with 0 chickens; try to buy 6 (cap is 5).
    const s = atPost('ft_kearny', { inventory: {} });
    expect(() =>
      settleTrade(s, { mode: 'cash', get: { chicken: 6 }, give: {} })
    ).toThrow(/coop is full/i);
  });

  it('buying exactly chickenCap chickens succeeds', () => {
    const s = atPost('ft_kearny', { inventory: {} });
    const r = settleTrade(s, { mode: 'cash', get: { chicken: 5 }, give: {} });
    expect(r.state.inventory.chicken).toBe(5);
  });

  it('selling some chickens then buying up to the cap succeeds', () => {
    // Own 4, sell 2, buy 3 → net 5 which equals cap exactly.
    const s = atPost('ft_kearny', { inventory: { chicken: 4 } });
    const r = settleTrade(s, { mode: 'cash', get: { chicken: 3 }, give: { chicken: 2 } });
    expect(r.state.inventory.chicken).toBe(5);
  });
});

describe('settleTrade — excludeBuyCategories', () => {
  // hollenberg_ranch: buysForCash=true, excludeBuyCategories=['native_trade'],
  // abandonedBeforeYear=1857 (settleTrade does not gate on abandonment — UI concern).
  // raw_hide has category 'native_trade' and a price entry (prices.ts line 61).
  it('selling a native_trade item at a post that excludes it throws', () => {
    const s = atPost('hollenberg_ranch', { inventory: { raw_hide: 5 } });
    expect(() =>
      settleTrade(s, { mode: 'cash', get: {}, give: { raw_hide: 5 } })
    ).toThrow(/won't buy/i);
  });
});
