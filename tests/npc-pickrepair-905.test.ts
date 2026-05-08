// #905 — applyNpcPostRestock now drives a smithy repair pass on
// each NPC wagon at posts that offer the `blacksmith` service.
// Persona controls the budget — generous spends 1.5× balanced,
// hoarder ½. Cap at wagon cash and 100-condition room.

import { describe, it, expect } from 'vitest';
import { applyNpcPostRestock, joinTrain } from '../src/lib/game/systems/wagon-train';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState, NpcWagonState } from '../src/lib/game/types';
import type { PersonaId } from '../src/lib/game/ai/types';

function game(): GameState {
  return createInitialState({
    seed: 'r905',
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

function wornWagon(condition: number): NpcWagonState['wagon'] {
  // Reuse the gen-time wagon shape from the train fixture so we don't
  // re-spec carryCapacity / canvas / branBarrel. Only condition varies.
  let s = joinTrain(game(), makeRng('r')).state;
  return { ...s.wagonTrain!.companions[0].wagon, condition };
}

/** Setup at Fort Laramie with badly-worn wagon (condition 20), $300
 *  cash, given persona. Condition is intentionally low so the
 *  budget spread (balanced \$30 vs generous \$45 vs hoarder \$15)
 *  expresses itself as a final-condition spread instead of all
 *  three saturating at 100. */
function smithyOutcome(persona: PersonaId | undefined): NpcWagonState {
  let s = joinTrain(game(), makeRng('r')).state;
  s = arriveAt(s, 'ft_laramie');
  s = setCompanion0(s, {
    personaId: persona,
    wagon: wornWagon(20),
    cash: 300
  });
  return applyNpcPostRestock(s).wagonTrain!.companions[0];
}

describe('#905 — applyNpcPostRestock consumes persona.pickRepairBudget', () => {
  it('balanced spends some cash and lifts condition', () => {
    const after = smithyOutcome('balanced');
    expect(after.wagon.condition).toBeGreaterThan(20);
    expect(after.cash).toBeLessThan(300);
  });

  it('generous spends more than balanced (1.5× repair budget)', () => {
    const balanced = smithyOutcome('balanced');
    const generous = smithyOutcome('generous');
    expect(generous.wagon.condition).toBeGreaterThan(balanced.wagon.condition);
  });

  it('hoarder spends less than balanced (½ repair budget)', () => {
    const balanced = smithyOutcome('balanced');
    const hoarder = smithyOutcome('hoarder');
    expect(hoarder.wagon.condition).toBeLessThan(balanced.wagon.condition);
  });

  it('skips repair at posts without blacksmith service', () => {
    let s = joinTrain(game(), makeRng('r')).state;
    s = arriveAt(s, 'rock_creek_station'); // trading_post, no blacksmith service
    s = setCompanion0(s, {
      personaId: 'cautious',
      wagon: wornWagon(20),
      cash: 300
    });
    const before = s.wagonTrain!.companions[0];
    const after = applyNpcPostRestock(s).wagonTrain!.companions[0];
    expect(after.wagon.condition).toBe(before.wagon.condition);
  });

  it('no-op on a fully-conditioned wagon (no room to repair)', () => {
    let s = joinTrain(game(), makeRng('r')).state;
    s = arriveAt(s, 'ft_laramie');
    s = setCompanion0(s, {
      personaId: 'generous',
      wagon: wornWagon(100),
      cash: 300
    });
    const before = s.wagonTrain!.companions[0];
    const after = applyNpcPostRestock(s).wagonTrain!.companions[0];
    expect(after.wagon.condition).toBe(before.wagon.condition);
  });

  it('caps spend at wagon cash', () => {
    let s = joinTrain(game(), makeRng('r')).state;
    s = arriveAt(s, 'ft_laramie');
    s = setCompanion0(s, {
      personaId: 'cautious',
      wagon: wornWagon(50),
      cash: 12 // tight — below cautious's $15 floor on most attempts but
              // enough for a partial repair
    });
    const after = applyNpcPostRestock(s).wagonTrain!.companions[0];
    expect(after.cash).toBeGreaterThanOrEqual(0);
  });

  it('missing personaId falls back to balanced repair behavior', () => {
    const fallback = smithyOutcome(undefined);
    const balanced = smithyOutcome('balanced');
    expect(fallback.wagon.condition).toBe(balanced.wagon.condition);
  });
});
