import { describe, it, expect } from 'vitest';
import { recoverOxenFatigue } from '../src/lib/game/systems/oxen';
import type { Ox } from '../src/lib/game/types';

function ox(overrides: Partial<Ox> = {}): Ox {
  return { id: 'o1', health: 100, fatigue: 50, shod: true, ...overrides };
}

describe('recoverOxenFatigue', () => {
  it('reduces fatigue by the given amount', () => {
    const oxen = [ox({ fatigue: 60 })];
    const recovered = recoverOxenFatigue(oxen, 20);
    expect(recovered[0].fatigue).toBe(40);
  });

  it('clamps at 0', () => {
    const oxen = [ox({ fatigue: 10 })];
    const recovered = recoverOxenFatigue(oxen, 50);
    expect(recovered[0].fatigue).toBe(0);
  });

  it('does not touch dead oxen', () => {
    const oxen = [ox({ fatigue: 50, health: 0 })];
    const recovered = recoverOxenFatigue(oxen, 20);
    expect(recovered[0].fatigue).toBe(50);
  });

  it('handles empty array', () => {
    expect(recoverOxenFatigue([], 20)).toEqual([]);
  });

  it('does not mutate input', () => {
    const oxen = [ox({ fatigue: 50 })];
    const snap = JSON.stringify(oxen);
    recoverOxenFatigue(oxen, 20);
    expect(JSON.stringify(oxen)).toBe(snap);
  });
});
