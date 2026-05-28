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

import { tickWagon } from '../src/lib/game/systems/wagon';
import { makeRng } from '../src/lib/game/rng';

describe('tickWagon honors wagon.impairment.conditionDecayMult', () => {
  it('doubles condition decay when decayMult = 2', () => {
    const sound = baseline();
    sound.wagon.condition = 80;
    sound.wagon.impairment = null;
    const tickedSound = tickWagon(sound, makeRng('a'));
    const soundDecay = sound.wagon.condition - tickedSound.wagon.condition;

    const limp = baseline();
    limp.wagon.condition = 80;
    limp.wagon.impairment = {
      kind: 'wheel', paceMult: 0.5, conditionDecayMult: 2,
      contractedAt: { day: 5, mile: 100 }
    };
    const tickedLimp = tickWagon(limp, makeRng('a'));
    const limpDecay = limp.wagon.condition - tickedLimp.wagon.condition;
    expect(limpDecay).toBeCloseTo(soundDecay * 2, 1);
  });
});
