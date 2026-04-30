import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/lib/game/engine';
import { getCampAction, hourCostFor } from '../src/lib/game/actions/camp-actions';
import type { GameState } from '../src/lib/game/types';

function newGame(over: Partial<GameState> = {}): GameState {
  const s = createInitialState({
    seed: 'audit-195',
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [{ name: 'Mary', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
  return { ...s, ...over };
}

describe('camp-actions audit (#195)', () => {
  it('read_bible costs 1 hr (was 2)', () => {
    const action = getCampAction('read_bible');
    const s = newGame({ inventory: { bible: 1 } });
    expect(hourCostFor(action, s)).toBe(1);
  });

  it('find_water unavailable in desert', () => {
    const action = getCampAction('find_water');
    const desert = newGame({
      location: { ...newGame().location, terrain: 'desert' },
      resources: { water: 0, waterCap: 30, dirtyWater: 0, firewood: 50 }
    });
    expect(action.availability(desert).available).toBe(false);
  });

  it('find_water available in prairie + water-room', () => {
    const action = getCampAction('find_water');
    const prairie = newGame({
      location: { ...newGame().location, terrain: 'prairie' },
      resources: { water: 0, waterCap: 30, dirtyWater: 0, firewood: 50 }
    });
    expect(action.availability(prairie).available).toBe(true);
  });

  it('find_water still gates on full kegs in non-desert', () => {
    const action = getCampAction('find_water');
    const full = newGame({
      location: { ...newGame().location, terrain: 'forest' },
      resources: { water: 30, waterCap: 30, dirtyWater: 0, firewood: 50 }
    });
    expect(action.availability(full).available).toBe(false);
  });
});
