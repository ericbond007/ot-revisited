// #937 — NPC voluntary-rest parity. tickNpcWagon now consults
// persona.shouldRest on travel days; when true, ox fatigue recovers
// instead of accruing and wagon decay / axle grease are skipped.
// Mirrors the player's rest semantics (without lagging the train,
// since NPC wagons can't desync from the train pace).

import { describe, it, expect } from 'vitest';
import { tickNpcWagon } from '../src/lib/game/systems/npc-engine';
import { generateTrain } from '../src/lib/game/content/trains';
import { makeRng } from '../src/lib/game/rng';
import type { NpcWagonState } from '../src/lib/game/types';

function freshTrain() {
  return generateTrain('rest-parity', 1, 'independence_mo', makeRng('p'), { fresh: true });
}

function withPersona(w: NpcWagonState, personaId: NpcWagonState['personaId']): NpcWagonState {
  return { ...w, personaId };
}

const TRAVEL_CTX = {
  day: 1,
  traveled: true,
  pace: 'moderate' as const,
  terrain: 'prairie' as const,
  weather: 'clear' as const,
  traveledMiles: 14
};

describe('#937 — NPC shouldRest parity', () => {
  it('healthy wagon does NOT trigger voluntary rest — oxen accrue fatigue normally', () => {
    const train = freshTrain();
    const wagon = withPersona(train.companions[0], 'balanced');
    const startFatigue = wagon.oxen.reduce((s, o) => s + o.fatigue, 0);
    const { wagon: next } = tickNpcWagon(wagon, TRAVEL_CTX, makeRng('t1'));
    const endFatigue = next.oxen.reduce((s, o) => s + o.fatigue, 0);
    // Travel-day fatigue accrual > 0 (moderate pace adds ~5/ox at NPC rate)
    expect(endFatigue).toBeGreaterThan(startFatigue);
  });

  it('worn ox team triggers voluntary rest — fatigue RECOVERS on what was a travel day', () => {
    const train = freshTrain();
    // Crank oxen to high fatigue so balanced.oxenWornOut fires (returns
    // true above a threshold). 80 fatigue on every ox is well past it.
    const worn: NpcWagonState = withPersona(
      {
        ...train.companions[0],
        oxen: train.companions[0].oxen.map((o) => ({ ...o, fatigue: 80 }))
      },
      'balanced'
    );
    const startFatigue = worn.oxen.reduce((s, o) => s + o.fatigue, 0);
    const { wagon: next } = tickNpcWagon(worn, TRAVEL_CTX, makeRng('t2'));
    const endFatigue = next.oxen.reduce((s, o) => s + o.fatigue, 0);
    // Persona.shouldRest fired → tickOxenRest → fatigue dropped.
    expect(endFatigue).toBeLessThan(startFatigue);
  });

  it('voluntary rest also skips axle-grease consumption (rest day, no miles)', () => {
    const train = freshTrain();
    const worn: NpcWagonState = withPersona(
      {
        ...train.companions[0],
        inventory: { ...train.companions[0].inventory, tar_bucket: 1 },
        // Push greaseMiles right up to the 500-mi threshold so a single
        // travel-day tick at 14 mi WOULD trip it. Voluntary rest skips
        // the axle-grease block entirely → tar_bucket stays at 1.
        greaseMiles: 495,
        oxen: train.companions[0].oxen.map((o) => ({ ...o, fatigue: 80 }))
      },
      'balanced'
    );
    const { wagon: next } = tickNpcWagon(worn, TRAVEL_CTX, makeRng('t3'));
    expect(next.inventory.tar_bucket).toBe(1);
  });

  it('ctx.date absent — Sunday-rest branch defaults to false, decision falls back to HP/morale/oxen', () => {
    const train = freshTrain();
    const wagon = withPersona(train.companions[0], 'balanced');
    // No ctx.date — the Monday fallback in tickNpcWagon ensures the
    // isSunday branch returns false. Healthy wagon → no rest → fatigue accrues.
    const { wagon: next } = tickNpcWagon(wagon, TRAVEL_CTX, makeRng('t4'));
    const endFatigue = next.oxen.reduce((s, o) => s + o.fatigue, 0);
    const startFatigue = wagon.oxen.reduce((s, o) => s + o.fatigue, 0);
    expect(endFatigue).toBeGreaterThan(startFatigue);
  });
});
