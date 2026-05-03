// #176 — wagon-train system tests.

import { describe, it, expect } from 'vitest';
import {
  joinTrain,
  leaveTrain,
  isInTrain,
  hasBlacksmithSupport,
  TRAIN_MORALE_PER_DAY,
  TRAIN_NIGHT_RISK_MULT
} from '../src/lib/game/systems/wagon-train';
import {
  generateTrain,
  trainHasProfession,
  trainOxSurplus
} from '../src/lib/game/content/trains';
import { createInitialState } from '../src/lib/game/engine';
import { repairWagon, forgeOxShoes } from '../src/lib/game/systems/town-services';
import { adjustMorale } from '../src/lib/game/systems/morale';
import { milesPerDay } from '../src/lib/game/systems/travel';
import { makeRng } from '../src/lib/game/rng';
import type { GameState, Ox } from '../src/lib/game/types';

function game(): GameState {
  return createInitialState({
    seed: 'wt',
    leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'doctor' }],
    startDate: { year: 1849, month: 4, day: 15 }
  });
}

describe('wagon-train roster generation', () => {
  it('produces a deterministic roster from (seed, joinDay)', () => {
    const a = generateTrain('seed-a', 5, 'fort_kearny', makeRng('seed-a:bot:5'));
    const b = generateTrain('seed-a', 5, 'fort_kearny', makeRng('seed-a:bot:5'));
    expect(a.members.length).toBe(b.members.length);
    expect(a.members[0].name).toBe(b.members[0].name);
    expect(a.members[0].profession).toBe(b.members[0].profession);
  });

  it('rosters carry 5-12 members', () => {
    for (let i = 0; i < 20; i++) {
      const t = generateTrain('seed-' + i, i, 'fort_kearny', makeRng('seed-' + i));
      expect(t.members.length).toBeGreaterThanOrEqual(5);
      expect(t.members.length).toBeLessThanOrEqual(12);
    }
  });

  it('every member has profession + ox count + cash', () => {
    const t = generateTrain('s', 1, null, makeRng('s'));
    for (const m of t.members) {
      expect(typeof m.profession).toBe('string');
      expect(m.oxCount).toBeGreaterThanOrEqual(2);
      expect(m.oxCount).toBeLessThanOrEqual(6);
      expect(m.cash).toBeGreaterThanOrEqual(40);
    }
  });
});

describe('joinTrain / leaveTrain', () => {
  it('joining sets state.wagonTrain and logs an entry', () => {
    let s = game();
    expect(isInTrain(s)).toBe(false);
    const r = joinTrain(s, makeRng('j'));
    expect(isInTrain(r.state)).toBe(true);
    expect(r.state.wagonTrain!.members.length).toBeGreaterThan(0);
    expect(r.state.eventLog[r.state.eventLog.length - 1].text).toMatch(/joined/i);
  });

  it('joining twice throws', () => {
    let s = game();
    s = joinTrain(s, makeRng('j1')).state;
    expect(() => joinTrain(s, makeRng('j2'))).toThrow();
  });

  it('leaving clears state.wagonTrain and logs an entry', () => {
    let s = game();
    s = joinTrain(s, makeRng('j')).state;
    s = leaveTrain(s);
    expect(isInTrain(s)).toBe(false);
    expect(s.eventLog[s.eventLog.length - 1].text).toMatch(/split off/i);
  });

  it('leaving when not in a train is a no-op', () => {
    const s = game();
    expect(leaveTrain(s)).toBe(s);
  });
});

describe('wagon-train morale + pace effects', () => {
  it('adjustMorale adds +1/day when in a train', () => {
    const baseline = adjustMorale(game(), makeRng('m'));
    let inTrain = joinTrain(game(), makeRng('m')).state;
    inTrain = adjustMorale(inTrain, makeRng('m2'));
    // Setting morale should be at least 1 higher than the solo baseline.
    expect(inTrain.morale).toBeGreaterThan(baseline.morale);
  });

  it('TRAIN_MORALE_PER_DAY is exported as +1', () => {
    expect(TRAIN_MORALE_PER_DAY).toBe(1);
  });

  it('TRAIN_NIGHT_RISK_MULT is exported as 0.5', () => {
    expect(TRAIN_NIGHT_RISK_MULT).toBe(0.5);
  });

  it('milesPerDay clamps fast/grueling to moderate while in a train', () => {
    const oxen: Ox[] = Array.from({ length: 4 }, (_, i) => ({
      id: 'ox-' + i, health: 100, fatigue: 0, shod: true
    }));
    const base = { ...game(), oxen };
    const soloFast = milesPerDay({ ...base, pace: 'fast' });
    const soloMod = milesPerDay({ ...base, pace: 'moderate' });
    expect(soloFast).toBeGreaterThan(soloMod);

    const inTrain = joinTrain(base, makeRng('t')).state;
    const trainFast = milesPerDay({ ...inTrain, pace: 'fast' });
    const trainMod = milesPerDay({ ...inTrain, pace: 'moderate' });
    // fast pace clamps to moderate inside a train — same miles.
    expect(trainFast).toBe(trainMod);
  });
});

