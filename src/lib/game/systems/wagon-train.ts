// #176 Wagon-train predicates + actions. Engine-side helpers used by
// repair pricing, pace clamping, night events, and the bot persona.
//
// The "in train" state is held on `state.wagonTrain` (see `types.ts`).
// All side-effects route through `joinTrain` / `leaveTrain` actions —
// callers should never mutate the train state directly.

import type { GameState, NpcWagonState, Ox, Pace, WagonTrain } from '../types';
import { companyPaceCap } from '../ai/schedule';
import type { Rng } from '../rng';
import { generateTrain, trainHasProfession } from '../content/trains';
import { hasLiveBlacksmith } from '../professions/predicates';
import { tickNpcWagon, type NpcTickContext } from './npc-engine';
import { makeRng } from '../rng';
import type { GameEvent } from '../content/events';
import { buildStarvationCrisisEvent } from './npc-crisis-events';
import { processDepartures } from './npc-departures';
// #915 — barter fallback for NPC restock when cash runs short.
import { quoteBarter } from './barter';
import {
  pickFoodRestock,
  pickWarmthRestock,
  pickEquipmentRestock,
  pickHunterRestock,
  pickRepairRestock,
  pickMedicineRestock,
  type BuyOrder
} from '../ai/shopping';
import { getPersona } from '../ai/personas';
import { getLandmark, isLandmarkAbandoned } from '../content/landmarks';
import { getPrice } from '../content/prices';
import {
  OX_SWAP_BARTER_BOOT_USD,
  OX_SWAP_CASH_ONLY_USD,
  OX_SWAP_GOLD_RUSH_YEARS,
  OX_SWAP_GOLD_RUSH_MULT,
  REPAIR_DOLLARS_PER_POINT
} from './town-services';

/** True when the party is currently traveling with a wagon train. */
export function isInTrain(state: GameState): boolean {
  return state.wagonTrain != null;
}

/** True when the party can call on a blacksmith — either their own
 *  (engine #154 Blacksmith profession) or one in the wagon train.
 *  Drives the smithy half-price repair (#176). */
export function hasBlacksmithSupport(state: GameState): boolean {
  return hasLiveBlacksmith(state) || trainHasProfession(state.wagonTrain, 'blacksmith');
}

/** While in a train, the party's pace is clamped to at most `companyPaceCap`.
 *  Under normal (ok) schedule pressure the cap is 'moderate'; under
 *  behind/critical pressure the captain orders longer marching days and the
 *  cap rises to 'fast' (never 'grueling' in company — see companyPaceCap).
 *  The trade is the safety net (services, share-watch, morale +1/day).
 *
 *  #1304 T2 — DRY: the inline duplicate in milesPerDay (travel.ts) was
 *  removed; it now calls this function. */
export function clampedPace(state: GameState): Pace {
  if (!isInTrain(state)) return state.pace;
  const cap = companyPaceCap(state);
  // Pace ordering: slow=0, moderate=1, fast=2, grueling=3.
  // Cap the player's picked pace at the captain's company cap.
  const PACE_ORDER: Record<Pace, number> = { slow: 0, moderate: 1, fast: 2, grueling: 3 };
  if (PACE_ORDER[state.pace] > PACE_ORDER[cap]) return cap;
  return state.pace;
}

/** Daily morale bonus from traveling in a train — companionship,
 *  shared cooking, Saturday-night fiddle around the central fire.
 *  Period-faithful: emigrant diaries describe the social rhythm of
 *  caravan travel as the single biggest morale lift outside of
 *  arrival itself. Applied additively to the daily morale tick. */
export const TRAIN_MORALE_PER_DAY = 1;

/** Multiplier on theft / wolf / native-raid event probability while
 *  in a train. The pooled-watch system means strangers stay up in
 *  rotation — period diaries (Carpenter 1857, Bryant 1846) describe
 *  this as the single biggest reason to travel in company. */
export const TRAIN_NIGHT_RISK_MULT = 0.5;

// ---- Actions ----

export interface JoinTrainResult {
  state: GameState;
  train: WagonTrain;
}

/** Join a wagon train at the current landmark. Generates a deterministic
 *  roster from (seed, day) — same inputs → same roster. Throws if the
 *  party is already in a train.
 *
 *  Detects Independence-start vs mid-trail and generates accordingly:
 *  if the player is at `independence_mo` or hasn't moved (day 1 / 0
 *  miles), every NPC wagon spawns at full health, full condition,
 *  fresh oxen — the train hasn't begun moving. Otherwise generation
 *  applies light trail wear (the train has been on the road). */
export function joinTrain(state: GameState, rng: Rng): JoinTrainResult {
  if (isInTrain(state)) {
    throw new Error('joinTrain: already in a wagon train');
  }
  const fresh = state.location.atLandmarkId === 'independence_mo'
    || (state.day <= 1 && state.location.milesTraveled === 0);
  const train = generateTrain(
    state.seed,
    state.day,
    state.location.atLandmarkId ?? null,
    rng,
    { fresh }
  );
  const next: GameState = {
    ...state,
    wagonTrain: train,
    eventLog: [
      ...state.eventLog,
      {
        day: state.day,
        text: `Joined ${train.name} — ${train.companions.length} wagons heading west together.`
      }
    ]
  };
  return { state: next, train };
}

