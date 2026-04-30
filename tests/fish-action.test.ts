import { describe, it, expect } from 'vitest';
import { getCampAction } from '../src/lib/game/actions/camp-actions';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState } from '../src/lib/game/types';

function newGame(): GameState {
  const s = createInitialState({
    seed: 'fish-test',
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [{ name: 'Mary', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
  return { ...s, inventory: {} };
}

describe('fish camp action (#197)', () => {
  const fish = getCampAction('fish');

  it('is unavailable without any fishing gear', () => {
    const s = newGame();
    const av = fish.availability(s);
    expect(av.available).toBe(false);
    expect(av.reason).toMatch(/line/i);
  });

  it('is unavailable in desert even with gear', () => {
    const s = newGame();
    const desertS = {
      ...s,
      inventory: { fishing_line: 1 },
      location: { ...s.location, terrain: 'desert' as const }
    };
    expect(fish.availability(desertS).available).toBe(false);
  });

  it('is available with a line and prairie terrain', () => {
    const s = newGame();
    const ready = { ...s, inventory: { fishing_line: 1 } };
    expect(fish.availability(ready).available).toBe(true);
  });

  it('yields fresh game meat at a river crossing', () => {
    const s = newGame();
    const atRiver = {
      ...s,
      inventory: { fishing_rod: 1 },
      location: { ...s.location, terrain: 'river' as const }
    };
    const next = fish.apply(atRiver, makeRng('fish:river:1'));
    expect((next.inventory.game_meat ?? 0)).toBeGreaterThan(0);
    expect(next.flags._gameMeatSpoilDay).toBeDefined();
  });

  it('net out-yields a hand-line on average', () => {
    const s = newGame();
    const lineState = {
      ...s,
      inventory: { fishing_line: 1 },
      location: { ...s.location, terrain: 'river' as const }
    };
    const netState = {
      ...s,
      inventory: { fishing_net: 1 },
      location: { ...s.location, terrain: 'river' as const }
    };
    let lineTotal = 0;
    let netTotal = 0;
    for (let i = 0; i < 50; i++) {
      lineTotal += fish.apply(lineState, makeRng(`fish:line:${i}`)).inventory.game_meat ?? 0;
      netTotal  += fish.apply(netState,  makeRng(`fish:net:${i}`)).inventory.game_meat ?? 0;
    }
    expect(netTotal).toBeGreaterThan(lineTotal * 1.5);
  });
});
