import { describe, it, expect } from 'vitest';
import { tickWagon } from '../src/lib/game/systems/wagon';
import { makeRng } from '../src/lib/game/rng';
import { createInitialState } from '../src/lib/game/engine';

function newGame() {
  return createInitialState({
    seed: 't',
    leader: { name: 'A', profession: 'farmer' },
    companions: [{ name: 'B', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
}

describe('tickWagon', () => {
  it('decays at moderate rate on moderate pace and baseline terrain', () => {
    const s = newGame();
    expect(s.wagon.condition).toBe(100);
    const next = tickWagon(s, makeRng('t:1'));
    expect(next.wagon.condition).toBeLessThan(100);
    expect(next.wagon.condition).toBeGreaterThan(99);
  });

  it('decays faster on grueling pace', () => {
    const s = newGame();
    const moderate = tickWagon(s, makeRng('t:1')).wagon.condition;
    const grueling = tickWagon({ ...s, pace: 'grueling' }, makeRng('t:1')).wagon.condition;
    expect(grueling).toBeLessThan(moderate);
  });

  it('decays faster on mountains terrain', () => {
    const s = newGame();
    const prairie = tickWagon(s, makeRng('t:1')).wagon.condition;
    const mtns = tickWagon(
      { ...s, location: { ...s.location, terrain: 'mountains' } },
      makeRng('t:1')
    ).wagon.condition;
    expect(mtns).toBeLessThan(prairie);
  });

  it('clamps at 0', () => {
    const s = { ...newGame(), wagon: { model: 'prairie_schooner' as const, condition: 0.1, canvas: 100, carryCapacity: 2500, impairment: null } };
    const next = tickWagon({ ...s, pace: 'grueling' }, makeRng('t:1'));
    expect(next.wagon.condition).toBeGreaterThanOrEqual(0);
  });
});
