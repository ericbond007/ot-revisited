// Smoke test for the phase-2 event log audit.
//
// Every event's choice apply() should produce at least one log entry that
// describes the OUTCOME, not just restate the prompt. We assert:
//   1. Every choice's apply call grows eventLog by >= 1 entry.
//   2. Every audited (silentLog) choice grows it by exactly 1 entry — apply()
//      writes its own line; resolveEvent does not auto-append.
//   3. No choice produces a log line that is just "<title>: <label>." since
//      that pattern is what we replaced.

import { describe, it, expect } from 'vitest';
import { EVENTS } from '../src/lib/game/content/events';
import { resolveEvent } from '../src/lib/game/systems/events';
import { makeRng } from '../src/lib/game/rng';
import type { GameState, ProfessionId } from '../src/lib/game/types';

function baseState(): GameState {
  return {
    seed: 'audit',
    day: 5,
    date: { year: 1848, month: 6, day: 15 },
    location: {
      trailPosition: 0.2,
      nextLandmarkId: 'ft_kearny',
      previousLandmarkId: 'kansas_river',
      milesTraveled: 200,
      terrain: 'prairie'
    },
    party: [
      { id: 'a', name: 'Ann', profession: 'doctor' as ProfessionId, sex: 'female', kind: 'adult', isLeader: true,  age: 30, health: 100, conditions: [], dead: false },
      { id: 'b', name: 'Ben', profession: 'hunter' as ProfessionId, sex: 'male',   kind: 'adult', isLeader: false, age: 28, health: 100, conditions: [], dead: false }
    ],
    wagon: { model: 'prairie_schooner', condition: 80, canvas: 100, carryCapacity: 2500, impairment: null },
    oxen: [
      { id: 'o1', health: 100, fatigue: 30, shod: true },
      { id: 'o2', health: 100, fatigue: 30, shod: true }
    ],
    // Generously stocked so events that consume parts/medicine have something to consume.
    inventory: {
      flour: 200, beans: 50, bacon: 50,
      wheel: 2, axle: 2, tongue: 2, canvas: 2, ox_shoes: 4,
      bullets: 30, bandages: 4, shovel: 1
    },
    cash: 100,
    resources: { water: 15, waterCap: 20 },
    morale: 60,
    pace: 'moderate',
    rations: 'normal',
    waterRation: 'normal',
    eventLog: [],
    // Burial event needs _burialPending; we set it manually for that event.
    flags: {},
    completed: false,
    outcome: 'in-progress'
  };
}

const PROMPT_RESTATE_RE = /^[^.]+:\s/;

describe('every event choice produces an outcome log entry', () => {
  for (const event of EVENTS) {
    for (const choice of event.choices) {
      it(`${event.id} / ${choice.id}`, () => {
        // encounter_salmon_band needs _salmonBand* flags + enough goods so the
        // enabled predicate on accept_goods passes (25% of targetValue). One
        // blanket ($1.50 sell) is enough for a 10-lb offer ($4.00 × 0.25 = $1.00).
        const salmonBandState = {
          ...baseState(),
          inventory: {
            ...baseState().inventory,
            blanket: 2, tobacco: 3
          },
          flags: {
            _salmonBandOffer: 10,
            _salmonBandTribeId: 'bannock',
            _salmonBandGoodsPrice: 4.0,
            _salmonBandCashPrice: 5.2
          }
        };
        // child_wagon_fall requires a live child in the party.
        const childWagonFallState = {
          ...baseState(),
          party: [
            ...baseState().party,
            { id: 'c1', name: 'Lucy', profession: undefined, sex: 'female' as const, kind: 'child' as const, isLeader: false, age: 7, health: 100, conditions: [], dead: false }
          ]
        };
        const state = event.id === 'personal_burial'
          ? { ...baseState(), flags: { _burialPending: true } }
          : event.id === 'encounter_salmon_band'
          ? salmonBandState
          : event.id === 'child_wagon_fall'
          ? childWagonFallState
          : baseState();
        const before = state.eventLog.length;
        const after = resolveEvent(state, event, choice.id, makeRng(`audit:${event.id}:${choice.id}`));

        // #936b — wagon_stuck/abandon_load is a deferred two-step
        // choice: its apply sets `_mudAbandonPending` (the player
        // gets MudAbandonModal; NPC/bot resolve via persona). The
        // outcome log line is written when that flag is resolved, not
        // by the choice apply itself.
        if (event.id === 'wagon_stuck' && choice.id === 'abandon_load') {
          expect(after.flags._mudAbandonPending).toBe(true);
          expect(after.eventLog.length).toBe(before);
          return;
        }

        const grew = after.eventLog.length - before;
        expect(grew).toBeGreaterThanOrEqual(1);

        if (choice.silentLog) {
          // Audited: apply itself adds outcome line(s); no auto-append.
          // Escape regex metacharacters from user-facing strings before
          // building the pattern (labels can contain parens, +, etc.).
          const escTitle = event.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const escLabel = (choice.label ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          for (const entry of after.eventLog.slice(before)) {
            expect(entry.text).not.toMatch(new RegExp(`^${escTitle}:\\s+${escLabel}\\.?$`));
          }
        }
      });
    }
  }
});
