import { describe, it, expect } from 'vitest';
import { ITEMS } from '../src/lib/game/content/items';
import { PRICES } from '../src/lib/game/content/prices';
import { OUTFITTER_BUYABLES } from '../src/lib/game/content/outfitter';
import { LANDMARKS } from '../src/lib/game/content/landmarks';
import { applyDairy, dailyMilkYield } from '../src/lib/game/systems/dairy';
import { applySpoilage } from '../src/lib/game/systems/spoilage';
import { milesPerDay } from '../src/lib/game/systems/travel';
import { getCampAction } from '../src/lib/game/actions/camp-actions';
import { tickDayPausable } from '../src/lib/game/engine-pausable';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState, Weather } from '../src/lib/game/types';

function newGame(over: Partial<GameState> = {}): GameState {
  const s = createInitialState({
    seed: 'milk-cow-139',
    leader: { name: 'Ezra', profession: 'banker' },
    companions: [{ name: 'Mary', profession: 'banker' }],
    startDate: { year: 1849, month: 6, day: 1 } // summer prairie = lush grass
  });
  return { ...s, ...over };
}

function withCow(s: GameState, cows = 1): GameState {
  return { ...s, inventory: { ...s.inventory, milk_cow: cows } };
}

describe('#139 milk cow — items & pricing', () => {
  it('milk_cow item exists in livestock category', () => {
    expect(ITEMS.milk_cow).toBeDefined();
    expect(ITEMS.milk_cow.category).toBe('livestock');
    expect(ITEMS.milk_cow.weightLbPerUnit).toBe(0); // walks tethered
  });

  it('milk item exists in food category with foodDrawOrder 0.6', () => {
    expect(ITEMS.milk).toBeDefined();
    expect(ITEMS.milk.category).toBe('food');
    expect(ITEMS.milk.foodDrawOrder).toBe(0.6);
  });

  it('cheese item exists, shelf-stable food', () => {
    expect(ITEMS.cheese).toBeDefined();
    expect(ITEMS.cheese.category).toBe('food');
  });

  it('cheese_press tool item exists', () => {
    expect(ITEMS.cheese_press).toBeDefined();
    expect(ITEMS.cheese_press.category).toBe('tool');
  });

  it('all four items have buy/sell prices', () => {
    expect(PRICES.milk_cow.buy).toBeGreaterThan(0);
    expect(PRICES.milk.buy).toBeGreaterThan(0);
    expect(PRICES.cheese.buy).toBeGreaterThan(0);
    expect(PRICES.cheese_press.buy).toBeGreaterThan(0);
  });

  it('outfitter stocks milk_cow and cheese_press', () => {
    expect(OUTFITTER_BUYABLES).toContain('milk_cow');
    expect(OUTFITTER_BUYABLES).toContain('cheese_press');
  });

  it('major posts stock milk_cow + cheese_press (Laramie, Hall, Dalles)', () => {
    for (const id of ['ft_laramie', 'ft_hall', 'the_dalles']) {
      const stock = LANDMARKS.find((l) => l.id === id)?.stock ?? [];
      expect(stock).toContain('milk_cow');
      expect(stock).toContain('cheese_press');
    }
  });
});

describe('#139 daily milk yield — grazing & weather', () => {
  it('no cow → no milk', () => {
    expect(dailyMilkYield(newGame())).toBe(0);
  });

  it('1 cow on lush summer prairie yields ~2 gal', () => {
    // Prairie grazing 1.0 × dormant 1.0 (June) × cow base 2 = 2 gal.
    const yieldGal = dailyMilkYield(withCow(newGame(), 1));
    expect(yieldGal).toBe(2);
  });

  it('2 cows roughly double yield on the same grass', () => {
    const one = dailyMilkYield(withCow(newGame(), 1));
    const two = dailyMilkYield(withCow(newGame(), 2));
    expect(two).toBeGreaterThanOrEqual(one * 2 - 1);
    expect(two).toBeLessThanOrEqual(one * 2 + 1);
  });

  it('heat days drop yield ~30%', () => {
    const lush: GameState = withCow({ ...newGame(), weather: 'clear' });
    const hot: GameState = withCow({ ...newGame(), weather: 'heat' });
    expect(dailyMilkYield(hot)).toBeLessThan(dailyMilkYield(lush));
  });

  it('desert grazing dries the cow', () => {
    // Desert grazing is ~0.3 × no dormant penalty in summer = 0.3 → still some milk.
    // Mountains grazing is ~0.5; dormant winter halves to 0.25 → below threshold.
    const winterMtn: GameState = withCow({
      ...newGame(),
      location: { ...newGame().location, terrain: 'mountains' },
      date: { year: 1849, month: 1, day: 15 } // dormant
    });
    expect(dailyMilkYield(winterMtn)).toBe(0);
  });
});

describe('#139 applyDairy adds to inventory + sets spoil clock', () => {
  it('applyDairy adds today\'s milk to inventory', () => {
    const before = withCow(newGame());
    const after = applyDairy(before);
    expect(after.inventory.milk).toBeGreaterThan(0);
  });

  it('applyDairy sets _milkSpoilDay flag', () => {
    const before = withCow(newGame());
    const after = applyDairy(before);
    expect(typeof after.flags._milkSpoilDay).toBe('number');
  });

  it('heat day sets a 1-day spoil window', () => {
    const before = withCow({ ...newGame(), weather: 'heat', day: 100 });
    const after = applyDairy(before);
    expect(after.flags._milkSpoilDay).toBe(101);
  });

  it('moderate weather sets a 2-day spoil window', () => {
    const before = withCow({ ...newGame(), weather: 'clear', day: 100 });
    const after = applyDairy(before);
    expect(after.flags._milkSpoilDay).toBe(102);
  });

  it('frost / snow set a 4-day spoil window', () => {
    const frost = applyDairy(withCow({ ...newGame(), weather: 'frost', day: 100 }));
    expect(frost.flags._milkSpoilDay).toBe(104);
    const snow = applyDairy(withCow({ ...newGame(), weather: 'snow', day: 100 }));
    expect(snow.flags._milkSpoilDay).toBe(104);
  });

  it('no cow → applyDairy is a no-op', () => {
    const before = newGame();
    const after = applyDairy(before);
    expect(after).toBe(before);
  });
});

