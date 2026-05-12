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
import type {
  GameDate,
  GameState,
  Location,
  NpcWagonState,
  Outcome,
  Pace,
  PartyMember,
  Terrain,
  Weather
} from '../types';
import { getPersona } from '../ai/personas';
import { applySpoilage, applyHeatSpoilage } from './spoilage';
import { synthesizeWagonState, projectWagonDeltas, type TrainEnv } from './wagon-synth';
import { applyDailyConsumption, applyDirtyWaterRisk } from './consumption';
import { applyDietVariety, applyHotDrinks } from './diet';
import { applyPastryQuality } from './pastry';
import { progressConditions } from './conditions';
import { applyStarvation as applyEngineStarvation } from './starvation';
import { hasLive } from '../professions/predicates';
import { rollNpcEvent } from './npc-events';
import { applyNpcDehydration } from './npc-water';
import { rollNpcTheft } from './item-loss';
import { applyNpcWagonDecay, applyNpcAxleGrease, applyNpcStormDamage } from './wagon';

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

// Food draw priority — game meat first (spoils), then staples.
const FOOD_DRAW_ORDER = [
  'game_meat', 'berries', 'egg', 'milk',
  'jerky', 'pemmican', 'salt_pork', 'bacon',
  'flour', 'cornmeal', 'beans', 'hardtack',
  'dried_fruit', 'cheese', 'butter'
];

// Fatigue accrual per pace. Same shape as engine's
// FATIGUE_PER_DAY_BY_PACE in systems/oxen.ts.
const NPC_FATIGUE_PER_DAY: Record<Pace, number> = {
  slow: 2,
  moderate: 4,
  fast: 6,
  grueling: 9
};

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

function tickOxenTravel(wagon: NpcWagonState, ctx: NpcTickContext): NpcWagonState {
  const fatigueAdd = NPC_FATIGUE_PER_DAY[ctx.pace];
  const oxen = wagon.oxen.map((o) => {
    if (o.health <= 0) return o;
    const fatigue = Math.min(100, o.fatigue + fatigueAdd);
    // Overwork: at 100 fatigue, lose ~3 HP/day. Compounds → death.
    const healthDrain = fatigue >= 100 ? 3 : 0;
    const health = Math.max(0, o.health - healthDrain);
    return { ...o, fatigue, health };
  });
  return { ...wagon, oxen };
}

function tickOxenRest(wagon: NpcWagonState, ctx: NpcTickContext): NpcWagonState {
  // Recovery on rest/camp days. Terrain modulates: prairie grazing
  // recovers fast (15/day), mountains/desert slowly (5/day).
  const recovery = ctx.terrain === 'desert' || ctx.terrain === 'mountains' ? 5 : 15;
  const oxen = wagon.oxen.map((o) => {
    if (o.health <= 0) return o;
    return { ...o, fatigue: Math.max(0, o.fatigue - recovery) };
  });
  return { ...wagon, oxen };
}

function reapDead(wagon: NpcWagonState, day: number): NpcWagonState {
  let logged: string[] = [];
  const party = wagon.party.map((m) => {
    if (m.dead) return m;
    if (m.health > 0) return m;
    logged.push(m.name);
    return { ...m, dead: true, deathDay: day, deathCause: 'attrition' };
  });
  if (logged.length === 0) return wagon;
  const log = logged.map(
    (name) => ({ day, text: `${name} died — the trail took them.` })
  );
  return {
    ...wagon,
    party,
    eventLog: [...wagon.eventLog, ...log]
  };
}

// #288 — NPC auto-cannibalism. Period reality: Donner Party survivors
// did this without consultation when food=0 and a fresh body was
// available. NPCs don't get a player choice — the bot decides — so
// when both conditions hold we silently mark a recent corpse consumed
// and add fresh meat to the wagon. The grim flavor surfaces as a
// player-visible log line so the player feels the tonal shift.
//
// Adult corpse → 50 lb game meat. Child corpse → 25 lb (smaller
// frame). Children are eligible only when their death cause was
// starvation — period diaries (Sager 1844, Donner 1846) confirm
// survivors did consume children's bodies but only when they too
// had starved; never an injury or disease death.
const NPC_CANNIBAL_ADULT_MEAT_LBS = 50;
const NPC_CANNIBAL_CHILD_MEAT_LBS = 25;
const NPC_CANNIBAL_FRESHNESS_DAYS = 5;

