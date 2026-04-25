import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/lib/game/engine';
import { ENCOUNTER_EVENTS } from '../src/lib/game/content/encounters';
import { EVENTS } from '../src/lib/game/content/events';
import { resolveEvent } from '../src/lib/game/systems/events';
import { adjustTribeAttitude, getTribeAttitude } from '../src/lib/game/systems/tribe-relations';
import { makeRng } from '../src/lib/game/rng';
import type { GameState } from '../src/lib/game/types';

function newGame(): GameState {
  return createInitialState({
    seed: 'enc',
    leader: { name: 'A', profession: 'farmer' },
    companions: [{ name: 'B', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
}

describe('encounter registry', () => {
  it('registers 9 encounter events into the global pool', () => {
    expect(ENCOUNTER_EVENTS.length).toBe(9);
    const ids = ENCOUNTER_EVENTS.map((e) => e.id);
    for (const id of ids) {
      expect(EVENTS.some((e) => e.id === id)).toBe(true);
    }
  });

  it('each encounter has choices with a default', () => {
    for (const e of ENCOUNTER_EVENTS) {
      expect(e.choices.length).toBeGreaterThan(0);
      expect(e.choices.some((c) => c.isDefault)).toBe(true);
    }
  });
});

describe('native encounter gates', () => {
  function setMile(s: GameState, mile: number): GameState {
    return { ...s, location: { ...s.location, milesTraveled: mile } };
  }

  it('trading-party gate passes when the region tribe is neutral+', () => {
    const s = setMile(newGame(), 550); // Sioux + Cheyenne overlap
    const ev = ENCOUNTER_EVENTS.find((e) => e.id === 'encounter_native_trade')!;
    expect(ev.gate?.(s) ?? true).toBe(true);
  });

  it('trading-party gate fails if all regional tribes are hostile', () => {
    let s = setMile(newGame(), 550);
    s = adjustTribeAttitude(s, 'sioux', -100);
    s = adjustTribeAttitude(s, 'cheyenne', -100);
    const ev = ENCOUNTER_EVENTS.find((e) => e.id === 'encounter_native_trade')!;
    expect(ev.gate?.(s) ?? true).toBe(false);
  });

  it('guide-offer gate needs a friendly+ tribe in region', () => {
    const s = setMile(newGame(), 1000); // Shoshone country (baseline 65 = friendly)
    const ev = ENCOUNTER_EVENTS.find((e) => e.id === 'encounter_native_guide')!;
    expect(ev.gate?.(s) ?? true).toBe(true);
  });

  it('guide-offer gate fails in regions with no friendly tribe', () => {
    const s = setMile(newGame(), 200); // Pawnee only, baseline 55 = neutral
    const ev = ENCOUNTER_EVENTS.find((e) => e.id === 'encounter_native_guide')!;
    expect(ev.gate?.(s) ?? true).toBe(false);
  });
});

describe('native encounter outcomes', () => {
  it('refusing a toll sours the regional tribe', () => {
    const s = {
      ...newGame(),
      location: { ...newGame().location, milesTraveled: 300 } // Sioux region
    };
    const before = getTribeAttitude(s, 'sioux');
    const ev = ENCOUNTER_EVENTS.find((e) => e.id === 'encounter_native_toll')!;
    const after = resolveEvent(s, ev, 'refuse', makeRng('toll'));
    expect(getTribeAttitude(after, 'sioux')).toBeLessThan(before);
  });

  it('accepting a trade offer improves the regional tribe attitude', () => {
    const s = {
      ...newGame(),
      inventory: { ...newGame().inventory, tobacco: 3 },
      location: { ...newGame().location, milesTraveled: 1000 } // Shoshone
    };
    const before = getTribeAttitude(s, 'shoshone');
    const ev = ENCOUNTER_EVENTS.find((e) => e.id === 'encounter_native_trade')!;
    const after = resolveEvent(s, ev, 'trade', makeRng('trade-good'));
    expect(getTribeAttitude(after, 'shoshone')).toBeGreaterThan(before);
    expect(after.inventory.pemmican).toBeGreaterThan(0);
  });
});
