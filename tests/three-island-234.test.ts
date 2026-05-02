import { describe, it, expect } from 'vitest';
import {
  LANDMARK_APPROACH_EVENTS,
  pickApproachEvent
} from '../src/lib/game/content/landmark-approach-events';
import { milesToLandmark, applyTravel } from '../src/lib/game/systems/travel';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import { LANDMARKS } from '../src/lib/game/content/landmarks';
import type { GameState } from '../src/lib/game/types';

function newGame(over: Partial<GameState> = {}): GameState {
  const s = createInitialState({
    seed: 'three-island-234',
    leader: { name: 'Ezra', profession: 'banker' },
    companions: [{ name: 'Mary', profession: 'farmer' }],
    startDate: { year: 1848, month: 5, day: 1 }
  });
  return { ...s, ...over };
}

function runningMilesTo(id: string): number {
  let sum = 0;
  for (const l of LANDMARKS) {
    sum += l.milesFromPrevious;
    if (l.id === id) return sum;
  }
  return sum;
}

function setMilesAndNext(s: GameState, milesTraveled: number, nextLandmarkId: string): GameState {
  return {
    ...s,
    location: { ...s.location, milesTraveled, nextLandmarkId }
  };
}

describe('#234 Three Island Crossing — approach event', () => {
  it('event is registered at 10 mi out', () => {
    const entry = LANDMARK_APPROACH_EVENTS.find((e) => e.landmarkId === 'snake_three_island');
    expect(entry).toBeDefined();
    expect(entry!.milesAway).toBe(10);
    expect(entry!.event.id).toBe('approach_three_island_routes');
  });

  it('has both ford and detour choices', () => {
    const entry = LANDMARK_APPROACH_EVENTS.find((e) => e.landmarkId === 'snake_three_island')!;
    const ids = entry.event.choices.map((c) => c.id);
    expect(ids).toContain('ford_north');
    expect(ids).toContain('detour_south');
  });

  it('fires when within 10 mi of snake_three_island', () => {
    const milesToTI = runningMilesTo('snake_three_island');
    const s = setMilesAndNext(newGame(), milesToTI - 8, 'snake_three_island');
    const picked = pickApproachEvent(s, (id) => milesToLandmark(s, id));
    expect(picked?.landmarkId).toBe('snake_three_island');
  });

  it('does not fire 30 mi out', () => {
    const milesToTI = runningMilesTo('snake_three_island');
    const s = setMilesAndNext(newGame(), milesToTI - 30, 'snake_three_island');
    const picked = pickApproachEvent(s, (id) => milesToLandmark(s, id));
    expect(picked).toBeUndefined();
  });
});

describe('#234 ford_north choice (default)', () => {
  it('does not set the detour flag', () => {
    const entry = LANDMARK_APPROACH_EVENTS.find((e) => e.landmarkId === 'snake_three_island')!;
    const ford = entry.event.choices.find((c) => c.id === 'ford_north')!;
    const before = newGame();
    const after = ford.apply(before, makeRng('x'));
    expect(after.flags._threeIslandDetour).toBeFalsy();
  });

  it('does not drain water or morale', () => {
    const entry = LANDMARK_APPROACH_EVENTS.find((e) => e.landmarkId === 'snake_three_island')!;
    const ford = entry.event.choices.find((c) => c.id === 'ford_north')!;
    const before: GameState = { ...newGame(), morale: 60 };
    const beforeWater = before.resources.water;
    const after = ford.apply(before, makeRng('x'));
    expect(after.morale).toBe(60);
    expect(after.resources.water).toBe(beforeWater);
  });
});

describe('#234 detour_south choice', () => {
  it('sets the detour flag', () => {
    const entry = LANDMARK_APPROACH_EVENTS.find((e) => e.landmarkId === 'snake_three_island')!;
    const detour = entry.event.choices.find((c) => c.id === 'detour_south')!;
    const after = detour.apply(newGame(), makeRng('x'));
    expect(after.flags._threeIslandDetour).toBe(true);
  });

  it('halves the water supply', () => {
    const entry = LANDMARK_APPROACH_EVENTS.find((e) => e.landmarkId === 'snake_three_island')!;
    const detour = entry.event.choices.find((c) => c.id === 'detour_south')!;
    const before: GameState = {
      ...newGame(),
      resources: { ...newGame().resources, water: 20 }
    };
    const after = detour.apply(before, makeRng('x'));
    expect(after.resources.water).toBe(10);
  });

  it('subtracts 4 morale', () => {
    const entry = LANDMARK_APPROACH_EVENTS.find((e) => e.landmarkId === 'snake_three_island')!;
    const detour = entry.event.choices.find((c) => c.id === 'detour_south')!;
    const before: GameState = { ...newGame(), morale: 60 };
    const after = detour.apply(before, makeRng('x'));
    expect(after.morale).toBe(56);
  });

  it('bumps living-ox fatigue by 18 (capped at 100, dead oxen unchanged)', () => {
    const entry = LANDMARK_APPROACH_EVENTS.find((e) => e.landmarkId === 'snake_three_island')!;
    const detour = entry.event.choices.find((c) => c.id === 'detour_south')!;
    const base = newGame();
    const before: GameState = {
      ...base,
      oxen: [
        { ...base.oxen[0], health: 100, fatigue: 30 },
        { ...base.oxen[1], health: 0, fatigue: 50 }
      ]
    };
    const after = detour.apply(before, makeRng('x'));
    expect(after.oxen[0].fatigue).toBe(48);
    expect(after.oxen[1].fatigue).toBe(50); // dead — untouched
  });

  it('clamps morale at 0', () => {
    const entry = LANDMARK_APPROACH_EVENTS.find((e) => e.landmarkId === 'snake_three_island')!;
    const detour = entry.event.choices.find((c) => c.id === 'detour_south')!;
    const before: GameState = { ...newGame(), morale: 2 };
    const after = detour.apply(before, makeRng('x'));
    expect(after.morale).toBe(0);
  });
});

describe('#234 detour-flag — engine bypasses river stop', () => {
  it('without flag: river arrival parks at the landmark', () => {
    const milesToTI = runningMilesTo('snake_three_island');
    // Park one day out so applyTravel will land us on the river.
    const before = setMilesAndNext(newGame(), milesToTI - 5, 'snake_three_island');
    const after = applyTravel(before, makeRng('ford'));
    expect(after.location.atLandmarkId).toBe('snake_three_island');
  });

  it('with flag: river arrival walks past without parking', () => {
    const milesToTI = runningMilesTo('snake_three_island');
    const before: GameState = {
      ...setMilesAndNext(newGame(), milesToTI - 5, 'snake_three_island'),
      flags: { ...newGame().flags, _threeIslandDetour: true }
    };
    const after = applyTravel(before, makeRng('detour'));
    expect(after.location.atLandmarkId).toBeNull();
    expect(after.location.previousLandmarkId).toBe('snake_three_island');
  });
});
