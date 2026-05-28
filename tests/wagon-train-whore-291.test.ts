// #291 — whore service-the-train camp action. Period: emigrant women
// who survived as sex workers on the trail (Helena Frizell, the
// Sacramento "Painted Ladies") made the bulk of their money during
// company camp halts — wagon-train travelers were captive customers.

import { describe, it, expect } from 'vitest';
import { CAMP_ACTIONS_BY_ID, getCampAction } from '../src/lib/game/actions/camp-actions';
import { joinTrain } from '../src/lib/game/systems/wagon-train';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState, NpcWagonState, ProfessionId } from '../src/lib/game/types';

function game(prof: ProfessionId = 'whore'): GameState {
  return createInitialState({
    seed: 'sw',
    leader: { name: 'Mae', profession: prof, sex: 'female' },
    companions: [{ name: 'Ada', profession: 'doctor', sex: 'female' }],
    startDate: { year: 1849, month: 4, day: 15 }
  });
}

function trainState(prof: ProfessionId = 'whore'): GameState {
  return joinTrain(game(prof), makeRng('jt')).state;
}

function setCompanions(s: GameState, companions: NpcWagonState[]): GameState {
  return { ...s, wagonTrain: { ...s.wagonTrain!, companions } };
}

function fakeCompanion(over: Partial<NpcWagonState> & { id: string; leaderProfession: ProfessionId }): NpcWagonState {
  const base: NpcWagonState = {
    id: over.id,
    name: over.name ?? `the ${over.id} family`,
    leaderProfession: over.leaderProfession,
    hasChildren: false,
    seed: over.id,
    party: [],
    inventory: {},
    oxen: [],
    morale: 70,
    cash: 50,
    wagon: { model: 'prairie_schooner', condition: 100, canvas: 100, carryCapacity: 1500, hasBranBarrel: false, impairment: null },
    eventLog: [],
    outcome: 'in-progress',
    rations: 'normal',
    water: 30,
    dirtyWater: 0,
    waterCap: 30,
    dryDays: 0
  };
  return { ...base, ...over };
}

describe('serviceTrain — availability gates', () => {
  const action = CAMP_ACTIONS_BY_ID.service_train;

  it('unavailable without a Whore', () => {
    const s = trainState('farmer');
    const a = action.availability(s);
    expect(a.available).toBe(false);
    expect(a.reason).toMatch(/Whore/);
  });

  it('unavailable when not in a train', () => {
    const s = game('whore');
    const a = action.availability(s);
    expect(a.available).toBe(false);
    expect(a.reason).toMatch(/wagon train/i);
  });

  it('unavailable when every companion has departed (wiped/arrived/stranded)', () => {
    let s = trainState('whore');
    s = setCompanions(
      s,
      s.wagonTrain!.companions.map((c) => ({ ...c, outcome: 'wiped' as const }))
    );
    const a = action.availability(s);
    expect(a.available).toBe(false);
    expect(a.reason).toMatch(/companions/i);
  });

  it('available with whore + in-train + ≥1 in-progress companion', () => {
    const s = trainState('whore');
    expect(action.availability(s).available).toBe(true);
  });
});

