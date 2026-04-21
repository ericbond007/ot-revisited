import { describe, it, expect } from 'vitest';
import { rest } from '../../src/lib/game/actions/rest';
import { createInitialState } from '../../src/lib/game/engine';
import type { Ox } from '../../src/lib/game/types';

function newGame() {
  const s = createInitialState({
    seed: 'rest-test',
    leader: { name: 'A', profession: 'farmer' },
    companions: [{ name: 'B', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
  const oxen: Ox[] = [
    { id: 'o1', health: 100, fatigue: 80, shod: true },
    { id: 'o2', health: 100, fatigue: 80, shod: true }
  ];
  return { ...s, oxen };
}

describe('rest', () => {
  it('advances the day counter by the rest days', () => {
    const s = newGame();
    const r = rest(s, 3);
    expect(r.day).toBe(s.day + 3);
  });

  it('consumes food across the rest period', () => {
    const s = newGame();
    const startingFlour = s.inventory.flour ?? 0;
    const r = rest(s, 3);
    expect(r.inventory.flour).toBeLessThan(startingFlour);
  });

  it('recovers ox fatigue substantially', () => {
    const s = newGame();
    const r = rest(s, 3);
    expect(r.oxen[0].fatigue).toBeLessThan(30);
  });

  it('does not advance trail position', () => {
    const s = newGame();
    const r = rest(s, 3);
    expect(r.location.milesTraveled).toBe(s.location.milesTraveled);
  });

  it('restores injured member health', () => {
    const s = newGame();
    s.party[1].health = 40;
    const r = rest(s, 5);
    expect(r.party[1].health).toBeGreaterThan(40);
  });

  it('logs the rest period', () => {
    const s = newGame();
    const r = rest(s, 2);
    expect(r.eventLog[r.eventLog.length - 1].text).toMatch(/rest/i);
  });

  it('rejects non-positive days', () => {
    const s = newGame();
    expect(() => rest(s, 0)).toThrow();
    expect(() => rest(s, -1)).toThrow();
  });

  it('is deterministic', () => {
    const a = rest(newGame(), 3);
    const b = rest(newGame(), 3);
    expect(a).toEqual(b);
  });
});
