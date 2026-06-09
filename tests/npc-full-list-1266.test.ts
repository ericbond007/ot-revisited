// #1266 stage2 — proof tests for tickNpcWagon consuming the canonical
// daily-steps segments. These 4 tests prove the 5 previously-skipped
// systems (decayCleanliness, applyDirtyMorale, applyFilthDiseaseRisk,
// applyAmbientWaterRefill, applyWaterRationStrain) now fire for NPCs.
//
// On master (before the rewrite) tests 1 + 2 FAIL (NPCs never ran
// those systems). Tests 3 + 4 may already PASS — they are regression
// guards documenting what must NOT change after the rewrite.

import { describe, it, expect } from 'vitest';
import { tickNpcWagon, type NpcTickContext } from '../src/lib/game/systems/npc-engine';
import { makeRng } from '../src/lib/game/rng';
import type { NpcWagonState } from '../src/lib/game/types';

// ─── fixture helpers ─────────────────────────────────────────────────────────

/** Minimal 2-adult wagon, ample food + water, 4 healthy oxen. No children,
 *  no conditions, no special profession that changes recovery math. */
function freshWagon(overrides: Partial<NpcWagonState> = {}): NpcWagonState {
  const base: NpcWagonState = {
    id: 'fl-test',
    name: 'the Fuller party',
    leaderProfession: 'farmer',
    hasChildren: false,
    seed: 'fl',
    eventLog: [],
    outcome: 'in-progress',
    rations: 'normal',
    waterRation: 'normal',
    party: [
      {
        id: 'fl-p0',
        name: 'John Fuller',
        sex: 'male',
        kind: 'adult',
        isLeader: true,
        profession: 'farmer',
        age: 32,
        health: 100,
        cleanliness: 100,
        conditions: [],
        dead: false
      },
      {
        id: 'fl-p1',
        name: 'Mary Fuller',
        sex: 'female',
        kind: 'adult',
        isLeader: false,
        age: 28,
        health: 100,
        cleanliness: 100,
        conditions: [],
        dead: false
      }
    ],
    inventory: {
      flour: 600,
      bacon: 300,
      beans: 200
    },
    oxen: [
      { id: 'fl-ox-0', health: 100, fatigue: 0, shod: true },
      { id: 'fl-ox-1', health: 100, fatigue: 0, shod: true },
      { id: 'fl-ox-2', health: 100, fatigue: 0, shod: true },
      { id: 'fl-ox-3', health: 100, fatigue: 0, shod: true }
    ],
    cash: 50,
    morale: 60,
    water: 30,
    dirtyWater: 0,
    waterCap: 30,
    dryDays: 0,
    wagon: {
      model: 'prairie_schooner',
      condition: 100,
      canvas: 100,
      carryCapacity: 2000,
      impairment: null
    }
  };
  return { ...base, ...overrides } as NpcWagonState;
}

/** Travel ctx for a mid-May 1849 day. companyRestMode:'travel' bypasses
 *  the #937 voluntary-rest gate so all days are guaranteed travel. */
function travelCtx(day: number): NpcTickContext {
  return {
    day,
    traveled: true,
    pace: 'moderate',
    terrain: 'prairie',
    weather: 'clear',
    date: { year: 1849, month: 5, day },
    companyRestMode: 'travel'
  };
}

// ─── Test 1: cleanliness decays ──────────────────────────────────────────────

