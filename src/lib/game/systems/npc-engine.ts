// #280b Per-wagon engine tick. NPC companion wagons advance through
// the daily systems alongside the player's state — they eat, get
// tired, fall sick, and die.
//
// #1266 stage2 — tickNpcWagon consumes the canonical DAILY_STEPS
// segments (../daily-steps) through the wagon-synth bridge, so NPCs
// run the FULL player system list. The only exclusions are the
// scope-tagged playerOnly steps (see daily-steps.ts): attemptFire
// (synth stubs firewood to 0 — the cold-camp branch would exposure-
// drain NPCs nightly), applyTrainShare (player-recipient no-op on
// the synth train stub), and adjustMorale (applyNpcMoraleBaseline is
// the npcOnly sibling). NPC-only interludes — camp bundle, stray ox,
// storm damage, NPC events, cannibalize — run as driver code between
// segments.
//
// Why a separate file: the engine systems take the full GameState.
// The NPC tick wraps each wagon in a synthesized GameState
// (synthesizeWagonState) per segment and projects the wagon-local
// deltas back (projectWagonDeltas) — see ./wagon-synth.

import {
  runSteps,
  MORNING_STEPS,
  POST_BRANCH_STEPS,
  PRE_TRAVEL_STEPS,
  TRAVEL_OX_WAGON_STEPS,
  POST_EVENT_TAIL_STEPS
} from '../daily-steps';
import type { Rng } from '../rng';
import { makeRng } from '../rng';
import type {
  CompanyRestMode,
  GameDate,
  GameState,
  Location,
  NpcWagonState,
  Pace,
  Terrain,
  Weather
} from '../types';
import { getPersona } from '../ai/personas';
import { bundleCampActions } from '../ai/bundle';
import { CAMP_ACTIONS_BY_ID } from '../actions/camp-actions';
import { synthesizeWagonState, projectWagonDeltas, type TrainEnv } from './wagon-synth';
import { rollStrayMorning } from './strays';
import { recoverOxenFatigue, recoverOxenHealth } from './oxen';
import { applyAxleGrease as applyEngineAxleGrease } from './wagon';
import {
  applyCannibalize,
  findFreshUnconsumedCorpse,
  hasFoodOnHand
} from './cannibal';
import { abandonHeavyLoad } from './item-loss';
// #939i — `rollNpcEvent` parallel impl removed. NPC event roll now
// flows through engine `rollEvent` + `resolveEvent` over
// NPC_ELIGIBLE_EVENTS via the wagon-synth bridge.
import { rollEvent, resolveEvent } from './events';
import { NPC_ELIGIBLE_EVENTS } from '../content/events';
// #939k — applyNpcDehydration + rollNpcTheft removed; engine versions
// imported above (./dehydration + ./item-loss).
// #939m — local reapDead + updateOutcome parallel impls removed; engine
// `reapDead` (./death) sets deathCause from worst condition, hits child
// morale, and folds the wipe-outcome update in.
import { applyNpcStormDamage } from './wagon';

/** Inputs the NPC tick needs from the train's shared environment. */
export interface NpcTickContext {
  /** Today's day number (for log entries). */
  day: number;
  /** Today's calendar date. Used by #937 NPC voluntary-rest check
   *  (`persona.shouldRest` reads `state.date` for Sunday observance).
   *  Optional for tests / synthetic harnesses that don't model
   *  Sundays; when omitted, the Sunday branch of `shouldRest` is
   *  treated as false. */
  date?: GameDate;
  /** Trail position the train is at. #939b — passed through to the
   *  wagon-synth helper so engine systems running on a synthesized
   *  per-NPC GameState see the right location. Optional for
   *  legacy/test callers; the synth falls back to a stub when absent
   *  (see `defaultLocation` below). */
  location?: Location;
  /** True when the train moved today (oxen take fatigue). False on
   *  rest / camp days (oxen recover; food still drains). */
  traveled: boolean;
  /** Today's pace — drives ox fatigue accrual when traveling. */
  pace: Pace;
  /** Today's terrain — affects ox grazing recovery on rest days. */
  terrain: Terrain;
  /** Today's weather — drives water consumption mult (heat doubles)
   *  and heat-spoilage on bacon / salt_pork (#295), same as the player.
   *  Required so callers can't silently no-op heat-sensitive systems
   *  by forgetting to pass it. */
  weather: Weather;
  /** Today's miles travelled — drives axle-grease consumption
   *  cycle (#300). Defaults to 0 on rest / event / non-travel days,
   *  so non-travel callers can omit this field. */
  traveledMiles?: number;
  /** #1046 C2 — when set, this wagon is in a captained train and the
   *  company's daily decision governs travel/rest; the per-persona
   *  #937 voluntary-rest gate is bypassed (handled in a later step).
   *  Absent = solo wagon. */
  companyRestMode?: CompanyRestMode;
}

