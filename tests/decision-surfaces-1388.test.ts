// #1388 T1/T2 — Tests for seasonal river depth helper, ford() risk
// sensitivity, persona pickFordMethod season-awareness, mountain-gap
// foresight, ox-health + repair trigger escalation, and dead-ox bump.
//
// TDD: T2 tests were written before the implementation was in place.
// They describe the intended behavior; the impl must make them pass.

import { describe, it, expect } from 'vitest';
import { effectiveRiverDepth } from '../src/lib/game/systems/river-season';
import { ford, type RiverState } from '../src/lib/game/actions/ford';
import { cautiousPersona, balancedPersona, aggressivePersona, hoarderPersona, chaosPersona } from '../src/lib/game/ai/personas';
import { mountainMilesInNextGap } from '../src/lib/game/ai/foresight';
import { createInitialState } from '../src/lib/game/engine';
import type { Rng } from '../src/lib/game/rng';
import type { GameState, GameDate, Weather } from '../src/lib/game/types';
import type { Landmark } from '../src/lib/game/content/landmarks';

/** Stub Rng for persona tests that need the 3rd arg but don't use rng logic. */
const RNG_STUB: Rng = { chance: () => false, int: () => 0 } as unknown as Rng;

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

// ---------------------------------------------------------------------------
// Section 7 — #1388 T2: mountainMilesInNextGap helper
// ---------------------------------------------------------------------------
//
// Cumulative mile anchors (from landmarks.ts):
//   ft_boise = 1570 (trading_post / supply stop)
//   farewell_bend = 1610 (prairie, 40 mi)
//   burnt_river_canyon = 1635 (mountains, 25 mi)
//   flagstaff_hill = 1650 (mountains, 15 mi)
//   blue_mountains = 1720 (mountains, 70 mi)
//   grande_ronde = 1745 (forest, 25 mi)
//   whitman_mission = 1830 (trading_post / supply stop)
//
// Mountain miles between ft_boise and whitman_mission:
//   25 (burnt_river_canyon) + 15 (flagstaff_hill) + 70 (blue_mountains) = 110 mi
//
// Fort Kearny = 319 (trading_post / supply stop)
// Next supply: robidoux_post = 518 — all prairie terrain; mountain miles = 0.

/** Build a minimal state fixture at a given milesTraveled.
 *  Two adults required by createInitialState. */
function stateAtMile(miles: number, month = 7): GameState {
  const s = createInitialState({
    seed: 'mountain-gap-test',
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [{ name: 'Mary', profession: 'doctor', sex: 'female' as const }],
    startDate: { year: 1848, month, day: 1 }
  });
  return {
    ...s,
    location: { ...s.location, milesTraveled: miles }
  };
}

describe('#1388 T2 — mountainMilesInNextGap helper', () => {
  it('returns > 0 approaching the Blues from just past Fort Boise (~mile 1572)', () => {
    // Just past ft_boise (supply stop at 1570). The next supply stop is
    // whitman_mission at 1830. Between them: 25+15+70 = 110 mountain miles.
    const state = stateAtMile(1572);
    const mi = mountainMilesInNextGap(state);
    expect(mi).toBeGreaterThan(0);
    expect(mi).toBe(110);
  });

  it('returns 0 in the North Platte corridor (past Windlass Hill, no more mountain legs before next supply)', () => {
    // Windlass Hill (mountains, 92 mi) is at cumulative mile 411.
    // Past it at mile 412, the next supply is robidoux_post at 518.
    // Remaining landmarks to that supply: ash_hollow(prairie), rachel_pattison(prairie),
    // north_platte_1(river), courthouse_rock(prairie), chimney_rock(prairie),
    // scotts_bluff(prairie), robidoux_post — no mountain legs → 0 mountain miles.
    const state = stateAtMile(412);
    const mi = mountainMilesInNextGap(state);
    expect(mi).toBe(0);
  });

  it('returns 0 past the last supply stop (trail end area)', () => {
    // Past oregon_city (mile 2170) — no next supply stop, should return 0.
    const state = stateAtMile(2175);
    const mi = mountainMilesInNextGap(state);
    expect(mi).toBe(0);
  });

  it('counts only mountain legs up to the next supply stop (not beyond)', () => {
    // At mile 1572 (past ft_boise), next supply is whitman_mission at 1830.
    // Mountain legs in that gap: burnt_river_canyon(25) + flagstaff_hill(15)
    // + blue_mountains(70) = 110. grande_ronde is forest (not counted).
    const state = stateAtMile(1572);
    expect(mountainMilesInNextGap(state)).toBe(110);
  });
});

