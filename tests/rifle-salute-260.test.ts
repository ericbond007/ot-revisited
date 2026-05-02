import { describe, it, expect } from 'vitest';
import { EVENTS } from '../src/lib/game/content/events';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState } from '../src/lib/game/types';

const burial = EVENTS.find((e) => e.id === 'personal_burial')!;
const salute = burial.choices.find((c) => c.id === 'rifle_salute')!;

function newGame(over: Partial<GameState> = {}): GameState {
  const s = createInitialState({
    seed: 'rifle-260',
    leader: { name: 'Ezra', profession: 'banker' },
    companions: [{ name: 'Mary', profession: 'farmer' }],
    startDate: { year: 1849, month: 7, day: 1 }
  });
  return {
    ...s,
    flags: { ...s.flags, _burialPending: true },
    ...over
  };
}

function withAmmo(s: GameState, qty: number): GameState {
  return {
    ...s,
    inventory: {
      ...s.inventory,
      gunpowder: qty,
      lead_balls: qty,
      percussion_caps: qty
    }
  };
}

describe('#260 rifle salute — registration', () => {
  it('exists as a choice on the burial event', () => {
    expect(salute).toBeDefined();
    expect(salute.id).toBe('rifle_salute');
    expect(salute.label).toMatch(/salute/i);
  });

  it('is the 4th choice (after dig / mound / eat-body)', () => {
    const ids = burial.choices.map((c) => c.id);
    expect(ids).toEqual(['dig_grave', 'stone_mound', 'rifle_salute', 'eat_the_body']);
  });
});

describe('#260 rifle salute — gating', () => {
  it('hidden when missing all ammo', () => {
    const s = withAmmo(newGame(), 0);
    expect(salute.hidden!(s)).toBe(true);
  });

  it('hidden when missing percussion caps', () => {
    const base = withAmmo(newGame(), 5);
    const s: GameState = { ...base, inventory: { ...base.inventory, percussion_caps: 0 } };
    expect(salute.hidden!(s)).toBe(true);
  });

  it('hidden when missing gunpowder', () => {
    const base = withAmmo(newGame(), 5);
    const s: GameState = { ...base, inventory: { ...base.inventory, gunpowder: 0 } };
    expect(salute.hidden!(s)).toBe(true);
  });

  it('hidden at 2 shots (need 3 for the volley)', () => {
    const s = withAmmo(newGame(), 2);
    expect(salute.hidden!(s)).toBe(true);
  });

  it('visible at exactly 3 shots', () => {
    const s = withAmmo(newGame(), 3);
    expect(salute.hidden!(s)).toBe(false);
  });

  it('visible above 3 shots', () => {
    const s = withAmmo(newGame(), 30);
    expect(salute.hidden!(s)).toBe(false);
  });
});

describe('#260 rifle salute — apply', () => {
  it('spends 3 of each ammo component', () => {
    const before = withAmmo(newGame(), 10);
    const after = salute.apply(before, makeRng('salute'));
    expect(after.inventory.gunpowder).toBe(7);
    expect(after.inventory.lead_balls).toBe(7);
    expect(after.inventory.percussion_caps).toBe(7);
  });

  it('grants +4 morale', () => {
    const before: GameState = { ...withAmmo(newGame(), 10), morale: 50 };
    const after = salute.apply(before, makeRng('salute'));
    expect(after.morale).toBe(54);
  });

  it('clears _burialPending', () => {
    const before = withAmmo(newGame(), 10);
    expect(before.flags._burialPending).toBe(true);
    const after = salute.apply(before, makeRng('salute'));
    expect(after.flags._burialPending).toBeUndefined();
  });

  it('writes a salute log line', () => {
    const before = withAmmo(newGame(), 10);
    const after = salute.apply(before, makeRng('salute'));
    const last = after.eventLog[after.eventLog.length - 1].text;
    expect(last).toMatch(/rifles?|salute|spoke/i);
  });

  it('clamps morale at 100', () => {
    const before: GameState = { ...withAmmo(newGame(), 10), morale: 99 };
    const after = salute.apply(before, makeRng('salute'));
    expect(after.morale).toBe(100);
  });
});

describe('#260 defensive fallback when ammo lapses', () => {
  it('falls back to stone-mound when ammo somehow missing at apply time', () => {
    // Hidden gate normally prevents this, but defensive in apply.
    const before = withAmmo(newGame(), 0);
    const after = salute.apply(before, makeRng('fallback'));
    expect(after.flags._burialPending).toBeUndefined();
    expect(after.inventory.gunpowder ?? 0).toBe(0);
    // Stone-mound semantics: morale dropped, not bumped.
    expect(after.morale).toBeLessThan(before.morale);
  });
});

describe('#260 existing burial choices unaffected', () => {
  it('dig_grave still grants +2 morale and clears burial flag', () => {
    const dig = burial.choices.find((c) => c.id === 'dig_grave')!;
    const before: GameState = { ...newGame(), morale: 50 };
    const after = dig.apply(before, makeRng('dig'));
    expect(after.morale).toBe(52);
    expect(after.flags._burialPending).toBeUndefined();
  });

  it('stone_mound still applies a death morale penalty', () => {
    const mound = burial.choices.find((c) => c.id === 'stone_mound')!;
    const before: GameState = { ...newGame(), morale: 50 };
    const after = mound.apply(before, makeRng('mound'));
    expect(after.morale).toBeLessThan(50);
  });
});
