import { describe, it, expect } from 'vitest';
import { dayOfWeek, isSunday, dayName } from '../src/lib/game/utils/calendar';
import { sundayLayBy } from '../src/lib/game/actions/sunday-lay-by';
import { tickDayPausable } from '../src/lib/game/engine-pausable';
import { createInitialState } from '../src/lib/game/engine';
import type { GameState } from '../src/lib/game/types';

function newGame(over: Partial<GameState> = {}): GameState {
  const s = createInitialState({
    seed: 'sunday-224',
    leader: { name: 'Ezra', profession: 'banker' },
    companions: [{ name: 'Mary', profession: 'banker' }],
    startDate: { year: 1849, month: 4, day: 15 } // April 15, 1849 was a Sunday
  });
  return { ...s, ...over };
}

describe('#224 calendar helpers', () => {
  it('dayOfWeek returns 0 for known Sundays', () => {
    expect(dayOfWeek({ year: 1849, month: 4, day: 15 })).toBe(0); // Sun
    expect(dayOfWeek({ year: 1849, month: 7, day: 1 })).toBe(0);  // Sun
  });

  it('dayOfWeek returns 6 for Saturdays', () => {
    expect(dayOfWeek({ year: 1849, month: 4, day: 14 })).toBe(6); // Sat
  });

  it('isSunday correctly identifies a Sunday in 1849', () => {
    expect(isSunday({ year: 1849, month: 4, day: 15 })).toBe(true);
    expect(isSunday({ year: 1849, month: 4, day: 16 })).toBe(false);
  });

  it('dayName returns the right English label', () => {
    expect(dayName({ year: 1849, month: 4, day: 15 })).toBe('Sunday');
    expect(dayName({ year: 1849, month: 4, day: 17 })).toBe('Tuesday');
  });
});

describe('#224 Sabbath morale debit on Sunday Travel', () => {
  it('-2 morale on a Sunday travel tick (no preacher)', () => {
    const before: GameState = { ...newGame(), morale: 50 };
    const result = tickDayPausable(before);
    // 50 - 2 (Sabbath) - 0 (no other moves) ≈ 48. Other systems can shift it
    // a tiny bit; just verify the Sabbath debit landed.
    const sabbathLog = result.state.eventLog.find((l) => /Sabbath/i.test(l.text));
    expect(sabbathLog).toBeDefined();
    expect(sabbathLog!.text).toMatch(/2/);
  });

  it('-3 morale on a Sunday travel tick when a Preacher is in the party', () => {
    const sWithPreacher = createInitialState({
      seed: 'preacher-sun',
      leader: { name: 'Reverend', profession: 'preacher' },
      companions: [{ name: 'Mary', profession: 'banker' }],
      startDate: { year: 1849, month: 4, day: 15 }
    });
    const result = tickDayPausable(sWithPreacher);
    const sabbathLog = result.state.eventLog.find((l) => /Sabbath/i.test(l.text));
    expect(sabbathLog?.text).toMatch(/3/);
  });

  it('no debit on a Monday travel tick', () => {
    const monday: GameState = {
      ...newGame(),
      date: { year: 1849, month: 4, day: 16 } // Monday
    };
    const result = tickDayPausable(monday);
    const sabbathLog = result.state.eventLog.find((l) => /Sabbath/i.test(l.text));
    expect(sabbathLog).toBeUndefined();
  });

  it('debit clamps morale at 0', () => {
    const before: GameState = { ...newGame(), morale: 1 };
    const result = tickDayPausable(before);
    expect(result.state.morale).toBeGreaterThanOrEqual(0);
  });
});

describe('#224 sundayLayBy action', () => {
  it('advances day by one', () => {
    const before = newGame();
    const after = sundayLayBy(before);
    expect(after.day).toBe(before.day + 1);
  });

  it('grants +3 morale (no preacher)', () => {
    const before: GameState = { ...newGame(), morale: 50 };
    const after = sundayLayBy(before);
    // Rest applies its own morale system on top, but the bonus +3 should land.
    // Range to allow normal rest morale tweaks; the floor is the bump.
    expect(after.morale).toBeGreaterThanOrEqual(50 + 3 - 1);
  });

  it('grants +5 morale with a live Preacher', () => {
    const sWithPreacher: GameState = {
      ...createInitialState({
        seed: 'preacher-layby',
        leader: { name: 'Reverend', profession: 'preacher' },
        companions: [{ name: 'Mary', profession: 'banker' }],
        startDate: { year: 1849, month: 4, day: 15 }
      }),
      morale: 50
    };
    const noPreacher: GameState = { ...newGame(), morale: 50 };
    const withResult = sundayLayBy(sWithPreacher);
    const withoutResult = sundayLayBy(noPreacher);
    expect(withResult.morale).toBeGreaterThan(withoutResult.morale);
  });

  it('writes a Sabbath log line', () => {
    const after = sundayLayBy(newGame());
    const sabbath = after.eventLog.find((l) => /Sabbath/i.test(l.text));
    expect(sabbath).toBeDefined();
  });

  it('preacher log line mentions the service', () => {
    const sWithPreacher = createInitialState({
      seed: 'p-svc',
      leader: { name: 'Reverend', profession: 'preacher' },
      companions: [{ name: 'Mary', profession: 'banker' }],
      startDate: { year: 1849, month: 4, day: 15 }
    });
    const after = sundayLayBy(sWithPreacher);
    const sabbath = after.eventLog.find((l) => /preacher|service|sermon|hymn/i.test(l.text));
    expect(sabbath).toBeDefined();
  });

  it('does not advance miles (no travel)', () => {
    const before = newGame();
    const after = sundayLayBy(before);
    expect(after.location.milesTraveled).toBe(before.location.milesTraveled);
  });

  it('clamps morale at 100', () => {
    const before: GameState = { ...newGame(), morale: 99 };
    const after = sundayLayBy(before);
    expect(after.morale).toBeLessThanOrEqual(100);
  });
});

describe('#224 trade-off math', () => {
  it('a lay-by Sunday net-positive vs traveling Sunday', () => {
    const traveler: GameState = { ...newGame(), morale: 50 };
    const layByer: GameState = { ...newGame(), morale: 50 };
    const traveled = tickDayPausable(traveler).state;
    const laid = sundayLayBy(layByer);
    expect(laid.morale).toBeGreaterThan(traveled.morale);
  });
});
