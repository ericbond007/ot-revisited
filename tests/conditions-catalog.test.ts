import { describe, it, expect } from 'vitest';
import { CONDITIONS, getCondition } from '../src/lib/game/content/conditions';
import type { ConditionId } from '../src/lib/game/types';

const EXPECTED_IDS: ConditionId[] = [
  'cholera', 'dysentery', 'typhoid', 'measles',
  'exhaustion', 'broken_leg', 'snakebite', 'frostbite', 'scurvy',
  'starvation', 'pox',
  // #198 — grizzly mauling, severe wound from a big-game mountain hunt.
  'bear_mauling'
];

describe('condition catalog', () => {
  it('has all 12 conditions from the spec', () => {
    const ids = Object.keys(CONDITIONS).sort();
    expect(ids).toEqual([...EXPECTED_IDS].sort());
  });

  it('every condition has a non-empty name and daily HP delta', () => {
    for (const c of Object.values(CONDITIONS)) {
      expect(c.name).toBeTruthy();
      expect(typeof c.dailyHealthDelta).toBe('number');
    }
  });

  it('cholera deals -10 / day and is contagious', () => {
    const c = getCondition('cholera');
    expect(c.dailyHealthDelta).toBe(-10);
    expect(c.contagious).toBe(true);
  });

  it('dysentery deals -3 / day', () => {
    expect(getCondition('dysentery').dailyHealthDelta).toBe(-3);
  });

  it('snakebite has immediate shock + daily drip', () => {
    const c = getCondition('snakebite');
    expect(c.immediateDamage).toBe(15);
    expect(c.dailyHealthDelta).toBe(-5);
  });

  it('exhaustion also deals morale damage', () => {
    const c = getCondition('exhaustion');
    expect(c.dailyMoraleDelta).toBe(-1);
  });

  it('scurvy resolves on dried fruit', () => {
    const c = getCondition('scurvy');
    expect(c.resolvedByItems).toContain('dried_fruit');
  });

  it('getCondition throws for unknown ids', () => {
    // @ts-expect-error - deliberately wrong id
    expect(() => getCondition('bubonic_plague')).toThrow();
  });
});
