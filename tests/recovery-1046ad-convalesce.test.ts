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
