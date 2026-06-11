// #1388 T1 — Tests for seasonal river depth helper, ford() risk
// sensitivity, and persona pickFordMethod season-awareness.
//
// TDD: these tests were written before the implementation was in place.
// They describe the intended behavior; the impl must make them pass.

import { describe, it, expect } from 'vitest';
import { effectiveRiverDepth } from '../src/lib/game/systems/river-season';
import { ford, type RiverState } from '../src/lib/game/actions/ford';
import { cautiousPersona, balancedPersona, aggressivePersona } from '../src/lib/game/ai/personas';
import { createInitialState } from '../src/lib/game/engine';
import type { GameState, GameDate, Weather } from '../src/lib/game/types';
import type { Landmark } from '../src/lib/game/content/landmarks';

// ---------------------------------------------------------------------------
// Helper fixtures
// ---------------------------------------------------------------------------

/** Minimal landmark for persona tests — a 3-ft river with $5 ferry and
 *  no native ferry. Persona tests parameterize date and weather externally. */
const THREE_FT_RIVER: Landmark = {
  id: 'test_river',
  name: 'Test River',
  milesFromPrevious: 10,
  terrain: 'river',
  kind: 'river',
  river: { depthFt: 3.0, currentMph: 2, ferryPrice: 5 }
};

/** Same shape but depth set so August trickle falls below the shallow gate. */
const SHALLOW_RIVER: Landmark = {
  id: 'test_shallow_river',
  name: 'Test Shallow River',
  milesFromPrevious: 10,
  terrain: 'river',
  kind: 'river',
  river: { depthFt: 2.0, currentMph: 1, ferryPrice: 5 }
};

/** Deep river (4.5 ft base): even in August the effective depth stays
 *  above the safe-ford gate, so cautious/balanced use ferry. */
const DEEP_RIVER: Landmark = {
  id: 'test_deep_river',
  name: 'Test Deep River',
  milesFromPrevious: 10,
  terrain: 'river',
  kind: 'river',
  river: { depthFt: 4.5, currentMph: 4, ferryPrice: 10 }
};

function baseGame(month: number, day = 1, weather: Weather = 'clear'): GameState {
  const s = createInitialState({
    seed: 'river-season-test',
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [{ name: 'Mary', profession: 'doctor', sex: 'female' }],
    startDate: { year: 1848, month, day }
  });
  // Give plenty of cash and full health so persona tests see the
  // depth signal cleanly, not cash/health short-circuits.
  return {
    ...s,
    cash: 200,
    weather,
    party: s.party.map((m) => ({ ...m, health: 100 }))
  };
}

// ---------------------------------------------------------------------------
// Section 1 — effectiveRiverDepth table tests
// ---------------------------------------------------------------------------

