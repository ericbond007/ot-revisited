import type { GameState } from '../types';
import type { Rng } from '../rng';
import { hasLiveCarpenter, hasLivePreacher, hasLiveBlacksmith, aliveOf } from './predicates';

export const CARPENTER_PART_SAVE_CHANCE = 0.5;
export const BLACKSMITH_SALVAGE_CHANCE = 0.4;
export const PREACHER_DEATH_MORALE_MULT = 0.5;
export const WHORE_POST_EARNINGS_MIN = 5;
export const WHORE_POST_EARNINGS_MAX = 15;

// Metal items the Blacksmith can scavenge from after a part is broken
// or consumed. Wood-only parts (canvas, plank) skip salvage.
const SALVAGEABLE_PARTS = new Set(['wheel', 'axle', 'tongue', 'ox_shoes']);

// Carpenter: 50% chance the spare part is NOT consumed during a wagon-repair
// event. Blacksmith: when a metal part IS consumed, 40% chance to salvage
// a piece of iron_scrap from the wreck. Returns the updated state +
// whether the save / salvage fired so the caller can flavor the log.
export function consumeWagonPart(
  state: GameState,
  rng: Rng,
  partId: string
): { state: GameState; saved: boolean; salvaged: boolean } {
  const have = state.inventory[partId] ?? 0;
  if (have <= 0) return { state, saved: false, salvaged: false };
  if (hasLiveCarpenter(state) && rng.chance(CARPENTER_PART_SAVE_CHANCE)) {
    return { state, saved: true, salvaged: false };
  }
  // Part is consumed. If it's metal AND we have a Blacksmith, roll for
  // iron-scrap salvage off the broken piece.
  let nextInventory = { ...state.inventory, [partId]: have - 1 };
  let salvaged = false;
  if (hasLiveBlacksmith(state) && SALVAGEABLE_PARTS.has(partId) && rng.chance(BLACKSMITH_SALVAGE_CHANCE)) {
    nextInventory.iron_scrap = (nextInventory.iron_scrap ?? 0) + 1;
    salvaged = true;
  }
  return {
    state: { ...state, inventory: nextInventory },
    saved: false,
    salvaged
  };
}

// Preacher halves morale penalties tied to death / burial events.
// Positive morale events (gifts, prayers with good outcome) are unaffected.
export function deathMoralePenalty(state: GameState, basePenalty: number): number {
  if (!hasLivePreacher(state)) return basePenalty;
  // Round up so the player gets the more favorable (smaller) penalty.
  return Math.ceil(basePenalty * PREACHER_DEATH_MORALE_MULT);
}

// Whore's trading-post earnings: fires once per arrival at a trading post.
// Earns $5-15, logs with "the hard way" flavor so the player can tell
// which profession contributed the cash.
export function applyWhoreTradingPostEarnings(
  state: GameState,
  rng: Rng,
  landmarkName: string
): GameState {
  const whores = aliveOf(state, 'whore');
  if (whores.length === 0) return state;
  const whore = whores[0];
  const earned = rng.int(WHORE_POST_EARNINGS_MIN, WHORE_POST_EARNINGS_MAX);
  return {
    ...state,
    cash: state.cash + earned,
    eventLog: [
      ...state.eventLog,
      { day: state.day, text: `${whore.name} earned $${earned} at ${landmarkName} the hard way.` }
    ]
  };
}
