// #176 wagon-train system + #280a per-wagon stateful tests.

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
  trainOxSurplus,
  wagonOxCount
} from '../src/lib/game/content/trains';
import { createInitialState } from '../src/lib/game/engine';
import { repairWagon, forgeOxShoes } from '../src/lib/game/systems/town-services';
import { adjustMorale } from '../src/lib/game/systems/morale';
import { milesPerDay } from '../src/lib/game/systems/travel';
import { makeRng } from '../src/lib/game/rng';
import type { GameState, NpcWagonState, Ox } from '../src/lib/game/types';

function game(): GameState {
  return createInitialState({
    seed: 'wt',
    leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'doctor' }],
    startDate: { year: 1849, month: 4, day: 15 }
  });
}

/** Minimal NPC wagon stub for tests that don't care about full state. */
function stubNpc(over: Partial<NpcWagonState> & { id: string; leaderProfession: NpcWagonState['leaderProfession'] }): NpcWagonState {
  const game0 = game();
  const base: NpcWagonState = {
    id: over.id,
    name: `the ${over.id} family`,
    leaderProfession: over.leaderProfession,
    hasChildren: false,
    seed: 's',
    party: [],
    inventory: {},
    oxen: Array.from({ length: 4 }, (_, i) => ({ id: `${over.id}-ox-${i}`, health: 100, fatigue: 0, shod: true })),
    morale: 70,
    cash: 100,
    wagon: { ...game0.wagon },
    eventLog: [],
    outcome: 'in-progress',
    rations: 'normal'
  };
  return { ...base, ...over };
}

describe('wagon-train roster generation (#280a per-wagon)', () => {
  it('produces a deterministic roster from (seed, joinDay)', () => {
    const a = generateTrain('seed-a', 5, 'fort_kearny', makeRng('seed-a:bot:5'));
    const b = generateTrain('seed-a', 5, 'fort_kearny', makeRng('seed-a:bot:5'));
    expect(a.companions.length).toBe(b.companions.length);
    expect(a.companions[0].name).toBe(b.companions[0].name);
    expect(a.companions[0].leaderProfession).toBe(b.companions[0].leaderProfession);
  });

  it('rosters carry 5-12 companion wagons', () => {
    for (let i = 0; i < 20; i++) {
      const t = generateTrain('seed-' + i, i, 'fort_kearny', makeRng('seed-' + i));
      expect(t.companions.length).toBeGreaterThanOrEqual(5);
      expect(t.companions.length).toBeLessThanOrEqual(12);
    }
  });

  it('every companion wagon has full state — party + inventory + oxen + cash', () => {
    const t = generateTrain('s', 1, null, makeRng('s'));
    for (const c of t.companions) {
      expect(typeof c.leaderProfession).toBe('string');
      expect(c.party.length).toBeGreaterThanOrEqual(1);
      expect(c.party[0].isLeader).toBe(true);
      expect(c.party[0].profession).toBe(c.leaderProfession);
      expect(wagonOxCount(c)).toBeGreaterThanOrEqual(2);
      expect(wagonOxCount(c)).toBeLessThanOrEqual(6);
      expect(c.cash).toBeGreaterThanOrEqual(40);
      expect(c.morale).toBeGreaterThanOrEqual(60);
      expect(c.outcome).toBe('in-progress');
      // Inventory carries at least the period staples.
      expect((c.inventory.flour ?? 0)).toBeGreaterThan(0);
    }
  });

  it('companions with `hasChildren` carry kid party members', () => {
    const t = generateTrain('s', 1, null, makeRng('s'));
    const family = t.companions.find((c) => c.hasChildren);
    if (family) {
      expect(family.party.some((p) => p.kind === 'child')).toBe(true);
    }
  });

  it('train initializes with player as leader (#285)', () => {
    const t = generateTrain('s', 1, null, makeRng('s'));
    expect(t.leaderId).toBe('player');
  });

  it('roster has compositional variety — over many seeds, all four archetypes appear', () => {
    const compositions = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const t = generateTrain('var-' + i, i, null, makeRng('var-' + i));
      for (const c of t.companions) {
        if (c.party.length === 1) compositions.add('solo');
        else if (c.party.every((p) => p.kind === 'adult')) compositions.add('all_adult');
        else if (c.party.some((p) => p.kind === 'child')) compositions.add('family-or-mixed');
      }
    }
    expect(compositions.has('solo')).toBe(true);
    expect(compositions.has('all_adult')).toBe(true);
    expect(compositions.has('family-or-mixed')).toBe(true);
  });

  it('solo wagons are common at mid-trail joins (survivors of attrition) and rare at Independence', () => {
    function soloRate(fresh: boolean): number {
      let solos = 0, total = 0;
      for (let i = 0; i < 50; i++) {
        const t = generateTrain('comp-' + i, fresh ? 1 : 30, fresh ? 'independence_mo' : 'fort_kearny', makeRng('comp-' + i + '-f' + fresh), { fresh });
        for (const c of t.companions) {
          if (c.party.length === 1) solos += 1;
          total += 1;
        }
      }
      return solos / total;
    }
    const freshRate = soloRate(true);
    const midRate = soloRate(false);
    // Fresh joins should rarely have solos; mid-trail joins should
    // have many. Big gap is the period-faithful signal — survivors
    // of dead families show up as solos on the mid-trail roster.
    expect(midRate).toBeGreaterThan(freshRate * 2);
    expect(freshRate).toBeLessThan(0.15);
    expect(midRate).toBeGreaterThan(0.10);
  });

  it('fresh=true gives every wagon full health, fresh oxen, pristine wagon', () => {
    const t = generateTrain('s', 1, 'independence_mo', makeRng('s'), { fresh: true });
    for (const c of t.companions) {
      for (const p of c.party) expect(p.health).toBe(100);
      for (const o of c.oxen) {
        expect(o.health).toBe(100);
        expect(o.fatigue).toBe(0);
        expect(o.shod).toBe(true);
      }
      expect(c.wagon.condition).toBe(100);
      expect(c.wagon.canvas).toBe(100);
      expect(c.morale).toBe(80);
    }
  });

  it('fresh=false (default) gives trail-worn state — varied health and fatigued oxen', () => {
    const t = generateTrain('s', 30, 'fort_kearny', makeRng('s'), { fresh: false });
    // At least one ox somewhere should have non-zero fatigue (the trail
    // wear path picks fatigue 10-40 randomly).
    const hasFatigued = t.companions.some((c) => c.oxen.some((o) => o.fatigue > 0));
    expect(hasFatigued).toBe(true);
  });

  it('joinTrain auto-detects Independence-start as fresh (full health)', () => {
    const s = createInitialState({
      seed: 'i',
      leader: { name: 'L', profession: 'farmer' },
      companions: [{ name: 'C', profession: 'doctor' }],
      startDate: { year: 1849, month: 4, day: 15 }
    });
    const r = joinTrain(s, makeRng('jt-fresh'));
    for (const c of r.state.wagonTrain!.companions) {
      for (const p of c.party) expect(p.health).toBe(100);
      for (const o of c.oxen) expect(o.fatigue).toBe(0);
    }
  });
});

