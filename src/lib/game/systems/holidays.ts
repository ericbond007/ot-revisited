// Calendar holidays — once-per-year morale bumps on dates the party
// would have observed. Period emigrants celebrated Independence Day on
// the trail (the rock got its name because parties wanted to be there
// by the 4th of July); diaries record fiddle music, gun salutes, and
// extra rations even on hard journeys. Christmas was observed too — late
// arrivals at Whitman Mission and Fort Vancouver record makeshift
// Christmas dinners (Carpenter 1857, Sager 1844).
//
// Each holiday checks a per-year flag so it fires at most once per
// calendar year. The hook runs from tickDayPausable after the date
// advances. The same function is invoked on NPC wagon-synths in
// tickNpcWagon, so the whole train celebrates together.
//
// Thanksgiving (post-1863 federal proclamation) deliberately omitted
// for now — the trail-era period (1841-1869) covers it only thinly and
// Lincoln's 1863 proclamation hit Eastern observance harder than
// transient overland parties.

import type { GameState } from '../types';

export const INDEPENDENCE_DAY_MORALE = 6;
export const CHRISTMAS_MORALE = 4;

interface Holiday {
  month: number;
  day: number;
  /** Flag key the function uses to gate to once-per-year. */
  flag: string;
  /** Morale bump magnitude (subject to clamp at 100). */
  amount: number;
  /** Log copy. */
  logText: (amount: number) => string;
}

const HOLIDAYS: readonly Holiday[] = [
  {
    month: 7,
    day: 4,
    flag: '_july4Year',
    amount: INDEPENDENCE_DAY_MORALE,
    logText: (amt) =>
      `Independence Day. The party fired a salute, broke out the fiddle, and ate a little better. Morale +${amt}.`
  },
  {
    month: 12,
    day: 25,
    flag: '_christmasYear',
    amount: CHRISTMAS_MORALE,
    logText: (amt) =>
      `Christmas. The party shared a quiet meal and small comforts. Morale +${amt}.`
  }
];

/** Apply any calendar-day morale bumps for today's date. No-op on
 *  most days. Idempotent within a year via per-holiday flag. */
export function applyHolidays(state: GameState): GameState {
  if (state.completed) return state;
  const { month, day, year } = state.date;
  for (const h of HOLIDAYS) {
    if (month !== h.month || day !== h.day) continue;
    const lastYear = (state.flags[h.flag] as number | undefined) ?? 0;
    if (lastYear >= year) continue;
    return {
      ...state,
      morale: Math.min(100, state.morale + h.amount),
      flags: { ...state.flags, [h.flag]: year },
      eventLog: [
        ...state.eventLog,
        { day: state.day, text: h.logText(h.amount) }
      ]
    };
  }
  return state;
}
