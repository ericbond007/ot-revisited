import { describe, it, expect } from 'vitest';
import { ITEMS } from '../src/lib/game/content/items';
import { PRICES } from '../src/lib/game/content/prices';
import { OUTFITTER_BUYABLES } from '../src/lib/game/content/outfitter';
import { LANDMARKS } from '../src/lib/game/content/landmarks';
import { applyButterChurn, dailyButterYield } from '../src/lib/game/systems/dairy';
import { tickDayPausable } from '../src/lib/game/engine-pausable';
import { createInitialState } from '../src/lib/game/engine';
import type { GameState } from '../src/lib/game/types';

function newGame(over: Partial<GameState> = {}): GameState {
  const s = createInitialState({
    seed: 'butter-222',
    leader: { name: 'Ezra', profession: 'banker' },
    companions: [{ name: 'Mary', profession: 'banker' }],
    startDate: { year: 1849, month: 6, day: 1 }
  });
  return { ...s, ...over };
}

function withSetup(s: GameState, milk: number, crocks = 1): GameState {
  return {
    ...s,
    inventory: { ...s.inventory, butter_crock: crocks, milk }
  };
}

describe('#222 butter + butter_crock — items & pricing', () => {
  it('butter item exists in food category, fresh-group eligible', () => {
    expect(ITEMS.butter).toBeDefined();
    expect(ITEMS.butter.category).toBe('food');
  });

  it('butter_crock item exists in tool category', () => {
    expect(ITEMS.butter_crock).toBeDefined();
    expect(ITEMS.butter_crock.category).toBe('tool');
  });

  it('both items have buy/sell prices', () => {
    expect(PRICES.butter.buy).toBeGreaterThan(0);
    expect(PRICES.butter_crock.buy).toBeGreaterThan(0);
  });

  it('outfitter stocks butter_crock', () => {
    expect(OUTFITTER_BUYABLES).toContain('butter_crock');
  });

  it('major posts stock butter_crock (Laramie, Hall, Dalles)', () => {
    for (const id of ['ft_laramie', 'ft_hall', 'the_dalles']) {
      const stock = LANDMARKS.find((l) => l.id === id)?.stock ?? [];
      expect(stock).toContain('butter_crock');
    }
  });
});

describe('#222 dailyButterYield', () => {
  it('returns 0 with no crock', () => {
    const s: GameState = { ...newGame(), inventory: { ...newGame().inventory, milk: 10 } };
    expect(dailyButterYield(s)).toBe(0);
  });

  it('returns 0 with no milk', () => {
    const s: GameState = { ...newGame(), inventory: { ...newGame().inventory, butter_crock: 1 } };
    expect(dailyButterYield(s)).toBe(0);
  });

  it('returns 0 with under 2 gal milk', () => {
    const s = withSetup(newGame(), 1);
    expect(dailyButterYield(s)).toBe(0);
  });

  it('returns 1 lb at 2 gal milk', () => {
    const s = withSetup(newGame(), 2);
    expect(dailyButterYield(s)).toBe(1);
  });

  it('returns 2 lb at 4 gal milk', () => {
    const s = withSetup(newGame(), 4);
    expect(dailyButterYield(s)).toBe(2);
  });

  it('returns 3 lb at 7 gal milk (1 gal leftover)', () => {
    const s = withSetup(newGame(), 7);
    expect(dailyButterYield(s)).toBe(3);
  });
});

describe('#222 applyButterChurn', () => {
  it('no-op without crock', () => {
    const s: GameState = { ...newGame(), inventory: { ...newGame().inventory, milk: 10 } };
    expect(applyButterChurn(s)).toBe(s);
  });

  it('no-op with under 2 gal milk', () => {
    const s = withSetup(newGame(), 1);
    expect(applyButterChurn(s)).toBe(s);
  });

  it('2 gal milk → 1 lb butter, milk drops to 0', () => {
    const before = withSetup(newGame(), 2);
    const after = applyButterChurn(before);
    expect(after.inventory.milk).toBe(0);
    expect(after.inventory.butter).toBe(1);
  });

  it('4 gal milk → 2 lb butter, milk drops to 0', () => {
    const before = withSetup(newGame(), 4);
    const after = applyButterChurn(before);
    expect(after.inventory.milk).toBe(0);
    expect(after.inventory.butter).toBe(2);
  });

  it('7 gal milk → 3 lb butter, 1 gal milk left', () => {
    const before = withSetup(newGame(), 7);
    const after = applyButterChurn(before);
    expect(after.inventory.milk).toBe(1);
    expect(after.inventory.butter).toBe(3);
  });

  it('butter accumulates across multiple days', () => {
    let s = { ...withSetup(newGame(), 4), inventory: { ...withSetup(newGame(), 4).inventory, butter: 5 } };
    s = applyButterChurn(s);
    expect(s.inventory.butter).toBe(7); // 5 + 2 from churn
  });

  it('writes a churn log line on production', () => {
    const before = withSetup(newGame(), 4);
    const after = applyButterChurn(before);
    const last = after.eventLog[after.eventLog.length - 1].text;
    expect(last).toMatch(/churn|butter/i);
  });
});

describe('#222 engine wiring — churn lands in tickDayPausable', () => {
  it('travel day with crock + cow + lush grazing produces butter', () => {
    // 2 cows = ~4 gal milk → 2 lb butter, plenty left over after 2 adults' food draw.
    const before: GameState = {
      ...newGame(),
      inventory: {
        ...newGame().inventory,
        milk_cow: 2,
        butter_crock: 1
      }
    };
    const result = tickDayPausable(before);
    expect(result.state.inventory.butter ?? 0).toBeGreaterThan(0);
  });

  it('travel day without crock — no butter even with milk', () => {
    const before: GameState = {
      ...newGame(),
      inventory: {
        ...newGame().inventory,
        milk_cow: 2 // milk yields, no crock to churn
      }
    };
    const result = tickDayPausable(before);
    expect(result.state.inventory.butter ?? 0).toBe(0);
  });

  it('butter is shelf-stable — no spoil flag set', () => {
    const before: GameState = {
      ...newGame(),
      inventory: {
        ...newGame().inventory,
        milk_cow: 2,
        butter_crock: 1
      }
    };
    const result = tickDayPausable(before);
    // No `_butterSpoilDay` flag — butter is salted and shelf-stable.
    expect(result.state.flags._butterSpoilDay).toBeUndefined();
  });
});

describe('#222 churn runs BEFORE consumption', () => {
  it('butter is preserved even when food draw would have eaten the milk', () => {
    // 1 cow yields 2 gal. Without crock, party eats up to 2 lb of milk.
    // With crock, the 2 gal becomes 1 lb butter BEFORE consumption sees it,
    // so consumption then draws from other food piles instead.
    const before: GameState = {
      ...newGame(),
      inventory: {
        ...newGame().inventory,
        milk_cow: 1,
        butter_crock: 1,
        flour: 100
      }
    };
    const result = tickDayPausable(before);
    expect(result.state.inventory.butter ?? 0).toBe(1);
    // Milk should be 0 — it was churned, not drunk.
    expect(result.state.inventory.milk ?? 0).toBe(0);
  });
});
