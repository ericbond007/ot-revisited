// #301 sub-task (d) — Daily morale baseline drift for NPC wagons.
//
// Background: NPC wagons currently only see morale movement from events,
// starvation crises, trades, and captain interactions. Between those
// moments their morale stays flat — pinned at whatever the last event
// left it at. The player gets daily nudges via `systems/morale.ts:
// adjustMorale` (rations / food / wellness / dog / wagon-train / teacher).
//
// This function is a SIMPLIFIED parallel for NPCs. It runs once per
// tick and produces a small integer delta:
//   - Drift toward 50 (homeostasis):  -1 if morale > 65,  +1 if morale < 35
//   - Alive ratio: +1 when all party alive,  -1 when half or more dead
//   - Profession bonus: +1 if a live Preacher is in the party
//   - Profession bonus: +1 if a live Hunter is in the party AND there's
//     food on hand (proxy for "ate today")
//
// Net effect: NPCs slow-burn toward the middle when nothing else is
// pushing them. A long string of uneventful days no longer leaves them
// frozen at 90 morale or 10 morale; they trend toward a defensible
// equilibrium and respond to party composition.

import type { GameState } from '../types';
import { hasLivePreacher, hasLiveHunter } from '../professions/predicates';
import { foodItemIds } from '../content/items';
import { moraleFloorFor } from './morale';

function totalFood(state: GameState): number {
  return foodItemIds().reduce((sum, k) => sum + (state.inventory[k] ?? 0), 0);
}

export function applyNpcMoraleBaseline(state: GameState): GameState {
  let delta = 0;

  // Drift toward 50 (homeostasis). Bands are deliberately wide (35-65
  // is "calm") so most events still dominate the curve; baseline only
  // bites when morale has drifted far from the middle without other
  // forces acting.
  // Wider band (75/25) so drift only fires when morale has truly
  // drifted far from middle. Tighter bands (65/35) cascade with the
  // #280c stochastic events into faster company dissolution.
  if (state.morale > 75) delta -= 1;
  else if (state.morale < 25) delta += 1;

  // Alive-ratio nudge — CORRECTIVE only, not a steady-state boost.
  // Responds to wipes / cholera waves so morale doesn't stay high after
  // losing party members. A fully-alive party gets no bonus here (it'd
  // permanently bias morale upward); a half-or-more-dead party loses 1.
  const total = state.party.length;
  if (total > 0) {
    const alive = state.party.filter((m) => !m.dead).length;
    if (alive / total <= 0.5) delta -= 1;
  }

  // Profession bonuses (per ticket: preacher +0.5, hunter +0.3 if ate
  // today). Morale is integer-only here, so each fires as +1 with its
  // own gate — fractional accumulation isn't worth the bookkeeping.
  if (hasLivePreacher(state)) delta += 1;
  if (hasLiveHunter(state) && totalFood(state) > 0) delta += 1;

  if (delta === 0) return state;
  const floor = moraleFloorFor(state);
  const morale = Math.max(floor, Math.min(100, state.morale + delta));
  return { ...state, morale };
}
