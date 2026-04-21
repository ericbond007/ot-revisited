import { describe, it, expect } from 'vitest';
import { progressConditions } from '../src/lib/game/systems/conditions';
import { makeRng } from '../src/lib/game/rng';
import { createInitialState } from '../src/lib/game/engine';
import type { GameState } from '../src/lib/game/types';

function newGame(): GameState {
  return createInitialState({
    seed: 't',
    leader: { name: 'A', profession: 'farmer' },
    companions: [{ name: 'B', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
}

describe('progressConditions', () => {
  it('no-ops when nobody has conditions', () => {
    const s = newGame();
    const rng = makeRng('t:1');
    const next = progressConditions(s, rng);
    expect(next.party[0].health).toBe(100);
    expect(next.party[1].health).toBe(100);
  });

  it('applies daily delta to each condition', () => {
    const s = newGame();
    s.party[0].conditions = [{ id: 'cholera', daysSinceOnset: 0 }];
    const rng = makeRng('t:1');
    const next = progressConditions(s, rng);
    expect(next.party[0].health).toBe(90);
    expect(next.party[0].conditions[0].daysSinceOnset).toBe(1);
  });

  it('stacks multiple conditions on the same member', () => {
    const s = newGame();
    s.party[0].conditions = [
      { id: 'cholera', daysSinceOnset: 0 },
      { id: 'dysentery', daysSinceOnset: 0 }
    ];
    const rng = makeRng('t:1');
    const next = progressConditions(s, rng);
    expect(next.party[0].health).toBe(87);
  });

  it('does not drop health below 0', () => {
    const s = newGame();
    s.party[0].health = 5;
    s.party[0].conditions = [{ id: 'cholera', daysSinceOnset: 0 }];
    const rng = makeRng('t:1');
    const next = progressConditions(s, rng);
    expect(next.party[0].health).toBe(0);
  });

  it('applies per-condition morale delta via party-wide morale', () => {
    const s = newGame();
    s.party[0].conditions = [{ id: 'exhaustion', daysSinceOnset: 0 }];
    const rng = makeRng('t:1');
    const next = progressConditions(s, rng);
    expect(next.morale).toBe(s.morale - 1);
  });

  it('does not accrue damage on dead members', () => {
    const s = newGame();
    s.party[0].dead = true;
    s.party[0].health = 0;
    s.party[0].conditions = [{ id: 'cholera', daysSinceOnset: 0 }];
    const rng = makeRng('t:1');
    const next = progressConditions(s, rng);
    expect(next.party[0].health).toBe(0);
    expect(next.party[0].conditions).toHaveLength(1);
  });

  it('does not mutate input', () => {
    const s = newGame();
    s.party[0].conditions = [{ id: 'cholera', daysSinceOnset: 2 }];
    const snap = JSON.stringify(s);
    progressConditions(s, makeRng('t:1'));
    expect(JSON.stringify(s)).toBe(snap);
  });
});
