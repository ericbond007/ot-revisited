// #297 — NPC chickens / cows / butter parity. Producer ticks
// (applyEggLay, applyDairy, applyButterChurn) now fire inside
// tickNpcWagon on the wagon synth, so NPC wagons that carry
// chickens / cows / butter_crock get the same daily eggs / milk /
// butter that the player would.
//
// We test the producer functions directly on the wagon synth (the
// path tickNpcWagon takes) rather than driving tickNpcWagon end-to-end
// — same code path, far simpler test setup.

import { describe, it, expect } from 'vitest';
import { synthesizeWagonState, projectWagonDeltas, type TrainEnv } from '../src/lib/game/systems/wagon-synth';
import { applyEggLay } from '../src/lib/game/systems/eggs';
import { applyDairy, applyButterChurn } from '../src/lib/game/systems/dairy';
import { generateTrain } from '../src/lib/game/content/trains';
import { getBotProfile } from '../src/lib/game/content/bot-profiles';
import { makeRng } from '../src/lib/game/rng';
import type { NpcWagonState } from '../src/lib/game/types';

function makeEnv(): TrainEnv {
  return {
    day: 5,
    date: { year: 1844, month: 5, day: 15 },
    location: { milesTraveled: 100, atLandmarkId: null, atLandmark: null, milesToNextLandmark: 50, terrain: 'prairie' } as unknown as TrainEnv['location'],
    weather: 'clear',
    pace: 'steady',
    terrain: 'prairie'
  } as unknown as TrainEnv;
}

function makeWagonWith(inventory: Record<string, number>): NpcWagonState {
  const rng = makeRng('r297');
  const train = generateTrain('s', 1, null, rng);
  const w = train.companions[0];
  return { ...w, inventory: { ...w.inventory, ...inventory } };
}

describe('#297 NPC livestock producer parity', () => {
  it('chickens in inventory → eggs lay via applyEggLay on synth', () => {
    const wagon = makeWagonWith({ chicken: 4, egg: 0 });
    const synth = synthesizeWagonState(wagon, makeEnv());
    const ticked = applyEggLay(synth);
    const projected = projectWagonDeltas(ticked, wagon);
    // 4 hens → 2 eggs/day (Math.floor(chickens/2))
    expect(projected.inventory.egg ?? 0).toBe(2);
  });

  it('no chickens → no eggs (regression)', () => {
    const wagon = makeWagonWith({ chicken: 0, egg: 0 });
    const synth = synthesizeWagonState(wagon, makeEnv());
    const ticked = applyEggLay(synth);
    expect(ticked.inventory.egg ?? 0).toBe(0);
  });

  it('milk cow on good grazing → milk yield via applyDairy', () => {
    const wagon = makeWagonWith({ milk_cow: 2, milk: 0 });
    const synth = synthesizeWagonState(wagon, makeEnv());
    const ticked = applyDairy(synth);
    const projected = projectWagonDeltas(ticked, wagon);
    expect(projected.inventory.milk ?? 0).toBeGreaterThan(0);
  });

  it('milk + butter_crock → butter via applyButterChurn', () => {
    const wagon = makeWagonWith({ milk: 10, butter_crock: 1, butter: 0 });
    const synth = synthesizeWagonState(wagon, makeEnv());
    const ticked = applyButterChurn(synth);
    const projected = projectWagonDeltas(ticked, wagon);
    expect(projected.inventory.butter ?? 0).toBeGreaterThan(0);
  });

  it('Sager profile carries 4 chickens', () => {
    expect(getBotProfile('sager-family').kit?.chicken).toBe(4);
  });

  it('Whitman profile carries 2 milk cows + butter crock', () => {
    expect(getBotProfile('whitman-mission').kit?.milk_cow).toBe(2);
    expect(getBotProfile('whitman-mission').kit?.butter_crock).toBe(1);
  });
});
