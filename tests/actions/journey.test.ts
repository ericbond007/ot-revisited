import { describe, it, expect } from 'vitest';
import { createInitialState, tickDay } from '../../src/lib/game/engine';
import { camp } from '../../src/lib/game/actions/camp';
import { rest } from '../../src/lib/game/actions/rest';
import type { GameState, Ox } from '../../src/lib/game/types';

function freshParty(): GameState {
  const s = createInitialState({
    seed: 'journey',
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [
      { name: 'Mary', profession: 'doctor' },
      { name: 'Tom', profession: 'hunter' }
    ],
    startDate: { year: 1848, month: 4, day: 15 }
  });
  const oxen: Ox[] = Array.from({ length: 4 }, (_, i) => ({
    id: `ox-${i}`,
    health: 100,
    fatigue: 0,
    shod: true
  }));
  return { ...s, oxen };
}

describe('full journey: Independence → Fort Kearny', () => {
  it('reaches Fort Kearny within ~40 calendar days using travel + camp + rest', () => {
    let s = freshParty();
    for (let cycle = 0; cycle < 8 && !s.completed; cycle++) {
      for (let d = 0; d < 4; d++) s = tickDay(s);
      s = camp(s, {});
      s = rest(s, 1);
    }
    expect(s.location.milesTraveled).toBeGreaterThanOrEqual(300);
  });

  it('nobody dies in a healthy journey', () => {
    let s = freshParty();
    for (let cycle = 0; cycle < 8 && !s.completed; cycle++) {
      for (let d = 0; d < 4; d++) s = tickDay(s);
      s = camp(s, {});
      s = rest(s, 1);
    }
    expect(s.party.every((m) => !m.dead)).toBe(true);
  });

  it('same seed + same action sequence = identical final state', () => {
    function run() {
      let s = freshParty();
      for (let cycle = 0; cycle < 8; cycle++) {
        for (let d = 0; d < 4; d++) s = tickDay(s);
        s = camp(s, {});
        s = rest(s, 1);
      }
      return s;
    }
    expect(run()).toEqual(run());
  });
});
