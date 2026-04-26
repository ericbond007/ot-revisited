import { describe, it, expect } from 'vitest';
import { buildStarterKit, BASE_KIT } from '../src/lib/game/content/starter-kit';

describe('starter kit', () => {
  it('BASE_KIT has cash, oxen, food, bullets, shovel', () => {
    expect(BASE_KIT.cash).toBeGreaterThan(0);
    expect(BASE_KIT.oxen).toBeGreaterThanOrEqual(4);
    expect(BASE_KIT.inventory.flour).toBeGreaterThan(0);
    expect(BASE_KIT.inventory.bullets).toBeGreaterThan(0);
    expect(BASE_KIT.inventory.shovel).toBe(1);
    // Yokes are added per-wagon in buildStarterKit (#107) — no longer
    // a flat constant on BASE_KIT.
  });

  it('builds yokes per wagon model', () => {
    const light = buildStarterKit([], 'light');
    const prairie = buildStarterKit([], 'prairie_schooner');
    const heavy = buildStarterKit([], 'heavy');
    expect(light.inventory.yoke).toBe(1);
    expect(prairie.inventory.yoke).toBe(2);
    expect(heavy.inventory.yoke).toBe(3);
  });

  it('heavy wagon kit includes extra spares', () => {
    const heavy = buildStarterKit([], 'heavy');
    expect(heavy.inventory.wheel).toBe(1);
    expect(heavy.inventory.spare_plank).toBe(2);
  });

  it('buildStarterKit stacks profession gear onto base', () => {
    const kit = buildStarterKit(['farmer']);
    expect(kit.inventory.flour).toBe((BASE_KIT.inventory.flour ?? 0) + 100);
    expect(kit.cash).toBe(BASE_KIT.cash);
  });

  it('banker adds starting cash', () => {
    const kit = buildStarterKit(['banker']);
    expect(kit.cash).toBe(BASE_KIT.cash + 800);
  });

  it('stacks duplicate professions', () => {
    const single = buildStarterKit(['farmer']);
    const double = buildStarterKit(['farmer', 'farmer']);
    expect(double.inventory.flour).toBe(single.inventory.flour + 100);
  });

  it('teamster adds an ox and a yoke', () => {
    // Default wagon (prairie_schooner) gives 2 yokes, teamster adds +1 = 3.
    const kit = buildStarterKit(['teamster']);
    expect(kit.oxen).toBe(BASE_KIT.oxen + 1);
    expect(kit.inventory.yoke).toBe(3);
  });
});
