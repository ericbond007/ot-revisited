import { describe, it, expect } from 'vitest';
import { rest } from '../src/lib/game/actions/rest';
import { CAMP_ACTIONS, getCampAction } from '../src/lib/game/actions/camp-actions';
import { createInitialState } from '../src/lib/game/engine';
import type { GameState } from '../src/lib/game/types';

function newGame(): GameState {
  const s = createInitialState({
    seed: 'cannib',
    // No farmer — they auto-forage flour on rest days, defeating the
    // "out of food" gate.
    leader: { name: 'Ezra', profession: 'carpenter' },
    companions: [
      { name: 'Mary', profession: 'doctor' },
      { name: 'Tom', profession: 'scout' }
    ],
    startDate: { year: 1848, month: 4, day: 15 }
  });
  // Strip ALL food so the cannibalism actions can fire.
  return {
    ...s,
    inventory: {},
    resources: { water: 500, waterCap: 500, firewood: 500 },
    morale: 60
  };
}

function withCorpse(s: GameState): GameState {
  return {
    ...s,
    party: s.party.map((m, i) =>
      i === 1 ? { ...m, dead: true, deathDay: s.day - 1, deathCause: 'Cholera' } : m
    )
  };
}

describe('cannibalism — visibility', () => {
  it('both actions are hidden when there IS food', () => {
    const s = createInitialState({
      seed: 'has-food',
      leader: { name: 'A', profession: 'farmer' },
      companions: [{ name: 'B', profession: 'doctor' }],
      startDate: { year: 1848, month: 4, day: 15 }
    });
    const corpseAction = getCampAction('cannibalism_corpse');
    const strawsAction = getCampAction('cannibalism_straws');
    expect(corpseAction.hidden!(s)).toBe(true);
    expect(strawsAction.hidden!(s)).toBe(true);
  });

  it('corpse action is visible only when out of food AND a corpse exists', () => {
    const s = newGame();
    const corpseAction = getCampAction('cannibalism_corpse');
    // No corpse yet → still hidden.
    expect(corpseAction.hidden!(s)).toBe(true);
    // Add a corpse → visible.
    expect(corpseAction.hidden!(withCorpse(s))).toBe(false);
  });

  it('straws action is visible only when out of food, no corpse, ≥2 alive adults', () => {
    const s = newGame();
    const strawsAction = getCampAction('cannibalism_straws');
    expect(strawsAction.hidden!(s)).toBe(false); // 3 alive adults
    // With a corpse present, straws should hide (corpse takes priority).
    expect(strawsAction.hidden!(withCorpse(s))).toBe(true);
  });

  it('straws action hides when only one alive adult remains', () => {
    const s = newGame();
    const lonely = {
      ...s,
      party: s.party.map((m, i) => (i > 0 ? { ...m, dead: true, deathDay: 0, deathCause: 'X' } : m))
    };
    // After fixture mutation, member at index 1 has deathDay 0 — that's >5 days back from day 1, so the
    // recent-corpse window correctly excludes it (the straws hidden() checks for no recent corpse).
    expect(getCampAction('cannibalism_straws').hidden!(lonely)).toBe(true); // <2 alive
  });
});

describe('cannibalism — apply', () => {
  it('eat-the-dead consumes the body, grants 50 lb meat, drops morale', () => {
    const s0 = withCorpse(newGame());
    const out = rest(s0, 1, { campActions: ['cannibalism_corpse'] });
    expect(out.inventory.game_meat).toBe(50);
    const consumed = out.party.find((m) => m.consumed === true);
    expect(consumed).toBeTruthy();
    expect(out.morale).toBeLessThan(s0.morale);
    expect(out.flags._cannibalismCount).toBe(1);
  });

  it('drawing straws kills the weakest, grants 60 lb meat, sets guilt counter', () => {
    let s0 = newGame();
    // Wound member 2 (Tom) so they're the weakest.
    s0 = { ...s0, party: s0.party.map((m, i) => (i === 2 ? { ...m, health: 30 } : m)) };
    const out = rest(s0, 1, { campActions: ['cannibalism_straws'] });
    expect(out.inventory.game_meat).toBe(60);
    const tom = out.party.find((m) => m.name === 'Tom');
    expect(tom?.dead).toBe(true);
    expect(tom?.consumed).toBe(true);
    expect(tom?.deathCause).toMatch(/short straw/i);
    expect(out.morale).toBeLessThan(s0.morale);
    expect(out.flags._cannibalismCount).toBe(3);
  });

  it('eating the dead clears any pending-burial flag', () => {
    let s0 = withCorpse(newGame());
    s0 = { ...s0, flags: { ...s0.flags, _burialPending: true } };
    const out = rest(s0, 1, { campActions: ['cannibalism_corpse'] });
    expect(out.flags._burialPending).toBeUndefined();
  });

  it('eat-the-dead refuses if no corpse exists (availability gate)', () => {
    const s = newGame();
    expect(() => rest(s, 1, { campActions: ['cannibalism_corpse'] })).toThrow(/starving|body/i);
  });
});

describe('cannibalism — registry', () => {
  it('both actions exist in CAMP_ACTIONS', () => {
    const ids = CAMP_ACTIONS.map((a) => a.id);
    expect(ids).toContain('cannibalism_corpse');
    expect(ids).toContain('cannibalism_straws');
  });
});