function isCannibalEligible(m: PartyMember, day: number): boolean {
  if (!m.dead || m.consumed) return false;
  if (typeof m.deathDay !== 'number') return false;
  if (day - m.deathDay > NPC_CANNIBAL_FRESHNESS_DAYS) return false;
  // Adults: any death cause. Children: only starvation.
  if (m.kind === 'adult') return true;
  if (m.kind === 'child') {
    return m.deathCause === 'starvation' || m.deathCause === 'attrition';
  }
  return false;
}

function maybeCannibalize(
  wagon: NpcWagonState,
  day: number
): { wagon: NpcWagonState; playerLog?: string } {
  // Only when wagon is starving (no food at all).
  const food = FOOD_DRAW_ORDER.reduce(
    (sum, id) => sum + (wagon.inventory[id] ?? 0),
    0
  );
  if (food > 0) return { wagon };
  const corpses = wagon.party.filter((m) => isCannibalEligible(m, day));
  if (corpses.length === 0) return { wagon };
  // #907 — persona-driven moral gate. Default true (Donner reality);
  // faithful overrides to refuse. shouldCannibalize reads no state on
  // any current impl; widen the shim if a future override needs it.
  const persona = getPersona(wagon.personaId ?? 'balanced');
  if (!persona.shouldCannibalize({} as GameState)) return { wagon };
  const corpse = [...corpses].sort(
    (a, b) => (b.deathDay ?? 0) - (a.deathDay ?? 0)
  )[0];
  const meatLbs = corpse.kind === 'child' ? NPC_CANNIBAL_CHILD_MEAT_LBS : NPC_CANNIBAL_ADULT_MEAT_LBS;
  // Child cannibalism is more devastating to morale than adult.
  const moraleHit = corpse.kind === 'child' ? 25 : 15;
  const next: NpcWagonState = {
    ...wagon,
    party: wagon.party.map((m) =>
      m.id === corpse.id ? { ...m, consumed: true } : m
    ),
    inventory: {
      ...wagon.inventory,
      game_meat: (wagon.inventory.game_meat ?? 0) + meatLbs
    },
    morale: Math.max(0, wagon.morale - moraleHit),
    eventLog: [
      ...wagon.eventLog,
      {
        day,
        text: `Took ${corpse.name}'s body for meat. Nobody spoke. Morale −${moraleHit}.`
      }
    ]
  };
  return {
    wagon: next,
    playerLog: `${wagon.name} is reduced to eating their own dead — ${corpse.name}'s body fed them.`
  };
}

