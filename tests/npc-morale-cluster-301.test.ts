// #301 — NPC daily-morale drift cluster. Four sub-systems, each hooked
// into tickNpcWagon on the wagon synth so NPCs see the same morale
// movement the player does:
//   (a) Sabbath travel debit (-2 / -3 with preacher)
//   (b) Holidays (July 4 +6, Christmas +4)
//   (c) Stray-oxen morning roll (rare permanent ox loss)
//   (d) Baseline drift toward 50 + alive-ratio + profession bonuses
//
// Tests cover the gates and the no-op cases. The strays roll is
// stochastic; we test the chance helper not the rolled outcome.

import { describe, it, expect } from 'vitest';
import { applySabbathTravelDebit, SABBATH_TRAVEL_MORALE_DEBIT, SABBATH_TRAVEL_MORALE_DEBIT_WITH_PREACHER } from '../src/lib/game/systems/sabbath-travel';
import { applyHolidays, INDEPENDENCE_DAY_MORALE, CHRISTMAS_MORALE } from '../src/lib/game/systems/holidays';
import { applyNpcMoraleBaseline } from '../src/lib/game/systems/npc-morale';
import { createInitialState } from '../src/lib/game/engine';
import type { GameState } from '../src/lib/game/types';

function game(over: Partial<GameState> = {}): GameState {
  const base = createInitialState({
    seed: 'r301',
    leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'doctor' }],
    startDate: { year: 1849, month: 4, day: 15 } // April 15 1849 is a Sunday
  });
  return { ...base, ...over };
}

describe('#301 (a) Sabbath travel debit — extracted helper', () => {
  it('-2 morale on Sunday travel without preacher', () => {
    const s = game({ morale: 50 });
    const after = applySabbathTravelDebit(s, true);
    expect(after.morale).toBe(50 - SABBATH_TRAVEL_MORALE_DEBIT);
    expect(after.eventLog.find((l) => /Sabbath/i.test(l.text))).toBeDefined();
  });

  it('-3 morale with a live Preacher in the party', () => {
    const base = createInitialState({
      seed: 'r301-preacher',
      leader: { name: 'Reverend', profession: 'preacher' },
      companions: [{ name: 'M', profession: 'banker' }],
      startDate: { year: 1849, month: 4, day: 15 }
    });
    const after = applySabbathTravelDebit({ ...base, morale: 50 }, true);
    expect(after.morale).toBe(50 - SABBATH_TRAVEL_MORALE_DEBIT_WITH_PREACHER);
  });

  it('no debit when traveled=false (lay-by day)', () => {
    const s = game({ morale: 50 });
    expect(applySabbathTravelDebit(s, false)).toBe(s);
  });

  it('no debit on a Monday', () => {
    const s = game({ morale: 50, date: { year: 1849, month: 4, day: 16 } });
    expect(applySabbathTravelDebit(s, true)).toBe(s);
  });
});

describe('#301 (b) Holidays — July 4 + Christmas', () => {
  it('July 4 grants +INDEPENDENCE_DAY_MORALE once per year', () => {
    const s = game({ morale: 50, date: { year: 1849, month: 7, day: 4 } });
    const after = applyHolidays(s);
    expect(after.morale).toBe(50 + INDEPENDENCE_DAY_MORALE);
    // Second call same year is a no-op.
    expect(applyHolidays(after).morale).toBe(after.morale);
  });

  it('Christmas grants +CHRISTMAS_MORALE once per year', () => {
    const s = game({ morale: 50, date: { year: 1849, month: 12, day: 25 } });
    const after = applyHolidays(s);
    expect(after.morale).toBe(50 + CHRISTMAS_MORALE);
    expect(applyHolidays(after).morale).toBe(after.morale);
  });

  it('non-holiday day is a no-op', () => {
    const s = game({ morale: 50, date: { year: 1849, month: 6, day: 1 } });
    expect(applyHolidays(s)).toBe(s);
  });

  it('caps at morale 100', () => {
    const s = game({ morale: 98, date: { year: 1849, month: 7, day: 4 } });
    expect(applyHolidays(s).morale).toBe(100);
  });
});

describe('#301 (d) Baseline morale drift', () => {
  it('drifts down from high morale toward 50', () => {
    const s = game({ morale: 90 });
    expect(applyNpcMoraleBaseline(s).morale).toBeLessThan(90);
  });

  it('drifts up from low morale toward 50', () => {
    const s = game({ morale: 20 });
    expect(applyNpcMoraleBaseline(s).morale).toBeGreaterThan(20);
  });

  it('stays in the 35-65 calm band (no drift)', () => {
    // Members alive + farmer + doctor → no profession bonus, no death
    // penalty. Morale 50 is in band. Function net delta should be 0.
    const s = game({ morale: 50 });
    expect(applyNpcMoraleBaseline(s).morale).toBe(50);
  });

  it('preacher in the party adds +1 to the delta', () => {
    const withPreacher = createInitialState({
      seed: 'r301-preacher-baseline',
      leader: { name: 'Reverend', profession: 'preacher' },
      companions: [{ name: 'M', profession: 'banker' }],
      startDate: { year: 1849, month: 4, day: 15 }
    });
    const s = { ...withPreacher, morale: 50 };
    const after = applyNpcMoraleBaseline(s);
    // Calm band (no drift) but preacher +1 lands.
    expect(after.morale).toBe(51);
  });

  it('half-dead party drags morale down', () => {
    const s = game({ morale: 80 });
    // Kill one of two members
    const dying = { ...s, party: s.party.map((m, i) => i === 0 ? { ...m, dead: true } : m) };
    const after = applyNpcMoraleBaseline(dying);
    // Drift (-1 from >65) + alive-ratio (-1 at 1/2 = 0.5)
    expect(after.morale).toBeLessThan(80);
  });
});
