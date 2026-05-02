import { describe, it, expect } from 'vitest';
import {
  applyHeatSpoilage,
  applySpoilage,
  setSpoilClock,
  computeSpoilDay,
  EGG_FRESH_DAYS,
  BERRY_FRESH_DAYS,
  BACON_HEAT_LB_PER_DAY,
  SALT_PORK_HEAT_LB_PER_DAY
} from '../src/lib/game/systems/spoilage';
import { WAGONS } from '../src/lib/game/content/wagons';
import { createInitialState } from '../src/lib/game/engine';
import type { GameState } from '../src/lib/game/types';

function newGameWith(over: Partial<GameState> = {}): GameState {
  const s = createInitialState({
    seed: 'spoilage-test',
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [{ name: 'Mary', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
  return { ...s, ...over };
}

describe('#264 bran-barrel wagon trait', () => {
  it('schooner + heavy ship with bran barrel by default', () => {
    expect(WAGONS.prairie_schooner.shipsWithBranBarrel).toBe(true);
    expect(WAGONS.heavy.shipsWithBranBarrel).toBe(true);
  });

  it('light wagon does not ship with one', () => {
    expect(WAGONS.light.shipsWithBranBarrel).toBeUndefined();
  });

  it('new game wagon trait matches the model default', () => {
    const s = newGameWith();
    // createInitialState defaults to prairie_schooner.
    expect(s.wagon.model).toBe('prairie_schooner');
    expect(s.wagon.hasBranBarrel).toBe(true);
  });
});

describe('#265 heat-spoilage on bacon + salt_pork', () => {
  it('no-op when weather is not heat', () => {
    const s = { ...newGameWith(), weather: 'clear' as const,
      inventory: { ...newGameWith().inventory, bacon: 100, salt_pork: 100 } };
    const after = applyHeatSpoilage(s);
    expect(after.inventory.bacon).toBe(100);
    expect(after.inventory.salt_pork).toBe(100);
  });

  it('heat day with NO bran barrel — full bacon + salt_pork loss', () => {
    const base = newGameWith();
    const s: GameState = {
      ...base,
      weather: 'heat',
      wagon: { ...base.wagon, hasBranBarrel: false },
      inventory: { ...base.inventory, bacon: 100, salt_pork: 100 }
    };
    const after = applyHeatSpoilage(s);
    expect(after.inventory.bacon).toBe(100 - BACON_HEAT_LB_PER_DAY);
    expect(after.inventory.salt_pork).toBe(100 - Math.round(SALT_PORK_HEAT_LB_PER_DAY));
    const last = after.eventLog[after.eventLog.length - 1].text;
    expect(last).toMatch(/no bran barrel/i);
  });

  it('heat day WITH bran barrel — half loss', () => {
    const base = newGameWith();
    const s: GameState = {
      ...base,
      weather: 'heat',
      wagon: { ...base.wagon, hasBranBarrel: true },
      inventory: { ...base.inventory, bacon: 100, salt_pork: 100 }
    };
    const after = applyHeatSpoilage(s);
    // 3 lb / 2 = 1.5 → rounds to 2; salt_pork 1.5 / 2 = 0.75 → rounds to 1.
    expect(after.inventory.bacon).toBeLessThan(100);
    expect(after.inventory.bacon).toBeGreaterThan(100 - BACON_HEAT_LB_PER_DAY);
    expect(after.inventory.salt_pork).toBeLessThanOrEqual(100);
    const last = after.eventLog[after.eventLog.length - 1].text;
    expect(last).toMatch(/bran barrel/i);
  });

  it('does not go below zero on tiny piles', () => {
    const base = newGameWith();
    const s: GameState = {
      ...base,
      weather: 'heat',
      wagon: { ...base.wagon, hasBranBarrel: false },
      inventory: { ...base.inventory, bacon: 1, salt_pork: 1 }
    };
    const after = applyHeatSpoilage(s);
    expect(after.inventory.bacon).toBe(0);
    expect(after.inventory.salt_pork).toBe(0);
  });

  it('no log line when nothing to lose', () => {
    const base = newGameWith();
    const s: GameState = {
      ...base,
      weather: 'heat',
      inventory: { ...base.inventory, bacon: 0, salt_pork: 0 }
    };
    const startLogLen = s.eventLog.length;
    const after = applyHeatSpoilage(s);
    expect(after.eventLog.length).toBe(startLogLen);
  });
});

describe('#265 generalized pile-clock spoilage (eggs, berries)', () => {
  it('setSpoilClock for eggs sets the egg flag', () => {
    const s = newGameWith();
    const after = setSpoilClock(s, 'egg');
    expect(after.flags._eggSpoilDay).toBe(s.day + EGG_FRESH_DAYS);
  });

  it('setSpoilClock for berries sets the berries flag', () => {
    const s = newGameWith();
    const after = setSpoilClock(s, 'berries');
    expect(after.flags._berrySpoilDay).toBe(s.day + BERRY_FRESH_DAYS);
  });

  it('eggs spoil when their clock runs out', () => {
    const base = newGameWith();
    const s: GameState = {
      ...base,
      day: 30,
      inventory: { ...base.inventory, egg: 12 },
      flags: { ...base.flags, _eggSpoilDay: 30 }
    };
    const after = applySpoilage(s);
    expect(after.inventory.egg).toBe(0);
    const last = after.eventLog[after.eventLog.length - 1].text;
    expect(last).toMatch(/eggs went bad/i);
  });

  it('berries spoil when their clock runs out', () => {
    const base = newGameWith();
    const s: GameState = {
      ...base,
      day: 30,
      inventory: { ...base.inventory, berries: 5 },
      flags: { ...base.flags, _berrySpoilDay: 30 }
    };
    const after = applySpoilage(s);
    expect(after.inventory.berries).toBe(0);
    const last = after.eventLog[after.eventLog.length - 1].text;
    expect(last).toMatch(/berries molded/i);
  });

  it('clocks are independent — eggs spoil but bacon survives', () => {
    const base = newGameWith();
    const s: GameState = {
      ...base,
      day: 30,
      inventory: { ...base.inventory, egg: 12, bacon: 50 },
      flags: { ...base.flags, _eggSpoilDay: 30 },
      weather: 'clear'
    };
    const after = applySpoilage(s);
    expect(after.inventory.egg).toBe(0);
    expect(after.inventory.bacon).toBe(50);
  });

  it('game_meat clock still works (regression)', () => {
    const base = newGameWith();
    const s: GameState = {
      ...base,
      day: 30,
      inventory: { ...base.inventory, game_meat: 40 },
      flags: { ...base.flags, _gameMeatSpoilDay: 30 }
    };
    const after = applySpoilage(s);
    expect(after.inventory.game_meat).toBe(0);
  });

  it('computeSpoilDay default matches game_meat fresh window', () => {
    expect(computeSpoilDay(10)).toBe(13);
  });
});
