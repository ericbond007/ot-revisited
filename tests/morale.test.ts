import { describe, it, expect } from 'vitest';
import {
  adjustMorale,
  healingMultiplier
} from '../src/lib/game/systems/morale';
import { makeRng } from '../src/lib/game/rng';
import { createInitialState } from '../src/lib/game/engine';
import type { GameState } from '../src/lib/game/types';

function newGame(): GameState {
  return createInitialState({
    seed: 't',
    leader: { name: 'A', profession: 'farmer' },
    companions: [{ name: 'B', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
}

describe('healingMultiplier (§5.2 table)', () => {
  it('multiplier is 1.25 for morale 80-100', () => {
    expect(healingMultiplier(100)).toBe(1.25);
    expect(healingMultiplier(80)).toBe(1.25);
  });
  it('1.10 for 60-79', () => {
    expect(healingMultiplier(79)).toBe(1.10);
    expect(healingMultiplier(60)).toBe(1.10);
  });
  it('1.00 for 40-59', () => {
    expect(healingMultiplier(50)).toBe(1.00);
  });
  it('0.90 for 20-39', () => {
    expect(healingMultiplier(30)).toBe(0.90);
  });
  it('0.75 for 0-19', () => {
    expect(healingMultiplier(5)).toBe(0.75);
    expect(healingMultiplier(0)).toBe(0.75);
  });
});

describe('adjustMorale', () => {
  it('wellness feedback loop: +1 morale if every member has >70 health', () => {
    const s = { ...newGame(), morale: 50 };
    for (const m of s.party) m.health = 80;
    const next = adjustMorale(s, makeRng('t:1'));
    expect(next.morale).toBe(51);
  });

  it('no wellness bonus if anyone has <=70 health', () => {
    const s = { ...newGame(), morale: 50 };
    s.party[0].health = 70;
    const next = adjustMorale(s, makeRng('t:1'));
    expect(next.morale).toBe(50);
  });

  it('low food rations cause -1 morale (meager)', () => {
    const s = { ...newGame(), morale: 50, rations: 'meager' as const };
    const next = adjustMorale(s, makeRng('t:1'));
    expect(next.morale).toBe(49);
  });

  it('filling rations cause +1 morale', () => {
    const s = { ...newGame(), morale: 50, rations: 'filling' as const };
    const next = adjustMorale(s, makeRng('t:1'));
    expect(next.morale).toBe(51);
  });

  it('empty food inventory drives morale down hard', () => {
    const s = { ...newGame(), morale: 50, inventory: {} };
    const next = adjustMorale(s, makeRng('t:1'));
    expect(next.morale).toBeLessThan(48);
  });

  it('clamps at 0 and 100', () => {
    const high = { ...newGame(), morale: 100, rations: 'filling' as const };
    for (const m of high.party) m.health = 80;
    expect(adjustMorale(high, makeRng('t:1')).morale).toBe(100);

    const low = { ...newGame(), morale: 0, inventory: {} };
    expect(adjustMorale(low, makeRng('t:1')).morale).toBe(0);
  });
});
