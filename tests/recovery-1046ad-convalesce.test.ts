import { describe, it, expect } from 'vitest';
import { applyDailyRecovery, CONVALESCE_HEAL, REST_HEAL_PER_DAY } from '../src/lib/game/systems/travel-recovery';
import { createInitialState } from '../src/lib/game/engine';
import { healingMultiplier } from '../src/lib/game/systems/morale';
import type { GameState } from '../src/lib/game/types';

function s0(opts: { sick?: boolean; food?: boolean; water?: number; morale?: number; doctor?: boolean; pace?: GameState['pace'] } = {}): GameState {
  const s = createInitialState({
    seed: 'a1046',
    leader: { name: 'L', profession: opts.doctor ? 'doctor' : 'farmer' },
    companions: [{ name: 'C', profession: 'farmer' }],
    startDate: { year: 1849, month: 6, day: 15 }
  });
  return {
    ...s,
    morale: opts.morale ?? 60,
    pace: opts.pace ?? 'moderate',
    inventory: opts.food === false ? {} : { flour: 50 },
    resources: { ...s.resources, water: opts.water ?? 20 },
    party: s.party.map((m, i) => ({
      ...m,
      health: 50,
      conditions: opts.sick && i === 0 ? [{ id: 'dysentery' as const, daysSinceOnset: 2 }] : []
    }))
  };
}

describe('#1046 A — in-motion convalesce (traveled=true)', () => {
  it('condition-free member still gets the #161 +1', () => {
    const out = applyDailyRecovery(s0(), true);
    expect(out.party[1].health).toBe(51);
  });
  it('tended sick member convalesces +CONVALESCE_HEAL', () => {
    const out = applyDailyRecovery(s0({ sick: true }), true);
    expect(out.party[0].health).toBe(50 + CONVALESCE_HEAL);
  });
  it('untended sick member gets zero convalesce (pure decline preserved)', () => {
    const out = applyDailyRecovery(s0({ sick: true, food: false }), true);
    expect(out.party[0].health).toBe(50);
  });
  it('doctor accelerates convalesce ×1.5', () => {
    const out = applyDailyRecovery(s0({ sick: true, doctor: true }), true);
    const sick = out.party.find((m) => m.conditions.length > 0)!;
    expect(sick.health).toBe(50 + Math.round(CONVALESCE_HEAL * 1.5));
  });
  it('grueling pace reduces convalesce', () => {
    const moderate = applyDailyRecovery(s0({ sick: true }), true).party[0].health - 50;
    const grueling = applyDailyRecovery(s0({ sick: true, pace: 'grueling' }), true).party[0].health - 50;
    expect(grueling).toBeLessThan(moderate);
    expect(grueling).toBeGreaterThan(0);
  });
});

describe('#1046 A — lay-by rest heal (traveled=false)', () => {
  it('every alive member gets REST_HEAL_PER_DAY * healingMultiplier', () => {
    const st = s0({ sick: true });
    const out = applyDailyRecovery(st, false);
    const expected = 50 + Math.round(REST_HEAL_PER_DAY * healingMultiplier(st.morale));
    expect(out.party[0].health).toBe(expected);
    expect(out.party[1].health).toBe(expected);
  });
});

describe('#161 travel-day heal boundaries', () => {
  it('morale 25 meets the gate — condition-free member heals +1', () => {
    const out = applyDailyRecovery(s0({ morale: 25 }), true);
    expect(out.party[1].health).toBe(51);
  });
  it('morale 24 misses the gate — nobody heals on a travel day', () => {
    const out = applyDailyRecovery(s0({ morale: 24, sick: true }), true);
    expect(out.party[0].health).toBe(50);
    expect(out.party[1].health).toBe(50);
  });
  it('grueling condition-free heal floors at +1, never 0', () => {
    const out = applyDailyRecovery(s0({ pace: 'grueling' }), true);
    expect(out.party[1].health).toBe(51);
  });
  it('fast pace trims tended convalesce to round(5·0.66) = 3', () => {
    const out = applyDailyRecovery(s0({ sick: true, pace: 'fast' }), true);
    expect(out.party[0].health).toBe(53);
  });
  it('doctor care and grueling pace stack: round(5·1.5·0.5) = 4', () => {
    const out = applyDailyRecovery(s0({ sick: true, doctor: true, pace: 'grueling' }), true);
    const sick = out.party.find((m) => m.conditions.length > 0)!;
    expect(sick.health).toBe(54);
  });
  it('empty water keg makes the company untended — zero convalesce', () => {
    const out = applyDailyRecovery(s0({ sick: true, water: 0 }), true);
    expect(out.party[0].health).toBe(50); // sick: no care, pure decline
    expect(out.party[1].health).toBe(51); // healthy +1 is care-independent
  });
});

describe('recovery clamps and dead members', () => {
  it('heals clamp at 100 health', () => {
    const st = s0();
    st.party = st.party.map((m) => ({ ...m, health: 97 }));
    const out = applyDailyRecovery(st, false); // morale 60 → round(8·1.10) = 9
    for (const m of out.party) expect(m.health).toBe(100);
  });
  it('dead members are untouched on travel and lay-by days', () => {
    const st = s0();
    st.party = st.party.map((m, i) => (i === 1 ? { ...m, dead: true } : m));
    expect(applyDailyRecovery(st, true).party[1].health).toBe(50);
    expect(applyDailyRecovery(st, false).party[1].health).toBe(50);
  });
});

describe('#922 lay-by healingMultiplier tiers', () => {
  it('morale 85 → round(8·1.25) = 10', () => {
    const out = applyDailyRecovery(s0({ morale: 85 }), false);
    expect(out.party[0].health).toBe(60);
  });
  it('morale 10 → round(8·0.90) = 7 (pins the floor #922 softened from 0.75)', () => {
    const out = applyDailyRecovery(s0({ morale: 10 }), false);
    expect(out.party[0].health).toBe(57);
  });
});
