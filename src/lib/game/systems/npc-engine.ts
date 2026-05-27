// #280b Per-wagon engine tick. NPC companion wagons advance through
// a focused subset of the daily systems alongside the player's
// state — they eat, get tired, fall sick, and possibly die.
//
// Scope (this branch):
//   - daily food consumption (own inventory drains)
//   - condition tick (cholera/typhoid/etc. — same dailyHealthDelta math)
//   - ox fatigue accrual on travel days; ox death from overwork
//   - starvation onset when food runs out
//   - death reaping (member.health <= 0 → dead)
//   - outcome update ('wiped' if all party dead; 'in-progress' otherwise)
//
// Out of scope (deferred):
//   - per-wagon weather effects (#280c)
//   - per-wagon dirty-water / disease rolls (#280c — needs water tracking)
//   - bot-driven decisions per wagon (rations, hunt, rest — #280d)
//   - per-wagon events (#280c — wheel breaks, snake bite, etc.)
//
// Why a separate file: existing systems take the full GameState. The
// NPC tick uses the WagonStateLike subset + an EngineContext for
// shared/global state (day, terrain, pace, etc.). Future iterations
// can extract the existing system math into parametric helpers and
// dedupe with this — but for now a focused reimpl keeps the existing
// 1400+ tests stable while NPCs come alive.

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
import { applySpoilage, applyHeatSpoilage } from './spoilage';
import { synthesizeWagonState, projectWagonDeltas, type TrainEnv } from './wagon-synth';
import { applySabbathTravelDebit } from './sabbath-travel';
import { applyHolidays } from './holidays';
import { rollStrayMorning } from './strays';
import { applyNpcMoraleBaseline } from './npc-morale';
import { applyDailyRecovery } from './travel-recovery';
import { applyDailyConsumption, applyDirtyWaterRisk } from './consumption';
import { applyEggLay } from './eggs';
import { applyDairy, applyButterChurn } from './dairy';
import { applyDietVariety, applyHotDrinks } from './diet';
import { applyPastryQuality } from './pastry';
import { progressConditions } from './conditions';
import { applyStarvation as applyEngineStarvation } from './starvation';
import { tickOxen as tickEngineOxen, recoverOxenFatigue, recoverOxenHealth } from './oxen';
import { tickWagon as tickEngineWagon, applyAxleGrease as applyEngineAxleGrease } from './wagon';
import { applyDehydration as applyEngineDehydration } from './dehydration';
import { reapDead as reapDeadEngine } from './death';
import {
  applyCannibalize,
  findFreshUnconsumedCorpse,
  hasFoodOnHand
} from './cannibal';
import { rollDailyTheft, abandonHeavyLoad } from './item-loss';
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

  // 1. Conditions tick + treatment.
  // #939d — engine `progressConditions` via synth/project. NPC parallel
  // impl was missing `resolvedByItems` auto-clear (e.g. scurvy ↔
  // dried_fruit) and `dailyMoraleDelta` (some conditions debit morale
  // daily). Engine version covers both.
  {
    const synth = synthesizeWagonState(next, env);
    const ticked = progressConditions(synth, rng);
    next = projectWagonDeltas(ticked, next);
    for (const entry of ticked.eventLog) {
      playerLogs.push(`${entry.text} (${next.name})`);
    }
  }

  // 1b. #295 — spoilage. Runs BEFORE food consumption (mirrors the
  // player path) so a rotten pile can't be eaten on its spoil day.
  // Game meat / eggs / berries / milk rot off their per-pile clock;
  // bacon + salt_pork take heat attrition (with bran-barrel mitigation
  // matching the player's mechanic).
  // #939b — unified tick: invoke the engine's applySpoilage +
  // applyHeatSpoilage on a synthesized GameState. Wagon-synth packs
  // wagon.spoilDays into flags._{x}SpoilDay; the engine reads/writes
  // those, then we project the deltas back. Engine eventLog entries
  // get name-suffixed and forwarded to player news so the player
  // still sees "(Sager family)" attribution.
  {
    const synth = synthesizeWagonState(next, env);
    let tickedSpoil = applySpoilage(synth);
    tickedSpoil = applyHeatSpoilage(tickedSpoil);
    next = projectWagonDeltas(tickedSpoil, next);
    for (const entry of tickedSpoil.eventLog) {
      playerLogs.push(`${entry.text} (${next.name})`);
    }
  }

  // 1c. #895 — persona-driven rations decision. Each NPC wagon carries
  // a `personaId` (set at gen from `profile.personaVariantHint`, or
  // 'balanced' for fillers). #921r widened the shim: aggressive's
  // pickRations now also reads party HP (eat normal only while a
  // member is recovering) on top of `state.inventory`, so `party` is
  // threaded through too — keeps #298 NPC parity (an NPC aggressive
  // wagon self-rations the same way the player-bot does).
  const persona = getPersona(next.personaId ?? 'balanced');
  const fauxState = { inventory: next.inventory, party: next.party } as unknown as GameState;
  next = { ...next, rations: persona.pickRations(fauxState, rng) };

  // 1d. #937 — persona-driven voluntary rest. On a travel day, if the
  // persona's shouldRest fires (Sunday, worn HP, low morale, worn ox
  // team), the NPC takes it easier within the train: ox fatigue
  // recovers instead of accruing, wagon decay + axle grease skipped.
  // Player-bot uses `shouldRest` to call the engine rest action; NPC
  // can't lag the train, but it can conserve. Period reality: emigrant
  // companies that pushed through Sundays were the outliers (Reed);
  // most rested when the captain's "tireder than you" call came in.
  let traveled = ctx.traveled;
  // #1046 C2 — in a captained train the company's daily decision
  // governs travel/rest coherently for all wagons; skip the
  // per-persona #937 voluntary-rest gate. Solo wagons (no
  // companyRestMode) keep #937 behavior unchanged.
  if (traveled && ctx.companyRestMode === undefined) {
    const restFauxState = {
      date: ctx.date ?? { year: 1849, month: 1, day: 2 }, // Monday — keeps Sunday-rest false when ctx.date absent
      party: next.party,
      morale: next.morale,
      oxen: next.oxen
    } as unknown as GameState;
    if (persona.shouldRest(restFauxState, rng)) {
      traveled = false;
    }
  }

  // 1e. #301 — Sabbath-travel morale debit on the NPC's synth. Mirrors
  // the player's engine-pausable hook (also factored into
  // applySabbathTravelDebit). -2 on Sunday travel, -3 with a live
  // Preacher. companyMode=='sabbath_layby' already flipped `traveled`
  // to false above, so this naturally skips lay-by days.
  {
    const synth = synthesizeWagonState(next, env);
    const ticked = applySabbathTravelDebit(synth, traveled);
    next = projectWagonDeltas(ticked, next);
    for (const entry of ticked.eventLog) {
      playerLogs.push(`${entry.text} (${next.name})`);
    }
  }

  // 1f. #301 — Holiday morale bumps on the NPC's synth (July 4 + Xmas).
  // applyHolidays is idempotent within a year via per-wagon flags
  // (_july4Year / _christmasYear), which the synth carries through
  // npcFlagsFromWagon / projectWagonDeltas — each wagon gets the
  // bump exactly once per holiday per calendar year.
  {
    const synth = synthesizeWagonState(next, env);
    const ticked = applyHolidays(synth);
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
    // Only project when ox state changed (permanent loss branch).
    if (roll.state !== synth) {
      next = projectWagonDeltas(roll.state, next);
    }
  }

  // 1h. #301 — Daily morale baseline drift on travel days only. Small
  // homeostasis pull toward 50 + alive-ratio nudge + preacher/hunter
  // profession bonuses. Keeps NPC morale from staying frozen between
  // events. Gated on `traveled` so a long lay-by stretch doesn't
  // cascade into earlier dissent than today's behavior — the player's
  // adjustMorale also runs only when the daily systems pipeline does,
  // and that's traveled-coupled in practice.
  if (traveled) {
    const synth = synthesizeWagonState(next, env);
    const ticked = applyNpcMoraleBaseline(synth);
    next = projectWagonDeltas(ticked, next);
  }

  // 2 + 3. #939c — Food + water + pastry + diet + hot-drinks + dirty-
  // water risk all run through the engine pipeline on a synthesized
  // GameState. Engine `applyDailyConsumption` drains BOTH food AND
  // water (clean + dirty) and sets `_pastryDrawnLb` / `_lastFoodGroups`
  // / `_lastDirtyWaterDrawn` flags for the downstream systems.
  //
  // Bonus: NPCs now gain `applyDietVariety` (+1 morale on multi-group
  // days) and `applyHotDrinks` (coffee/tea bonus) that the parallel
  // impl was missing.
  const eatersAlive = next.party.filter((m) => !m.dead).length;
  if (eatersAlive > 0) {
    const synth = synthesizeWagonState(next, env);
    // #297 — producer ticks run BEFORE consumption so today's egg lay
    // / milk yield lands in inventory before the family eats it.
    // Mirrors engine-pausable.ts ordering. No-ops when the wagon
    // doesn't carry chickens / cows / butter_crock.
    let producerSynth = applyEggLay(synth);
    producerSynth = applyDairy(producerSynth);
    producerSynth = applyButterChurn(producerSynth);
    let ticked = applyDailyConsumption(producerSynth);
    ticked = applyDietVariety(ticked);
    ticked = applyHotDrinks(ticked);
    ticked = applyPastryQuality(ticked, rng).state;
    ticked = applyDirtyWaterRisk(ticked, rng);
    // #939f — engine starvation chained into the consumption synth so
    // `_lastFoodShortfall` (set by applyDailyConsumption) is fresh.
    // Accumulating `_starvationDays` counter bridges via wagon-synth
    // (#941 + this slice's starvationDays addition).
    ticked = applyEngineStarvation(ticked);
    next = projectWagonDeltas(ticked, next);
    for (const entry of ticked.eventLog) {
      playerLogs.push(`${entry.text} (${next.name})`);
    }
  }

  // 2b. #927 — On non-travel days, run the persona's camp bundle on the
  // synth. Mirrors the player-bot's restWithBundle (#927 slice 2): same
  // bundleCampActions dispatcher, same camp-action apply loop.
  //
  // Slice-3 opt-in gate is WEIGHTS-ONLY (overrides ignored on NPC
  // engine). Player-bot still honours faithful's override for its
  // slice-2 gain; NPC engine sees overrides as inert until per-persona
  // tuning (#927c) ships safe NPC weights. Currently no default persona
  // has non-zero weights, so NPC bundling is wired-but-inert at master
  // parity.
  if (!traveled) {
    const w = persona.bundleWeights;
    const optsIn = w.survival > 0 || w.food > 0 || w.maintenance > 0
      || w.hygiene > 0 || w.morale > 0;
    if (optsIn) {
      // Use a derived sub-rng so camp-action rolls (find_water yield,
      // gather_firewood amount, etc.) do NOT advance the main NPC tick
      // rng stream. Without this, every rest day for any bundling NPC
      // shifts every downstream system's rng across the whole train —
      // diverging the deterministic outcome of unrelated wagons + the
      // player. Sub-seed: day + wagon name + persona is sufficient to
      // stay deterministic without polluting the main stream.
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
        // Keep wagon unchanged.
      }
    }
  }

  // 3b. #1046 A+D parity — governance-agnostic daily recovery on the synth,
  // keyed on the NPC's resolved travel flag (already accounts for C2's
  // companyRestMode + #937 solo voluntary rest). D's natural-course
  // resolve already rode the step-1 progressConditions synth; this wires
  // A (convalesce on travel / rest-heal on lay-by) at parity. Synth
  // carries party/inventory/resources.water/morale/env.pace — every
  // field applyDailyRecovery reads (the #921r missing-field lesson).
  // #1046 — runs AFTER consumption (mirrors the player's
  // progressConditions → applyDailyConsumption → applyDailyRecovery
  // order at engine-pausable.ts:128/156/221) so a sick NPC convalesces
  // off post-consumption food/water/morale identically to the player.
  {
    const synth = synthesizeWagonState(next, env);
    // #1046 §13 (C) — crisis NPC-heal carve-out. In a company
    // crisis_layby, NPC wagons take NO lay-by rest-heal (exact master
    // parity: pre-A+D there was no lay-by heal, so fatally-hit wagons
    // died & reaped & cleared the aggregate). A+D's +8 otherwise keeps
    // them undead → permanent crisis lock. Travel + maintenance/Sabbath
    // lay-bys keep the full §8 A+D parity heal; only crisis is carved.
    if (ctx.companyRestMode !== 'crisis_layby') {
      const recovered = applyDailyRecovery(synth, traveled);
      next = projectWagonDeltas(recovered, next);
    }
  }

  // 5. Ox tick — fatigue on travel, recovery on rest.
  // #937 — `traveled` may be flipped to false above by persona.shouldRest.
  // #939g — engine `tickOxen` for travel days (gets teamster / shoeless
  // / mule-grain / grazing math the NPC parallel never had);
  // `recoverOxenFatigue` for rest days (terrain-aware amount).
  if (traveled) {
    const synth = synthesizeWagonState(next, env);
    const ticked = tickEngineOxen(synth, rng);
    next = projectWagonDeltas(ticked, next);
    for (const entry of ticked.eventLog) {
      playerLogs.push(`${entry.text} (${next.name})`);
    }
  } else {
    const recovery = ctx.terrain === 'desert' || ctx.terrain === 'mountains' ? 5 : 15;
    next = { ...next, oxen: recoverOxenFatigue(next.oxen, recovery) };
    // #963 H1 — passive HP recovery for NPC oxen at low fatigue, same
    // rules as the player path. Without this, NPC ox HP only ever drops.
    next = { ...next, oxen: recoverOxenHealth(next.oxen) };
  }

  // 5b. #300 — wagon condition decay + axle grease.
  // #939h — unified via engine tickWagon + applyAxleGrease. NPCs gain
  // the carpenter decay mult (CARPENTER_DECAY_MULT) the parallel impl
  // didn't have. greaseMiles round-trips via flags bridge (#941).
  // Storm damage stays NPC-only (no player-engine equivalent — player
  // takes storm damage via the wagon-decay events, not a daily tick).
  if (traveled) {
    const synth = synthesizeWagonState(next, env);
    let ticked = tickEngineWagon(synth, rng);
    if ((ctx.traveledMiles ?? 0) > 0) {
      ticked = applyEngineAxleGrease(ticked, ctx.traveledMiles ?? 0);
    }
    next = projectWagonDeltas(ticked, next);
    for (const entry of ticked.eventLog) {
      playerLogs.push(`${entry.text} (${next.name})`);
    }
  }
  const stormResult = applyNpcStormDamage(next, ctx.weather, rng);
  next = stormResult.wagon;
  if (stormResult.playerLog) playerLogs.push(stormResult.playerLog);

  // 5c. #939i — NPC event roll via engine event bank (replaces the
  // rollNpcEvent parallel impl). Synthesize a per-wagon GameState,
  // roll from NPC_ELIGIBLE_EVENTS at the per-wagon fire chance, auto-
  // resolve via persona.pickNpcEventChoice → isDefault → first, project
  // deltas back, suffix log entries with the wagon name.
  {
    const synth = synthesizeWagonState(next, env);
    const event = rollEvent(synth, rng, {
      pool: NPC_ELIGIBLE_EVENTS,
      fireChance: NPC_FIRE_CHANCE
    });
    if (event) {
      const personaChoice = persona.pickNpcEventChoice(
        synth, event.id, event.choices.map((c) => c.id), rng
      );
      const fallbackId = event.choices.find((c) => c.isDefault)?.id ?? event.choices[0]?.id;
      const choiceId = personaChoice ?? fallbackId;
      if (choiceId) {
        let ticked: GameState;
        try {
          ticked = resolveEvent(synth, event, choiceId, rng);
        } catch {
          // pickNpcEventChoice returned an unknown id — fall back.
          if (!fallbackId) throw new Error(`#939i event ${event.id} has no resolvable choice`);
          ticked = resolveEvent(synth, event, fallbackId, rng);
        }
        // #936b — wagon_stuck `abandon_load` sets `_mudAbandonPending`
        // (the player gets a modal). NPC wagons have no modal: resolve
        // it immediately via the persona's own drop order (#298 train
        // parity — each wagon sheds by its captain's character).
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

  // 6. Death reaping (catches event-induced deaths too — e.g. an ox
  // kick to a child after `member_injury` fired earlier this tick).
  // #939m — engine `reapDead` via synth/project. Sets deathCause from
  // worst condition (or "Exposure" fallback), hits −8 morale per dead
  // child immediately, and sets `outcome='wiped'` if every member is
  // dead — folding what the local `updateOutcome` parallel impl did.
  {
    const synth = synthesizeWagonState(next, env);
    const ticked = reapDeadEngine(synth, rng);
    next = projectWagonDeltas(ticked, next);
    for (const entry of ticked.eventLog) {
      playerLogs.push(`${entry.text} (${next.name})`);
    }
  }

  // 6b. Dehydration HP/morale damage when keg=0 at end of tick (#303e).
  // #939k — engine `applyDehydration` via synth/project. Terrain
  // multiplier is read from `state.location.terrain` against
  // dehydration.ts TERRAIN_MULT table; flag bridge for
  // `_dehydrationDays` from #941. Engine version has the same desert
  // 1.5× / forest 0.85× shape the parallel impl used.
  {
    const synth = synthesizeWagonState(next, env);
    const ticked = applyEngineDehydration(synth);
    next = projectWagonDeltas(ticked, next);
    for (const entry of ticked.eventLog) {
      playerLogs.push(`${entry.text} (${next.name})`);
    }
  }

  // 7. NPC auto-cannibalism (#288). When food=0 AND there's a fresh
  // adult corpse, the survivors take the body. Donner Party precedent.
  // Silent for the wagon (no player choice — they're NPCs); a grim
  // log line surfaces to the player.
  const cannibalResult = maybeCannibalize(next, ctx, rng);
  next = cannibalResult.wagon;
  if (cannibalResult.playerLog) playerLogs.push(cannibalResult.playerLog);

  // 7b. Daily theft (#306 phase 2 NPC parity).
  // #939k — engine `rollDailyTheft` via synth/project. Reads
  // `state.wagonTrain` for share-watch halving (already 0.0025/day
  // when in a train — and the SYNTH_TRAIN_STUB always provides one).
  {
    const synth = synthesizeWagonState(next, env);
    const result = rollDailyTheft(synth, rng);
    next = projectWagonDeltas(result.state, next);
    for (const entry of result.state.eventLog) {
      playerLogs.push(`${entry.text} (${next.name})`);
    }
  }

  // #939m — `updateOutcome` removed: engine `reapDead` above sets
  // `outcome='wiped'` whenever the last member dies, and projection
  // copies `ticked.outcome` back onto the wagon.

  return { wagon: next, playerLogs };
}
