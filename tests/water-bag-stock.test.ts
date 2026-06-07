import { describe, it, expect } from 'vitest';
import { getLandmark } from '../src/lib/game/content/landmarks';
import { postBaselineQty } from '../src/lib/game/systems/post-stock';

describe('desert-gateway water_bag supply', () => {
  for (const id of ['ft_hall', 'ft_boise']) {
    it(`${id} stocks water_bag with baseline >= 4 (a 4-adult party's desert target)`, () => {
      const lm = getLandmark(id);
      expect(lm.stock ?? []).toContain('water_bag');
      expect(postBaselineQty(lm, 'water_bag')).toBeGreaterThanOrEqual(4);
    });
  }
});
