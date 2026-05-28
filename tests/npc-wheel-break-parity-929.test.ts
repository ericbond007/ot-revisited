// #929 T12 — NPC wagon-decay path uses shared resolveWheelBreak + persona pick.
//
// BEFORE the fix: the #939i event-dispatch block in npc-engine.ts calls
//   persona.pickNpcEventChoice() for ALL events. For 'wagon_wheel',
//   pickNpcEventChoice returns null → fallback is 'rebuild' regardless
//   of persona or wagon state. Consequences:
//     - NPC with spare wheel always REBUILDS instead of using the spare
//     - aggressive NPC at cond<40 always REBUILDS instead of pushing on
//
// AFTER the fix: the #939i block detects event.id === 'wagon_wheel' and
//   delegates to persona.pickWheelBreakResponse(synth, rng) — the same
//   3-choice ladder the player uses.
//
// Failing assertions (before fix):
//   Case 3: aggressive NPC + cond 30 + no spare → 3000-tick scan shows
//           push_on was NEVER chosen (impairment never set from push_on,
//           though rebuild failures can also set impairment — see note below)
//   Case 4: balanced NPC + wheel:1 → 3000-tick scan shows spare was
//           NEVER consumed (wheel count never drops to 0)
//
// After fix: both scans find at least one tick where the correct branch fired.

import { describe, it, expect } from 'vitest';
import { EVENTS, NPC_ELIGIBLE_EVENTS } from '../src/lib/game/content/events';
import { resolveEvent } from '../src/lib/game/systems/events';
import {
  synthesizeWagonState,
} from '../src/lib/game/systems/wagon-synth';
import { getPersona } from '../src/lib/game/ai/personas';
import { makeRng } from '../src/lib/game/rng';
import { tickNpcWagon } from '../src/lib/game/systems/npc-engine';
import type { NpcWagonState } from '../src/lib/game/types';

const wagEvt = EVENTS.find((e) => e.id === 'wagon_wheel')!;

/** Minimal NPC wagon for wheel-break tests. */
function wheelWagon(opts: {
  condition: number;
  wheel?: number;
  personaId?: NpcWagonState['personaId'];
}): NpcWagonState {
  return {
    id: 'wagon-t12',
    name: 'the T12 family',
    leaderProfession: 'farmer',
    hasChildren: false,
    seed: 't12',
    personaId: opts.personaId ?? 'balanced',
    party: [
      {
        id: 'p1',
        name: 'A',
        kind: 'adult',
        sex: 'male',
        age: 30,
        profession: 'farmer',
        isLeader: true,
        health: 100,
        dead: false,
        conditions: []
      }
    ],
    inventory: { flour: 100, ...(opts.wheel != null ? { wheel: opts.wheel } : {}) },
    oxen: [{ id: 'o1', health: 100, fatigue: 0, shod: true }],
    morale: 70,
    cash: 100,
    wagon: {
      model: 'prairie_schooner',
      condition: opts.condition,
      canvas: 100,
      carryCapacity: 1500,
      hasBranBarrel: false,
      impairment: null
    },
    eventLog: [],
    outcome: 'in-progress',
    rations: 'normal',
    water: 20,
    dirtyWater: 0,
    waterCap: 20,
    dryDays: 0
  };
}

const ENV = {
  day: 30,
  date: { year: 1849, month: 5, day: 15 },
  location: {
    trailPosition: 200,
    nextLandmarkId: 'ft_kearny',
    previousLandmarkId: null,
    milesTraveled: 200,
    terrain: 'prairie' as const
  },
  weather: 'clear' as const,
  pace: 'moderate' as const
};

const CTX = {
  day: 30,
  date: { year: 1849, month: 5, day: 15 },
  location: {
    trailPosition: 200,
    nextLandmarkId: 'ft_kearny',
    previousLandmarkId: null,
    milesTraveled: 200,
    terrain: 'prairie' as const
  },
  traveled: true,
  pace: 'moderate' as const,
  terrain: 'prairie' as const,
  weather: 'clear' as const,
  traveledMiles: 14
};

