// #161 + #1046 A — daily HP recovery, governance-agnostic, keyed only
// on whether the wagon moved today.
//
//   traveled === true  (travel day):
//     - condition-free members: the #161 +1 (slow/moderate full,
//       grueling halved, morale<25 floor). A healthy adult on a moving
//       wagon WAS slowly mending minor wear.
//     - condition-burdened members: a WEAKER care-gated convalesce
//       (#1046 A). A jolting springless wagon is a worse sickbed than
//       camp, but the sick rode in the wagon and a provisioned, tended
//       company mended them slowly even in motion. Untended => zero
//       (pure decline — historically correct).
//
//   traveled === false  (company lay-by / rest day):
//     - every alive member gets the rest-day heal (the rest.ts formula;
//       REST_HEAL_PER_DAY is the single definition, consumed by both
//       this module and actions/rest.ts). This is what finally makes
//       the C2/B company lay-by PAY OFF.

import type { GameState } from '../types';
import { healingMultiplier } from './morale';
import { careLevel } from './care';

// #161 — condition-free travel-day heal.
export const TRAVEL_HEAL_PER_DAY = 1;
export const TRAVEL_HEAL_GRUELING_MULT = 0.5;
export const TRAVEL_HEAL_MIN_MORALE = 25;

// #1046 A — condition-burdened in-motion convalesce. Deliberately
// weaker than rest (+8). Starting value; slice-5 sweep-tuned.
export const CONVALESCE_HEAL = 3;
export const CONVALESCE_DOCTOR_MULT = 1.5;
// Pace gate mirrors #161's intent (fast/grueling tax the body).
const CONVALESCE_PACE_MULT: Record<GameState['pace'], number> = {
  slow: 1,
  moderate: 1,
  fast: 0.66,
  grueling: 0.5
};

// #1046 A — lay-by / rest-day heal. Single definition; actions/rest.ts
// imports this so the "unchanged +8" promise stays literally one number.
export const REST_HEAL_PER_DAY = 8;

function travelDayRecovery(state: GameState): GameState {
  if (state.morale < TRAVEL_HEAL_MIN_MORALE) return state;

  const freeGain =
    state.pace === 'grueling'
      ? Math.max(1, Math.round(TRAVEL_HEAL_PER_DAY * TRAVEL_HEAL_GRUELING_MULT))
      : TRAVEL_HEAL_PER_DAY;

  const care = careLevel(state);
  const careMult = care === 'doctor' ? CONVALESCE_DOCTOR_MULT : care === 'tended' ? 1 : 0;
  const paceMult = CONVALESCE_PACE_MULT[state.pace];
  const convalesceGain = Math.round(CONVALESCE_HEAL * careMult * paceMult);

  let any = false;
  const party = state.party.map((m) => {
    if (m.dead || m.health >= 100) return m;
    if (m.conditions.length === 0) {
      any = true;
      return { ...m, health: Math.min(100, m.health + freeGain) };
    }
    if (convalesceGain <= 0) return m; // untended sick => pure decline
    any = true;
    return { ...m, health: Math.min(100, m.health + convalesceGain) };
  });
  return any ? { ...state, party } : state;
}

function layByRecovery(state: GameState): GameState {
  const gain = Math.round(REST_HEAL_PER_DAY * healingMultiplier(state.morale));
  if (gain <= 0) return state;
  let any = false;
  const party = state.party.map((m) => {
    if (m.dead || m.health >= 100) return m;
    any = true;
    return { ...m, health: Math.min(100, m.health + gain) };
  });
  return any ? { ...state, party } : state;
}

/** #1046 A — the governance-agnostic daily recovery dispatch. `traveled`
 *  is the resolved "did the wagon move today" (companyMode==='travel'
 *  for the player, the NPC's resolved travel flag for a synth wagon). */
export function applyDailyRecovery(state: GameState, traveled: boolean): GameState {
  return traveled ? travelDayRecovery(state) : layByRecovery(state);
}
