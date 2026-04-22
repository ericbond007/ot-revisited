import type { GameState } from '../types';
import type { Rng } from '../rng';
import { hasLiveCarpenter, hasLivePreacher } from './predicates';

export const CARPENTER_PART_SAVE_CHANCE = 0.5;
export const PREACHER_DEATH_MORALE_MULT = 0.5;

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
