// #1264 T5 — NPC ox-hydration parity. Mirror test for tickNpcWagon:
// on a dry desert travel day, ox hydration drains; on a watered
// day, a parched ox refills. Mirrors the player engine behavior and
// confirms the synth/project bridge carries terrain correctly.

import { describe, it, expect } from 'vitest';
import { generateTrain } from '../src/lib/game/content/trains';
import { tickNpcWagon, type NpcTickContext } from '../src/lib/game/systems/npc-engine';
import { makeRng } from '../src/lib/game/rng';

function freshTrain(seed = 'npc-1264') {
  return generateTrain(seed, 1, 'independence_mo', makeRng(seed), { fresh: true });
}

/** A desert location before Fort Boise — terrain=desert, no waterSource
 *  landmark at the current position, so isWateredDay() returns false. */
const DESERT_LOCATION = {
  trailPosition: 1385,
  milesTraveled: 1385,
  terrain: 'desert' as const,
  nextLandmarkId: 'ft_boise',
  previousLandmarkId: 'salmon_falls',
  atLandmarkId: undefined
};

/** A prairie location at the start — terrain=prairie, so isWateredDay()
 *  returns true. */
const PRAIRIE_LOCATION = {
  trailPosition: 40,
  milesTraveled: 40,
  terrain: 'prairie' as const,
  nextLandmarkId: 'kansas_river',
  previousLandmarkId: 'lone_elm_campground',
  atLandmarkId: undefined
};

function ctx(over: Partial<NpcTickContext> = {}): NpcTickContext {
  return {
    day: 1,
    traveled: true,
    pace: 'moderate',
    terrain: 'desert',
    weather: 'clear',
    ...over
  };
}

describe('#1264 — NPC ox-hydration parity', () => {
  it('drains ox hydration on a dry desert travel day', () => {
    const wagon = freshTrain().companions[0];
    // Fresh wagon: all ox hydration defaults to 100 (undefined → 100 via oxHydration()).
    const oxBefore = wagon.oxen[0];
    expect(oxBefore.hydration ?? 100).toBe(100);

    const { wagon: next } = tickNpcWagon(
      wagon,
      ctx({ terrain: 'desert', location: DESERT_LOCATION }),
      makeRng('npc-1264-dry')
    );
    expect(next.oxen[0].hydration).toBeDefined();
    expect(next.oxen[0].hydration!).toBeLessThan(100);
  });

  it('refills parched NPC ox on a watered (prairie) travel day', () => {
    const base = freshTrain('npc-1264-prairie').companions[0];
    // Stage a parched wagon (hydration 25 — below HYDRATION_AMBER 50).
    const wagon = {
      ...base,
      oxen: base.oxen.map((o) => ({ ...o, hydration: 25 }))
    };

    const { wagon: next } = tickNpcWagon(
      wagon,
      ctx({ terrain: 'prairie', location: PRAIRIE_LOCATION }),
      makeRng('npc-1264-wet')
    );
    // On a watered day, isWateredDay(synth) = true → oxen refill to 100.
    expect(next.oxen[0].hydration).toBe(100);
  });
});
