import { describe, it, expect } from 'vitest';
import {
  foodConsumedToday,
  waterConsumedToday,
  applyDailyConsumption
} from '../src/lib/game/systems/consumption';
import type { GameState } from '../src/lib/game/types';

function baseState(overrides: Partial<GameState> = {}): GameState {
  return {
    seed: 't',
    day: 1,
    date: { year: 1848, month: 4, day: 1 },
    location: {
      trailPosition: 0,
      nextLandmarkId: 'ft_kearny',
      previousLandmarkId: null,
      milesTraveled: 0,
      terrain: 'prairie'
    },
    party: [
      { id: 'a', name: 'Ezra', profession: 'carpenter', sex: 'male', kind: 'adult', isLeader: true, age: 30, health: 100, conditions: [], dead: false },
      { id: 'b', name: 'Mary', profession: 'doctor', sex: 'female', kind: 'adult', isLeader: false, age: 28, health: 100, conditions: [], dead: false },
      { id: 'c', name: 'Tom', profession: 'hunter', sex: 'male', kind: 'adult', isLeader: false, age: 22, health: 100, conditions: [], dead: false }
    ],
    wagon: { model: 'prairie_schooner', condition: 100, canvas: 100, carryCapacity: 2500 },
    oxen: [],
    inventory: { flour: 300, bacon: 100, beans: 100 },
    cash: 300,
    resources: { water: 10, waterCap: 20 },
    morale: 60,
    pace: 'moderate',
    rations: 'normal',
    eventLog: [],
    flags: {},
    completed: false,
    outcome: 'in-progress',
    ...overrides
  };
}

describe('foodConsumedToday', () => {
  it('is 2 lb per alive member on normal rations', () => {
    expect(foodConsumedToday(baseState())).toBe(6);
  });

  it('is 1 lb per alive member on meager rations', () => {
    expect(foodConsumedToday(baseState({ rations: 'meager' }))).toBe(3);
  });

  it('is 3 lb per alive member on filling rations', () => {
    expect(foodConsumedToday(baseState({ rations: 'filling' }))).toBe(9);
  });

  it('ignores dead members', () => {
    const s = baseState();
    s.party[2].dead = true;
    expect(foodConsumedToday(s)).toBe(4);
  });

  it('returns 0 when whole party is dead', () => {
    const s = baseState();
    for (const m of s.party) m.dead = true;
    expect(foodConsumedToday(s)).toBe(0);
  });

  it('applies Farmer -5% food reduction (floored)', () => {
    const s = baseState();
    // 3 alive × 2 lb = 6 base; 6 × 0.95 = 5.7 → floor 5
    s.party[0].profession = 'farmer';
    expect(foodConsumedToday(s)).toBe(5);
  });

  it('Farmer reduction does not apply when the farmer is dead', () => {
    const s = baseState();
    s.party[0].profession = 'farmer';
    s.party[0].dead = true;
    // 2 alive × 2 = 4 base; no Farmer bonus
    expect(foodConsumedToday(s)).toBe(4);
  });

  it('children eat 60% of an adult ration (floored)', () => {
    const s = baseState();
    // 3 adults × 2 = 6 baseline.
    // Add a child who at normal rations contributes floor(1 × 2 × 0.6) = 1.
    s.party.push({
      id: 'k', name: 'Tommy', sex: 'male', kind: 'child', isLeader: false,
      age: 8, health: 100, conditions: [], dead: false
    });
    expect(foodConsumedToday(s)).toBe(7);
  });

  it('children drink 70% of adult water (ceil)', () => {
    const s = baseState();
    // 3 adults × 1 = 3 baseline.
    // 2 children × 1 × 0.7 = 1.4 → ceil = 2.
    s.party.push({
      id: 'k1', name: 'A', sex: 'male', kind: 'child', isLeader: false,
      age: 8, health: 100, conditions: [], dead: false
    });
    s.party.push({
      id: 'k2', name: 'B', sex: 'female', kind: 'child', isLeader: false,
      age: 6, health: 100, conditions: [], dead: false
    });
    expect(waterConsumedToday(s)).toBe(5);
  });
});

describe('waterConsumedToday', () => {
  it('is 1 gallon per alive member', () => {
    expect(waterConsumedToday(baseState())).toBe(3);
  });

  it('ignores dead members', () => {
    const s = baseState();
    s.party[0].dead = true;
    expect(waterConsumedToday(s)).toBe(2);
  });
});

describe('applyDailyConsumption', () => {
  it('decrements food from inventory, drawing down staples in order', () => {
    const s = baseState();
    const next = applyDailyConsumption(s);
    // 6 lb should come from flour (plenty), leaving 294
    expect(next.inventory.flour).toBe(294);
    expect(next.inventory.bacon).toBe(100);
    expect(next.inventory.beans).toBe(100);
  });

  it('draws across multiple food types if the first is depleted', () => {
    const s = baseState({ inventory: { flour: 4, bacon: 100, beans: 100 } });
    const next = applyDailyConsumption(s); // needs 6
    expect(next.inventory.flour).toBe(0);
    expect(next.inventory.bacon).toBe(100);
    expect(next.inventory.beans).toBe(98); // 2 lb taken from beans (beans drawn before bacon per FOOD_DRAW_ORDER)
  });

  it('decrements water from resources', () => {
    const s = baseState();
    const next = applyDailyConsumption(s);
    expect(next.resources.water).toBe(7); // 10 - 3
  });

  it('clamps water at 0 when over-consumed', () => {
    const s = baseState({ resources: { water: 1, waterCap: 20 } });
    const next = applyDailyConsumption(s);
    expect(next.resources.water).toBe(0);
  });

  it('returns a new object (does not mutate input)', () => {
    const s = baseState();
    const before = JSON.stringify(s);
    applyDailyConsumption(s);
    expect(JSON.stringify(s)).toBe(before);
  });
});
