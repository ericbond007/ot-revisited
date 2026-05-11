// #906 — applyNpcPostRestock food block now gates on
// persona.shouldTradeAtPost. aggressive returns false outright →
// skips every post visit. balanced/cautious gate on cash, food on
// hand, and post-stocks-missing predicates.

import { describe, it, expect } from 'vitest';
import { applyNpcPostRestock, joinTrain } from '../src/lib/game/systems/wagon-train';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState, NpcWagonState } from '../src/lib/game/types';
import type { PersonaId } from '../src/lib/game/ai/types';

function game(): GameState {
  return createInitialState({
    seed: 'r906',
    leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'doctor' }],
    startDate: { year: 1849, month: 4, day: 15 }
  });
}

function arriveAt(s: GameState, landmarkId: string): GameState {
  return { ...s, location: { ...s.location, atLandmarkId: landmarkId } };
}

function setCompanion0(s: GameState, patch: Partial<NpcWagonState>): GameState {
  return {
    ...s,
    wagonTrain: {
      ...s.wagonTrain!,
      companions: s.wagonTrain!.companions.map((c, i) => (i === 0 ? { ...c, ...patch } : c))
    }
  };
}

/** Wagon with cleared food (flour=bacon=beans=salt_pork=0) so the
 *  food-on-hand gate fires for cautious / balanced. Returns post-
 *  restock companion 0. */
function tradeOutcome(persona: PersonaId, cash = 1000): NpcWagonState {
  let s = joinTrain(game(), makeRng('r')).state;
  s = arriveAt(s, 'ft_kearny');
  const cleared = {
    ...s.wagonTrain!.companions[0].inventory,
    flour: 0, bacon: 0, beans: 0, salt_pork: 0,
    jerky: 0, pemmican: 0, hardtack: 0, dried_fruit: 0, cornmeal: 0
  };
  s = setCompanion0(s, { personaId: persona, inventory: cleared, cash });
  return applyNpcPostRestock(s).wagonTrain!.companions[0];
}

describe('#906 — applyNpcPostRestock food block gates on shouldTradeAtPost', () => {
  it('aggressive trades when food is critically low (#916 recalibration)', () => {
    // #916 — aggressive was () => false outright. Recalibrated to
    // trade on real need: cash >= 10 AND (foodOnHand < 40 OR missing
    // gear). tradeOutcome clears all food, so this fires.
    const after = tradeOutcome('aggressive');
    expect(after.inventory.flour ?? 0).toBeGreaterThan(0);
  });

  it('aggressive SKIPS when food is plentiful (#916 — only trades on real need)', () => {
    // Same setup but DON'T clear food — foodOnHand stays well above
    // aggressive's 40-lb threshold. Aggressive should skip.
    let s = joinTrain(game(), makeRng('r')).state;
    s = arriveAt(s, 'ft_kearny');
    s = setCompanion0(s, { personaId: 'aggressive', cash: 1000 });
    const before = s.wagonTrain!.companions[0];
    const result = applyNpcPostRestock(s);
    const after = result.wagonTrain!.companions[0];
    // Food unchanged — aggressive declined the food restock.
    expect(after.inventory.flour ?? 0).toBe(before.inventory.flour ?? 0);
  });

  it('balanced trades when food is low (foodOnHand < 60)', () => {
    const after = tradeOutcome('balanced');
    expect(after.inventory.flour ?? 0).toBeGreaterThan(0);
  });

  it('cautious trades when food is low (foodOnHand < 100)', () => {
    const after = tradeOutcome('cautious');
    expect(after.inventory.flour ?? 0).toBeGreaterThan(0);
  });

  it('hoarder skips food restock when cash < $20 (inherits balanced cash floor)', () => {
    // #906 — shouldTradeAtPost gates the FOOD block. Non-food
    // shopping (#911 medicine / warmth / etc.) runs independently
    // with its own cash gating. So we assert no flour bought, but
    // don't pin total cash since non-food slices may have spent.
    const after = tradeOutcome('hoarder', 15);
    expect(after.inventory.flour ?? 0).toBe(0);
    expect(after.cash).toBeLessThanOrEqual(15);
  });

  it('aggressive STILL allows the smithy block to fire (separate decision)', () => {
    let s = joinTrain(game(), makeRng('r')).state;
    s = arriveAt(s, 'ft_laramie'); // has blacksmith
    s = setCompanion0(s, {
      personaId: 'aggressive',
      wagon: { ...s.wagonTrain!.companions[0].wagon, condition: 20 },
      cash: 300
    });
    const before = s.wagonTrain!.companions[0];
    const after = applyNpcPostRestock(s).wagonTrain!.companions[0];
    // Smithy still fired (aggressive's pickRepairBudget gates
    // independently — caps wagon condition at +40).
    expect(after.wagon.condition).toBeGreaterThan(before.wagon.condition);
  });

  // #933 — at posts before a long gap, the food trigger inflates so
  // the wagon trades even with food above its v10-floor. Pre-#933,
  // balanced gated on foodOnHand < 60; at Fort Kearny with 150 lb of
  // flour (foodOnHand=150) balanced would have skipped entirely.
  // Post-#933 the trigger scales with the 317-mi Kearny→Robidoux gap
  // (~170 lb for a 3-soul party at pace=10, safety=1.2), so the
  // wagon enters the post — and pickFoodRestock's per-item-floors
  // (also gap-aware via #932) catch the empty bacon / beans / sugar.
  it('#933 — at Fort Kearny (317-mi gap ahead), balanced enters trade despite flour above v10 floor', () => {
    let s = joinTrain(game(), makeRng('r')).state;
    s = { ...s, location: { ...s.location, milesTraveled: 335, atLandmarkId: 'ft_kearny' } };
    s = setCompanion0(s, {
      personaId: 'balanced',
      inventory: { ...s.wagonTrain!.companions[0].inventory, flour: 150, bacon: 0, beans: 0, salt_pork: 0 },
      cash: 1000
    });
    const before = s.wagonTrain!.companions[0];
    const after = applyNpcPostRestock(s).wagonTrain!.companions[0];
    // Pre-#933: skipped (foodOnHand 150 > 60). Post-#933: trades and
    // refills the staples that pickFoodRestock's per-item-floors flag.
    const bacon = (after.inventory.bacon ?? 0) - (before.inventory.bacon ?? 0);
    const beans = (after.inventory.beans ?? 0) - (before.inventory.beans ?? 0);
    expect(bacon + beans).toBeGreaterThan(0);
    expect(after.cash).toBeLessThan(before.cash);
  });
});
