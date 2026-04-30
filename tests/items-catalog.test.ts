import { describe, it, expect } from 'vitest';
import { ITEMS, getItem, foodItemIds } from '../src/lib/game/content/items';
import { PRICES } from '../src/lib/game/content/prices';

// Items in the calorie-draw pipeline. Coffee/tea are deliberately
// excluded after #110 — they're consumed separately by applyHotDrinks
// (~1 lb per 5 brew-days), not as regular calories.
const REQUIRED_FOOD_IDS = ['flour', 'bacon', 'beans', 'hardtack', 'sugar', 'dried_fruit', 'pemmican'];

describe('item catalog', () => {
  it('includes every required food id', () => {
    const foods = foodItemIds();
    for (const id of REQUIRED_FOOD_IDS) {
      expect(foods).toContain(id);
    }
  });

  it('coffee and tea exist but are not in the calorie draw', () => {
    expect(ITEMS.coffee).toBeDefined();
    expect(ITEMS.tea).toBeDefined();
    const foods = foodItemIds();
    expect(foods).not.toContain('coffee');
    expect(foods).not.toContain('tea');
  });

  it('includes core non-food items', () => {
    const ids = Object.keys(ITEMS);
    ['wagon', 'ox', 'yoke', 'rifle', 'gunpowder', 'lead_balls', 'percussion_caps', 'bullet_mold', 'shovel', 'bible', 'quinine', 'laudanum', 'bandages'].forEach((id) => {
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
