import { describe, it, expect } from 'vitest';
import { ford } from '../../src/lib/game/actions/ford';
import { createInitialState } from '../../src/lib/game/engine';
import type { GameState, Ox } from '../../src/lib/game/types';

function newGame(): GameState {
  const s = createInitialState({
    seed: 'ford-test',
    leader: { name: 'A', profession: 'farmer' },
    companions: [{ name: 'B', profession: 'scout' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
  const oxen: Ox[] = [
    { id: 'o1', health: 100, fatigue: 20, shod: true },
    { id: 'o2', health: 100, fatigue: 20, shod: true }
  ];
  return { ...s, oxen };
}

const RIVER = { depthFt: 2.5, currentMph: 3, ferryPrice: 5 } as const;

describe('ford', () => {
  it('"ferry" pays cash and crosses in one day', () => {
    const s: GameState = { ...newGame(), cash: 20 };
    const f = ford(s, { method: 'ferry', river: RIVER });
    expect(f.cash).toBe(15);
    expect(f.day).toBe(s.day + 1);
  });

  it('"ferry" throws if not enough cash', () => {
    const s: GameState = { ...newGame(), cash: 3 };
    expect(() => ford(s, { method: 'ferry', river: RIVER })).toThrow(/cash/i);
  });

  it('"ford" succeeds on shallow water without notable damage', () => {
    const shallow = { ...RIVER, depthFt: 1.5 };
    const s = newGame();
    const f = ford(s, { method: 'ford', river: shallow });
    expect(f.day).toBe(s.day + 1);
    expect(f.cash).toBe(s.cash);
  });

  it('"ford" risks supplies loss OR wagon damage on dangerous water', () => {
    const dangerous = { ...RIVER, depthFt: 5.5, currentMph: 8 };
    const s = newGame();
    const f = ford(s, { method: 'ford', river: dangerous });
    const wagonWorse = f.wagon.condition < s.wagon.condition;
    const suppliesLost = (f.inventory.flour ?? 0) < (s.inventory.flour ?? 0) - 2;
    expect(wagonWorse || suppliesLost).toBe(true);
  });

  it('"caulk" takes 2 days', () => {
    const s = newGame();
    const f = ford(s, { method: 'caulk', river: RIVER });
    expect(f.day).toBe(s.day + 2);
  });

  it('"wait" skips N days', () => {
    const s = newGame();
    const f = ford(s, { method: 'wait', river: RIVER, waitDays: 3 });
    expect(f.day).toBe(s.day + 3);
  });

  it('"wait" consumes food over the waiting period', () => {
    const s = newGame();
    const startingFlour = s.inventory.flour ?? 0;
    const f = ford(s, { method: 'wait', river: RIVER, waitDays: 3 });
    expect(f.inventory.flour).toBeLessThan(startingFlour);
  });

  it('logs the ford method', () => {
    const s = newGame();
    const f = ford(s, { method: 'ferry', river: RIVER });
    expect(f.eventLog[f.eventLog.length - 1].text.toLowerCase()).toMatch(/(ferry|river)/);
  });

  it('is deterministic', () => {
    const a = ford(newGame(), { method: 'ford', river: { ...RIVER, depthFt: 1.5 } });
    const b = ford(newGame(), { method: 'ford', river: { ...RIVER, depthFt: 1.5 } });
    expect(a).toEqual(b);
  });
});
