// Calendar holidays — once-per-year morale bumps on dates the party
// would have observed. Period emigrants celebrated Independence Day on
// the trail (the rock got its name because parties wanted to be there
// by the 4th of July); diaries record fiddle music, gun salutes, and
// extra rations even on hard journeys.
//
// Each holiday checks a per-year flag so it fires at most once per
// calendar year. The hook runs from tickDayPausable after the date
// advances. Future holidays (Christmas, Thanksgiving from 1863+) can
// extend the same pattern — for now just July 4.

import type { GameState } from '../types';

const INDEPENDENCE_DAY_MORALE = 6;

/** Apply any calendar-day morale bumps for today's date. No-op on
 *  most days. */
export function applyHolidays(state: GameState): GameState {
  if (state.completed) return state;
  const { month, day, year } = state.date;
  if (month === 7 && day === 4) {
    const lastYear = (state.flags._july4Year as number | undefined) ?? 0;
    if (lastYear < year) {
      const next: GameState = {
        ...state,
        morale: Math.min(100, state.morale + INDEPENDENCE_DAY_MORALE),
        flags: { ...state.flags, _july4Year: year },
        eventLog: [
          ...state.eventLog,
          {
            day: state.day,
            text: `Independence Day. The party fired a salute, broke out the fiddle, and ate a little better. Morale +${INDEPENDENCE_DAY_MORALE}.`
          }
        ]
      };
      return next;
    }
  }
  return state;
}
