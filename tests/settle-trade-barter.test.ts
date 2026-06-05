import { describe, it, expect } from 'vitest';
import { settleTrade } from '../src/lib/game/systems/settle-trade';
import { createInitialState } from '../src/lib/game/engine';
import { restockPostIfDue } from '../src/lib/game/systems/post-stock';
import { getLandmark } from '../src/lib/game/content/landmarks';
import type { GameState } from '../src/lib/game/types';

function atPost(id: string, inv: Record<string, number>): GameState {
  const s0 = createInitialState({
    seed: 'barter-test',
    leader: { name: 'A', profession: 'farmer', sex: 'male' },
    companions: [{ name: 'B', profession: 'farmer', sex: 'female' }],
    startDate: { year: 1850, month: 6, day: 15 },
    includeStarterKit: false
  });
  let s: GameState = { ...s0, cash: 50, inventory: inv, location: { ...s0.location, atLandmarkId: id } };
  s = restockPostIfDue(s, getLandmark(id));
  return s;
}

describe('settleTrade — barter mode', () => {
  // ft_hall: priceMultiplier=1.0 (default), bacon sell=0.20, flour buy=0.20
  // give 10 bacon, get 10 flour: rate = (10*0.20)/(10*0.20) = 1.0 ∈ [0.5, 1.05] ✓
  it('goods that cover the get value swap with no cash moved', () => {
    const s = atPost('ft_hall', { bacon: 10 });
    const r = settleTrade(s, { mode: 'barter', get: { flour: 10 }, give: { bacon: 10 } });
    expect(r.state.inventory.flour).toBe(10);
    expect(r.state.inventory.bacon).toBe(0);
    expect(r.netCash).toBe(0);
    expect(r.rate).toBeGreaterThanOrEqual(0.5);
  });
  // give 1 bacon, get 50 flour: rate = (1*0.20)/(50*0.20) = 0.02 < 0.5 ✓ throws
  it('too-thin offer (rate < FLOOR, no cash) throws', () => {
    const s = atPost('ft_hall', { bacon: 1 });
    expect(() => settleTrade(s, { mode: 'barter', get: { flour: 50 }, give: { bacon: 1 } })).toThrow(/too thin/i);
  });
  // give 1 bacon, get 10 flour, cashOffer 5:
  // giveValue=0.20, giveTotal=5.20, getValue=2.0, rate=2.6 >= 0.5 ✓
  it('cash top-up lifts a thin offer over the floor', () => {
    const s = atPost('ft_hall', { bacon: 1 });
    const r = settleTrade(s, { mode: 'barter', get: { flour: 10 }, give: { bacon: 1 }, cashOffer: 5 });
    expect(r.state.inventory.flour).toBe(10);
    expect(r.netCash).toBe(5);
    expect(r.state.cash).toBe(s.cash - 5);
  });
  it('nothing-gained guard: empty get throws', () => {
    const s = atPost('ft_hall', { bacon: 5 });
    expect(() => settleTrade(s, { mode: 'barter', get: {}, give: { bacon: 5 } })).toThrow(/nothing gained/i);
  });
});

describe('settleTrade — barter edge cases', () => {
  // ft_hall: priceMultiplier=1.0, bacon sell=0.20, flour buy=0.20
  // Give 30 bacon (value = 30*0.20 = 6.00), get 5 flour (value = 5*0.20 = 1.00)
  // rate = 6.00 / 1.00 = 6.0 > 1.05 → overpaying; should NOT throw.
  it('overpaying (rate > 1.05) is allowed — barter is not symmetric', () => {
    const s = atPost('ft_hall', { bacon: 30 });
    const r = settleTrade(s, { mode: 'barter', get: { flour: 5 }, give: { bacon: 30 } });
    expect(r.rate).toBeGreaterThan(1.05);
    expect(r.state.inventory.flour).toBe(5);
    expect(r.state.inventory.bacon).toBe(0);
  });

  it('giving more than owned in barter throws insufficient', () => {
    // Only have 2 bacon, trying to give 10.
    const s = atPost('ft_hall', { bacon: 2 });
    expect(() =>
      settleTrade(s, { mode: 'barter', get: { flour: 5 }, give: { bacon: 10 } })
    ).toThrow(/insufficient/i);
  });
});