function updateOutcome(wagon: NpcWagonState): NpcWagonState {
  // Per-wagon wipe condition: every party member dead.
  const allDead = wagon.party.every((m) => m.dead);
  if (allDead && wagon.outcome === 'in-progress') {
    return { ...wagon, outcome: 'wiped' as Outcome };
  }
  return wagon;
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
 *  cholera, etc.), then death reaping, then outcome update. */
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

  // 1. Conditions tick + treatment.
  // #939d — engine `progressConditions` via synth/project. NPC parallel
  // impl was missing `resolvedByItems` auto-clear (e.g. scurvy ↔
  // dried_fruit) and `dailyMoraleDelta` (some conditions debit morale
  // daily). Engine version covers both.
  {
    const env = trainEnv(ctx);
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
  const env = trainEnv(ctx);
  const synth = synthesizeWagonState(next, env);
  let tickedSpoil = applySpoilage(synth);
  tickedSpoil = applyHeatSpoilage(tickedSpoil);
  next = projectWagonDeltas(tickedSpoil, next);
  for (const entry of tickedSpoil.eventLog) {
    playerLogs.push(`${entry.text} (${next.name})`);
  }

  // 1c. #895 — persona-driven rations decision. Each NPC wagon carries
  // a `personaId` (set at gen from `profile.personaVariantHint`, or
  // 'balanced' for fillers). Persona reads only `state.inventory` for
  // pickRations today, so the shim below is sufficient — widen it if a
  // future override touches other state.
  const persona = getPersona(next.personaId ?? 'balanced');
  const fauxState = { inventory: next.inventory } as unknown as GameState;
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
  if (traveled) {
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
    const env = trainEnv(ctx);
    const synth = synthesizeWagonState(next, env);
    let ticked = applyDailyConsumption(synth);
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

  // 5. Ox tick — fatigue on travel, recovery on rest.
  // #937 — `traveled` may be flipped to false above by persona.shouldRest.
  const effectiveCtx = traveled === ctx.traveled ? ctx : { ...ctx, traveled };
  next = traveled ? tickOxenTravel(next, effectiveCtx) : tickOxenRest(next, effectiveCtx);

  // 5b. #300 — NPC wagon condition decay (parity with player tickWagon).
  // Travel days only; pace × terrain × tar-bucket-mult formula. The
  // axle-grease cycle consumes one tar_bucket per 500 mi (mirrors
  // player's applyAxleGrease). Storm-day weather adds 1-3 wagon damage
  // on top — same shape as the player's weather.ts storm branch.
  next = applyNpcWagonDecay(next, effectiveCtx);
  if (traveled && (ctx.traveledMiles ?? 0) > 0) {
    const greaseResult = applyNpcAxleGrease(next, ctx.traveledMiles ?? 0);
    next = greaseResult.wagon;
    if (greaseResult.playerLog) playerLogs.push(greaseResult.playerLog);
  }
  const stormResult = applyNpcStormDamage(next, ctx.weather, rng);
  next = stormResult.wagon;
  if (stormResult.playerLog) playerLogs.push(stormResult.playerLog);

  // 5c. NPC event roll (#280c). May damage wagon, sicken a member,
  // kill an ox, etc. Result bubbles up as a player news entry.
  const eventResult = rollNpcEvent(next, ctx, rng);
  if (eventResult) {
    next = eventResult.wagon;
    if (eventResult.playerLog) playerLogs.push(eventResult.playerLog);
  }

  // 6. Death reaping (catches event-induced deaths too — e.g. an ox
  // kick to a child after `member_injury` fired earlier this tick).
  next = reapDead(next, ctx.day);

  // 6b. Dehydration HP/morale damage when keg=0 at end of tick (#303e).
  // After reap so already-dead members don't take extra damage.
  // Terrain mult: desert 1.5, forest 0.85, others 1.0 — mirrors player
  // applyDehydration TERRAIN_MULT.
  const terrainDryMult = ctx.terrain === 'desert' ? 1.5
    : ctx.terrain === 'forest' ? 0.85
    : 1.0;
  next = applyNpcDehydration(next, terrainDryMult, ctx.day);

  // 7. NPC auto-cannibalism (#288). When food=0 AND there's a fresh
  // adult corpse, the survivors take the body. Donner Party precedent.
  // Silent for the wagon (no player choice — they're NPCs); a grim
  // log line surfaces to the player.
  const cannibalResult = maybeCannibalize(next, ctx.day);
  next = cannibalResult.wagon;
  if (cannibalResult.playerLog) playerLogs.push(cannibalResult.playerLog);

  // 7b. Daily theft (#306 phase 2 NPC parity). Period: Bryant 1846
  // documents overnight theft hitting whole companies. Same rate as
  // player + train share-watch halving — already 0.0025/day baked in
  // since NPCs are always in the player's train when ticking.
  const theftResult = rollNpcTheft(next, rng, ctx.day);
  next = theftResult.wagon;
  if (theftResult.playerLog) playerLogs.push(theftResult.playerLog);

  // 8. Outcome.
  next = updateOutcome(next);

  return { wagon: next, playerLogs };
}