/** Food keys that count for "out of food" detection — matches the
 *  draw order in npc-engine. Used by the #288 starvation crisis
 *  detector to spot wagons that just bottomed out today. */
const FOOD_KEYS_FOR_STARVATION = [
  'game_meat', 'berries', 'egg', 'milk',
  'jerky', 'pemmican', 'salt_pork', 'bacon',
  'flour', 'cornmeal', 'beans', 'hardtack',
  'dried_fruit', 'cheese', 'butter', 'dried_salmon'
];

function totalFood(inv: Record<string, number>): number {
  return FOOD_KEYS_FOR_STARVATION.reduce((sum, k) => sum + (inv[k] ?? 0), 0);
}

export interface AdvanceTrainResult {
  state: GameState;
  /** #288 — surfaces when an NPC wagon's food just hit 0 today and
   *  the player needs to decide whether to help. The pending event
   *  carries the target wagon id so its `apply` choices can mutate
   *  the right wagon. Only one crisis fires per tick (others queue
   *  for the next tick). */
  pendingEvent?: GameEvent;
}

/** #280b/#280c/#288 — advance every companion wagon by one day. Call
 *  this once per day-completion alongside the player's tick (in
 *  `tickDayPausable`, `applyPendingChoice`, and any action that
 *  consumes a calendar day — rest / ford / hunt / inn-stay). No-op if
 *  the player isn't in a train.
 *
 *  Each NPC wagon ticks with its own seed-derived RNG so divergent
 *  fates emerge from the same starting roster ("the Sager family ran
 *  out of flour at mile 1100; you didn't"). NPC events (wheel break,
 *  ox lame, cholera) fire here too — their player-visible news lines
 *  bubble up onto the player's `state.eventLog` so the train feels
 *  alive even though only the player sees the UI.
 *
 *  Starvation crisis detection: if any wagon's food just went from
 *  >0 to =0 today, returns a pendingEvent so `tickDayPausable` can
 *  pause the player and surface a help-or-refuse modal (#288). */
