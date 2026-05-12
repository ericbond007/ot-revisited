// #939n — Save format coverage for the NpcWagonState fields the unified
// tick refactor (umbrella #939) introduced or made meaningful:
//   - spoilDays   (#295 / #939b — per-pile spoil clocks)
//   - greaseMiles (#300 / #939h — axle-grease cycle)
//   - starvationDays (#939f — accumulating starvation counter)
//
// All three are typed optional on NpcWagonState, so no save-version bump
// is needed: pre-#939 v3 saves missing them still load (engine treats
// missing as default). This file pins both directions:
//   1. Round-trip — saves with the new fields populated come back intact.
//   2. Forward-compat — v3 saves WITHOUT the new fields load + tick.

import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/lib/game/engine';
import { serialize, deserialize } from '../src/lib/game/saves';
import { joinTrain } from '../src/lib/game/systems/wagon-train';
import { tickNpcWagon } from '../src/lib/game/systems/npc-engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState, NpcWagonState } from '../src/lib/game/types';

function game(): GameState {
  return createInitialState({
    seed: 'mig-939n',
    leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'doctor' }],
    startDate: { year: 1849, month: 4, day: 15 }
  });
}

describe('#939n — save format round-trip for #939 NpcWagonState fields', () => {
  it('serializes + deserializes spoilDays / greaseMiles / starvationDays intact', () => {
    let s = joinTrain(game(), makeRng('rt')).state;
    s = {
      ...s,
      wagonTrain: {
        ...s.wagonTrain!,
        companions: s.wagonTrain!.companions.map((c, i) =>
          i === 0
            ? {
                ...c,
                spoilDays: { game_meat: 12, berries: 8 },
                greaseMiles: 327,
                starvationDays: 3
              }
            : c
        )
      }
    };
    const restored = deserialize(serialize(s));
    const w = restored.wagonTrain!.companions[0];
    expect(w.spoilDays).toEqual({ game_meat: 12, berries: 8 });
    expect(w.greaseMiles).toBe(327);
    expect(w.starvationDays).toBe(3);
  });
});

describe('#939n — pre-#939 v3 save forward-compat', () => {
  function pre939Save(): string {
    // Build a v3 save then strip the #939-era fields off each
    // companion to mimic a save written before the umbrella landed.
    const s = joinTrain(game(), makeRng('pre')).state;
    return JSON.stringify({
      version: 3,
      state: {
        ...s,
        wagonTrain: {
          ...s.wagonTrain!,
          companions: s.wagonTrain!.companions.map((c) => {
            const { spoilDays, greaseMiles, starvationDays, ...rest } = c;
            return rest;
          })
        }
      }
    });
  }

  it('loads cleanly with the #939 fields absent', () => {
    const restored = deserialize(pre939Save());
    for (const c of restored.wagonTrain!.companions) {
      expect(c.spoilDays).toBeUndefined();
      expect(c.greaseMiles).toBeUndefined();
      expect(c.starvationDays).toBeUndefined();
    }
  });

  it('ticks one day without throwing — engine systems treat missing fields as defaults', () => {
    const restored = deserialize(pre939Save());
    const wagon = restored.wagonTrain!.companions[0];
    const result = tickNpcWagon(
      wagon,
      {
        day: 1,
        traveled: true,
        pace: 'moderate',
        terrain: 'prairie',
        weather: 'clear',
        traveledMiles: 14
      },
      makeRng('tick-pre')
    );
    // The tick survived and produced a valid wagon. Engine systems may
    // or may not populate the new fields this tick; we only assert no
    // crash and the wagon stays alive (no parties wipe in a single
    // travel day from a fresh-load fixture).
    expect(result.wagon.outcome).toBe('in-progress');
  });
});
