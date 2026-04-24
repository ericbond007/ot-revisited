import { describe, it, expect } from 'vitest';
import { createInitialState, tickDay } from '../../src/lib/game/engine';
import { rest } from '../../src/lib/game/actions/rest';

function newGame() {
  const s = createInitialState({
    seed: 'trail',
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [
      { name: 'Mary', profession: 'doctor' },
      { name: 'Tom', profession: 'hunter' },
      { name: 'Sarah', profession: 'teamster' }
    ],
    startDate: { year: 1848, month: 4, day: 15 }
  });
  // No-interaction 150-day simulation never fords or refills, so
  // dehydration (#135) kills the party. Large reservoir so this test
  // measures smoke-level progress, not thirst.
  return { ...s, resources: { water: 2000, waterCap: 2000 } };
}

describe('full-trail smoke', () => {
  it('a 4-person party survives 150 days of travel + camp + rest cycles', () => {
    let s = newGame();
    for (let cycle = 0; cycle < 30 && !s.completed; cycle++) {
      for (let d = 0; d < 4; d++) s = tickDay(s);
      s = rest(s, 1);
      s = rest(s, 1);
    }
    expect(s.location.milesTraveled).toBeGreaterThan(500);
    expect(s.party.some((m) => !m.dead)).toBe(true);
  });

  it('is deterministic across runs', () => {
    function run() {
      let s = newGame();
      for (let cycle = 0; cycle < 15; cycle++) {
        for (let d = 0; d < 4; d++) s = tickDay(s);
        s = rest(s, 1);
        s = rest(s, 1);
      }
      return s;
    }
    expect(run()).toEqual(run());
  });
});
