import { describe, it, expect } from 'vitest';
import { getCampAction } from '../src/lib/game/actions/camp-actions';
import { ITEMS } from '../src/lib/game/content/items';
import { PRICES } from '../src/lib/game/content/prices';
import { OUTFITTER_BUYABLES } from '../src/lib/game/content/outfitter';
import { getLandmark } from '../src/lib/game/content/landmarks';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState } from '../src/lib/game/types';

function newGame(over: Partial<GameState> = {}): GameState {
  const s = createInitialState({
    seed: 'soap-test',
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [{ name: 'Mary', profession: 'doctor', sex: 'female' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
  return { ...s, ...over };
}

function atRiver(s: GameState): GameState {
  return { ...s, location: { ...s.location, terrain: 'river' } };
}

function setEveryoneCleanliness(s: GameState, value: number): GameState {
  return { ...s, party: s.party.map((m) => ({ ...m, cleanliness: value })) };
}

describe('#269 soap item', () => {
  it('soap is registered as a tool', () => {
    expect(ITEMS.soap).toBeDefined();
    expect(ITEMS.soap.category).toBe('tool');
    expect(ITEMS.soap.weightLbPerUnit).toBe(0.5);
  });

  it('soap has a price entry (buy + sell)', () => {
    expect(PRICES.soap).toBeDefined();
    expect(PRICES.soap.buy).toBeGreaterThan(0);
    expect(PRICES.soap.sell).toBeGreaterThan(0);
    expect(PRICES.soap.sell).toBeLessThan(PRICES.soap.buy);
  });

  it('soap is on the Independence outfitter list', () => {
    expect(OUTFITTER_BUYABLES).toContain('soap');
  });

  it('soap is stocked at Ft Laramie, Ft Hall, and The Dalles', () => {
    expect(getLandmark('ft_laramie').stock ?? []).toContain('soap');
    expect(getLandmark('ft_hall').stock ?? []).toContain('soap');
    expect(getLandmark('the_dalles').stock ?? []).toContain('soap');
  });

  it('small forts (Bridger, Boise, Kearny) do not stock soap', () => {
    expect(getLandmark('ft_bridger').stock ?? []).not.toContain('soap');
    expect(getLandmark('ft_boise').stock ?? []).not.toContain('soap');
    expect(getLandmark('ft_kearny').stock ?? []).not.toContain('soap');
  });
});

describe('#269 wash_clothes with soap', () => {
  const action = getCampAction('wash_clothes');

  it('with no soap, gives +30 cleanliness (unchanged baseline)', () => {
    const s = setEveryoneCleanliness(atRiver(newGame()), 40);
    const after = action.apply(s, makeRng('wash-no-soap'));
    for (const m of after.party) {
      expect(m.cleanliness).toBe(70);
    }
    expect(after.inventory.soap ?? 0).toBe(0);
  });

  it('with 1+ bar of soap, gives +50 cleanliness and consumes one bar', () => {
    const s: GameState = {
      ...setEveryoneCleanliness(atRiver(newGame()), 40),
      inventory: { ...newGame().inventory, soap: 3 }
    };
    const after = action.apply(s, makeRng('wash-with-soap'));
    for (const m of after.party) {
      expect(m.cleanliness).toBe(90);
    }
    expect(after.inventory.soap).toBe(2);
  });

  it('caps cleanliness at 100 even with soap', () => {
    const s: GameState = {
      ...setEveryoneCleanliness(atRiver(newGame()), 70),
      inventory: { ...newGame().inventory, soap: 1 }
    };
    const after = action.apply(s, makeRng('wash-cap'));
    for (const m of after.party) {
      expect(m.cleanliness).toBe(100);
    }
    expect(after.inventory.soap).toBe(0);
  });

  it('logs that soap was used', () => {
    const s: GameState = {
      ...setEveryoneCleanliness(atRiver(newGame()), 40),
      inventory: { ...newGame().inventory, soap: 1 }
    };
    const after = action.apply(s, makeRng('wash-log'));
    expect(after.eventLog[after.eventLog.length - 1].text).toMatch(/soap/i);
  });

  it('logs no mention of soap when bare-handed wash', () => {
    const s = setEveryoneCleanliness(atRiver(newGame()), 40);
    const after = action.apply(s, makeRng('wash-bare'));
    expect(after.eventLog[after.eventLog.length - 1].text).not.toMatch(/soap/i);
  });
});

describe('#269 make_soap camp action', () => {
  const action = getCampAction('make_soap');

  it('blocked when no tallow', () => {
    const s = newGame();
    const av = action.availability(s);
    expect(av.available).toBe(false);
  });

  it('blocked when below tallow threshold', () => {
    const s: GameState = { ...newGame(), inventory: { ...newGame().inventory, tallow: 2 } };
    const av = action.availability(s);
    expect(av.available).toBe(false);
  });

  it('available with 3+ lb tallow', () => {
    const s: GameState = { ...newGame(), inventory: { ...newGame().inventory, tallow: 3 } };
    expect(action.availability(s).available).toBe(true);
  });

  it('consumes 3 lb tallow and yields 2 bars of soap', () => {
    const s: GameState = { ...newGame(), inventory: { ...newGame().inventory, tallow: 5, soap: 1 } };
    const after = action.apply(s, makeRng('soap-make'));
    expect(after.inventory.tallow).toBe(2);
    expect(after.inventory.soap).toBe(3);
  });

  it('logs the craft', () => {
    const s: GameState = { ...newGame(), inventory: { ...newGame().inventory, tallow: 3 } };
    const after = action.apply(s, makeRng('soap-log'));
    expect(after.eventLog[after.eventLog.length - 1].text).toMatch(/lye soap/i);
  });

  it('hourCost is 2', () => {
    expect(action.hourCost).toBe(2);
  });
});
