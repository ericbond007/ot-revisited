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

/** Miles from the wagon's current position to the trail end (Oregon
 *  City). Used by `effectiveGapMiles` so back-half decisions look
 *  past the next supply post when provisioning for the whole
 *  remaining run. */
export function milesToEnd(state: GameState): number {
  const end = CUM_MILES[CUM_MILES.length - 1];
  return Math.max(0, end.cum - state.location.milesTraveled);
}

/** #963 — Effective gap distance for late-trail provisioning. The
 *  next-supply-post helper is myopic: at Fort Hall (mile ~1262) it
 *  returns the 289-mi gap to Boise even though the bot then faces
 *  another 644 mi of supply-thin trail to Oregon City. Trace audit
 *  showed bots leaving Hall provisioned for the next 289 miles, then
 *  starving between Boise and the Columbia.
 *
 *  Fix: in the back half of the trail, blend next-supply gap with
 *  miles-to-end so the bot provisions for the whole remaining run at
 *  the last serious resupply opportunity. Curve:
 *    - milesRemaining ≥ 1100: pure next-supply (plenty of posts ahead)
 *    - milesRemaining 700-1100: blend toward end (approaching Hall,
 *      start padding)
 *    - milesRemaining < 700: pure miles-to-end (back half — provision
 *      for the rest of the trail)
 *
 *  Period anchor: Bryant 1846 + Royce 1849 describe deliberate over-
 *  stocking at Bridger/Hall because the diaries knew post density past
 *  those forts was thin. Carpenter 1857 explicit: "leave Hall heavy
 *  or arrive hungry." */
export function effectiveGapMiles(state: GameState): number {
  const next = nextSupplyDistance(state);
  const end = milesToEnd(state);
  if (end >= 1100) return next;
  if (end >= 700) {
    const t = (1100 - end) / 400;  // 0 at 1100, 1 at 700
    return Math.max(next, Math.round(next + (end - next) * t));
  }
  return Math.max(next, end);
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

/** #1023 — Desired water_bag count when shopping at the current
 *  post. Targets 4 vessels before a meaningful gap (≥ 200 mi to next
 *  supply), 2 otherwise. Period anchor: Bidwell 1841 before the
 *  Humboldt Sink — "filled every keg, every gourd, every bottle";
 *  Royce 1849 before the Forty-Mile Desert — "the men spent the day
 *  binding extra kegs and bottles to the wagon"; Carpenter 1857 at
 *  Hall — "two rubber bags at Hall, four dollars apiece." Posts that
 *  stock water_bag are the late-trail forts (Bridger / Hall / Boise)
 *  where every onward leg is the dry stretch the diaries described. */
export function gapAwareWaterBagTarget(state: GameState): number {
  return effectiveGapMiles(state) >= 200 ? 4 : 2;
}