export function advanceTrain(
  state: GameState,
  traveled: boolean,
  traveledMiles: number = 0
): AdvanceTrainResult {
  if (!state.wagonTrain) return { state };
  // #303e — pool the train's clean + dirty water on rest days. Period
  // reality: Helen Carpenter 1857 documents communal water-sharing at
  // company camps. Rest day = the wagons cluster, kegs cross-pour.
  // Pool runs before tick so a wagon about to dehydrate gets its share
  // first.
  //
  // #1031 — Travel-day sharing also fires when any wagon in the train
  // is in crisis (keg ratio < 25%). Period anchor: Bryant 1846 on the
  // Forty-Mile Desert and Royce 1849 on the Snake bench — "the rear
  // wagons emptied first, the lead drivers gave from their barrels."
  // Frizzell 1852 same dynamic: "Mr. Williams' wagon ran dry by noon,
  // we passed up two gallons from our keg." Travel-day pool fires
  // because the train is moving together; on a dry stretch one
  // wagon's crisis is everyone's crisis.
  let prepped: GameState = state;
  if (!traveled && state.wagonTrain) {
    // Rest day: full soul-weighted equalization (Carpenter 1857 camp anchor).
    prepped = applyTrainWaterPool(state);
  } else if (traveled && state.wagonTrain) {
    // Travel day: asymmetric crisis share — surplus wagons give a
    // little, no full equalization (Bryant 1846 lead-drivers anchor).
    prepped = applyTrainCrisisShare(state);
  }
  const ctx: NpcTickContext = {
    day: prepped.day,
    date: prepped.date, // #937 — for persona.shouldRest Sunday check
    location: prepped.location, // #939b — for wagon-synth env
    traveled,
    pace: prepped.pace,
    terrain: prepped.location.terrain,
    weather: prepped.weather ?? 'clear',
    traveledMiles,
    companyRestMode: prepped.wagonTrain?.companyDecisionBlock?.mode
  };
  const companions: typeof state.wagonTrain.companions = [];
  const playerLogs: { day: number; text: string }[] = [];
  let pendingEvent: GameEvent | undefined;
  let pendingCrisisIdx = -1;
  for (const c of prepped.wagonTrain!.companions) {
    const rng = makeRng(`${c.seed}:${prepped.day}`);
    const result = tickNpcWagon(c, ctx, rng);
    const nowFood = totalFood(result.wagon.inventory);
    // #1279 — spell-clear: when a wagon that had crisisAskedDay set
    // now has food again, clear the marker so a future empty spell
    // will re-fire. Do this before pushing so the updated wagon is
    // what goes into companions[].
    let wagon = result.wagon;
    if (nowFood > 0 && wagon.crisisAskedDay !== undefined) {
      const { crisisAskedDay: _cleared, ...rest } = wagon;
      wagon = rest as typeof wagon;
    }
    companions.push(wagon);
    for (const text of result.playerLogs) {
      playerLogs.push({ day: prepped.day, text });
    }
    // #1279 Crisis detection: level-trigger — fires while food is
    // empty AND the player hasn't been asked this spell
    // (crisisAskedDay unset). The marker is set at the
    // tickDayPausable surfacing site; continuations that DROP the
    // event (applyCompanyDissent, applyPendingChoice tailAlreadyRan)
    // do NOT mark, so the event re-fires next tick. Cleared when the
    // wagon gets food again (new spell). Limit to one crisis per tick
    // — the second foodless wagon fires next tick after the first is
    // marked.
    if (
      pendingCrisisIdx === -1
      && nowFood === 0
      && wagon.crisisAskedDay === undefined
      && wagon.outcome === 'in-progress'
      && wagon.party.some((p) => !p.dead)
    ) {
      // Stash the index — we'll run the other-wagon contribution
      // pass below before deciding whether to surface a player ask.
      pendingCrisisIdx = companions.length - 1;
    }
  }

  // #288 — other-wagon contributions before the player gets asked.
  // Period reality: emigrant diaries (Carpenter 1857, Palmer 1845)
  // describe distressed wagons being bailed out by collections from
  // other company members long before any single household had to
  // shoulder it. Roll across each non-target companion: if they have
  // good morale + enough surplus, they chip in. If contributions
  // total enough food (~30 lb), the crisis resolves silently — the
  // player isn't even asked.
  if (pendingCrisisIdx !== -1) {
    const targetWagon = companions[pendingCrisisIdx];
    const contributionRng = makeRng(`${targetWagon.id}:${prepped.day}:contrib`);
    let totalFlour = 0;
    let totalBacon = 0;
    const contributorLogs: string[] = [];
    const updated = companions.map((c, i) => {
      if (i === pendingCrisisIdx) return c;
      if (c.outcome !== 'in-progress') return c;
      // Only happy + well-stocked wagons chip in.
      if (c.morale < 50) return c;
      const cFlour = c.inventory.flour ?? 0;
      const cBacon = c.inventory.bacon ?? 0;
      // Need ≥ 5 days' food for their own party first.
      const eaters = c.party.filter((p) => !p.dead).length;
      const minSelf = Math.max(50, eaters * 5 * 2.5);
      if (cFlour < minSelf) return c;
      // 50% chance to contribute when eligible. Each contribution
      // is 5-10 lb flour + a couple lb bacon.
      if (!contributionRng.chance(0.5)) return c;
      const giveFlour = Math.min(cFlour - minSelf, contributionRng.int(5, 10));
      const giveBacon = Math.min(cBacon, contributionRng.int(2, 5));
      if (giveFlour <= 0 && giveBacon <= 0) return c;
      totalFlour += giveFlour;
      totalBacon += giveBacon;
      contributorLogs.push(`${c.name} chipped in ${giveFlour} lb flour${giveBacon > 0 ? ` + ${giveBacon} lb bacon` : ''}.`);
      return {
        ...c,
        inventory: {
          ...c.inventory,
          flour: cFlour - giveFlour,
          bacon: cBacon - giveBacon
        }
      };
    });
    if (totalFlour > 0 || totalBacon > 0) {
      // Apply pooled contributions to the target.
      updated[pendingCrisisIdx] = {
        ...updated[pendingCrisisIdx],
        inventory: {
          ...updated[pendingCrisisIdx].inventory,
          flour: (updated[pendingCrisisIdx].inventory.flour ?? 0) + totalFlour,
          bacon: (updated[pendingCrisisIdx].inventory.bacon ?? 0) + totalBacon
        }
      };
      for (const text of contributorLogs) {
        playerLogs.push({ day: prepped.day, text });
      }
      // Threshold for "the train solved it" — 30 lb of staples is
      // ~6 days for a small family. If the pooled contributions
      // cover that, no player ask. Otherwise the player still gets
      // the modal but the contributors' help is logged first.
      const poolTotal = totalFlour + totalBacon;
      if (poolTotal >= 30) {
        playerLogs.push({
          day: prepped.day,
          text: `${updated[pendingCrisisIdx].name} carried on without your help — the train pooled what it could.`
        });
      } else {
        // Train chipped in but it wasn't enough — surface the player
        // ask so they can decide on the rest. Note: the target now
        // has some food (flour+bacon > 0), so if this event is
        // dropped by a continuation, next tick the wagon will have
        // food and its (unset) crisisAskedDay won't re-fire — the
        // train partially solved it, which is acceptable. (#1279)
        pendingEvent = buildStarvationCrisisEvent(updated[pendingCrisisIdx]);
      }
    } else {
      // Nobody else could spare anything — straight to player ask.
      pendingEvent = buildStarvationCrisisEvent(updated[pendingCrisisIdx]);
    }
    // Replace companions with the contribution-updated array.
    for (let i = 0; i < companions.length; i++) companions[i] = updated[i];
  }

  let next: GameState = {
    ...prepped,
    wagonTrain: { ...prepped.wagonTrain!, companions },
    eventLog: playerLogs.length === 0
      ? prepped.eventLog
      : [...prepped.eventLog, ...playerLogs]
  };

  // #290 — departures. Low-morale wagons roll to leave the train.
  // Runs after tick + crisis so the day's morale drops factor in.
  // Skipped if a starvation-crisis pendingEvent is already queued —
  // we don't want a wagon leaving the same tick they bottom out
  // (the player should at least get the chance to react).
  if (!pendingEvent && next.wagonTrain) {
    const departureRng = makeRng(`${prepped.seed}:${prepped.day}:departures`);
    const dep = processDepartures(next, departureRng);
    next = dep.state;
  }

  return pendingEvent ? { state: next, pendingEvent } : { state: next };
}

