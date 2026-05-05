// #302 Game AI — shared decision-layer types.
//
// Lifted from `dev/bot/` (where it was test-only) to `game/ai/` so the
// same brain drives the player bot, NPC companion wagons (#280b),
// future encountered-train wagons, and #284 multiplayer fallback.
//
// The Persona interface declares the full decision surface a wagon AI
// can express. Drivers (player bot CLI, NPC tick) consult these
// methods and route the answers through their respective execution
// paths — public actions for the player bot, direct state mutation
// for the NPC tick.

import type { GameState } from '../types';
import type { GameEvent } from '../content/events';
import type { Landmark } from '../content/landmarks';
import type { Rng } from '../rng';

// Re-export the engine's canonical FordMethod so consumers get one
// source of truth instead of a parallel string union.
export type { FordMethod } from '../actions/ford';
import type { FordMethod } from '../actions/ford';

export type PersonaId = 'cautious' | 'balanced' | 'aggressive' | 'chaos';

// All persona methods receive an Rng. Deterministic personas
// (cautious/balanced/aggressive) ignore it and produce the same
// answer for a given state. The chaos persona uses it to pick
// seeded-random choices — still reproducible per run seed, but
// exercises weird decision sequences a heuristic player would never
// take.
export interface Persona {
  id: PersonaId;
  /** Pick a choice for an event. Returns the choice id. */
  pickEventChoice(state: GameState, event: GameEvent, rng: Rng): string;
  /** Daily pace setting. May change as the run progresses. */
  pickPace(state: GameState, rng: Rng): GameState['pace'];
  /** Daily rations. */
  pickRations(state: GameState, rng: Rng): GameState['rations'];
  /** Should the party rest a day? */
  shouldRest(state: GameState, rng: Rng): boolean;
  /** Should the party hunt? Returns true when food is low + ammo available. */
  shouldHunt(state: GameState, rng: Rng): boolean;
  /** Pick a river-crossing method. `native_ferry` is preferred when the
   *  river has the option AND the party can pay. */
  pickFordMethod(state: GameState, here: Landmark, rng: Rng): FordMethod;
  /** Should the party trade at this post? Returns true when food/water/
   *  ammo are low AND the party has cash to spend. */
  shouldTradeAtPost(state: GameState, here: Landmark, rng: Rng): boolean;
  /** Should the party stay at the inn? Returns true when the post has an
   *  inn AND morale or party HP justifies the cost. */
  shouldStayAtInn(state: GameState, here: Landmark, rng: Rng): boolean;
  /** Should the party rest a day to find + boil water? Returns true
   *  when the keg is heading toward empty AND off-desert AND we have
   *  the means to boil (doctor or post-1854). */
  shouldFindWater(state: GameState, rng: Rng): boolean;
  /** Should the party spend a half-day panning for gold (#313)? Gates
   *  on river terrain + miles ≥ 700 + year ≥ 1849; persona decides
   *  whether to actually do it given those conditions. Cautious skips
   *  (period: didn't dawdle); aggressive always tries; chaos rolls. */
  shouldPan(state: GameState, rng: Rng): boolean;
  /** Should the party raid a nearby native camp (#316)? Period: a
   *  rare and ugly choice — every default persona refuses. Surface
   *  exists for chaos to roll on it occasionally and for future
   *  named-profile overrides (#287). All gameplay gates (rifle,
   *  ammo, raidable tribe nearby, year ≥ 1845) live in the camp
   *  action availability check; persona only gates the *want*. */
  shouldRaid(state: GameState, rng: Rng): boolean;
}
