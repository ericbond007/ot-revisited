import { describe, it, expect } from 'vitest';
import { tickOxen, oxenSpeedFactor } from '../src/lib/game/systems/oxen';
import { makeRng } from '../src/lib/game/rng';
import { createInitialState } from '../src/lib/game/engine';
import type { GameState, Ox } from '../src/lib/game/types';

function gameWithOxen(oxen: Ox[]): GameState {
  const s = createInitialState({
    seed: 't',
    leader: { name: 'A', profession: 'farmer' },
    companions: [{ name: 'B', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
  return { ...s, oxen };
}

function newOx(overrides: Partial<Ox> = {}): Ox {
  return { id: 'o1', health: 100, fatigue: 0, shod: true, ...overrides };
}

describe('tickOxen', () => {
  it('no-ops when no oxen', () => {
    const s = gameWithOxen([]);
    const next = tickOxen(s, makeRng('t:1'));
    expect(next.oxen).toEqual([]);
  });

  it('accrues +4 fatigue on moderate pace per ox', () => {
    const s = gameWithOxen([newOx()]);
    const next = tickOxen(s, makeRng('t:1'));
    expect(next.oxen[0].fatigue).toBe(4);
  });

  it('accrues more fatigue on fast / grueling pace', () => {
    const slow = tickOxen({ ...gameWithOxen([newOx()]), pace: 'slow' }, makeRng('t:1'));
    const fast = tickOxen({ ...gameWithOxen([newOx()]), pace: 'fast' }, makeRng('t:1'));
    const grueling = tickOxen({ ...gameWithOxen([newOx()]), pace: 'grueling' }, makeRng('t:1'));
    expect(slow.oxen[0].fatigue).toBeLessThan(fast.oxen[0].fatigue);
    expect(fast.oxen[0].fatigue).toBeLessThan(grueling.oxen[0].fatigue);
  });

  it('shoeless ox fatigues faster', () => {
    const shod = tickOxen(gameWithOxen([newOx({ shod: true })]), makeRng('t:1'));
    const bare = tickOxen(gameWithOxen([newOx({ shod: false })]), makeRng('t:1'));
    expect(bare.oxen[0].fatigue).toBeGreaterThan(shod.oxen[0].fatigue);
  });

  it('high fatigue (>= 80) drains health over time', () => {
    const s = gameWithOxen([newOx({ fatigue: 85 })]);
    const next = tickOxen(s, makeRng('t:1'));
    expect(next.oxen[0].health).toBeLessThan(100);
  });

  it('caps fatigue at 100 and health at 0/100', () => {
    const s1 = gameWithOxen([newOx({ fatigue: 98 })]);
    expect(tickOxen({ ...s1, pace: 'grueling' }, makeRng('t:1')).oxen[0].fatigue).toBe(100);

    const s2 = gameWithOxen([newOx({ fatigue: 100, health: 2 })]);
    expect(tickOxen(s2, makeRng('t:1')).oxen[0].health).toBe(0);
  });
});

describe('oxenSpeedFactor', () => {
  it('is 1.0 with two full-health zero-fatigue oxen', () => {
    const oxen = [newOx(), newOx({ id: 'o2' })];
    expect(oxenSpeedFactor(oxen)).toBeCloseTo(1.0);
  });

  it('drops as fatigue rises', () => {
    const fresh = [newOx()];
    const tired = [newOx({ fatigue: 80 })];
    expect(oxenSpeedFactor(fresh)).toBeGreaterThan(oxenSpeedFactor(tired));
  });

  it('dead oxen are excluded', () => {
    const oxen = [newOx(), newOx({ id: 'dead', health: 0 })];
    const aliveOnly = [newOx()];
    expect(oxenSpeedFactor(oxen)).toBeCloseTo(oxenSpeedFactor(aliveOnly));
  });

  it('zero live oxen → 0 speed factor', () => {
    expect(oxenSpeedFactor([])).toBe(0);
    expect(oxenSpeedFactor([newOx({ health: 0 })])).toBe(0);
  });
});
