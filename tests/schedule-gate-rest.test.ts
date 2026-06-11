// #1235 / #1304-T4 — Schedule-gate tests for the rest predicate.
// Verifies that non-sacred personas skip Sunday rest when behind schedule.
// #1304-T4 change: sacred personas (faithful/sunday_rester) now keep Sabbath
// at 'behind' but BREAK it at 'critical' (the mountain-deadline agony).

import { describe, it, expect } from 'vitest';
import {
  balancedPersona,
  faithfulPersona,
  sundayResterPersona
} from '../src/lib/game/ai/personas';
import { TOTAL_TRAIL_MI } from '../src/lib/game/ai/schedule';
import type { GameState } from '../src/lib/game/types';

// A Sunday (1849-06-17 verified in sunday-layby-224.test.ts), healthy party.
//
// CRITICAL state: day=100, milesTraveled = TOTAL_TRAIL_MI * 100 / 219.5
//   projectedArrival ≈ 219.5
//   estimateSnowSafeDay (no signals, no child) = 185 (baseline)
//   effectiveTarget = min(persona.target, 185)
//   faithful target = 195 → effectiveTarget = 185
//   219.5 > 185 + 15 = 200 → 'critical'
//   → faithful/sunday_rester break Sabbath (#1304-T4)
function criticalSunday(): GameState {
  return {
    day: 100,
    date: { year: 1849, month: 6, day: 17 },
    location: { milesTraveled: (TOTAL_TRAIL_MI * 100) / 219.5 },
    morale: 80,
    party: [{
      id: 'p0', name: 'Leader', sex: 'male', kind: 'adult',
      isLeader: true, age: 30, health: 100, cleanliness: 100,
      conditions: [], dead: false, profession: 'farmer'
    }],
    oxen: [
      { id: 'ox-0', health: 100, fatigue: 0, shod: true },
      { id: 'ox-1', health: 100, fatigue: 0, shod: true }
    ],
    inventory: {},
    flags: {}
  } as unknown as GameState;
}

// BEHIND (not critical) state for faithful: day=100, project ≈ 192
//   faithful target=195 → effectiveTarget = min(195, 185) = 185
//   Wait — faithful's effective target is 185 (the snow-safe baseline).
//   Need projectedArrival > 185 but ≤ 185+15=200 → 'behind'.
//   day=100, target proj = 192: milesTraveled = 100 * TOTAL_TRAIL_MI / 192
function behindSundayFaithful(): GameState {
  return {
    day: 100,
    date: { year: 1849, month: 6, day: 17 },
    location: { milesTraveled: (TOTAL_TRAIL_MI * 100) / 192 }, // projects to day ~192 ('behind' for effectiveTarget=185)
    morale: 80,
    party: [{
      id: 'p0', name: 'Leader', sex: 'male', kind: 'adult',
      isLeader: true, age: 30, health: 100, cleanliness: 100,
      conditions: [], dead: false, profession: 'farmer'
    }],
    oxen: [
      { id: 'ox-0', health: 100, fatigue: 0, shod: true },
      { id: 'ox-1', health: 100, fatigue: 0, shod: true }
    ],
    inventory: {},
    flags: {}
  } as unknown as GameState;
}

describe('#1235 shouldRest schedule gate', () => {
  it('balanced (non-sacred) skips Sunday rest when behind + healthy', () => {
    expect(balancedPersona.shouldRest(criticalSunday(), {} as never)).toBe(false);
  });

  it('#1304-T4 (re-baseline #1235) — faithful keeps Sabbath at "behind" pressure', () => {
    // At 'behind' (effective target 185, projected ~192), faithful observes the Sabbath.
    // The hesitation is real — the agony is "should we push on?" not "obviously push."
    expect(faithfulPersona.shouldRest(behindSundayFaithful(), {} as never)).toBe(true);
  });

  it('#1304-T4 (re-baseline #1235) — faithful breaks Sabbath at "critical" pressure', () => {
    // At 'critical' (projected ~219.5, far past the 185+15=200 bar), even faithful breaks
    // the Sabbath. Period reality: devout captains made the tragic call when the passes
    // were closing (Faragher 1979). The critical bar is deliberately high so the break
    // only fires when the deadline is genuinely urgent.
    expect(faithfulPersona.shouldRest(criticalSunday(), {} as never)).toBe(false);
  });

  it('#1304-T4 (re-baseline #1235) — sunday_rester keeps Sabbath at "behind" pressure', () => {
    expect(sundayResterPersona.shouldRest(behindSundayFaithful(), {} as never)).toBe(true);
  });

  it('#1304-T4 (re-baseline #1235) — sunday_rester breaks Sabbath at "critical" pressure', () => {
    expect(sundayResterPersona.shouldRest(criticalSunday(), {} as never)).toBe(false);
  });
});