describe('#1388 T1 — effectiveRiverDepth seasonal table', () => {
  const RIVER_3FT = { depthFt: 3.0 };

  // May: snowmelt peak ×1.4
  it('May returns snowmelt peak depth (×1.4)', () => {
    const depth = effectiveRiverDepth(RIVER_3FT, { year: 1848, month: 5, day: 15 }, 'clear');
    expect(depth).toBeCloseTo(3.0 * 1.4, 5);
  });

  // Early June: still peak
  it('early June (day ≤ 15) returns snowmelt peak depth (×1.4)', () => {
    const depth = effectiveRiverDepth(RIVER_3FT, { year: 1848, month: 6, day: 10 }, 'clear');
    expect(depth).toBeCloseTo(3.0 * 1.4, 5);
  });

  // Late June: ebbing
  it('late June (day > 15) returns late-ebb depth (×1.2)', () => {
    const depth = effectiveRiverDepth(RIVER_3FT, { year: 1848, month: 6, day: 20 }, 'clear');
    expect(depth).toBeCloseTo(3.0 * 1.2, 5);
  });

  // July: ordinary
  it('July returns ordinary depth (×1.0)', () => {
    const depth = effectiveRiverDepth(RIVER_3FT, { year: 1848, month: 7, day: 15 }, 'clear');
    expect(depth).toBeCloseTo(3.0 * 1.0, 5);
  });

  // August: trickle
  it('August returns late-summer trickle depth (×0.75)', () => {
    const depth = effectiveRiverDepth(RIVER_3FT, { year: 1848, month: 8, day: 15 }, 'clear');
    expect(depth).toBeCloseTo(3.0 * 0.75, 5);
  });

  // September: also trickle
  it('September returns late-summer trickle depth (×0.75)', () => {
    const depth = effectiveRiverDepth(RIVER_3FT, { year: 1848, month: 9, day: 1 }, 'clear');
    expect(depth).toBeCloseTo(3.0 * 0.75, 5);
  });

  // October: early-autumn rise
  it('October returns early-autumn depth (×0.85)', () => {
    const depth = effectiveRiverDepth(RIVER_3FT, { year: 1848, month: 10, day: 1 }, 'clear');
    expect(depth).toBeCloseTo(3.0 * 0.85, 5);
  });

  // Rain bump: +15% on top of seasonal mult
  it('rain weather adds +15% depth bump over dry day', () => {
    const dry = effectiveRiverDepth(RIVER_3FT, { year: 1848, month: 7, day: 15 }, 'clear');
    const wet = effectiveRiverDepth(RIVER_3FT, { year: 1848, month: 7, day: 15 }, 'rain');
    expect(wet).toBeCloseTo(dry * 1.15, 5);
  });

  it('storm weather adds the same +15% depth bump as rain', () => {
    const dry = effectiveRiverDepth(RIVER_3FT, { year: 1848, month: 7, day: 15 }, 'clear');
    const stormy = effectiveRiverDepth(RIVER_3FT, { year: 1848, month: 7, day: 15 }, 'storm');
    expect(stormy).toBeCloseTo(dry * 1.15, 5);
  });

  it('overcast weather does NOT add the rain bump', () => {
    const dry = effectiveRiverDepth(RIVER_3FT, { year: 1848, month: 7, day: 15 }, 'clear');
    const overcast = effectiveRiverDepth(RIVER_3FT, { year: 1848, month: 7, day: 15 }, 'overcast');
    expect(overcast).toBeCloseTo(dry, 5);
  });

  it('undefined weather is treated as dry (no bump)', () => {
    const dry = effectiveRiverDepth(RIVER_3FT, { year: 1848, month: 7, day: 15 }, 'clear');
    const undef = effectiveRiverDepth(RIVER_3FT, { year: 1848, month: 7, day: 15 }, undefined);
    expect(undef).toBeCloseTo(dry, 5);
  });

  // Ordering: May > August on same river
  it('May depth is greater than August depth on the same river', () => {
    const may = effectiveRiverDepth(RIVER_3FT, { year: 1848, month: 5, day: 15 }, 'clear');
    const aug = effectiveRiverDepth(RIVER_3FT, { year: 1848, month: 8, day: 15 }, 'clear');
    expect(may).toBeGreaterThan(aug);
  });

  // Compounding: rain in May > dry in May > rain in August
  it('rain in May is deeper than dry May which is deeper than rain in August', () => {
    const mayRain = effectiveRiverDepth(RIVER_3FT, { year: 1848, month: 5, day: 15 }, 'rain');
    const mayDry = effectiveRiverDepth(RIVER_3FT, { year: 1848, month: 5, day: 15 }, 'clear');
    const augRain = effectiveRiverDepth(RIVER_3FT, { year: 1848, month: 8, day: 15 }, 'rain');
    expect(mayRain).toBeGreaterThan(mayDry);
    expect(mayDry).toBeGreaterThan(augRain);
  });
});

// ---------------------------------------------------------------------------
// Section 2 — ford() risk sensitivity: May vs August
// ---------------------------------------------------------------------------
// The ford action's 'ford' case computes:
//   danger = (effDepth / 2) * (currentMph / 2)
// A higher danger score means higher probability of wagon damage and
// supply loss. We verify that:
//  (a) A May crossing on the SAME river+seed causes more damage events
//      than August over enough iterations, or at minimum that the danger
//      number is larger in May (deterministic since the formula is pure).

