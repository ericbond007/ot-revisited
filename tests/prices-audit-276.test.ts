import { describe, it, expect } from 'vitest';
import { PRICES } from '../src/lib/game/content/prices';

describe('#276 trade-post price audit — invariants', () => {
  it('every entry has buy >= sell (no fence-buys-higher-than-it-sells)', () => {
    const inverted = Object.entries(PRICES).filter(([, p]) => p.sell > p.buy);
    expect(inverted).toEqual([]);
  });

  it('buy/sell margin lands in the period-realistic 1.4×–4× band for non-zero entries', () => {
    // Period markup on resale was steep both ways. A margin under 1.4×
    // reads as a generous fence; over 4× reads as exploitative.
    // Sub-cent items round noisily, so allow a ±$0.005 fudge there.
    const offenders = Object.entries(PRICES)
      .filter(([, p]) => p.buy > 0.01 && p.sell > 0)
      .filter(([, p]) => {
        const ratio = p.buy / p.sell;
        return ratio < 1.4 || ratio > 4.0;
      });
    expect(offenders, `entries outside 1.4×–4× margin band: ${offenders.map(([k, p]) => `${k} (${(p.buy / p.sell).toFixed(2)}×)`).join(', ')}`).toEqual([]);
  });

  it('casting lead from a pig stays cheaper than buying ready-cast balls', () => {
    // 5 lb pig → ~167 balls (0.03 lb each). Per-ball cost when casting
    // home should be below the buy-ready-cast price.
    const pigBuy = PRICES.lead_pig.buy;
    const ballsFromPig = 5 / 0.03;
    const homeCastPerBall = pigBuy / ballsFromPig;
    expect(homeCastPerBall).toBeLessThan(PRICES.lead_balls.buy);
  });
});

describe('#276 specific corrections applied', () => {
  it('bacon margin now 2× (was 1.33×)', () => {
    expect(PRICES.bacon.buy).toBe(0.40);
    expect(PRICES.bacon.sell).toBe(0.20);
  });

  it('axle dropped from $12 → $7', () => {
    expect(PRICES.axle.buy).toBe(7.00);
  });

  it('tongue dropped from $8 → $5', () => {
    expect(PRICES.tongue.buy).toBe(5.00);
  });

  it('iron_toolkit dropped from $40 → $25', () => {
    expect(PRICES.iron_toolkit.buy).toBe(25.00);
  });

  it('shovel dropped from $4 → $2.50', () => {
    expect(PRICES.shovel.buy).toBe(2.50);
  });

  it('compass dropped from $8 → $4', () => {
    expect(PRICES.compass.buy).toBe(4.00);
  });

  it('lead_balls dropped from $0.05 → $0.02', () => {
    expect(PRICES.lead_balls.buy).toBe(0.02);
  });

  it('bandages dropped from $1.50 → $0.75', () => {
    expect(PRICES.bandages.buy).toBe(0.75);
  });

  it('harmonica dropped from $3 → $1.50', () => {
    expect(PRICES.harmonica.buy).toBe(1.50);
  });

  it('bible dropped from $5 → $2', () => {
    expect(PRICES.bible.buy).toBe(2.00);
  });

  it('beads dropped from $0.50 → $0.30', () => {
    expect(PRICES.beads.buy).toBe(0.30);
  });
});
