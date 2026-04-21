import { describe, it, expect } from 'vitest';
import { reapDead } from '../src/lib/game/systems/death';
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

describe('reapDead', () => {
  it('flips dead=true when health is 0', () => {
    const s = newGame();
    s.party[1].health = 0;
    const next = reapDead(s, makeRng('t:1'));
    expect(next.party[1].dead).toBe(true);
    expect(next.party[1].deathDay).toBe(s.day);
    expect(next.party[1].deathCause).toBeTruthy();
  });

  it('uses the most damaging condition as death cause', () => {
    const s = newGame();
    s.party[1].health = 0;
    s.party[1].conditions = [
      { id: 'scurvy', daysSinceOnset: 20 },
      { id: 'cholera', daysSinceOnset: 3 }
    ];
    const next = reapDead(s, makeRng('t:1'));
    expect(next.party[1].deathCause).toMatch(/cholera/i);
  });

  it('falls back to "exposure" when no conditions and health hit 0', () => {
    const s = newGame();
    s.party[1].health = 0;
    s.party[1].conditions = [];
    const next = reapDead(s, makeRng('t:1'));
    expect(next.party[1].deathCause).toMatch(/exposure/i);
  });

  it('marks outcome=wiped when the whole party dies', () => {
    const s = newGame();
    for (const m of s.party) m.health = 0;
    const next = reapDead(s, makeRng('t:1'));
    expect(next.outcome).toBe('wiped');
    expect(next.completed).toBe(true);
  });

  it('is idempotent — re-running does not re-stamp deathDay', () => {
    let s = newGame();
    s.party[1].health = 0;
    s = reapDead(s, makeRng('t:1'));
    const firstDeathDay = s.party[1].deathDay;
    s = reapDead(s, makeRng('t:2'));
    expect(s.party[1].deathDay).toBe(firstDeathDay);
  });
});