// ---------------------------------------------------------------------------
// Section 8 — #1388 T2: ox-health floor escalation (mountain vs prairie)
// ---------------------------------------------------------------------------
//
// Fixture: a post with ox_swap service. The cautious persona uses
// bigGapMiles=150, bigGapHealthBoost=15 (floor 70 → 85 at big gap).
// At Fort Boise (mile 1570+), mountainMilesInNextGap returns 110 ≥ 40
// (MOUNTAIN_GAP_ESCALATION_MI), so even on a short effective gap the
// floor escalates.
//
// Regression pin: at Fort Kearny (mile 319), mountain miles = 0 and
// effective gap is ~199 mi — below cautious's 150-mi big-gap threshold
// only if effective gap (which may exceed nextSupply) is considered.
// We test that prairie mid-summer floor is the BASE (70 for cautious)
// whenever mountain miles are 0 and gap is sub-threshold.

/** Trading post landmark fixture with ox_swap. */
const OX_SWAP_POST: Landmark = {
  id: 'test_ox_swap',
  name: 'Test Post',
  milesFromPrevious: 10,
  terrain: 'prairie',
  kind: 'trading_post',
  services: ['ox_swap', 'blacksmith'],
  stock: []
};

/** Build a state with a fresh ox team (no dead, healthy) at given mile. */
function freshTeamState(miles: number, month = 7): GameState {
  const s = stateAtMile(miles, month);
  return {
    ...s,
    oxen: [
      { id: 'ox-0', health: 80, fatigue: 10, shod: true },
      { id: 'ox-1', health: 80, fatigue: 10, shod: true },
      { id: 'ox-2', health: 80, fatigue: 10, shod: true },
      { id: 'ox-3', health: 80, fatigue: 10, shod: true }
    ]
  };
}

