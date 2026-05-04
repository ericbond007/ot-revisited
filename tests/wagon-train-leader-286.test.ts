// #286 — wagon-train leader abilities. Captain-only powers:
// inventory peek (UI), inter-companion item transfer, doctor visit
// using the player's medicine_chest. Period anchor: Marcy 1859 — "the
// medical man's chest is the company's"; Russell 1846 (per Bryant)
// administered the company purse + smithy schedule + team-pool.

import { describe, it, expect } from 'vitest';
import {
  isCaptain,
  transferBetweenCompanions,
  doctorVisit,
  wagonHasSickMember
} from '../src/lib/game/systems/wagon-train-leader';
import { joinTrain } from '../src/lib/game/systems/wagon-train';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState, NpcWagonState, ProfessionId } from '../src/lib/game/types';

function game(prof: ProfessionId = 'farmer'): GameState {
  return createInitialState({
    seed: 'lead',
    leader: { name: 'L', profession: prof },
    companions: [{ name: 'C', profession: 'doctor' }],
    startDate: { year: 1849, month: 4, day: 15 }
  });
}

function trainState(prof: ProfessionId = 'farmer'): GameState {
  return joinTrain(game(prof), makeRng('jt')).state;
}

function fakeCompanion(over: Partial<NpcWagonState> & { id: string; leaderProfession: ProfessionId }): NpcWagonState {
  const base: NpcWagonState = {
    id: over.id,
    name: over.name ?? `the ${over.id} family`,
    leaderProfession: over.leaderProfession,
    hasChildren: false,
    seed: over.id,
    party: [
      {
        id: `${over.id}-p`,
        name: 'X',
        kind: 'adult',
        sex: 'male',
        age: 30,
        profession: over.leaderProfession,
        isLeader: true,
        health: 100,
        dead: false,
        conditions: []
      }
    ],
    inventory: {},
    oxen: [{ id: `${over.id}-o`, health: 100, fatigue: 0, shod: true }],
    morale: 70,
    cash: 100,
    wagon: { model: 'prairie_schooner', condition: 100, canvas: 100, carryCapacity: 1500, hasBranBarrel: false },
    eventLog: [],
    outcome: 'in-progress',
    rations: 'normal'
  };
  return { ...base, ...over };
}

describe('isCaptain predicate', () => {
  it('false when not in a train', () => {
    expect(isCaptain(game())).toBe(false);
  });

  it('true when player holds captaincy (default after joinTrain)', () => {
    expect(isCaptain(trainState())).toBe(true);
  });

  it('false when captaincy passed to a companion', () => {
    let s = trainState();
    s = { ...s, wagonTrain: { ...s.wagonTrain!, leaderId: s.wagonTrain!.companions[0].id } };
    expect(isCaptain(s)).toBe(false);
  });
});

