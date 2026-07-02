import { describe, it, expect } from 'vitest';
import { ITEMS, foodItemIds, foodLb, shelfStableFoodIds, shelfStableFoodLb } from '../src/lib/game/content/items';
import { NUTRITION_GROUP } from '../src/lib/game/systems/consumption';

// #1642 — the AI layer's food sums are catalog-derived. These tests guard
// the invariants so a future food item can't silently miss a layer again
// (the original bug: bundle.ts and personas.ts each hand-typed a subset
// that drifted from the catalog and from each other).

describe('#1642 canonical food accounting', () => {
  it('foodLb sums exactly the engine draw list', () => {
    const ids = foodItemIds();
    const inv: Record<string, number> = {};
    for (const id of ids) inv[id] = 2;
    inv.rifle = 5; // non-food must not count
    inv.tent = 3;
    expect(foodLb(inv)).toBe(ids.length * 2);
  });

  it('shelf-stable subset is exactly foodDrawOrder >= 1', () => {
    const stable = new Set(shelfStableFoodIds());
    for (const id of foodItemIds()) {
      const order = ITEMS[id as keyof typeof ITEMS].foodDrawOrder!;
      expect(stable.has(id)).toBe(order >= 1);
    }
  });

  it('tier-0 perishables are excluded from shelf-stable sums', () => {
    const inv = { game_meat: 40, berries: 10, milk: 6, flour: 25, jerky: 5 };
    expect(foodLb(inv)).toBe(86);
    expect(shelfStableFoodLb(inv)).toBe(30); // flour + jerky only
  });

  it('every NUTRITION_GROUP key is engine-edible (catalog-drift guard)', () => {
    const edible = new Set(foodItemIds());
    for (const key of Object.keys(NUTRITION_GROUP)) {
      expect(edible.has(key), `${key} is in NUTRITION_GROUP but has no foodDrawOrder`).toBe(true);
    }
  });

  it('shelf-stable ids are a strict subset of the draw list', () => {
    const all = new Set(foodItemIds());
    for (const id of shelfStableFoodIds()) expect(all.has(id)).toBe(true);
    expect(shelfStableFoodIds().length).toBeLessThan(foodItemIds().length);
  });
});