/** #939b — Build a TrainEnv from the NpcTickContext for the
 *  wagon-synth helper. `ctx.location` and `ctx.date` are optional on
 *  the interface (older callers don't pass them); the stub defaults
 *  preserve engine behavior for those callers — the prairie + day-1
 *  trail-start values are inert for the systems #939 is unifying. */
const DEFAULT_TICK_LOCATION = {
  trailPosition: 0,
  nextLandmarkId: 'lone_elm_campground',
  previousLandmarkId: null,
  milesTraveled: 0,
  terrain: 'prairie' as const
};
const DEFAULT_TICK_DATE = { year: 1849, month: 1, day: 2 }; // Monday — no Sunday-rest

function trainEnv(ctx: NpcTickContext): TrainEnv {
  return {
    day: ctx.day,
    date: ctx.date ?? DEFAULT_TICK_DATE,
    location: ctx.location ?? DEFAULT_TICK_LOCATION,
    weather: ctx.weather,
    pace: ctx.pace
  };
}

// #939c — RATIONS_LB_PER_EATER table removed. Consumption now flows
// through engine `applyDailyConsumption` which has the real per-adult /
// per-child / pace / weather / profession math (see consumption.ts:84).

/** #939i — per-NPC-per-day event fire chance. Preserves the previous
 *  parallel impl's 0.06 rate so a 10-wagon train surfaces ~0.6
 *  events/day. The wider 31-event pool brings variety, not volume. */
const NPC_FIRE_CHANCE = 0.06;

// #939j — FOOD_DRAW_ORDER constant removed. The only remaining
// consumer (maybeCannibalize food-check) now routes through
// `hasFoodOnHand` in systems/cannibal.ts, which carries the same list.

// #939g — NPC_FATIGUE_PER_DAY removed. NPC ox tick now flows through
// engine `tickOxen` which has the real teamster / shoeless / mule-grain
// / grazing math (see systems/oxen.ts).

// #939f — `STARVATION_HP_PER_DAY` constant + `applyStarvation` parallel
// removed. NPC starvation now chains off engine `applyStarvation` inside
// the consumption synth block (so `_lastFoodShortfall` is fresh) and
// the persistent `_starvationDays` counter round-trips via wagon-synth.
// Engine version has accumulating-days HP/morale curve + tracks
// starvation as a proper Condition (auto-cleared on a fed day).

// #939c — `consumeFood` + `applyNpcPastryQuality` parallel impls
// removed. NPC consumption now flows through engine's
// `applyDailyConsumption` + `applyDietVariety` + `applyHotDrinks` +
// `applyPastryQuality` via wagon-synth (see the consumption block in
// `tickNpcWagon`). NPCs gain the diet-variety + hot-drinks bonuses
// that the parallel impl never had.

// #939d — `npcHasLiveDoctor` removed; engine `progressConditions`
// uses player's `hasLiveDoctor` directly.

// #939d — `tickConditions` parallel impl removed. NPC conditions now
// flow through engine `progressConditions` via wagon-synth, which
// includes the `resolvedByItems` auto-clear + `dailyMoraleDelta`
// behaviors the parallel impl was missing.

