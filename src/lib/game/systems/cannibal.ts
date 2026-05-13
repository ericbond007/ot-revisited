// #939j — Shared cannibalism math used by the burial-event "eat the
// body" choice, the cannibalism_corpse camp action, and tickNpcWagon's
// maybeCannibalize. One file owns the constants + the apply logic so
// the math can't drift between surfaces.
//
// Surfaces NOT routed through here (by design):
//   - cannibalism_straws camp action: sacrifice flow (kill a live
//     adult), distinct from corpse consumption. Its 60 lb / −35
//     morale / +3 guilt numbers are sacrifice-tuned.

import type { GameState, PartyMember } from '../types';
import type { Rng } from '../rng';

export const CANNIBAL_ADULT_MEAT_LB = 50;
export const CANNIBAL_ADULT_MORALE_HIT = 18;
export const CANNIBAL_CHILD_MEAT_LB = 25;
export const CANNIBAL_CHILD_MORALE_HIT = 25;
export const CANNIBAL_FRESHNESS_DAYS = 5;

const FOOD_ITEMS = [
  'flour', 'bacon', 'beans', 'hardtack', 'jerky', 'pemmican', 'salt_pork',
  'game_meat', 'berries', 'egg', 'milk', 'dried_fruit', 'cheese', 'butter',
  'cornmeal'
] as const;

/** True iff the party has any food item with quantity > 0. The gate
 *  every cannibal surface checks before becoming visible — last-resort
 *  framing means no surface appears while food remains. */
export function hasFoodOnHand(state: GameState): boolean {
  for (const id of FOOD_ITEMS) {
    if ((state.inventory[id] ?? 0) > 0) return true;
  }
  return false;
}

/** Most-recently-dead-and-unconsumed corpse the survivors could
 *  consume. Adults eligible regardless of deathCause. Children eligible
 *  only when starvation (or its casing variants) killed them — period
 *  diaries (Sager 1844, Donner 1846) confirm survivors did consume
 *  children's bodies but only when starvation killed them, never
 *  injury or disease. */
export function findFreshUnconsumedCorpse(state: GameState): PartyMember | null {
  const fresh = state.party.filter((m) => {
    if (!m.dead || m.consumed) return false;
    if (typeof m.deathDay !== 'number') return false;
    if (state.day - m.deathDay > CANNIBAL_FRESHNESS_DAYS) return false;
    if (m.kind === 'adult') return true;
    if (m.kind === 'child') {
      const cause = (m.deathCause ?? '').toLowerCase();
      return cause === 'starvation' || cause === 'attrition'
        || m.deathCause === 'cannibalism_volunteered';
    }
    return false;
  });
  if (fresh.length === 0) return null;
  return fresh.sort((a, b) => (b.deathDay ?? 0) - (a.deathDay ?? 0))[0];
}

export interface ApplyCannibalizeResult {
  state: GameState;
  /** One-line log entry. Caller decides where it goes:
   *  player paths use logLine(state, log); NPC tick suffixes with the
   *  wagon name and pushes onto playerLogs. */
  log: string;
}

/** Consume a specific corpse. Marks consumed, adds game meat, hits
 *  morale, and increments `_cannibalismCount` uniformly across every
 *  caller (#939j decision 7). Defensive null-corpse fallback. */
export function applyCannibalize(
  state: GameState,
  corpseId: string,
  _rng: Rng
): ApplyCannibalizeResult {
  const corpse = state.party.find((m) => m.id === corpseId && m.dead && !m.consumed);
  if (!corpse) {
    return { state, log: 'No fresh corpse to consume.' };
  }
  const isChild = corpse.kind === 'child';
  const meat = isChild ? CANNIBAL_CHILD_MEAT_LB : CANNIBAL_ADULT_MEAT_LB;
  const hit  = isChild ? CANNIBAL_CHILD_MORALE_HIT : CANNIBAL_ADULT_MORALE_HIT;
  const flags = {
    ...state.flags,
    _cannibalismCount: ((state.flags._cannibalismCount as number | undefined) ?? 0) + 1
  };
  const next: GameState = {
    ...state,
    party: state.party.map((m) => m.id === corpseId ? { ...m, consumed: true } : m),
    inventory: {
      ...state.inventory,
      game_meat: (state.inventory.game_meat ?? 0) + meat
    },
    morale: Math.max(0, state.morale - hit),
    flags
  };
  const log = `Took ${corpse.name}'s body for meat — ${meat} lb of fresh game. Nobody spoke. Morale −${hit}.`;
  return { state: next, log };
}
