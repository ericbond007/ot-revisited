import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/lib/game/engine';
import { getLandmark } from '../src/lib/game/content/landmarks';
import {
  postBaselineQty,
  postRemainingQty,
  recordPostPurchases,
  restockPostIfDue,
  DEFAULT_STOCK_QTY,
  RESTOCK_DAYS
} from '../src/lib/game/systems/post-stock';
import type { GameState } from '../src/lib/game/types';

function newGame(): GameState {
  return createInitialState({
    seed: 'stock',
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [{ name: 'Mary', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
}

describe('post baseline qty', () => {
  it('scales the category default by the post stockScale', () => {
    const laramie = getLandmark('ft_laramie'); // scale 1.5
    const bridger = getLandmark('ft_bridger'); // scale 0.45
    const flourAtLaramie = postBaselineQty(laramie, 'flour');
    const flourAtBridger = postBaselineQty(bridger, 'flour');
    expect(flourAtLaramie).toBe(Math.ceil(DEFAULT_STOCK_QTY.food * 1.5));
    expect(flourAtBridger).toBe(Math.ceil(DEFAULT_STOCK_QTY.food * 0.45));
    expect(flourAtLaramie).toBeGreaterThan(flourAtBridger * 2);
  });

  it('returns 0 for items not in the post stock list', () => {
    const bridger = getLandmark('ft_bridger');
    // Bridger does not stock fiddles.
    expect(postBaselineQty(bridger, 'fiddle')).toBe(0);
  });

  it('floors at 1 even with extreme small scale', () => {
    const laramie = getLandmark('ft_laramie');
    // An item stocked at the post should always allow buying ≥1.
    expect(postBaselineQty(laramie, 'wheel')).toBeGreaterThanOrEqual(1);
  });
});

describe('post remaining + record purchase', () => {
  it('remaining starts at baseline and decreases with recorded purchases', () => {
    const s = newGame();
    const laramie = getLandmark('ft_laramie');
    const baseline = postBaselineQty(laramie, 'flour');
    expect(postRemainingQty(s, laramie, 'flour')).toBe(baseline);

    const s2 = recordPostPurchases(s, laramie, { flour: 40 });
    expect(postRemainingQty(s2, laramie, 'flour')).toBe(baseline - 40);
  });

  it('stacks purchases across multiple recordings', () => {
    const s0 = newGame();
    const laramie = getLandmark('ft_laramie');
    const s1 = recordPostPurchases(s0, laramie, { flour: 20 });
    const s2 = recordPostPurchases(s1, laramie, { flour: 15, bullets: 50 });
    const baselineFlour = postBaselineQty(laramie, 'flour');
    const baselineBullets = postBaselineQty(laramie, 'bullets');
    expect(postRemainingQty(s2, laramie, 'flour')).toBe(baselineFlour - 35);
    expect(postRemainingQty(s2, laramie, 'bullets')).toBe(baselineBullets - 50);
  });

  it("can't underflow past 0 even if record overshoots", () => {
    const s = newGame();
    const bridger = getLandmark('ft_bridger');
    const tiny = postBaselineQty(bridger, 'flour');
    const s2 = recordPostPurchases(s, bridger, { flour: tiny * 5 });
    expect(postRemainingQty(s2, bridger, 'flour')).toBe(0);
  });

  it('keeps separate counters per post', () => {
    const s0 = newGame();
    const s1 = recordPostPurchases(s0, getLandmark('ft_laramie'), { flour: 30 });
    const s2 = recordPostPurchases(s1, getLandmark('ft_kearny'),  { flour: 10 });
    expect(postRemainingQty(s2, getLandmark('ft_laramie'), 'flour'))
      .toBe(postBaselineQty(getLandmark('ft_laramie'), 'flour') - 30);
    expect(postRemainingQty(s2, getLandmark('ft_kearny'), 'flour'))
      .toBe(postBaselineQty(getLandmark('ft_kearny'), 'flour') - 10);
  });
});

describe('restock window', () => {
  it('first arrival initializes the record at current day', () => {
    const s = newGame();
    const laramie = getLandmark('ft_laramie');
    const s2 = restockPostIfDue({ ...s, day: 50 }, laramie);
    const root = s2.flags._postStock as Record<string, { bought: Record<string, number>; restockedDay: number }>;
    expect(root[laramie.id]).toBeTruthy();
    expect(root[laramie.id].restockedDay).toBe(50);
  });

  it('does not restock a post re-visited within the window', () => {
    const s0 = newGame();
    const laramie = getLandmark('ft_laramie');
    const s1 = restockPostIfDue({ ...s0, day: 10 }, laramie);
    const s2 = recordPostPurchases(s1, laramie, { flour: 40 });
    // 20 days later (<30) — bought counter must survive.
    const s3 = restockPostIfDue({ ...s2, day: 30 }, laramie);
    const baseline = postBaselineQty(laramie, 'flour');
    expect(postRemainingQty(s3, laramie, 'flour')).toBe(baseline - 40);
  });

  it('restocks when the window has elapsed', () => {
    const s0 = newGame();
    const laramie = getLandmark('ft_laramie');
    const s1 = restockPostIfDue({ ...s0, day: 10 }, laramie);
    const s2 = recordPostPurchases(s1, laramie, { flour: 40 });
    // Come back 40 days later — past the restock window.
    const s3 = restockPostIfDue({ ...s2, day: 10 + RESTOCK_DAYS + 1 }, laramie);
    const baseline = postBaselineQty(laramie, 'flour');
    expect(postRemainingQty(s3, laramie, 'flour')).toBe(baseline);
  });

  it('skips non-trading-post landmarks silently', () => {
    const s = newGame();
    const chimney = getLandmark('chimney_rock'); // scenic landmark
    const s2 = restockPostIfDue(s, chimney);
    expect(s2.flags._postStock).toBeUndefined();
  });
});