/** #303e — Pool the player's + companions' clean and dirty water across
 *  the train, redistributing by alive-soul count. Period reality: Helen
 *  Carpenter 1857 documents communal water-sharing at company camps —
 *  wagons cluster, kegs cross-pour, no household lets a neighbor's
 *  children go thirsty. Only fires on rest days; travel days each
 *  wagon drains its own keg. Pool respects per-wagon `waterCap` so
 *  surplus stays with the player keg if NPCs are full. Only counts
 *  in-progress companions (wiped/arrived/stranded skipped). */
/** #1031 — travel-day crisis sharing. The rest-day pool
 *  (`applyTrainWaterPool`) does full soul-weighted redistribution: when
 *  wagons cluster at camp, every keg ends up at the same per-capita
 *  fill. That's correct for rest. Travel-day crisis sharing is
 *  asymmetric: surplus wagons (≥60% keg) give to crisis wagons (<25%)
 *  to bring crisis kegs up to ~40%. The wagons with mid-fill kegs are
 *  untouched. Period: Bryant 1846 / Frizzell 1852 — the lead drivers
 *  passed a couple gallons back from their barrels, they didn't pour
 *  out half their supply for an equal share. */
const TRAIN_CRISIS_KEG_RATIO = 0.25;
const TRAIN_SURPLUS_KEG_RATIO = 0.60;
const TRAIN_CRISIS_RELIEF_RATIO = 0.40;
function applyTrainCrisisShare(state: GameState): GameState {
  if (!state.wagonTrain) return state;
  type WagonRef = { kind: 'player' } | { kind: 'npc'; idx: number };
  interface Entry {
    ref: WagonRef;
    water: number;
    waterCap: number;
  }
  const entries: Entry[] = [
    { ref: { kind: 'player' }, water: state.resources.water, waterCap: state.resources.waterCap }
  ];
  state.wagonTrain.companions.forEach((c, idx) => {
    if (c.outcome !== 'in-progress') return;
    entries.push({ ref: { kind: 'npc', idx }, water: c.water, waterCap: c.waterCap });
  });

  const crisis = entries.filter((e) => e.waterCap > 0 && e.water / e.waterCap < TRAIN_CRISIS_KEG_RATIO);
  if (crisis.length === 0) return state;
  const surplus = entries.filter((e) => e.waterCap > 0 && e.water / e.waterCap >= TRAIN_SURPLUS_KEG_RATIO);
  if (surplus.length === 0) return state;

  // Per-crisis-wagon need: bring up to 40% of cap. Sum then pull
  // proportionally from surplus wagons; each surplus wagon never goes
  // below 50% (the giving-but-not-suicidal threshold).
  const totalNeed = crisis.reduce(
    (s, e) => s + Math.max(0, Math.round(e.waterCap * TRAIN_CRISIS_RELIEF_RATIO) - e.water),
    0
  );
  const totalAvailable = surplus.reduce(
    (s, e) => s + Math.max(0, e.water - Math.round(e.waterCap * 0.5)),
    0
  );
  if (totalNeed === 0 || totalAvailable === 0) return state;
  const fulfillment = Math.min(totalNeed, totalAvailable);

  // Pull from each surplus wagon proportionally to its excess.
  for (const e of surplus) {
    const excess = Math.max(0, e.water - Math.round(e.waterCap * 0.5));
    const give = totalAvailable > 0
      ? Math.round((excess / totalAvailable) * fulfillment)
      : 0;
    e.water -= give;
  }
  // Distribute to each crisis wagon proportionally to its gap.
  let leftover = fulfillment;
  for (const e of crisis) {
    const need = Math.max(0, Math.round(e.waterCap * TRAIN_CRISIS_RELIEF_RATIO) - e.water);
    const share = totalNeed > 0 ? Math.round((need / totalNeed) * fulfillment) : 0;
    const take = Math.min(share, leftover, e.waterCap - e.water);
    e.water += take;
    leftover -= take;
  }

  // Materialize entries back into state.
  let newPlayerWater = state.resources.water;
  const newCompanions = [...state.wagonTrain.companions];
  for (const e of entries) {
    if (e.ref.kind === 'player') newPlayerWater = e.water;
    else newCompanions[e.ref.idx] = { ...newCompanions[e.ref.idx], water: e.water };
  }
  return {
    ...state,
    resources: { ...state.resources, water: newPlayerWater },
    wagonTrain: { ...state.wagonTrain, companions: newCompanions }
  };
}

