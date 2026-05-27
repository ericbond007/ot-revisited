// #301 — Sabbath travel morale debit. Factored out of engine-pausable.ts
// so both the player engine and the NPC tick can share the same gate +
// magnitude. Period anchors: Catherine Sager's diary on Sunday guilt;
// Reed family's pragmatism overriding scripture; Helen Carpenter 1857
// recording company-wide observance. Hits the player AND each NPC
// wagon individually when the train pushed through a Sabbath.
//
// Magnitude: -2 morale on Sunday travel; -3 when a live Preacher is in
// the party (they amplify both the choice and the regret). Solo wagons
// always travel by default, so the gate is just isSunday + traveled.

import type { GameState } from '../types';
import { isSunday } from '../utils/calendar';
import { hasLivePreacher } from '../professions/predicates';

export const SABBATH_TRAVEL_MORALE_DEBIT = 2;
export const SABBATH_TRAVEL_MORALE_DEBIT_WITH_PREACHER = 3;

/** Returns a GameState with the Sabbath-travel morale debit applied,
 *  if today is Sunday AND `traveled` is true. Otherwise returns the
 *  state unchanged. Idempotent — calling twice in one tick double-
 *  charges, so the caller must invoke at most once per tick. */
export function applySabbathTravelDebit(state: GameState, traveled: boolean): GameState {
  if (!traveled) return state;
  if (!isSunday(state.date)) return state;
  const debit = hasLivePreacher(state)
    ? SABBATH_TRAVEL_MORALE_DEBIT_WITH_PREACHER
    : SABBATH_TRAVEL_MORALE_DEBIT;
  return {
    ...state,
    morale: Math.max(0, state.morale - debit),
    eventLog: [
      ...state.eventLog,
      { day: state.day, text: `Traveled on the Sabbath. Morale suffers.` }
    ]
  };
}
