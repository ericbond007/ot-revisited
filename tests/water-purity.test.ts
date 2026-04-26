import { describe, it, expect } from 'vitest';
import {
  canBoilWater,
  waterborneDiseaseModifier
} from '../src/lib/game/systems/water-purity';
import { createInitialState } from '../src/lib/game/engine';
import type { GameState } from '../src/lib/game/types';

function newGame(overrides: Partial<GameState> = {}): GameState {
  const s = createInitialState({
    seed: 't',
    leader: { name: 'A', profession: 'farmer' },
    companions: [{ name: 'B', profession: 'hunter' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
  return { ...s, ...overrides };
}

describe('canBoilWater', () => {
  it('is false pre-1854 with no Doctor and no unlock flag', () => {
    const s = newGame();
    expect(canBoilWater(s)).toBe(false);
  });

  it('is true pre-1854 if a Doctor is in the party', () => {
    const s = newGame();
    s.party[1].profession = 'doctor';
    expect(canBoilWater(s)).toBe(true);
  });

  it('is false when the only Doctor is dead', () => {
    const s = newGame();
    s.party[1].profession = 'doctor';
    s.party[1].dead = true;
    expect(canBoilWater(s)).toBe(false);
  });

  it('is true post-1854 regardless of doctor', () => {
    const s = newGame({ date: { year: 1855, month: 4, day: 1 } });
    expect(canBoilWater(s)).toBe(true);
  });

  it('is true when the unlock flag is set (wise-traveler event)', () => {
    const s = newGame();
    s.flags.hasBoilingKnowledge = true;
    expect(canBoilWater(s)).toBe(true);
  });
});

describe('waterborneDiseaseModifier', () => {
  it('is 1.0 baseline (no reducer)', () => {
    const s = newGame();
    // BASE_KIT now ships coffee — null it out for the no-reducer path.
    s.inventory.coffee = 0;
    expect(waterborneDiseaseModifier(s)).toBeCloseTo(1.0);
  });

  it('drops 40% when coffee is in inventory', () => {
    const s = newGame();
    s.inventory.coffee = 20;
    expect(waterborneDiseaseModifier(s)).toBeCloseTo(0.6);
  });

  it('drops 40% when tea is in inventory', () => {
    const s = newGame();
    s.inventory.tea = 10;
    expect(waterborneDiseaseModifier(s)).toBeCloseTo(0.6);
  });

  it('only applies one coffee-OR-tea reduction, not both stacking', () => {
    const s = newGame();
    s.inventory.coffee = 10;
    s.inventory.tea = 10;
    expect(waterborneDiseaseModifier(s)).toBeCloseTo(0.6);
  });
});