export function applyTrainWaterPool(state: GameState): GameState {
  if (!state.wagonTrain) return state;
  const inProgress = state.wagonTrain.companions.filter(
    (c) => c.outcome === 'in-progress'
  );
  const playerSouls = state.party.filter((m) => !m.dead).length;
  const totalSouls = inProgress.reduce(
    (sum, c) => sum + c.party.filter((m) => !m.dead).length,
    playerSouls
  );
  if (totalSouls === 0) return state;
  const totalClean = inProgress.reduce((s, c) => s + c.water, 0)
    + state.resources.water;
  const totalDirty = inProgress.reduce((s, c) => s + c.dirtyWater, 0)
    + (state.resources.dirtyWater ?? 0);
  if (totalClean === 0 && totalDirty === 0) return state;

  // Two-pass redistribute: assign each entity its proportional share,
  // capped at its waterCap. Any excess from cap-clipped entities flows
  // back into a residual pool that gets spread across uncapped ones.
  // Single-pass approximation is fine here — caps rarely bind on rest
  // days at typical fill levels. If they do, residue stays with the
  // player keg (which has the largest cap by default).
  const playerShareRatio = playerSouls / totalSouls;
  const newPlayerWater = Math.min(
    state.resources.waterCap,
    Math.round(totalClean * playerShareRatio)
  );
  const newPlayerDirty = Math.min(
    state.resources.waterCap,
    Math.round(totalDirty * playerShareRatio)
  );
  let cleanRemaining = totalClean - newPlayerWater;
  let dirtyRemaining = totalDirty - newPlayerDirty;

  const remainingSouls = totalSouls - playerSouls;
  const newCompanions = state.wagonTrain.companions.map((c) => {
    if (c.outcome !== 'in-progress') return c;
    const wagonSouls = c.party.filter((m) => !m.dead).length;
    if (wagonSouls === 0) return c;
    const ratio = remainingSouls > 0 ? wagonSouls / remainingSouls : 0;
    const cleanShare = Math.min(c.waterCap, Math.round(cleanRemaining * ratio));
    const dirtyShare = Math.min(c.waterCap, Math.round(dirtyRemaining * ratio));
    return { ...c, water: cleanShare, dirtyWater: dirtyShare };
  });

  return {
    ...state,
    resources: {
      ...state.resources,
      water: newPlayerWater,
      dirtyWater: newPlayerDirty
    },
    wagonTrain: { ...state.wagonTrain, companions: newCompanions }
  };
}

/** #299 — NPC food restock at trading posts. Period reality:
 *  emigrant households resupplied at every post they could afford
 *  (Marcy 1859: "the most usual articles purchased at intermediate
 *  posts… bacon, flour, coffee, sugar, salt"). Without this companion
 *  wagons starve on a fixed timeline determined only by their starting
 *  kit + occasional gifts.
 *
 *  Per in-progress companion: skip if cash < $10, then call
 *  `pickFoodRestock` with a 5-day floor / 10-day cap (period: NPC
 *  households kept tighter buffers than the player can afford). Apply
 *  the post's `priceMultiplier` symmetrically — Bridger gouges NPCs
 *  the same way it gouges the player. Each wagon's spend is capped at
 *  its cash on hand; if the buy list overflows the wallet, items are
 *  dropped from the back of the priority order until it fits.
 *
 *  One per-(landmark, day) flag (`_npcRestockedAt_<id>`) prevents
 *  re-fire when the player bounces through TownStage. Same pattern as
 *  captain elections (#285) and crisis re-elections.
 *
 *  Logs a single summary line per restocking wagon ("the Sager family
 *  bought 32 lb flour + 9 lb bacon + 3 lb sugar at Fort Laramie —
 *  $12.40."). Total summary at the end if any wagon restocked. */
/** #902 — apply a persona-driven ox swap on an NPC wagon at a post.
 *  Mirrors player swapOxen (town-services.ts) at the wagon level:
 *  prefers barter (2 worst-attrition oxen surrendered per fresh) when
 *  the team has enough surrender candidates, else falls back to
 *  cash-only at the higher per-head rate. Does nothing (returns
 *  unchanged) if the wagon can't afford either path. */
function applyNpcOxSwap(
  wagon: NpcWagonState,
  want: number,
  year: number,
  postName: string,
  day: number,
  playerLogs: { day: number; text: string }[]
): NpcWagonState {
  const fresh = Math.max(0, Math.floor(want));
  if (fresh <= 0) return wagon;
  const goldRush = OX_SWAP_GOLD_RUSH_YEARS.has(year);
  const mult = goldRush ? OX_SWAP_GOLD_RUSH_MULT : 1;

  const sorted = [...wagon.oxen]
    .filter((o) => o.health > 0)
    .sort((a, b) => (a.health - a.fatigue) - (b.health - b.fatigue));
  const barterNeed = 2 * fresh;
  const barterCost = fresh * OX_SWAP_BARTER_BOOT_USD * mult;
  const cashOnlyCost = fresh * OX_SWAP_CASH_ONLY_USD * mult;

  let surrenderIds: string[] = [];
  let cost = 0;
  let cashOnly = false;
  if (sorted.length >= barterNeed && wagon.cash >= barterCost) {
    surrenderIds = sorted.slice(0, barterNeed).map((o) => o.id);
    cost = barterCost;
  } else if (wagon.cash >= cashOnlyCost) {
    cashOnly = true;
    cost = cashOnlyCost;
  } else {
    return wagon; // can't afford either path
  }

  const idSet = new Set(surrenderIds);
  const remainingTeam = cashOnly ? wagon.oxen : wagon.oxen.filter((o) => !idSet.has(o.id));
  const usedIds = new Set(remainingTeam.map((o) => o.id));
  const freshOxen: Ox[] = [];
  let nextN = 0;
  for (let i = 0; i < fresh; i++) {
    let id = `ox-fresh-${wagon.id}-${day}-${nextN}`;
    while (usedIds.has(id)) {
      nextN += 1;
      id = `ox-fresh-${wagon.id}-${day}-${nextN}`;
    }
    usedIds.add(id);
    freshOxen.push({ id, health: 100, fatigue: 0, shod: true });
    nextN += 1;
  }

  const flavor = cashOnly
    ? `${wagon.name} bought ${fresh} fresh ox${fresh === 1 ? '' : 'en'} at ${postName} for $${cost}${goldRush ? ' (Gold Rush prices)' : ''}.`
    : `${wagon.name} swapped ${surrenderIds.length} trail-worn ox${surrenderIds.length === 1 ? '' : 'en'} for ${fresh} fresh at ${postName} — $${cost} boot${goldRush ? ' (Gold Rush prices)' : ''}.`;
  playerLogs.push({ day, text: flavor });

  return {
    ...wagon,
    cash: wagon.cash - cost,
    oxen: [...remainingTeam, ...freshOxen]
  };
}

