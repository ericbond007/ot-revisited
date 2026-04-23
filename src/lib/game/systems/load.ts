// Wagon load / overload helpers.
// Weight in a wagon matters for: travel speed, ox fatigue, and wagon-event
// hazard. Three smooth quadratic curves, all anchored at 0 under rated
// capacity — overloading starts the penalty.

import type { GameState } from '../types';
import { ITEMS } from '../content/items';

// Minimum speed multiplier even under catastrophic overload — you're still
// moving, just barely.
const SPEED_FLOOR = 0.40;

/** Sum of all carried inventory weight in lb. */
export function totalInventoryWeight(state: GameState): number {
  let w = 0;
  for (const [id, qty] of Object.entries(state.inventory)) {
    if (!qty) continue;
    const meta = ITEMS[id];
    if (!meta) continue;
    w += meta.weightLbPerUnit * qty;
  }
  return w;
}

/** Fraction of rated capacity. Can exceed 1.0 under overload. */
export function loadPct(state: GameState): number {
  const cap = state.wagon.carryCapacity;
  if (cap <= 0) return 0;
  return totalInventoryWeight(state) / cap;
}

/** Fraction *over* capacity — 0 when at or under rated cap. */
export function loadOverPct(state: GameState): number {
  return Math.max(0, loadPct(state) - 1);
}

/**
 * Speed multiplier from load. 1.0 at or under cap; falls off as over²,
 * floored at SPEED_FLOOR.
 *
 *   100% → 1.00
 *   125% → 0.925
 *   150% → 0.70
 *   175% → 0.40 (floor)
 *   200% → 0.40
 */
export function loadSpeedMult(state: GameState): number {
  const over = loadOverPct(state);
  if (over === 0) return 1;
  return Math.max(SPEED_FLOOR, 1 - 1.2 * over * over);
}

/**
 * Extra ox-fatigue multiplier from load. 1.0 at or under cap; grows as over².
 *
 *   100% → 1.00
 *   125% → 1.0625
 *   150% → 1.25
 *   200% → 2.00
 */
export function loadFatigueMult(state: GameState): number {
  const over = loadOverPct(state);
  return 1 + 1.0 * over * over;
}

/**
 * Weight-scale applied to wagon-category event weights in rollEvent. Under
 * overload, breakdowns happen more often.
 *
 *   100% → 1.00
 *   125% → 1.125
 *   150% → 1.50
 *   200% → 3.00
 */
export function wagonHazardMult(state: GameState): number {
  const over = loadOverPct(state);
  return 1 + 2.0 * over * over;
}
