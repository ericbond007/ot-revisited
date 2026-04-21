import { describe, it, expect } from 'vitest';
import { buildStarterKit, BASE_KIT } from '../src/lib/game/content/starter-kit';

describe('starter kit', () => {
  it('BASE_KIT has wagon, oxen, cash, food, bullets, shovel, yoke', () => {
    expect(BASE_KIT.cash).toBeGreaterThan(0);
    expect(BASE_KIT.oxen).toBeGreaterThanOrEqual(4);
    expect(BASE_KIT.inventory.flour).toBeGreaterThan(0);
    expect(BASE_KIT.inventory.bullets).toBeGreaterThan(0);
    expect(BASE_KIT.inventory.shovel).toBe(1);
    expect(BASE_KIT.inventory.yoke).toBe(1);
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
    const kit = buildStarterKit(['teamster']);
    expect(kit.oxen).toBe(BASE_KIT.oxen + 1);
    expect(kit.inventory.yoke).toBe(BASE_KIT.inventory.yoke + 1);
  });
});
