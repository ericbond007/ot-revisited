import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/lib/game/engine';
import type { WaterRation } from '../src/lib/game/types';

describe('waterRation state', () => {
  it('defaults to normal on a new game', () => {
    const s = createInitialState({
      seed: 'wr',
      leader: { name: 'Ezra', profession: 'farmer' },
      companions: [{ name: 'Mary', profession: 'doctor' }],
      startDate: { year: 1849, month: 4, day: 15 }
    });
    expect(s.waterRation).toBe<WaterRation>('normal');
  });
});
