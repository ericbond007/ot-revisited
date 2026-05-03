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

/** #280b — advance every companion wagon by one day. Call this once
 *  per day-completion alongside the player's tick (in `tickDayPausable`,
 *  `applyPendingChoice`, and any action that consumes a calendar day —
 *  rest / ford / hunt / inn-stay). No-op if the player isn't in a train.
 *
 *  Each NPC wagon ticks with its own seed-derived RNG so divergent
 *  fates emerge from the same starting roster ("the Sager family ran
 *  out of flour at mile 1100; you didn't"). Player events / pace /
 *  rations don't transfer — NPCs run their own attrition curve. */
export function advanceTrain(state: GameState, traveled: boolean): GameState {
  if (!state.wagonTrain) return state;
  const ctx: NpcTickContext = {
    day: state.day,
    traveled,
    pace: state.pace,
    terrain: state.location.terrain
  };
  const companions = state.wagonTrain.companions.map((c) => {
    const rng = makeRng(`${c.seed}:${state.day}`);
    return tickNpcWagon(c, ctx, rng);
  });
  return {
    ...state,
    wagonTrain: { ...state.wagonTrain, companions }
  };
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