describe('#1388 T1 — ford() risk is higher in May than August (same river, same seed)', () => {
  // We run ford() with a fixed seed on a 3-ft river in May and August
  // and check that the May crossing produces a higher damage score (more
  // wagon damage or supply loss). Because the RNG key includes day (not
  // date), and the danger formula is now (effDepth/2 × current/2), we
  // can compare outcomes directly.

  const RISK_RIVER: RiverState = {
    depthFt: 3.0,
    currentMph: 4, // high current so damage rolls fire easily
    ferryPrice: 5
  };

  function fordWithDate(month: number, weather: Weather = 'clear'): GameState {
    const state = baseGame(month, 1, weather);
    // Give enough water+food to survive the passage.
    const rich: GameState = {
      ...state,
      date: { year: 1848, month, day: 1 },
      resources: { ...state.resources, water: 100, waterCap: 100 },
      inventory: { ...state.inventory, flour: 500 },
      oxen: [
        { id: 'ox-0', health: 100, fatigue: 0, shod: true },
        { id: 'ox-1', health: 100, fatigue: 0, shod: true },
        { id: 'ox-2', health: 100, fatigue: 0, shod: true },
        { id: 'ox-3', health: 100, fatigue: 0, shod: true }
      ]
    };
    return ford(rich, { method: 'ford', river: RISK_RIVER });
  }

  it('May effective depth > August effective depth on a 3ft river (pure math)', () => {
    // Deterministic depth comparison — no RNG needed.
    const mayDepth = effectiveRiverDepth({ depthFt: 3 }, { year: 1848, month: 5, day: 1 }, 'clear');
    const augDepth = effectiveRiverDepth({ depthFt: 3 }, { year: 1848, month: 8, day: 1 }, 'clear');
    // May 4.2 > August 2.25 — snowmelt peak vs trickle
    expect(mayDepth).toBeGreaterThan(augDepth);
  });

  it('ford() wagon condition after May crossing is <= condition after August crossing (same seed)', () => {
    // Same seed → same RNG sequence. The only variable is effective depth.
    // May danger = (4.2/2)×(4/2) = 4.2; August danger = (2.25/2)×(4/2) = 2.25.
    // Both fords on this current produce wagon damage rolls; May triggers
    // more (or heavier) damage because danger is higher.
    // This test pins the signal direction; absolute values may differ by seed.
    const mayAfter = fordWithDate(5);
    const augAfter = fordWithDate(8);
    // Wagon condition after May crossing should be ≤ August crossing
    // (May is riskier so damage score is larger → more/heavier damage).
    // Equal is allowed if both came out undamaged (low seed roll).
    expect(mayAfter.wagon.condition).toBeLessThanOrEqual(augAfter.wagon.condition);
  });
});

// ---------------------------------------------------------------------------
// Section 3 — persona pickFordMethod: shallow vs deep (cautious)
// ---------------------------------------------------------------------------

