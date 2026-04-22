import type { GameState } from '../types';
import type { Rng } from '../rng';
import { hasLiveCarpenter, hasLivePreacher, aliveOf } from './predicates';

export const CARPENTER_PART_SAVE_CHANCE = 0.5;
export const PREACHER_DEATH_MORALE_MULT = 0.5;
export const WHORE_POST_EARNINGS_MIN = 5;
export const WHORE_POST_EARNINGS_MAX = 15;

// Carpenter: 50% chance the spare part is NOT consumed during a wagon-repair
// event. Returns the updated state + whether the save fired (so the caller
// can add a flavor log entry).
export function consumeWagonPart(
  state: GameState,
  rng: Rng,
  partId: string
): { state: GameState; saved: boolean } {
  const have = state.inventory[partId] ?? 0;
  if (have <= 0) return { state, saved: false };
  if (hasLiveCarpenter(state) && rng.chance(CARPENTER_PART_SAVE_CHANCE)) {
    return { state, saved: true };
  }
  return {
    state: { ...state, inventory: { ...state.inventory, [partId]: have - 1 } },
    saved: false
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
