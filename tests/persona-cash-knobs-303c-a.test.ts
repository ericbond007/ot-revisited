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
  return { ...s, cash: 200, ...over };
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
});

describe('#303c — Persona.pickFoodRestockOpts', () => {
  it('cautious: 30 floor / 90 cap (preserves v10 default) + saleratus overstock per #909', () => {
    expect(cautiousPersona.pickFoodRestockOpts(game())).toEqual({
      daysFloor: 30,
      daysCap: 90,
      saleratusOverstock: true
    });
  });

  it('balanced: 25 floor / 60 cap (smaller restock leaves cash for medicine), no saleratus overstock', () => {
    expect(balancedPersona.pickFoodRestockOpts(game())).toEqual({ daysFloor: 25, daysCap: 60 });
  });

  it('aggressive: 15 floor / 45 cap (meager-ration sizing), no saleratus overstock', () => {
    expect(aggressivePersona.pickFoodRestockOpts(game())).toEqual({ daysFloor: 15, daysCap: 45 });
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
