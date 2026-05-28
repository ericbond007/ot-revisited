import { describe, expect, it } from 'vitest';
import { resolveWheelBreak } from '../src/lib/game/systems/wheel-break';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';

/** Party with no Carpenter — spare is always consumed deterministically. */
function freshState(overrides: { wheel?: number; impairment?: any } = {}) {
  const s = createInitialState({
    seed: 'wheel-929',
    leader: { name: 'A', profession: 'farmer', sex: 'male' },
    companions: [{ name: 'B', profession: 'teacher', sex: 'female' }],
    startDate: { year: 1848, month: 4, day: 15 },
    includeStarterKit: true
  });
  if (overrides.wheel !== undefined) s.inventory.wheel = overrides.wheel;
  if (overrides.impairment !== undefined) s.wagon.impairment = overrides.impairment;
  return s;
}

describe('resolveWheelBreak — spare', () => {
  it('consumes one wheel, +10 condition, clears impairment', () => {
    const before = freshState({
      wheel: 2,
      impairment: { kind: 'wheel', paceMult: 0.5, conditionDecayMult: 2,
                    contractedAt: { day: 10, mile: 200 } }
    });
    before.wagon.condition = 60;
    const rng = makeRng('test');
    const { state: after, log } = resolveWheelBreak(before, rng, 'spare');
    expect(after.inventory.wheel).toBe(1);
    expect(after.wagon.condition).toBe(70);
    expect(after.wagon.impairment).toBeNull();
    expect(log).toMatch(/spare wheel/i);
  });

  it('clamps condition at 100 when near-full', () => {
    const before = freshState({ wheel: 1 });
    before.wagon.condition = 95;
    const { state: after } = resolveWheelBreak(before, makeRng('t'), 'spare');
    expect(after.wagon.condition).toBe(100);
  });
});

describe('resolveWheelBreak — push_on', () => {
  it('sets wagon.impairment with paceMult 0.5, decayMult 2, no day-cost', () => {
    const before = freshState({ wheel: 0 });
    before.day = 25;
    before.location.milesTraveled = 412;
    before.wagon.condition = 55;
    const { state: after, log } = resolveWheelBreak(before, makeRng('t'), 'push_on');
    expect(after.day).toBe(25);
    expect(after.wagon.condition).toBe(55);
    expect(after.wagon.impairment).toEqual({
      kind: 'wheel',
      paceMult: 0.5,
      conditionDecayMult: 2,
      contractedAt: { day: 25, mile: 412 }
    });
    expect(log).toMatch(/limp/i);
  });
});