describe('joinTrain / leaveTrain', () => {
  it('joining sets state.wagonTrain and logs an entry', () => {
    let s = game();
    expect(isInTrain(s)).toBe(false);
    const r = joinTrain(s, makeRng('j'));
    expect(isInTrain(r.state)).toBe(true);
    expect(r.state.wagonTrain!.companions.length).toBeGreaterThan(0);
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
        leaderId: 'player',
        companions: [stubNpc({ id: 'wagon-0', leaderProfession: 'blacksmith' })]
      }
    };
    expect(hasBlacksmithSupport(s)).toBe(true);
  });

  it('repairWagon discount applies when train has a blacksmith', () => {
    const solo = { ...game(), cash: 100, wagon: { ...game().wagon, condition: 50 } };
    const withTrain = {
      ...solo,
      wagonTrain: {
        id: 't', name: 'T', joinedDay: 1, joinedAtLandmarkId: null,
        leaderId: 'player' as const,
        companions: [stubNpc({ id: 'wagon-0', leaderProfession: 'blacksmith' })]
      }
    };
    const soloPoints = repairWagon(solo, 20).pointsRestored;
    const trainPoints = repairWagon(withTrain, 20).pointsRestored;
    expect(trainPoints).toBeGreaterThan(soloPoints);
  });

  it('forgeOxShoes discount applies when train has a blacksmith', () => {
    const solo = { ...game(), cash: 50, inventory: {} };
    const withTrain = {
      ...solo,
      wagonTrain: {
        id: 't', name: 'T', joinedDay: 1, joinedAtLandmarkId: null,
        leaderId: 'player' as const,
        companions: [stubNpc({ id: 'wagon-0', leaderProfession: 'blacksmith' })]
      }
    };
    const soloCost = forgeOxShoes(solo, 4).cost;
    const trainCost = forgeOxShoes(withTrain, 4).cost;
    expect(trainCost).toBeLessThan(soloCost);
  });
});

describe('train roster helpers', () => {
  it('trainHasProfession reads leaderProfession on companion wagons', () => {
    const t = generateTrain('s', 1, null, makeRng('s'));
    expect(typeof trainHasProfession(t, 'farmer')).toBe('boolean');
  });

  it('trainOxSurplus sums alive-ox excess over 4', () => {
    const train = {
      id: 't', name: 'T', joinedDay: 1, joinedAtLandmarkId: null,
      leaderId: 'player' as const,
      companions: [
        // 6 alive oxen → +2 surplus
        stubNpc({ id: 'wagon-0', leaderProfession: 'farmer',
                  oxen: Array.from({ length: 6 }, (_, i) => ({ id: `o${i}`, health: 100, fatigue: 0, shod: true })) }),
        // 3 alive oxen → 0 surplus
        stubNpc({ id: 'wagon-1', leaderProfession: 'farmer',
                  oxen: Array.from({ length: 3 }, (_, i) => ({ id: `o${i}`, health: 100, fatigue: 0, shod: true })) }),
        // 5 alive oxen → +1 surplus
        stubNpc({ id: 'wagon-2', leaderProfession: 'farmer',
                  oxen: Array.from({ length: 5 }, (_, i) => ({ id: `o${i}`, health: 100, fatigue: 0, shod: true })) })
      ]
    };
    expect(trainOxSurplus(train)).toBe(2 + 0 + 1);
  });

  it('trainHasProfession + trainOxSurplus return false/0 on null train', () => {
    expect(trainHasProfession(null, 'farmer')).toBe(false);
    expect(trainOxSurplus(null)).toBe(0);
  });
});
