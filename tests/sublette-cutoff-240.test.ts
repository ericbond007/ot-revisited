import { describe, it, expect } from 'vitest';
import {
  LANDMARK_APPROACH_EVENTS,
  pickApproachEvent
} from '../src/lib/game/content/landmark-approach-events';
import { applyTravel, milesToLandmark } from '../src/lib/game/systems/travel';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import { LANDMARKS } from '../src/lib/game/content/landmarks';
import { adjustTribeAttitude, getTribeAttitude } from '../src/lib/game/systems/tribe-relations';
import type { GameState } from '../src/lib/game/types';

function newGame(over: Partial<GameState> = {}): GameState {
  const s = createInitialState({
    seed: 'sublette-240',
    leader: { name: 'Ezra', profession: 'banker' },
    companions: [{ name: 'Mary', profession: 'farmer' }],
    startDate: { year: 1849, month: 6, day: 1 }
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
  return { ...s, location: { ...s.location, milesTraveled, nextLandmarkId } };
}

const entry = () => LANDMARK_APPROACH_EVENTS.find((e) => e.landmarkId === 'parting_of_ways')!;

describe('#240 Sublette Cutoff — approach event registration', () => {
  it('event is registered at 5 mi out from parting_of_ways', () => {
    const e = entry();
    expect(e).toBeDefined();
    expect(e.milesAway).toBe(5);
    expect(e.event.id).toBe('approach_sublette_cutoff');
  });

  it('has all three choices', () => {
    const ids = entry().event.choices.map((c) => c.id);
    expect(ids).toEqual(['via_bridger', 'sublette_with_guide', 'sublette_alone']);
  });

  it('fires when within 5 mi of parting_of_ways', () => {
    const miles = runningMilesTo('parting_of_ways');
    const s = setMilesAndNext(newGame(), miles - 4, 'parting_of_ways');
    const picked = pickApproachEvent(s, (id) => milesToLandmark(s, id));
    expect(picked?.landmarkId).toBe('parting_of_ways');
  });

  it('does not fire 30 mi out', () => {
    const miles = runningMilesTo('parting_of_ways');
    const s = setMilesAndNext(newGame(), miles - 30, 'parting_of_ways');
    const picked = pickApproachEvent(s, (id) => milesToLandmark(s, id));
    expect(picked).toBeUndefined();
  });
});

describe('#240 via_bridger (default)', () => {
  it('does not set the cutoff flag', () => {
    const choice = entry().event.choices.find((c) => c.id === 'via_bridger')!;
    const after = choice.apply(newGame(), makeRng('via-bridger'));
    expect(after.flags._subletteCutoff).toBeFalsy();
  });

  it('does not drain water, morale, or oxen', () => {
    const choice = entry().event.choices.find((c) => c.id === 'via_bridger')!;
    const before: GameState = { ...newGame(), morale: 60 };
    const after = choice.apply(before, makeRng('via-bridger-2'));
    expect(after.morale).toBe(60);
    expect(after.resources.water).toBe(before.resources.water);
  });
});

describe('#240 sublette_alone', () => {
  it('sets the cutoff flag', () => {
    const choice = entry().event.choices.find((c) => c.id === 'sublette_alone')!;
    const after = choice.apply(newGame(), makeRng('sublette-alone'));
    expect(after.flags._subletteCutoff).toBe(true);
  });

  it('halves the water supply', () => {
    const choice = entry().event.choices.find((c) => c.id === 'sublette_alone')!;
    const before: GameState = { ...newGame(), resources: { ...newGame().resources, water: 20 } };
    const after = choice.apply(before, makeRng('sublette-alone-water'));
    expect(after.resources.water).toBe(10);
  });

  it('subtracts 3 morale', () => {
    const choice = entry().event.choices.find((c) => c.id === 'sublette_alone')!;
    const before: GameState = { ...newGame(), morale: 60 };
    const after = choice.apply(before, makeRng('sublette-alone-morale'));
    expect(after.morale).toBe(57);
  });

  it('bumps living-ox fatigue by 18, leaves dead alone', () => {
    const choice = entry().event.choices.find((c) => c.id === 'sublette_alone')!;
    const base = newGame();
    const before: GameState = {
      ...base,
      oxen: [
        { ...base.oxen[0], health: 100, fatigue: 30 },
        { ...base.oxen[1], health: 0, fatigue: 50 }
      ]
    };
    const after = choice.apply(before, makeRng('sublette-alone-oxen'));
    expect(after.oxen[0].fatigue).toBe(48);
    expect(after.oxen[1].fatigue).toBe(50);
  });
});

describe('#240 sublette_with_guide', () => {
  function payable(): GameState {
    return {
      ...newGame(),
      cash: 50,
      inventory: { ...newGame().inventory, tobacco: 5 }
    };
  }

  it('hidden when not enough cash', () => {
    const choice = entry().event.choices.find((c) => c.id === 'sublette_with_guide')!;
    const s: GameState = {
      ...newGame(),
      cash: 5,
      inventory: { ...newGame().inventory, tobacco: 5 }
    };
    expect(choice.hidden!(s)).toBe(true);
  });

  it('hidden when not enough tobacco', () => {
    const choice = entry().event.choices.find((c) => c.id === 'sublette_with_guide')!;
    const s: GameState = { ...newGame(), cash: 50, inventory: { ...newGame().inventory, tobacco: 1 } };
    expect(choice.hidden!(s)).toBe(true);
  });

  it('hidden when Shoshone are not friendly enough', () => {
    const choice = entry().event.choices.find((c) => c.id === 'sublette_with_guide')!;
    let s = payable();
    // Shoshone baseline is 65 — drop below 50 to fail the gate.
    s = adjustTribeAttitude(s, 'shoshone', -25);
    expect(getTribeAttitude(s, 'shoshone')).toBeLessThan(50);
    expect(choice.hidden!(s)).toBe(true);
  });

  it('shown when cash, tobacco, and friendly Shoshone all check', () => {
    const choice = entry().event.choices.find((c) => c.id === 'sublette_with_guide')!;
    expect(choice.hidden!(payable())).toBe(false);
  });

  it('deducts $10 + 2 lb tobacco, sets cutoff flag, bumps Shoshone +2', () => {
    const choice = entry().event.choices.find((c) => c.id === 'sublette_with_guide')!;
    const before = payable();
    const baselineAtt = getTribeAttitude(before, 'shoshone');
    const after = choice.apply(before, makeRng('guide'));
    expect(after.cash).toBe(40);
    expect(after.inventory.tobacco).toBe(3);
    expect(after.flags._subletteCutoff).toBe(true);
    expect(getTribeAttitude(after, 'shoshone')).toBe(baselineAtt + 2);
  });

  it('does NOT apply the dry-stretch penalties (water/morale/oxen)', () => {
    const choice = entry().event.choices.find((c) => c.id === 'sublette_with_guide')!;
    const before = payable();
    const beforeWater = before.resources.water;
    const beforeMorale = before.morale;
    const after = choice.apply(before, makeRng('guide-no-penalty'));
    expect(after.resources.water).toBe(beforeWater);
    expect(after.morale).toBe(beforeMorale);
  });
});

describe('#240 cutoff bypass — Bridger is walked past', () => {
  it('without flag: arrival parks at Fort Bridger', () => {
    const milesToBridger = runningMilesTo('ft_bridger');
    const before = setMilesAndNext(newGame(), milesToBridger - 5, 'ft_bridger');
    const after = applyTravel(before, makeRng('park-bridger'));
    expect(after.location.atLandmarkId).toBe('ft_bridger');
  });

  it('with _subletteCutoff: arrival walks past Fort Bridger without parking', () => {
    const milesToBridger = runningMilesTo('ft_bridger');
    const before: GameState = {
      ...setMilesAndNext(newGame(), milesToBridger - 5, 'ft_bridger'),
      flags: { ...newGame().flags, _subletteCutoff: true }
    };
    const after = applyTravel(before, makeRng('bypass-bridger'));
    expect(after.location.atLandmarkId).toBeNull();
    expect(after.location.previousLandmarkId).toBe('ft_bridger');
  });
});
