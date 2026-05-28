// tests/coverage-1172.test.ts
import { describe, it, expect } from 'vitest';
import { computeCoverage } from '$lib/game/systems/coverage';
import { ITEMS } from '$lib/game/content/items';
import { DEFAULT_WAGON_MODEL } from '$lib/game/content/wagons';
import type { PartyMember } from '$lib/game/types';

function adult(name: string): PartyMember {
  return { name, kind: 'adult', dead: false } as unknown as PartyMember;
}
function child(name: string): PartyMember {
  return { name, kind: 'child', dead: false } as unknown as PartyMember;
}

describe('#1172 computeCoverage', () => {
  it('food days = total food lbs / daily food at normal rations (4 adults)', () => {
    const cov = computeCoverage({
      party: [adult('a'), adult('b'), adult('c'), adult('d')],
      starterInventory: {},
      basket: { flour: 80 },
      wagonModel: DEFAULT_WAGON_MODEL
    });
    // daily food = 4 adults x 2 lb = 8 lb/day
    const expected = (80 * ITEMS.flour.weightLbPerUnit) / 8;
    expect(cov.foodDays).toBeCloseTo(expected, 5);
  });

  it('children scale the daily food draw at 0.6x (floored)', () => {
    // 4 adults + 2 children -> 4*2 + floor(2*2*0.6) = 8 + floor(2.4) = 10 lb/day
    const cov = computeCoverage({
      party: [adult('a'), adult('b'), adult('c'), adult('d'), child('e'), child('f')],
      starterInventory: {},
      basket: { flour: 100 },
      wagonModel: DEFAULT_WAGON_MODEL
    });
    expect(cov.foodDays).toBeCloseTo((100 * ITEMS.flour.weightLbPerUnit) / 10, 5);
  });

  it('water days use the real wagon keg capacity + bags', () => {
    // prairie_schooner = 20 gal keg; 4 adults x 1 gal = 4 gal/day -> 5 days
    const cov = computeCoverage({
      party: [adult('a'), adult('b'), adult('c'), adult('d')],
      starterInventory: {},
      basket: {},
      wagonModel: DEFAULT_WAGON_MODEL
    });
    expect(cov.waterDays).toBeCloseTo(20 / 4, 5);
    // +2 water bags -> 30 gal -> 7.5 days
    const cov2 = computeCoverage({
      party: [adult('a'), adult('b'), adult('c'), adult('d')],
      starterInventory: {},
      basket: { water_bag: 2 },
      wagonModel: DEFAULT_WAGON_MODEL
    });
    expect(cov2.waterDays).toBeCloseTo(30 / 4, 5);
  });

  it('empty party returns zero for all metrics', () => {
    const cov = computeCoverage({
      party: [], starterInventory: {}, basket: { flour: 100 }, wagonModel: DEFAULT_WAGON_MODEL
    });
    expect(cov.foodDays).toBe(0);
    expect(cov.waterDays).toBe(0);
    expect(cov.clothingCov).toBe(0);
  });

  it('combines starter inventory and basket; shots = min(balls, caps)', () => {
    const cov = computeCoverage({
      party: [adult('a')],
      starterInventory: { lead_balls: 50, percussion_caps: 50 },
      basket: { lead_balls: 100, percussion_caps: 100 },
      wagonModel: DEFAULT_WAGON_MODEL
    });
    expect(cov.shots).toBe(150);
  });
});
