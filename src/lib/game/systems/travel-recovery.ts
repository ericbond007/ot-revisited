// #161 — Light passive HP recovery on travel days.
//
// Findings from the May-12 bot harness audit: bots make 25-45% travel
// days out of a 220-day cap and never finish the 2195-mi trail. The
// dominant other-day type is rest (~40-55% of days), and the rest-loop
// keeps firing because conditions (cholera/dysentery/exposure) drain
// HP daily during travel with no counter. Rest is the only way to
// heal, so bots burn ~half their days off-trail.
//
// Period reality: a healthy adult on a moving wagon WAS recovering,
// slowly, from minor wear — the diaries note members "feeling better
// after a day's ride" without a deliberate stop. The previous engine
// gave them no such credit; this module does.
//
// Shape:
//   - +1 HP/day to every alive, condition-free party member
//   - Only on slow / moderate pace (fast / grueling — and especially
//     grueling — burn the body too hard to heal in motion)
//   - Caps at 100 (Math.min)
//   - Skipped at morale < 25 (a miserable party doesn't heal —
//     mirrors the rest-day healingMultiplier zero floor)
//
// Why not heal condition-burdened members: their `dailyHealthDelta`
// already runs in progressConditions; a passive heal on top would
// undermine the condition's pressure. Condition-free members are the
// audit's actual recovery deficit.

import type { GameState } from '../types';

export const TRAVEL_HEAL_PER_DAY = 1;
/** Grueling pace halves the heal (still some recovery; the body is
 *  taxed but a healthy member on a wagon still mends overnight). */
export const TRAVEL_HEAL_GRUELING_MULT = 0.5;
export const TRAVEL_HEAL_MIN_MORALE = 25;

export function applyTravelDayRecovery(state: GameState): GameState {
  // No heal at miserable morale — mirrors rest-day healingMultiplier floor.
  if (state.morale < TRAVEL_HEAL_MIN_MORALE) return state;

  const gain = state.pace === 'grueling'
    ? Math.max(1, Math.round(TRAVEL_HEAL_PER_DAY * TRAVEL_HEAL_GRUELING_MULT))
    : TRAVEL_HEAL_PER_DAY;

  let any = false;
  const party = state.party.map((m) => {
    if (m.dead) return m;
    if (m.conditions.length > 0) return m;  // their conditions handle deltas
    if (m.health >= 100) return m;
    any = true;
    return { ...m, health: Math.min(100, m.health + gain) };
  });
  return any ? { ...state, party } : state;
}
