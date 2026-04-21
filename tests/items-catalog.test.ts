import { describe, it, expect } from 'vitest';
import { ITEMS, getItem, foodItemIds } from '../src/lib/game/content/items';

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
