// #899 — applyNpcPostRestock consumes persona.pickFoodRestockOpts.
// Wagon's personaId tunes how much food it buys per stop: hoarder
// (15/30) buys less than balanced (25/60); aggressive (15/45) is
// in between. The cash gate + cull-loop still apply on top.

import { describe, it, expect } from 'vitest';
import { applyNpcPostRestock, joinTrain } from '../src/lib/game/systems/wagon-train';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState, NpcWagonState } from '../src/lib/game/types';

function game(): GameState {
  return createInitialState({
    seed: 'r899',
    leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'doctor' }],
    startDate: { year: 1849, month: 4, day: 15 }
  });
}

function arriveAt(s: GameState, landmarkId: string): GameState {
  return { ...s, location: { ...s.location, atLandmarkId: landmarkId } };
}

/** Replace companion 0 with a hand-built one — flour=0, plenty of cash,
 *  override personaId. Returns total flour purchased (the most
 *  visible signal of restock-opts size). */
function flourBoughtUnder(personaId: NpcWagonState['personaId']): number {
  let s = joinTrain(game(), makeRng('r')).state;
  s = arriveAt(s, 'ft_kearny'); // 1.0× post — no gouge to confound the test
  s = {
    ...s,
    wagonTrain: {
      ...s.wagonTrain!,
      companions: s.wagonTrain!.companions.map((c, i) =>
        i === 0
          ? {
              ...c,
              personaId,
              inventory: { ...c.inventory, flour: 0 },
              cash: 1000 // generous so the cap is the persona, not the cash
            }
          : c
      )
    }
  };
  const result = applyNpcPostRestock(s);
  return result.wagonTrain!.companions[0].inventory.flour ?? 0;
}

describe('#899 — applyNpcPostRestock consumes persona.pickFoodRestockOpts', () => {
  it('hoarder buys less flour than balanced (15/30 vs 25/60)', () => {
    const hoarder = flourBoughtUnder('hoarder');
    const balanced = flourBoughtUnder('balanced');
    expect(hoarder).toBeLessThan(balanced);
  });

  it('cautious buys more than balanced (30/90 vs 25/60)', () => {
    const cautious = flourBoughtUnder('cautious');
    const balanced = flourBoughtUnder('balanced');
    expect(cautious).toBeGreaterThan(balanced);
  });

  it('aggressive buys less than balanced (15/45 vs 25/60)', () => {
    const aggressive = flourBoughtUnder('aggressive');
    const balanced = flourBoughtUnder('balanced');
    expect(aggressive).toBeLessThan(balanced);
  });

  it('missing personaId falls back to balanced', () => {
    const fallback = flourBoughtUnder(undefined);
    const balanced = flourBoughtUnder('balanced');
    expect(fallback).toBe(balanced);
  });

  it('cash gate still applies (broke wagon buys nothing)', () => {
    let s = joinTrain(game(), makeRng('r')).state;
    s = arriveAt(s, 'ft_kearny');
    s = {
      ...s,
      wagonTrain: {
        ...s.wagonTrain!,
        companions: s.wagonTrain!.companions.map((c, i) =>
          i === 0
            ? {
                ...c,
                personaId: 'cautious' as const,
                inventory: { ...c.inventory, flour: 0 },
                cash: 5
              }
            : c
        )
      }
    };
    const result = applyNpcPostRestock(s);
    // Below the $10 cash floor → no buy regardless of persona generosity
    expect(result.wagonTrain!.companions[0].inventory.flour ?? 0).toBe(0);
    expect(result.wagonTrain!.companions[0].cash).toBe(5);
  });
});
