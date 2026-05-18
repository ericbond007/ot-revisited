// #1056 — `bullets` was removed in #174 (split into gunpowder +
// lead_balls + percussion_caps). The engine fires
// min(desired, gunpowder, lead_balls, percussion_caps) shots; the
// HuntModal must mirror that exact gate (it now derives
// availableShots = min(gunpowder, lead_balls, percussion_caps)
// instead of the dead `inventory.bullets`). This locks the engine
// contract the modal mirrors: a full trio hunts; ANY single missing
// component → zero shots → empty hunt (no meat, no ammo burned).

import { describe, it, expect } from 'vitest';
import { hunt } from '../src/lib/game/actions/hunt';
import { createInitialState } from '../src/lib/game/engine';
import type { GameState } from '../src/lib/game/types';

function game(inv: Record<string, number>): GameState {
  const s = createInitialState({
    seed: 'h1056',
    leader: { name: 'L', profession: 'hunter' },
    companions: [{ name: 'C', profession: 'farmer' }],
    startDate: { year: 1849, month: 6, day: 15 }
  });
  return { ...s, inventory: { ...s.inventory, rifle: 1, ...inv } };
}

const FULL = { gunpowder: 30, lead_balls: 30, percussion_caps: 30 };

function haulOf(s: GameState): { bullets: number; meat: number } {
  return s.flags._huntHaul as unknown as { bullets: number; meat: number };
}

describe('#1056 — hunt ammo gate (gunpowder + lead_balls + percussion_caps)', () => {
  it('full ammo trio → real hunt: shots fired, all three components burn equally', () => {
    const after = hunt(game(FULL), { target: 'medium', ammo: 'moderate', hunters: 1 });
    const burnedPowder = FULL.gunpowder - (after.inventory.gunpowder ?? 0);
    const burnedBalls = FULL.lead_balls - (after.inventory.lead_balls ?? 0);
    const burnedCaps = FULL.percussion_caps - (after.inventory.percussion_caps ?? 0);
    expect(burnedPowder).toBeGreaterThan(0);
    expect(burnedBalls).toBe(burnedPowder);
    expect(burnedCaps).toBe(burnedPowder);
    expect(haulOf(after).bullets).toBe(burnedPowder); // shots == ammo burned
  });

  it.each([
    ['gunpowder', { gunpowder: 0, lead_balls: 30, percussion_caps: 30 }],
    ['lead_balls', { gunpowder: 30, lead_balls: 0, percussion_caps: 30 }],
    ['percussion_caps', { gunpowder: 30, lead_balls: 30, percussion_caps: 0 }]
  ])('missing %s → zero shots, empty hunt, no ammo burned', (_name, inv) => {
    const before = game(inv);
    const after = hunt(before, { target: 'medium', ammo: 'moderate', hunters: 1 });
    expect(haulOf(after).bullets).toBe(0);
    expect(haulOf(after).meat).toBe(0);
    // none of the present components were consumed (min was 0)
    expect(after.inventory.gunpowder ?? 0).toBe(before.inventory.gunpowder ?? 0);
    expect(after.inventory.lead_balls ?? 0).toBe(before.inventory.lead_balls ?? 0);
    expect(after.inventory.percussion_caps ?? 0).toBe(before.inventory.percussion_caps ?? 0);
  });

  it('a legacy `bullets` save is BRIDGED by upgradeState → still hunts (1:1:1 → trio)', () => {
    // #1056 root cause was the HuntModal UI reading the dead
    // `inventory.bullets` (always 0 on real games). The ENGINE is
    // fine: hunt() runs upgradeState() which migrates old `bullets`
    // to gunpowder+lead_balls+percussion_caps 1:1:1, so even a
    // pre-#174 save can still hunt. This documents that bridge.
    const after = hunt(game({ bullets: 30, gunpowder: 0, lead_balls: 0, percussion_caps: 0 }),
      { target: 'medium', ammo: 'moderate', hunters: 1 });
    expect(haulOf(after).bullets).toBeGreaterThan(0);
  });
});