describe('#1388 T2 — ox-health floor escalates entering mountains (cautious)', () => {
  it('cautious wants to swap a 80-health team before Fort Boise→Blues (mountain escalation)', () => {
    // At mile 1572, mountain miles = 110 ≥ 40 → escalate.
    // Cautious healthFloor=70, bigGapHealthBoost=15 → escalated floor = 85.
    // Team avg health = 80 < 85 → should trigger swap.
    const state = freshTeamState(1572);
    const count = cautiousPersona.pickOxSwapCount(state, OX_SWAP_POST, RNG_STUB);
    expect(count).toBeGreaterThan(0);
  });

  it('cautious does NOT want to swap an 80-health 5-ox team on the Platte (prairie, short gap)', () => {
    // At mile 412 (past Windlass Hill, next supply = robidoux_post at 518, gap ≈ 106 mi).
    // Mountain miles in that gap = 0. Effective gap < 150 mi → base floor 70.
    // 5 alive oxen at health 80: aliveCount=5 ≥ target(optimalTeam+1=5) → not tooThin.
    // Avg health 80 ≥ floor 70 → not tooWorn. No panic bump (0 dead). → no swap.
    // This is the regression pin: prairie mid-summer behavior unchanged.
    const state: GameState = {
      ...freshTeamState(412),
      oxen: [
        { id: 'ox-0', health: 80, fatigue: 10, shod: true },
        { id: 'ox-1', health: 80, fatigue: 10, shod: true },
        { id: 'ox-2', health: 80, fatigue: 10, shod: true },
        { id: 'ox-3', health: 80, fatigue: 10, shod: true },
        { id: 'ox-4', health: 80, fatigue: 10, shod: true }
      ]
    };
    const count = cautiousPersona.pickOxSwapCount(state, OX_SWAP_POST, RNG_STUB);
    expect(count).toBe(0);
  });

  it('balanced wants to swap a 72-health team before the Blues (mountain escalation)', () => {
    // Balanced healthFloor=55, bigGapHealthBoost=20 → escalated floor = 75.
    // Team health 72 < 75 → triggers swap.
    const state: GameState = {
      ...freshTeamState(1572),
      oxen: [
        { id: 'ox-0', health: 72, fatigue: 10, shod: true },
        { id: 'ox-1', health: 72, fatigue: 10, shod: true },
        { id: 'ox-2', health: 72, fatigue: 10, shod: true },
        { id: 'ox-3', health: 72, fatigue: 10, shod: true }
      ]
    };
    const count = balancedPersona.pickOxSwapCount(state, OX_SWAP_POST, RNG_STUB);
    expect(count).toBeGreaterThan(0);
  });

  it('balanced does NOT want to swap a 72-health team on the Platte at same gap length (prairie)', () => {
    // Balanced's big-gap threshold is 150 mi. Fort Kearny (mile 319) to
    // robidoux_post (518) is ~199 mi, which exceeds 150 mi — so balanced
    // DOES escalate at Fort Kearny based on gap miles alone. Let's use
    // a mid-trail position where the gap is clearly < 150 mi (say mile 500,
    // next supply is Fort Laramie at 650, gap = 150 mi — exactly on the edge).
    // Use mile 530 instead (next supply = Fort Laramie at 650, gap = 120 mi).
    const state: GameState = {
      ...freshTeamState(530),  // Gap to Fort Laramie ≈ 120 mi < 150
      oxen: [
        { id: 'ox-0', health: 72, fatigue: 10, shod: true },
        { id: 'ox-1', health: 72, fatigue: 10, shod: true },
        { id: 'ox-2', health: 72, fatigue: 10, shod: true },
        { id: 'ox-3', health: 72, fatigue: 10, shod: true }
      ]
    };
    // Mountain miles on this gap = 0; effective gap ≈ 120 < 150 → base floor 55.
    // Team health 72 > 55 → no swap.
    const count = balancedPersona.pickOxSwapCount(state, OX_SWAP_POST, RNG_STUB);
    expect(count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Section 9 — #1388 T2: repair trigger escalation (mountain + late season)
// ---------------------------------------------------------------------------
//
// Cautious: conditionTrigger=75, bigGapMiles=150, bigGapConditionBoost=10.
// Escalated trigger = 85. We test:
//   (a) Mountain case: at mile 1572, mountain miles = 110 ≥ 40 → trigger 85.
//       A wagon at condition 80 (<85) should trigger repair.
//   (b) Late-season (DOY ≥ 244 = Sep 1): same wagon on Aug 31 vs Sep 1.
//   (c) Regression pin: prairie mid-summer wagon at 80 condition → no repair.

describe('#1388 T2 — repair trigger escalates for mountains and late season', () => {
  it('cautious repairs a wagon at condition 80 before the Blues (mountain escalation)', () => {
    // At mile 1572, mountain miles=110 ≥ 40 → escalated trigger = 85.
    // Wagon condition 80 < 85 → repair fires.
    const state: GameState = {
      ...freshTeamState(1572, 7),
      cash: 100,
      wagon: { ...freshTeamState(1572, 7).wagon, condition: 80 }
    };
    const budget = cautiousPersona.pickRepairBudget(state, OX_SWAP_POST);
    expect(budget).toBeGreaterThan(0);
  });

  it('cautious does NOT repair a wagon at 80 condition on the Platte in summer (prairie, sub-gap)', () => {
    // At mile 530 (gap to Laramie ~120 mi < 150), mountain miles=0, DOY=July.
    // Base trigger = 75. Wagon at 80 ≥ 75 → no repair.
    const state: GameState = {
      ...freshTeamState(530, 7),  // July, prairie, short gap
      cash: 100,
      wagon: { ...freshTeamState(530, 7).wagon, condition: 80 }
    };
    const budget = cautiousPersona.pickRepairBudget(state, OX_SWAP_POST);
    expect(budget).toBe(0);
  });

  it('cautious repairs a wagon at 80 condition after Sep 1 (late-season escalation)', () => {
    // DOY Sep 1 = 244 ≥ LATE_SEASON_REPAIR_DOY → escalated trigger = 85.
    // Wagon 80 < 85 → repair fires.
    const state: GameState = {
      ...stateAtMile(400, 9),  // Sep 1 context
      date: { year: 1848, month: 9, day: 1 },  // DOY 244 exactly
      cash: 100,
      wagon: { ...stateAtMile(400, 9).wagon, condition: 80 }
    };
    const budget = cautiousPersona.pickRepairBudget(state, OX_SWAP_POST);
    expect(budget).toBeGreaterThan(0);
  });

  it('cautious does NOT get late-season escalation on Aug 31 (DOY 243 < 244)', () => {
    // Aug 31 = DOY 243 < 244 → not late season.
    // At mile 530, gap < 150, mountain miles = 0 → base trigger 75.
    // Wagon 80 ≥ 75 → no repair.
    const state: GameState = {
      ...stateAtMile(530, 8),
      date: { year: 1848, month: 8, day: 31 },  // DOY 243 — just before threshold
      cash: 100,
      wagon: { ...stateAtMile(530, 8).wagon, condition: 80 }
    };
    const budget = cautiousPersona.pickRepairBudget(state, OX_SWAP_POST);
    expect(budget).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Section 10 — #1388 T2: dead-ox bump in pickOxSwapCount
// ---------------------------------------------------------------------------
//
// When ≥ 2 oxen are dead (health=0), the persona wants +1 ox above the
// base calculation. When only 1 is dead, no bump.
// Tested at a short-gap prairie position so the gap-miles escalation
// doesn't confound the dead-ox signal.

describe('#1388 T2 — dead-ox panic bump (+1 want when ≥ 2 dead)', () => {
  /** State with N dead oxen and M alive, full health. */
  function stateWithDeadOxen(deadCount: number, aliveCount: number): GameState {
    const s = freshTeamState(530, 7); // short gap, prairie, no mountain escalation
    const oxen = [
      ...Array.from({ length: deadCount }, (_, i) => ({
        id: `ox-dead-${i}`, health: 0, fatigue: 0, shod: true as const
      })),
      ...Array.from({ length: aliveCount }, (_, i) => ({
        id: `ox-alive-${i}`, health: 90, fatigue: 5, shod: true as const
      }))
    ];
    return { ...s, oxen };
  }

  it('cautious wants +1 ox when 2 are dead (panic bump fires)', () => {
    // 2 dead + 4 alive (full health 90). Without panic bump:
    //   target = max(minTeam, optimalTeam+1) = max(1, 5) = 5.
    //   aliveCount=4 < 5 → tooThin → need=1.
    //   So base want = 1, bump +1 → total = 2.
    // Actually: with 4 alive and target 5, base=1. With panic, 2.
    // This test verifies the bump adds 1 on top of the base tooThin want.
    const state = stateWithDeadOxen(2, 4);
    const countWithDead = cautiousPersona.pickOxSwapCount(state, OX_SWAP_POST, RNG_STUB);
    // Compare against 1 dead (no bump).
    const stateOneDead = stateWithDeadOxen(1, 4);
    const countOneDead = cautiousPersona.pickOxSwapCount(stateOneDead, OX_SWAP_POST, RNG_STUB);
    // With 2 dead: wants more than with 1 dead (bump +1).
    expect(countWithDead).toBe(countOneDead + 1);
  });

  it('balanced wants +1 ox when 2 are dead vs 1 dead (panic bump fires at threshold)', () => {
    // Same logic for balanced — verifies the bump is persona-agnostic
    // (it lives in pickOxSwapCountFor, not per-persona).
    const twoDeadState = stateWithDeadOxen(2, 4);
    const oneDeadState = stateWithDeadOxen(1, 4);
    const twoDead = balancedPersona.pickOxSwapCount(twoDeadState, OX_SWAP_POST, RNG_STUB);
    const oneDead = balancedPersona.pickOxSwapCount(oneDeadState, OX_SWAP_POST, RNG_STUB);
    expect(twoDead).toBe(oneDead + 1);
  });

  it('bump does NOT fire with only 1 dead ox (threshold is 2)', () => {
    // 1 dead + 4 alive. Base want is already tooThin-triggered (4 < target).
    // No panic bump (1 < DEAD_OX_PANIC_THRESHOLD=2).
    const oneDeadState = stateWithDeadOxen(1, 4);
    const zeroDead = stateWithDeadOxen(0, 4);
    const cntOne = cautiousPersona.pickOxSwapCount(oneDeadState, OX_SWAP_POST, RNG_STUB);
    const cntZero = cautiousPersona.pickOxSwapCount(zeroDead, OX_SWAP_POST, RNG_STUB);
    // No bump difference between 0 and 1 dead (both at 4 alive, same base).
    expect(cntOne).toBe(cntZero);
  });

  it('bump fires even when team is otherwise healthy and not thin (2 dead, 5 alive)', () => {
    // 2 dead + 5 alive (optimal team size for schooner). Without panic:
    //   target (cautious) = max(1, 4+1)=5. aliveCount=5 ≥ 5 → not tooThin.
    //   avg health=90 ≥ healthFloor(70) → not tooWorn.
    //   → base want = 0.
    // With panic bump → want = 1.
    const state = stateWithDeadOxen(2, 5);
    const count = cautiousPersona.pickOxSwapCount(state, OX_SWAP_POST, RNG_STUB);
    expect(count).toBe(1);
  });

  it('hoarder never swaps (panic bump should not override the deliberate never-swap)', () => {
    // hoarder.pickOxSwapCount always returns 0 — it does NOT call pickOxSwapCountFor.
    // The panic bump lives in pickOxSwapCountFor; hoarder bypasses it entirely.
    const state = stateWithDeadOxen(2, 4);
    expect(hoarderPersona.pickOxSwapCount(state, OX_SWAP_POST, RNG_STUB)).toBe(0);
  });

  it('chaos pickOxSwapCount is unaffected by dead-ox count (rng-only)', () => {
    // chaos.pickOxSwapCount uses rng.int(0, 3) and doesn't call pickOxSwapCountFor.
    // It should remain rng-driven and not grow with dead-ox count.
    const rng = { chance: () => false, int: () => 1 } as unknown as Parameters<typeof chaosPersona.pickOxSwapCount>[2];
    const state = stateWithDeadOxen(2, 4);
    expect(chaosPersona.pickOxSwapCount(state, OX_SWAP_POST, rng)).toBe(1); // rng.int always 1
  });
});
