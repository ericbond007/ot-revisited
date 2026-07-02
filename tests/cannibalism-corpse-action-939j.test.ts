// #939j — Reinstated `cannibalism_corpse` camp action. Player-initiated
// corpse consumption, gated strictly on `food = 0 + fresh corpse`. Last-
// resort: hidden when food is on hand.

import { foodItemIds } from '../src/lib/game/content/items';
import { describe, it, expect } from 'vitest';
import {
  CAMP_ACTIONS,
  CAMP_ACTIONS_BY_ID,
  type CampActionId
} from '../src/lib/game/actions/camp-actions';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState } from '../src/lib/game/types';

function emptyFood<T extends Record<string, number>>(inv: T): T {
  // #1643 — zero via the canonical catalog list; the old hand-typed list
  // missed sugar (starter kit ships 60 lb) / tallow / prize_cut, so
  // "empty-food" fixtures secretly carried edible stores.
  const out: Record<string, number> = { ...inv };
  for (const k of foodItemIds()) out[k] = 0;
  return out as T;
}

function game(): GameState {
  return createInitialState({
    seed: 'cannibal-corpse',
    leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'doctor' }],
    startDate: { year: 1849, month: 6, day: 15 }
  });
}

function killAdult(s: GameState, idx: number): GameState {
  return {
    ...s,
    party: s.party.map((m, i) =>
      i === idx
        ? { ...m, dead: true, health: 0, deathCause: 'Starvation', deathDay: s.day }
        : m
    )
  };
}

const ID = 'cannibalism_corpse' as CampActionId;

describe('#939j — cannibalism_corpse camp action registration', () => {
  it('is in the CAMP_ACTIONS array', () => {
    const found = CAMP_ACTIONS.find((a) => a.id === ID);
    expect(found).toBeDefined();
  });

  it('is in CAMP_ACTIONS_BY_ID lookup', () => {
    expect(CAMP_ACTIONS_BY_ID[ID]).toBeDefined();
  });
});

describe('#939j — cannibalism_corpse availability gate', () => {
  const action = CAMP_ACTIONS_BY_ID[ID];

  it('hidden when food is on hand (starter inventory)', () => {
    expect(action.hidden?.(game()) ?? false).toBe(true);
  });

  it('visible when food is gone', () => {
    const s = { ...game(), inventory: emptyFood(game().inventory) };
    expect(action.hidden?.(s) ?? false).toBe(false);
  });

  it('unavailable when food gone but no fresh corpse', () => {
    const s = { ...game(), inventory: emptyFood(game().inventory) };
    const avail = action.availability(s);
    expect(avail.available).toBe(false);
    expect(avail.reason).toMatch(/no fresh body/i);
  });

  it('unavailable when corpse present but food on hand', () => {
    let s = killAdult(game(), 1);
    const avail = action.availability(s);
    expect(avail.available).toBe(false);
    expect(avail.reason).toMatch(/out of food/i);
  });

  it('available when food = 0 AND fresh corpse present', () => {
    let s = { ...game(), inventory: emptyFood(game().inventory) };
    s = killAdult(s, 1);
    const avail = action.availability(s);
    expect(avail.available).toBe(true);
  });
});

describe('#939j — cannibalism_corpse apply', () => {
  const action = CAMP_ACTIONS_BY_ID[ID];

  it('consumes the corpse, adds 50 lb meat, hits morale −18, +1 count', () => {
    let s = { ...game(), inventory: emptyFood(game().inventory) };
    s = killAdult(s, 1);
    const moraleBefore = s.morale;
    const next = action.apply(s, makeRng('t'));
    expect(next.party[1].consumed).toBe(true);
    expect(next.inventory.game_meat ?? 0).toBe(50);
    expect(next.morale).toBe(Math.max(0, moraleBefore - 18));
    expect(next.flags._cannibalismCount).toBe(1);
  });

  it('defensive: returns state unchanged if food appears between gate + apply', () => {
    let s = killAdult(game(), 1);
    const next = action.apply(s, makeRng('t'));
    expect(next).toBe(s);
  });

  it('defensive: returns state unchanged if no fresh corpse', () => {
    const s = { ...game(), inventory: emptyFood(game().inventory) };
    const next = action.apply(s, makeRng('t'));
    expect(next).toBe(s);
  });

  it('hour cost is 2', () => {
    expect(action.hourCost).toBe(2);
  });
});
