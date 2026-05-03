// #176 Wagon-train predicates + actions. Engine-side helpers used by
// repair pricing, pace clamping, night events, and the bot persona.
//
// The "in train" state is held on `state.wagonTrain` (see `types.ts`).
// All side-effects route through `joinTrain` / `leaveTrain` actions —
// callers should never mutate the train state directly.

import type { GameState, Pace, WagonTrain } from '../types';
import type { Rng } from '../rng';
import { generateTrain, trainHasProfession } from '../content/trains';
import { hasLiveBlacksmith } from '../professions/predicates';
import { tickNpcWagon, type NpcTickContext } from './npc-engine';
import { makeRng } from '../rng';
import type { GameEvent } from '../content/events';
import { buildStarvationCrisisEvent } from './npc-crisis-events';

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

/** While in a train, the party's pace is clamped to `moderate` —
 *  trains move at the slowest member's pace, so the player forfeits
 *  the grueling-push option. The trade is the safety net (services,
 *  share-watch, morale +1/day). */
export function clampedPace(state: GameState): Pace {
  if (!isInTrain(state)) return state.pace;
  if (state.pace === 'fast' || state.pace === 'grueling') return 'moderate';
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
  'dried_fruit', 'cheese', 'butter'
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
export function advanceTrain(state: GameState, traveled: boolean): AdvanceTrainResult {
  if (!state.wagonTrain) return { state };
  const ctx: NpcTickContext = {
    day: state.day,
    traveled,
    pace: state.pace,
    terrain: state.location.terrain
  };
  const companions: typeof state.wagonTrain.companions = [];
  const playerLogs: { day: number; text: string }[] = [];
  let pendingEvent: GameEvent | undefined;
  let pendingCrisisIdx = -1;
  for (const c of state.wagonTrain.companions) {
    const wasFood = totalFood(c.inventory);
    const rng = makeRng(`${c.seed}:${state.day}`);
    const result = tickNpcWagon(c, ctx, rng);
    companions.push(result.wagon);
    for (const text of result.playerLogs) {
      playerLogs.push({ day: state.day, text });
    }
    // Crisis detection: only fire if a wagon transitioned from
    // having food to having none today. Limit to one crisis per
    // tick — others naturally re-queue tomorrow if still empty.
    const nowFood = totalFood(result.wagon.inventory);
    if (
      !pendingEvent
      && wasFood > 0
      && nowFood === 0
      && result.wagon.outcome === 'in-progress'
      && result.wagon.party.some((p) => !p.dead)
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
    const contributionRng = makeRng(`${targetWagon.id}:${state.day}:contrib`);
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
        playerLogs.push({ day: state.day, text });
      }
      // Threshold for "the train solved it" — 30 lb of staples is
      // ~6 days for a small family. If the pooled contributions
      // cover that, no player ask. Otherwise the player still gets
      // the modal but the contributors' help is logged first.
      const poolTotal = totalFlour + totalBacon;
      if (poolTotal >= 30) {
        playerLogs.push({
          day: state.day,
          text: `${updated[pendingCrisisIdx].name} carried on without your help — the train pooled what it could.`
        });
      } else {
        // Train chipped in but it wasn't enough — surface the player
        // ask so they can decide on the rest.
        pendingEvent = buildStarvationCrisisEvent(updated[pendingCrisisIdx]);
      }
    } else {
      // Nobody else could spare anything — straight to player ask.
      pendingEvent = buildStarvationCrisisEvent(updated[pendingCrisisIdx]);
    }
    // Replace companions with the contribution-updated array.
    for (let i = 0; i < companions.length; i++) companions[i] = updated[i];
  }

  const next: GameState = {
    ...state,
    wagonTrain: { ...state.wagonTrain, companions },
    eventLog: playerLogs.length === 0
      ? state.eventLog
      : [...state.eventLog, ...playerLogs]
  };
  return pendingEvent ? { state: next, pendingEvent } : { state: next };
}

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
