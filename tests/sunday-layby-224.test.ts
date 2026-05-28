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
    // Compare Sunday vs Monday with the same starting state — the
    // diet/wellness/hot-drinks +1s land identically on both days, so the
    // delta isolates the Sabbath debit (#1055 — log line no longer
    // carries the literal magnitude, so a regex test is gone).
    // #1189: disable auto-Sabbath so the party actually travels on Sunday.
    const base = newGame();
    const sun: GameState = { ...base, morale: 50, flags: { ...base.flags, _autoSabbathRest: false } };
    const mon: GameState = { ...base, morale: 50, date: { year: 1849, month: 4, day: 16 }, flags: { ...base.flags, _autoSabbathRest: false } };
    const sunRes = tickDayPausable(sun);
    const monRes = tickDayPausable(mon);
    expect(sunRes.state.morale).toBe(monRes.state.morale - 2);
    const sabbathLog = sunRes.state.eventLog.find((l) => /Sabbath/i.test(l.text));
    expect(sabbathLog).toBeDefined();
  });

  it('-3 morale on a Sunday travel tick when a Preacher is in the party', () => {
    const base = createInitialState({
      seed: 'preacher-sun',
      leader: { name: 'Reverend', profession: 'preacher' },
      companions: [{ name: 'Mary', profession: 'banker' }],
      startDate: { year: 1849, month: 4, day: 15 }
    });
    // #1189: disable auto-Sabbath so the party actually travels on Sunday.
    const sun: GameState = { ...base, flags: { ...base.flags, _autoSabbathRest: false } };
    const mon: GameState = { ...base, date: { year: 1849, month: 4, day: 16 }, flags: { ...base.flags, _autoSabbathRest: false } };
    const sunRes = tickDayPausable(sun);
    const monRes = tickDayPausable(mon);
    expect(sunRes.state.morale).toBe(monRes.state.morale - 3);
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
    // #1189: disable auto-Sabbath so we're actually testing the debit path.
    const base = newGame();
    const before: GameState = { ...base, morale: 1, flags: { ...base.flags, _autoSabbathRest: false } };
    const result = tickDayPausable(before);
    expect(result.state.morale).toBeGreaterThanOrEqual(0);
  });

  it('#1055 — devout company on Sunday: lay-by, no Sabbath debit', () => {
    // A devout company's captain calls a Sabbath lay-by. companyRestDecision
    // returns mode='sabbath_layby', so the Sabbath debit must NOT fire —
    // the entire point of devout doctrine is observing the Sabbath. Before
    // #1055 the debit ran unconditionally on Sundays and the company ate
    // the penalty for doing exactly what its doctrine prescribed.
    const base = newGame();
    const devoutTrain = {
      id: 'devout-1',
      name: 'Devout Company',
      doctrine: 'devout' as const,
      leaderId: 'leader-devout',
      companions: [],
      events: [],
      flags: {},
      companyDecisionBlock: null,
      reJoinCooldownUntilDay: 0
    };
    const sunInTrain: GameState = {
      ...base,
      morale: 50,
      wagonTrain: devoutTrain as unknown as GameState['wagonTrain']
    };
    const result = tickDayPausable(sunInTrain);
    // The company-decision system logs "lays by — Sabbath observance" — that's
    // expected. The bug was that the TRAVEL debit ("Traveled on the Sabbath")
    // also fired even though the company hadn't traveled. Assert that line
    // is absent.
    const travelDebitLog = result.state.eventLog.find((l) => /Traveled on the Sabbath/i.test(l.text));
    expect(travelDebitLog).toBeUndefined();
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
    // #1189: disable auto-Sabbath on the traveler so they actually travel.
    // The lay-byer calls sundayLayBy directly (engine action, not tickDayPausable).
    const base = newGame();
    const traveler: GameState = { ...base, morale: 50, flags: { ...base.flags, _autoSabbathRest: false } };
    const layByer: GameState = { ...base, morale: 50 };
    const traveled = tickDayPausable(traveler).state;
    const laid = sundayLayBy(layByer);
    expect(laid.morale).toBeGreaterThan(traveled.morale);
  });
});
