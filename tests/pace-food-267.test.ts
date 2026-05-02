import { describe, it, expect } from 'vitest';
import { foodConsumedToday, PACE_FOOD_MULT } from '../src/lib/game/systems/consumption';
import { createInitialState } from '../src/lib/game/engine';
import type { GameState, Pace } from '../src/lib/game/types';

function newGameAt(pace: Pace, rations: GameState['rations'] = 'normal'): GameState {
  const s = createInitialState({
    seed: 'pace-food-test',
    leader: { name: 'Ezra', profession: 'banker' }, // banker, not farmer (no food mult)
    companions: [{ name: 'Mary', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
  return { ...s, pace, rations };
}

describe('#267 pace × food multiplier', () => {
  it('multipliers cover all four paces', () => {
    expect(PACE_FOOD_MULT.slow).toBeLessThan(1);
    expect(PACE_FOOD_MULT.moderate).toBe(1);
    expect(PACE_FOOD_MULT.fast).toBeGreaterThan(1);
    expect(PACE_FOOD_MULT.grueling).toBeGreaterThan(PACE_FOOD_MULT.fast);
  });

  it('grueling burns more food than slow at the same rations', () => {
    const slow = foodConsumedToday(newGameAt('slow'));
    const grueling = foodConsumedToday(newGameAt('grueling'));
    expect(grueling).toBeGreaterThan(slow);
  });

  it('moderate matches the legacy baseline (no pace multiplier in effect)', () => {
    // 2 adults at normal rations = 2 lb/adult × 2 adults = 4 lb baseline.
    const moderate = foodConsumedToday(newGameAt('moderate'));
    expect(moderate).toBe(4);
  });

  it('grueling at normal rations is 25% above baseline (rounded)', () => {
    const grueling = foodConsumedToday(newGameAt('grueling'));
    // 4 × 1.25 = 5
    expect(grueling).toBe(5);
  });

  it('slow at normal rations is ~15% below baseline (rounded)', () => {
    const slow = foodConsumedToday(newGameAt('slow'));
    // 4 × 0.85 = 3.4 → round to 3
    expect(slow).toBe(3);
  });

  it('pace mult applies on top of meager + filling rations', () => {
    const slowMeager = foodConsumedToday(newGameAt('slow', 'meager'));
    const gruelingMeager = foodConsumedToday(newGameAt('grueling', 'meager'));
    expect(gruelingMeager).toBeGreaterThan(slowMeager);

    const slowFilling = foodConsumedToday(newGameAt('slow', 'filling'));
    const gruelingFilling = foodConsumedToday(newGameAt('grueling', 'filling'));
    expect(gruelingFilling).toBeGreaterThan(slowFilling);
  });
});
