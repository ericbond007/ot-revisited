import { describe, it, expect } from 'vitest';
import { settleTrade } from '../src/lib/game/systems/settle-trade';
import { trade } from '../src/lib/game/actions/trade';
import { applyBarter } from '../src/lib/game/systems/barter';
import { makeRng } from '../src/lib/game/rng';
import { createInitialState } from '../src/lib/game/engine';
import { restockPostIfDue } from '../src/lib/game/systems/post-stock';
import { getLandmark } from '../src/lib/game/content/landmarks';
import { PRICES } from '../src/lib/game/content/prices';
import { ITEMS } from '../src/lib/game/content/items';
import { BARTER_POST_PREFERENCE_BONUS } from '../src/lib/game/systems/barter';
import type { GameState } from '../src/lib/game/types';

function atPost(id: string, inv: Record<string, number>, cash = 200): GameState {
  const s0 = createInitialState({
    seed: 'equiv', leader: { name: 'A', profession: 'farmer', sex: 'male' },
    companions: [{ name: 'B', profession: 'farmer', sex: 'female' }],
    startDate: { year: 1850, month: 6, day: 15 }, includeStarterKit: false
  });
  let s: GameState = { ...s0, cash, inventory: inv, location: { ...s0.location, atLandmarkId: id } };
  s = restockPostIfDue(s, getLandmark(id));
  return s;
}

describe('settleTrade equivalence with primitives', () => {
  it('cash mode (buy-only) == trade()', () => {
    const s = atPost('ft_kearny', {});
    const a = settleTrade(s, { mode: 'cash', get: { flour: 12 }, give: {} }).state;
    const b = trade(s, { buys: [{ item: 'flour', qty: 12 }] });
    expect(a.cash).toBe(b.cash);
    expect(a.inventory.flour ?? 0).toBe(b.inventory.flour ?? 0);
  });
  it('cash mode (sell-only at cash post) == trade()', () => {
    const s = atPost('ft_kearny', { bacon: 6 });
    const a = settleTrade(s, { mode: 'cash', get: {}, give: { bacon: 6 } }).state;
    const b = trade(s, { sells: [{ item: 'bacon', qty: 6 }] });
    expect(a.cash).toBe(b.cash);
    expect(a.inventory.bacon ?? 0).toBe(b.inventory.bacon ?? 0);
  });
  // ft_hall: postMult=1.0, bacon sell=0.20, flour buy=0.20
  // give 10 bacon, get 10 flour: rate = (10*0.20)/(10*0.20) = 1.0 ∈ [0.5, 1.05] ✓
  // Both settleTrade and applyBarter will accept this rate.
  it('barter mode (cashOffer 0) == applyBarter()', () => {
    const s = atPost('ft_hall', { bacon: 10 });
    const a = settleTrade(s, { mode: 'barter', get: { flour: 10 }, give: { bacon: 10 } }).state;
    const b = applyBarter(s, { item: 'bacon', qty: 10 }, { item: 'flour', qty: 10 }, makeRng('x'));
    expect(a.inventory.flour ?? 0).toBe(b.inventory.flour ?? 0);
    expect(a.inventory.bacon ?? 0).toBe(b.inventory.bacon ?? 0);
    expect(a.cash).toBe(b.cash);
  });
});

describe('no money-loop: sell × preferred-premium < buy for every item', () => {
  it('preferred premium never beats the buy price', () => {
    const mult = 1 + BARTER_POST_PREFERENCE_BONUS;
    for (const [id, p] of Object.entries(PRICES)) {
      if (!ITEMS[id]) continue;
      expect(p.sell * mult, `${id}`).toBeLessThan(p.buy);
    }
  });
});

describe('settleTrade deliberately uses NET affordability (improves on trade())', () => {
  it('allows a combined buy+sell that trade() rejects on gross cost', () => {
    // cash $5; buy 40 flour ($8 gross) while selling 25 bacon ($5 credit) →
    // net owed $3 <= $5. trade() checks gross ($8 > $5) and throws; settleTrade
    // settles the basket as one net transaction and succeeds.
    const s = atPost('ft_kearny', { bacon: 25 }, 5);
    expect(() => trade(s, { buys: [{ item: 'flour', qty: 40 }], sells: [{ item: 'bacon', qty: 25 }] }))
      .toThrow(/not enough cash/i);
    const r = settleTrade(s, { mode: 'cash', get: { flour: 40 }, give: { bacon: 25 } });
    expect(r.state.inventory.flour).toBe(40);
    expect(r.state.inventory.bacon ?? 0).toBe(0);
    expect(r.netCash).toBeLessThanOrEqual(5);
    expect(r.state.cash).toBe(5 - r.netCash);
  });
});