describe('serviceTrain — apply mechanics', () => {
  const action = CAMP_ACTIONS_BY_ID.service_train;

  it('preacher-led companion always refuses', () => {
    let s = trainState('whore');
    s = setCompanions(s, [fakeCompanion({ id: 'p', leaderProfession: 'preacher' })]);
    const beforeMorale = s.wagonTrain!.companions[0].morale;
    const after = action.apply(s, makeRng('a'));
    // Companion morale unchanged (refusers don't get the +5 bump).
    expect(after.wagonTrain!.companions[0].morale).toBe(beforeMorale);
    // Player got nothing (no contributors).
    expect(after.cash).toBe(s.cash);
    // Log line names the refuser.
    const last = after.eventLog[after.eventLog.length - 1];
    expect(last.text).toMatch(/would not have it/i);
  });

  it('child-bearing companion refuses most of the time (rate ≥ 0.6)', () => {
    let refusals = 0;
    const trials = 200;
    for (let i = 0; i < trials; i++) {
      let s = trainState('whore');
      s = setCompanions(s, [
        fakeCompanion({ id: 'family', leaderProfession: 'farmer', hasChildren: true })
      ]);
      const after = action.apply(s, makeRng('seed-' + i));
      if (after.wagonTrain!.companions[0].morale === 70) refusals += 1;
    }
    expect(refusals / trials).toBeGreaterThan(0.6);
  });

  it('childless non-preacher contributes most of the time (refuse rate ≤ 0.3)', () => {
    let refusals = 0;
    const trials = 200;
    for (let i = 0; i < trials; i++) {
      let s = trainState('whore');
      s = setCompanions(s, [
        fakeCompanion({ id: 'bachelor', leaderProfession: 'banker', hasChildren: false })
      ]);
      const after = action.apply(s, makeRng('seed-' + i));
      if (after.wagonTrain!.companions[0].morale === 70) refusals += 1;
    }
    expect(refusals / trials).toBeLessThan(0.3);
  });

  it('contributors get +5 morale and player receives at least one of cash/luxury items', () => {
    let s = trainState('whore');
    s = setCompanions(s, [
      fakeCompanion({ id: 'b1', leaderProfession: 'banker' }),
      fakeCompanion({ id: 'b2', leaderProfession: 'banker' }),
      fakeCompanion({ id: 'b3', leaderProfession: 'banker' })
    ]);
    // Try several seeds; at least one should yield 3 contributors.
    let saw3Contributors = false;
    for (let i = 0; i < 30 && !saw3Contributors; i++) {
      const after = action.apply(s, makeRng('seed-' + i));
      const bumps = after.wagonTrain!.companions.filter((c) => c.morale > 70).length;
      if (bumps === 3) {
        saw3Contributors = true;
        const cashGain = after.cash - s.cash;
        const luxuryItems = ['whiskey', 'sugar', 'coffee', 'tobacco', 'tea', 'calico', 'vermilion', 'beads'];
        const luxuryGain = luxuryItems.reduce(
          (sum, k) => sum + ((after.inventory[k] ?? 0) - (s.inventory[k] ?? 0)),
          0
        );
        expect(cashGain + luxuryGain).toBeGreaterThan(0);
        // Each contributor got +5 morale.
        for (const c of after.wagonTrain!.companions) {
          expect(c.morale).toBe(75);
        }
      }
    }
    expect(saw3Contributors).toBe(true);
  });

  it('whore never accepts flour as payment (period: not what she wants)', () => {
    // Run many seeds with many contributors; assert flour never moves.
    let s = trainState('whore');
    s = setCompanions(s, [
      fakeCompanion({ id: 'b1', leaderProfession: 'banker' }),
      fakeCompanion({ id: 'b2', leaderProfession: 'banker' }),
      fakeCompanion({ id: 'b3', leaderProfession: 'banker' }),
      fakeCompanion({ id: 'b4', leaderProfession: 'banker' }),
      fakeCompanion({ id: 'b5', leaderProfession: 'banker' })
    ]);
    const flourBefore = s.inventory.flour ?? 0;
    for (let i = 0; i < 50; i++) {
      const after = action.apply(s, makeRng('flourcheck-' + i));
      expect(after.inventory.flour ?? 0).toBe(flourBefore);
    }
  });

  it('player morale lifts by min(5, contributorCount)', () => {
    let s = trainState('whore');
    s = setCompanions(s, [
      fakeCompanion({ id: 'b1', leaderProfession: 'banker' }),
      fakeCompanion({ id: 'b2', leaderProfession: 'banker' }),
      fakeCompanion({ id: 'b3', leaderProfession: 'banker' }),
      fakeCompanion({ id: 'b4', leaderProfession: 'banker' }),
      fakeCompanion({ id: 'b5', leaderProfession: 'banker' }),
      fakeCompanion({ id: 'b6', leaderProfession: 'banker' })
    ]);
    // With 6 banker contributors, expectation is ~6 contributors most
    // of the time → +5 capped player morale.
    const after = action.apply(s, makeRng('lots'));
    const contributors = after.wagonTrain!.companions.filter((c) => c.morale > 70).length;
    const expectedBump = Math.min(5, contributors);
    expect(after.morale).toBe(Math.min(100, s.morale + expectedBump));
  });

  it('skips wiped/arrived/stranded companions entirely', () => {
    // Use a preacher for `live` so the refuse path is deterministic
    // (rate=1.0). That way we KNOW the loop reached `live` if its name
    // shows up in the log, and we can also assert the wiped/arrived/
    // stranded companions stay untouched (no morale change, no name
    // in the log).
    let s = trainState('whore');
    s = setCompanions(s, [
      fakeCompanion({ id: 'live',     leaderProfession: 'preacher', name: 'the live family' }),
      fakeCompanion({ id: 'dead',     leaderProfession: 'banker',   name: 'the dead family',     outcome: 'wiped' }),
      fakeCompanion({ id: 'gone',     leaderProfession: 'banker',   name: 'the gone family',     outcome: 'arrived' }),
      fakeCompanion({ id: 'stranded', leaderProfession: 'banker',   name: 'the stranded family', outcome: 'stranded' })
    ]);
    const after = action.apply(s, makeRng('skip'));
    // Live preacher refused — morale unchanged but named in the log.
    const live = after.wagonTrain!.companions.find((c) => c.id === 'live')!;
    expect(live.morale).toBe(70);
    const last = after.eventLog[after.eventLog.length - 1];
    expect(last.text).toMatch(/the live family/);
    // Wiped / arrived / stranded never iterated — morale untouched and
    // names never appear in the log.
    for (const id of ['dead', 'gone', 'stranded']) {
      const c = after.wagonTrain!.companions.find((x) => x.id === id)!;
      expect(c.morale).toBe(70);
      expect(last.text).not.toMatch(c.name);
    }
  });

  it('writes the period-flavored headline', () => {
    let s = trainState('whore');
    s = setCompanions(s, [fakeCompanion({ id: 'b1', leaderProfession: 'banker' })]);
    const after = action.apply(s, makeRng('hl'));
    const last = after.eventLog[after.eventLog.length - 1];
    expect(last.text).toMatch(/wagon train ran on her tonight/i);
    expect(last.text).toMatch(/Mae/);
  });

  it('hour cost is 3', () => {
    expect(getCampAction('service_train').hourCost).toBe(3);
  });
});
