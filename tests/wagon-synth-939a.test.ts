// #939a — synthesizeWagonState + projectWagonDeltas round-trip tests.
// Foundation for the unified-tick refactor (#939 umbrella). No engine
// systems are invoked here; this slice is the type bridge only.

import { describe, it, expect } from 'vitest';
import {
  synthesizeWagonState,
  projectWagonDeltas,
  type TrainEnv
} from '../src/lib/game/systems/wagon-synth';
import { generateTrain } from '../src/lib/game/content/trains';
import { makeRng } from '../src/lib/game/rng';
import type { NpcWagonState } from '../src/lib/game/types';

function fixtureWagon(): NpcWagonState {
  const train = generateTrain('synth', 1, 'independence_mo', makeRng('p'), { fresh: true });
  return train.companions[0];
}

const ENV: TrainEnv = {
  day: 5,
  date: { year: 1849, month: 4, day: 20 },
  location: {
    trailPosition: 0.05,
    nextLandmarkId: 'kansas_river',
    previousLandmarkId: 'lone_elm_campground',
    milesTraveled: 90,
    terrain: 'prairie'
  },
  weather: 'clear',
  pace: 'moderate'
};

describe('#939a — synthesizeWagonState', () => {
  it('borrows train-shared fields from env', () => {
    const w = fixtureWagon();
    const s = synthesizeWagonState(w, ENV);
    expect(s.day).toBe(ENV.day);
    expect(s.date).toEqual(ENV.date);
    expect(s.location).toBe(ENV.location);
    expect(s.weather).toBe(ENV.weather);
    expect(s.pace).toBe(ENV.pace);
  });

  it('exposes wagon-local fields verbatim', () => {
    const w = fixtureWagon();
    const s = synthesizeWagonState(w, ENV);
    expect(s.seed).toBe(w.seed);
    expect(s.party).toBe(w.party);
    expect(s.wagon).toBe(w.wagon);
    expect(s.oxen).toBe(w.oxen);
    expect(s.inventory).toBe(w.inventory);
    expect(s.cash).toBe(w.cash);
    expect(s.morale).toBe(w.morale);
    expect(s.rations).toBe(w.rations);
    expect(s.outcome).toBe(w.outcome);
    // #939a-2 — synth's eventLog is empty so engine appends can be
    // isolated; the projection concatenates them onto the NPC's log.
    expect(s.eventLog).toEqual([]);
  });

  it('maps wagon water fields into resources block', () => {
    const w = fixtureWagon();
    const s = synthesizeWagonState(w, ENV);
    expect(s.resources.water).toBe(w.water);
    expect(s.resources.waterCap).toBe(w.waterCap);
    expect(s.resources.dirtyWater).toBe(w.dirtyWater);
  });

  it('synthesizes flags from NPC typed counters (spoilDays / dryDays / greaseMiles)', () => {
    // #939a-2 — fields used to be empty; now bridged into the engine's
    // magic-string flag keys so applySpoilage / applyDehydration /
    // applyAxleGrease can read them.
    const w: NpcWagonState = {
      ...fixtureWagon(),
      spoilDays: { game_meat: 12, egg: 25 },
      dryDays: 3,
      greaseMiles: 420
    };
    const s = synthesizeWagonState(w, ENV);
    expect(s.flags._gameMeatSpoilDay).toBe(12);
    expect(s.flags._eggSpoilDay).toBe(25);
    expect(s.flags._dehydrationDays).toBe(3);
    expect(s.flags._greaseSinceLastDose).toBe(420);
  });

  it('omits flag entries when NPC fields are absent / zero', () => {
    const w: NpcWagonState = {
      ...fixtureWagon(),
      spoilDays: undefined,
      dryDays: 0,
      greaseMiles: undefined
    };
    const s = synthesizeWagonState(w, ENV);
    expect(s.flags._gameMeatSpoilDay).toBeUndefined();
    expect(s.flags._dehydrationDays).toBeUndefined();
    expect(s.flags._greaseSinceLastDose).toBeUndefined();
  });

  it('wagonTrain stub: truthy so morale.ts:54 train clamp fires, empty companions to prevent recursion', () => {
    // #939a-2 — was `null` in initial slice; flipped to stub so NPCs
    // get the in-train +1 morale/day. Companions stay empty so any
    // future engine system iterating the roster sees no recursion.
    const w = fixtureWagon();
    const s = synthesizeWagonState(w, ENV);
    expect(s.wagonTrain).toBeTruthy();
    expect(s.wagonTrain!.companions).toEqual([]);
  });

  it('completed flag mirrors outcome', () => {
    const w = fixtureWagon();
    const live = synthesizeWagonState({ ...w, outcome: 'in-progress' }, ENV);
    const wiped = synthesizeWagonState({ ...w, outcome: 'wiped' }, ENV);
    expect(live.completed).toBe(false);
    expect(wiped.completed).toBe(true);
  });
});

