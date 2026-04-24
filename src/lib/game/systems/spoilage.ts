import type { GameState } from '../types';

/**
 * Fresh game meat spoils if not eaten (or cured — #124) within a few days
 * of the hunt. The clock is tracked on `flags._gameMeatSpoilDay`: the day
 * number on which remaining game_meat goes to zero.
 *
 * The hunt action (actions/hunt.ts) sets the spoil day when it adds meat.
 * Each day tick, this system checks if the clock has run out; if so, the
 * remaining meat rots and the flag is cleared.
 *
 * Runs BEFORE daily consumption so the party can't eat rotten meat — if
 * today is spoil-day, the pile is gone before anyone reaches for it.
 */

/** Days a fresh kill keeps in the wagon before rotting. */
export const GAME_MEAT_FRESH_DAYS = 3;

/**
 * Returns the day number on which meat added right now should spoil.
 * New hunts reset the pile's clock — simpler model than tracking per-lb
 * ages. Pooling is abstracting, but pragmatic.
 */
export function computeSpoilDay(currentDay: number): number {
  return currentDay + GAME_MEAT_FRESH_DAYS;
}

/**
 * Day-tick step. If today has reached (or passed) the spoil-day flagged
 * on state and there's still meat in inventory, zero it out and log.
 */
export function applySpoilage(state: GameState): GameState {
  const spoilDay = state.flags._gameMeatSpoilDay;
  if (typeof spoilDay !== 'number') return state;

  const meat = state.inventory.game_meat ?? 0;
  if (meat <= 0) {
    // Nothing to spoil — clear the stale flag so it doesn't linger.
    const flags = { ...state.flags };
    delete (flags as Record<string, unknown>)._gameMeatSpoilDay;
    return { ...state, flags };
  }

  if (state.day < spoilDay) return state;

  const newInventory = { ...state.inventory, game_meat: 0 };
  const flags = { ...state.flags };
  delete (flags as Record<string, unknown>)._gameMeatSpoilDay;

  return {
    ...state,
    inventory: newInventory,
    flags,
    eventLog: [
      ...state.eventLog,
      { day: state.day, text: `${meat} lb of fresh game meat spoiled in the wagon.` }
    ]
  };
}