/** #905 — apply a persona-driven smithy repair on an NPC wagon at a
 *  post that offers `blacksmith`. Mirrors player repairWagon
 *  (town-services.ts) at the wagon level: dollars buy points at the
 *  REPAIR_DOLLARS_PER_POINT rate. No blacksmith discount for NPCs in
 *  this slice — the in-train discount is a #176 player-specific
 *  reward. Cap spend at wagon cash and 100-condition room. */
function applyNpcRepair(
  wagon: NpcWagonState,
  budget: number,
  postName: string,
  day: number,
  playerLogs: { day: number; text: string }[]
): NpcWagonState {
  const want = Math.max(0, Math.floor(budget));
  if (want <= 0) return wagon;
  const room = Math.max(0, 100 - wagon.wagon.condition);
  if (room <= 0) return wagon;
  const spend = Math.min(want, wagon.cash);
  if (spend <= 0) return wagon;
  const desiredPoints = Math.floor(spend / REPAIR_DOLLARS_PER_POINT);
  const points = Math.min(room, desiredPoints);
  if (points <= 0) return wagon;
  const cost = Math.ceil(points * REPAIR_DOLLARS_PER_POINT);
  playerLogs.push({
    day,
    text: `The smith patched ${wagon.name}'s wagon. +${points} condition for $${cost} at ${postName}.`
  });
  return {
    ...wagon,
    cash: wagon.cash - cost,
    wagon: { ...wagon.wagon, condition: wagon.wagon.condition + points }
  };
}

/** #911 — apply a non-food shopping list to an NPC wagon. Pattern:
 *  cull tail items until cost fits cash, then apply. Used for the
 *  combined warmth + equipment + hunter + repair + medicine basket.
 *  No fallback path (if a wagon is broke, it skips the basket — only
 *  food has the #287a Donner-style "buy SOMETHING" flour fallback). */
function applyNpcShoppingBuys(
  wagon: NpcWagonState,
  rawBuys: BuyOrder[],
  label: string,
  postMult: number,
  postName: string,
  day: number,
  playerLogs: { day: number; text: string }[]
): NpcWagonState {
  if (rawBuys.length === 0) return wagon;
  let buys = [...rawBuys];
  let cost = buys.reduce(
    (sum, b) => sum + getPrice(b.item).buy * b.qty * postMult,
    0
  );
  while (cost > wagon.cash && buys.length > 0) {
    const dropped = buys.pop()!;
    cost -= getPrice(dropped.item).buy * dropped.qty * postMult;
  }
  if (buys.length === 0) return wagon;
  const inv = { ...wagon.inventory };
  for (const b of buys) {
    inv[b.item] = (inv[b.item] ?? 0) + b.qty;
  }
  const summary = buys
    .map((b) => `${b.qty} ${b.item.replace(/_/g, ' ')}`)
    .join(' + ');
  playerLogs.push({
    day,
    text: `${wagon.name} bought ${summary} (${label}) at ${postName} — $${cost.toFixed(2)}.`
  });
  return { ...wagon, inventory: inv, cash: Math.round(wagon.cash - cost) };
}

