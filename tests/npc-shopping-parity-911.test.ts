// #911 — applyNpcPostRestock now runs the full non-food shopping
// basket (warmth + equipment + hunter ammo + repair parts + medicine)
// alongside the food block. Brings NPCs to player parity at posts.

import { describe, it, expect } from 'vitest';
import { applyNpcPostRestock, joinTrain } from '../src/lib/game/systems/wagon-train';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState, NpcWagonState } from '../src/lib/game/types';

function game(): GameState {
  return createInitialState({
    seed: 'r911',
    leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'doctor' }],
    startDate: { year: 1849, month: 4, day: 15 }
  });
}

function arriveAt(s: GameState, landmarkId: string): GameState {
  return { ...s, location: { ...s.location, atLandmarkId: landmarkId } };
}

function setCompanion0(s: GameState, patch: Partial<NpcWagonState>): GameState {
  return {
    ...s,
    wagonTrain: {
      ...s.wagonTrain!,
      companions: s.wagonTrain!.companions.map((c, i) => (i === 0 ? { ...c, ...patch } : c))
    }
  };
}

/** Strip warmth + cookware + medicine from the wagon so every slice
 *  triggers buys. Generous cash. Ft Laramie stocks everything. */
function bareWagon(persona: NpcWagonState['personaId'] = 'cautious'): GameState {
  let s = joinTrain(game(), makeRng('r')).state;
  s = arriveAt(s, 'ft_laramie');
  const c0 = s.wagonTrain!.companions[0];
  return setCompanion0(s, {
    personaId: persona,
    inventory: {
      ...c0.inventory,
      coat: 0,
      blanket: 0,
      tent: 0,
      boots: 0,
      cookware: 0,
      shovel: 0,
      water_skin: 0,
      rope: 0,
      quinine: 0,
      bandages: 0,
      laudanum: 0,
      calomel: 0,
      paregoric: 0,
      dovers_powder: 0,
      epsom_salts: 0
    },
    cash: 1000
  });
}

describe('#911 — NPC non-food shopping parity', () => {
  it('replaces missing warmth gear (coat / blanket / tent / boots)', () => {
    const s = bareWagon('cautious');
    const before = s.wagonTrain!.companions[0];
    const after = applyNpcPostRestock(s).wagonTrain!.companions[0];
    expect(after.inventory.coat ?? 0).toBeGreaterThan(before.inventory.coat ?? 0);
    expect(after.inventory.blanket ?? 0).toBeGreaterThan(before.inventory.blanket ?? 0);
    expect(after.inventory.tent ?? 0).toBeGreaterThan(before.inventory.tent ?? 0);
  });

  it('replaces missing equipment (cookware / shovel / rope)', () => {
    const s = bareWagon('cautious');
    const after = applyNpcPostRestock(s).wagonTrain!.companions[0];
    expect(after.inventory.cookware ?? 0).toBeGreaterThan(0);
    expect(after.inventory.shovel ?? 0).toBeGreaterThan(0);
    expect(after.inventory.rope ?? 0).toBeGreaterThan(0);
  });

  it('cookware spare (qty 2) fires for cautious per #909 + #911 wire', () => {
    const s = bareWagon('cautious');
    const after = applyNpcPostRestock(s).wagonTrain!.companions[0];
    // Cautious's pickEquipmentRestockOpts.cookwareSpare=true → target 2.
    expect(after.inventory.cookware ?? 0).toBe(2);
  });

  it('balanced gets only 1 cookware (no spare)', () => {
    const s = bareWagon('balanced');
    const after = applyNpcPostRestock(s).wagonTrain!.companions[0];
    expect(after.inventory.cookware ?? 0).toBe(1);
  });

  it('replaces missing medicine (quinine / bandages / laudanum / calomel)', () => {
    const s = bareWagon('cautious');
    const after = applyNpcPostRestock(s).wagonTrain!.companions[0];
    expect(after.inventory.quinine ?? 0).toBeGreaterThan(0);
    expect(after.inventory.bandages ?? 0).toBeGreaterThan(0);
    expect(after.inventory.laudanum ?? 0).toBeGreaterThan(0);
    expect(after.inventory.calomel ?? 0).toBeGreaterThan(0);
  });

  it('cash gate still applies — broke wagon buys nothing extra', () => {
    let s = joinTrain(game(), makeRng('r')).state;
    s = arriveAt(s, 'ft_laramie');
    s = setCompanion0(s, {
      personaId: 'cautious',
      inventory: { ...s.wagonTrain!.companions[0].inventory, coat: 0, quinine: 0 },
      cash: 5 // below the $10 cash floor that gates entry
    });
    const before = s.wagonTrain!.companions[0];
    const after = applyNpcPostRestock(s).wagonTrain!.companions[0];
    expect(after.inventory.coat ?? 0).toBe(before.inventory.coat ?? 0);
    expect(after.inventory.quinine ?? 0).toBe(before.inventory.quinine ?? 0);
  });

  it('hunter ammo only fires when wagon has a live hunter', () => {
    let s = joinTrain(game(), makeRng('r')).state;
    s = arriveAt(s, 'ft_laramie');
    // Replace party so a hunter is on board.
    const baseC = s.wagonTrain!.companions[0];
    s = setCompanion0(s, {
      personaId: 'cautious',
      cash: 1000,
      inventory: { ...baseC.inventory, gunpowder: 0, lead_balls: 0, percussion_caps: 0 },
      party: [
        ...baseC.party.slice(0, 1),
        // Convert second member to hunter for this test
        { ...baseC.party[1], profession: 'hunter' }
      ]
    });
    const after = applyNpcPostRestock(s).wagonTrain!.companions[0];
    expect(after.inventory.gunpowder ?? 0).toBeGreaterThan(0);
    expect(after.inventory.lead_balls ?? 0).toBeGreaterThan(0);
  });
});
