// #895 — wagon.personaId drives daily decisions during tickNpcWagon.
// Slice 1 wires `pickRations` only; future slices will wire pace,
// hunting, fording, etc. (see VK #896 for the full audit).

import { describe, it, expect } from 'vitest';
import { tickNpcWagon } from '../src/lib/game/systems/npc-engine';
import { generateTrain } from '../src/lib/game/content/trains';
import { makeRng } from '../src/lib/game/rng';
import type { NpcWagonState } from '../src/lib/game/types';

function freshTrain() {
  return generateTrain('persona-wiring', 1, 'independence_mo', makeRng('p'), { fresh: true });
}

function withPersona(w: NpcWagonState, personaId: NpcWagonState['personaId']): NpcWagonState {
  return { ...w, personaId };
}

const CTX = {
  day: 1,
  traveled: true,
  pace: 'moderate' as const,
  terrain: 'prairie' as const,
  weather: 'clear' as const
};

describe('#895 — persona-driven NPC tick', () => {
  it('aggressive personaId forces meager rations daily', () => {
    const train = freshTrain();
    const wagon = withPersona(train.companions[0], 'aggressive');
    const { wagon: next } = tickNpcWagon(wagon, CTX, makeRng('t-aggro'));
    expect(next.rations).toBe('meager');
  });

  it('cautious personaId picks filling when flour is plentiful', () => {
    const train = freshTrain();
    const w = train.companions[0];
    const stocked: NpcWagonState = withPersona(
      { ...w, inventory: { ...w.inventory, flour: 200 } },
      'cautious'
    );
    const { wagon: next } = tickNpcWagon(stocked, CTX, makeRng('t-cautious'));
    expect(next.rations).toBe('filling');
  });

  it('balanced (default fallback for missing personaId) holds normal', () => {
    const train = freshTrain();
    const wagon = { ...train.companions[0], personaId: undefined };
    const { wagon: next } = tickNpcWagon(wagon, CTX, makeRng('t-balanced'));
    expect(next.rations).toBe('normal');
  });

  it('generateTrain stamps every wagon with a personaId', () => {
    const train = freshTrain();
    for (const c of train.companions) {
      expect(c.personaId).toBeTruthy();
    }
  });
});
