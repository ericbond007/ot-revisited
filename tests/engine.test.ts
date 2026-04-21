import { describe, it, expect } from 'vitest';
import { tickDay, createInitialState } from '../src/lib/game/engine';
import type { ProfessionId } from '../src/lib/game/types';

const leaderPick: { name: string; profession: ProfessionId } = {
  name: 'Ezra',
  profession: 'farmer'
};

describe('createInitialState', () => {
  it('uses the provided seed', () => {
    const s = createInitialState({
      seed: 's-1',
      leader: leaderPick,
      companions: [{ name: 'Mary', profession: 'doctor' }],
      startDate: { year: 1848, month: 4, day: 15 }
    });
    expect(s.seed).toBe('s-1');
  });

  it('starts on day 1', () => {
    const s = createInitialState({
      seed: 's',
      leader: leaderPick,
      companions: [{ name: 'Mary', profession: 'doctor' }],
      startDate: { year: 1848, month: 4, day: 15 }
    });
    expect(s.day).toBe(1);
    expect(s.date).toEqual({ year: 1848, month: 4, day: 15 });
  });

  it('places the leader first and marks them as leader', () => {
    const s = createInitialState({
      seed: 's',
      leader: { name: 'Ezra', profession: 'farmer' },
      companions: [{ name: 'Mary', profession: 'doctor' }],
      startDate: { year: 1848, month: 4, day: 15 }
    });
    expect(s.party).toHaveLength(2);
    expect(s.party[0].name).toBe('Ezra');
    expect(s.party[0].isLeader).toBe(true);
    expect(s.party[1].isLeader).toBe(false);
  });

  it('rejects a party of 1', () => {
    expect(() =>
      createInitialState({
        seed: 's',
        leader: leaderPick,
        companions: [],
        startDate: { year: 1848, month: 4, day: 15 }
      })
    ).toThrow(/at least 2/i);
  });

  it('rejects a party larger than 6', () => {
    const six: Array<{ name: string; profession: ProfessionId }> = Array.from(
      { length: 6 },
      (_, i) => ({ name: `X${i}`, profession: 'hunter' })
    );
    expect(() =>
      createInitialState({
        seed: 's',
        leader: leaderPick,
        companions: six,
        startDate: { year: 1848, month: 4, day: 15 }
      })
    ).toThrow(/at most 6/i);
  });
});

describe('tickDay', () => {
  function newGame(seed = 't') {
    return createInitialState({
      seed,
      leader: leaderPick,
      companions: [{ name: 'Mary', profession: 'doctor' }],
      startDate: { year: 1848, month: 4, day: 15 }
    });
  }

  it('advances the day counter by 1', () => {
    const s0 = newGame();
    const s1 = tickDay(s0);
    expect(s1.day).toBe(2);
  });

  it('advances the calendar date correctly across month boundary', () => {
    let s = newGame();
    s = { ...s, date: { year: 1848, month: 4, day: 30 } };
    const next = tickDay(s);
    expect(next.date).toEqual({ year: 1848, month: 5, day: 1 });
  });

  it('advances across year boundary', () => {
    let s = newGame();
    s = { ...s, date: { year: 1848, month: 12, day: 31 } };
    const next = tickDay(s);
    expect(next.date).toEqual({ year: 1849, month: 1, day: 1 });
  });

  it('applies daily consumption', () => {
    const s0 = newGame();
    const initialFlour = s0.inventory.flour ?? 0;
    const s1 = tickDay(s0);
    expect(s1.inventory.flour).toBeLessThan(initialFlour);
  });

  it('is deterministic — same seed, same result after 10 ticks', () => {
    let a = newGame('equal');
    let b = newGame('equal');
    for (let i = 0; i < 10; i++) {
      a = tickDay(a);
      b = tickDay(b);
    }
    expect(a).toEqual(b);
  });

  it('does not mutate the input state', () => {
    const s = newGame();
    const snap = JSON.stringify(s);
    tickDay(s);
    expect(JSON.stringify(s)).toBe(snap);
  });
});
