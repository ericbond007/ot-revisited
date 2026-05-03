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
    location: { milesTraveled: 2195, atLandmarkId: 'oregon_city', terrain: 'forest' },
    outcome: 'arrived',
    completed: true,
    ...over
  } as unknown as GameState;
}

describe('score', () => {
  it('arrived + 3 survivors + no luxuries', () => {
    const s = score(fixture());
    // 2195 miles + 3 × 200 + 1000 arrival = 3795
    expect(s.miles).toBe(2195);
    expect(s.survivors).toBe(600);
    expect(s.arrival).toBe(1000);
    expect(s.luxuries).toBe(0);
    expect(s.total).toBe(3795);
  });

  it('grandfather clock contributes 1000 on arrival', () => {
    const s = score(fixture({ inventory: { grandfather_clock: 1 } }));
    expect(s.luxuries).toBe(1000);
    expect(s.total).toBe(3795 + 1000);
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
      inventory: { grandfather_clock: 1, fiddle: 1, harmonica: 2, buffalo_robe: 1 }
    }));
    // 1×1000 + 1×50 + 2×20 + 1×25 = 1115
    expect(s.luxuries).toBe(1115);
    // Sort is by total points: harmonica 2×20=40 beats buffalo_robe 1×25=25.
    expect(s.luxuryItems.map((l) => l.id)).toEqual(['grandfather_clock', 'fiddle', 'harmonica', 'buffalo_robe']);
  });

  it('LUXURY_POINTS table includes #277 frontier-startup items, with printing press as the top-scoring haul', () => {
    const max = Math.max(...Object.values(LUXURY_POINTS));
    // #277 — printing press is the period-headline haul (Brannan
    // 1846 California Star), bumping above the grandfather clock.
    expect(LUXURY_POINTS.printing_press).toBe(max);
    expect(LUXURY_POINTS.printing_press).toBe(2500);
    // Sanity check: the case-study items all clear 1000.
    for (const id of ['anvil', 'fruit_tree_saplings', 'medicine_chest', 'carpenter_chest', 'grandfather_clock']) {
      expect(LUXURY_POINTS[id]).toBeGreaterThanOrEqual(1000);
    }
  });

  it('#277 epilogue paragraphs surface for delivered frontier-startup items, ordered by point value', () => {
    const s = score(fixture({
      inventory: { fruit_tree_saplings: 1, garden_seeds: 1, plow: 1 }
    }));
    expect(s.epilogueLines.length).toBe(3);
    expect(s.epilogueLines[0].id).toBe('fruit_tree_saplings'); // highest points
    expect(s.epilogueLines[0].line).toMatch(/orchard/i);
    expect(s.epilogueLines.map((e) => e.id)).toEqual(['fruit_tree_saplings', 'plow', 'garden_seeds']);
  });

  it('#277 epilogue paragraphs are empty when the party did not arrive', () => {
    const s = score(fixture({
      inventory: { anvil: 1, grandfather_clock: 1 },
      outcome: 'wiped'
    }));
    expect(s.epilogueLines).toEqual([]);
  });
});