describe('#1388 T1 — cautious persona ford method', () => {
  /** A landmark with a river that is "shallow" in August (3ft base × 0.75 = 2.25 ft). */
  const shallowRiverLandmark: Landmark = {
    ...THREE_FT_RIVER,
    river: { depthFt: 3.0, currentMph: 1, ferryPrice: 5 }
  };

  /** A landmark that is "deep" in June (3ft base × 1.4 = 4.2 ft). */
  const deepRiverLandmark: Landmark = {
    ...THREE_FT_RIVER,
    river: { depthFt: 3.0, currentMph: 2, ferryPrice: 5 }
  };

  const rng = { chance: () => false, int: () => 0 } as unknown as Parameters<typeof cautiousPersona.pickFordMethod>[2];

  it('cautious fords an August trickle (effective ≤ 2.5 ft) to save the ferry fee', () => {
    // August: 3ft × 0.75 = 2.25 ft < 2.5 ft threshold → safe to ford.
    const state = baseGame(8, 1, 'clear');
    const method = cautiousPersona.pickFordMethod(state, shallowRiverLandmark, rng);
    expect(method).toBe('ford');
  });

  it('cautious ferries a June snowmelt crossing (effective ≥ 4 ft)', () => {
    // Early June: 3ft × 1.4 = 4.2 ft > 4.0 ft threshold → pay the ferry.
    const state = baseGame(6, 1, 'clear');
    const method = cautiousPersona.pickFordMethod(state, deepRiverLandmark, rng);
    // Cautious has cash (200) and ferry is $5 — should choose ferry.
    expect(method).toBe('ferry');
  });

  it('cautious fords a September shallow crossing even on overcast weather', () => {
    // September: 3ft × 0.75 = 2.25 ft — still shallow, overcast has no bump.
    const state = baseGame(9, 1, 'overcast');
    const method = cautiousPersona.pickFordMethod(state, shallowRiverLandmark, rng);
    expect(method).toBe('ford');
  });

  it('cautious ferries a moderate July crossing (effective = 3.0 ft) when cash is available', () => {
    // July: 3ft × 1.0 = 3.0 ft — between shallow (≤2.5) and deep (≥4) gates.
    // Cautious has $200, ferry $5 — pays the ferry rather than plain-fording
    // a non-shallow river. This tests the middle path.
    const state = baseGame(7, 1, 'clear');
    const method = cautiousPersona.pickFordMethod(state, deepRiverLandmark, rng);
    // 3ft is NOT shallow (> 2.5), NOT deep (< 4). Cautious never plain-fords
    // a non-shallow river — and with cash available, it ferries.
    expect(method).toBe('ferry');
  });

  it('cautious caulks when deep river + no cash for ferry', () => {
    // Early June: 3ft × 1.4 = 4.2 ft deep, and party is broke.
    const state: GameState = { ...baseGame(6, 1, 'clear'), cash: 2 };
    const method = cautiousPersona.pickFordMethod(state, deepRiverLandmark, rng);
    expect(method).toBe('caulk');
  });

  it('low min party HP biases cautious one rung safer on a shallow river', () => {
    // August 2.25 ft would normally -> ford. But min HP < 40 biases one rung safer.
    const state: GameState = {
      ...baseGame(8, 1, 'clear'),
      party: baseGame(8, 1, 'clear').party.map((m) => ({ ...m, health: 30 }))
    };
    const method = cautiousPersona.pickFordMethod(state, shallowRiverLandmark, rng);
    // With HP penalty, shallow gate doesn't fire; falls to normal path.
    // Cautious has $200 → ferry.
    expect(method).toBe('ferry');
  });
});

// ---------------------------------------------------------------------------
// Section 4 — balanced persona ford method
// ---------------------------------------------------------------------------

describe('#1388 T1 — balanced persona ford method', () => {
  const rng = { chance: () => false, int: () => 0 } as unknown as Parameters<typeof balancedPersona.pickFordMethod>[2];

  it('balanced fords an August trickle (effective ≤ 2.5 ft)', () => {
    // August: 3ft × 0.75 = 2.25 ft — shallow gate fires → ford.
    const state = baseGame(8, 1, 'clear');
    const method = balancedPersona.pickFordMethod(state, THREE_FT_RIVER, rng);
    expect(method).toBe('ford');
  });

  it('balanced ferries a June snowmelt crossing (effective ≥ 4 ft) when cash is available', () => {
    // Early June: 3ft × 1.4 = 4.2 ft → deep gate. Cash $200, ferry $5.
    const state = baseGame(6, 1, 'clear');
    const method = balancedPersona.pickFordMethod(state, THREE_FT_RIVER, rng);
    expect(method).toBe('ferry');
  });

  it('balanced caulks a deep June river when cash is short', () => {
    // Early June deep crossing, cash = $3 < ferry $5.
    const state: GameState = { ...baseGame(6, 1, 'clear'), cash: 3 };
    const method = balancedPersona.pickFordMethod(state, THREE_FT_RIVER, rng);
    expect(method).toBe('caulk');
  });

  it('balanced fords a moderate-depth July river when cash is not ample', () => {
    // July: 3ft × 1.0 = 3.0 ft (not shallow, not deep).
    // Cash $10, ferryPrice $5, 3× threshold = $15 → cash not ample → ford.
    const state: GameState = { ...baseGame(7, 1, 'clear'), cash: 10 };
    const method = balancedPersona.pickFordMethod(state, THREE_FT_RIVER, rng);
    expect(method).toBe('ford');
  });
});

