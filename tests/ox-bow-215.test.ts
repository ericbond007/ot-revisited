import { describe, it, expect } from 'vitest';
import { ITEMS } from '../src/lib/game/content/items';
import { PRICES } from '../src/lib/game/content/prices';
import { OUTFITTER_BUYABLES } from '../src/lib/game/content/outfitter';
import { LANDMARKS } from '../src/lib/game/content/landmarks';
import { EVENTS } from '../src/lib/game/content/events';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState } from '../src/lib/game/types';

function newGame(): GameState {
  return createInitialState({
    seed: 'ox-bow-test',
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [{ name: 'Mary', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
}

describe('#215 spare ox bow', () => {
  it('item exists with the livestock category', () => {
    expect(ITEMS.ox_bow).toBeDefined();
    expect(ITEMS.ox_bow.category).toBe('livestock');
    expect(ITEMS.ox_bow.weightLbPerUnit).toBeGreaterThan(0);
  });

  it('has a buy/sell price (cheaper than a full yoke)', () => {
    expect(PRICES.ox_bow).toBeDefined();
    expect(PRICES.ox_bow.buy).toBeGreaterThan(0);
    expect(PRICES.ox_bow.buy).toBeLessThan(PRICES.yoke.buy);
  });

  it('available at the Independence outfitter', () => {
    expect(OUTFITTER_BUYABLES).toContain('ox_bow');
  });

  it('stocks at every post that already stocks yokes', () => {
    const yokePosts = LANDMARKS.filter((l) => l.stock?.includes('yoke'));
    expect(yokePosts.length).toBeGreaterThan(0);
    for (const l of yokePosts) {
      expect(l.stock!, `${l.id} should stock ox_bow alongside yoke`).toContain('ox_bow');
    }
  });

  it('ox_bow event registered', () => {
    const ev = EVENTS.find((e) => e.id === 'ox_bow');
    expect(ev).toBeDefined();
    expect(ev!.category).toBe('wagon');
    expect(ev!.choices.length).toBeGreaterThan(0);
  });

  it('event consumes a spare bow when one is available', () => {
    const ev = EVENTS.find((e) => e.id === 'ox_bow')!;
    const choice = ev.choices.find((c) => c.id === 'replace')!;
    const before: GameState = { ...newGame(), inventory: { ...newGame().inventory, ox_bow: 2 } };
    const after = choice.apply(before, makeRng('bow-1'));
    expect(after.inventory.ox_bow).toBe(1);
  });

  it('event falls back to a rope-lash + small wagon damage when no spare', () => {
    const ev = EVENTS.find((e) => e.id === 'ox_bow')!;
    const choice = ev.choices.find((c) => c.id === 'replace')!;
    const before: GameState = { ...newGame(), inventory: { ...newGame().inventory, ox_bow: 0 } };
    expect(before.inventory.ox_bow ?? 0).toBe(0);
    const startCond = before.wagon.condition;
    const after = choice.apply(before, makeRng('bow-2'));
    expect(after.inventory.ox_bow ?? 0).toBe(0);
    expect(after.wagon.condition).toBe(startCond - 5);
  });
});
