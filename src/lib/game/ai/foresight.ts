// #932 Gap-aware bot planning. Pure helpers over GameState that the
// persona surface can call to make decisions aware of "how far until
// the next chance to resupply." Without this, personas pick rations /
// restock / repairs based purely on current state, blindly leaving
// Fort Kearny with 20 days of food on a 317-mile leg to Robidoux.
//
// Lives in `game/ai/` (per #302 namespace) so it's available to player
// bot, NPC restock, encountered-train wagons, and future #284
// multiplayer fallback alike.

import { LANDMARKS, isLandmarkAbandoned, type Landmark } from '../content/landmarks';
import type { GameState } from '../types';

/** A "supply post" for foresight purposes — somewhere the wagon can
 *  trade. Trading posts qualify; the trail end qualifies as a
 *  zero-distance target (no further supply needed). Towns are a
 *  trading_post variant already. Rivers / scenic landmarks do not. */
function isSupplyStop(kind: string): boolean {
  return kind === 'trading_post' || kind === 'end';
}

/** Cumulative miles to each landmark, computed once at module load.
 *  LANDMARKS is readonly + module-scope so we can safely memoize.
 *  Carries the full Landmark ref so callers can filter by year-gate
 *  (#1163 — `isLandmarkAbandoned` check during supply-stop lookup). */
const CUM_MILES: readonly { id: string; kind: string; cum: number; landmark: Landmark }[] = (() => {
  let cum = 0;
  return LANDMARKS.map((lm) => {
    cum += lm.milesFromPrevious;
    return { id: lm.id, kind: lm.kind, cum, landmark: lm };
  });
})();

/** Miles from the wagon's current position to the next supply stop
 *  ahead on the trail. Returns 0 when no supply post lies ahead (past
 *  The Dalles, near Oregon City) — the wagon has already cleared the
 *  last gap.
 *
 *  #1163 — Filters out posts that are abandoned for the current year
 *  (e.g. Fort Boise in 1857, gated `abandonedAfterYear: 1855`; Rock
 *  Creek Station in 1850, gated `abandonedBeforeYear: 1857`). Without
 *  this, gap-aware bots plan restock around posts that aren't actually
 *  there — leaves Boise in 1857 expecting another supply leg ahead at
 *  a Fort Hall that's been gone for a year, then stalls.  Sibling
 *  fix to #1162 which gated NPC restock the same way. */
export function nextSupplyDistance(state: GameState): number {
  const here = state.location.milesTraveled;
  const year = state.date.year;
  const next = CUM_MILES.find((lm) =>
    isSupplyStop(lm.kind) &&
    lm.cum > here &&
    !isLandmarkAbandoned(lm.landmark, year)
  );
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

/** #1388 T2 — Mountain miles the party will cross before the next
 *  supply stop. Scans CUM_MILES from the wagon's current position to
 *  the next trading_post / end landmark (same "next supply" definition
 *  as nextSupplyDistance), summing the milesFromPrevious of every leg
 *  whose terrain is 'mountains'.
 *
 *  Returns 0 when the next gap is all flat terrain (Platte corridor)
 *  or when the wagon is past the last supply stop. A value ≥ 40
 *  signals a meaningful mountain leg ahead — the Blues/Cascades are
 *  where worn outfits died (Marcy 1859: stock first; the Blue
 *  Mountains in particular demanded a fresh team and tight wagon).
 *
 *  Extension of the existing CUM_MILES scan pattern — no new
 *  landmark-walking logic; we reuse the same pre-computed array and
 *  the same isSupplyStop gate used by nextSupplyDistance/
 *  effectiveGapMiles. */
export function mountainMilesInNextGap(state: GameState): number {
  const here = state.location.milesTraveled;
  const year = state.date.year;
  let mountainMiles = 0;
  let foundNextSupply = false;
  for (const entry of CUM_MILES) {
    if (entry.cum <= here) continue; // behind us
    // Accumulate mountain miles on this leg before deciding if we've
    // hit the next supply stop.
    if (entry.landmark.terrain === 'mountains') {
      mountainMiles += entry.landmark.milesFromPrevious;
    }
    // If this landmark IS a supply stop (and not abandoned), it marks
    // the end of the current gap — stop scanning.
    if (isSupplyStop(entry.kind) && !isLandmarkAbandoned(entry.landmark, year)) {
      foundNextSupply = true;
      break;
    }
  }
  return foundNextSupply ? mountainMiles : 0;
}

/** #1026 — Persona water-trigger threshold scaled for terrain. In
 *  well-watered country (river / forest / prairie / mountains) the
 *  persona's normal ratio fires — passive ambient refill keeps the
 *  keg topped, so waiting until 10–20% is fine. In desert the bot
 *  has no surface streams; `restWithWaterChain` falls back to
 *  dig_well (Marcy 1859 — 40% success per attempt). With a 60% fail
 *  rate, the bot needs runway: trigger when the keg is still half-
 *  full so failed dig attempts don't drop the party into
 *  dehydration. Period anchor: Bryant 1846 on the Forty-Mile
 *  Desert — "we began searching while the kegs were still half-
 *  full"; Royce 1849 — emigrants who waited until empty died on the
 *  bench. */
export function desertWaterFloor(
  state: GameState,
  normal: number,
  desert: number
): number {
  return state.location.terrain === 'desert' ? desert : normal;
}
