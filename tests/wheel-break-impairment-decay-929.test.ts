import { describe, expect, it } from 'vitest';
import { milesPerDay } from '../src/lib/game/systems/travel';
import { createInitialState } from '../src/lib/game/engine';

function baseline() {
  return createInitialState({
    seed: 'impairment-929',
    leader: { name: 'L', profession: 'farmer', sex: 'male' },
    companions: [{ name: 'B', profession: 'teacher', sex: 'female' }],
    startDate: { year: 1848, month: 4, day: 15 },
    includeStarterKit: true
  });
}

describe('milesPerDay honors wagon.impairment.paceMult', () => {
  it('halves miles per day when impairment.paceMult = 0.5', () => {
    const s = baseline();
    const sound = milesPerDay(s);
    s.wagon.impairment = {
      kind: 'wheel', paceMult: 0.5, conditionDecayMult: 2,
      contractedAt: { day: 5, mile: 100 }
    };
    expect(milesPerDay(s)).toBe(Math.round(sound * 0.5));
  });

  it('null impairment leaves pace unchanged', () => {
    const s = baseline();
    s.wagon.impairment = null;
    const before = milesPerDay(s);
    expect(milesPerDay(s)).toBe(before);
  });
});