describe('transferBetweenCompanions', () => {
  it('throws when player is not the captain', () => {
    let s = trainState();
    s = { ...s, wagonTrain: { ...s.wagonTrain!, leaderId: s.wagonTrain!.companions[0].id } };
    s = {
      ...s,
      wagonTrain: {
        ...s.wagonTrain!,
        companions: [
          fakeCompanion({ id: 'a', leaderProfession: 'farmer', inventory: { flour: 50 } }),
          fakeCompanion({ id: 'b', leaderProfession: 'farmer' })
        ]
      }
    };
    expect(() =>
      transferBetweenCompanions(s, 'a', 'b', [{ item: 'flour', qty: 10 }])
    ).toThrow(/captain/i);
  });

  it('throws on unknown source or destination', () => {
    let s = trainState();
    s = {
      ...s,
      wagonTrain: {
        ...s.wagonTrain!,
        companions: [fakeCompanion({ id: 'a', leaderProfession: 'farmer', inventory: { flour: 50 } })]
      }
    };
    expect(() =>
      transferBetweenCompanions(s, 'a', 'missing', [{ item: 'flour', qty: 10 }])
    ).toThrow(/no wagon/i);
    expect(() =>
      transferBetweenCompanions(s, 'missing', 'a', [{ item: 'flour', qty: 10 }])
    ).toThrow(/no wagon/i);
  });

  it('throws when source lacks the items', () => {
    let s = trainState();
    s = {
      ...s,
      wagonTrain: {
        ...s.wagonTrain!,
        companions: [
          fakeCompanion({ id: 'poor', leaderProfession: 'farmer', inventory: {} }),
          fakeCompanion({ id: 'rich', leaderProfession: 'farmer' })
        ]
      }
    };
    expect(() =>
      transferBetweenCompanions(s, 'poor', 'rich', [{ item: 'flour', qty: 10 }])
    ).toThrow(/doesn't have/i);
  });

  it('declines (not throws) when destination is hostile-morale', () => {
    let s = trainState();
    s = {
      ...s,
      wagonTrain: {
        ...s.wagonTrain!,
        companions: [
          fakeCompanion({ id: 'a', leaderProfession: 'farmer', inventory: { flour: 50 } }),
          fakeCompanion({ id: 'b', leaderProfession: 'farmer', morale: 10 })
        ]
      }
    };
    const r = transferBetweenCompanions(s, 'a', 'b', [{ item: 'flour', qty: 10 }]);
    expect(r.accepted).toBe(false);
    expect(r.declineReason).toMatch(/won't take/i);
    // Inventory unchanged.
    expect(r.state.wagonTrain!.companions[0].inventory.flour).toBe(50);
    expect(r.state.wagonTrain!.companions[1].inventory.flour ?? 0).toBe(0);
  });

  it('moves items from source to destination + lifts destination morale +2', () => {
    let s = trainState();
    s = {
      ...s,
      wagonTrain: {
        ...s.wagonTrain!,
        companions: [
          fakeCompanion({ id: 'rich', leaderProfession: 'farmer', inventory: { flour: 100, beans: 30 } }),
          fakeCompanion({ id: 'poor', leaderProfession: 'farmer', inventory: { flour: 5 }, morale: 50 })
        ]
      }
    };
    const r = transferBetweenCompanions(s, 'rich', 'poor', [
      { item: 'flour', qty: 30 },
      { item: 'beans', qty: 10 }
    ]);
    expect(r.accepted).toBe(true);
    const rich = r.state.wagonTrain!.companions.find((c) => c.id === 'rich')!;
    const poor = r.state.wagonTrain!.companions.find((c) => c.id === 'poor')!;
    expect(rich.inventory.flour).toBe(70);
    expect(rich.inventory.beans).toBe(20);
    expect(poor.inventory.flour).toBe(35);
    expect(poor.inventory.beans).toBe(10);
    expect(poor.morale).toBe(52);
    // Source morale untouched.
    expect(rich.morale).toBe(70);
    // Log line names captain + summarizes.
    const last = r.state.eventLog[r.state.eventLog.length - 1];
    expect(last.text).toMatch(/Captain moved/);
    expect(last.text).toMatch(/the rich family/);
    expect(last.text).toMatch(/the poor family/);
  });

  it('rejects same-source-and-destination', () => {
    let s = trainState();
    s = {
      ...s,
      wagonTrain: {
        ...s.wagonTrain!,
        companions: [fakeCompanion({ id: 'a', leaderProfession: 'farmer', inventory: { flour: 50 } })]
      }
    };
    expect(() =>
      transferBetweenCompanions(s, 'a', 'a', [{ item: 'flour', qty: 10 }])
    ).toThrow(/source and destination must differ/i);
  });

  it('throws on non-positive qty', () => {
    let s = trainState();
    s = {
      ...s,
      wagonTrain: {
        ...s.wagonTrain!,
        companions: [
          fakeCompanion({ id: 'a', leaderProfession: 'farmer', inventory: { flour: 50 } }),
          fakeCompanion({ id: 'b', leaderProfession: 'farmer' })
        ]
      }
    };
    expect(() =>
      transferBetweenCompanions(s, 'a', 'b', [{ item: 'flour', qty: 0 }])
    ).toThrow(/bad qty/i);
  });

  it('rejects departed (wiped/arrived/stranded) source or destination', () => {
    let s = trainState();
    s = {
      ...s,
      wagonTrain: {
        ...s.wagonTrain!,
        companions: [
          fakeCompanion({ id: 'live', leaderProfession: 'farmer', inventory: { flour: 50 } }),
          fakeCompanion({ id: 'gone', leaderProfession: 'farmer', outcome: 'arrived' })
        ]
      }
    };
    expect(() =>
      transferBetweenCompanions(s, 'live', 'gone', [{ item: 'flour', qty: 10 }])
    ).toThrow(/no longer with the train/i);
  });
});

describe('doctorVisit', () => {
  it('throws when not the captain', () => {
    let s = trainState();
    s = { ...s, wagonTrain: { ...s.wagonTrain!, leaderId: s.wagonTrain!.companions[0].id } };
    s = { ...s, inventory: { medicine_chest: 1 } };
    expect(() => doctorVisit(s, s.wagonTrain!.companions[0].id)).toThrow(/captain/i);
  });

  it('throws when player has no medicine chest', () => {
    let s = trainState();
    s = {
      ...s,
      inventory: {},
      wagonTrain: {
        ...s.wagonTrain!,
        companions: [fakeCompanion({ id: 'a', leaderProfession: 'farmer' })]
      }
    };
    expect(() => doctorVisit(s, 'a')).toThrow(/medicine chest/i);
  });

  it('returns treated:false when no member of the wagon needs treatment', () => {
    let s = trainState();
    s = {
      ...s,
      inventory: { medicine_chest: 1 },
      wagonTrain: {
        ...s.wagonTrain!,
        companions: [fakeCompanion({ id: 'healthy', leaderProfession: 'farmer' })]
      }
    };
    const r = doctorVisit(s, 'healthy');
    expect(r.treated).toBe(false);
    expect(r.state).toBe(s);
  });

  it('treats lowest-HP member: +30 HP capped, +5 wagon morale, both event logs written', () => {
    let s = trainState();
    s = {
      ...s,
      inventory: { medicine_chest: 1 },
      wagonTrain: {
        ...s.wagonTrain!,
        companions: [
          fakeCompanion({
            id: 'sick',
            leaderProfession: 'farmer',
            morale: 50,
            party: [
              {
                id: 'sick-p1', name: 'Pa', kind: 'adult', sex: 'male', age: 35,
                profession: 'farmer', isLeader: true, health: 100, dead: false, conditions: []
              },
              {
                id: 'sick-p2', name: 'Ma', kind: 'adult', sex: 'female', age: 32,
                profession: 'farmer', isLeader: false, health: 30, dead: false, conditions: []
              }
            ]
          })
        ]
      }
    };
    const r = doctorVisit(s, 'sick');
    expect(r.treated).toBe(true);
    expect(r.patientName).toBe('Ma');
    expect(r.hpGained).toBe(30);
    const wagon = r.state.wagonTrain!.companions[0];
    const ma = wagon.party.find((p) => p.id === 'sick-p2')!;
    expect(ma.health).toBe(60);
    expect(wagon.morale).toBe(55);
    // Player's event log + wagon's internal eventLog both updated.
    const playerLast = r.state.eventLog[r.state.eventLog.length - 1];
    expect(playerLast.text).toMatch(/medicine chest/i);
    expect(playerLast.text).toMatch(/Ma/);
    const wagonLast = wagon.eventLog[wagon.eventLog.length - 1];
    expect(wagonLast.text).toMatch(/Captain visited/);
  });

  it('does NOT treat condition-only patients at full HP — visit returns treated:false', () => {
    // Until condition-clearing is a real mechanic (#296), the visit's
    // only effect on a full-HP-with-condition patient would be a
    // confusing "+0 HP" outcome and a free morale lift. Filter them
    // out instead.
    let s = trainState();
    s = {
      ...s,
      inventory: { medicine_chest: 1 },
      wagonTrain: {
        ...s.wagonTrain!,
        companions: [
          fakeCompanion({
            id: 'cond',
            leaderProfession: 'farmer',
            party: [
              {
                id: 'cond-p1', name: 'Stoic', kind: 'adult', sex: 'male', age: 30,
                profession: 'farmer', isLeader: true,
                health: 100,
                dead: false,
                conditions: [{ id: 'cholera', daysSinceOnset: 1 }]
              }
            ]
          })
        ]
      }
    };
    const r = doctorVisit(s, 'cond');
    expect(r.treated).toBe(false);
    expect(r.state).toBe(s);
  });

  it('treats a member who has BOTH low HP and a condition (HP path)', () => {
    let s = trainState();
    s = {
      ...s,
      inventory: { medicine_chest: 1 },
      wagonTrain: {
        ...s.wagonTrain!,
        companions: [
          fakeCompanion({
            id: 'both',
            leaderProfession: 'farmer',
            party: [
              {
                id: 'both-p1', name: 'Mary', kind: 'adult', sex: 'female', age: 28,
                profession: 'farmer', isLeader: true,
                health: 40,
                dead: false,
                conditions: [{ id: 'cholera', daysSinceOnset: 2 }]
              }
            ]
          })
        ]
      }
    };
    const r = doctorVisit(s, 'both');
    expect(r.treated).toBe(true);
    expect(r.patientName).toBe('Mary');
    expect(r.hpGained).toBe(30);
    // Condition not cleared (out of scope for phase 1).
    const wagon = r.state.wagonTrain!.companions[0];
    const mary = wagon.party.find((p) => p.id === 'both-p1')!;
    expect(mary.conditions.length).toBe(1);
  });

  it('rejects departed (wiped/arrived/stranded) wagons', () => {
    let s = trainState();
    s = {
      ...s,
      inventory: { medicine_chest: 1 },
      wagonTrain: {
        ...s.wagonTrain!,
        companions: [fakeCompanion({ id: 'gone', leaderProfession: 'farmer', outcome: 'wiped' })]
      }
    };
    expect(() => doctorVisit(s, 'gone')).toThrow(/no longer with the train/i);
  });
});

describe('wagonHasSickMember', () => {
  it('false when all members at 100 HP and no conditions', () => {
    expect(wagonHasSickMember(fakeCompanion({ id: 'h', leaderProfession: 'farmer' }))).toBe(false);
  });

  it('true with at least one HP < 100', () => {
    const c = fakeCompanion({
      id: 's',
      leaderProfession: 'farmer',
      party: [
        {
          id: 'p1', name: 'X', kind: 'adult', sex: 'male', age: 30,
          profession: 'farmer', isLeader: true, health: 50, dead: false, conditions: []
        }
      ]
    });
    expect(wagonHasSickMember(c)).toBe(true);
  });

  it('false at full HP even with an active condition (#296 — until visit clears conditions)', () => {
    // Mirrors the pickSickMember filter: condition-only patients are
    // excluded for now to avoid the confusing "treated +0 HP" outcome.
    // Once #296 lands, broaden both this test and the engine filter.
    const c = fakeCompanion({
      id: 'c',
      leaderProfession: 'farmer',
      party: [
        {
          id: 'p1', name: 'X', kind: 'adult', sex: 'male', age: 30,
          profession: 'farmer', isLeader: true, health: 100, dead: false,
          conditions: [{ id: 'cholera', daysSinceOnset: 1 }]
        }
      ]
    });
    expect(wagonHasSickMember(c)).toBe(false);
  });

  it('ignores dead members', () => {
    const c = fakeCompanion({
      id: 'd',
      leaderProfession: 'farmer',
      party: [
        {
          id: 'p1', name: 'X', kind: 'adult', sex: 'male', age: 30,
          profession: 'farmer', isLeader: true, health: 0, dead: true, conditions: []
        }
      ]
    });
    expect(wagonHasSickMember(c)).toBe(false);
  });
});
