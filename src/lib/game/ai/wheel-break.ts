import type { GameState } from '../types';
import type { WheelBreakChoice } from '../systems/wheel-break';

/**
 * Default persona policy for the broken_wheel event (#929).
 *
 * Priority: spare > rebuild > push_on. push_on is a desperation move —
 * fires only when there is no spare AND the wagon is so worn that a
 * rebuild has a coin-flip chance of failure (cond < 25, no Blacksmith).
 * With a Blacksmith, rebuild stays preferable even on a worn wagon
 * (success rate stays at 70%+).
 *
 * Per-persona overrides adjust the desperation gate's threshold.
 */
export function defaultWheelBreakResponse(state: GameState): WheelBreakChoice {
  if ((state.inventory.wheel ?? 0) > 0) return 'spare';
  const hasBlacksmith = state.party.some(
    (m) => !m.dead && m.profession === 'blacksmith'
  );
  if (state.wagon.condition < 25 && !hasBlacksmith) return 'push_on';
  return 'rebuild';
}

/**
 * Per-persona policy with adjustable desperation threshold. The
 * threshold is the wagon-condition floor *below* which the persona
 * gives up on rebuild and pushes on. Default 25; Reckless/Worn 40;
 * Faithful/Frugal -1 (disabled — never push on).
 */
export function thresholdWheelBreakResponse(
  state: GameState,
  desperationCondThreshold: number
): WheelBreakChoice {
  if ((state.inventory.wheel ?? 0) > 0) return 'spare';
  const hasBlacksmith = state.party.some(
    (m) => !m.dead && m.profession === 'blacksmith'
  );
  if (state.wagon.condition < desperationCondThreshold && !hasBlacksmith) {
    return 'push_on';
  }
  return 'rebuild';
}
