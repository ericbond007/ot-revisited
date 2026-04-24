import { describe, it, expect } from 'vitest';
import {
  computeWaterCap,
  recomputeWaterCap,
  WATER_SKIN_GAL
} from '../src/lib/game/systems/water-cap';
import { createInitialState } from '../src/lib/game/engine';
import { getWagon } from '../src/lib/game/content/wagons';
import type { GameState } from '../src/lib/game/types';

function game(wagonModel: 'light' | 'prairie_schooner' | 'heavy' = 'prairie_schooner'): GameState {
  return createInitialState({
    seed: 'water-cap-test',
    leader: { name: 'A', profession: 'farmer' },
    companions: [{ name: 'B', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 },
    wagonModel
  });
}

describe('water-cap', () => {
  it('computeWaterCap is wagon baseline + skins × WATER_SKIN_GAL', () => {
    const prairieBase = getWagon('prairie_schooner').baseWaterCapGal;
    expect(computeWaterCap('prairie_schooner', {})).toBe(prairieBase);
    expect(computeWaterCap('prairie_schooner', { water_skin: 3 })).toBe(
      prairieBase + 3 * WATER_SKIN_GAL
    );
  });

  it('wagon baselines follow the light < prairie < heavy order', () => {
    expect(getWagon('light').baseWaterCapGal).toBeLessThan(
      getWagon('prairie_schooner').baseWaterCapGal
    );
    expect(getWagon('prairie_schooner').baseWaterCapGal).toBeLessThan(
      getWagon('heavy').baseWaterCapGal
    );
  });

  it('createInitialState sets waterCap from wagon + starter-kit skins', () => {
    const s = game('prairie_schooner');
    const skins = s.inventory.water_skin ?? 0;
    const expected =
      getWagon('prairie_schooner').baseWaterCapGal + skins * WATER_SKIN_GAL;
    expect(s.resources.waterCap).toBe(expected);
    // Starts topped off.
    expect(s.resources.water).toBe(expected);
  });

  it('recomputeWaterCap updates cap and clamps water downward', () => {
    const s: GameState = {
      ...game('heavy'),
      inventory: { water_skin: 2 },
      resources: { water: 50, waterCap: 999 }
    };
    const out = recomputeWaterCap(s);
    const expected = getWagon('heavy').baseWaterCapGal + 2 * WATER_SKIN_GAL;
    expect(out.resources.waterCap).toBe(expected);
    expect(out.resources.water).toBe(expected); // clamped from 50
  });

  it('recomputeWaterCap is a no-op when cap is already correct', () => {
    const s = game('prairie_schooner');
    const out = recomputeWaterCap(s);
    expect(out).toBe(s);
  });
});