export function applyNpcPostRestock(state: GameState): GameState {
  if (!state.wagonTrain) return state;
  const id = state.location.atLandmarkId;
  if (!id) return state;
  const flagKey = `_npcRestockedAt_${id}`;
  if (state.flags[flagKey]) return state;
  const here = getLandmark(id);
  if (here.kind !== 'trading_post') return state;
  // #1162 — NPCs must skip posts that are abandoned for the current
  // year, same as the player UI (LandmarkStage / TownStage / ActionBar).
  // Without this, NPC trains restock at Fort Boise in 1857 (gated
  // abandonedAfterYear: 1855) or Rock Creek Station in 1850 (gated
  // abandonedBeforeYear: 1857). Both visibly break the period sim.
  if (isLandmarkAbandoned(here, state.date.year)) return state;
  const stock = new Set(here.stock ?? []);
  if (stock.size === 0) return state;
  const postMult = here.priceMultiplier ?? 1.0;

  const playerLogs: { day: number; text: string }[] = [];
  const offersOxSwap = (here.services ?? []).includes('ox_swap');
  const offersBlacksmith = (here.services ?? []).includes('blacksmith');
  const updated = state.wagonTrain.companions.map((c) => {
    if (c.outcome !== 'in-progress') return c;
    if (c.cash < 10) return c;
    const persona = getPersona(c.personaId ?? 'balanced');
    let next: NpcWagonState = c;

    // --- Food restock ---
    // #906 — persona-driven post-trade gate. shouldTradeAtPost reads
    // inventory + party + cash + here.stock. aggressive returns false
    // outright (skips every post); cautious / balanced gate on
    // foodOnHand + post-stocks-missing-{warmth,medicine,equipment,
    // saleratus}. chaos rolls 50% if cash >= $5. Shim widens
    // accordingly.
    // #899 — persona-driven sizing via persona.pickFoodRestockOpts.
    // hoarder = 15/30, balanced = 25/60, cautious = 30/90, chaos
    // swings deterministically on state.day.
    // #932 — include `location` so the persona's gap-aware
    // pickFoodRestockOpts (which reads milesTraveled to size restocks
    // against the next supply-less leg) flows through NPC restock
    // too. NPCs are at the same landmark as the player, so sharing
    // state.location is correct.
    const tradeFauxState = {
      inventory: next.inventory,
      party: next.party,
      cash: next.cash,
      day: state.day,
      date: state.date,  // #1163 — foresight.nextSupplyDistance now reads state.date.year
      location: state.location
    } as unknown as GameState;
    const tradeRng = makeRng(`${next.seed}:trade:${state.day}:${id}`);
    const opts = persona.pickFoodRestockOpts(tradeFauxState);
    let buys = persona.shouldTradeAtPost(tradeFauxState, here, tradeRng)
      ? pickFoodRestock({ wagon: next, stock }, opts)
      : [];
    if (buys.length > 0) {
      // Cash gate: drop tail-end (lowest priority) items until total fits.
      let cost = buys.reduce(
        (sum, b) => sum + getPrice(b.item).buy * b.qty * postMult,
        0
      );
      while (cost > next.cash && buys.length > 0) {
        const dropped = buys.pop()!;
        cost -= getPrice(dropped.item).buy * dropped.qty * postMult;
      }
      // #287a — if every buy got dropped (low cash + high prices, e.g.
      // a 7-soul family at a 1.5× post with $15), shrink qty on the
      // highest-priority item (flour) to whatever cash will buy. Beats
      // "skip the restock entirely" — the Donner family still buys SOME
      // flour rather than starving.
      if (buys.length === 0) {
        const head = pickFoodRestock({ wagon: next, stock }, opts)[0];
        if (head) {
          const unit = getPrice(head.item).buy * postMult;
          const qty = Math.floor(next.cash / unit);
          if (qty > 0) {
            buys = [{ item: head.item, qty }];
            cost = unit * qty;
          }
        }
      }
      if (buys.length > 0) {
        const inv = { ...next.inventory };
        for (const b of buys) {
          inv[b.item] = (inv[b.item] ?? 0) + b.qty;
        }
        const summary = buys
          .map((b) => `${b.qty} lb ${b.item.replace(/_/g, ' ')}`)
          .join(' + ');
        playerLogs.push({
          day: state.day,
          text: `${c.name} bought ${summary} at ${here.name} — $${cost.toFixed(2)}.`
        });
        next = { ...next, inventory: inv, cash: Math.round(next.cash - cost) };
      }
    }

    // --- Smithy repair ---
    // #905 — persona-driven wagon repair budget. Mirrors player
    // repairWagon (town-services.ts) at the wagon level. generous
    // (1.5× balanced) and hoarder (½) diverge most. Shim exposes
    // wagon (for condition) and cash + day (chaos pseudo-rng); widen
    // if a future override touches more.
    if (offersBlacksmith) {
      // #935 — include `location` so gap-aware pickRepairBudget sees
      // the upcoming supply gap.
      const repairFauxState = {
        wagon: next.wagon,
        cash: next.cash,
        day: state.day,
        date: state.date,  // #1163 — same reason as tradeFauxState above
        location: state.location
      } as unknown as GameState;
      const budget = persona.pickRepairBudget(repairFauxState, here);
      if (budget > 0) {
        next = applyNpcRepair(next, budget, here.name, state.day, playerLogs);
      }
    }

    // --- Ox swap ---
    // #902 — persona-driven worn-team refresh. Mirrors player
    // swapOxen (town-services.ts) at the wagon level. generous /
    // cautious want 2 above minTeam + refresh on <70 health; hoarder
    // never swaps; chaos rolls 0–3 deterministically. The shim
    // exposes wagon.model (for minTeam) and oxen — the only fields
    // any current pickOxSwapCount impl reads.
    if (offersOxSwap && next.cash >= OX_SWAP_BARTER_BOOT_USD) {
      // #934 — include `location` so gap-aware pickOxSwapCount sees
      // the upcoming supply gap.
      const oxFauxState = { wagon: next.wagon, oxen: next.oxen, location: state.location, date: state.date } as unknown as GameState;
      // Per-wagon RNG keyed off the wagon seed + day so chaos picks
      // are deterministic per (wagon, day, post) but diverge across
      // wagons. Same pattern as the bot runner.
      const oxRng = makeRng(`${next.seed}:ox-swap:${state.day}:${id}`);
      const want = persona.pickOxSwapCount(oxFauxState, here, oxRng);
      if (want > 0) {
        next = applyNpcOxSwap(next, want, state.date.year, here.name, state.day, playerLogs);
      }
    }

    // --- Non-food shopping basket ---
    // #911 — bring NPC shopping to player parity. Pre-#911, NPCs only
    // ran pickFoodRestock — they never replaced lost cookware (#306
    // buffalo stampede), bought coats for the high plains, refilled
    // medicine after disease cycles, restocked ammo for hunters, or
    // grabbed spare wagon parts. Period reality: companion wagons
    // absolutely topped these at every fort that stocked them.
    //
    // Each shopping slice is self-gating: pickWarmthRestock fires when
    // any soul is missing gear; pickHunterRestock requires a live
    // Hunter; pickRepairRestock requires a live Blacksmith;
    // pickMedicineRestock fires whenever stock is low. Cookware spare
    // honors persona.pickEquipmentRestockOpts (#909). All slices flow
    // through one cull-from-tail loop so medicine (last priority)
    // gets dropped first when cash is tight — same shape the player
    // composeShoppingList uses.
    const equipFauxState = { day: state.day, date: state.date, location: state.location } as unknown as GameState;
    const equipOpts = persona.pickEquipmentRestockOpts(equipFauxState);
    const nonFoodBuys: BuyOrder[] = [
      ...pickWarmthRestock({ wagon: next, stock }),
      ...pickEquipmentRestock({ wagon: next, stock }, equipOpts),
      ...pickHunterRestock({ wagon: next, stock }),
      ...pickRepairRestock({ wagon: next, stock }),
      ...pickMedicineRestock({ wagon: next, stock })
    ];
    next = applyNpcShoppingBuys(
      next,
      nonFoodBuys,
      'supplies',
      postMult,
      here.name,
      state.day,
      playerLogs
    );

    // #915 — barter fallback for NPCs that ran low on cash earlier
    // in the loop. NPC wagons carry their own inventory; we
    // synthesize a GameState shim, ask the persona for barter
    // dispositions, quote each, and apply fair ones directly onto
    // `next.inventory`. Period reality: the wagons in the train
    // that arrived broke at Bridger/Hall still came out with
    // medicine + flour by trading hides / fresh meat.
    if (here.barterEnabled !== false) {
      const barterFauxState = {
        inventory: next.inventory,
        cash: next.cash,
        party: next.party,
        day: state.day,
        date: state.date,  // #1163 — persona helpers reach foresight which needs date.year
        location: state.location
      } as unknown as GameState;
      const barterRng = makeRng(`${next.seed}:barter:${state.day}:${id}`);
      const dispositions = persona.pickBarterDispositions(barterFauxState, here, barterRng);
      for (const d of dispositions) {
        // Re-shim each iteration so inventory drift between barters
        // doesn't make later quotes go stale.
        const liveFaux = {
          ...barterFauxState,
          inventory: next.inventory
        } as unknown as GameState;
        const quote = quoteBarter(liveFaux, d.give, d.receive);
        if (!quote.fair) continue;
        const have = next.inventory[d.give.item] ?? 0;
        if (have < d.give.qty) continue;
        const inventory = {
          ...next.inventory,
          [d.give.item]: have - d.give.qty,
          [d.receive.item]: (next.inventory[d.receive.item] ?? 0) + d.receive.qty
        };
        next = { ...next, inventory };
        playerLogs.push({
          day: state.day,
          text: `${next.name} bartered ${d.give.qty} ${d.give.item.replace(/_/g, ' ')} for ${d.receive.qty} ${d.receive.item.replace(/_/g, ' ')} at ${here.name}.`
        });
      }
    }

    return next;
  });

  if (playerLogs.length === 0) {
    // Mark the flag anyway so we don't re-evaluate every TownStage hit.
    return { ...state, flags: { ...state.flags, [flagKey]: true } };
  }
  return {
    ...state,
    flags: { ...state.flags, [flagKey]: true },
    wagonTrain: { ...state.wagonTrain, companions: updated },
    eventLog: [...state.eventLog, ...playerLogs]
  };
}

// #1046 B: the canonical splitter is resolveCompanyDissent (it sets the
// #127 re-join cooldown via flags._leftTrainCooldownUntilDay). A direct
// leaveTrain caller that wants the cooldown must set that flag itself.
/** Split off from the wagon train — the party continues alone.
 *  Period reality: parties split routinely at posts (especially
 *  Bridger and Hall), and the social fallout could be bitter. We
 *  log it cleanly with no friction; the meaningful cost is forfeiting
 *  the train's services. */
export function leaveTrain(state: GameState): GameState {
  if (!isInTrain(state)) return state;
  const trainName = state.wagonTrain!.name;
  return {
    ...state,
    wagonTrain: null,
    eventLog: [
      ...state.eventLog,
      {
        day: state.day,
        text: `Split off from ${trainName} — the party continues alone.`
      }
    ]
  };
}
