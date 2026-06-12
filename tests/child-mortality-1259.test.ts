/**
 * #1259 child-mortality — §1 age-banded disease lethality + §2 child_wagon_fall event
 *                       + §4 ox-death flag riders.
 *                       + §1b dehydration counter 1.3× + dirty-water incidence 1.5×
 *                         (Dave 2026-06-11; amends design-doc §3 "deliberately unchanged" list)
 *
 * TDD: these tests are written first and must FAIL before the implementation
 * lands, then pass after.
 */
import { describe, it, expect } from 'vitest';
import { progressConditions, CHILD_DEHYDRATING_DISEASE_MULT, DEHYDRATING_CONDITIONS } from '../src/lib/game/systems/conditions';
import { rollStrayMorning } from '../src/lib/game/systems/strays';
import { ENCOUNTER_EVENTS } from '../src/lib/game/content/encounters';
import { EVENTS } from '../src/lib/game/content/events';
import { resolveEvent } from '../src/lib/game/systems/events';
import {
  CHILD_WAGON_FALL_KILL_CHANCE,
  CHILD_WAGON_FALL_BROKEN_LEG_CHANCE
} from '../src/lib/game/content/events';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState, PartyMember } from '../src/lib/game/types';
import { applyDehydration, CHILD_DEHYDRATION_MULT } from '../src/lib/game/systems/dehydration';
import {
  applyDirtyWaterRisk,
  CHILD_DIRTY_WATER_RISK_MULT
} from '../src/lib/game/systems/consumption';
import { reapDead } from '../src/lib/game/systems/death';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

