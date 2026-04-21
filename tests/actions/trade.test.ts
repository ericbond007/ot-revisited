import { describe, it, expect } from 'vitest';
import { trade } from '../../src/lib/game/actions/trade';
import { createInitialState } from '../../src/lib/game/engine';
import type { GameState } from '../../src/lib/game/types';

function newGame(): GameState {
  return createInitialState({
    seed: 'trade-test',
    leader: { name: 'A', profession: 'merchant' },
    companions: [{ name: 'B', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
}

describe('trade', () => {
  it('buys flour at the adjusted price (Merchant -15%)', () => {
    const s: GameState = { ...newGame(), cash: 200 };
    const t = trade(s, { buys: [{ item: 'flour', qty: 50 }] });
    expect((t.inventory.flour ?? 0)).toBe((s.inventory.flour ?? 0) + 50);
    expect(t.cash).toBe(Math.round(200 - 50 * 0.20 * 0.85));
  });

  it('sells bacon at the adjusted price (Merchant +20%)', () => {
    const s: GameState = { ...newGame(), cash: 0, inventory: { ...newGame().inventory, bacon: 100 } };
    const t = trade(s, { sells: [{ item: 'bacon', qty: 50 }] });
    expect(t.inventory.bacon).toBe(50);
    expect(t.cash).toBeGreaterThan(0);
  });

  it('throws if not enough cash for buy', () => {
    const s: GameState = { ...newGame(), cash: 1 };
    expect(() => trade(s, { buys: [{ item: 'flour', qty: 100 }] })).toThrow(/cash/i);
  });

  it('throws if selling more than owned', () => {
    const s: GameState = { ...newGame(), inventory: { bacon: 10 } };
    expect(() => trade(s, { sells: [{ item: 'bacon', qty: 100 }] })).toThrow(/quantity/i);
  });

  it('logs the transaction', () => {
    const s: GameState = { ...newGame(), cash: 100 };
    const t = trade(s, { buys: [{ item: 'flour', qty: 10 }] });
    expect(t.eventLog[t.eventLog.length - 1].text.toLowerCase()).toMatch(/(trade|bought|sold)/);
  });

  it('does not advance the day', () => {
    const s = newGame();
    const t = trade(s, { buys: [] });
    expect(t.day).toBe(s.day);
  });
});