// #939g — `tickOxenTravel` + `tickOxenRest` parallel impls removed.
// Engine `tickOxen` handles travel fatigue (with teamster / shoeless /
// mule-grain / grazing); `recoverOxenFatigue` handles rest recovery
// (terrain-aware amount inlined at the call site).

// #939m — local `reapDead` parallel impl removed. NPCs now flow
// through engine `reapDead` via wagon-synth (see reap block in
// `tickNpcWagon`). Engine version pulls deathCause from worst
// condition, hits child-death morale, and sets the outcome='wiped'
// flag — which is why the local `updateOutcome` parallel could go too.

// #288 — NPC auto-cannibalism. Period reality: Donner Party survivors
// did this without consultation when food=0 and a fresh body was
// available. NPCs don't get a player choice — the bot decides — so
// when both conditions hold the wagon silently consumes a corpse via
// the shared `applyCannibalize` helper (#939j). The grim flavor
// surfaces as a player-visible log line so the player feels the
// tonal shift.
//
// #939j — math + eligibility + freshness window all live in
// `systems/cannibal.ts`. Adult unifies on −18 morale (matching the
// player path); child stays at −25. `_cannibalismCount` increments on
// every consumption, uniform with player surfaces. The NPC tick
// synthesizes a GameState, runs the helper, and projects the deltas
// back onto the wagon.
function maybeCannibalize(
  wagon: NpcWagonState,
  ctx: NpcTickContext,
  rng: Rng
): { wagon: NpcWagonState; playerLog?: string } {
  const env = trainEnv(ctx);
  const synth = synthesizeWagonState(wagon, env);
  if (hasFoodOnHand(synth)) return { wagon };
  const corpse = findFreshUnconsumedCorpse(synth);
  if (!corpse) return { wagon };
  // #907 — persona-driven moral gate. Default true (Donner reality);
  // faithful overrides to refuse.
  const persona = getPersona(wagon.personaId ?? 'balanced');
  if (!persona.shouldCannibalize(synth)) return { wagon };
  const { state: ticked, log } = applyCannibalize(synth, corpse.id, rng);
  const next = projectWagonDeltas(ticked, wagon);
  return {
    wagon: next,
    playerLog: `${log} (${next.name})`
  };
}

/** Result of advancing one NPC wagon by one day — the new state plus
 *  any player-visible news entries from #280c events. */
export interface NpcTickResult {
  wagon: NpcWagonState;
  /** One-line news strings for the player's eventLog. Empty on quiet
   *  days (the common case). */
  playerLogs: string[];
}

/** Advance one NPC wagon by one day. The order mirrors the player's
 *  daily pipeline at a coarse level: conditions drain HP first
 *  (treatments may consume inventory), then food consumption, then
 *  starvation onset if food=0, then ox fatigue/recovery, then a
 *  daily NPC event roll (#280c — wheel break, ox lame, snakebite,
 *  cholera, etc.), then death reaping, then outcome update.
 *
 *  Persona-surface audit (#939l). Methods that fire per-wagon, per-day
 *  in this function:
 *    - `pickRations`       — 1c rations block
 *    - `shouldRest`        — 1d voluntary-rest gate
 *    - `shouldCannibalize` — step 7 `maybeCannibalize`
 *
 *  Methods that fire at trading-post arrival (see
 *  `wagon-train.ts:advanceWagonTrainTradingPost`):
 *    `shouldTradeAtPost`, `pickFoodRestockOpts`,
 *    `pickEquipmentRestockOpts`, `pickRepairBudget`, `pickOxSwapCount`.
 *
 *  Methods that DO NOT fire for NPCs by design:
 *    - `pickPace` / `pickFordMethod` / `shouldStayAtInn` — the train
 *      moves as a unit, so the player's choice applies to all wagons.
 *    - `shouldHunt` / `shouldFindWater` / `shouldPan` / `shouldRaid` /
 *      `shouldStealFromTrain` — camp actions the player drives. NPCs
 *      don't independently camp.
 *    - `pickNpcEventChoice` — surface only; current NPC events
 *      (#280c) are choice-less mechanical mutations. Wires up when
 *      #939i routes NPCs through the engine event bank. */