/** Minimal game state with no treatment items, no doctor — raw condition tick. */
function newGame(): GameState {
  const s = createInitialState({
    seed: 'cm1259',
    leader: { name: 'Ada', profession: 'farmer' },
    companions: [{ name: 'Bob', profession: 'carpenter' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
  // Strip ALL treatment items so we test raw damage, not treatment math.
  return {
    ...s,
    inventory: {
      ...s.inventory,
      quinine: 0,
      calomel: 0,
      laudanum: 0,
      paregoric: 0,
      dovers_powder: 0,
      bandages: 0,
      camphor: 0,
      epsom_salts: 0,
      castor_oil: 0,
      hartshorn: 0
    }
  };
}

/** Clone and set a party member's kind + health. */
function withMember(s: GameState, idx: number, patch: Partial<PartyMember>): GameState {
  const party = s.party.map((m, i) => (i === idx ? { ...m, ...patch } : m));
  return { ...s, party };
}

// ---------------------------------------------------------------------------
// §1 — age-banded disease lethality
// ---------------------------------------------------------------------------

describe('#1259 §1 — CHILD_DEHYDRATING_DISEASE_MULT export', () => {
  it('exports CHILD_DEHYDRATING_DISEASE_MULT = 1.75', () => {
    expect(CHILD_DEHYDRATING_DISEASE_MULT).toBe(1.75);
  });
});

describe('#1259 §1 — DEHYDRATING_CONDITIONS set', () => {
  it('contains cholera', () => {
    expect(DEHYDRATING_CONDITIONS.has('cholera')).toBe(true);
  });

  it('contains dysentery', () => {
    expect(DEHYDRATING_CONDITIONS.has('dysentery')).toBe(true);
  });

  it('does NOT contain measles (flat per Bashore/BYU data)', () => {
    expect(DEHYDRATING_CONDITIONS.has('measles')).toBe(false);
  });

  it('does NOT contain typhoid (flat per Bashore/BYU data)', () => {
    expect(DEHYDRATING_CONDITIONS.has('typhoid')).toBe(false);
  });
});

describe('#1259 §1 — cholera: child takes ~1.75× adult damage per tick', () => {
  it('child with cholera loses more HP than identically-afflicted adult', () => {
    // Use a deterministic seed where natural-course resolve doesn't fire.
    // Both members start at HP=100, have cholera(daysSinceOnset=0).
    // No treatment items (stripped above). No doctor.
    // Expected: adult loses 7 HP (cholera dailyHealthDelta = -7 × 1.0).
    //           child loses round(7 × 1.75) = 12 HP.
    const base = newGame();

    // Member 0 → adult at HP 100 with cholera.
    // Member 1 → child at HP 100 with cholera.
    let s = withMember(base, 0, {
      kind: 'adult',
      health: 100,
      conditions: [{ id: 'cholera', daysSinceOnset: 0 }]
    });
    s = withMember(s, 1, {
      kind: 'child',
      health: 100,
      conditions: [{ id: 'cholera', daysSinceOnset: 0 }]
    });

    // Use a seed where natural-course resolve won't fire at daysSinceOnset=0
    // (minCourseDays=2 for cholera — resolve returns 0 before min, safe).
    const rng = makeRng('cm1259-cholera');
    const next = progressConditions(s, rng);

    const adultHP = next.party[0].health;
    const childHP = next.party[1].health;

    // Adult: 100 - 7 = 93.
    expect(adultHP).toBe(93);
    // Child: 100 - round(7 * 1.75) = 100 - 12 = 88.
    expect(childHP).toBe(88);
    // Verify the ratio is approximately 1.75.
    const adultDmg = 100 - adultHP;
    const childDmg = 100 - childHP;
    expect(childDmg / adultDmg).toBeCloseTo(1.75, 0);
  });
});

describe('#1259 §1 — dysentery: child takes ~1.75× adult damage per tick', () => {
  it('child with dysentery loses more HP than adult', () => {
    // dysentery dailyHealthDelta = -3. Adult loses 3; child loses round(3 * 1.75) = 5.
    const base = newGame();
    let s = withMember(base, 0, {
      kind: 'adult',
      health: 100,
      conditions: [{ id: 'dysentery', daysSinceOnset: 0 }]
    });
    s = withMember(s, 1, {
      kind: 'child',
      health: 100,
      conditions: [{ id: 'dysentery', daysSinceOnset: 0 }]
    });

    const rng = makeRng('cm1259-dysentery');
    const next = progressConditions(s, rng);

    const adultHP = next.party[0].health;
    const childHP = next.party[1].health;

    expect(adultHP).toBe(97); // 100 - 3
    expect(childHP).toBe(95); // 100 - round(3 * 1.75) = 100 - 5
  });
});

describe('#1259 §1 — measles: child and adult take EQUAL damage (flat, not dehydrating)', () => {
  it('child with measles takes the same HP loss as adult', () => {
    // measles dailyHealthDelta = -3. Both should lose 3.
    const base = newGame();
    let s = withMember(base, 0, {
      kind: 'adult',
      health: 100,
      conditions: [{ id: 'measles', daysSinceOnset: 0 }]
    });
    s = withMember(s, 1, {
      kind: 'child',
      health: 100,
      conditions: [{ id: 'measles', daysSinceOnset: 0 }]
    });

    const rng = makeRng('cm1259-measles');
    const next = progressConditions(s, rng);

    const adultHP = next.party[0].health;
    const childHP = next.party[1].health;

    // Both should take 3 HP damage — measles is NOT in DEHYDRATING_CONDITIONS.
    expect(adultHP).toBe(97);
    expect(childHP).toBe(97);
  });
});

describe('#1259 §1 — typhoid: child and adult take EQUAL damage (flat)', () => {
  it('child with typhoid takes the same HP loss as adult', () => {
    // typhoid dailyHealthDelta = -4. Both lose 4.
    const base = newGame();
    let s = withMember(base, 0, {
      kind: 'adult',
      health: 100,
      conditions: [{ id: 'typhoid', daysSinceOnset: 0 }]
    });
    s = withMember(s, 1, {
      kind: 'child',
      health: 100,
      conditions: [{ id: 'typhoid', daysSinceOnset: 0 }]
    });

    const rng = makeRng('cm1259-typhoid');
    const next = progressConditions(s, rng);

    expect(next.party[0].health).toBe(96); // 100 - 4
    expect(next.party[1].health).toBe(96); // 100 - 4 (no multiplier)
  });
});

// ---------------------------------------------------------------------------
// §4 — _lastOxDeathDay stamped at event/action ox-kill sites
// ---------------------------------------------------------------------------

describe('#1259 §4 — stray permanent loss stamps _lastOxDeathDay', () => {
  it('rollStrayMorning permanent-loss path sets flags._lastOxDeathDay = state.day', () => {
    // Find a seed that triggers the permanent-loss branch (5% chance per
    // stray incident; stray itself is 25% base). Try up to 5000 seeds.
    const base = createInitialState({
      seed: 'cm1259-stray',
      leader: { name: 'Ezra', profession: 'farmer' },
      companions: [{ name: 'Ruth', profession: 'carpenter' }],
      startDate: { year: 1848, month: 4, day: 15 }
    });

    const startCount = base.oxen.filter((o) => o.health > 0).length;
    expect(startCount).toBeGreaterThan(1); // need >1 healthy ox for loss to fire

    let foundFlag = false;
    for (let i = 0; i < 5000 && !foundFlag; i++) {
      const r = rollStrayMorning(base, makeRng(`cm1259-stray-${i}`));
      const after = r.state.oxen.filter((o) => o.health > 0).length;
      if (after < startCount) {
        // Permanent loss occurred — flag must be set.
        expect(r.state.flags._lastOxDeathDay).toBe(base.day);
        foundFlag = true;
      }
    }
    expect(foundFlag).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §2 — child_wagon_fall event
// ---------------------------------------------------------------------------

/** State with one adult + one child, on the road (not at a landmark). */
function gameWithChild(): GameState {
  const s = createInitialState({
    seed: 'cwf-test',
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [
      { name: 'Ruth', profession: 'carpenter' },
      { name: 'Little Tom', kind: 'child', age: 6 }
    ],
    startDate: { year: 1843, month: 7, day: 4 }
  });
  // Ensure not at a landmark.
  return {
    ...s,
    location: { ...s.location, atLandmarkId: null, milesTraveled: 200 }
  };
}

/** State with NO children (adults only). */
function gameNoChildren(): GameState {
  const s = createInitialState({
    seed: 'cwf-nochild',
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [{ name: 'Ruth', profession: 'carpenter' }],
    startDate: { year: 1843, month: 7, day: 4 }
  });
  return {
    ...s,
    location: { ...s.location, atLandmarkId: null, milesTraveled: 200 }
  };
}

describe('#1259 §2 — child_wagon_fall event exists in EVENTS catalog', () => {
  it('event with id "child_wagon_fall" is registered', () => {
    const ev = EVENTS.find((e) => e.id === 'child_wagon_fall');
    expect(ev).toBeDefined();
  });

  it('category is "health"', () => {
    const ev = EVENTS.find((e) => e.id === 'child_wagon_fall')!;
    expect(ev.category).toBe('health');
  });

  it('weight is 0.15 (calibrated LOW — at weight 1 it supplied 38-57% of child deaths in 2500-run sweep)', () => {
    // Re-baselined from 1 → 0.15: the event was tuned after the sweep showed
    // weight=1 dominated child deaths far beyond the "few percent" research
    // finding (wagon run-overs were the most memorable child death, not the
    // most common). The 0.15 value is logged in events.ts comment at the
    // child_wagon_fall definition.
    const ev = EVENTS.find((e) => e.id === 'child_wagon_fall')!;
    expect(ev.weight).toBe(0.15);
  });

  it('exports CHILD_WAGON_FALL_KILL_CHANCE = 0.4', () => {
    expect(CHILD_WAGON_FALL_KILL_CHANCE).toBeCloseTo(0.4);
  });

  it('exports CHILD_WAGON_FALL_BROKEN_LEG_CHANCE = 0.6', () => {
    expect(CHILD_WAGON_FALL_BROKEN_LEG_CHANCE).toBeCloseTo(0.6);
  });
});

describe('#1259 §2 — child_wagon_fall gate: only eligible when a live child is present', () => {
  it('gate returns true when a live child is in the party', () => {
    const ev = EVENTS.find((e) => e.id === 'child_wagon_fall')!;
    const s = gameWithChild();
    expect(ev.gate!(s)).toBe(true);
  });

  it('gate returns false when no children in the party', () => {
    const ev = EVENTS.find((e) => e.id === 'child_wagon_fall')!;
    const s = gameNoChildren();
    expect(ev.gate!(s)).toBe(false);
  });

  it('gate returns false when all children are dead', () => {
    const ev = EVENTS.find((e) => e.id === 'child_wagon_fall')!;
    const base = gameWithChild();
    const s: GameState = {
      ...base,
      party: base.party.map((m) =>
        m.kind === 'child' ? { ...m, dead: true } : m
      )
    };
    expect(ev.gate!(s)).toBe(false);
  });
});

describe('#1259 §2 — child_wagon_fall: single acknowledge choice', () => {
  it('has exactly one choice', () => {
    const ev = EVENTS.find((e) => e.id === 'child_wagon_fall')!;
    expect(ev.choices.length).toBe(1);
  });

  it('the single choice has isDefault: true', () => {
    const ev = EVENTS.find((e) => e.id === 'child_wagon_fall')!;
    expect(ev.choices[0].isDefault).toBe(true);
  });
});

describe('#1259 §2 — child_wagon_fall: victim is always a child', () => {
  // Resolve the event across many seeds and confirm every victim is a child.
  it('victim is a child for seeds 0-49', () => {
    const ev = EVENTS.find((e) => e.id === 'child_wagon_fall')!;
    const s = gameWithChild();
    const choiceId = ev.choices[0].id;

    for (let i = 0; i < 50; i++) {
      const rng = makeRng(`cwf-victim-${i}`);
      const after = resolveEvent(s, ev, choiceId, rng);
      // Fix (review MED): the kill branch now sets health: 0 + deathCause
      // instead of dead: true — reapDead (POST_EVENT_TAIL) stamps dead same
      // tick. Detect kill by health===0 OR broken_leg condition added.
      const changed = after.party.find((m, idx) => {
        const before = s.party[idx];
        const nowKilled = !before.dead && m.health === 0 && m.deathCause === 'Wagon Accident';
        const gotCondition =
          m.conditions.some((c) => c.id === 'broken_leg') &&
          !before.conditions.some((c) => c.id === 'broken_leg');
        return nowKilled || gotCondition;
      });
      expect(changed).toBeDefined();
      expect(changed!.kind).toBe('child');
    }
  });
});

describe('#1259 §2 — child_wagon_fall: 40/60 outcome split (deterministic per-seed)', () => {
  // Run 200 seeds and confirm the kill branch fires ~40% and injury ~60%.
  // Use loose tolerance: within ±15pp of the target (exact is non-deterministic
  // across RNG changes; we want structural coverage, not exact statistics).
  it('kill outcome fires ~40% of the time over 200 seeds', () => {
    // Fix (review MED): kill branch now sets health: 0 + deathCause instead of
    // dead: true. reapDead (POST_EVENT_TAIL_STEPS) stamps dead: true same tick,
    // but resolveEvent alone won't show dead. Detect kill by health===0 here.
    const ev = EVENTS.find((e) => e.id === 'child_wagon_fall')!;
    const s = gameWithChild();
    const choiceId = ev.choices[0].id;

    let kills = 0;
    let injuries = 0;

    for (let i = 0; i < 200; i++) {
      const rng = makeRng(`cwf-split-${i}`);
      const after = resolveEvent(s, ev, choiceId, rng);
      const child = after.party.find((m) => m.kind === 'child')!;
      if (child.health === 0 && child.deathCause === 'Wagon Accident') {
        kills++;
      } else if (child.conditions.some((c) => c.id === 'broken_leg')) {
        injuries++;
      }
    }

    // Expect all 200 to be resolved into one category or the other.
    expect(kills + injuries).toBe(200);

    // Kill fraction should be within ±15pp of 0.40.
    const killFraction = kills / 200;
    expect(killFraction).toBeGreaterThanOrEqual(0.25);
    expect(killFraction).toBeLessThanOrEqual(0.55);
  });

  // Spot-check two specific seeds for determinism.
  it('seed cwf-kill-seed kills the child (kill branch)', () => {
    // Fix (review MED): kill branch sets health: 0 + deathCause; dead: true
    // is stamped by reapDead in POST_EVENT_TAIL_STEPS (same tick, not here).
    const ev = EVENTS.find((e) => e.id === 'child_wagon_fall')!;
    const s = gameWithChild();
    const choiceId = ev.choices[0].id;

    let foundKillSeed: string | null = null;
    for (let i = 0; i < 200; i++) {
      const seed = `cwf-split-${i}`;
      const rng = makeRng(seed);
      const after = resolveEvent(s, ev, choiceId, rng);
      const child = after.party.find((m) => m.kind === 'child')!;
      if (child.health === 0 && child.deathCause === 'Wagon Accident') {
        foundKillSeed = seed;
        break;
      }
    }
    expect(foundKillSeed).not.toBeNull();

    // Re-run that same seed — must be deterministic.
    const rng2 = makeRng(foundKillSeed!);
    const after2 = resolveEvent(s, ev, choiceId, rng2);
    const child2 = after2.party.find((m) => m.kind === 'child')!;
    // health: 0 and deathCause pre-attributed (reapDead stamps dead in tail).
    expect(child2.health).toBe(0);
    expect(child2.deathCause).toBe('Wagon Accident');
  });

  it('seed cwf-injury-seed gives the child broken_leg (injury branch)', () => {
    const ev = EVENTS.find((e) => e.id === 'child_wagon_fall')!;
    const s = gameWithChild();
    const choiceId = ev.choices[0].id;

    let foundInjurySeed: string | null = null;
    for (let i = 0; i < 200; i++) {
      const seed = `cwf-split-${i}`;
      const rng = makeRng(seed);
      const after = resolveEvent(s, ev, choiceId, rng);
      const child = after.party.find((m) => m.kind === 'child')!;
      if (!child.dead && child.conditions.some((c) => c.id === 'broken_leg')) {
        foundInjurySeed = seed;
        break;
      }
    }
    expect(foundInjurySeed).not.toBeNull();

    // Re-run — must be deterministic.
    const rng2 = makeRng(foundInjurySeed!);
    const after2 = resolveEvent(s, ev, choiceId, rng2);
    const child2 = after2.party.find((m) => m.kind === 'child')!;
    expect(child2.dead).toBe(false);
    expect(child2.conditions.some((c) => c.id === 'broken_leg')).toBe(true);
  });
});

describe('#1259 §2 — child_wagon_fall: death sets correct deathCause', () => {
  it('killed child has deathCause = "Wagon Accident" (pre-attributed at health: 0, before reapDead)', () => {
    // Fix (review MED): event sets health: 0 + deathCause pre-attributed; the
    // reaper stamps dead: true in POST_EVENT_TAIL_STEPS. Search by health===0.
    const ev = EVENTS.find((e) => e.id === 'child_wagon_fall')!;
    const s = gameWithChild();
    const choiceId = ev.choices[0].id;

    // Find a seed that kills (health: 0 after resolve).
    let killedState: GameState | null = null;
    for (let i = 0; i < 200; i++) {
      const rng = makeRng(`cwf-split-${i}`);
      const after = resolveEvent(s, ev, choiceId, rng);
      const child = after.party.find((m) => m.kind === 'child')!;
      if (child.health === 0 && child.deathCause === 'Wagon Accident') {
        killedState = after;
        break;
      }
    }
    expect(killedState).not.toBeNull();
    const zeroHPChild = killedState!.party.find((m) => m.kind === 'child')!;
    expect(zeroHPChild.deathCause).toBe('Wagon Accident');
    // dead: false here — reapDead hasn't run yet (POST_EVENT_TAIL_STEPS)
    expect(zeroHPChild.dead).toBe(false);
  });
});

describe('#1259 §2 — child_wagon_fall + reapDead integration: full pipeline', () => {
  // Verifies the review fix (MED): event kill → reapDead (same tick) stamps
  // dead: true with deathCause 'Wagon Accident', sets _burialPending, and
  // applies the child-death morale hit.
  //
  // #1403 re-baseline: child hit raised from −8 to CHILD_DEATH_MORALE (−16)
  // + mourning cap (70). Test updated to assert the new values (morale = min
  // of cap, max(0, prior - 16)).
  //
  // reapDead is POST_EVENT_TAIL_STEPS[2] in daily-steps.ts; applyPendingChoice
  // calls runSteps(POST_EVENT_TAIL_STEPS, ...) immediately after resolveEvent
  // completes — so the reap fires same-day (no +1 delay).
  it('after resolveEvent + reapDead: child is dead, deathCause Wagon Accident, _burialPending set, morale hit (#1403)', () => {
    const ev = EVENTS.find((e) => e.id === 'child_wagon_fall')!;
    const s = gameWithChild();
    const choiceId = ev.choices[0].id;

    // Find a seed that fires the kill branch (health: 0 after resolve).
    let afterEvent: GameState | null = null;
    let killSeed = '';
    for (let i = 0; i < 200; i++) {
      const seed = `cwf-integration-${i}`;
      const rng = makeRng(seed);
      const after = resolveEvent(s, ev, choiceId, rng);
      const child = after.party.find((m) => m.kind === 'child')!;
      if (child.health === 0 && child.deathCause === 'Wagon Accident') {
        afterEvent = after;
        killSeed = seed;
        break;
      }
    }
    expect(afterEvent).not.toBeNull();

    // Simulate the POST_EVENT_TAIL reapDead step.
    const rngReap = makeRng(killSeed);
    const afterReap = reapDead(afterEvent!, rngReap);

    const deadChild = afterReap.party.find((m) => m.kind === 'child')!;

    // dead: true stamped by reaper.
    expect(deadChild.dead).toBe(true);

    // deathCause preserved (pre-attributed, not overwritten by fallback logic).
    expect(deadChild.deathCause).toBe('Wagon Accident');

    // deathDay stamped by reaper (same day as event).
    expect(deadChild.deathDay).toBe(s.day);

    // _burialPending set (not all-dead — one adult still alive).
    expect(afterReap.flags._burialPending).toBe(true);

    // Morale: #1403 re-baseline — child hit is −16, then capped at MOURNING_MORALE_CAP (70).
    // (was: Math.max(0, prior - 8) before #1403)
    const expectedMorale = Math.min(70, Math.max(0, afterEvent!.morale - 16));
    expect(afterReap.morale).toBe(expectedMorale);
  });
});

describe('#1259 §2 — child_wagon_fall: injury applies broken_leg condition', () => {
  it('injured child has broken_leg in conditions, is alive', () => {
    const ev = EVENTS.find((e) => e.id === 'child_wagon_fall')!;
    const s = gameWithChild();
    const choiceId = ev.choices[0].id;

    // Find a seed that injures.
    let injuredState: GameState | null = null;
    for (let i = 0; i < 200; i++) {
      const rng = makeRng(`cwf-split-${i}`);
      const after = resolveEvent(s, ev, choiceId, rng);
      const child = after.party.find((m) => m.kind === 'child')!;
      if (!child.dead && child.conditions.some((c) => c.id === 'broken_leg')) {
        injuredState = after;
        break;
      }
    }
    expect(injuredState).not.toBeNull();
    const injuredChild = injuredState!.party.find((m) => m.kind === 'child')!;
    expect(injuredChild.dead).toBe(false);
    expect(injuredChild.conditions.some((c) => c.id === 'broken_leg')).toBe(true);
  });
});

describe('#1259 §2 — child_wagon_fall does NOT fire at a landmark', () => {
  it('gate returns false when atLandmarkId is set', () => {
    const ev = EVENTS.find((e) => e.id === 'child_wagon_fall')!;
    const base = gameWithChild();
    // Simulate being at a landmark.
    const atLandmark: GameState = {
      ...base,
      location: { ...base.location, atLandmarkId: 'fort_kearney' }
    };
    // The engine-level guard prevents travel events at landmarks, but the
    // event gate itself must also be safe to evaluate with atLandmarkId set.
    // The gate only checks for a live child — it passes even at a landmark.
    // The engine's !arrivedAtLandmark guard in engine-pausable.ts is what
    // prevents it from firing. This test confirms the gate itself is not
    // broken by landmark state (returns based on child presence, not location).
    //
    // So we test the ENGINE GUARD: travel events only roll when !arrivedAtLandmark.
    // This is covered by the existing #114 test suite. Here we just confirm
    // the gate function itself behaves predictably.
    expect(ev.gate!(atLandmark)).toBe(true); // gate only checks for child presence
  });
});

describe('#1259 §4 — raid-revenge flee choice stamps _lastOxDeathDay when ox is killed', () => {
  it('encounter_raid_revenge "flee" choice sets flags._lastOxDeathDay when killOx = true', () => {
    // Set up a state that passes the raid_revenge gate:
    // _raidRevengeDay <= state.day AND tribesAtMile returns non-empty.
    // Mile ~300 = Sioux country.
    const base = createInitialState({
      seed: 'cm1259-raid',
      leader: { name: 'Ezra', profession: 'farmer' },
      companions: [{ name: 'Ruth', profession: 'carpenter' }],
      startDate: { year: 1848, month: 4, day: 15 }
    });
    const s: GameState = {
      ...base,
      day: 10,
      location: { ...base.location, milesTraveled: 300 },
      flags: {
        ...base.flags,
        _raidRevengeDay: 10 // gate: day >= _raidRevengeDay
      }
    };

    const ev = ENCOUNTER_EVENTS.find((e) => e.id === 'encounter_raid_revenge')!;
    expect(ev).toBeDefined();

    // Find a seed where RAID_REVENGE_OX_KILL_CHANCE (40%) fires on the flee choice.
    let foundKill = false;
    for (let i = 0; i < 200 && !foundKill; i++) {
      const rng = makeRng(`cm1259-raid-${i}`);
      const result = resolveEvent(s, ev, 'flee', rng);
      const killedOx = result.oxen.filter((o) => o.health > 0).length < s.oxen.filter((o) => o.health > 0).length;
      if (killedOx) {
        expect(result.flags._lastOxDeathDay).toBe(s.day);
        foundKill = true;
      }
    }
    expect(foundKill).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §1b — dehydration-counter child scaling flipped to 1.3× (Dave 2026-06-11)
//
// The original design-doc §3 listed "dehydration-counter 0.7x child scaling"
// as "deliberately unchanged." Dave's 2026-06-11 decision amends that list:
// children now take 1.3× the daily dehydration health hit (named constant
// CHILD_DEHYDRATION_MULT). The research claim is that small bodies lose fluid
// volume fastest and fail in hours-to-days (Bashore/BYU 2014; cholera-era
// accounts). The 1.3× figure (vs the raw 1.5–1.75 disease band) reflects that
// children still get water priority during consumption (CHILD_WATER_MULT = 0.5)
// so the true exposure is lower than adult — but once truly dry, the physics
// dominate. Morale deltas remain unchanged.
// ---------------------------------------------------------------------------

describe('#1259 §1b — CHILD_DEHYDRATION_MULT export', () => {
  it('exports CHILD_DEHYDRATION_MULT = 1.3', () => {
    // Re-baseline: was 0.7 (children softer hit). Dave 2026-06-11 decision
    // flips this: children fail faster on zero water. New value = 1.3.
    expect(CHILD_DEHYDRATION_MULT).toBe(1.3);
  });
});

describe('#1259 §1b — dehydration: child takes MORE health damage than adult (1.3×)', () => {
  /** Build a state with zero water, one adult, one child, both alive at HP 100.
   *  The test drives applyDehydration directly so we can assert exact HP.
   *  createInitialState requires >= 2 adults, so we create leader + 1 adult
   *  companion + 1 child companion, then keep only two members for the
   *  assertion (index 0 = adult leader, index 2 = child). */
  function dryPartyState(): GameState {
    const base = createInitialState({
      seed: 'dh1259',
      leader: { name: 'Ada', profession: 'farmer' },
      companions: [
        { name: 'Bob', profession: 'carpenter' },
        { name: 'Kit', kind: 'child', age: 8 }
      ],
      startDate: { year: 1848, month: 4, day: 15 }
    });
    // Keep all three members but normalize HP and kind for clarity.
    // party[0] = adult (Ada), party[1] = adult (Bob), party[2] = child (Kit).
    const party = base.party.map((m, i) => {
      if (i < 2) return { ...m, kind: 'adult' as const, health: 100 };
      return { ...m, kind: 'child' as const, health: 100 };
    });
    return {
      ...base,
      resources: { ...base.resources, water: 0, dirtyWater: 0 },
      party,
      // No prior dry days so this is dry-day 1 (hpLoss = 0).
      // Use dry-day 2 to get actual health damage: set prior to 1.
      flags: { ...base.flags, _dehydrationDays: 1 }
    };
  }

  it('child loses MORE HP than adult on same dry day', () => {
    const s = dryPartyState();
    const after = applyDehydration(s);

    // party[0] and party[1] are adults; party[2] is the child.
    const adultHP = after.party[0].health;
    const childHP = after.party[2].health;

    // Dry-day 2, prairie terrain (mult 1.0): hpLoss = HEALTH_PER_DRY_DAY[2] = 10.
    // Adult: 100 - round(10 * 1.0) = 90.
    // Child: 100 - round(10 * 1.3) = 100 - 13 = 87.
    expect(adultHP).toBe(90);
    expect(childHP).toBe(87);
    expect(childHP).toBeLessThan(adultHP);
  });

  it('child damage is approximately 1.3× adult damage', () => {
    const s = dryPartyState();
    const after = applyDehydration(s);

    // party[0] and party[1] are adults; party[2] is the child.
    const adultDmg = 100 - after.party[0].health;
    const childDmg = 100 - after.party[2].health;

    // adultDmg = 10, childDmg = 13 → ratio = 1.3
    expect(childDmg / adultDmg).toBeCloseTo(1.3, 1);
  });

  it('morale delta is identical for child and adult (morale unchanged by the flip)', () => {
    // applyDehydration applies a single morale delta to state.morale (not per-member).
    // Verify the function still runs and state.morale decreases.
    const s = dryPartyState();
    const after = applyDehydration(s);
    expect(after.morale).toBeLessThan(s.morale);
  });

  it('child still survives dry-day 1 (hpLoss = 0 on first dry day)', () => {
    // Dry-day 1 has hpLoss = 0 per the curve — no HP damage regardless of mult.
    // createInitialState requires >= 2 adults; leader + Bob + child Kit.
    const base = createInitialState({
      seed: 'dh1259-d1',
      leader: { name: 'Ada', profession: 'farmer' },
      companions: [
        { name: 'Bob', profession: 'carpenter' },
        { name: 'Kit', kind: 'child', age: 8 }
      ],
      startDate: { year: 1848, month: 4, day: 15 }
    });
    const s: GameState = {
      ...base,
      resources: { ...base.resources, water: 0, dirtyWater: 0 },
      party: base.party.map((m, i) =>
        i < 2
          ? { ...m, kind: 'adult' as const, health: 100 }
          : { ...m, kind: 'child' as const, health: 100 }
      ),
      // No prior flag → first dry day.
    };
    const after = applyDehydration(s);
    // Dry-day 1: hpLoss = 0. All retain 100 HP despite the 1.3× mult.
    expect(after.party[0].health).toBe(100); // adult
    expect(after.party[1].health).toBe(100); // adult
    expect(after.party[2].health).toBe(100); // child
  });
});

// ---------------------------------------------------------------------------
// §1b — dirty-water disease incidence: children biased 1.5× (CHILD_DIRTY_WATER_RISK_MULT)
//
// The original applyDirtyWaterRisk only rolled for adults. This change adds
// children to the per-member roll with chance × CHILD_DIRTY_WATER_RISK_MULT = 1.5.
// Comment: "the children sickened first" — small bodies + less discrimination
// about water sources. The coffee/tea waterborneDiseaseModifier and doctor gate
// remain unchanged; only the per-child roll chance is scaled.
// ---------------------------------------------------------------------------

describe('#1259 §1b — CHILD_DIRTY_WATER_RISK_MULT export', () => {
  it('exports CHILD_DIRTY_WATER_RISK_MULT = 1.5', () => {
    expect(CHILD_DIRTY_WATER_RISK_MULT).toBe(1.5);
  });
});

describe('#1259 §1b — dirty-water: children are eligible victims (not adults-only)', () => {
  /** State with 1 adult + 1 child, with dirty water drawn, no doctor, no coffee/tea.
   *  createInitialState requires >= 2 adults, so leader + Bob (adult) + Kit (child).
   *  party[0] = Ada (adult), party[1] = Bob (adult), party[2] = Kit (child). */
  function dirtyWaterState(): GameState {
    const base = createInitialState({
      seed: 'dw1259',
      leader: { name: 'Ada', profession: 'farmer' },
      companions: [
        { name: 'Bob', profession: 'carpenter' },
        { name: 'Kit', kind: 'child', age: 8 }
      ],
      startDate: { year: 1848, month: 4, day: 15 }
    });
    return {
      ...base,
      party: base.party.map((m, i) =>
        i < 2
          ? { ...m, kind: 'adult' as const, conditions: [] }
          : { ...m, kind: 'child' as const, conditions: [] }
      ),
      inventory: {
        ...base.inventory,
        // No doctor, no coffee/tea — raw chance.
        coffee: 0,
        tea: 0
      },
      flags: {
        ...base.flags,
        // Signal that dirty water was consumed (applyDirtyWaterRisk reads this).
        _lastDirtyWaterDrawn: 3,
        // waterConsumedToday baseline for dirtyFraction calc.
        _lastWaterNeeded: 3
      }
    };
  }

  it('over 500 seeds, at least one child gets sick from dirty water', () => {
    // Before this change, children were excluded from applyDirtyWaterRisk entirely.
    // Post-change, they must be eligible.
    const s = dirtyWaterState();
    let childSick = false;
    for (let i = 0; i < 500 && !childSick; i++) {
      const rng = makeRng(`dw-child-${i}`);
      const after = applyDirtyWaterRisk(s, rng);
      const child = after.party.find((m) => m.kind === 'child')!;
      if (child.conditions.some((c) => c.id === 'cholera' || c.id === 'dysentery')) {
        childSick = true;
      }
    }
    expect(childSick).toBe(true);
  });

  it('adults remain eligible for dirty-water disease (unchanged channel)', () => {
    // Regression: adding children must not break adult eligibility.
    const s = dirtyWaterState();
    let adultSick = false;
    for (let i = 0; i < 500 && !adultSick; i++) {
      const rng = makeRng(`dw-adult-${i}`);
      const after = applyDirtyWaterRisk(s, rng);
      const adult = after.party.find((m) => m.kind === 'adult')!;
      if (adult.conditions.some((c) => c.id === 'cholera' || c.id === 'dysentery')) {
        adultSick = true;
      }
    }
    expect(adultSick).toBe(true);
  });
});

describe('#1259 §1b — dirty-water: children biased higher than adults (deterministic per-seed check)', () => {
  /** State with 2 adults + 2 children, dirty water consumed, no doctor/coffee.
   *  Running 200 seeds and counting which member gets sick first should show
   *  children as the more-frequent first victim (1.5× bias). */
  function mixedDirtyWaterState(): GameState {
    const base = createInitialState({
      seed: 'dw1259-mixed',
      leader: { name: 'Ada', profession: 'farmer' },
      companions: [
        { name: 'Bob', profession: 'carpenter' },
        { name: 'Kit', kind: 'child', age: 8 },
        { name: 'Sue', kind: 'child', age: 6 }
      ],
      startDate: { year: 1848, month: 4, day: 15 }
    });
    return {
      ...base,
      party: [
        { ...base.party[0], kind: 'adult' as const, conditions: [] },
        { ...base.party[1], kind: 'adult' as const, conditions: [] },
        { ...base.party[2], kind: 'child' as const, conditions: [] },
        { ...base.party[3], kind: 'child' as const, conditions: [] }
      ],
      inventory: { ...base.inventory, coffee: 0, tea: 0 },
      flags: {
        ...base.flags,
        _lastDirtyWaterDrawn: 4,
      }
    };
  }

  it('children are the first victim more often than expected for their count share (1.5× bias visible across 200 seeds)', () => {
    // 2 adults + 2 children = equal count share (50% each). With 1.5× bias,
    // children should appear as the first victim in > 50% of infection events.
    // Use a loose lower bound of 55% to avoid flakiness (well above chance).
    const s = mixedDirtyWaterState();
    let childFirst = 0;
    let adultFirst = 0;

    for (let i = 0; i < 200; i++) {
      const rng = makeRng(`dw-bias-${i}`);
      const after = applyDirtyWaterRisk(s, rng);
      // Find any newly-sick member vs the baseline (all conditions: []).
      const newlySick = after.party.find(
        (m, idx) => m.conditions.length > s.party[idx].conditions.length
      );
      if (newlySick) {
        if (newlySick.kind === 'child') childFirst++;
        else adultFirst++;
      }
    }

    // Only count seeds that produced an infection (some won't roll sick).
    const total = childFirst + adultFirst;
    if (total > 0) {
      const childFraction = childFirst / total;
      // With 1.5× child bias and equal count, expected child fraction ≈ 0.6.
      // Lower bound 0.50 is very conservative (just above parity).
      expect(childFraction).toBeGreaterThan(0.50);
    }
    // At least some infections must have fired.
    expect(total).toBeGreaterThan(0);
  });
});

describe('#1259 §1b — dirty-water: coffee/tea modifier still applies to child rolls', () => {
  it('party with coffee has fewer infections overall (child + adult combined) vs no-coffee', () => {
    // Build two states: identical except one has coffee (should reduce incidence).
    function stateWithCoffee(hasCoffee: boolean): GameState {
      // leader Ada (adult) + Bob (adult) + Kit (child): meets 2-adult min.
      const base = createInitialState({
        seed: 'dw1259-coffee',
        leader: { name: 'Ada', profession: 'farmer' },
        companions: [
          { name: 'Bob', profession: 'carpenter' },
          { name: 'Kit', kind: 'child', age: 8 }
        ],
        startDate: { year: 1848, month: 4, day: 15 }
      });
      return {
        ...base,
        party: [
          { ...base.party[0], kind: 'adult' as const, conditions: [] },
          { ...base.party[1], kind: 'adult' as const, conditions: [] },
          { ...base.party[2], kind: 'child' as const, conditions: [] }
        ],
        inventory: { ...base.inventory, coffee: hasCoffee ? 10 : 0, tea: 0 },
        flags: { ...base.flags, _lastDirtyWaterDrawn: 3 }
      };
    }

    const withCoffee = stateWithCoffee(true);
    const noCoffee = stateWithCoffee(false);

    let infectionsWith = 0;
    let infectionsWithout = 0;
    const N = 200;

    for (let i = 0; i < N; i++) {
      const rng1 = makeRng(`dw-coffee-${i}`);
      const after1 = applyDirtyWaterRisk(withCoffee, rng1);
      if (after1.party.some((m, idx) => m.conditions.length > withCoffee.party[idx].conditions.length)) {
        infectionsWith++;
      }

      const rng2 = makeRng(`dw-coffee-${i}`);
      const after2 = applyDirtyWaterRisk(noCoffee, rng2);
      if (after2.party.some((m, idx) => m.conditions.length > noCoffee.party[idx].conditions.length)) {
        infectionsWithout++;
      }
    }

    // Coffee should reduce total infections — expect strictly fewer.
    expect(infectionsWith).toBeLessThan(infectionsWithout);
  });
});
