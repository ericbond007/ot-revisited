// #939j — Shared cannibal helper invariants. Pins the unified
// constants and gating predicates that the burial-event choice,
// cannibalism_corpse camp action, and tickNpcWagon maybeCannibalize
// all share.

import { describe, it, expect } from 'vitest';
import {
  applyCannibalize,
  findFreshUnconsumedCorpse,
  hasFoodOnHand,
  CANNIBAL_ADULT_MEAT_LB,
  CANNIBAL_ADULT_MORALE_HIT,
  CANNIBAL_CHILD_MEAT_LB,
  CANNIBAL_CHILD_MORALE_HIT,
  CANNIBAL_FRESHNESS_DAYS
} from '../src/lib/game/systems/cannibal';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState } from '../src/lib/game/types';

function emptyFood<T extends Record<string, number>>(inv: T): T {
  const out: Record<string, number> = { ...inv };
  for (const k of [
    'flour', 'bacon', 'beans', 'hardtack', 'jerky', 'pemmican', 'salt_pork',
    'game_meat', 'berries', 'egg', 'milk', 'dried_fruit', 'cheese', 'butter',
    'cornmeal'
  ]) {
    delete out[k];
  }
  return out as T;
}

function game(): GameState {
  const s = createInitialState({
    seed: 'cannibal',
    leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'doctor' }],
    startDate: { year: 1849, month: 6, day: 15 }
  });
  return { ...s, inventory: emptyFood(s.inventory) };
}

function killMember(state: GameState, id: string, deathCause: string, deathDay: number): GameState {
  return {
    ...state,
    party: state.party.map((m) =>
      m.id === id ? { ...m, dead: true, health: 0, deathCause, deathDay } : m
    )
  };
}

describe('#939j — applyCannibalize constants', () => {
  it('exports the locked constants', () => {
    expect(CANNIBAL_ADULT_MEAT_LB).toBe(50);
    expect(CANNIBAL_ADULT_MORALE_HIT).toBe(18);
    expect(CANNIBAL_CHILD_MEAT_LB).toBe(25);
    expect(CANNIBAL_CHILD_MORALE_HIT).toBe(25);
    expect(CANNIBAL_FRESHNESS_DAYS).toBe(5);
  });
});

describe('#939j — applyCannibalize (adult)', () => {
  it('marks consumed, +50 meat, −18 morale, +1 _cannibalismCount', () => {
    let s = game();
    s = killMember(s, s.party[1].id, 'Starvation', s.day);
    const moraleBefore = s.morale;
    const { state, log } = applyCannibalize(s, s.party[1].id, makeRng('t'));
    expect(state.party[1].consumed).toBe(true);
    expect(state.inventory.game_meat ?? 0).toBe(50);
    expect(state.morale).toBe(Math.max(0, moraleBefore - 18));
    expect(state.flags._cannibalismCount).toBe(1);
    expect(log).toMatch(/50 lb/);
    expect(log).toMatch(/Morale −18/);
  });

  it('stacks _cannibalismCount across calls', () => {
    let s = game();
    s = killMember(s, s.party[0].id, 'Starvation', s.day);
    s = killMember(s, s.party[1].id, 'Starvation', s.day);
    const r1 = applyCannibalize(s, s.party[0].id, makeRng('t1'));
    expect(r1.state.flags._cannibalismCount).toBe(1);
    const r2 = applyCannibalize(r1.state, s.party[1].id, makeRng('t2'));
    expect(r2.state.flags._cannibalismCount).toBe(2);
  });
});

describe('#939j — applyCannibalize (child)', () => {
  it('marks consumed, +25 meat, −25 morale, +1 count', () => {
    let s = game();
    s = { ...s, party: s.party.map((m, i) => i === 1 ? { ...m, kind: 'child' as const } : m) };
    s = killMember(s, s.party[1].id, 'Starvation', s.day);
    const moraleBefore = s.morale;
    const { state, log } = applyCannibalize(s, s.party[1].id, makeRng('t'));
    expect(state.inventory.game_meat ?? 0).toBe(25);
    expect(state.morale).toBe(Math.max(0, moraleBefore - 25));
    expect(state.flags._cannibalismCount).toBe(1);
    expect(log).toMatch(/25 lb/);
  });
});

