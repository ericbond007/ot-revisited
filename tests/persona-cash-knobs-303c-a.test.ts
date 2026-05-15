// #303c slice A — Persona-tunable repair budget + food restock opts.
// Lifts hardcoded `condition < 70 && cash >= 20 → min(40,...)` repair
// rule and `daysFloor=30 / daysCap=90` food restock defaults to the
// Persona surface so each persona (and future #287 named profiles)
// can express its own cash strategy.

import { describe, it, expect } from 'vitest';
import { cautiousPersona, balancedPersona, aggressivePersona, chaosPersona } from '../src/lib/game/ai';
import { createInitialState } from '../src/lib/game/engine';
import { getLandmark } from '../src/lib/game/content/landmarks';
import type { GameState } from '../src/lib/game/types';

function game(over: Partial<GameState> = {}): GameState {
  const s = createInitialState({
    seed: 'p',
    leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'doctor' }],
    startDate: { year: 1849, month: 6, day: 15 }
  });
  // Position at Fort Laramie (cum mi 702) — next supply is Caspar at
  // 810, only a 108-mi gap. Below the 150/200 bigGapMiles triggers
  // for #934 ox-swap and #935 repair, so these tests isolate the
  // persona's BASE thresholds (not the gap-aware boost).
  return {
    ...s,
    location: { ...s.location, milesTraveled: 702 },
    cash: 200,
    ...over
  };
}

