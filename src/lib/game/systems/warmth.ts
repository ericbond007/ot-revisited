import type { GameState } from '../types';

// Aggregate clothing warmth — 0 to 100. Not per-member; a family
// shared coats and blankets as needed on the trail. We approximate by
// summing per-item points, capping each item's count at the number of
// alive party members (a party of 3 doesn't benefit from 10 coats),
// then averaging across the party.
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

/**
 * Returns 0–100. 0 = bare-shirt-and-hope. ~60 = a coat and a blanket
 * per adult (baseline warm). 100 = full kit including boots, robe,
 * moccasins.
 */
export function warmthFor(state: GameState): number {
  const alive = state.party.filter((m) => !m.dead).length;
  if (alive === 0) return 0;
  let total = 0;
  for (const [id, points] of Object.entries(WARMTH_POINTS)) {
    const owned = state.inventory[id] ?? 0;
    // Each item only "warms" up to one per person — a pile of extras
    // doesn't stack on the same body.
    total += Math.min(owned, alive) * points;
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
