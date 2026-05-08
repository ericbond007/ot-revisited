// #907 — maybeCannibalize now consults persona.shouldCannibalize
// before consuming a corpse. faithful refuses (Whitman/Sager
// reality); cautious / balanced / etc. cannibalize as before.

import { describe, it, expect } from 'vitest';
import { tickNpcWagon } from '../src/lib/game/systems/npc-engine';
import { generateTrain } from '../src/lib/game/content/trains';
import { makeRng } from '../src/lib/game/rng';
import { faithfulPersona } from '../src/lib/game/ai/personas';
import type { NpcWagonState } from '../src/lib/game/types';

function freshTrain() {
  return generateTrain('cannibal-907', 1, 'independence_mo', makeRng('p'), { fresh: true });
}

const FOOD_KEYS = [
  'game_meat', 'berries', 'egg', 'milk',
  'jerky', 'pemmican', 'salt_pork', 'bacon',
  'flour', 'cornmeal', 'beans', 'hardtack',
  'dried_fruit', 'cheese', 'butter'
];

/** Strip every food source so the wagon hits the cannibalism path
 *  on the next tick. */
function emptyFood(inv: Record<string, number>): Record<string, number> {
  const next = { ...inv };
  for (const k of FOOD_KEYS) next[k] = 0;
  return next;
}

const CTX = {
  day: 30,
  traveled: false, // rest day so oxen don't burn
  pace: 'moderate' as const,
  terrain: 'prairie' as const,
  weather: 'clear' as const
};

describe('#907 — persona.shouldCannibalize gates maybeCannibalize', () => {
  it('faithfulPersona.shouldCannibalize returns false', () => {
    expect(faithfulPersona.shouldCannibalize({} as never)).toBe(false);
  });

  it('cautious wagon with a fresh corpse cannibalizes (Donner reality)', () => {
    const train = freshTrain();
    const w = train.companions[0];
    const corpseId = w.party[1].id;
    const starving: NpcWagonState = {
      ...w,
      personaId: 'cautious',
      inventory: emptyFood(w.inventory),
      party: w.party.map((m) =>
        m.id === corpseId
          ? { ...m, dead: true, health: 0, deathDay: CTX.day - 1, deathCause: 'starvation' as const }
          : m
      )
    };
    const { wagon: next } = tickNpcWagon(starving, CTX, makeRng('t-cautious'));
    const corpse = next.party.find((m) => m.id === corpseId)!;
    expect(corpse.consumed).toBe(true);
    expect(next.inventory.game_meat ?? 0).toBeGreaterThan(0);
  });

  it('faithful wagon with the same corpse refuses (Whitman/Sager reality)', () => {
    const train = freshTrain();
    const w = train.companions[0];
    const corpseId = w.party[1].id;
    const starving: NpcWagonState = {
      ...w,
      personaId: 'faithful',
      inventory: emptyFood(w.inventory),
      party: w.party.map((m) =>
        m.id === corpseId
          ? { ...m, dead: true, health: 0, deathDay: CTX.day - 1, deathCause: 'starvation' as const }
          : m
      )
    };
    const { wagon: next } = tickNpcWagon(starving, CTX, makeRng('t-faithful'));
    const corpse = next.party.find((m) => m.id === corpseId)!;
    expect(corpse.consumed).toBeFalsy();
    expect(next.inventory.game_meat ?? 0).toBe(0);
  });

  it('missing personaId falls back to balanced (cannibalizes)', () => {
    const train = freshTrain();
    const w = train.companions[0];
    const corpseId = w.party[1].id;
    const starving: NpcWagonState = {
      ...w,
      personaId: undefined,
      inventory: emptyFood(w.inventory),
      party: w.party.map((m) =>
        m.id === corpseId
          ? { ...m, dead: true, health: 0, deathDay: CTX.day - 1, deathCause: 'starvation' as const }
          : m
      )
    };
    const { wagon: next } = tickNpcWagon(starving, CTX, makeRng('t-default'));
    const corpse = next.party.find((m) => m.id === corpseId)!;
    expect(corpse.consumed).toBe(true);
  });
});