describe('#929 T12 — persona.pickWheelBreakResponse is used for wagon_wheel events', () => {
  it('wagon_wheel is in NPC_ELIGIBLE_EVENTS', () => {
    // Precondition: the event can fire for NPCs.
    expect(NPC_ELIGIBLE_EVENTS.some((e) => e.id === 'wagon_wheel')).toBe(true);
  });

  it('pickNpcEventChoice returns null for wagon_wheel on all base personas', () => {
    // Confirms that the existing pickNpcEventChoice is NOT overridden
    // for wagon_wheel — the fix must live in npc-engine.ts, not the persona.
    for (const pid of ['cautious', 'balanced', 'aggressive', 'chaos'] as const) {
      const persona = getPersona(pid);
      const wagon = wheelWagon({ condition: 30, wheel: 0, personaId: pid });
      const synth = synthesizeWagonState(wagon, ENV);
      const rng = makeRng(`t12-nec-${pid}`);
      const choice = persona.pickNpcEventChoice(
        synth, 'wagon_wheel', ['spare', 'rebuild', 'push_on'], rng
      );
      expect(choice).toBeNull();
    }
  });

  it('Unit — aggressive + cond 30 + no spare: pickWheelBreakResponse returns push_on', () => {
    const wagon = wheelWagon({ condition: 30, wheel: 0, personaId: 'aggressive' });
    const synth = synthesizeWagonState(wagon, ENV);
    const persona = getPersona('aggressive');
    const choice = persona.pickWheelBreakResponse(synth, makeRng('t12-u1'));
    expect(choice).toBe('push_on');
    // Resolving push_on sets impairment.
    const ticked = resolveEvent(synth, wagEvt, 'push_on', makeRng('t12-u1b'));
    expect(ticked.wagon.impairment).not.toBeNull();
    expect(ticked.wagon.impairment?.kind).toBe('wheel');
  });

  it('Unit — balanced + wheel:1: pickWheelBreakResponse returns spare', () => {
    const wagon = wheelWagon({ condition: 50, wheel: 1, personaId: 'balanced' });
    const synth = synthesizeWagonState(wagon, ENV);
    const persona = getPersona('balanced');
    const choice = persona.pickWheelBreakResponse(synth, makeRng('t12-u2'));
    expect(choice).toBe('spare');
    // Resolving spare consumes wheel and clears impairment.
    const ticked = resolveEvent(synth, wagEvt, 'spare', makeRng('t12-u2b'));
    expect(ticked.inventory.wheel ?? 0).toBe(0);
    expect(ticked.wagon.impairment).toBeNull();
  });

  it('Case 3 (INTEGRATION) — aggressive wagon + cond<40 + no spare: push_on eventually observed', () => {
    // Before fix: rebuild is always chosen → push_on never observed.
    // After fix: pickWheelBreakResponse is called → push_on fires
    //   for aggressive at cond<40.
    //
    // We detect push_on specifically by its log text "Pushed on with a busted wheel"
    // (distinct from rebuild failure "The rebuild went wrong — a spoke split").
    // Both set impairment but only push_on has "Pushed on" in the log.
    const wagon = wheelWagon({ condition: 30, wheel: 0, personaId: 'aggressive' });
    let sawPushOn = false;

    for (let i = 0; i < 3000 && !sawPushOn; i++) {
      const rng = makeRng(`t12-int3-${i}`);
      const result = tickNpcWagon(wagon, CTX, rng);

      // "Pushed on with a busted wheel" is the unique push_on log fragment.
      if (result.playerLogs.some((t) => /pushed on with a busted wheel/i.test(t))) {
        sawPushOn = true;
      }
    }

    // Before fix: sawPushOn is false (rebuild always chosen).
    // After fix: sawPushOn is true (push_on chosen for aggressive at cond<40).
    expect(sawPushOn).toBe(true);
  });

  it('Case 4 (INTEGRATION) — balanced wagon + spare: spare eventually consumed', () => {
    // Before fix: rebuild always chosen → spare wheel never consumed.
    // After fix: pickWheelBreakResponse called → spare chosen → wheel
    //   count drops from 1 to 0.
    const wagon = wheelWagon({ condition: 50, wheel: 1, personaId: 'balanced' });
    let sawSpareConsumed = false;

    for (let i = 0; i < 3000 && !sawSpareConsumed; i++) {
      const rng = makeRng(`t12-int4-${i}`);
      const result = tickNpcWagon(wagon, CTX, rng);

      // spare consumed: wheel drops to 0, impairment stays null,
      // log mentions "spare wheel"
      const wheelAfter = result.wagon.inventory.wheel ?? 0;
      if (wheelAfter === 0 &&
          result.wagon.wagon.impairment === null &&
          result.playerLogs.some((t) => /spare wheel/i.test(t))) {
        sawSpareConsumed = true;
      }
    }

    // Before fix: sawSpareConsumed is false (rebuild always chosen).
    // After fix: sawSpareConsumed is true (spare consumed via pickWheelBreakResponse).
    expect(sawSpareConsumed).toBe(true);
  });
});
