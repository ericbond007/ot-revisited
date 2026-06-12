import type { GameState } from '../types';
import type { Rng } from '../rng';
import { hasLiveTeamster } from '../professions/predicates';
import { TEAMSTER_STRAY_MULT } from './oxen';

/**
 * Stray-oxen morning delay (#221) + Teamster bonus (#220).
 *
 * Period reality: emigrants routinely lost 2-4 hours each morning
 * rounding up oxen that wandered overnight in search of grass and
 * water. Some days were entirely lost to it. Mitigations were
 * picket pins + a long rope on the lead ox, hobbles, a bell-ox,
 * and a Teamster who knew the team's habits.
 *
 * Mechanic: rolled at the start of every travel day. On a hit,
 * apply a miles multiplier to that day's distance and log the loss.
 * Rare worst-case: an ox wanders off for good (1 in 100).
 *
 * Mitigation stack (multiplicative on the base chance):
 *   - picket_pins in inventory: 0.5×
 *   - dog in party: 0.7×
 *   - Teamster profession: 0.6×
 *   - all three stacked: 0.21× → ~5% / day
 *
 * Wired into applyTravel BEFORE the miles roll so the multiplier
 * lands on actual day distance.
 */

/** Base per-travel-day chance of a stray incident with no mitigations. */
export const STRAY_BASE_CHANCE = 0.25;

/** Picket-pins multiplier on the stray-incident chance. */
export const PICKET_PINS_STRAY_MULT = 0.5;

/** Dog-in-party multiplier on the stray-incident chance. */
export const DOG_STRAY_MULT = 0.7;

/** Permanent-loss chance once a stray incident has fired. */
export const STRAY_PERMANENT_LOSS_CHANCE = 0.05;

/** Returns the per-day stray-incident chance with all mitigations folded in. */
export function strayChance(state: GameState): number {
  let p = STRAY_BASE_CHANCE;
  if ((state.inventory.picket_pins ?? 0) > 0) p *= PICKET_PINS_STRAY_MULT;
  if (state.dog) p *= DOG_STRAY_MULT;
  if (hasLiveTeamster(state)) p *= TEAMSTER_STRAY_MULT;
  return p;
}

export interface StrayRollResult {
  /** Multiplier to apply to today's miles. 1.0 means no impact. */
  milesMult: number;
  /** Log line to push to eventLog, or null when no incident. */
  logLine: string | null;
  /** Mutated state — only set when a permanent ox loss occurred. */
  state: GameState;
}

/** Roll the morning stray check. Pure of any inventory writes except
 *  on the rare permanent-loss branch which removes one healthy ox. */
export function rollStrayMorning(state: GameState, rng: Rng): StrayRollResult {
  const chance = strayChance(state);
  if (!rng.chance(chance)) {
    return { milesMult: 1, logLine: null, state };
  }

  // Incident fired. Roll the rare worst case first — an ox wanders
  // off across the prairie and we can't find them. Only triggers when
  // there's more than one healthy ox to lose (don't strand the wagon).
  const liveOxen = state.oxen.filter((o) => o.health > 0);
  if (liveOxen.length > 1 && rng.chance(STRAY_PERMANENT_LOSS_CHANCE)) {
    // Pick the ox with the highest fatigue — the one most likely to
    // have drifted farthest in search of better grass.
    const target = [...liveOxen].sort((a, b) => b.fatigue - a.fatigue)[0];
    const oxen = state.oxen.map((o) =>
      o.id === target.id ? { ...o, health: 0 } : o
    );
    // #1388 follow-through — event-path ox deaths feed the panic-buy
    // recency window like tick deaths.
    return {
      milesMult: 0.7,
      logLine: 'An ox wandered off in the night and could not be found. Hours lost searching, then the team pressed on a head short.',
      state: { ...state, oxen, flags: { ...state.flags, _lastOxDeathDay: state.day } }
    };
  }

  // Common case: 2-4 hours lost, miles take a 0.6×-0.85× hit.
  const milesMult = 0.6 + rng.next() * 0.25;
  const hoursLost = Math.round((1 - milesMult) * 10);
  return {
    milesMult,
    logLine: `Oxen had wandered overnight — ${hoursLost} hours lost rounding them up.`,
    state
  };
}
