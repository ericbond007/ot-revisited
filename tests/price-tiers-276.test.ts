import { describe, it, expect } from 'vitest';
import { trade } from '../src/lib/game/actions/trade';
import { getLandmark } from '../src/lib/game/content/landmarks';
import { createInitialState } from '../src/lib/game/engine';
import type { GameState } from '../src/lib/game/types';

function newGame(): GameState {
  return createInitialState({
    seed: 'tier',
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [{ name: 'Mary', profession: 'doctor', sex: 'female' }],
    startDate: { year: 1849, month: 5, day: 15 }
  });
}

function atPost(s: GameState, postId: string): GameState {
  return { ...s, location: { ...s.location, atLandmarkId: postId } };
}

describe('#276 follow-up — landmark priceMultiplier registration', () => {
  it('Ft Bridger gouges at 1.5×', () => {
    expect(getLandmark('ft_bridger').priceMultiplier).toBe(1.5);
  });

  it('Robidoux Post charges 1.3×', () => {
    expect(getLandmark('robidoux_post').priceMultiplier).toBe(1.3);
  });

  it('The Dalles charges 1.3× (end-of-trail)', () => {
    expect(getLandmark('the_dalles').priceMultiplier).toBe(1.3);
  });

  it('Whitman Mission charges 0.9× (charity)', () => {
    expect(getLandmark('whitman_mission').priceMultiplier).toBe(0.9);
  });

  it('mid-trail posts default to undefined (treated as 1.0×)', () => {
    expect(getLandmark('ft_laramie').priceMultiplier).toBeUndefined();
    expect(getLandmark('ft_hall').priceMultiplier).toBeUndefined();
    expect(getLandmark('ft_kearny').priceMultiplier).toBeUndefined();
  });
});

describe('#276 follow-up — priceMultiplier scales buy cost', () => {
  it('Bridger charges 1.5× the baseline price for buys', () => {
    const baseline = atPost({ ...newGame(), cash: 1000 }, 'ft_laramie');
    const bridger = atPost({ ...newGame(), cash: 1000 }, 'ft_bridger');
    // Buy 100 lb flour at each — large qty avoids rounding noise.
    const a = trade(baseline, { buys: [{ item: 'flour', qty: 100 }] });
    const b = trade(bridger, { buys: [{ item: 'flour', qty: 100 }] });
    const bridgerSpend = baseline.cash - b.cash;
    const baselineSpend = baseline.cash - a.cash;
    expect(bridgerSpend / baselineSpend).toBeGreaterThan(1.4);
    expect(bridgerSpend / baselineSpend).toBeLessThan(1.6);
  });

  it('Whitman Mission charges 0.9× the baseline (cheaper)', () => {
    const baseline = atPost({ ...newGame(), cash: 1000 }, 'ft_laramie');
    const mission = atPost({
      ...newGame(),
      cash: 1000,
      date: { year: 1845, month: 5, day: 15 }  // pre-massacre — mission open
    }, 'whitman_mission');
    const a = trade(baseline, { buys: [{ item: 'flour', qty: 100 }] });
    const b = trade(mission, { buys: [{ item: 'flour', qty: 100 }] });
    const baselineSpend = baseline.cash - a.cash;
    const missionSpend = mission.cash - b.cash;
    expect(missionSpend / baselineSpend).toBeGreaterThan(0.85);
    expect(missionSpend / baselineSpend).toBeLessThan(0.95);
  });
});

describe('#276 follow-up — priceMultiplier scales sell revenue symmetrically', () => {
  it('Bridger pays 1.5× the baseline on sells (same scale)', () => {
    const baseline = atPost({
      ...newGame(),
      cash: 100,
      inventory: { ...newGame().inventory, flour: 200 }
    }, 'ft_laramie');
    const bridger = atPost({
      ...newGame(),
      cash: 100,
      inventory: { ...newGame().inventory, flour: 200 }
    }, 'ft_bridger');
    // Sell 100 lb at each — large qty so rounding doesn't dominate.
    const a = trade(baseline, { sells: [{ item: 'flour', qty: 100 }] });
    const b = trade(bridger, { sells: [{ item: 'flour', qty: 100 }] });
    const baselineRev = a.cash - baseline.cash;
    const bridgerRev = b.cash - bridger.cash;
    expect(bridgerRev / baselineRev).toBeGreaterThan(1.4);
    expect(bridgerRev / baselineRev).toBeLessThan(1.6);
  });
});

describe('#276 follow-up — coffee + grandfather_clock period corrections', () => {
  it('coffee is now $0.30/lb (Independence outfitter rate)', async () => {
    const { PRICES } = await import('../src/lib/game/content/prices');
    expect(PRICES.coffee.buy).toBe(0.30);
  });

  it('grandfather clock is now $25 (period plain edition)', async () => {
    const { PRICES } = await import('../src/lib/game/content/prices');
    expect(PRICES.grandfather_clock.buy).toBe(25.00);
  });
});
