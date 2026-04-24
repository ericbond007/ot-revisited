import { describe, it, expect } from 'vitest';
import { warmthFor, exposureMult } from '../src/lib/game/systems/warmth';
import { createInitialState } from '../src/lib/game/engine';
import type { GameState } from '../src/lib/game/types';

function newGame(): GameState {
  return createInitialState({
    seed: 'warmth',
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [
      { name: 'Mary', profession: 'doctor' },
      { name: 'Tom', profession: 'hunter' },
      { name: 'Sarah', profession: 'teamster' }
    ],
    startDate: { year: 1848, month: 4, day: 15 }
  });
}

describe('warmthFor', () => {
  it('empty inventory → 0', () => {
    const s = { ...newGame(), inventory: {} };
    expect(warmthFor(s)).toBe(0);
  });

  it('one coat per adult → 25 warmth', () => {
    const s = { ...newGame(), inventory: { coat: 4 } };
    expect(warmthFor(s)).toBe(25);
  });

  it('full kit for 4 → 100 (capped)', () => {
    const s = {
      ...newGame(),
      inventory: { coat: 4, blanket: 4, boots: 4, buffalo_robe: 4, moccasins: 4 }
    };
    expect(warmthFor(s)).toBe(100);
  });

  it('extras beyond party size do not stack', () => {
    const four = { ...newGame(), inventory: { coat: 4 } };
    const fourty = { ...newGame(), inventory: { coat: 40 } };
    expect(warmthFor(four)).toBe(warmthFor(fourty));
  });

  it('all-dead party → 0 (no divide by zero)', () => {
    const s = newGame();
    const allDead = { ...s, party: s.party.map((m) => ({ ...m, dead: true })) };
    expect(warmthFor(allDead)).toBe(0);
  });
});

describe('exposureMult', () => {
  it('no clothing → 1.0 (full exposure)', () => {
    const s = { ...newGame(), inventory: {} };
    expect(exposureMult(s)).toBe(1);
  });

  it('full kit → 0.2 (floor)', () => {
    const s = {
      ...newGame(),
      inventory: { coat: 4, blanket: 4, boots: 4, buffalo_robe: 4, moccasins: 4 }
    };
    expect(exposureMult(s)).toBeCloseTo(0.2, 2);
  });

  it('more clothing → lower exposure', () => {
    const none = { ...newGame(), inventory: {} };
    const some = { ...newGame(), inventory: { coat: 4 } };
    const more = { ...newGame(), inventory: { coat: 4, blanket: 4 } };
    expect(exposureMult(none)).toBeGreaterThan(exposureMult(some));
    expect(exposureMult(some)).toBeGreaterThan(exposureMult(more));
  });
});
