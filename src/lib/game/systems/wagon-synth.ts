// #939a — Foundation for the unified-tick refactor (#939 umbrella).
//
// The bot AI surface lives across two parallel execution paths today:
// the player wagon runs through `engine-pausable.ts:tickDayPausable`
// (the real engine pipeline), while NPC wagons in the train tick
// through `systems/npc-engine.ts:tickNpcWagon` — a stripped
// re-implementation. Every parallel system in npc-engine has drifted
// or has gaps the audit (#934/#935) named.
//
// This module bridges the two: build a full `GameState` shim from an
// `NpcWagonState` + the shared train environment, run any engine
// system function on it, then project the wagon-local deltas back.
// Subsequent slices (#939b…n) swap each parallel impl in
// `tickNpcWagon` for the engine version one system at a time.
//
// Train-shared fields (location, date, weather, pace) come from the
// `TrainEnv` and are intentionally NOT projected back — those live on
// the train, not individual wagons.

import type {
  GameDate,
  GameState,
  Location,
  NpcWagonState,
  Pace,
  Weather
} from '../types';

/** Shared train environment that every wagon "sees" when ticking. */
export interface TrainEnv {
  day: number;
  date: GameDate;
  location: Location;
  weather?: Weather;
  pace: Pace;
}

/** Build a full GameState shim from an NPC wagon + the train env.
 *  The shim is suitable for invoking engine system functions
 *  (applyDailyConsumption, progressConditions, etc.) and capturing
 *  the wagon-local deltas via `projectWagonDeltas`. */
export function synthesizeWagonState(wagon: NpcWagonState, env: TrainEnv): GameState {
  return {
    seed: wagon.seed,
    day: env.day,
    date: env.date,
    location: env.location,
    party: wagon.party,
    wagon: wagon.wagon,
    oxen: wagon.oxen,
    dog: wagon.dog,
    inventory: wagon.inventory,
    cash: wagon.cash,
    resources: {
      water: wagon.water,
      waterCap: wagon.waterCap,
      dirtyWater: wagon.dirtyWater,
      firewood: 0
    },
    morale: wagon.morale,
    moraleHistory: undefined,
    pace: env.pace,
    rations: wagon.rations,
    weather: env.weather,
    eventLog: wagon.eventLog,
    flags: {},
    completed: wagon.outcome !== 'in-progress',
    outcome: wagon.outcome,
    wagonTrain: null
  };
}

/** Project the wagon-local deltas from a ticked GameState back into an
 *  NpcWagonState. The original wagon is the base — only fields that
 *  belong on the wagon (party, inventory, oxen, etc.) are pulled from
 *  the ticked state. Train-shared fields are NOT projected. */
export function projectWagonDeltas(
  ticked: GameState,
  original: NpcWagonState
): NpcWagonState {
  return {
    ...original,
    party: ticked.party,
    inventory: ticked.inventory,
    oxen: ticked.oxen,
    dog: ticked.dog,
    morale: ticked.morale,
    cash: ticked.cash,
    wagon: ticked.wagon,
    rations: ticked.rations,
    water: ticked.resources.water,
    waterCap: ticked.resources.waterCap,
    dirtyWater: ticked.resources.dirtyWater ?? 0,
    eventLog: ticked.eventLog,
    outcome: ticked.outcome
  };
}
