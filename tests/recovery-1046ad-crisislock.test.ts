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

// #1304 T1 re-baseline: CRISIS_MAX_DAYS=12 replaced with CRISIS_HOLD_DAYS=1.
// The 1-day death-watch/burial halt (Bishop 1849, Stout 1853) is the
// historically-grounded cap. Serial 12-day re-stamps were costing ~47 lost
// days/run and are ahistorical. See docs/superpowers/specs/2026-06-11-train-
// governance-research.md for primary-source citations.
describe('#1046 §13 cap → #1304 T1 CRISIS_HOLD_DAYS=1 forces travel after 1 day', () => {
  it('a crisis block held >= 1 day is forced to travel (sick wagons drop behind)', () => {
    // held = day 30 - blockStartDay 10 = 20 ≥ 1 → travel.
    // Baseline changed from 12 to 1; reason is now "sick wagons drop behind"
    // or "crisis hold complete" depending on whether NPC companions are in crisis.
    const s = withTrain(2, [{ hp: 1 }]);
    const held = {
      ...s, day: 30,
      wagonTrain: { ...s.wagonTrain!, companyDecisionBlock: { mode: 'crisis_layby' as const, blockStartDay: 10 } }
    };
    const d = companyRestDecision(held);
    expect(d.mode).toBe('travel');
    // Reason is now the period-voiced "drop behind" variant (not "crisis cap").
    expect(d.reason).toMatch(/sick wagons drop behind|crisis hold complete/i);
  });

  it('a fresh crisis (held = 0, block just stamped this day) still lays by', () => {
    // held = day 12 - blockStartDay 12 = 0 < 1 → crisis_layby (first day of hold).
    const s = withTrain(2, [{ hp: 1 }]);
    const fresh = {
      ...s, day: 12,
      wagonTrain: { ...s.wagonTrain!, companyDecisionBlock: { mode: 'crisis_layby' as const, blockStartDay: 12 } }
    };
    expect(companyRestDecision(fresh).mode).toBe('crisis_layby');
  });
});
