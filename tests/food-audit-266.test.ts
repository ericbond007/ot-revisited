import { describe, it, expect } from 'vitest';
import { ITEMS, foodItemIds } from '../src/lib/game/content/items';

describe('#266 food consumption audit — draw-order corrections', () => {
  it('dried_fruit is eaten WITH the staples (period: every-meal ration)', () => {
    expect(ITEMS.dried_fruit.foodDrawOrder).toBe(1.5);
    // Comes after flour (1) and cornmeal (1.2), before beans (2).
    expect(ITEMS.dried_fruit.foodDrawOrder).toBeGreaterThan(ITEMS.flour.foodDrawOrder!);
    expect(ITEMS.dried_fruit.foodDrawOrder).toBeGreaterThan(ITEMS.cornmeal.foodDrawOrder!);
    expect(ITEMS.dried_fruit.foodDrawOrder).toBeLessThan(ITEMS.beans.foodDrawOrder!);
  });

  it('tallow is desperation-tier — eaten after pemmican', () => {
    expect(ITEMS.tallow.foodDrawOrder).toBe(6.5);
    expect(ITEMS.tallow.foodDrawOrder).toBeGreaterThan(ITEMS.pemmican.foodDrawOrder!);
  });

  it('foodItemIds reflects the new ordering end-to-end', () => {
    const ids = foodItemIds();
    const driedFruitIdx = ids.indexOf('dried_fruit');
    const tallowIdx = ids.indexOf('tallow');
    const pemmicanIdx = ids.indexOf('pemmican');
    const beansIdx = ids.indexOf('beans');
    const flourIdx = ids.indexOf('flour');

    expect(driedFruitIdx).toBeGreaterThan(flourIdx);
    expect(driedFruitIdx).toBeLessThan(beansIdx);
    expect(tallowIdx).toBeGreaterThan(pemmicanIdx);
  });
});