describe('#139 milk spoilage tick clears the pile when expired', () => {
  it('milk past spoil day is zeroed', () => {
    const seeded: GameState = {
      ...newGame(),
      day: 105,
      inventory: { ...newGame().inventory, milk: 5 },
      flags: { ...newGame().flags, _milkSpoilDay: 102 } // expired 3 days ago
    };
    const after = applySpoilage(seeded);
    expect(after.inventory.milk).toBe(0);
  });

  it('milk still within window is preserved', () => {
    const seeded: GameState = {
      ...newGame(),
      day: 100,
      inventory: { ...newGame().inventory, milk: 3 },
      flags: { ...newGame().flags, _milkSpoilDay: 102 }
    };
    const after = applySpoilage(seeded);
    expect(after.inventory.milk).toBe(3);
  });
});

describe('#139 pace tax — milk cow slows the wagon', () => {
  it('1 cow drops miles by ~5% vs no cow', () => {
    const without = milesPerDay(newGame());
    const oneCow = milesPerDay(withCow(newGame(), 1));
    expect(oneCow).toBeLessThan(without);
    expect(oneCow / without).toBeGreaterThan(0.94);
    expect(oneCow / without).toBeLessThan(0.96);
  });

  it('2 cows hit -10% (capped)', () => {
    const without = milesPerDay(newGame());
    const twoCows = milesPerDay(withCow(newGame(), 2));
    expect(twoCows / without).toBeGreaterThan(0.89);
    expect(twoCows / without).toBeLessThan(0.91);
  });

  it('4 cows still cap at -10%', () => {
    const two = milesPerDay(withCow(newGame(), 2));
    const four = milesPerDay(withCow(newGame(), 4));
    expect(four).toBe(two);
  });
});

describe('#139 cheese press camp action', () => {
  const action = getCampAction('press_cheese');

  it('is registered with a 2-hour cost', () => {
    expect(action.id).toBe('press_cheese');
    expect(action.hourCost).toBe(2);
  });

  it('not available without a cheese press', () => {
    const s: GameState = {
      ...newGame(),
      inventory: { ...newGame().inventory, milk: 5 }
    };
    expect(action.availability(s).available).toBe(false);
  });

  it('not available without ≥2 gal milk', () => {
    const s: GameState = {
      ...newGame(),
      inventory: { ...newGame().inventory, cheese_press: 1, milk: 1 }
    };
    expect(action.availability(s).available).toBe(false);
  });

  it('available with both press and 2+ gal milk', () => {
    const s: GameState = {
      ...newGame(),
      inventory: { ...newGame().inventory, cheese_press: 1, milk: 3 }
    };
    expect(action.availability(s).available).toBe(true);
  });

  it('press consumes 2 gal milk and yields 2 lb cheese', () => {
    const s: GameState = {
      ...newGame(),
      inventory: { ...newGame().inventory, cheese_press: 1, milk: 5 }
    };
    const after = action.apply(s, makeRng('press'));
    expect(after.inventory.milk).toBe(3);
    expect(after.inventory.cheese).toBe(2);
  });

  it('logs a press line', () => {
    const s: GameState = {
      ...newGame(),
      inventory: { ...newGame().inventory, cheese_press: 1, milk: 5 }
    };
    const after = action.apply(s, makeRng('press'));
    const last = after.eventLog[after.eventLog.length - 1].text;
    expect(last).toMatch(/curd|cheese|press/i);
  });

  it('cheese accumulates across multiple presses', () => {
    let s: GameState = {
      ...newGame(),
      inventory: { ...newGame().inventory, cheese_press: 1, milk: 6 }
    };
    s = action.apply(s, makeRng('a'));
    s = action.apply(s, makeRng('b'));
    expect(s.inventory.milk).toBe(2);
    expect(s.inventory.cheese).toBe(4);
  });
});

describe('#139 engine wiring — applyDairy in tickDayPausable', () => {
  it('a tick advances milk inventory when many cows yield more than the party drinks', () => {
    // 5 cows on lush summer prairie = ~10 gal yield, 2 adults at normal
    // rations ≈ 4 lb consumption, so milk should remain after the tick.
    const before = withCow({ ...newGame(), weather: 'clear', pace: 'slow' }, 5);
    const result = tickDayPausable(before);
    const milkAfter = result.state.inventory.milk ?? 0;
    expect(milkAfter).toBeGreaterThan(0);
  });
});

describe('#139 milk counts as fresh nutrition group', () => {
  it('milk in NUTRITION_GROUP gives the variety bonus when paired with starch', async () => {
    const { applyDietVariety } = await import('../src/lib/game/systems/diet');
    // The diet system reads _lastFoodGroups (set by applyDailyConsumption).
    // Two distinct groups → +1 morale.
    // _lastFoodGroups is read via `as unknown as string[]` cast in diet.ts;
    // the GameState['flags'] type doesn't model arrays, so cast here too.
    const s: GameState = {
      ...newGame(),
      morale: 50,
      flags: {
        ...newGame().flags,
        _lastFoodGroups: ['starch', 'fresh'] as unknown as Record<string, unknown>
      }
    };
    const after = applyDietVariety(s);
    expect(after.morale).toBe(51);
  });
});
