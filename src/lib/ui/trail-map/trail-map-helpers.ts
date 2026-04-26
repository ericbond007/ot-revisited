// Pure helpers for the trail-map components. Keeping these out of the
// .svelte files lets us unit-test the math independent of the DOM.
//
// The repo's LANDMARKS array (32 entries) stores `milesFromPrevious`
// per leg. The map needs absolute cumulative miles per landmark and
// per-pixel xy positions to draw pins. accumulateMiles() bakes the
// cumulative field; the *Coords map (built externally per design SVG)
// is keyed by landmark id.

import type { Landmark } from '$lib/game/content/landmarks';

/** Landmark with the cumulative-mile field added. */
export interface MarkedLandmark extends Landmark {
  /** Cumulative miles from the start (Independence) to this landmark. */
  mile: number;
}

/** Build the cumulative-mile lookup once per LANDMARKS array. */
export function accumulateMiles(landmarks: readonly Landmark[]): MarkedLandmark[] {
  const out: MarkedLandmark[] = [];
  let cum = 0;
  for (const l of landmarks) {
    cum += l.milesFromPrevious;
    out.push({ ...l, mile: cum });
  }
  return out;
}

/** Find the most recent landmark passed and the next one coming up. */
export function currentLeg(
  marked: readonly MarkedLandmark[],
  currentMileage: number
): { last: MarkedLandmark | null; next: MarkedLandmark | null } {
  let last: MarkedLandmark | null = null;
  let next: MarkedLandmark | null = null;
  for (const m of marked) {
    if (m.mile <= currentMileage) last = m;
    else if (next === null) next = m;
  }
  return { last, next };
}

/** Distance and name of the next upcoming landmark. Returns null if
 *  the party has passed the final landmark. */
export function milesToNext(
  marked: readonly MarkedLandmark[],
  currentMileage: number
): { name: string; miles: number } | null {
  const { next } = currentLeg(marked, currentMileage);
  if (!next) return null;
  return { name: next.name, miles: Math.max(0, Math.round(next.mile - currentMileage)) };
}

/** Distance and name of the next upcoming landmark of a given kind
 *  (e.g. 'trading_post' for the next fort/post). */
export function milesToNextOfKind(
  marked: readonly MarkedLandmark[],
  currentMileage: number,
  kind: Landmark['kind']
): { name: string; miles: number } | null {
  const found = marked.find((m) => m.kind === kind && m.mile > currentMileage);
  if (!found) return null;
  return { name: found.name, miles: Math.max(0, Math.round(found.mile - currentMileage)) };
}

/** Linear interpolation between adjacent *plotted* landmarks weighted
 *  by mileage. Used to position the wagon glyph on the SVG path.
 *
 *  `routeCoords` is a per-landmark `[x, y]` lookup keyed by id —
 *  hand-built per design SVG (see trail-map-svg/landmark-coords.ts).
 *  Only landmarks present in the lookup count as anchors; un-plotted
 *  intermediates are skipped, so the wagon advances proportionally
 *  through them (e.g. mileage spent passing Ash Hollow between
 *  plotted Ft. Kearny and Courthouse Rock just slides the wagon
 *  along that segment). */
export function interpolatePosition(
  marked: readonly MarkedLandmark[],
  currentMileage: number,
  routeCoords: Record<string, readonly [number, number]>
): readonly [number, number] {
  const plotted = marked.filter((m) => routeCoords[m.id]);
  if (plotted.length === 0) return [0, 0];

  let last: MarkedLandmark | null = null;
  let next: MarkedLandmark | null = null;
  for (const m of plotted) {
    if (m.mile <= currentMileage) last = m;
    else if (next === null) next = m;
  }

  if (last && !next) return routeCoords[last.id]!;
  if (!last && next) return routeCoords[next.id]!;
  if (last && next) {
    const a = routeCoords[last.id]!;
    const b = routeCoords[next.id]!;
    const span = Math.max(1, next.mile - last.mile);
    const t = Math.max(0, Math.min(1, (currentMileage - last.mile) / span));
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  }
  return [0, 0];
}

/** Total trail length (Independence → Oregon City). */
export function totalMiles(marked: readonly MarkedLandmark[]): number {
  return marked.length === 0 ? 0 : marked[marked.length - 1].mile;
}

/** "Leg N of M" label — counts stop-worthy landmarks (start / trading
 *  posts / rivers / end) as leg boundaries, mirroring the existing
 *  TrailMap.svelte chunking. */
const STOP_KINDS = new Set<Landmark['kind']>(['start', 'trading_post', 'river', 'end']);

export function legOrdinal(
  marked: readonly MarkedLandmark[],
  currentMileage: number
): { current: number; total: number } {
  const stopMiles: number[] = [0];
  for (const m of marked) {
    if (STOP_KINDS.has(m.kind) && m.kind !== 'start') stopMiles.push(m.mile);
  }
  const totalLegs = stopMiles.length - 1;
  let current = 1;
  for (let i = 1; i < stopMiles.length; i++) {
    if (currentMileage < stopMiles[i]) {
      current = i;
      break;
    }
    current = i + 1;
  }
  return { current: Math.min(current, totalLegs), total: Math.max(1, totalLegs) };
}
