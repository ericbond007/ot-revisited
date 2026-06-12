import type { GameState } from '../types';
import { getClothingCondition, getFootwearCondition } from './clothing-wear';

// Aggregate clothing warmth — 0 to 100. Not per-member; a family
// shared coats and blankets as needed on the trail. We approximate by
// summing per-item points, capping each item's count at the number of
// alive party members (a party of 3 doesn't benefit from 10 coats),
// then averaging across the party.
//
// #1072 — warmth is now condition-aware. Garment items are scaled by
// clothingCondition/100; footwear items by footwearCondition/100.
// Both use a floor multiplier of 0.35 — rags still cover something
// (the period reality: Longmire's one boot was better than nothing).
//
// Consumers:
//  - `ford.ts` — warmth mitigates the ford-chill health roll.
//  - `fire.ts` — warmth reduces the cold-camp health hit when
//    firewood is unavailable.

/** Per-item warmth points when one of that item is available per person. */
export const WARMTH_POINTS: Record<string, number> = {
  coat: 25,
  blanket: 25,
  boots: 15,
  buffalo_robe: 25,
  moccasins: 10
};

/** #1072 — Items whose warmth is scaled by footwearCondition.
 *  All others are scaled by clothingCondition. */
const FOOTWEAR_ITEMS = new Set(['boots', 'moccasins']);

/** #1072 — Minimum condition multiplier. Rags still cover something.
 *  0.35 means a 0-condition garment still provides 35% of its full
 *  warmth — matches the spec "rags still cover something" guard. */
export const WARMTH_CONDITION_FLOOR = 0.35;

/**
 * Returns 0–100. 0 = bare-shirt-and-hope. ~60 = a coat and a blanket
 * per adult (baseline warm). 100 = full kit including boots, robe,
 * moccasins.
 *
 * #1072 — garment items scaled by clothingCondition/100 (floor 0.35);
 * footwear items scaled by footwearCondition/100 (floor 0.35).
 */
export function warmthFor(state: GameState): number {
  const alive = state.party.filter((m) => !m.dead).length;
  if (alive === 0) return 0;

  // #1072 — compute condition multipliers, respecting the floor.
  const garmentMult = Math.max(WARMTH_CONDITION_FLOOR, getClothingCondition(state) / 100);
  const footwearMult = Math.max(WARMTH_CONDITION_FLOOR, getFootwearCondition(state) / 100);

  let total = 0;
  for (const [id, points] of Object.entries(WARMTH_POINTS)) {
    const owned = state.inventory[id] ?? 0;
    // Each item only "warms" up to one per person — a pile of extras
    // doesn't stack on the same body.
    const effective = Math.min(owned, alive) * points;
    const mult = FOOTWEAR_ITEMS.has(id) ? footwearMult : garmentMult;
    total += effective * mult;
  }
  return Math.min(100, Math.round(total / alive));
}

/**
 * Clothing-damage multiplier used by ford chill + cold camp — scales
 * 1.0 (naked) down to ~0.2 (fully clothed). Quadratic so the first
 * few items matter more than the last.
 */
export function exposureMult(state: GameState): number {
  const w = warmthFor(state);
  const normalized = Math.max(0, Math.min(1, w / 100));
  return Math.max(0.2, 1 - normalized * normalized);
}
