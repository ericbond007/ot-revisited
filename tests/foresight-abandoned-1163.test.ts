// #1163 — foresight.ts must skip supply posts that are abandoned for
// the current year, same as the player UI and (via #1162) the NPC
// engine. Without this, gap-aware bots plan their next restock around
// posts that aren't actually there:
//   - Fort Boise in 1857 (gated abandonedAfterYear: 1855)
//   - Rock Creek Station in 1850 (gated abandonedBeforeYear: 1857)
//   - Fort Hall in 1857 (gated abandonedAfterYear: 1856)
//   - Robidoux Trading Post in 1854 (gated abandonedAfterYear: 1852)
// Fixed by `isLandmarkAbandoned(lm.landmark, year)` filter in the
// `nextSupplyDistance` find() — propagates to effectiveGapMiles and
// gapAwareWaterBagTarget transparently.

import { describe, it, expect } from 'vitest';
import { nextSupplyDistance, effectiveGapMiles, gapAwareWaterBagTarget } from '../src/lib/game/ai/foresight';
import { createInitialState } from '../src/lib/game/engine';
import { LANDMARKS } from '../src/lib/game/content/landmarks';
import type { GameState } from '../src/lib/game/types';

function game(year: number): GameState {
  return createInitialState({
    seed: 'r1163',
    leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'doctor' }],
    startDate: { year, month: 6, day: 15 }
  });
}

/** Sum milesFromPrevious through a named landmark id (inclusive). */
function cumMilesAt(id: string): number {
  let sum = 0;
  for (const l of LANDMARKS) {
    sum += l.milesFromPrevious;
    if (l.id === id) return sum;
  }
  throw new Error(`unknown landmark ${id}`);
}

/** Build a game state positioned just past `id`, in year `year`. */
function positionPast(id: string, year: number): GameState {
  const s = game(year);
  return {
    ...s,
    location: {
      ...s.location,
      milesTraveled: cumMilesAt(id) + 1
    }
  };
}

describe('#1163 — nextSupplyDistance filters by abandonedAfterYear', () => {
  it('after fort_hall in 1857 (Boise gated >1855, Hall gated >1856) — skips both', () => {
    // Just past fort_hall (mile 1290). Year 1857.
    // Boise abandonedAfterYear: 1855 → skip. Walla Walla also after-1855
    // gate. Whitman Mission abandonedAfterYear: 1847.
    //
    // #1284 re-baseline: salmon_falls is now kind:'trading_post' (native
    // fishery post, no year-gate), so it is the next supply stop after
    // ft_hall at 89 mi — NOT The Dalles. The original test expected
    // the_dalles because salmon_falls was kind:'landmark' and invisible
    // to nextSupplyDistance. Now salmon_falls correctly appears first.
    const s = positionPast('ft_hall', 1857);
    const dist = nextSupplyDistance(s);
    const distTo = (id: string) => cumMilesAt(id) - s.location.milesTraveled;
    // Should NOT be the gap to Boise (~280 mi) — still correct; Boise is gated
    expect(dist).not.toBeCloseTo(distTo('ft_boise'), 0);
    // Should be the gap to salmon_falls (89 mi post-#1284)
    expect(dist).toBeCloseTo(distTo('salmon_falls'), 0);
  });

  it('after fort_hall in 1850 (everything open) — returns salmon_falls gap (#1284 re-baseline)', () => {
    // Year 1850: ft_boise NOT abandoned (gate is 1855+).
    //
    // #1284 re-baseline: salmon_falls is now kind:'trading_post' (native
    // fishery post at mile 1380, 89 mi past ft_hall). Previously this test
    // expected ft_boise (279 mi) because salmon_falls was kind:'landmark'
    // and invisible to nextSupplyDistance. Salmon_falls is now correctly
    // the nearest supply stop on this leg.
    const s = positionPast('ft_hall', 1850);
    const dist = nextSupplyDistance(s);
    const distToSalmonFalls = cumMilesAt('salmon_falls') - s.location.milesTraveled;
    expect(dist).toBeCloseTo(distToSalmonFalls, 0);
  });
});

describe('#1163 — nextSupplyDistance filters by abandonedBeforeYear', () => {
  it('after ft_kearny in 1850 — robidoux_post is next open supply (gated >1852 still open)', () => {
    // Robidoux Post (cum 518) is the next trading_post past ft_kearny
    // (319). It's gated abandonedAfterYear: 1852 → still OPEN in 1850.
    // This is a sanity check that the forward-search lands on the
    // right open post when nothing between is gated.
    const s = positionPast('ft_kearny', 1850);
    const dist = nextSupplyDistance(s);
    const distToRobidoux = cumMilesAt('robidoux_post') - s.location.milesTraveled;
    expect(dist).toBeCloseTo(distToRobidoux, 0);
  });

  it('after ft_kearny in 1853 — robidoux abandoned (>1852), skips to ft_laramie', () => {
    // Robidoux abandonedAfterYear: 1852 → gone by 1853. Next supply
    // should be ft_laramie (cum 650).
    const s = positionPast('ft_kearny', 1853);
    const dist = nextSupplyDistance(s);
    const distToLaramie = cumMilesAt('ft_laramie') - s.location.milesTraveled;
    expect(dist).toBeCloseTo(distToLaramie, 0);
  });

  it('at independence_mo in 1850 (Hollenberg + Rock Creek both gated <1857) — skips them to ft_kearny', () => {
    // Year 1850, fresh from Independence MO. Hollenberg + Rock Creek
    // were not yet built. First real post should be ft_kearny.
    const s = game(1850);
    const dist = nextSupplyDistance(s);
    expect(dist).toBeCloseTo(cumMilesAt('ft_kearny'), 0);
  });

  it('at independence_mo in 1858 — Hollenberg now open, returns shorter gap', () => {
    // Year 1858: Hollenberg + Rock Creek both built (gate 1857+).
    // First supply post should now be Hollenberg.
    const s = game(1858);
    const dist = nextSupplyDistance(s);
    expect(dist).toBeCloseTo(cumMilesAt('hollenberg_ranch'), 0);
  });
});

describe('#1163 — downstream consumers inherit the fix transparently', () => {
  it('effectiveGapMiles after ft_hall in 1857 picks up Boise being gone', () => {
    const s = positionPast('ft_hall', 1857);
    const gap = effectiveGapMiles(s);
    // Should NOT return the spurious-Boise gap (~280 mi). Should be
    // significantly larger (effectiveGap blends with milesToEnd in
    // the back half).
    expect(gap).toBeGreaterThan(400);
  });

  it('gapAwareWaterBagTarget escalates when next-post is abandoned', () => {
    // At ft_hall 1857, with Boise gone, the next real supply is much
    // farther — bot should target 4 water bags (the >=200 mi threshold).
    const s = positionPast('ft_hall', 1857);
    expect(gapAwareWaterBagTarget(s)).toBe(4);
  });
});
