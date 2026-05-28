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
    wagon: { model: 'prairie_schooner', condition: 100, canvas: 100, carryCapacity: 2500, impairment: null },
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

  it('children drink 50% of adult water (ceil) — #1031b rationing', () => {
    const s = baseState();
    // 3 adults × 1 = 3 baseline.
    // 2 children × 1 × 0.5 = 1.0 → ceil = 1.
    // → base 4 gal × tempWaterMult (#1074, ~×1.13 at April prairie ft_kearny) → ceil = 5.
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
  // #1074 — baseState (April prairie ft_kearny clear, dayTempF ≈ 74°F)
  // sits a touch above the 70°F baseline, so tempWaterMult ≈ 1.13. The
  // 3-adult draw goes from 3 → ceil(3 × 1.13) = 4, and 2 → ceil(2.27) = 3.
  it('is roughly 1 gallon per alive member (slight temp bump at default state)', () => {
    expect(waterConsumedToday(baseState())).toBe(4);
  });

  it('ignores dead members', () => {
    const s = baseState();
    s.party[0].dead = true;
    expect(waterConsumedToday(s)).toBe(3);
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
    expect(next.resources.water).toBe(6); // 10 - 4 (#1074 — slight April temp bump above 70°F baseline)
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

describe('#1074 — continuous day-temp water multiplier', () => {
  // Builds a baseState clone but pins month/weather/terrain/landmark so
  // dayTempF lands in a known range. waterIn defaults high (30) so the
  // ceil-on-consumption math doesn't clip.
  function tempState(opts: {
    landmarkId?: string;
    terrain?: GameState['location']['terrain'];
    month?: number;
    weather?: GameState['weather'];
    miles?: number;
    waterIn?: number;
  }): GameState {
    const s = baseState({
      resources: { water: opts.waterIn ?? 30, waterCap: 50 }
    });
    return {
      ...s,
      date: { ...s.date, month: opts.month ?? 7 },
      weather: opts.weather,
      location: {
        ...s.location,
        previousLandmarkId: null,
        nextLandmarkId: opts.landmarkId ?? 'ft_kearny',
        milesTraveled: opts.miles ?? 0,
        terrain: opts.terrain ?? 'prairie'
      }
    };
  }

  it('moderate day-temp (overcast forest spring) → near-baseline water draw', () => {
    const cool = tempState({ terrain: 'forest', month: 5, weather: 'overcast' });
    const draw = cool.resources.water - applyDailyConsumption(cool).resources.water;
    expect(draw).toBeGreaterThan(0);
    expect(draw).toBeLessThanOrEqual(6);
  });

  it('hot August desert + heat weather → ≥1.5× a cool overcast forest spring draw', () => {
    // Cool baseline (forest May overcast, miles 0): dayTempF ≈ 78°F → tempMult ≈ 1.27.
    // Hot reference (desert August heat at miles 1500): dayTempF ≈ 107°F → tempMult ≈ 2.24.
    const moderate = tempState({ terrain: 'forest', month: 5, weather: 'overcast' });
    const hot = tempState({ terrain: 'desert', month: 8, weather: 'heat', miles: 1500 });
    const modDraw = moderate.resources.water - applyDailyConsumption(moderate).resources.water;
    const hotDraw = hot.resources.water - applyDailyConsumption(hot).resources.water;
    expect(hotDraw).toBeGreaterThan(modDraw);
    expect(hotDraw / Math.max(1, modDraw)).toBeGreaterThan(1.5);
  });

  it('extreme July desert + heat weather → >2× a cool spring baseline (approaching the ×3 cap)', () => {
    // Baseline: April prairie overcast → dayTempF ~63°F → mult clamped at 1.0.
    // Extreme: July desert heat at miles 1500 → mid ≈ 70−12.5−4+15+10 = 78.5;
    //   day = 78.5 + 25 = 103.5°F → mult = (103.5−70)/30 + 1 = 2.12.
    const baseline = tempState({ terrain: 'prairie', month: 4, weather: 'overcast' });
    const extreme = tempState({ terrain: 'desert', month: 7, weather: 'heat', miles: 1500 });
    const baseDraw = baseline.resources.water - applyDailyConsumption(baseline).resources.water;
    const extDraw = extreme.resources.water - applyDailyConsumption(extreme).resources.water;
    expect(extDraw / Math.max(1, baseDraw)).toBeGreaterThan(2);
  });

  it('floor at 1× — cool overcast forest spring never SAVES water vs the 70°F baseline', () => {
    // The Math.max(1, ...) clamp means low dayTempF doesn't grant a bonus
    // discount. Only the weatherWaterMult overcast/rain trim (×0.9) does.
    const cool = tempState({ terrain: 'forest', month: 4, weather: 'overcast' });
    const draw = cool.resources.water - applyDailyConsumption(cool).resources.water;
    // 3 adults × 1 gal × 0.9 overcast × 1.0 temp floor = 2.7 → ceil = 3.
    expect(draw).toBe(3);
  });
});
