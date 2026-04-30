import { describe, it, expect } from 'vitest';
import { trade } from '../src/lib/game/actions/trade';
import { createInitialState } from '../src/lib/game/engine';
import type { GameState } from '../src/lib/game/types';

function newGame(atLandmarkId: string): GameState {
  const s = createInitialState({
    seed: 'gate-test',
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [{ name: 'Mary', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
  return {
    ...s,
    cash: 200,
    inventory: { raw_hide: 3, buffalo_robe: 1, flour: 50 },
    location: { ...s.location, atLandmarkId }
  };
}

describe('per-post buyer gating (#204)', () => {
  it('Hollenberg refuses raw_hide (native_trade category)', () => {
    const s = newGame('hollenberg_ranch');
    expect(() =>
      trade(s, { buys: [], sells: [{ item: 'raw_hide', qty: 1 }] })
    ).toThrow(/Hollenberg.*won't buy raw_hide/);
  });

  it('Hollenberg refuses buffalo_robe (native_trade)', () => {
    const s = newGame('hollenberg_ranch');
    expect(() =>
      trade(s, { buys: [], sells: [{ item: 'buffalo_robe', qty: 1 }] })
    ).toThrow(/won't buy buffalo_robe/);
  });

  it('Hollenberg still buys flour (food)', () => {
    const s = newGame('hollenberg_ranch');
    const next = trade(s, { buys: [], sells: [{ item: 'flour', qty: 10 }] });
    expect(next.inventory.flour).toBe(40);
    expect(next.cash).toBeGreaterThan(s.cash);
  });

  it('Ft Laramie (frontier hub, no exclusion) accepts raw_hide', () => {
    const s = newGame('ft_laramie');
    const next = trade(s, { buys: [], sells: [{ item: 'raw_hide', qty: 1 }] });
    expect(next.inventory.raw_hide).toBe(2);
  });

  it('Ft Bridger (mountain post) accepts raw_hide', () => {
    const s = newGame('ft_bridger');
    const next = trade(s, { buys: [], sells: [{ item: 'raw_hide', qty: 1 }] });
    expect(next.inventory.raw_hide).toBe(2);
  });

  it('Ft Hall (HBC) accepts buffalo_robe', () => {
    const s = newGame('ft_hall');
    const next = trade(s, { buys: [], sells: [{ item: 'buffalo_robe', qty: 1 }] });
    expect(next.inventory.buffalo_robe).toBe(0);
    expect(next.cash).toBeGreaterThan(s.cash);
  });
});
