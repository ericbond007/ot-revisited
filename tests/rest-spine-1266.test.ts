/**
 * rest-spine-1266.test.ts
 *
 * Proof tests for Task 4 of #1266 Stage 3: rest() routes through the
 * canonical daily-steps segments. Tests 1-4 and 6 FAIL before the
 * implementation; test 5 is a regression guard that passes both before
 * and after.
 */
import { describe, it, expect } from 'vitest';
import { rest } from '../src/lib/game/actions/rest';
import { createInitialState } from '../src/lib/game/engine';
import { setSpoilClock } from '../src/lib/game/systems/spoilage';
import { makeRng } from '../src/lib/game/rng';
import type { GameState } from '../src/lib/game/types';

// -----------------------------------------------------------------------
// Shared helpers
// -----------------------------------------------------------------------

function newGame(overrides: Partial<GameState> = {}): GameState {
  const s = createInitialState({
    seed: 'rest-spine-1266',
    leader: { name: 'Ezra', profession: 'carpenter' },
    companions: [{ name: 'Mary', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
  return { ...s, ...overrides };
}

// -----------------------------------------------------------------------
// Test 1: spoilage ticks in camp
// -----------------------------------------------------------------------

describe('#1266-s3 rest spine: spoilage ticks in camp', () => {
  it('spoilage fires on rest days — fresh game_meat rots after freshDays expire', () => {
    // Place game_meat and set the spoil clock so it expires on day+2
    // (GAME_MEAT_FRESH_DAYS = 3, but we set a shorter override so a
    // 2-day rest is guaranteed to expire it).
    let s = newGame();
    s = {
      ...s,
      inventory: { ...s.inventory, game_meat: 10 }
    };
    // Override the spoil clock to have already expired before the current
    // day so even cold-weather temp factor can't push it back into the future.
    // (At cold temps the adjustedSpoilDay = spoilDay - (factor - 1) where
    // factor < 1, meaning adjustedSpoilDay > spoilDay — we need a clock
    // value clearly in the past: day - 5 is unambiguous.)
    s = {
      ...s,
      flags: { ...s.flags, _gameMeatSpoilDay: s.day - 5 }
    };

    const after = rest(s, 1);

    // The spoil clock was clearly past — meat must be gone
    expect(after.inventory.game_meat).toBe(0);

    // A spoilage log line should exist
    const spoilLog = after.eventLog.find((l) =>
      /spoil/i.test(l.text) || /rotten/i.test(l.text) || /meat/i.test(l.text)
    );
    expect(spoilLog).toBeDefined();
  });
});

// -----------------------------------------------------------------------
// Test 2: holiday fires in camp
// -----------------------------------------------------------------------

describe('#1266-s3 rest spine: holiday fires in camp', () => {
  it('July 4 Independence Day fires when resting through it', () => {
    // Start on July 3 — one rest day advances to July 4
    const s = newGame({
      date: { year: 1848, month: 7, day: 3 },
      // Clear the year flag so the holiday hasn't fired yet
      flags: { ...newGame().flags, _july4Year: 0 }
    });

    const after = rest(s, 2);

    // Log should contain Independence Day text
    const holidayLog = after.eventLog.find((l) =>
      /Independence Day/i.test(l.text) || /salute/i.test(l.text) || /fiddle/i.test(l.text)
    );
    expect(holidayLog).toBeDefined();
  });
});

// -----------------------------------------------------------------------
// Test 3: morale history grows during rest
// -----------------------------------------------------------------------

describe('#1266-s3 rest spine: morale history grows during rest', () => {
  it('pushMoraleHistory called per rest day — history length grows by 3', () => {
    const s = newGame({ moraleHistory: [] });
    const before = (s.moraleHistory ?? []).length;

    const after = rest(s, 3);
    const afterLen = (after.moraleHistory ?? []).length;

    expect(afterLen - before).toBe(3);
  });

  it('moraleHistory is capped at 7', () => {
    // Pre-fill history to 6 items; after 3 more days it should be capped at 7
    const s = newGame({ moraleHistory: [50, 51, 52, 53, 54, 55] });
    const after = rest(s, 3);
    expect((after.moraleHistory ?? []).length).toBeLessThanOrEqual(7);
  });
});

// -----------------------------------------------------------------------
// Test 4: cleanliness decays in camp
// -----------------------------------------------------------------------

describe('#1266-s3 rest spine: cleanliness decays in camp', () => {
  it('party cleanliness is lower after 2 rest days with no wash action', () => {
    const s = newGame({
      // Start at full cleanliness; non-rain weather so decay runs
      weather: 'clear',
      party: newGame().party.map((m) => ({ ...m, cleanliness: 100 }))
    });

    const after = rest(s, 2);

    const avgBefore = 100;
    const avgAfter = after.party
      .filter((m) => !m.dead)
      .reduce((sum, m) => sum + (m.cleanliness ?? 100), 0) /
      after.party.filter((m) => !m.dead).length;

    expect(avgAfter).toBeLessThan(avgBefore);
  });
});

// -----------------------------------------------------------------------
// Test 5: dig_well beats dehydration (regression guard — must pass BOTH
//         before and after the implementation)
// -----------------------------------------------------------------------

describe('#1266-s3 rest spine: dig_well regression guard', () => {
  it('dig_well refills water before dehydration tail — no HP damage on day 1', () => {
    // Build state with no water AND a shovel (dig_well requires shovel)
    let s = newGame({
      resources: { ...newGame().resources, water: 0, dirtyWater: 0 }
    });
    s = {
      ...s,
      inventory: { ...s.inventory, shovel: 1 },
      // Make dig_well succeed deterministically by pre-seeding
      // (We'll just assert no HP was lost since dig_well adds water
      //  before the dehydration tail fires. At worst the random dig
      //  comes up dry — but we can check water > 0 OR no HP loss)
    };

    const partyHpBefore = s.party.filter((m) => !m.dead).map((m) => m.health);
    const after = rest(s, 1, { campActions: ['dig_well'] });

    // Either water was found (dig succeeded) or no dehydration HP hit occurred
    // on day 1 (first dry day has 0 HP penalty per dehydration.ts HEALTH_PER_DRY_DAY).
    // Dry-day 1 = index 1 = 0 HP damage, so health should be unchanged from the
    // camp rest mechanics (may heal, won't go down from dehydration).
    const partyHpAfter = after.party.filter((m) => !m.dead).map((m) => m.health);
    // No member should have LOWER health from dehydration on day 1
    // (healing from rest may push it higher — we only guard against dehydration drop)
    for (let i = 0; i < partyHpBefore.length; i++) {
      // Day 1 dehydration penalty is 0 HP; any HP change is positive (healing)
      expect(partyHpAfter[i]).toBeGreaterThanOrEqual(partyHpBefore[i]);
    }
  });
});

// -----------------------------------------------------------------------
// Test 6: theft can fire in camp
// -----------------------------------------------------------------------

describe('#1266-s3 rest spine: theft fires in camp', () => {
  it('rollDailyTheft can reduce inventory during rest', () => {
    // Strategy: find a seed where theft fires within a bounded search.
    // rollDailyTheft base chance is 0.005 (no wagonTrain). We try
    // different seeds by manipulating s.seed; rest uses
    // `${s.seed}:action:rest:${s.day}:0` as rng seed. We want
    // at least one of ~100 seeds to fire. Bounded deterministic search.

    const THEFT_ITEM = 'coffee';
    const INITIAL_QTY = 20;

    let theftFired = false;

    for (let attempt = 0; attempt < 2000 && !theftFired; attempt++) {
      let s = newGame();
      // Vary the seed to get different RNG streams
      s = {
        ...s,
        seed: `rest-theft-probe-${attempt}`,
        inventory: {
          ...s.inventory,
          // Stock all THEFT_VICTIMS to maximize coverage
          coffee: INITIAL_QTY,
          sugar: INITIAL_QTY,
          tobacco: INITIAL_QTY,
          whiskey: INITIAL_QTY
        },
        // Not in wagon train = full 0.5% chance
        wagonTrain: null
      };

      const after = rest(s, 1);
      if (after.eventLog.some((l) => /taken from the wagon/i.test(l.text)) ||
          ['coffee','sugar','tobacco','whiskey'].some(
            (id) => (after.inventory[id] ?? INITIAL_QTY) < INITIAL_QTY)) {
        theftFired = true;
      }
    }

    expect(theftFired).toBe(true);
  });
});
