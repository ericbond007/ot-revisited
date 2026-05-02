import type { GameState } from '../types';
import { rest } from './rest';
import { hasLivePreacher } from '../professions/predicates';

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

const LAY_BY_MORALE_BUMP = 3;
const LAY_BY_PREACHER_BUMP = 5;

export function sundayLayBy(state: GameState): GameState {
  const hasPreacher = hasLivePreacher(state);
  const bump = hasPreacher ? LAY_BY_PREACHER_BUMP : LAY_BY_MORALE_BUMP;
  const startDay = state.day;

  // Delegate the daily mechanics (consumption, condition, fatigue
  // recovery, healing, weather, etc.) to the existing rest action.
  const afterRest = rest(state, 1);

  const logText = hasPreacher
    ? `Sabbath lay-by. The preacher led the morning service — hymns by hand-clap, scripture, a short sermon. Mended clothes, baked ahead. Morale +${bump}, oxen rested.`
    : `Sabbath lay-by. Sang hymns, read scripture, mended clothes, baked ahead. The party rested in the wagon shade. Morale +${bump}, oxen rested.`;

  return {
    ...afterRest,
    morale: Math.min(100, afterRest.morale + bump),
    eventLog: [...afterRest.eventLog, { day: startDay, text: logText }]
  };
}
