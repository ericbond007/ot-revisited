import { describe, it, expect } from 'vitest';
import { applySpoilage, computeSpoilDay, GAME_MEAT_FRESH_DAYS } from '../src/lib/game/systems/spoilage';
import { createInitialState } from '../src/lib/game/engine';
import type { GameState } from '../src/lib/game/types';

function newGame(): GameState {
  return createInitialState({
    seed: 'spoil-test',
    leader: { name: 'A', profession: 'farmer' },
    companions: [{ name: 'B', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
}

describe('spoilage', () => {
  it('computeSpoilDay adds GAME_MEAT_FRESH_DAYS to current day', () => {
    expect(computeSpoilDay(10)).toBe(10 + GAME_MEAT_FRESH_DAYS);
  });

  it('no-op when no spoil flag is set', () => {
    const s = newGame();
    const out = applySpoilage(s);
    expect(out).toBe(s);
  });

  it('no-op before the spoil day', () => {
    const s = {
      ...newGame(),
      day: 10,
      inventory: { ...newGame().inventory, game_meat: 50 },
      flags: { _gameMeatSpoilDay: 13 }
    };
    const out = applySpoilage(s);
    expect(out.inventory.game_meat).toBe(50);
    // flag is now temperature-nudged each tick (cool day pushes it out)
    expect(typeof out.flags._gameMeatSpoilDay).toBe('number');
  });

  it('zeros out meat and logs on the spoil day', () => {
    const s = {
      ...newGame(),
      day: 20,
      inventory: { ...newGame().inventory, game_meat: 75 },
      flags: { _gameMeatSpoilDay: 13 }
    };
    const out = applySpoilage(s);
    expect(out.inventory.game_meat).toBe(0);
    expect(out.flags._gameMeatSpoilDay).toBeUndefined();
    const lastLog = out.eventLog[out.eventLog.length - 1];
    expect(lastLog.text).toMatch(/spoiled/i);
    expect(lastLog.text).toContain('75');
  });

  it('zeros out meat and logs when past the spoil day', () => {
    const s = {
      ...newGame(),
      day: 20,
      inventory: { ...newGame().inventory, game_meat: 40 },
      flags: { _gameMeatSpoilDay: 13 }
    };
    const out = applySpoilage(s);
    expect(out.inventory.game_meat).toBe(0);
    expect(out.flags._gameMeatSpoilDay).toBeUndefined();
  });

  it('clears a stale spoil flag when no meat remains', () => {
    // The party ate all the meat before spoil day — flag should be cleaned
    // up so a future hunt doesn't inherit a pre-set clock.
    const s = {
      ...newGame(),
      day: 11,
      inventory: { ...newGame().inventory, game_meat: 0 },
      flags: { _gameMeatSpoilDay: 13 }
    };
    const out = applySpoilage(s);
    expect(out.flags._gameMeatSpoilDay).toBeUndefined();
    // No log line when there was nothing to spoil.
    expect(out.eventLog.length).toBe(s.eventLog.length);
  });
});
