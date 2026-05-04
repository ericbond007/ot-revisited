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
  NpcWagonState,
  Outcome,
  Pace,
  PartyMember,
  Terrain,
  Weather
} from '../types';
import { getCondition } from '../content/conditions';
import { applyNpcSpoilage, applyNpcHeatSpoilage } from './spoilage';
import { hasLive } from '../professions/predicates';
import { rollNpcEvent } from './npc-events';
import {
  applyNpcWaterDrain,
  applyNpcDehydration,
  applyNpcDirtyWaterRisk
} from './npc-water';
import { rollNpcTheft } from './item-loss';

/** Inputs the NPC tick needs from the train's shared environment. */
export interface NpcTickContext {
  /** Today's day number (for log entries). */
  day: number;
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
}

// Per-rations daily food draw (lb/eater/day). Matches the player's
// consumption math in `applyDailyConsumption` at a coarse level. Real
// engine adds diet-variety, hunt-haul priority, etc.; #280b is the
// minimum viable drain to cause attrition over time.
const RATIONS_LB_PER_EATER: Record<NpcWagonState['rations'], number> = {
  meager: 1.5,
  normal: 2.5,
  filling: 3.5
};

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

// Doctor profession dampens condition damage 30%, same as player path
// (engine #154). Mirror the constant locally — keeping this dependency
// explicit makes the future system-extraction obvious.
const DOCTOR_RELIEF_MULT = 0.7;

// Treatment item halves daily condition damage + 25% chance to clear.
// Mirrors `progressConditions` for the player.
const TREATMENT_DAMAGE_MULT = 0.5;
const TREATMENT_CURE_CHANCE = 0.25;

// Starvation drain — when food=0, every alive party member loses HP
// at this rate per day. Modest at first (2 days you can sleep through);
// after multiple days the cumulative drop kills the wagon.
const STARVATION_HP_PER_DAY = 4;

function consumeFood(
  inventory: Record<string, number>,
  drawLb: number
): { inventory: Record<string, number>; ate: number; pastryDrawn: number } {
  const next = { ...inventory };
  let remaining = drawLb;
  let pastryDrawn = 0;
  for (const id of FOOD_DRAW_ORDER) {
    if (remaining <= 0) break;
    const have = next[id] ?? 0;
    if (have <= 0) continue;
    const take = Math.min(have, remaining);
    next[id] = have - take;
    remaining -= take;
    if (id === 'flour' || id === 'cornmeal') pastryDrawn += take;
  }
  return { inventory: next, ate: drawLb - remaining, pastryDrawn };
}

/** #304 + #305 — NPC pastry quality. Mirrors player applyPastryQuality:
 *  no cookware → -2 morale "ate paste again"; no saleratus → -1
 *  morale "biscuits sat heavy"; both present → 0 modifier + small
 *  saleratus consumption. Period rates match the player path. */
function applyNpcPastryQuality(
  wagon: NpcWagonState,
  pastryDrawn: number,
  day: number
): NpcWagonState {
  if (pastryDrawn <= 0) return wagon;
  const inv = wagon.inventory;
  const hasCookware = (inv.cookware ?? 0) > 0;
  const saleratusOnHand = inv.saleratus ?? 0;
  if (!hasCookware) {
    return {
      ...wagon,
      morale: Math.max(0, wagon.morale - 2),
      eventLog: [
        ...wagon.eventLog,
        { day, text: `${wagon.name} has no cookware — ate paste again. Morale −2.` }
      ]
    };
  }
  if (saleratusOnHand <= 0) {
    return {
      ...wagon,
      morale: Math.max(0, wagon.morale - 1),
      eventLog: [
        ...wagon.eventLog,
        { day, text: `${wagon.name} ran out of saleratus — biscuits sat heavy. Morale −1.` }
      ]
    };
  }
  const consumed = Math.max(0.01, pastryDrawn * 0.005);
  const remaining = Math.max(0, saleratusOnHand - consumed);
  return { ...wagon, inventory: { ...inv, saleratus: remaining } };
}

function npcHasLiveDoctor(wagon: NpcWagonState): boolean {
  return hasLive(wagon, 'doctor');
}

