import type { GameState } from '../types';
import { rest } from './rest';
import { hasLivePreacher } from '../professions/predicates';
import { getCampAction, hourCostFor, type CampActionId } from './camp-actions';

// #224 — Sunday lay-by. Period reality: religious-leaning families
// (Methodist, Baptist, Presbyterian, Quaker) insisted on Sabbath rest;
// pragmatic captains argued miles. Mixed companies often fractured
// over it. Sager, Royce, Frizzell diaries all describe the standard
// rhythm — morning prayer, scripture, hymns, mending clothes, baking
// ahead for the week, washing if a stream was at hand, hymn singing
// in the evening, Bible reading by lantern.
//
// Mechanically: a single rest day with a Sabbath morale bonus on top
// of the standard rest mechanics (ox fatigue recovery, healing, etc.).
// Live Preacher amplifies the bump (+5 vs +3) — they led the service
// and made the day feel earned.
//
// #1189 — camp actions on Sabbath. Period emigrants mended, washed,
// baked, and sang on Sunday — the day was not silent idleness. The
// `campActions` param allows callers to pass a list; the auto-Sabbath
// path (engine-pausable.ts) fills it from `defaultSabbathActions`.
// A missing or empty list silently skips the picker (old behavior).

const LAY_BY_MORALE_BUMP = 3;
const LAY_BY_PREACHER_BUMP = 5;

// #1189 — Sabbath-acceptable camp actions in priority order:
//   1. read_bible — religious core; requires a Bible item.
//   2. sing_along — hymns; requires harmonica or fiddle.
//   3. wash_clothes — domestic Sabbath chore; river terrain only.
// The helper filters by `availability(state)` and the 12-hour budget.
// Only actions that PASS availability and FIT are included so rest()
// never throws a budget or availability error on the auto path.
const SABBATH_PRIORITY: CampActionId[] = ['read_bible', 'sing_along', 'wash_clothes'];
const TIME_BUDGET_HOURS = 12;

export function defaultSabbathActions(state: GameState): CampActionId[] {
  const chosen: CampActionId[] = [];
  let remaining = TIME_BUDGET_HOURS;

  for (const id of SABBATH_PRIORITY) {
    const action = getCampAction(id);
    const avail = action.availability(state);
    if (!avail.available) continue;
    const cost = hourCostFor(action, state);
    if (cost > remaining) continue;
    chosen.push(id);
    remaining -= cost;
  }

  return chosen;
}

export function sundayLayBy(state: GameState, campActions?: CampActionId[]): GameState {
  const hasPreacher = hasLivePreacher(state);
  const bump = hasPreacher ? LAY_BY_PREACHER_BUMP : LAY_BY_MORALE_BUMP;
  const startDay = state.day;

  // Delegate the daily mechanics (consumption, condition, fatigue
  // recovery, healing, weather, etc.) to the existing rest action.
  // #1189 — pass camp actions through so the Sabbath picker runs.
  const afterRest = rest(state, 1, campActions && campActions.length > 0 ? { campActions } : {});

  const logText = hasPreacher
    ? `Sabbath lay-by. The preacher led the morning service — hymns by hand-clap, scripture, a short sermon. Mended clothes, baked ahead. Morale +${bump}, oxen rested.`
    : `Sabbath lay-by. Sang hymns, read scripture, mended clothes, baked ahead. The party rested in the wagon shade. Morale +${bump}, oxen rested.`;

  return {
    ...afterRest,
    morale: Math.min(100, afterRest.morale + bump),
    eventLog: [...afterRest.eventLog, { day: startDay, text: logText }]
  };
}
