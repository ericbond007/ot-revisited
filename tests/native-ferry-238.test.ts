import { describe, it, expect } from 'vitest';
import {
  ford,
  NATIVE_FERRY_MIN_ATTITUDE,
  NATIVE_FERRY_ATTITUDE_BUMP,
  type RiverState
} from '../src/lib/game/actions/ford';
import { getLandmark } from '../src/lib/game/content/landmarks';
import { getTribeAttitude, adjustTribeAttitude } from '../src/lib/game/systems/tribe-relations';
import { createInitialState } from '../src/lib/game/engine';
import type { GameState } from '../src/lib/game/types';

function newGame(): GameState {
  return createInitialState({
    seed: 'native-ferry',
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [{ name: 'Mary', profession: 'doctor', sex: 'female' }],
    startDate: { year: 1848, month: 6, day: 1 }
  });
}

const greenRiver: RiverState = {
  depthFt: 4.5,
  currentMph: 4,
  ferryPrice: 8,
  nativeFerry: { tribeId: 'shoshone', priceItem: 'beads', priceQty: 6, blurb: 'Shoshone bull-boat — 6 strings of beads' }
};

describe('#238 native ferry config', () => {
  it('Green River carries a Shoshone native-ferry option', () => {
    const lm = getLandmark('green_river');
    expect(lm.river?.nativeFerry).toBeDefined();
    expect(lm.river?.nativeFerry?.tribeId).toBe('shoshone');
    expect(lm.river?.nativeFerry?.priceItem).toBe('beads');
  });

  it('Three Island Crossing carries a Shoshone native-ferry option', () => {
    const lm = getLandmark('snake_three_island');
    expect(lm.river?.nativeFerry).toBeDefined();
    expect(lm.river?.nativeFerry?.tribeId).toBe('shoshone');
  });

  it('Kansas-River-tier crossings stay un-tribed', () => {
    expect(getLandmark('kansas_river').river?.nativeFerry).toBeUndefined();
    expect(getLandmark('big_blue_river').river?.nativeFerry).toBeUndefined();
  });
});

describe('#238 native ferry crossing', () => {
  it('crosses in one day — beads deducted, attitude bumped', () => {
    const s0: GameState = {
      ...newGame(),
      inventory: { ...newGame().inventory, beads: 10 },
      location: { ...newGame().location, atLandmarkId: 'green_river' }
    };
    const before = getTribeAttitude(s0, 'shoshone');
    const after = ford(s0, { method: 'native_ferry', river: greenRiver });
    expect(after.inventory.beads).toBe(4);
    expect(after.day).toBe(s0.day + 1);
    expect(after.location.atLandmarkId).toBeNull();
    expect(getTribeAttitude(after, 'shoshone')).toBe(before + NATIVE_FERRY_ATTITUDE_BUMP);
  });

  it('logs a beads-traded line', () => {
    const s0: GameState = {
      ...newGame(),
      inventory: { ...newGame().inventory, beads: 10 }
    };
    const after = ford(s0, { method: 'native_ferry', river: greenRiver });
    const last = after.eventLog[after.eventLog.length - 1].text;
    expect(last).toMatch(/native ferry/i);
    expect(last).toMatch(/beads/i);
  });

  it('throws when the river has no nativeFerry config', () => {
    const s0 = newGame();
    const plainRiver: RiverState = { depthFt: 4, currentMph: 3, ferryPrice: 5 };
    expect(() => ford(s0, { method: 'native_ferry', river: plainRiver })).toThrow(/native-ferry/i);
  });

  it('throws when the tribe is not friendly enough', () => {
    let s0: GameState = {
      ...newGame(),
      inventory: { ...newGame().inventory, beads: 10 }
    };
    // Drop Shoshone below the threshold (baseline 65 → drop 30 → 35).
    s0 = adjustTribeAttitude(s0, 'shoshone', -(65 - (NATIVE_FERRY_MIN_ATTITUDE - 5)));
    expect(getTribeAttitude(s0, 'shoshone')).toBeLessThan(NATIVE_FERRY_MIN_ATTITUDE);
    expect(() => ford(s0, { method: 'native_ferry', river: greenRiver })).toThrow(/friendly/i);
  });

  it('throws when the party cannot pay', () => {
    const s0: GameState = {
      ...newGame(),
      inventory: { ...newGame().inventory, beads: 2 }
    };
    expect(() => ford(s0, { method: 'native_ferry', river: greenRiver })).toThrow(/beads/i);
  });

  it('records FordResult with the new method tag', () => {
    const s0: GameState = {
      ...newGame(),
      inventory: { ...newGame().inventory, beads: 10 }
    };
    const after = ford(s0, { method: 'native_ferry', river: greenRiver });
    const result = after.flags._fordResult as { method: string; crossed: boolean; daysElapsed: number };
    expect(result.method).toBe('native_ferry');
    expect(result.crossed).toBe(true);
    expect(result.daysElapsed).toBe(1);
  });
});