describe('#303c — Persona.pickRepairBudget', () => {
  const laramie = getLandmark('ft_laramie'); // has blacksmith
  const robidoux = getLandmark('robidoux_post'); // also has blacksmith
  const kearny = getLandmark('ft_kearny'); // has blacksmith
  const chimney = getLandmark('chimney_rock'); // landmark, no services

  it('all personas return 0 at posts without blacksmith', () => {
    const s = game({ wagon: { ...game().wagon, condition: 50 } });
    expect(cautiousPersona.pickRepairBudget(s, chimney)).toBe(0);
    expect(balancedPersona.pickRepairBudget(s, chimney)).toBe(0);
    expect(aggressivePersona.pickRepairBudget(s, chimney)).toBe(0);
  });

  it('cautious threshold = condition < 75', () => {
    const above = game({ wagon: { ...game().wagon, condition: 80 } });
    const below = game({ wagon: { ...game().wagon, condition: 70 } });
    expect(cautiousPersona.pickRepairBudget(above, laramie)).toBe(0);
    expect(cautiousPersona.pickRepairBudget(below, laramie)).toBeGreaterThan(0);
  });

  it('balanced threshold = condition < 60', () => {
    const above = game({ wagon: { ...game().wagon, condition: 65 } });
    const below = game({ wagon: { ...game().wagon, condition: 55 } });
    expect(balancedPersona.pickRepairBudget(above, laramie)).toBe(0);
    expect(balancedPersona.pickRepairBudget(below, laramie)).toBeGreaterThan(0);
  });

  it('aggressive threshold = condition < 40 (only when failing)', () => {
    const above = game({ wagon: { ...game().wagon, condition: 50 } });
    const below = game({ wagon: { ...game().wagon, condition: 35 } });
    expect(aggressivePersona.pickRepairBudget(above, laramie)).toBe(0);
    expect(aggressivePersona.pickRepairBudget(below, laramie)).toBeGreaterThan(0);
  });

  it('cautious caps at $40', () => {
    const s = game({ cash: 100, wagon: { ...game().wagon, condition: 0 } });
    expect(cautiousPersona.pickRepairBudget(s, laramie)).toBe(40);
  });

  it('balanced caps at $30 (was 40)', () => {
    const s = game({ cash: 100, wagon: { ...game().wagon, condition: 0 } });
    expect(balancedPersona.pickRepairBudget(s, laramie)).toBe(30);
  });

  it('aggressive caps at $20', () => {
    const s = game({ cash: 100, wagon: { ...game().wagon, condition: 0 } });
    expect(aggressivePersona.pickRepairBudget(s, laramie)).toBe(20);
  });

  it('cautious requires cash >= 20', () => {
    const s = game({ cash: 15, wagon: { ...game().wagon, condition: 50 } });
    expect(cautiousPersona.pickRepairBudget(s, laramie)).toBe(0);
  });

  it('balanced requires cash >= 15', () => {
    const s = game({ cash: 14, wagon: { ...game().wagon, condition: 50 } });
    expect(balancedPersona.pickRepairBudget(s, laramie)).toBe(0);
    const ok = game({ cash: 16, wagon: { ...game().wagon, condition: 50 } });
    expect(balancedPersona.pickRepairBudget(ok, laramie)).toBeGreaterThan(0);
  });

  it('aggressive requires cash >= 10', () => {
    const s = game({ cash: 8, wagon: { ...game().wagon, condition: 30 } });
    expect(aggressivePersona.pickRepairBudget(s, laramie)).toBe(0);
  });

  it('budget never exceeds 100 - condition (no over-repair)', () => {
    const s = game({ cash: 500, wagon: { ...game().wagon, condition: 90 } });
    // Above cautious threshold of 75 → 0
    expect(cautiousPersona.pickRepairBudget(s, laramie)).toBe(0);
    const s2 = game({ cash: 500, wagon: { ...game().wagon, condition: 70 } });
    expect(cautiousPersona.pickRepairBudget(s2, laramie)).toBeLessThanOrEqual(30);
  });

  it('budget never exceeds cash on hand', () => {
    const s = game({ cash: 25, wagon: { ...game().wagon, condition: 0 } });
    expect(cautiousPersona.pickRepairBudget(s, laramie)).toBeLessThanOrEqual(25);
  });

  it('all blacksmith-bearing posts trigger the threshold (Laramie / Robidoux / Kearny)', () => {
    const s = game({ wagon: { ...game().wagon, condition: 50 } });
    expect(cautiousPersona.pickRepairBudget(s, laramie)).toBeGreaterThan(0);
    expect(cautiousPersona.pickRepairBudget(s, robidoux)).toBeGreaterThan(0);
    expect(cautiousPersona.pickRepairBudget(s, kearny)).toBeGreaterThan(0);
  });

  // #935 / #1040 — at Fort Kearny (mi 319) the leg to Robidoux is now
  // the historically-correct 199 mi (was an inflated 317). 199 ≥ 150
  // so cautious/balanced gap-boost still fires (cond 80/70 → repair).
  // Aggressive's gap threshold is 200 mi; 199 < 200 so it does NOT
  // boost — aggressive only repairs when genuinely failing (<40). This
  // is correct post-mileage-pass behavior, not a regression.
  it('#935 — at Fort Kearny (mi 319), cautious/balanced gap-boost repair; aggressive does not', () => {
    const atKearny = (cond: number) => game({
      location: { ...game().location, milesTraveled: 319 },
      wagon: { ...game().wagon, condition: cond }
    });
    expect(cautiousPersona.pickRepairBudget(atKearny(80), kearny)).toBeGreaterThan(0);
    expect(balancedPersona.pickRepairBudget(atKearny(70), kearny)).toBeGreaterThan(0);
    // 199 < aggressive bigGapMiles 200 → no boost; cond 50 ≥ base 40 → skip.
    expect(aggressivePersona.pickRepairBudget(atKearny(50), kearny)).toBe(0);
    // But a genuinely failing wagon still triggers aggressive's base.
    expect(aggressivePersona.pickRepairBudget(atKearny(35), kearny)).toBeGreaterThan(0);
  });

  it('#935 — at a small-gap post (Laramie, 108 mi to Caspar), gap-aware boost does NOT fire', () => {
    // Laramie→Caspar is 108 mi, below all three personas' bigGapMiles.
    // game()'s default position IS Laramie, so condition values that
    // sit ABOVE base trigger should still skip.
    expect(cautiousPersona.pickRepairBudget(game({ wagon: { ...game().wagon, condition: 80 } }), laramie)).toBe(0);
    expect(balancedPersona.pickRepairBudget(game({ wagon: { ...game().wagon, condition: 65 } }), laramie)).toBe(0);
    expect(aggressivePersona.pickRepairBudget(game({ wagon: { ...game().wagon, condition: 50 } }), laramie)).toBe(0);
  });
});

