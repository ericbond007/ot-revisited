// Terrain color tables + shared scene constants. Used by the parallax
// layers and the GroundBand to look up per-(biome, time-of-day) sky
// gradients and per-biome ground gradients.
//
// Time-of-day vocabulary: 'day' | 'dusk' | 'night'. README.md also
// mentions a 'dawn' state but it shares dusk's palette in the
// original — collapsed here for now.

import type { Terrain } from '$lib/game/types';

export type TimeOfDay = 'day' | 'dusk' | 'night';

/** Sky gradient stops keyed by (terrain, timeOfDay). Three stops:
 *  top of sky → mid-band → horizon. Used as the linearGradient stops
 *  for the scene's <rect> sky fill. */
export const SKY: Record<Terrain, Record<TimeOfDay, [string, string, string]>> = {
  prairie: {
    day:   ['#6da7d4', '#b3d4e8', '#d8e4ee'],
    dusk:  ['#d4824a', '#e8a878', '#f3d4a0'],
    night: ['#1a1a3a', '#2a2a4a', '#3a3a5a']
  },
  mountains: {
    day:   ['#7a98b8', '#a8c0d4', '#cfd8e0'],
    dusk:  ['#a86848', '#c89878', '#d8b8a0'],
    night: ['#1a1a30', '#2a2a40', '#3a3a50']
  },
  forest: {
    day:   ['#5a8a7a', '#9ab8a8', '#c8d8d0'],
    dusk:  ['#945830', '#b88060', '#d4a888'],
    night: ['#0f1a14', '#1a2a20', '#2a3a30']
  },
  desert: {
    day:   ['#e8b878', '#d99e5a', '#b88450'],
    dusk:  ['#c84818', '#e87838', '#f5a868'],
    night: ['#2a1a3a', '#3a2a4a', '#4a3a5a']
  },
  river: {
    day:   ['#8aa8c8', '#b8c8d8', '#d8e0e8'],
    dusk:  ['#8a6878', '#b8889a', '#d4a0b0'],
    night: ['#1a2a3a', '#2a3a4a', '#3a4a5a']
  }
};

/** Ground gradient stops (top → bottom). Two stops only — the foreground
 *  fill behind the wagon. Brighter colors at the horizon, darker at the
 *  bottom of the frame. */
export const GROUND_FILL: Record<Terrain, [string, string]> = {
  prairie:   ['#b8a05a', '#7a6a2a'],
  mountains: ['#6e5a45', '#3a2818'],
  forest:    ['#4a5d3a', '#2e3a23'],
  desert:    ['#c9874a', '#7a4818'],
  river:     ['#7a8a5a', '#3a4a2a']
};

/** Scene-level constants from the README. The composer in Phase 6
 *  uses these to align wagon, parallax layers, and weather overlays. */
export const SCENE_W = 1280;
export const SCENE_H = 720;
export const HORIZON_Y = 380;
export const GROUND_Y = 540;
