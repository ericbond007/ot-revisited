import { describe, it, expect } from 'vitest';
import { CONDITIONS } from '../src/lib/game/content/conditions';
import { progressConditions } from '../src/lib/game/systems/conditions';
import { createInitialState } from '../src/lib/game/engine';
import type { GameState } from '../src/lib/game/types';
import type { Rng } from '../src/lib/game/rng';

describe('#1046 D — natural-course metadata', () => {
  it('disease/injury conditions carry spec course values; markers do not', () => {
    const c = CONDITIONS;
    expect([c.dysentery.naturalCourseDays, c.dysentery.minCourseDays]).toEqual([8, 3]);
    expect([c.cholera.naturalCourseDays, c.cholera.minCourseDays]).toEqual([5, 2]);
    expect([c.typhoid.naturalCourseDays, c.typhoid.minCourseDays]).toEqual([14, 5]);
    expect([c.measles.naturalCourseDays, c.measles.minCourseDays]).toEqual([10, 4]);
    expect([c.exhaustion.naturalCourseDays, c.exhaustion.minCourseDays]).toEqual([3, 1]);
    expect([c.frostbite.naturalCourseDays, c.frostbite.minCourseDays]).toEqual([14, 5]);
    expect([c.broken_leg.naturalCourseDays, c.broken_leg.minCourseDays]).toEqual([30, 14]);
    expect([c.snakebite.naturalCourseDays, c.snakebite.minCourseDays]).toEqual([10, 4]);
    expect([c.bear_mauling.naturalCourseDays, c.bear_mauling.minCourseDays]).toEqual([21, 10]);
    // No spontaneous resolution:
    expect(c.scurvy.naturalCourseDays).toBeUndefined();
    expect(c.starvation.naturalCourseDays).toBeUndefined();
    expect(c.pox.naturalCourseDays).toBeUndefined();
  });
});

function stateWith(condDays: number, opts: { food?: boolean; water?: number; morale?: number; doctor?: boolean } = {}): GameState {
  const s = createInitialState({
    seed: 'd1046',
    leader: { name: 'L', profession: opts.doctor ? 'doctor' : 'farmer' },
    companions: [{ name: 'C', profession: 'farmer' }],
    startDate: { year: 1849, month: 6, day: 15 }
  });
  return {
    ...s,
    morale: opts.morale ?? 60,
    inventory: opts.food === false ? {} : { flour: 50 },
    resources: { ...s.resources, water: opts.water ?? 20 },
    party: s.party.map((m, i) =>
      i === 0 ? { ...m, conditions: [{ id: 'dysentery' as const, daysSinceOnset: condDays }] } : m
    )
  };
}
const always: Rng = { chance: () => true, next: () => 0, int: () => 0, pick: <T>(a: T[]) => a[0] } as unknown as Rng;
const never: Rng = { chance: () => false, next: () => 0.999, int: () => 0, pick: <T>(a: T[]) => a[0] } as unknown as Rng;

describe('#1046 D — care-gated natural-course resolve', () => {
  it('tended, past minCourseDays, winning roll => condition clears', () => {
    const out = progressConditions(stateWith(7, {}), always);
    expect(out.party[0].conditions).toHaveLength(0);
  });
  it('tended, below minCourseDays => never resolves even on a winning roll', () => {
    const out = progressConditions(stateWith(1, {}), always);
    expect(out.party[0].conditions).toHaveLength(1);
  });
  it('untended (no food) => resolve suppressed even on a winning roll', () => {
    const out = progressConditions(stateWith(7, { food: false }), always);
    expect(out.party[0].conditions).toHaveLength(1);
  });
  it('losing roll => condition persists and daysSinceOnset increments', () => {
    const out = progressConditions(stateWith(7, {}), never);
    expect(out.party[0].conditions).toHaveLength(1);
    expect(out.party[0].conditions[0].daysSinceOnset).toBe(8);
  });
  it('medicine cure path still fires before the natural roll (fastest path preserved)', () => {
    const s = stateWith(0, {});
    const out = progressConditions({ ...s, inventory: { ...s.inventory, calomel: 5 } }, always);
    expect(out.party[0].conditions).toHaveLength(0);
  });
});
