import { describe, it, expect } from 'vitest';
import { tickDayPausable } from '../src/lib/game/engine-pausable';
import { createInitialState } from '../src/lib/game/engine';
import { generateTrain } from '../src/lib/game/content/trains';
import { makeRng } from '../src/lib/game/rng';
import type { GameState } from '../src/lib/game/types';

function base(): GameState {
  const s = createInitialState({
    seed: 'layby-oxen',
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [{ name: 'Mary', profession: 'doctor' }],
    startDate: { year: 1848, month: 6, day: 2 } // a Friday — avoids Sabbath
  });
  // Pre-fatigue the oxen and dent the wagon so changes are measurable.
  return {
    ...s,
    pace: 'moderate',
    oxen: s.oxen.map((o) => ({ ...o, fatigue: 50 })),
    wagon: { ...s.wagon, condition: 90 }
  };
}

describe('#review — company lay-by must not tire oxen or age the wagon', () => {
  it('a crisis lay-by recovers ox fatigue and leaves the wagon condition untouched', () => {
    const s0 = base();
    const t = generateTrain('layby', 1, null, makeRng('layby'), { fresh: true });
    const s: GameState = {
      ...s0,
      // crisis: a party member below the crisis HP floor forces lay-by.
      party: s0.party.map((m, i) => (i === 0 ? { ...m, health: 15 } : m)),
      wagonTrain: { ...t, doctrine: 'prudent', leaderId: 'player', companyDecisionBlock: undefined }
    };
    const milesBefore = s.location.milesTraveled;
    const { state: after } = tickDayPausable(s);

    // didn't move
    expect(after.location.milesTraveled).toBe(milesBefore);
    // wagon didn't decay on a day it didn't roll
    expect(after.wagon.condition).toBe(90);
    // oxen rested rather than pulled — fatigue went DOWN, not up
    for (const ox of after.oxen.filter((o) => o.health > 0)) {
      expect(ox.fatigue).toBeLessThan(50);
    }
  });

  it('control: a solo traveling party still tires the oxen and wears the wagon', () => {
    const after = tickDayPausable(base()).state;
    expect(after.location.milesTraveled).toBeGreaterThan(0);
    expect(after.wagon.condition).toBeLessThan(90); // travel decay
    // at least one ox accrued fatigue from pulling
    expect(after.oxen.some((o) => o.health > 0 && o.fatigue > 50)).toBe(true);
  });
});
