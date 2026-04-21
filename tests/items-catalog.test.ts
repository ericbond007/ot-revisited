import { describe, it, expect } from 'vitest';
import { ITEMS, getItem, foodItemIds } from '../src/lib/game/content/items';
import { PRICES } from '../src/lib/game/content/prices';

const REQUIRED_FOOD_IDS = ['flour', 'bacon', 'beans', 'hardtack', 'sugar', 'coffee', 'tea', 'dried_fruit', 'pemmican'];

describe('item catalog', () => {
  it('includes every required food id', () => {
    const foods = foodItemIds();
    for (const id of REQUIRED_FOOD_IDS) {
      expect(foods).toContain(id);
    }
  });

  it('includes core non-food items', () => {
    const ids = Object.keys(ITEMS);
    ['wagon', 'ox', 'yoke', 'rifle', 'bullets', 'shovel', 'bible', 'quinine', 'laudanum', 'bandages'].forEach((id) => {
      expect(ids).toContain(id);
    });
  });

  it('every item has a name + category', () => {
    for (const item of Object.values(ITEMS)) {
      expect(item.name).toBeTruthy();
      expect(item.category).toBeTruthy();
    }
  });

  it('getItem throws for unknown ids', () => {
    expect(() => getItem('phlogiston')).toThrow();
  });

  it('foodItemIds returns only items flagged as food', () => {
    for (const id of foodItemIds()) {
      expect(ITEMS[id].category).toBe('food');
    }
  });
});

describe('prices cover the catalog', () => {
  it('every non-abstract item has a price entry', () => {
    const skipped = new Set(['wagon']);
    for (const [id, item] of Object.entries(ITEMS)) {
      if (skipped.has(id)) continue;
      if (item.category === 'livestock' && id !== 'yoke') continue; // ox is sold via a dedicated flow
      expect(PRICES[id], `missing price for ${id}`).toBeDefined();
    }
  });
});
