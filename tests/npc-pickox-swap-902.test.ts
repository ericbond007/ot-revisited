// #902 — applyNpcPostRestock now performs a persona-driven ox swap
// at posts that offer the ox_swap service. Generous / cautious swap
// eagerly when the team is thin or worn; hoarder never swaps; chaos
// rolls a deterministic count.

import { describe, it, expect } from 'vitest';
import { applyNpcPostRestock, joinTrain } from '../src/lib/game/systems/wagon-train';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState, NpcWagonState, Ox } from '../src/lib/game/types';
import type { PersonaId } from '../src/lib/game/ai/types';

function game(year = 1848): GameState {
  return createInitialState({
    seed: 'r902',
    leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'doctor' }],
    startDate: { year, month: 4, day: 15 }
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

/** Worn team: 4 oxen at health=40 each — both thin (likely below
 *  minTeam+threshold) and worn (avg health 40 < everyone's floor). */
function wornTeam(): Ox[] {
  return [
    { id: 'ox-worn-0', health: 40, fatigue: 60, shod: true },
    { id: 'ox-worn-1', health: 40, fatigue: 60, shod: true },
    { id: 'ox-worn-2', health: 40, fatigue: 60, shod: true },
    { id: 'ox-worn-3', health: 40, fatigue: 60, shod: true }
  ];
}

function setupAtLaramie(persona: PersonaId | undefined, oxen: Ox[], cash: number): GameState {
  let s = joinTrain(game(), makeRng('r')).state;
  s = arriveAt(s, 'ft_laramie'); // ox_swap service
  return setCompanion0(s, { personaId: persona, oxen, cash });
}

describe('#902 — applyNpcPostRestock consumes persona.pickOxSwapCount', () => {
  it('generous on a worn team: oxen change after the swap', () => {
    const s = setupAtLaramie('generous', wornTeam(), 500);
    const before = s.wagonTrain!.companions[0];
    const result = applyNpcPostRestock(s);
    const after = result.wagonTrain!.companions[0];
    // Generous wants 2 above minTeam (prairie_schooner = 2 → 4) AND
    // refreshes worn teams at <70 health. Both triggers fire.
    expect(after.cash).toBeLessThan(before.cash);
    // At least one fresh ox in the team (id starts with 'ox-fresh-').
    expect(after.oxen.some((o) => o.id.startsWith('ox-fresh-'))).toBe(true);
  });

  it('hoarder on the same worn team: never swaps', () => {
    const s = setupAtLaramie('hoarder', wornTeam(), 500);
    const before = s.wagonTrain!.companions[0];
    const result = applyNpcPostRestock(s);
    const after = result.wagonTrain!.companions[0];
    // Hoarder.pickOxSwapCount returns 0; ox team unchanged.
    expect(after.oxen).toEqual(before.oxen);
  });

  it('skips the ox swap at posts without the ox_swap service', () => {
    let s = joinTrain(game(), makeRng('r')).state;
    s = arriveAt(s, 'ft_kearny'); // no ox_swap service
    s = setCompanion0(s, { personaId: 'generous', oxen: wornTeam(), cash: 500 });
    const before = s.wagonTrain!.companions[0];
    const result = applyNpcPostRestock(s);
    const after = result.wagonTrain!.companions[0];
    expect(after.oxen).toEqual(before.oxen);
  });

  it('skips the swap when wagon cash < barter boot cost', () => {
    // Wagon with $30 can't afford even 1 fresh ox (barter boot is
    // $40/head). The ox team should be unchanged regardless of what
    // the food block does.
    const s = setupAtLaramie('generous', wornTeam(), 30);
    const before = s.wagonTrain!.companions[0];
    const result = applyNpcPostRestock(s);
    const after = result.wagonTrain!.companions[0];
    expect(after.oxen).toEqual(before.oxen);
  });

  it('Gold Rush year (1849) doubles the cost — generous spends more', () => {
    let s1849 = joinTrain(game(1849), makeRng('r')).state;
    s1849 = arriveAt(s1849, 'ft_laramie');
    s1849 = setCompanion0(s1849, { personaId: 'generous', oxen: wornTeam(), cash: 500 });
    let s1848 = joinTrain(game(1848), makeRng('r')).state;
    s1848 = arriveAt(s1848, 'ft_laramie');
    s1848 = setCompanion0(s1848, { personaId: 'generous', oxen: wornTeam(), cash: 500 });
    const r1849 = applyNpcPostRestock(s1849).wagonTrain!.companions[0];
    const r1848 = applyNpcPostRestock(s1848).wagonTrain!.companions[0];
    const spent49 = 500 - r1849.cash;
    const spent48 = 500 - r1848.cash;
    // 1849 spends ≥ 1848 (both gold-rush mult on ox swap + same food
    // basket otherwise). The ox-swap line is the dominant delta.
    expect(spent49).toBeGreaterThan(spent48);
  });

  it('cash-only fallback when barter has too few surrender candidates', () => {
    // 1 alive ox means barter can't fund even 1 fresh (needs 2
    // surrendered). Cautious's pickOxSwapCountFor(state, 2, 70)
    // returns 4 - 1 = 3 (way thin). Cash-only cost: 3 × $75 = $225.
    // Wagon at $300 → can afford. Final team has the original ox +
    // 3 fresh ones.
    const oneOx: Ox[] = [{ id: 'ox-only', health: 60, fatigue: 30, shod: true }];
    const s = setupAtLaramie('cautious', oneOx, 300);
    const before = s.wagonTrain!.companions[0];
    const result = applyNpcPostRestock(s);
    const after = result.wagonTrain!.companions[0];
    expect(after.oxen.length).toBeGreaterThan(before.oxen.length);
    expect(after.oxen.some((o) => o.id === 'ox-only')).toBe(true);
    expect(after.cash).toBeLessThan(before.cash);
  });
});
