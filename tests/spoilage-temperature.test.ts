import { describe, it, expect } from 'vitest';
import {
  applySpoilage, applyHeatSpoilage, setSpoilClock,
  spoilageAgingFactor, SPOIL_REF_TEMP_F, BACON_HEAT_LB_PER_DAY
} from '../src/lib/game/systems/spoilage';
import { midTempF } from '../src/lib/game/systems/temperature';
import { createInitialState } from '../src/lib/game/engine';
import type { GameState } from '../src/lib/game/types';

function game(over: Partial<GameState> = {}): GameState {
  const s = createInitialState({
    seed: 'temp-spoil',
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [{ name: 'Mary', profession: 'doctor' }],
    startDate: { year: 1848, month: 7, day: 1 }
  });
  return { ...s, ...over };
}

// A reliably HOT state (July, low prairie, heat weather) and a reliably COLD
// one (December, snow). We assert the real midTempF ordering first, then the
// spoilage consequences — robust to exact elevation/latitude numbers.
const hot = (): GameState => game({ day: 0, date: { year: 1848, month: 7, day: 1 }, weather: 'heat', location: { ...game().location, terrain: 'prairie' } });
const cold = (): GameState => game({ day: 0, date: { year: 1848, month: 12, day: 1 }, weather: 'snow', location: { ...game().location, terrain: 'prairie' } });

describe('spoilageAgingFactor curve', () => {
  it('is 1.0 at the reference temperature', () => {
    expect(spoilageAgingFactor(SPOIL_REF_TEMP_F)).toBeCloseTo(1.0, 5);
  });
  it('roughly doubles per +15F and halves per -15F', () => {
    expect(spoilageAgingFactor(SPOIL_REF_TEMP_F + 15)).toBeCloseTo(2.0, 5);
    expect(spoilageAgingFactor(SPOIL_REF_TEMP_F - 15)).toBeCloseTo(0.5, 5);
  });
  it('clamps extremes', () => {
    expect(spoilageAgingFactor(-50)).toBe(0.1);
    expect(spoilageAgingFactor(200)).toBe(6);
  });
});

describe('temperature drives fresh-pile spoilage', () => {
  it('the same pile rots faster sustained-hot than sustained-cold', () => {
    expect(midTempF(hot())).toBeGreaterThan(midTempF(cold()));

    const spoilDays = (mk: () => GameState): number => {
      let s = setSpoilClock({ ...mk(), inventory: { ...mk().inventory, game_meat: 40 } }, 'game_meat');
      for (let d = 1; d <= 60; d++) {
        s = { ...s, day: d };
        s = applySpoilage(s);
        if ((s.inventory.game_meat ?? 0) === 0) return d;
      }
      return Infinity;
    };
    const hotDays = spoilDays(hot);
    const coldDays = spoilDays(cold);
    expect(hotDays).toBeLessThan(coldDays);
    expect(hotDays).toBeLessThanOrEqual(3);   // 3-day window collapses in heat
    expect(coldDays).toBeGreaterThan(3);       // cold preserves past the window
  });
});

describe('temperature drives cured-meat attrition', () => {
  it('hot day turns the bacon; cool day does not', () => {
    const hotLoss = applyHeatSpoilage({ ...hot(), wagon: { ...hot().wagon, hasBranBarrel: false }, inventory: { ...hot().inventory, bacon: 100 } });
    expect(hotLoss.inventory.bacon).toBeLessThan(100);

    const coolState = game({ date: { year: 1848, month: 5, day: 1 }, weather: 'clear', inventory: { ...game().inventory, bacon: 100 } });
    const coolLoss = applyHeatSpoilage(coolState);
    expect(coolLoss.inventory.bacon).toBe(100);
  });
});
