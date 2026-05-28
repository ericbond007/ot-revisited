// Trail-progress helper for the dynamic-debris system.
//
// The trail is the LANDMARKS sequence; total distance is the sum of
// every leg's `milesFromPrevious` (the final landmark is kind 'end').
// `trailProgress` maps an absolute `milesTraveled` to a 0..1 fraction
// of the whole journey, used to weight which debris sprites appear
// (clean rocks/sticks early, bones mid-trail, abandoned junk late —
// see GroundPainting.svelte).

import { LANDMARKS } from '$lib/game/content/landmarks';

/** Total trail length in miles — Σ of every leg's milesFromPrevious. */
export const TOTAL_TRAIL_MILES: number = LANDMARKS.reduce(
  (sum, l) => sum + l.milesFromPrevious,
  0,
);

/** Clamp + normalize milesTraveled to a 0..1 trail-progress fraction. */
export function trailProgress(milesTraveled: number): number {
  if (TOTAL_TRAIL_MILES <= 0) return 0;
  const f = milesTraveled / TOTAL_TRAIL_MILES;
  return f < 0 ? 0 : f > 1 ? 1 : f;
}
