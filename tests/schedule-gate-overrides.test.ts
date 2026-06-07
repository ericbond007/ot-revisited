// #1235 — Schedule-gate tests for the override personas (cautious / aggressive / chaos).
// The existing gate tests only exercise balancedPersona.  These cover the three personas
// that define their OWN shouldHunt / shouldFindWater (and chaos shouldHunt) so that
// their suppressCamp wiring is independently tested.

import { describe, it, expect } from 'vitest';
import { cautiousPersona, aggressivePersona, chaosPersona } from '../src/lib/game/ai/personas';
import { TOTAL_TRAIL_MI } from '../src/lib/game/ai/schedule';
import type { GameState } from '../src/lib/game/types';
import type { Rng } from '../src/lib/game/rng';

// ---------------------------------------------------------------------------
// Fixture math — behind-schedule state
//
//   day=100, milesTraveled = TOTAL_TRAIL_MI * 100 / 219
//   projectedArrival = 100 * (2195 / miles) = 219
//
//   cautious   target=190, critical margin=15 → 219 > 190+15=205 → 'critical'
//   aggressive target=175, critical margin=15 → 219 > 175+15=190 → 'critical'
//   chaos      targetArrivalDay=null → schedulePressure always 'ok' (exempt)
//
// Robustness gate (tooFragileToPush must be false so suppressCamp fires):
//   morale=60 >= MIN_PUSH_MORALE (55), health=80 >= MIN_PUSH_HP (60)
//
// canHunt requirements: rifle>=1, gunpowder>=5, lead_balls>=5, percussion_caps>=5
// foodOnHand = flour+beans+bacon+... (all food in `flour` for simplicity)
// ---------------------------------------------------------------------------

const BEHIND_MILES = (TOTAL_TRAIL_MI * 100) / 219;

/** Robust party: all alive health >= 60, morale = 60 >= 55 → tooFragileToPush = false. */
function robustParty() {
  return [
    {
      id: 'p0', name: 'Leader', sex: 'male' as const, kind: 'adult' as const,
      isLeader: true, age: 30, health: 80, cleanliness: 80,
      conditions: [], dead: false, profession: 'farmer'
    }
  ];
}

/** Behind-schedule state with canHunt=true and food set to `food` lb. */
function behindHuntable(food: number): GameState {
  return {
    day: 100,
    date: { year: 1849, month: 7, day: 10 },
    location: { milesTraveled: BEHIND_MILES, terrain: 'prairie' },
    inventory: {
      rifle: 1,
      gunpowder: 10,
      lead_balls: 10,
      percussion_caps: 10,
      flour: food     // foodOnHand = food lb
    },
    party: robustParty(),
    oxen: [{ id: 'ox-0', health: 100, fatigue: 0, shod: true }],
    resources: { water: 10, waterCap: 20 },
    morale: 60,       // >= MIN_PUSH_MORALE (55) — party is robust
    flags: {}
  } as unknown as GameState;
}

/** On-time state: projectedArrival ≈ 100 (day=50, miles= TOTAL_TRAIL_MI*50/100)
 *  → pressure 'ok' for both cautious (target=190) and aggressive (target=175). */
function ontimeHuntable(food: number): GameState {
  return {
    day: 50,
    date: { year: 1849, month: 5, day: 15 },
    location: { milesTraveled: (TOTAL_TRAIL_MI * 50) / 100, terrain: 'prairie' },
    inventory: {
      rifle: 1,
      gunpowder: 10,
      lead_balls: 10,
      percussion_caps: 10,
      flour: food
    },
    party: robustParty(),
    oxen: [{ id: 'ox-0', health: 100, fatigue: 0, shod: true }],
    resources: { water: 10, waterCap: 20 },
    morale: 60,
    flags: {}
  } as unknown as GameState;
}