describe('#303c — Persona.pickFoodRestockOpts', () => {
  // #932 — values are now gap-aware: floor scales with miles-to-next
  // supply post at the persona's expected pace × safety factor.
  // #1040 historical mileage pass: first supply post (Hollenberg) is
  // now mi 180 (was 215), so the early gap shrank — gap-aware floors
  // fall back to each persona's BASE since 180mi/pace doesn't exceed
  // the base floor. Cautious base 30, balanced 25, aggressive 15.
  //
  // #963 — cap further scaled by `trailProgressCapMult`. At
  // Independence (>1500 mi remaining) the cap is multiplied by 0.65
  // so early-trail bots don't blow cash on 90-day buys when many
  // resupply posts lie ahead. Floor is unchanged; the floor=cap
  // clamp prevents the cap dropping below the floor.
  // (We override `game()`'s default Laramie position back to mi 0 here
  // because these tests explicitly check the Independence numbers.)
  const indep = () => game({ location: { ...game().location, milesTraveled: 0 } });

  // #963 — trail-progress cap mult is 1.0× early/mid (no change),
  // 1.3× when miles remaining < 700 (late posts get an extra buffer).
  // Independence is early-trail so values match the pre-#963 baseline.
  it('cautious: base floor (30 at Independence post-#1040) + saleratus overstock per #909', () => {
    expect(cautiousPersona.pickFoodRestockOpts(indep())).toEqual({
      daysFloor: 30,
      daysCap: 90,
      saleratusOverstock: true
    });
  });

  it('balanced: base floor (25 at Independence post-#1040), no saleratus overstock', () => {
    expect(balancedPersona.pickFoodRestockOpts(indep())).toEqual({ daysFloor: 25, daysCap: 60 });
  });

  it('aggressive: base floor (15 at Independence post-#1040), no saleratus overstock', () => {
    expect(aggressivePersona.pickFoodRestockOpts(indep())).toEqual({ daysFloor: 15, daysCap: 45 });
  });

  // #932 / #1040 — Fort Kearny (mi 319, canonical). Next post is
  // Robidoux at mi 518, a 199-mi leg with no resupply (the old 317
  // figure was the pre-#1040 inflated-mileage artifact; real
  // Kearny→Robidoux is ~200 mi). Gap-aware floors still hold at/above
  // each persona's base for this leg.
  it('#932 — at Fort Kearny (mi 319), personas hold gap-aware floors for the 199-mi Robidoux leg', () => {
    const atKearny = game({ location: { ...game().location, milesTraveled: 319 } });
    const c = cautiousPersona.pickFoodRestockOpts(atKearny);
    const b = balancedPersona.pickFoodRestockOpts(atKearny);
    const a = aggressivePersona.pickFoodRestockOpts(atKearny);
    // cautious: 199/10 × 1.5 = 30; balanced base 25; aggressive 199/12 = 17.
    expect(c.daysFloor).toBeGreaterThanOrEqual(30);
    expect(b.daysFloor).toBeGreaterThanOrEqual(25);
    expect(a.daysFloor).toBeGreaterThanOrEqual(16);
  });

  // #932 — at the trail end (past Oregon City), the gap helper returns 0,
  // so floor/cap should fall back to each persona's base.
  // #963 — late-trail (miles remaining < 700) multiplies cap by 1.3
  // to give bots an extra "last shot" buffer for the back half.
  it('#932 — past the last post, base floor + #963 1.3× late-trail cap', () => {
    const past = game({ location: { ...game().location, milesTraveled: 2300 } });
    expect(cautiousPersona.pickFoodRestockOpts(past)).toEqual({
      daysFloor: 30, daysCap: 117, saleratusOverstock: true
    });
    expect(balancedPersona.pickFoodRestockOpts(past)).toEqual({ daysFloor: 25, daysCap: 78 });
    expect(aggressivePersona.pickFoodRestockOpts(past)).toEqual({ daysFloor: 15, daysCap: 59 });
  });

  it('chaos: rotates through three sizes deterministically by day', () => {
    const day1 = chaosPersona.pickFoodRestockOpts(game({ day: 3 }));
    const day2 = chaosPersona.pickFoodRestockOpts(game({ day: 4 }));
    const day3 = chaosPersona.pickFoodRestockOpts(game({ day: 5 }));
    // Three different swings should map to three different opts.
    expect(day1).not.toEqual(day2);
    expect(day2).not.toEqual(day3);
  });
});

describe('#303c — composeShoppingList threads food opts', () => {
  it('balanced 60-day cap produces smaller flour buy than cautious 90-day cap', async () => {
    const { composeShoppingList } = await import('../src/lib/game/ai/shopping');
    const wagon = {
      ...game(),
      inventory: { flour: 0, bacon: 0 }
    };
    const stock = new Set(['flour', 'bacon']);
    const cautiousBuys = composeShoppingList(
      { wagon, stock },
      { food: cautiousPersona.pickFoodRestockOpts(wagon) }
    );
    const balancedBuys = composeShoppingList(
      { wagon, stock },
      { food: balancedPersona.pickFoodRestockOpts(wagon) }
    );
    const cautiousFlour = cautiousBuys.find((b) => b.item === 'flour')?.qty ?? 0;
    const balancedFlour = balancedBuys.find((b) => b.item === 'flour')?.qty ?? 0;
    expect(balancedFlour).toBeLessThan(cautiousFlour);
    expect(balancedFlour).toBeGreaterThan(0);
  });
});