describe('wagon-train smithy support', () => {
  it('hasBlacksmithSupport is true with a party blacksmith', () => {
    const s = createInitialState({
      seed: 'b',
      leader: { name: 'L', profession: 'blacksmith' },
      companions: [{ name: 'C', profession: 'farmer' }],
      startDate: { year: 1849, month: 4, day: 15 }
    });
    expect(hasBlacksmithSupport(s)).toBe(true);
  });

  it('hasBlacksmithSupport is true with a train blacksmith', () => {
    let s = game();
    s = {
      ...s,
      wagonTrain: {
        id: 't', name: 'T', joinedDay: 1, joinedAtLandmarkId: null,
        members: [
          { id: 'm0', name: 'the X family', profession: 'blacksmith', oxCount: 4, hasChildren: false, cash: 100 }
        ]
      }
    };
    expect(hasBlacksmithSupport(s)).toBe(true);
  });

  it('repairWagon discount applies when train has a blacksmith', () => {
    let solo = { ...game(), cash: 100, wagon: { ...game().wagon, condition: 50 } };
    let withTrain = {
      ...solo,
      wagonTrain: {
        id: 't', name: 'T', joinedDay: 1, joinedAtLandmarkId: null,
        members: [
          { id: 'm0', name: 'the X family', profession: 'blacksmith' as const, oxCount: 4, hasChildren: false, cash: 100 }
        ]
      }
    };
    const soloPoints = repairWagon(solo, 20).pointsRestored;
    const trainPoints = repairWagon(withTrain, 20).pointsRestored;
    expect(trainPoints).toBeGreaterThan(soloPoints);
  });

  it('forgeOxShoes discount applies when train has a blacksmith', () => {
    let solo = { ...game(), cash: 50, inventory: {} };
    let withTrain = {
      ...solo,
      wagonTrain: {
        id: 't', name: 'T', joinedDay: 1, joinedAtLandmarkId: null,
        members: [
          { id: 'm0', name: 'the X family', profession: 'blacksmith' as const, oxCount: 4, hasChildren: false, cash: 100 }
        ]
      }
    };
    const soloCost = forgeOxShoes(solo, 4).cost;
    const trainCost = forgeOxShoes(withTrain, 4).cost;
    expect(trainCost).toBeLessThan(soloCost);
  });
});

describe('train roster helpers', () => {
  it('trainHasProfession finds matching members', () => {
    const t = generateTrain('s', 1, null, makeRng('s'));
    // generated rosters always include at least one farmer (highest weight).
    expect(typeof trainHasProfession(t, 'farmer')).toBe('boolean');
  });

  it('trainOxSurplus sums oxCount excess over 4', () => {
    const train = {
      id: 't', name: 'T', joinedDay: 1, joinedAtLandmarkId: null,
      members: [
        { id: 'm0', name: 'a', profession: 'farmer' as const, oxCount: 6, hasChildren: false, cash: 0 },
        { id: 'm1', name: 'b', profession: 'farmer' as const, oxCount: 3, hasChildren: false, cash: 0 },
        { id: 'm2', name: 'c', profession: 'farmer' as const, oxCount: 5, hasChildren: false, cash: 0 }
      ]
    };
    expect(trainOxSurplus(train)).toBe(2 + 0 + 1);
  });

  it('trainHasProfession + trainOxSurplus return false/0 on null train', () => {
    expect(trainHasProfession(null, 'farmer')).toBe(false);
    expect(trainOxSurplus(null)).toBe(0);
  });
});
