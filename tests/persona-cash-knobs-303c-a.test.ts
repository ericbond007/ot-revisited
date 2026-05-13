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

  // #935 — at a big-gap post (Kearny, 317 mi to Robidoux), all three
  // personas accept higher wagon condition before triggering repair.
  // Pre-#935: balanced cond=70 → skip (>60). Post-#935: trigger 75
  // (60 + 15 boost) → cond=70 < 75 → repair. Same for cautious 80
  // (>75 → would skip) → boosted trigger 85 → repair. Aggressive
  // cond=50 above base 40 but below boosted 55 → repair.
  it('#935 — at Fort Kearny (317-mi gap ahead), all 3 personas repair at higher condition than base', () => {
    const atKearny = (cond: number) => game({
      location: { ...game().location, milesTraveled: 335 },
      wagon: { ...game().wagon, condition: cond }
    });
    expect(cautiousPersona.pickRepairBudget(atKearny(80), kearny)).toBeGreaterThan(0);
    expect(balancedPersona.pickRepairBudget(atKearny(70), kearny)).toBeGreaterThan(0);
    expect(aggressivePersona.pickRepairBudget(atKearny(50), kearny)).toBeGreaterThan(0);
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
  // supply post at the persona's expected pace × safety factor. At
  // Independence (mi 0) the next post is Hollenberg Ranch at mi 215.
  // Cautious: ceil(215/8 × 1.5) = 40 days; balanced: 26; aggressive: 18.
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
  it('cautious: gap-aware floor (40 at Independence) + saleratus overstock per #909', () => {
    expect(cautiousPersona.pickFoodRestockOpts(indep())).toEqual({
      daysFloor: 40,
      daysCap: 100,
      saleratusOverstock: true
    });
  });

  it('balanced: gap-aware floor (26 at Independence), no saleratus overstock', () => {
    expect(balancedPersona.pickFoodRestockOpts(indep())).toEqual({ daysFloor: 26, daysCap: 61 });
  });

  it('aggressive: gap-aware floor (18 at Independence), no saleratus overstock', () => {
    expect(aggressivePersona.pickFoodRestockOpts(indep())).toEqual({ daysFloor: 18, daysCap: 48 });
  });

  // #932 — exercise the big gap at Fort Kearny (mi 335). Next post
  // is Robidoux at mi 652, a 317-mile leg with no resupply. This is
  // exactly the failure mode #930's harness exposed.
  it('#932 — at Fort Kearny (mi 335), all 3 personas inflate for the 317-mi gap to Robidoux', () => {
    const atKearny = game({ location: { ...game().location, milesTraveled: 335 } });
    const c = cautiousPersona.pickFoodRestockOpts(atKearny);
    const b = balancedPersona.pickFoodRestockOpts(atKearny);
    const a = aggressivePersona.pickFoodRestockOpts(atKearny);
    // cautious: ceil(317/8 × 1.5) = 59; balanced: ceil(317/10 × 1.2) = 38;
    // aggressive: ceil(317/12 × 1.0) = 26.
    expect(c.daysFloor).toBeGreaterThanOrEqual(50);
    expect(b.daysFloor).toBeGreaterThanOrEqual(35);
    expect(a.daysFloor).toBeGreaterThanOrEqual(25);
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
