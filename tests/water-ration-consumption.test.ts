import { describe, it, expect } from 'vitest';
import { waterConsumedToday } from '../src/lib/game/systems/consumption';
import type { GameState } from '../src/lib/game/types';

function st(waterRation: string): GameState {
  return {
    waterRation,
    weather: 'clear',
    party: Array.from({ length: 4 }, (_, i) => ({ id: `a${i}`, kind: 'adult', dead: false, health: 100, conditions: [] })),
    location: {
      terrain: 'desert',
      // dayTempF reads these for elevation + latitude interpolation
      nextLandmarkId: 'independence_mo',
      previousLandmarkId: null,
      milesTraveled: 0
    },
    date: { year: 1849, month: 7, day: 10 }
  } as unknown as GameState;
}

describe('waterConsumedToday × ration tier', () => {
  it('normal draws full need, conserve ~half, drycamp ~quarter', () => {
    const n = waterConsumedToday(st('normal'));
    expect(waterConsumedToday(st('conserve'))).toBeLessThan(n);
    expect(waterConsumedToday(st('drycamp'))).toBeLessThan(waterConsumedToday(st('conserve')));
  });
});
