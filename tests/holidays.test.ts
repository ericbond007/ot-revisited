import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/lib/game/engine';
import { applyHolidays } from '../src/lib/game/systems/holidays';
import type { GameState } from '../src/lib/game/types';

function gameOn(year: number, month: number, day: number, morale = 50): GameState {
  const s = createInitialState({
    seed: 'holidays',
    leader: { name: 'A', profession: 'farmer' },
    companions: [{ name: 'B', profession: 'doctor' }],
    startDate: { year, month, day }
  });
  return { ...s, morale };
}

describe('holidays system', () => {
  it('Independence Day grants +6 morale exactly once per year', () => {
    let s = gameOn(1849, 7, 4, 60);
    s = applyHolidays(s);
    expect(s.morale).toBe(66);
    expect(s.flags._july4Year).toBe(1849);

    // Second hit on the same date / year is a no-op (same calendar day,
    // same flag). The morale stays where it was.
    s = applyHolidays(s);
    expect(s.morale).toBe(66);
  });

  it('fires again the next year', () => {
    let s = gameOn(1849, 7, 4, 60);
    s = applyHolidays(s);
    expect(s.morale).toBe(66);
    // Roll the date and morale forward to July 4 the following year.
    s = { ...s, date: { year: 1850, month: 7, day: 4 }, morale: 70 };
    s = applyHolidays(s);
    expect(s.morale).toBe(76);
    expect(s.flags._july4Year).toBe(1850);
  });

  it('does nothing on other dates', () => {
    let s = gameOn(1849, 7, 3, 60);
    s = applyHolidays(s);
    expect(s.morale).toBe(60);
    expect(s.flags._july4Year).toBeUndefined();

    s = gameOn(1849, 7, 5, 60);
    s = applyHolidays(s);
    expect(s.morale).toBe(60);
  });

  it('caps at morale 100 — no overflow', () => {
    let s = gameOn(1849, 7, 4, 98);
    s = applyHolidays(s);
    expect(s.morale).toBe(100);
  });

  it('skipped if the run is already completed', () => {
    let s = gameOn(1849, 7, 4, 60);
    s = { ...s, completed: true, outcome: 'arrived' };
    s = applyHolidays(s);
    expect(s.morale).toBe(60);
  });
});
