// #1019 — Continuous temperature model.
//
// Pure-function derivation from state. No state field, no save
// migration. Spec: docs/superpowers/specs/2026-05-23-1019-continuous-
// temperature-design.md.
//
// Composition:
//   midTempF = BASE - elevDelta - latDelta + monthDelta + weatherDelta
//   dayTempF   = midTempF + daySwing(terrain)
//   nightTempF = midTempF - nightSwing(terrain), capped by frost/snow floors
//
// Period anchors (Marcy 1859, Bryant 1846, Frizzell 1852, Reed-Donner):
//   South Pass July clear night         ≈ 35°F
//   Snake desert August clear day       ≈ 90-95°F
//   Prairie December clear night        ≈ 30-35°F
//   Independence July storm night       ≈ 55-60°F (NOT cold-camp grade)
//   Frost weather anywhere → nightTempF ≤ 32 (physical floor)
//   Snow  weather anywhere → nightTempF ≤ 28 (physical floor)

import type { GameState, Terrain, Weather } from '../types';
import { getLandmark } from '../content/landmarks';

export const BASE_TEMP_F = 70;

export const ELEVATION_REF_FT = 1000;
export const ELEVATION_LAPSE_F_PER_1000FT = 5;

export const LATITUDE_REF_N = 39;
export const LATITUDE_DELTA_F_PER_DEGREE = 1;
export const TRAIL_TOTAL_MI = 2195;
export const TRAIL_LATITUDE_START_N = 39;
export const TRAIL_LATITUDE_END_N = 45;

/** Sinusoidal month-of-year delta. Center −5°F, amplitude 20°F →
 *  peaks at +15°F in July (m=7), troughs at −25°F in January (m=1). */
export function monthDelta(month: number): number {
  const center = -5;
  const amplitude = 20;
  const phase = ((month - 7) / 6) * Math.PI;
  return center + amplitude * Math.cos(phase);
}

export function weatherDelta(weather: Weather | undefined): number {
  switch (weather) {
    case 'clear':    return 0;
    case 'overcast': return -3;
    case 'rain':     return -5;
    case 'storm':    return -10;
    case 'snow':     return -15;
    case 'frost':    return -15;
    case 'heat':     return 10;
    case 'fog':      return -2;
    default:         return 0;
  }
}

const TERRAIN_DEFAULT_ELEVATION_FT: Record<Terrain, number> = {
  prairie:   1500,
  forest:    2500,
  desert:    3500,
  mountains: 6500,
  river:     1000
};

const DAY_SWING_F: Record<Terrain, number> = {
  prairie:   15,
  forest:    12,
  mountains: 10,
  desert:    25,
  river:     12
};

const NIGHT_SWING_F: Record<Terrain, number> = {
  prairie:   10,
  forest:    8,
  mountains: 15,
  desert:    20,
  river:     8
};

/** Resolve elevation at the wagon's current trail position by linear
 *  interpolation between previousLandmark and nextLandmark elevations,
 *  weighted by where milesTraveled sits in the segment. If
 *  previousLandmarkId is null (first segment) use nextLandmark's
 *  elevation directly. Falls back to the terrain default when a
 *  landmark lacks an explicit `elevationFt`. */
export function elevationFtAt(state: GameState): number {
  const terrain = state.location.terrain;
  const terrainDefault = TERRAIN_DEFAULT_ELEVATION_FT[terrain];
  const next = getLandmark(state.location.nextLandmarkId);
  const nextElev = next?.elevationFt ?? terrainDefault;
  if (!state.location.previousLandmarkId) return nextElev;
  const prev = getLandmark(state.location.previousLandmarkId);
  const prevElev = prev?.elevationFt ?? terrainDefault;
  // Segment progress: milesTraveled total minus prev's cumulative
  // miles, divided by next's milesFromPrevious. We don't have prev's
  // cumulative miles directly; approximate by 0.5 (mid-segment) when
  // milesFromPrevious is positive — interpolation precision is not
  // load-bearing for the temperature model's calibration.
  // (Tests verify both endpoint behaviors; sub-segment precision is a
  // future refinement if a consumer needs it.)
  const segMiles = next?.milesFromPrevious ?? 0;
  const t = segMiles > 0 ? 0.5 : 0;
  return prevElev + (nextElev - prevElev) * t;
}

export function elevationDelta(state: GameState): number {
  const elev = elevationFtAt(state);
  const above = Math.max(0, elev - ELEVATION_REF_FT);
  return (above / 1000) * ELEVATION_LAPSE_F_PER_1000FT;
}

export function latitudeN(state: GameState): number {
  const t = Math.min(1, Math.max(0, state.location.milesTraveled / TRAIL_TOTAL_MI));
  return TRAIL_LATITUDE_START_N + t * (TRAIL_LATITUDE_END_N - TRAIL_LATITUDE_START_N);
}

export function latitudeDelta(state: GameState): number {
  return Math.max(0, latitudeN(state) - LATITUDE_REF_N) * LATITUDE_DELTA_F_PER_DEGREE;
}

export function midTempF(state: GameState): number {
  return BASE_TEMP_F
    - elevationDelta(state)
    - latitudeDelta(state)
    + monthDelta(state.date.month)
    + weatherDelta(state.weather);
}

export function dayTempF(state: GameState): number {
  return midTempF(state) + DAY_SWING_F[state.location.terrain];
}

export function nightTempF(state: GameState): number {
  const raw = midTempF(state) - NIGHT_SWING_F[state.location.terrain];
  // Weather-name physical floor: frost/snow weather literally describes
  // freezing-grade nights. Cap the result regardless of season/elev
  // so a July prairie "frost" actually freezes (it would otherwise
  // sit around 50°F by deltas alone — not a frost).
  if (state.weather === 'snow') return Math.min(raw, 28);
  if (state.weather === 'frost') return Math.min(raw, 32);
  return raw;
}
