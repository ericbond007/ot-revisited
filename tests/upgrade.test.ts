import { describe, it, expect } from 'vitest';
import { upgradeState } from '../src/lib/game/upgrade';
import { createInitialState } from '../src/lib/game/engine';

describe('upgradeState', () => {
  it('fills in missing flags with safe defaults', () => {
    const s = createInitialState({
      seed: 'u',
      leader: { name: 'A', profession: 'farmer' },
      companions: [{ name: 'B', profession: 'doctor' }],
      startDate: { year: 1848, month: 4, day: 15 }
    });
    const old = { ...s, flags: {} };
    const upgraded = upgradeState(old);
    expect(upgraded.flags.hasBoilingKnowledge).toBe(false);
    expect(upgraded.flags.hadFireLastNight).toBe(false);
  });

  it('does not overwrite existing flag values', () => {
    const s = createInitialState({
      seed: 'u',
      leader: { name: 'A', profession: 'farmer' },
      companions: [{ name: 'B', profession: 'doctor' }],
      startDate: { year: 1848, month: 4, day: 15 }
    });
    const mutated = { ...s, flags: { hasBoilingKnowledge: true, hadFireLastNight: true } };
    const upgraded = upgradeState(mutated);
    expect(upgraded.flags.hasBoilingKnowledge).toBe(true);
    expect(upgraded.flags.hadFireLastNight).toBe(true);
  });

  it('is idempotent', () => {
    const s = createInitialState({
      seed: 'u',
      leader: { name: 'A', profession: 'farmer' },
      companions: [{ name: 'B', profession: 'doctor' }],
      startDate: { year: 1848, month: 4, day: 15 }
    });
    const once = upgradeState(s);
    const twice = upgradeState(once);
    expect(twice).toEqual(once);
  });
});