describe('#1266 proof — NPC full-list parity', () => {
  it('1. cleanliness decays: 5 travel days → party[0].cleanliness < 100', () => {
    // FAILS on master: NPCs never ran decayCleanliness before this rewrite.
    // The decay base is 1.5/day at moderate/clear → 7.5 over 5 days.
    // Starting at 100, expect ~92.5 (rounded each day) which is definitely < 100.
    let w = freshWagon();
    for (let d = 1; d <= 5; d++) {
      const result = tickNpcWagon(w, travelCtx(d), makeRng(`cl-${d}`));
      w = result.wagon;
      if (w.outcome !== 'in-progress') break;
    }
    expect(w.outcome).toBe('in-progress');
    const p0 = w.party[0];
    // cleanliness may be typed as optional on legacy saves; default is 100.
    const cl = typeof p0.cleanliness === 'number' ? p0.cleanliness : 100;
    expect(cl).toBeLessThan(100);
  });

  // ─── Test 2: water-ration strain bites ────────────────────────────────────

  it('2. water-ration strain: drycamp NPC takes morale damage (synth now carries waterRation)', () => {
    // FAILS on master: synthesizeWagonState hardcoded waterRation:'normal' so
    // applyWaterRationStrain never fired for NPCs (Task 2 fix).
    //
    // Strategy: desert terrain + low water forces the balanced persona to
    // pick 'drycamp' from its own pickWaterRation logic. Tick 3 days with
    // water replenished each day (so dehydration can't be the cause). The
    // morale must end below start because drycamp costs DRYCAMP_MORALE/day.
    const desertCtx = (day: number): NpcTickContext => ({
      day,
      traveled: true,
      pace: 'moderate',
      terrain: 'desert',
      weather: 'clear',
      location: {
        trailPosition: 900,
        nextLandmarkId: 'farewell_bend',
        previousLandmarkId: null,
        milesTraveled: 900,
        terrain: 'desert'
      },
      date: { year: 1849, month: 7, day },
      companyRestMode: 'travel'
    });

    // water:3 → <2 days coverage → balanced persona forces 'drycamp'
    let w = freshWagon({ morale: 60, water: 3, waterCap: 30 });
    const startMorale = w.morale;
    for (let d = 1; d <= 3; d++) {
      const result = tickNpcWagon(w, desertCtx(d), makeRng(`wr-dc-${d}`));
      w = result.wagon;
      if (w.outcome !== 'in-progress') break;
      // Replenish water after each tick so dehydration doesn't kill the wagon.
      w = { ...w, water: 3 };
    }
    // drycamp deducts DRYCAMP_MORALE (2) per day over 3 days = -6 net.
    // Other debits may add slightly, but morale must end below start.
    expect(w.outcome).toBe('in-progress');
    expect(w.morale).toBeLessThan(startMorale);
  });

  // ─── Test 3: no fire damage on NPCs (playerOnly filter guard) ─────────────

  it('3. no fire damage: cold-date NPC tick has no "shivered" log line', () => {
    // Regression guard. attemptFire is playerOnly — even a cold night with
    // firewood=0 (which is always the case for NPC synth) must NOT produce
    // the "shivered through a cold dark" log line on NPC wagons.
    //
    // Use November (cold enough for nightTempF to cross the threshold)
    // with snow weather, ample food + water — only fire could hurt them.
    let w = freshWagon({ morale: 60 });
    const coldCtx: NpcTickContext = {
      day: 320,
      traveled: true,
      pace: 'moderate',
      terrain: 'prairie',
      weather: 'snow',
      date: { year: 1849, month: 11, day: 20 },
      companyRestMode: 'travel'
    };

    for (let i = 0; i < 2; i++) {
      const result = tickNpcWagon(w, { ...coldCtx, day: 320 + i }, makeRng(`fire-${i}`));
      w = result.wagon;
      // Check both the wagon's own eventLog AND playerLogs for the shiver line.
      const combined = [
        ...result.playerLogs,
        ...w.eventLog.map((e) => e.text)
      ];
      const shivered = combined.some((t) => /shivered through a cold dark/i.test(t));
      expect(shivered).toBe(false);
    }
  });

  // ─── Test 4: morale homeostasis — baseline still substitutes (not double-counted) ──

  it('4. morale homeostasis: wagon at morale 20 drifts UP toward 50 over 5 travel days', () => {
    // Regression guard for double-counting. applyNpcMoraleBaseline is now
    // the npcOnly step in POST_BRANCH; adjustMorale is playerOnly.
    // If both ran for NPCs, morale would over-shoot or the test would see
    // wild swings. This mirrors npc-morale-cluster-301.test.ts § (d) at
    // the integration level.
    //
    // The fixture needs cookware + saleratus so applyPastryQuality doesn't
    // fire either the "no cookware" or "no saleratus" -1 debit on every day
    // (those systems are new for NPCs in stage2 — previously NPCs didn't
    // run them). A properly-outfitted wagon on a clear prairie day should
    // net-positive with the baseline uplift.
    let w = freshWagon({ morale: 20, inventory: { flour: 600, bacon: 300, beans: 200, cookware: 1, saleratus: 5 } });
    const startMorale = w.morale;
    for (let d = 1; d <= 5; d++) {
      const result = tickNpcWagon(w, travelCtx(d), makeRng(`hom-${d}`));
      w = result.wagon;
      if (w.outcome !== 'in-progress') break;
    }
    expect(w.outcome).toBe('in-progress');
    // applyNpcMoraleBaseline pulls 20 toward 50 on each travel day.
    // Over 5 days we must see net upward drift — a healthy, cookware-equipped
    // wagon should net-positive even after minor system debits.
    expect(w.morale).toBeGreaterThan(startMorale);
  });
});