export function tickNpcWagon(
  wagon: NpcWagonState,
  ctx: NpcTickContext,
  rng: Rng
): NpcTickResult {
  // Already-finished wagons don't tick — they sit in their final state
  // for the wagon-party view (#280d) until the run ends.
  if (wagon.outcome !== 'in-progress') {
    return { wagon, playerLogs: [] };
  }

  let next = wagon;
  const playerLogs: string[] = [];
  // #939m — `env` hoisted: every synth/project block in this tick uses
  // the same TrainEnv (day/date/location/weather/pace). The rest-day
  // switch below flips `traveled` only, which trainEnv doesn't read.
  const env = trainEnv(ctx);

  // 1c. #895 — persona-driven rations decision.
  const persona = getPersona(next.personaId ?? 'balanced');
  const fauxState = { inventory: next.inventory, party: next.party } as unknown as GameState;
  next = { ...next, rations: persona.pickRations(fauxState, rng) };
  {
    // #1245 — water-ration persona decision.
    const waterFauxState = {
      inventory: next.inventory,
      party: next.party,
      location: ctx.location ?? DEFAULT_TICK_LOCATION,
      weather: ctx.weather,
      date: ctx.date ?? DEFAULT_TICK_DATE,
      pace: ctx.pace,
      resources: { water: next.water, waterCap: next.waterCap },
      waterRation: next.waterRation ?? 'normal',
      flags: {}
      // faux state: pickWaterRation reads only resources/location/date/
      // weather — a structural subset, not a real GameState.
    } as unknown as GameState;
    next = { ...next, waterRation: persona.pickWaterRation(waterFauxState, rng) };
  }

  // 1d. #937 — persona-driven voluntary rest.
  let traveled = ctx.traveled;
  // #1046 C2 — in a captained train the company's daily decision
  // governs travel/rest coherently for all wagons; skip the
  // per-persona #937 voluntary-rest gate.
  if (traveled && ctx.companyRestMode === undefined) {
    const restFauxState = {
      date: ctx.date ?? { year: 1849, month: 1, day: 2 },
      party: next.party,
      morale: next.morale,
      oxen: next.oxen
    } as unknown as GameState;
    if (persona.shouldRest(restFauxState, rng)) {
      traveled = false;
    }
  }

  // MORNING_STEPS segment — conditions + producers + spoilage + cleanliness ×3 +
  // ambient-water + consumption + water-ration-strain + diet + hot-drinks +
  // pastry + theft + dirty-water + starvation. One synth round-trip.
  // #1266 stage2 — 5 previously-skipped systems now fire via this segment:
  //   decayCleanliness, applyDirtyMorale, applyFilthDiseaseRisk (cleanliness ×3)
  //   applyAmbientWaterRefill, applyWaterRationStrain.
  // Adopted reorders (parity with player): theft now at its MORNING position
  // (was dead-last in 7b); producers un-nested to top-of-MORNING.
  {
    const synth = synthesizeWagonState(next, env);
    const ticked = runSteps(MORNING_STEPS, synth, rng, { traveled, driver: 'npc' });
    next = projectWagonDeltas(ticked, next);
    for (const entry of ticked.eventLog) {
      playerLogs.push(`${entry.text} (${next.name})`);
    }
  }

  // 2b. #927 — On non-travel days, run the persona's camp bundle on the
  // synth. Mirrors the player-bot's restWithBundle (#927 slice 2): same
  // bundleCampActions dispatcher, same camp-action apply loop.
  //
  // Sub-rng so camp-action rolls do NOT advance the main NPC tick rng
  // stream. Without this, every rest day for any bundling NPC shifts
  // every downstream system's rng across the whole train — diverging the
  // deterministic outcome of unrelated wagons + the player.
  // Sub-seed: day + wagon name + persona is sufficient to stay
  // deterministic without polluting the main stream.
  if (!traveled) {
    const w = persona.bundleWeights;
    const optsIn = w.survival > 0 || w.food > 0 || w.maintenance > 0
      || w.hygiene > 0 || w.morale > 0;
    if (optsIn) {
      const bundleRng = makeRng(`bundle:${env.day}:${next.name}:${persona.id}`);
      const synth = synthesizeWagonState(next, env);
      try {
        const bundle = bundleCampActions(persona, synth, null, bundleRng);
        if (bundle.campActions.length > 0) {
          let s = synth;
          for (const id of bundle.campActions) {
            const action = CAMP_ACTIONS_BY_ID[id];
            if (!action.availability(s).available) continue;
            s = action.apply(s, bundleRng);
          }
          next = projectWagonDeltas(s, next);
          for (const entry of s.eventLog.slice(synth.eventLog.length)) {
            playerLogs.push(`${entry.text} (${next.name})`);
          }
        }
      } catch {
        // Defensive: race between availability and apply on synth state.
      }
    }
  }

  // POST_BRANCH_STEPS segment — applyNpcMoraleBaseline (npcOnly, travel-gated
  // via scope entry) + applyHolidays. adjustMorale is playerOnly and filtered.
  // #1266 stage2 — holidays and morale-baseline now run via the canonical
  // segment; the standalone 1f/1h blocks are deleted.
  {
    const synth = synthesizeWagonState(next, env);
    const ticked = runSteps(POST_BRANCH_STEPS, synth, rng, { traveled, driver: 'npc' });
    next = projectWagonDeltas(ticked, next);
    for (const entry of ticked.eventLog) {
      playerLogs.push(`${entry.text} (${next.name})`);
    }
  }

  // 1g. #301 — Stray-oxen morning roll on travel days. NPCs share the
  // player's #220 mechanic: rare permanent loss of one ox when oxen
  // wander overnight. Miles multiplier is irrelevant (the train
  // governs distance), so we discard milesMult and only project the
  // ox-state delta + the log line.
  if (traveled) {
    const synth = synthesizeWagonState(next, env);
    const roll = rollStrayMorning(synth, rng);
    if (roll.logLine) playerLogs.push(`${roll.logLine} (${next.name})`);
    if (roll.state !== synth) {
      next = projectWagonDeltas(roll.state, next);
    }
  }

  // TRAVEL_OX_WAGON_STEPS segment — tickOxen + applyOxHydration + tickWagon.
  // On rest days: NPC-local ox fatigue + health recovery (terrain-aware).
  // #1266 stage2 — travel segment replaces standalone ox blocks 5/5a + the
  // tickWagon part of 5b. Storm damage + axle-grease stay below (block 5b
  // tail — see comment there).
  if (traveled) {
    const synth = synthesizeWagonState(next, env);
    let ticked = runSteps(TRAVEL_OX_WAGON_STEPS, synth, rng, { traveled, driver: 'npc' });
    // Axle-grease runs after tickWagon in the player path (same block).
    // Preserve exact ordering: applyAxleGrease still fires here, hanging
    // off the travel segment synth, not a new round-trip.
    if ((ctx.traveledMiles ?? 0) > 0) {
      ticked = applyEngineAxleGrease(ticked, ctx.traveledMiles ?? 0);
    }
    next = projectWagonDeltas(ticked, next);
    for (const entry of ticked.eventLog) {
      playerLogs.push(`${entry.text} (${next.name})`);
    }
  } else {
    // Rest-day ox recovery — NPC-local, not expressible as a segment step
    // because it branches on terrain and uses NPC-specific typed fields.
    const recovery = ctx.terrain === 'desert' || ctx.terrain === 'mountains' ? 5 : 15;
    next = { ...next, oxen: recoverOxenFatigue(next.oxen, recovery) };
    // #963 H1 — passive HP recovery for NPC oxen at low fatigue.
    next = { ...next, oxen: recoverOxenHealth(next.oxen) };
  }

  // 5b tail — Storm damage. NPC-only (player gets storm damage via wagon-decay
  // events). Stays driver code because there's no player-engine equivalent.
  const stormResult = applyNpcStormDamage(next, ctx.weather, rng);
  next = stormResult.wagon;
  if (stormResult.playerLog) playerLogs.push(stormResult.playerLog);

  // #1266 stage3 — PRE_TRAVEL via the spine. applyTrainShare is playerOnly
  // (filtered); the crisis-layby recovery carve (#1046 §13 C) lives in the
  // step itself, keyed off ctx.companyRestMode.
  {
    const synth = synthesizeWagonState(next, env);
    const ticked = runSteps(PRE_TRAVEL_STEPS, synth, rng, { traveled, driver: 'npc', companyRestMode: ctx.companyRestMode });
    next = projectWagonDeltas(ticked, next);
    for (const entry of ticked.eventLog) {
      playerLogs.push(`${entry.text} (${next.name})`);
    }
  }

  // 5c. #939i — NPC event roll via engine event bank (replaces the
  // rollNpcEvent parallel impl). Synthesize a per-wagon GameState,
  // roll from NPC_ELIGIBLE_EVENTS at the per-wagon fire chance, auto-
  // resolve via persona.pickNpcEventChoice → isDefault → first, project
  // deltas back, suffix log entries with the wagon name.
  //
  // #929 — wagon_wheel is handled via persona.pickWheelBreakResponse.
  {
    const synth = synthesizeWagonState(next, env);
    const event = rollEvent(synth, rng, {
      pool: NPC_ELIGIBLE_EVENTS,
      fireChance: NPC_FIRE_CHANCE
    });
    if (event) {
      const personaChoice = event.id === 'wagon_wheel'
        ? persona.pickWheelBreakResponse(synth, rng)
        : persona.pickNpcEventChoice(
            synth, event.id, event.choices.map((c) => c.id), rng
          );
      const fallbackId = event.choices.find((c) => c.isDefault)?.id ?? event.choices[0]?.id;
      const choiceId = personaChoice ?? fallbackId;
      if (choiceId) {
        let ticked: GameState;
        try {
          ticked = resolveEvent(synth, event, choiceId, rng);
        } catch {
          if (!fallbackId) throw new Error(`#939i event ${event.id} has no resolvable choice`);
          ticked = resolveEvent(synth, event, fallbackId, rng);
        }
        // #936b — wagon_stuck `abandon_load` sets `_mudAbandonPending`.
        if (ticked.flags._mudAbandonPending) {
          const order = persona.mudAbandonmentPriority?.();
          ticked = abandonHeavyLoad(ticked, order).state;
          const flags = { ...ticked.flags };
          delete (flags as Record<string, unknown>)._mudAbandonPending;
          ticked = { ...ticked, flags };
        }
        next = projectWagonDeltas(ticked, next);
        for (const entry of ticked.eventLog) {
          playerLogs.push(`${entry.text} (${next.name})`);
        }
      }
    }
  }

  // POST_EVENT_TAIL_STEPS segment — attemptFire (playerOnly, filtered) +
  // applyDehydration + reapDead. Dehydration now runs BEFORE reap
  // (player tail order — adopted reorder).
  // #1266 stage2 — this segment replaces the standalone reap block 6,
  // dehydration block 6b. attemptFire is playerOnly and safely filtered.
  {
    const synth = synthesizeWagonState(next, env);
    const ticked = runSteps(POST_EVENT_TAIL_STEPS, synth, rng, { traveled, driver: 'npc' });
    next = projectWagonDeltas(ticked, next);
    for (const entry of ticked.eventLog) {
      playerLogs.push(`${entry.text} (${next.name})`);
    }
  }

  // 7. NPC auto-cannibalism (#288). When food=0 AND there's a fresh
  // adult corpse, the survivors take the body. Donner Party precedent.
  const cannibalResult = maybeCannibalize(next, ctx, rng);
  next = cannibalResult.wagon;
  if (cannibalResult.playerLog) playerLogs.push(cannibalResult.playerLog);

  // #939m — `updateOutcome` removed: engine `reapDead` (inside
  // POST_EVENT_TAIL_STEPS above) sets `outcome='wiped'` whenever the
  // last member dies, and projection copies `ticked.outcome` back onto
  // the wagon.

  return { wagon: next, playerLogs };
}
