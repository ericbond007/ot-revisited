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
//
// #939a-2 — Flag bridges. NPCs store per-wagon counters in typed
// fields (`wagon.spoilDays[itemId]`, `wagon.dryDays`, `wagon.greaseMiles`)
// where the engine reads/writes the same counters in `state.flags` under
// magic-string keys (`_gameMeatSpoilDay`, `_dehydrationDays`,
// `_greaseSinceLastDose`). The synth packs NPC fields INTO the flags
// blob on the way in; the projection unpacks them BACK on the way out.
// Plus a wagonTrain stub so `morale.ts:54` train clamp fires for NPCs.

import type {
  GameDate,
  GameState,
  Location,
  NpcWagonState,
  Pace,
  Weather
} from '../types';
import { SPOIL_RULES } from './spoilage';

/** Shared train environment that every wagon "sees" when ticking. */
export interface TrainEnv {
  day: number;
  date: GameDate;
  location: Location;
  weather?: Weather;
  pace: Pace;
}

/** Engine flag key for the dehydration day-counter — see
 *  `systems/dehydration.ts`. NPC stores in `wagon.dryDays`. */
const FLAG_DEHYDRATION_DAYS = '_dehydrationDays';

/** Engine flag key for the axle-grease mile-counter — see
 *  `systems/wagon.ts:applyAxleGrease`. NPC stores in
 *  `wagon.greaseMiles`. */
const FLAG_GREASE_SINCE_LAST_DOSE = '_greaseSinceLastDose';

/** #939f — Engine flag key for the starvation day-counter — see
 *  `systems/starvation.ts:applyStarvation`. NPC stores in
 *  `wagon.starvationDays`. */
const FLAG_STARVATION_DAYS = '_starvationDays';

/** #1266 — persistent `flags._*` the engine writes across multiple days
 *  that the synth bridge must carry (the typed counters spoilDays/dryDays/
 *  greaseMiles/starvationDays are handled separately above). Add a key here
 *  when a new daily system introduces a multi-day flag; same-tick flags
 *  (consumed within one synth) do NOT belong here. */
export const NPC_PERSISTENT_FLAG_KEYS = [
  '_hotDrinkClock',    // diet.ts — accumulating oz toward the next lb of coffee/tea
  '_july4Year',        // holidays.ts — last year the July 4 bump fired
  '_christmasYear',    // holidays.ts — last year the Christmas bump fired
  '_cannibalismCount', // cannibal.ts / camp-actions.ts — running tally
  '_lastOxDeathDay'    // oxen.ts — day the most recent ox newly reached health=0; gating the #1388 panic-bump recency check
] as const;

/** Build the engine-shaped `flags` blob for an NPC wagon: pack the
 *  typed counters (`spoilDays`, `dryDays`, `greaseMiles`) into the
 *  magic-string keys the engine systems read. */
function npcFlagsFromWagon(wagon: NpcWagonState): GameState['flags'] {
  const flags: GameState['flags'] = {};
  if (wagon.spoilDays) {
    for (const rule of SPOIL_RULES) {
      const v = wagon.spoilDays[rule.itemId];
      if (typeof v === 'number') flags[rule.flagKey] = v;
    }
  }
  if (typeof wagon.dryDays === 'number' && wagon.dryDays > 0) {
    flags[FLAG_DEHYDRATION_DAYS] = wagon.dryDays;
  }
  if (typeof wagon.greaseMiles === 'number') {
    flags[FLAG_GREASE_SINCE_LAST_DOSE] = wagon.greaseMiles;
  }
  if (typeof wagon.starvationDays === 'number' && wagon.starvationDays > 0) {
    flags[FLAG_STARVATION_DAYS] = wagon.starvationDays;
  }
  if (wagon.persistentFlags) {
    for (const key of NPC_PERSISTENT_FLAG_KEYS) {
      const k: string = key;
      const v = wagon.persistentFlags[k];
      if (typeof v === 'number') flags[k] = v;
    }
  }
  return flags;
}

/** Unpack a ticked GameState's `flags` blob back into the NPC's typed
 *  fields. Inverse of `npcFlagsFromWagon`.
 *
 *  #939a-3 — `spoilDays` always reflects exactly what's in ticked.flags
 *  (which may be `{}` after engine clearance). The engine reads/writes
 *  every spoil-rule key every tick, so missing = cleared, not
 *  "untouched." The previous `anySpoil ? spoilDays : original.spoilDays`
 *  fallback would leak stale clocks when the engine spoiled the last
 *  pending pile.
 *
 *  `dryDays` falls back to 0 because the engine deletes
 *  `_dehydrationDays` on rehydration (correct semantic: missing means
 *  rehydrated).
 *
 *  `greaseMiles` falls back to `original.greaseMiles` because the
 *  engine never deletes `_greaseSinceLastDose` — only resets it to 0
 *  after applying a dose. Missing = engine didn't run on grease this
 *  tick, so preserve the NPC's current value. */
