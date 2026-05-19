import { describe, it, expect } from 'vitest';
import { trainAggregate, companyRestDecision } from '../src/lib/game/systems/company-rest';
import { createInitialState } from '../src/lib/game/engine';
import type { GameState, NpcWagonState } from '../src/lib/game/types';

function withTrain(playerHP: number, companions: { hp: number }[]): GameState {
  const s = createInitialState({
    seed: 'lock1046', leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'farmer' }],
    startDate: { year: 1849, month: 6, day: 15 }
  });
  const companionWagons: NpcWagonState[] = companions.map((c, i) => ({
    id: `w${i}`,
    name: `W${i}`,
    leaderProfession: 'farmer' as const,
    hasChildren: false,
    seed: `w${i}seed`,
    eventLog: [],
    outcome: 'in-progress' as const,
    rations: 'normal' as const,
    water: 10,
    dirtyWater: 0,
    waterCap: 20,
    dryDays: 0,
    morale: 70,
    cash: 100,
    inventory: {},
    wagon: s.wagon,
    oxen: s.oxen,
    party: [{ id: `p${i}`, name: `M${i}`, health: c.hp, dead: false, conditions: [], age: 30, sex: 'male' as const, kind: 'adult' as const, isLeader: true }]
  }));
  return {
    ...s,
    party: s.party.map((m) => ({ ...m, health: playerHP })),
    wagonTrain: {
      id: 'train-lock1046',
      name: 'Test Company',
      joinedDay: 1,
      joinedAtLandmarkId: null,
      leaderId: 'npc',
      doctrine: 'prudent' as const,
      companions: companionWagons,
      companyDecisionBlock: undefined
    }
  };
}

describe('#1046 §13 B — trainAggregate excludes effectively-dead wagons', () => {
  it('a wagon whose every alive member is <=EFFECTIVE_DEAD_HP is excluded from minPartyHP', () => {
    const agg = trainAggregate(withTrain(60, [{ hp: 55 }, { hp: 2 }]));
    expect(agg.minPartyHP).toBe(55);
  });
  it('fallback: if NO wagon is viable, use all (do not fabricate health)', () => {
    const agg = trainAggregate(withTrain(2, [{ hp: 1 }]));
    expect(agg.minPartyHP).toBeLessThanOrEqual(3);
  });
  it('all-viable behaves exactly as before (no regression)', () => {
    const agg = trainAggregate(withTrain(60, [{ hp: 40 }, { hp: 70 }]));
    expect(agg.minPartyHP).toBe(40);
  });
});

describe('#1046 §13 cap — CRISIS_MAX_DAYS forces travel', () => {
  it('a crisis block held >= CRISIS_MAX_DAYS is forced to travel', () => {
    const s = withTrain(2, [{ hp: 1 }]);
    const held = {
      ...s, day: 30,
      wagonTrain: { ...s.wagonTrain!, companyDecisionBlock: { mode: 'crisis_layby' as const, blockStartDay: 10 } }
    };
    const d = companyRestDecision(held);
    expect(d.mode).toBe('travel');
    expect(d.reason).toMatch(/crisis cap/i);
  });
  it('a fresh/short crisis still lays by (cap not yet reached)', () => {
    const s = withTrain(2, [{ hp: 1 }]);
    const fresh = {
      ...s, day: 12,
      wagonTrain: { ...s.wagonTrain!, companyDecisionBlock: { mode: 'crisis_layby' as const, blockStartDay: 10 } }
    };
    expect(companyRestDecision(fresh).mode).toBe('crisis_layby');
  });
});
