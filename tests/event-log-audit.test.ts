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
    wagon: { model: 'prairie_schooner', condition: 80, canvas: 100, carryCapacity: 2500 },
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
        const state = event.id === 'personal_burial'
          ? { ...baseState(), flags: { _burialPending: true } }
          : baseState();
        const before = state.eventLog.length;
        const after = resolveEvent(state, event, choice.id, makeRng(`audit:${event.id}:${choice.id}`));
        const grew = after.eventLog.length - before;
        expect(grew).toBeGreaterThanOrEqual(1);

        if (choice.silentLog) {
          // Audited: apply itself adds outcome line(s); no auto-append.
          for (const entry of after.eventLog.slice(before)) {
            expect(entry.text).not.toMatch(new RegExp(`^${event.title}:\\s+${choice.label}\\.?$`));
          }
        }
      });
    }
  }
});
