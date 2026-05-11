// #932 Gap-aware bot planning. Pure helpers over GameState that the
// persona surface can call to make decisions aware of "how far until
// the next chance to resupply." Without this, personas pick rations /
// restock / repairs based purely on current state, blindly leaving
// Fort Kearny with 20 days of food on a 317-mile leg to Robidoux.
//
// Lives in `game/ai/` (per #302 namespace) so it's available to player
// bot, NPC restock, encountered-train wagons, and future #284
// multiplayer fallback alike.

import { LANDMARKS } from '../content/landmarks';
import type { GameState } from '../types';

/** A "supply post" for foresight purposes — somewhere the wagon can
 *  trade. Trading posts qualify; the trail end qualifies as a
 *  zero-distance target (no further supply needed). Towns are a
 *  trading_post variant already. Rivers / scenic landmarks do not. */
function isSupplyStop(kind: string): boolean {
  return kind === 'trading_post' || kind === 'end';
}

/** Cumulative miles to each landmark, computed once at module load.
 *  LANDMARKS is readonly + module-scope so we can safely memoize. */
const CUM_MILES: readonly { id: string; kind: string; cum: number }[] = (() => {
  let cum = 0;
  return LANDMARKS.map((lm) => {
    cum += lm.milesFromPrevious;
    return { id: lm.id, kind: lm.kind, cum };
  });
})();

/** Miles from the wagon's current position to the next supply stop
 *  ahead on the trail. Returns 0 when no supply post lies ahead (past
 *  The Dalles, near Oregon City) — the wagon has already cleared the
 *  last gap. */
export function nextSupplyDistance(state: GameState): number {
  const here = state.location.milesTraveled;
  const next = CUM_MILES.find((lm) => isSupplyStop(lm.kind) && lm.cum > here);
  return next ? next.cum - here : 0;
}

/** Convert a mileage gap into a days-of-food buffer at the persona's
 *  expected pace. `safetyFactor` pads for slower-than-expected days
 *  (mud, sickness, weather): cautious 1.5×, balanced 1.2×, aggressive
 *  1.0×. Returned days are floored at `minDays` so personas with
 *  short upcoming gaps don't completely deflate their stores. */
export interface GapBufferOpts {
  paceMiPerDay: number;
  safetyFactor: number;
  minDays: number;
}

export function gapBufferDays(miles: number, opts: GapBufferOpts): number {
  if (miles <= 0) return opts.minDays;
  const raw = (miles / Math.max(1, opts.paceMiPerDay)) * opts.safetyFactor;
  return Math.max(opts.minDays, Math.round(raw));
}
