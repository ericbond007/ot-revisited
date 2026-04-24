import { describe, it, expect } from 'vitest';
import { milesPerDay } from '../src/lib/game/systems/travel';
import { tickOxen } from '../src/lib/game/systems/oxen';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState, Ox } from '../src/lib/game/types';

function newGame(): GameState {
  return createInitialState({
    seed: 'mule-test',
    leader: { name: 'A', profession: 'farmer' },
    companions: [{ name: 'B', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
}

function team(kind: 'ox' | 'mule', n = 4, fatigue = 0): Ox[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${kind}-${i}`,
    health: 100,
    fatigue,
    shod: true,
    kind
  }));
}

describe('mules', () => {
  it('mule team travels faster than an ox team (same wagon, same terrain)', () => {
    const oxState = { ...newGame(), oxen: team('ox', 4) };
    const muleState = { ...newGame(), oxen: team('mule', 4) };
    const oxMiles = milesPerDay(oxState);
    const muleMiles = milesPerDay(muleState);
    expect(muleMiles).toBeGreaterThan(oxMiles);
  });

  it('mule team gets mountain bonus vs oxen in mountain terrain', () => {
    const oxState = {
      ...newGame(),
      oxen: team('ox', 4),
      location: { ...newGame().location, terrain: 'mountains' as const }
    };
    const muleState = {
      ...newGame(),
      oxen: team('mule', 4),
      location: { ...newGame().location, terrain: 'mountains' as const }
    };
    const oxMiles = milesPerDay(oxState);
    const muleMiles = milesPerDay(muleState);
    expect(muleMiles).toBeGreaterThan(oxMiles * 1.3); // >30% edge in mountains
  });

  it('tickOxen consumes 1 lb grain per mule per day', () => {
    const s: GameState = {
      ...newGame(),
      oxen: team('mule', 4),
      inventory: { ...newGame().inventory, grain: 10 }
    };
    const out = tickOxen(s, makeRng('grain-1'));
    expect(out.inventory.grain).toBe(6); // 10 - 4
  });

  it('unfed mules tick fatigue at 2× rate', () => {
    // Same starting fatigue, same pace — the mule-with-grain vs mule-no-grain
    // diff should be substantial.
    const fed: GameState = {
      ...newGame(),
      oxen: team('mule', 4, 20),
      inventory: { ...newGame().inventory, grain: 10 }
    };
    const starved: GameState = {
      ...newGame(),
      oxen: team('mule', 4, 20),
      inventory: { ...newGame().inventory, grain: 0 }
    };
    const fedOut = tickOxen(fed, makeRng('fed'));
    const starvedOut = tickOxen(starved, makeRng('starved'));
    const fedFatigue = fedOut.oxen[0].fatigue;
    const starvedFatigue = starvedOut.oxen[0].fatigue;
    expect(starvedFatigue - 20).toBeGreaterThan((fedFatigue - 20) * 1.5);
  });

  it('oxen ignore grain availability (they graze)', () => {
    const s: GameState = {
      ...newGame(),
      oxen: team('ox', 4),
      inventory: { ...newGame().inventory, grain: 0 }
    };
    const out = tickOxen(s, makeRng('ox-grain'));
    // No log line about unfed oxen — grain only applies to mules.
    const log = out.eventLog.map((e) => e.text).join('\n');
    expect(log.toLowerCase()).not.toMatch(/without feed/);
  });

  it('legacy Ox without kind field is treated as an ox (speed-wise)', () => {
    const legacyOx = team('ox', 4).map(({ kind: _, ...rest }) => rest) as Ox[];
    const legacyState = { ...newGame(), oxen: legacyOx };
    const oxState = { ...newGame(), oxen: team('ox', 4) };
    expect(milesPerDay(legacyState)).toBe(milesPerDay(oxState));
  });
});
