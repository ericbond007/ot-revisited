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

  it('stashes a _fordResult flag with the method, days, and crossed state', () => {
    const s: GameState = { ...newGame(), cash: 20 };
    const f = ford(s, { method: 'ferry', river: RIVER });
    const result = f.flags._fordResult as Record<string, unknown>;
    expect(result).toBeTruthy();
    expect(result.method).toBe('ferry');
    expect(result.crossed).toBe(true);
    expect(result.daysElapsed).toBe(1);
    expect(result.cashDelta).toBe(-5);
    const events = result.events as string[];
    expect(events.length).toBeGreaterThan(0);
  });

  it('wait-method reveals crossed: false (still at river)', () => {
    const s = newGame();
    const f = ford(s, { method: 'wait', river: RIVER, waitDays: 2 });
    const result = f.flags._fordResult as Record<string, unknown>;
    expect(result.method).toBe('wait');
    expect(result.crossed).toBe(false);
    expect(result.daysElapsed).toBe(2);
  });
});

describe('ford chill', () => {
  it('naked party takes more chill damage than well-clothed one', () => {
    const base = newGame();
    const naked: GameState = { ...base, inventory: {} };
    const clothed: GameState = {
      ...base,
      inventory: { coat: 2, blanket: 2, boots: 2, buffalo_robe: 2, moccasins: 2 }
    };
    const nakedFord = ford(naked, { method: 'ford', river: RIVER });
    const clothedFord = ford(clothed, { method: 'ford', river: RIVER });
    const nakedHp = nakedFord.party.reduce((a, m) => a + m.health, 0);
    const clothedHp = clothedFord.party.reduce((a, m) => a + m.health, 0);
    expect(clothedHp).toBeGreaterThan(nakedHp);
  });

  it('ferry method skips chill (dry crossing)', () => {
    const s: GameState = { ...newGame(), cash: 20, inventory: {} };
    const f = ford(s, { method: 'ferry', river: RIVER });
    // Ferry applies passiveDay consumption but no chill line.
    const events = (f.flags._fordResult as { events: string[] }).events;
    expect(events.some((e) => /chilled/i.test(e))).toBe(false);
  });

  it('caulk method applies chill but lighter than full ford', () => {
    const base = { ...newGame(), inventory: {} };
    const fordResult = ford(base, { method: 'ford', river: RIVER });
    const caulkResult = ford(base, { method: 'caulk', river: RIVER });
    const fordHpLoss = base.party.reduce((a, m) => a + m.health, 0)
      - fordResult.party.reduce((a, m) => a + m.health, 0);
    const caulkHpLoss = base.party.reduce((a, m) => a + m.health, 0)
      - caulkResult.party.reduce((a, m) => a + m.health, 0);
    expect(caulkHpLoss).toBeLessThan(fordHpLoss);
  });

  it('summer prairie ford causes zero chill damage even naked', () => {
    const summer: GameState = {
      ...newGame(),
      inventory: {},
      date: { year: 1848, month: 7, day: 15 },
      location: { ...newGame().location, terrain: 'prairie' as const }
    };
    const fordResult = ford(summer, { method: 'ford', river: RIVER });
    const before = summer.party.reduce((a, m) => a + m.health, 0);
    const after = fordResult.party.reduce((a, m) => a + m.health, 0);
    expect(after).toBe(before);
    const events = (fordResult.flags._fordResult as { events: string[] }).events;
    expect(events.some((e) => /chilled/i.test(e))).toBe(false);
  });

  it('winter ford in mountains hurts more than summer prairie', () => {
    const summer: GameState = {
      ...newGame(),
      inventory: {},
      date: { year: 1848, month: 7, day: 15 },
      location: { ...newGame().location, terrain: 'prairie' as const }
    };
    const winter: GameState = {
      ...newGame(),
      inventory: {},
      date: { year: 1848, month: 12, day: 15 },
      location: { ...newGame().location, terrain: 'mountains' as const }
    };
    const summerFord = ford(summer, { method: 'ford', river: RIVER });
    const winterFord = ford(winter, { method: 'ford', river: RIVER });
    const summerLoss = summer.party.reduce((a, m) => a + m.health, 0)
      - summerFord.party.reduce((a, m) => a + m.health, 0);
    const winterLoss = winter.party.reduce((a, m) => a + m.health, 0)
      - winterFord.party.reduce((a, m) => a + m.health, 0);
    expect(winterLoss).toBeGreaterThan(summerLoss);
  });
});
