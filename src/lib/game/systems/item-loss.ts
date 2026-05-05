// #306 — random item-loss helpers. Period reality: emigrant diaries
// catalog at least seven distinct loss vectors (river fords, storms,
// buffalo stampedes, wagon fires, mud abandonment, theft, and rough-
// terrain shedding). This module ships the shared math; specific
// trigger sources live in their event/action files.
//
// **Phase 1 sources** (this PR): buffalo stampede crushes cookware /
// tinware overnight on the Platte corridor. Period anchor: Marcy 1859
// verbatim "buffalo running through camp at night will smash any
// cookware not stowed inside the wagon."
//
// **Phase 2 sources** (logged in #306 TODO entry, deferred): river-
// ford catastrophic loss (extending #234/#235), wind-loss on storms
// (separate from #201 canvas-leak path), wagon fire, stuck-in-mud
// player-choice modal, daily theft roll, rough-terrain shed, train
// share-watch reduction (#176 Bryant 1846 explicit).

import type { GameState, NpcWagonState } from '../types';
import type { Rng } from '../rng';

/** Items the buffalo stampede smashes — period: cast-iron cookware, tin
 *  butter-crocks, cheese-press wood/iron rigs, basically anything left
 *  out at camp. Marcy 1859 says "in the wagon" was safe; "outside" was
 *  fair game. We keep the list narrow so the loss is identifiable. */
export const STAMPEDE_VICTIMS = [
  'cookware',
  'butter_crock',
  'cheese_press'
] as const;

/** Per-item loss fraction on stampede — half of stack rounds DOWN to
 *  the nearest unit, so 1 unit gets fully crushed, 2 units lose 1, 3
 *  lose 1, 4 lose 2, etc. Period: a stampede took what it took; few
 *  diaries report partial losses. */
export const STAMPEDE_LOSS_FRACTION = 0.5;

export interface StampedeDamageResult {
  /** Items lost (id → qty) so the caller can craft a single log line. */
  losses: Record<string, number>;
}

/** Apply stampede damage to an inventory. Pure function — caller
 *  composes the new state. Used by both player event apply and the
 *  NPC train-wide propagation. */
export function rollStampedeLosses(
  inventory: Record<string, number>,
  rng: Rng
): { inventory: Record<string, number>; result: StampedeDamageResult } {
  const next = { ...inventory };
  const losses: Record<string, number> = {};
  for (const item of STAMPEDE_VICTIMS) {
    const have = next[item] ?? 0;
    if (have <= 0) continue;
    // Always lose at least 1 if any present (period: stampedes were
    // catastrophic, not gentle). RNG drives whether the loss is
    // half-rounded-down or half-rounded-up for stacks of 2+.
    const baseLoss = Math.max(1, Math.floor(have * STAMPEDE_LOSS_FRACTION));
    const jitter = have >= 2 && rng.chance(0.5) ? 1 : 0;
    const loss = Math.min(have, baseLoss + jitter);
    next[item] = have - loss;
    losses[item] = loss;
  }
  return { inventory: next, result: { losses } };
}

/** Apply stampede damage to the player's wagon. Returns new state
 *  with morale/inventory updated and a log line summarizing losses.
 *  Caller (the event apply fn) composes any additional effects. */
export function applyStampedeToPlayer(
  state: GameState,
  rng: Rng
): GameState {
  const { inventory, result } = rollStampedeLosses(state.inventory, rng);
  const lostItems = Object.entries(result.losses);
  const summary = lostItems.length === 0
    ? 'No tinware was outside the wagon — nothing crushed.'
    : `${lostItems.map(([id, qty]) => `${qty} ${id.replace(/_/g, ' ')}`).join(' + ')} crushed under hooves.`;
  return {
    ...state,
    inventory,
    morale: Math.max(0, state.morale - 3),
    eventLog: [
      ...state.eventLog,
      { day: state.day, text: `Buffalo stampede tore through camp. ${summary} Morale −3.` }
    ]
  };
}

/** Apply stampede damage to a single NPC wagon. Period: a stampede
 *  through an in-train camp hit every wagon, not just the player's.
 *  Returns the updated wagon + a player-visible log fragment for the
 *  bubble-up news on the player's eventLog. */
export function applyStampedeToNpc(
  wagon: NpcWagonState,
  rng: Rng,
  day: number
): { wagon: NpcWagonState; playerLog: string | null } {
  if (wagon.outcome !== 'in-progress') {
    return { wagon, playerLog: null };
  }
  const { inventory, result } = rollStampedeLosses(wagon.inventory, rng);
  const lostItems = Object.entries(result.losses);
  if (lostItems.length === 0) {
    return { wagon, playerLog: null };
  }
  const summary = lostItems
    .map(([id, qty]) => `${qty} ${id.replace(/_/g, ' ')}`)
    .join(' + ');
  return {
    wagon: {
      ...wagon,
      inventory,
      morale: Math.max(0, wagon.morale - 3),
      eventLog: [
        ...wagon.eventLog,
        { day, text: `Buffalo stampede crushed ${summary} in camp. Morale −3.` }
      ]
    },
    playerLog: `${wagon.name} lost ${summary} in the stampede.`
  };
}
