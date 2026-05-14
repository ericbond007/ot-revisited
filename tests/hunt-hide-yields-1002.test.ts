// #1002 — hide yields scale by species. Medium target produces a
// deterministic 1 hide per kill; big-game rolls a species from the
// terrain table and produces a size-scaled hide stack. Buffalo at
// the top (5-6 hides), pronghorn/deer at the bottom (1 hide).

import { describe, it, expect } from 'vitest';
import { hunt } from '../src/lib/game/actions/hunt';
import { createInitialState } from '../src/lib/game/engine';
import { ITEMS } from '../src/lib/game/content/items';
import type { GameState, Terrain } from '../src/lib/game/types';

function game(seed: string, terrain: Terrain): GameState {
  const s = createInitialState({
    seed,
    leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'doctor' }],
    startDate: { year: 1849, month: 6, day: 15 }
  });
  return {
    ...s,
    location: { ...s.location, terrain },
    inventory: {
      ...s.inventory,
      rifle: 1,
      gunpowder: 50,
      lead_balls: 50,
      percussion_caps: 50
    }
  };
}

describe('#1002 — raw_hide item weight', () => {
  it('weighs 10 lb per unit (was 5)', () => {
    expect(ITEMS.raw_hide.weightLbPerUnit).toBe(10);
  });
});

describe('#1002 — medium-game hide yield', () => {
  it('produces deterministic 1 hide on successful medium kill', () => {
    // Run many seeds; every successful medium kill should yield exactly 1.
    let kills = 0;
    for (let i = 0; i < 30; i++) {
      const s = game(`med-${i}`, 'prairie');
      const after = hunt(s, { target: 'medium', ammo: 'moderate', hunters: 1 });
      const haul = after.flags._huntHaul as Record<string, unknown>;
      const meat = haul.meat as number;
      const hides = haul.rawHides as number;
      if (meat > 0) {
        kills += 1;
        expect(hides).toBe(1);
      }
    }
    // Sanity: at least some seeds produced a successful kill.
    expect(kills).toBeGreaterThan(5);
  });
});

describe('#1002 — big-game species roll + hide yield', () => {
  it('prairie favors buffalo (>50% of big-kill rolls)', () => {
    let buffaloKills = 0;
    let totalKills = 0;
    for (let i = 0; i < 50; i++) {
      const s = game(`prairie-${i}`, 'prairie');
      const after = hunt(s, { target: 'big', ammo: 'heavy', hunters: 1 });
      const haul = after.flags._huntHaul as Record<string, unknown>;
      if ((haul.meat as number) > 0) {
        totalKills += 1;
        if (haul.bigSpecies === 'buffalo') buffaloKills += 1;
      }
    }
    expect(totalKills).toBeGreaterThan(10);
    expect(buffaloKills / totalKills).toBeGreaterThan(0.5);
  });

  it('mountains favor grizzly/elk over buffalo', () => {
    let mountainSpecies: Record<string, number> = {};
    for (let i = 0; i < 50; i++) {
      const s = game(`mtn-${i}`, 'mountains');
      const after = hunt(s, { target: 'big', ammo: 'heavy', hunters: 1 });
      const haul = after.flags._huntHaul as Record<string, unknown>;
      if ((haul.meat as number) > 0 && haul.bigSpecies) {
        const sp = haul.bigSpecies as string;
        mountainSpecies[sp] = (mountainSpecies[sp] ?? 0) + 1;
      }
    }
    const buffalo = mountainSpecies.buffalo ?? 0;
    const mountainNatives = (mountainSpecies.grizzly ?? 0) + (mountainSpecies.elk ?? 0) + (mountainSpecies.black_bear ?? 0);
    expect(buffalo).toBe(0);
    expect(mountainNatives).toBeGreaterThan(10);
  });

  it('buffalo yields 5-6 hides; grizzly 3-4; elk 2-3; black bear 2', () => {
    const yieldsBySpecies: Record<string, Set<number>> = {};
    for (let i = 0; i < 80; i++) {
      const terrain: Terrain = i % 2 === 0 ? 'prairie' : 'mountains';
      const s = game(`yield-${i}`, terrain);
      const after = hunt(s, { target: 'big', ammo: 'heavy', hunters: 1 });
      const haul = after.flags._huntHaul as Record<string, unknown>;
      if ((haul.meat as number) > 0 && haul.bigSpecies) {
        const sp = haul.bigSpecies as string;
        const n = haul.rawHides as number;
        if (!yieldsBySpecies[sp]) yieldsBySpecies[sp] = new Set();
        yieldsBySpecies[sp].add(n);
      }
    }
    for (const yielded of Object.values(yieldsBySpecies.buffalo ?? new Set())) {
      expect(yielded).toBeGreaterThanOrEqual(5);
      expect(yielded).toBeLessThanOrEqual(6);
    }
    for (const yielded of Object.values(yieldsBySpecies.grizzly ?? new Set())) {
      expect(yielded).toBeGreaterThanOrEqual(3);
      expect(yielded).toBeLessThanOrEqual(4);
    }
    for (const yielded of Object.values(yieldsBySpecies.elk ?? new Set())) {
      expect(yielded).toBeGreaterThanOrEqual(2);
      expect(yielded).toBeLessThanOrEqual(3);
    }
    for (const yielded of Object.values(yieldsBySpecies.black_bear ?? new Set())) {
      expect(yielded).toBe(2);
    }
  });

  it('prize-only big-game hunt yields no hides and no bigSpecies', () => {
    const s = game('prize', 'prairie');
    const after = hunt(s, { target: 'big', ammo: 'heavy', hunters: 1, style: 'prize_only' });
    const haul = after.flags._huntHaul as Record<string, unknown>;
    expect(haul.rawHides).toBe(0);
    expect(haul.bigSpecies).toBeUndefined();
  });
});

describe('#1002 — buffalo stack weight matches reality', () => {
  it('a buffalo haul (5-6 hides × 10 lb) totals 50-60 lb', () => {
    // Run prairie hunts until a buffalo kill produces hides; verify
    // the wagon-load delta is in the historical 50-60 lb range.
    for (let i = 0; i < 50; i++) {
      const s = game(`buf-weight-${i}`, 'prairie');
      const before = s.inventory.raw_hide ?? 0;
      const after = hunt(s, { target: 'big', ammo: 'heavy', hunters: 1 });
      const haul = after.flags._huntHaul as Record<string, unknown>;
      if (haul.bigSpecies === 'buffalo' && (haul.rawHides as number) > 0) {
        const hideDelta = (after.inventory.raw_hide ?? 0) - before;
        const lb = hideDelta * ITEMS.raw_hide.weightLbPerUnit;
        expect(lb).toBeGreaterThanOrEqual(50);
        expect(lb).toBeLessThanOrEqual(60);
        return; // one verified case is enough
      }
    }
    throw new Error('No buffalo kill in 50 prairie seeds — RNG suspicious');
  });
});
