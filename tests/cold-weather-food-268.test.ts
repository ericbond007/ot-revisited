import { describe, it, expect } from 'vitest';
import { foodConsumedToday, WEATHER_FOOD_MULT } from '../src/lib/game/systems/consumption';
import { createInitialState } from '../src/lib/game/engine';
import type { GameState, Weather } from '../src/lib/game/types';

function newGame(weather: Weather, over: Partial<GameState> = {}): GameState {
  const s = createInitialState({
    seed: 'cold-food-268',
    leader: { name: 'Ezra', profession: 'banker' },
    companions: [{ name: 'Mary', profession: 'banker' }], // no farmer mult muddying math
    startDate: { year: 1849, month: 11, day: 1 }
  });
  return {
    ...s,
    weather,
    pace: 'moderate',
    rations: 'normal',
    ...over
  };
}

describe('#268 WEATHER_FOOD_MULT constant', () => {
  it('+20% on snow', () => {
    expect(WEATHER_FOOD_MULT.snow).toBeCloseTo(1.2, 5);
  });

  it('+20% on frost', () => {
    expect(WEATHER_FOOD_MULT.frost).toBeCloseTo(1.2, 5);
  });

  it('1.0 on clear', () => {
    expect(WEATHER_FOOD_MULT.clear).toBe(1.0);
  });

  it('1.0 on rain (wet, not cold)', () => {
    expect(WEATHER_FOOD_MULT.rain).toBe(1.0);
  });

  it('1.0 on heat', () => {
    expect(WEATHER_FOOD_MULT.heat).toBe(1.0);
  });

  it('1.0 on fog', () => {
    expect(WEATHER_FOOD_MULT.fog).toBe(1.0);
  });

  it('1.0 on storm', () => {
    expect(WEATHER_FOOD_MULT.storm).toBe(1.0);
  });

  it('1.0 on overcast', () => {
    expect(WEATHER_FOOD_MULT.overcast).toBe(1.0);
  });
});

describe('#268 foodConsumedToday — cold-weather bump', () => {
  it('snow days draw more food than clear days', () => {
    const clear = foodConsumedToday(newGame('clear'));
    const snow = foodConsumedToday(newGame('snow'));
    expect(snow).toBeGreaterThan(clear);
  });

  it('frost days draw more food than clear days', () => {
    const clear = foodConsumedToday(newGame('clear'));
    const frost = foodConsumedToday(newGame('frost'));
    expect(frost).toBeGreaterThan(clear);
  });

  it('snow draws ~20% more than clear for a 2-adult party at normal rations', () => {
    // 2 adults × 2 lb = 4 lb base, ×1.0 pace, ×1.2 snow = 4.8 → 5 lb.
    const clear = foodConsumedToday(newGame('clear'));
    const snow = foodConsumedToday(newGame('snow'));
    expect(clear).toBe(4);
    expect(snow).toBe(5);
  });

  it('storm/rain/fog are NOT bumped (wet, not cold)', () => {
    const clear = foodConsumedToday(newGame('clear'));
    expect(foodConsumedToday(newGame('storm'))).toBe(clear);
    expect(foodConsumedToday(newGame('rain'))).toBe(clear);
    expect(foodConsumedToday(newGame('fog'))).toBe(clear);
  });

  it('heat is NOT bumped (water cost handles heat, not food)', () => {
    expect(foodConsumedToday(newGame('heat'))).toBe(foodConsumedToday(newGame('clear')));
  });
});

describe('#268 weather × pace composition', () => {
  it('grueling pace + snow stacks: 1.25 × 1.20 = 1.50× clear-moderate', () => {
    const clearModerate = foodConsumedToday(newGame('clear', { pace: 'moderate' }));
    const gruelingSnow = foodConsumedToday(newGame('snow', { pace: 'grueling' }));
    expect(gruelingSnow / clearModerate).toBeGreaterThan(1.4);
    expect(gruelingSnow / clearModerate).toBeLessThan(1.6);
  });

  it('slow pace + frost: 0.85 × 1.20 = 1.02× clear-moderate (about even)', () => {
    const clearModerate = foodConsumedToday(newGame('clear', { pace: 'moderate' }));
    const slowFrost = foodConsumedToday(newGame('frost', { pace: 'slow' }));
    // 4 × 0.85 × 1.20 = 4.08 → 4 lb. Same as baseline 4 lb after rounding.
    expect(slowFrost).toBeGreaterThanOrEqual(clearModerate - 1);
    expect(slowFrost).toBeLessThanOrEqual(clearModerate + 1);
  });
});

describe('#268 farmer mult composes with weather', () => {
  it('farmer party still benefits even on snow days', () => {
    const noFarmer: GameState = newGame('snow');
    const withFarmer = createInitialState({
      seed: 'farmer-cold',
      leader: { name: 'Ezra', profession: 'farmer' },
      companions: [{ name: 'Mary', profession: 'banker' }],
      startDate: { year: 1849, month: 11, day: 1 }
    });
    const farmedSnow = foodConsumedToday({
      ...withFarmer,
      weather: 'snow',
      pace: 'moderate',
      rations: 'normal'
    });
    expect(farmedSnow).toBeLessThan(foodConsumedToday(noFarmer));
  });
});