describe('#939j — applyCannibalize defensive fallback', () => {
  it('returns state unchanged when corpseId not found', () => {
    const s = game();
    const { state, log } = applyCannibalize(s, 'no-such-id', makeRng('t'));
    expect(state).toBe(s);
    expect(log).toMatch(/no fresh corpse/i);
  });

  it('returns state unchanged when corpse is already consumed', () => {
    let s = game();
    s = killMember(s, s.party[1].id, 'Starvation', s.day);
    s = { ...s, party: s.party.map((m) =>
      m.id === s.party[1].id ? { ...m, consumed: true } : m) };
    const { state, log } = applyCannibalize(s, s.party[1].id, makeRng('t'));
    expect(state).toBe(s);
    expect(log).toMatch(/no fresh corpse/i);
  });
});

describe('#939j — findFreshUnconsumedCorpse', () => {
  it('returns null when no dead members', () => {
    expect(findFreshUnconsumedCorpse(game())).toBeNull();
  });

  it('returns the most-recent fresh adult', () => {
    let s = game();
    s = killMember(s, s.party[1].id, 'Cholera', s.day - 1);
    expect(findFreshUnconsumedCorpse(s)?.id).toBe(s.party[1].id);
  });

  it('rejects corpses past the freshness window', () => {
    let s = game();
    s = killMember(s, s.party[1].id, 'Cholera', s.day - 6);
    expect(findFreshUnconsumedCorpse(s)).toBeNull();
  });

  it('rejects already-consumed corpses', () => {
    let s = game();
    s = killMember(s, s.party[1].id, 'Cholera', s.day);
    s = { ...s, party: s.party.map((m) =>
      m.id === s.party[1].id ? { ...m, consumed: true } : m) };
    expect(findFreshUnconsumedCorpse(s)).toBeNull();
  });

  it('child corpse: starvation deathCause eligible (all casings)', () => {
    for (const cause of ['Starvation', 'starvation', 'attrition']) {
      let s = game();
      s = { ...s, party: s.party.map((m, i) => i === 1 ? { ...m, kind: 'child' as const } : m) };
      s = killMember(s, s.party[1].id, cause, s.day);
      expect(findFreshUnconsumedCorpse(s)?.id).toBe(s.party[1].id);
    }
  });

  it('child corpse: cannibalism_volunteered eligible (straws victim)', () => {
    let s = game();
    s = { ...s, party: s.party.map((m, i) => i === 1 ? { ...m, kind: 'child' as const } : m) };
    s = killMember(s, s.party[1].id, 'cannibalism_volunteered', s.day);
    expect(findFreshUnconsumedCorpse(s)?.id).toBe(s.party[1].id);
  });

  it('child corpse: non-starvation cause ineligible', () => {
    let s = game();
    s = { ...s, party: s.party.map((m, i) => i === 1 ? { ...m, kind: 'child' as const } : m) };
    s = killMember(s, s.party[1].id, 'Cholera', s.day);
    expect(findFreshUnconsumedCorpse(s)).toBeNull();
  });
});

describe('#939j — hasFoodOnHand', () => {
  it('returns false on empty-food state', () => {
    expect(hasFoodOnHand(game())).toBe(false);
  });

  it('returns true when any food key has > 0', () => {
    const s = { ...game(), inventory: { ...game().inventory, flour: 5 } };
    expect(hasFoodOnHand(s)).toBe(true);
  });

  it('treats game_meat as food', () => {
    const s = { ...game(), inventory: { ...game().inventory, game_meat: 50 } };
    expect(hasFoodOnHand(s)).toBe(true);
  });
});