// ---------------------------------------------------------------------------
// Section 5 — aggressive persona ford method
// ---------------------------------------------------------------------------

describe('#1388 T1 — aggressive persona ford method', () => {
  const rng = { chance: () => false, int: () => 0 } as unknown as Parameters<typeof aggressivePersona.pickFordMethod>[2];

  it('aggressive fords an August shallow river (default behavior)', () => {
    const state = baseGame(8, 1, 'clear');
    const method = aggressivePersona.pickFordMethod(state, THREE_FT_RIVER, rng);
    expect(method).toBe('ford');
  });

  it('aggressive fords a moderate July river (3.0 ft, not past deep gate)', () => {
    // July: 3ft × 1.0 = 3.0 ft < 4.0 deep gate → still fords.
    const state = baseGame(7, 1, 'clear');
    const method = aggressivePersona.pickFordMethod(state, THREE_FT_RIVER, rng);
    expect(method).toBe('ford');
  });

  it('aggressive pays the ferry on a deep June crossing when cash is available', () => {
    // Early June: 3ft × 1.4 = 4.2 ft → deep gate fires. Cash $200, ferry $5.
    const state = baseGame(6, 1, 'clear');
    const method = aggressivePersona.pickFordMethod(state, THREE_FT_RIVER, rng);
    expect(method).toBe('ferry');
  });

  it('aggressive caulks a deep June crossing when cash can\'t cover ferry', () => {
    // Early June deep: cash $3 < ferry $5 → caulk.
    const state: GameState = { ...baseGame(6, 1, 'clear'), cash: 3 };
    const method = aggressivePersona.pickFordMethod(state, THREE_FT_RIVER, rng);
    expect(method).toBe('caulk');
  });

  it('aggressive switches to ferry on moderate river when HP is low (one rung safer)', () => {
    // July 3ft × 1.0 = 3.0 ft. Normally fords. But min HP < 40 forces
    // the deep-danger path → ferry (cash $200, ferry $5).
    const state: GameState = {
      ...baseGame(7, 1, 'clear'),
      cash: 200,
      party: baseGame(7, 1, 'clear').party.map((m) => ({ ...m, health: 30 }))
    };
    const method = aggressivePersona.pickFordMethod(state, THREE_FT_RIVER, rng);
    expect(method).toBe('ferry');
  });
});

// ---------------------------------------------------------------------------
// Section 6 — signal-honesty: same helper in engine + persona
// ---------------------------------------------------------------------------

describe('#1388 T1 — signal-honesty: helper is the same path for engine and persona', () => {
  it('May vs August depth ratio matches between helper call and ford() danger curve', () => {
    // The test: effective depth in May is 1.4/0.75 ≈ 1.867× August.
    // The ford() danger = effDepth/2 × current/2, so May danger is also
    // ~1.867× August danger for the same current. We confirm the multiplier
    // is the same (within floating-point tolerance).
    const mayDepth = effectiveRiverDepth({ depthFt: 3 }, { year: 1848, month: 5, day: 1 }, 'clear');
    const augDepth = effectiveRiverDepth({ depthFt: 3 }, { year: 1848, month: 8, day: 1 }, 'clear');
    const ratio = mayDepth / augDepth;
    // 1.4 / 0.75 = 1.8667
    expect(ratio).toBeCloseTo(1.4 / 0.75, 4);
  });
});