/** Behind-schedule state with keg at water/cap. */
function behindWatery(water: number, cap: number): GameState {
  return {
    day: 100,
    date: { year: 1849, month: 7, day: 10 },
    location: { milesTraveled: BEHIND_MILES, terrain: 'prairie' },
    inventory: {},
    party: robustParty(),
    oxen: [{ id: 'ox-0', health: 100, fatigue: 0, shod: true }],
    resources: { water, waterCap: cap },
    morale: 60,
    flags: {}
  } as unknown as GameState;
}

// ---------------------------------------------------------------------------
// Fake RNG — chance(p) always returns true so rng-driven predicates
// (chaos.shouldHunt) take the "yes" path when the gate does not veto.
// ---------------------------------------------------------------------------
const alwaysTrue: Rng = {
  chance: (_p: number) => true,
  int: (_lo: number, hi: number) => hi,
  float: (_lo: number, hi: number) => hi,
  seed: 0
} as unknown as Rng;

// ---------------------------------------------------------------------------
// cautious.shouldHunt
// ---------------------------------------------------------------------------
describe('#1235 cautious.shouldHunt schedule gate', () => {
  // cautious hunts when canHunt && food < 180 (no Hunter in party).
  // Discretionary band: STARVATION_FLOOR (45) < food < 180.
  // At food=120 (above starvation floor, below hunt threshold):
  //   on-time → suppressCamp false → predicate true
  //   behind  → suppressCamp true (120 > 45) → return false (gated)
  //
  // At food=20 (≤ STARVATION_FLOOR):
  //   suppressCamp false (critical override) → canHunt && 20 < 180 → true

  it('(control) cautious hunts at food=120 when on schedule', () => {
    // pressure='ok' → suppressCamp=false → canHunt && 120 < 180 → true
    expect(cautiousPersona.shouldHunt(ontimeHuntable(120), {} as never)).toBe(true);
  });

  it('cautious skips discretionary hunt when behind + food=120', () => {
    // suppressCamp returns true (120 > STARVATION_FLOOR=45) → return false
    expect(cautiousPersona.shouldHunt(behindHuntable(120), {} as never)).toBe(false);
  });

  it('cautious still hunts near starvation even when behind (food=20 ≤ starvation floor)', () => {
    // suppressCamp returns false (20 ≤ 45 = STARVATION_FLOOR) → critical override
    // canHunt=true, 20 < 180 → return true
    expect(cautiousPersona.shouldHunt(behindHuntable(20), {} as never)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// aggressive.shouldHunt
// ---------------------------------------------------------------------------
describe('#1235 aggressive.shouldHunt schedule gate', () => {
  // aggressive hunts when canHunt && food < 25.
  // STARVATION_FLOOR = 45.
  //
  // NOTE: aggressive's hunt threshold (25) is BELOW the starvation floor (45).
  // The bands don't overlap:
  //   food > 45 → gate would suppress, but base predicate (food < 25) is also false.
  //   food < 25 → starvation-critical zone → suppressCamp returns false (no suppression).
  //   25 ≤ food ≤ 45 → base predicate false; suppressCamp also false.
  //
  // In practice the gate is structurally harmless for aggressive.shouldHunt —
  // there is no food value that simultaneously passes the base predicate AND
  // gets gated.  The tests document this analytically.

  it('(control) aggressive does not hunt at food=120 when on schedule (food ≥ threshold=25)', () => {
    // pressure='ok', but 120 ≥ 25 → canHunt && food<25 = false
    expect(aggressivePersona.shouldHunt(ontimeHuntable(120), {} as never)).toBe(false);
  });

  it('aggressive does not hunt when behind + food=120 (gate fires; base also false)', () => {
    // suppressCamp=true (120 > 45); canHunt && 120 < 25 = false regardless
    expect(aggressivePersona.shouldHunt(behindHuntable(120), {} as never)).toBe(false);
  });

  it('aggressive hunts near starvation when behind (food=20 ≤ starvation floor AND < threshold=25)', () => {
    // suppressCamp=false (20 ≤ 45 = STARVATION_FLOOR) → critical override
    // canHunt=true, 20 < 25 → return true
    expect(aggressivePersona.shouldHunt(behindHuntable(20), {} as never)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// aggressive.shouldFindWater — critical water override
// ---------------------------------------------------------------------------
describe('#1235 aggressive.shouldFindWater schedule gate', () => {
  // aggressive finds water when ratio < desertWaterFloor(state, 0.20, 0.25).
  // Non-desert terrain → floor = 0.20.
  // CRITICAL_WATER_RATIO = 0.35.
  //
  // Critical override: ratio < 0.35 → suppressCamp returns false (no veto).
  //   ratio=0.05 (water=1, cap=20): 0.05 < 0.35 → no suppression; 0.05 < 0.20 → true.
  //
  // This is the load-bearing case: proves behind-schedule aggressive still stops
  // to fill a near-empty keg, same as balanced.

  it('(control) aggressive finds water at ratio=0.05 when on schedule', () => {
    const ontime: GameState = {
      day: 50,
      date: { year: 1849, month: 5, day: 15 },
      location: { milesTraveled: (TOTAL_TRAIL_MI * 50) / 100, terrain: 'prairie' },
      inventory: {},
      party: robustParty(),
      oxen: [{ id: 'ox-0', health: 100, fatigue: 0, shod: true }],
      resources: { water: 1, waterCap: 20 },  // ratio = 0.05
      morale: 60,
      flags: {}
    } as unknown as GameState;
    // pressure='ok' → suppressCamp=false; 0.05 < 0.20 → true
    expect(aggressivePersona.shouldFindWater(ontime, {} as never)).toBe(true);
  });

  it('aggressive finds water on near-empty keg even when behind (critical override)', () => {
    // ratio=1/20=0.05 < CRITICAL_WATER_RATIO (0.35) → suppressCamp returns false
    // 0.05 < aggressive non-desert floor 0.20 → base predicate true → return true
    expect(aggressivePersona.shouldFindWater(behindWatery(1, 20), {} as never)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// chaos.shouldHunt — the key exemption assertion
// ---------------------------------------------------------------------------
describe('#1235 chaos.shouldHunt — exempt from schedule gate', () => {
  // chaos.shouldHunt = canHunt(state) && rng.chance(0.20)
  // No suppressCamp call.  chaos doctrine targetArrivalDay=null → gate would
  // always return 'ok' even if wired.  This is the most important assertion:
  // it proves chaos is correctly exempt from the schedule-pressure veto.
  //
  // We use alwaysTrue RNG so rng.chance(0.20) returns true, isolating the
  // canHunt / schedule-gate logic from RNG variance.

  it('chaos hunts when behind + discretionary food (canHunt=true, rng says yes)', () => {
    // projectedArrival=219 would be critical for cautious/aggressive.
    // chaos has no suppressCamp call → no suppression → canHunt=true, rng=true → true
    expect(chaosPersona.shouldHunt(behindHuntable(120), alwaysTrue)).toBe(true);
  });

  it('chaos does NOT hunt when canHunt=false (no rifle), regardless of schedule', () => {
    // Confirms canHunt gate still blocks chaos even when rng says yes.
    const noRifle: GameState = {
      day: 100,
      date: { year: 1849, month: 7, day: 10 },
      location: { milesTraveled: BEHIND_MILES, terrain: 'prairie' },
      inventory: {
        gunpowder: 10,
        lead_balls: 10,
        percussion_caps: 10,
        flour: 120
        // no rifle
      },
      party: robustParty(),
      oxen: [{ id: 'ox-0', health: 100, fatigue: 0, shod: true }],
      resources: { water: 10, waterCap: 20 },
      morale: 60,
      flags: {}
    } as unknown as GameState;
    expect(chaosPersona.shouldHunt(noRifle, alwaysTrue)).toBe(false);
  });
});