function npcFieldsFromFlags(
  ticked: GameState,
  original: NpcWagonState
): Pick<NpcWagonState, 'spoilDays' | 'dryDays' | 'greaseMiles' | 'starvationDays' | 'persistentFlags'> {
  const spoilDays: Record<string, number> = {};
  for (const rule of SPOIL_RULES) {
    const v = ticked.flags[rule.flagKey];
    if (typeof v === 'number') {
      spoilDays[rule.itemId] = v;
    }
  }
  const dry = ticked.flags[FLAG_DEHYDRATION_DAYS];
  const grease = ticked.flags[FLAG_GREASE_SINCE_LAST_DOSE];
  const starv = ticked.flags[FLAG_STARVATION_DAYS];
  const persistentFlags: Record<string, number> = {};
  for (const key of NPC_PERSISTENT_FLAG_KEYS) {
    const k: string = key;
    const v = ticked.flags[k];
    if (typeof v === 'number') persistentFlags[k] = v;
  }
  return {
    spoilDays,
    dryDays: typeof dry === 'number' ? dry : 0,
    greaseMiles: typeof grease === 'number' ? grease : original.greaseMiles,
    // Engine deletes `_starvationDays` on a fed day — match by
    // clearing wagon.starvationDays (undefined = none) when missing.
    starvationDays: typeof starv === 'number' ? starv : 0,
    persistentFlags: Object.keys(persistentFlags).length > 0 ? persistentFlags : undefined
  };
}

/** Marker wagonTrain attached to the synthesized GameState. The
 *  engine's morale tick reads `state.wagonTrain` truthiness to apply
 *  the +1/day in-train clamp (`morale.ts:54`); we want NPCs in the
 *  train to receive that too. Empty `companions` prevents recursion
 *  if any future engine system iterates the roster. */
const SYNTH_TRAIN_STUB = {
  id: 'synth-stub',
  name: 'synth-stub',
  joinedDay: 0,
  joinedAtLandmarkId: null,
  leaderId: 'player' as const,
  companions: [],
  // #1046 C1 — placeholder doctrine for the synth stub (NPC ticking
  // shim; no real captain governs this).
  doctrine: 'prudent' as const
};

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
    // #1266 stage2 — carry the wagon's persona-picked tier so the engine's
    // applyWaterRationStrain can fire on the synth. The engine never mutates
    // waterRation during a tick, so no projection back is needed (the NPC
    // preamble's persona pick owns the field).
    waterRation: wagon.waterRation ?? 'normal',
    weather: env.weather,
    // Empty so engine appends are isolated and captured by the
    // projection — keeps NPC's prior log untouched if the engine
    // doesn't fire anything this tick.
    eventLog: [],
    flags: npcFlagsFromWagon(wagon),
    completed: wagon.outcome !== 'in-progress',
    outcome: wagon.outcome,
    wagonTrain: SYNTH_TRAIN_STUB
  };
}

/** Project the wagon-local deltas from a ticked GameState back into an
 *  NpcWagonState. The original wagon is the base — only fields that
 *  belong on the wagon (party, inventory, oxen, etc.) are pulled from
 *  the ticked state. Train-shared fields are NOT projected.
 *
 *  Engine entries appended to `ticked.eventLog` are concatenated onto
 *  the NPC's own log so each wagon retains its history.
 *
 *  Flag-bridged fields (spoilDays / dryDays / greaseMiles) are
 *  unpacked from `ticked.flags` back into their typed positions. */
export function projectWagonDeltas(
  ticked: GameState,
  original: NpcWagonState
): NpcWagonState {
  const fromFlags = npcFieldsFromFlags(ticked, original);
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
    eventLog: [...original.eventLog, ...ticked.eventLog],
    outcome: ticked.outcome,
    spoilDays: fromFlags.spoilDays,
    dryDays: fromFlags.dryDays,
    greaseMiles: fromFlags.greaseMiles,
    starvationDays: fromFlags.starvationDays,
    persistentFlags: fromFlags.persistentFlags
  };
}
