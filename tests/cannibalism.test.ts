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

describe('cannibalism_straws — visibility', () => {
  // Per #205, the corpse-eating choice was moved off the camp grid and
  // onto the personal_burial event popup (see tests/burial-event.test.ts).
  // Only draws-straws remains as a camp action: starving party, no recent
  // body around, ≥2 alive adults.
  it('hidden when there IS food', () => {
    const s = createInitialState({
      seed: 'has-food',
      leader: { name: 'A', profession: 'farmer' },
      companions: [{ name: 'B', profession: 'doctor' }],
      startDate: { year: 1848, month: 4, day: 15 }
    });
    expect(getCampAction('cannibalism_straws').hidden!(s)).toBe(true);
  });

  it('visible when out of food, no corpse, ≥2 alive adults', () => {
    const s = newGame();
    expect(getCampAction('cannibalism_straws').hidden!(s)).toBe(false);
  });

  it('hides while a recent corpse is around (resolve burial first)', () => {
    expect(getCampAction('cannibalism_straws').hidden!(withCorpse(newGame()))).toBe(true);
  });

  it('hides when only one alive adult remains', () => {
    const s = newGame();
    const lonely = {
      ...s,
      party: s.party.map((m, i) => (i > 0 ? { ...m, dead: true, deathDay: 0, deathCause: 'X' } : m))
    };
    expect(getCampAction('cannibalism_straws').hidden!(lonely)).toBe(true);
  });
});

describe('cannibalism_straws — apply', () => {
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
});

describe('cannibalism — registry', () => {
  it('#939j — both cannibalism actions in the camp grid', () => {
    // cannibalism_corpse was originally removed (#205) and reinstated
    // by #939j for the by-choice path. Both surfaces gate strictly on
    // food=0 so neither appears outside last-resort.
    const ids = CAMP_ACTIONS.map((a) => a.id);
    expect(ids).toContain('cannibalism_straws');
    expect(ids).toContain('cannibalism_corpse');
  });
});
