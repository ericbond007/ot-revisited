import { describe, it, expect } from 'vitest';
import { careLevel } from '../src/lib/game/systems/care';
import { createInitialState } from '../src/lib/game/engine';
import type { GameState } from '../src/lib/game/types';

function base(): GameState {
  const s = createInitialState({
    seed: 'care1046',
    leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'farmer' }],
    startDate: { year: 1849, month: 6, day: 15 }
  });
  return { ...s, morale: 60, resources: { ...s.resources, water: 20 } };
}

describe('#1046 A+D — careLevel', () => {
  it('fed + watered + morale>=25, no doctor => tended', () => {
    expect(careLevel(base())).toBe('tended');
  });
  it('live doctor => doctor (even on a thin day)', () => {
    const s = base();
    const doc = { ...s.party[0], profession: 'doctor' as const };
    const thin = { ...s, party: [doc, s.party[1]], inventory: {}, resources: { ...s.resources, water: 0 }, morale: 10 };
    expect(careLevel(thin)).toBe('doctor');
  });
  it('no food => untended', () => {
    expect(careLevel({ ...base(), inventory: {} })).toBe('untended');
  });
  it('water == 0 (dry-streak) => untended', () => {
    expect(careLevel({ ...base(), resources: { ...base().resources, water: 0 } })).toBe('untended');
  });
  it('morale < 25 => untended', () => {
    expect(careLevel({ ...base(), morale: 24 })).toBe('untended');
  });
});
