import { describe, it, expect } from 'vitest';
import { postBuysForCash } from '../src/lib/game/content/landmarks';
import type { Landmark } from '../src/lib/game/content/landmarks';

const base = (over: Partial<Landmark>): Landmark =>
  ({ id: 'x', name: 'X', milesFromPrevious: 0, terrain: 'prairie', kind: 'trading_post', ...over }) as Landmark;

describe('postBuysForCash', () => {
  it('false by default (no fields)', () => {
    expect(postBuysForCash(base({}), 1850)).toBe(false);
  });
  it('true when buysForCash set, any year', () => {
    expect(postBuysForCash(base({ buysForCash: true }), 1841)).toBe(true);
  });
  it('era flip: false before the from-year, true on/after', () => {
    const p = base({ buysForCashFromYear: 1849 });
    expect(postBuysForCash(p, 1848)).toBe(false);
    expect(postBuysForCash(p, 1849)).toBe(true);
    expect(postBuysForCash(p, 1855)).toBe(true);
  });
});