function tickConditions(wagon: NpcWagonState, rng: Rng): NpcWagonState {
  const reliefMult = npcHasLiveDoctor(wagon) ? DOCTOR_RELIEF_MULT : 1.0;
  const inventory: Record<string, number> = { ...wagon.inventory };
  const party: PartyMember[] = wagon.party.map((m) => {
    if (m.dead) return m;
    let healthDelta = 0;
    const nextConditions: typeof m.conditions = [];
    for (const c of m.conditions) {
      const meta = getCondition(c.id);
      // Treatment item — halves damage + 25% cure roll.
      const treatment = (meta.treatmentItems ?? []).find(
        (id) => (inventory[id] ?? 0) > 0
      );
      if (treatment) {
        inventory[treatment] = (inventory[treatment] ?? 0) - 1;
        if (rng.chance(TREATMENT_CURE_CHANCE)) {
          continue; // condition cleared
        }
        healthDelta += meta.dailyHealthDelta * reliefMult * TREATMENT_DAMAGE_MULT;
      } else {
        healthDelta += meta.dailyHealthDelta * reliefMult;
      }
      nextConditions.push({ ...c, daysSinceOnset: c.daysSinceOnset + 1 });
    }
    const health = Math.max(0, Math.min(100, m.health + Math.round(healthDelta)));
    return { ...m, health, conditions: nextConditions };
  });
  return { ...wagon, party, inventory };
}

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

function applyStarvation(wagon: NpcWagonState): NpcWagonState {
  // Counts every food item in FOOD_DRAW_ORDER + grain (ox feed
  // doesn't count as people food, but if everything else is zero
  // they're starving regardless).
  const food = FOOD_DRAW_ORDER.reduce(
    (sum, id) => sum + (wagon.inventory[id] ?? 0),
    0
  );
  if (food > 0) return wagon;
  const party = wagon.party.map((m) => {
    if (m.dead) return m;
    return { ...m, health: Math.max(0, m.health - STARVATION_HP_PER_DAY) };
  });
  // Starvation also crushes morale — the wagon's people stop
  // believing the captain knows what he's doing. Drives the
  // departure rolls in #290.
  return { ...wagon, party, morale: Math.max(0, wagon.morale - 3) };
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
  next = tickConditions(next, rng);

  // 1b. #295 — spoilage. Runs BEFORE food consumption (mirrors the
  // player path) so a rotten pile can't be eaten on its spoil day.
  // Game meat / eggs / berries / milk rot off their per-pile clock;
  // bacon + salt_pork take heat attrition (with bran-barrel mitigation
  // matching the player's mechanic).
  const spoil = applyNpcSpoilage(next, ctx.day);
  next = spoil.wagon;
  for (const log of spoil.logs) playerLogs.push(log);
  const heatSpoil = applyNpcHeatSpoilage(next, ctx.weather);
  next = heatSpoil.wagon;
  if (heatSpoil.log) playerLogs.push(heatSpoil.log);

  // 2. Food consumption.
  const eaters = next.party.filter((m) => !m.dead).length;
  if (eaters > 0) {
    const drawLb = eaters * RATIONS_LB_PER_EATER[next.rations];
    const result = consumeFood(next.inventory, drawLb);
    next = { ...next, inventory: result.inventory };
    // 2b. Pastry quality (#304 + #305) — saleratus + cookware check
    // when flour or cornmeal was drawn. Period: dense biscuits ate
    // morale even when they were filling.
    next = applyNpcPastryQuality(next, result.pastryDrawn, ctx.day);
  }

  // 3. Water consumption (#303e). Clean drained first, then dirty.
  // Dirty draw triggers a per-adult dysentery / cholera roll —
  // mirrors player applyDirtyWaterRisk, doctor halves the chance.
  const waterResult = applyNpcWaterDrain(next, ctx.weather);
  next = waterResult.wagon;
  next = applyNpcDirtyWaterRisk(next, waterResult.dirtyDrawn, rng, ctx.day);

  // 4. Starvation if food=0.
  next = applyStarvation(next);

  // 5. Ox tick — fatigue on travel, recovery on rest.
  next = ctx.traveled ? tickOxenTravel(next, ctx) : tickOxenRest(next, ctx);

  // 5. NPC event roll (#280c). May damage wagon, sicken a member,
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
