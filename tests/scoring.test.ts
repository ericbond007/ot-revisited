import { describe, it, expect } from 'vitest';
import { score, LUXURY_POINTS } from '../src/lib/game/systems/scoring';
import type { GameState, PartyMember } from '../src/lib/game/types';

function fixture(over: Partial<GameState> = {}): GameState {
  const party: PartyMember[] = [
    { id: 'p1', name: 'A', sex: 'male',   kind: 'adult', isLeader: true,  age: 30, health: 80, conditions: [], dead: false },
    { id: 'p2', name: 'B', sex: 'female', kind: 'adult', isLeader: false, age: 28, health: 70, conditions: [], dead: false },
    { id: 'p3', name: 'C', sex: 'male',   kind: 'adult', isLeader: false, age: 32, health: 60, conditions: [], dead: false }
  ];
  return {
    party,
    inventory: {},
    location: { milesTraveled: 2098, atLandmarkId: 'oregon_city', terrain: 'forest' },
    outcome: 'arrived',
    completed: true,
    ...over
  } as unknown as GameState;
}

describe('score', () => {
  it('arrived + 3 survivors + no luxuries', () => {
    const s = score(fixture());
    // 2098 miles + 3 × 200 + 1000 arrival = 3698
    expect(s.miles).toBe(2098);
    expect(s.survivors).toBe(600);
    expect(s.arrival).toBe(1000);
    expect(s.luxuries).toBe(0);
    expect(s.total).toBe(3698);
  });

  it('grandfather clock contributes 1000 on arrival', () => {
    const s = score(fixture({ inventory: { grandfather_clock: 1 } }));
    expect(s.luxuries).toBe(1000);
    expect(s.total).toBe(3698 + 1000);
    expect(s.luxuryItems[0].id).toBe('grandfather_clock');
    expect(s.luxuryItems[0].points).toBe(1000);
  });

  it('luxuries are zero when the party did not arrive', () => {
    const s = score(fixture({
      inventory: { grandfather_clock: 1, fiddle: 1 },
      outcome: 'wiped',
      location: { milesTraveled: 950, atLandmarkId: null, terrain: 'mountains' } as unknown as GameState['location']
    }));
    expect(s.luxuries).toBe(0);
    expect(s.luxuryItems).toEqual([]);
    expect(s.arrival).toBe(0);
    expect(s.miles).toBe(950);
    // 950 + 600 survivors + 0 arrival + 0 luxuries
    expect(s.total).toBe(1550);
  });

  it('dead party members do not count as survivors', () => {
    const s = score(fixture({
      party: [
        { id: 'p1', name: 'A', sex: 'male', kind: 'adult', isLeader: true,  age: 30, health: 80, conditions: [], dead: false },
        { id: 'p2', name: 'B', sex: 'male', kind: 'adult', isLeader: false, age: 30, health: 0, conditions: [], dead: true, deathDay: 50, deathCause: 'cholera' }
      ] as PartyMember[]
    }));
    expect(s.survivors).toBe(200);
  });

  it('multiple luxuries sum and sort by points descending', () => {
    const s = score(fixture({
      inventory: { grandfather_clock: 1, fiddle: 1, harmonica: 2, tobacco: 5 }
    }));
    // 1×1000 + 1×50 + 2×20 + 5×5 = 1115
    expect(s.luxuries).toBe(1115);
    expect(s.luxuryItems.map((l) => l.id)).toEqual(['grandfather_clock', 'fiddle', 'harmonica', 'tobacco']);
  });

  it('LUXURY_POINTS table is exported and grandfather clock is the top-scoring luxury', () => {
    const max = Math.max(...Object.values(LUXURY_POINTS));
    expect(LUXURY_POINTS.grandfather_clock).toBe(max);
  });
});
