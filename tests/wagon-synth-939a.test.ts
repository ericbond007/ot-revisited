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
    expect(s.eventLog).toBe(w.eventLog);
    expect(s.outcome).toBe(w.outcome);
  });

  it('maps wagon water fields into resources block', () => {
    const w = fixtureWagon();
    const s = synthesizeWagonState(w, ENV);
    expect(s.resources.water).toBe(w.water);
    expect(s.resources.waterCap).toBe(w.waterCap);
    expect(s.resources.dirtyWater).toBe(w.dirtyWater);
  });

  it('synthesizes empty flags blob (NPCs do not carry flags)', () => {
    const w = fixtureWagon();
    const s = synthesizeWagonState(w, ENV);
    expect(s.flags).toEqual({});
  });

  it('null wagonTrain prevents engine recursion', () => {
    const w = fixtureWagon();
    const s = synthesizeWagonState(w, ENV);
    expect(s.wagonTrain).toBeNull();
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
});
