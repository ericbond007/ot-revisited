import type { GameState } from '../types';
import { getTribe, attitudeLevel, type AttitudeLevel, type Tribe } from '../content/tribes';

// Runtime tribe attitudes live in `flags._tribeAttitudes` — a record
// keyed by tribe id. Missing entries fall back to the tribe's baseline,
// so the map only tracks deltas introduced by in-game events.

function readAttitudes(state: GameState): Record<string, number> {
  return (state.flags._tribeAttitudes as Record<string, number> | undefined) ?? {};
}

function writeAttitudes(state: GameState, map: Record<string, number>): GameState {
  return {
    ...state,
    flags: { ...state.flags, _tribeAttitudes: map }
  };
}

/** Current attitude score (0-100) for a tribe. Falls back to baseline
 *  when nothing has shifted it yet. */
export function getTribeAttitude(state: GameState, tribeId: string): number {
  const override = readAttitudes(state)[tribeId];
  if (typeof override === 'number') return override;
  return getTribe(tribeId).baselineAttitude;
}

/** Categorical wrapper — hostile / wary / neutral / friendly / allied. */
export function getTribeAttitudeLevel(state: GameState, tribeId: string): AttitudeLevel {
  return attitudeLevel(getTribeAttitude(state, tribeId));
}

/** Shift a tribe's attitude by `delta` (positive improves, negative
 *  sours), clamped to [0, 100]. */
export function adjustTribeAttitude(
  state: GameState,
  tribeId: string,
  delta: number
): GameState {
  if (delta === 0) return state;
  const current = getTribeAttitude(state, tribeId);
  const next = Math.max(0, Math.min(100, current + delta));
  return writeAttitudes(state, { ...readAttitudes(state), [tribeId]: next });
}

/** Hostile tribes refuse trade. Wary+ tribes accept their preferred
 *  goods. Friendly+ accepts anything the party offers. */
export function willTradeWith(state: GameState, tribeId: string): boolean {
  return getTribeAttitudeLevel(state, tribeId) !== 'hostile';
}

/** Chance a tribe will fire a hostile encounter outcome vs. peaceful.
 *  Driven entirely by current attitude — a wary tribe rolls hostile
 *  more often than a friendly one. Consumers (encounter events) can
 *  fold terrain / circumstance modifiers on top. */
export function hostileEncounterChance(state: GameState, tribeId: string): number {
  const a = getTribeAttitude(state, tribeId);
  // Linear from 0.5 at 0 attitude to 0.02 at 100.
  return Math.max(0.02, 0.5 - a * 0.0048);
}

// #241 Gift-first parlay. Period reality: emigrants who opened a
// negotiation by sharing tobacco (or sugar in later years) got
// markedly better trade terms and lasting goodwill. Catlin's plains
// journals, Sage 1846, and Frizzell 1852 all describe the smoke-first
// custom — refusing to share a pipe was read as an open insult.
//
// We track the one-time gift per tribe via a `_giftedTribe_<id>`
// flag. Subsequent encounters check the flag for native-side
// behaviors that key off "this party is known to us" — for now
// that's the bonus pemmican rate in the trading-party encounter.

function giftedFlagKey(tribeId: string): string {
  return `_giftedTribe_${tribeId}`;
}

/** Returns true once the party has shared a smoke / gift with this
 *  tribe. Persistent for the rest of the journey. */
export function hasGiftedTribe(state: GameState, tribeId: string): boolean {
  return Boolean(state.flags[giftedFlagKey(tribeId)]);
}

/** Sets the one-time gift flag for the named tribe. Idempotent. */
export function markGiftedTribe(state: GameState, tribeId: string): GameState {
  return {
    ...state,
    flags: { ...state.flags, [giftedFlagKey(tribeId)]: true }
  };
}

/** Exported convenience — encounter pickers will call this first. */
export { tribesAtMile, getTribe } from '../content/tribes';
export type { Tribe, AttitudeLevel };
