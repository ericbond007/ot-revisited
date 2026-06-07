import { describe, it, expect } from 'vitest';
import type { GameState, WaterRation } from '../src/lib/game/types';
import { setWaterRationOnState, isWaterRation } from '../src/routes/play/water-ration-action';

describe('water-ration action helper', () => {
  it('validates the tier', () => {
    expect(isWaterRation('drycamp')).toBe(true);
    expect(isWaterRation('nope')).toBe(false);
  });
  it('applies the tier to state', () => {
    const s = { waterRation: 'normal' } as unknown as GameState;
    expect(setWaterRationOnState(s, 'conserve' as WaterRation).waterRation).toBe('conserve');
  });
});