describe('#939a — projectWagonDeltas', () => {
  it('round-trip with no engine mutation returns equivalent wagon state', () => {
    const w = fixtureWagon();
    const ticked = synthesizeWagonState(w, ENV);
    const projected = projectWagonDeltas(ticked, w);
    // Field-by-field equivalence (object refs may differ but values match).
    expect(projected.party).toBe(w.party);
    expect(projected.inventory).toBe(w.inventory);
    expect(projected.oxen).toBe(w.oxen);
    expect(projected.morale).toBe(w.morale);
    expect(projected.cash).toBe(w.cash);
    expect(projected.water).toBe(w.water);
    expect(projected.outcome).toBe(w.outcome);
  });

  it('preserves wagon-only identity fields (id, name, seed)', () => {
    const w = fixtureWagon();
    const ticked = synthesizeWagonState(w, ENV);
    const projected = projectWagonDeltas(ticked, w);
    expect(projected.id).toBe(w.id);
    expect(projected.name).toBe(w.name);
    expect(projected.seed).toBe(w.seed);
    expect(projected.leaderProfession).toBe(w.leaderProfession);
    expect(projected.personaId).toBe(w.personaId);
  });

  it('captures engine deltas on wagon-local fields', () => {
    const w = fixtureWagon();
    const ticked = synthesizeWagonState(w, ENV);
    // Simulate an engine system that drained water + bumped morale.
    const mutated = {
      ...ticked,
      resources: { ...ticked.resources, water: ticked.resources.water - 3 },
      morale: ticked.morale + 5
    };
    const projected = projectWagonDeltas(mutated, w);
    expect(projected.water).toBe(w.water - 3);
    expect(projected.morale).toBe(w.morale + 5);
  });

  it('does NOT project train-shared fields (location, date stay on env)', () => {
    const w = fixtureWagon();
    const ticked = synthesizeWagonState(w, ENV);
    // If an engine system accidentally mutated env-borrowed fields,
    // those changes must NOT leak into the wagon.
    const mutated = {
      ...ticked,
      location: { ...ticked.location, milesTraveled: 9999 }
    };
    const projected = projectWagonDeltas(mutated, w);
    // NpcWagonState has no `location` field — proof that the bad
    // engine delta got dropped on the floor.
    expect((projected as unknown as { location?: unknown }).location).toBeUndefined();
  });

  it('#939a-2 — appends engine eventLog entries onto the NPC log', () => {
    const w: NpcWagonState = {
      ...fixtureWagon(),
      eventLog: [{ day: 4, text: 'Yesterday: rain.' }]
    };
    const ticked = synthesizeWagonState(w, ENV);
    // Simulate an engine system that pushed two entries.
    const mutated = {
      ...ticked,
      eventLog: [
        { day: 5, text: '5 lb of game meat spoiled.' },
        { day: 5, text: 'Bacon turned in the heat.' }
      ]
    };
    const projected = projectWagonDeltas(mutated, w);
    expect(projected.eventLog).toHaveLength(3);
    expect(projected.eventLog[0].text).toBe('Yesterday: rain.');
    expect(projected.eventLog[1].text).toMatch(/spoiled/);
    expect(projected.eventLog[2].text).toMatch(/Bacon/);
  });

  it('#939a-2 — round-trips spoilDays (engine updates flag → projection reads back into wagon.spoilDays)', () => {
    const w: NpcWagonState = {
      ...fixtureWagon(),
      spoilDays: { game_meat: 10 }
    };
    const ticked = synthesizeWagonState(w, ENV);
    // Engine sets a new clock (e.g., chickens laid → eggs got a clock)
    const mutated = {
      ...ticked,
      flags: { ...ticked.flags, _eggSpoilDay: 22 }
    };
    const projected = projectWagonDeltas(mutated, w);
    expect(projected.spoilDays?.game_meat).toBe(10);
    expect(projected.spoilDays?.egg).toBe(22);
  });

  it('#939a-2 — round-trips dryDays + greaseMiles', () => {
    const w: NpcWagonState = {
      ...fixtureWagon(),
      dryDays: 2,
      greaseMiles: 100
    };
    const ticked = synthesizeWagonState(w, ENV);
    // Engine advanced both counters
    const mutated = {
      ...ticked,
      flags: {
        ...ticked.flags,
        _dehydrationDays: 3,
        _greaseSinceLastDose: 120
      }
    };
    const projected = projectWagonDeltas(mutated, w);
    expect(projected.dryDays).toBe(3);
    expect(projected.greaseMiles).toBe(120);
  });

  it('#939a-3 — engine clears the LAST spoil flag → projection drops the stale clock (was bug)', () => {
    // Pre-#939a-3 the projection fell back to `original.spoilDays` when
    // no spoil-flag entries remained in `ticked.flags`, leaking the
    // stale clock on a spoiled-and-cleared pile. After the fix,
    // projection reflects exactly what the engine wrote: empty.
    const w: NpcWagonState = {
      ...fixtureWagon(),
      spoilDays: { game_meat: 5 }
    };
    const ticked = synthesizeWagonState(w, ENV);
    const cleared = { ...ticked.flags };
    delete (cleared as Record<string, unknown>)._gameMeatSpoilDay;
    const mutated = { ...ticked, flags: cleared };
    const projected = projectWagonDeltas(mutated, w);
    expect(projected.spoilDays?.game_meat).toBeUndefined();
    expect(projected.spoilDays).toEqual({});
  });

  it('#939a-3 — engine clears ONE of two spoil flags → only the cleared key drops', () => {
    const w: NpcWagonState = {
      ...fixtureWagon(),
      spoilDays: { game_meat: 15, egg: 25 }
    };
    const ticked = synthesizeWagonState(w, ENV);
    const cleared = { ...ticked.flags };
    delete (cleared as Record<string, unknown>)._gameMeatSpoilDay;
    const mutated = { ...ticked, flags: cleared };
    const projected = projectWagonDeltas(mutated, w);
    expect(projected.spoilDays?.game_meat).toBeUndefined();
    expect(projected.spoilDays?.egg).toBe(25);
  });
});
