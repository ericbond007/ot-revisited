import type { GameState } from '../types';
import type { Rng } from '../rng';
import { EVENTS } from '../content/events';
import type { GameEvent } from '../content/events';
import { wagonHazardMult } from './load';
import { hasLiveLawyer } from '../professions/predicates';

/** #317c — conflict-flavored party events that the lawyer can mediate.
 *  When a lawyer is alive in the party, these fire ~50% less often
 *  (the attorney smooths things over before they escalate). Period
 *  reality: emigrant-party diaries note attorneys arbitrating disputes
 *  before they became open quarrels. */
const LAWYER_CONFLICT_DAMPEN_IDS = new Set<string>([
  'party_food_hoarding',
  'party_fistfight'
]);
const LAWYER_CONFLICT_WEIGHT_MULT = 0.5;

// Wagon-category events fire more often when the wagon is overloaded —
// structural stress translates to higher breakdown odds. All other
// categories keep their base weight.
export function effectiveWeight(ev: GameEvent, state: GameState): number {
  let w = ev.weight;
  if (ev.category === 'wagon') w *= wagonHazardMult(state);
  // Cholera-scare news (#150) makes the cholera event 50% more likely
  // to fire while the rumor window is open. (The event's id is
  // 'health_cholera'; the variable is named cholera_scare.)
  if (ev.id === 'health_cholera') {
    const until = (state.flags._choleraHintedUntilDay as number | undefined) ?? 0;
    if (until > state.day) w *= 1.5;
  }
  // #317c — lawyer in party dampens conflict events.
  if (LAWYER_CONFLICT_DAMPEN_IDS.has(ev.id) && hasLiveLawyer(state)) {
    w *= LAWYER_CONFLICT_WEIGHT_MULT;
  }
  return w;
}

// #161 — event fire chance dropped 0.30 → 0.20 per May-12 audit.
// At 0.30, bots burned ~66 days/run on event handling (every event
// is a full day off-trail). At 0.20 the expected event load is ~44
// days, freeing ~22 travel days. With the 2195-mi trail and ~15
// effective mi/day across mixed terrain that's +330 miles of head-
// room — enough for arrival to become reachable on good runs.
const BASE_FIRE_CHANCE = 0.20;

export interface RollOptions {
  pool?: readonly GameEvent[];   // default: global EVENTS
  fireChance?: number;  // default: BASE_FIRE_CHANCE
}

export function eligibleEvents(state: GameState, pool: readonly GameEvent[] = EVENTS): GameEvent[] {
  return pool.filter((e) => !e.gate || e.gate(state));
}

export function rollEvent(state: GameState, rng: Rng, opts: RollOptions = {}): GameEvent | null {
  const pool = opts.pool ?? EVENTS;
  const fireChance = opts.fireChance ?? BASE_FIRE_CHANCE;
  if (!rng.chance(fireChance)) return null;

  const eligible = eligibleEvents(state, pool);
  if (eligible.length === 0) return null;

  const totalWeight = eligible.reduce((sum, e) => sum + effectiveWeight(e, state), 0);
  if (totalWeight <= 0) return null;

  let pick = rng.next() * totalWeight;
  for (const e of eligible) {
    pick -= effectiveWeight(e, state);
    if (pick <= 0) return e;
  }
  return eligible[eligible.length - 1];
}

export function resolveEvent(state: GameState, event: GameEvent, choiceId: string, rng: Rng): GameState {
  const choice = event.choices.find((c) => c.id === choiceId);
  if (!choice) throw new Error(`resolveEvent: unknown choice "${choiceId}" for event "${event.id}"`);

  // Guard: if the choice has an `enabled` predicate and it evaluates false
  // for the current state, this is an illegal submission (crafted POST or
  // a state that changed between modal render and submission). No-op the
  // choice and return state unchanged rather than applying an effect that
  // could produce negative cash, duplicate grants, etc. The bot path also
  // routes through here via applyPendingChoice, so bots are protected too.
  if (choice.enabled && !choice.enabled(state)) {
    console.warn(`resolveEvent: choice "${choiceId}" on event "${event.id}" is disabled for current state — no-op`);
    return state;
  }

  const applied = choice.apply(state, rng);
  // Audited choices (silentLog) write their own outcome line in apply().
  // Unaudited choices keep getting the auto-appended "Title: label." entry
  // until they're migrated.
  if (choice.silentLog) return applied;
  return {
    ...applied,
    eventLog: [
      ...applied.eventLog,
      { day: applied.day, text: `${event.title}: ${choice.label}.` }
    ]
  };
}

export function fireEvent(state: GameState, rng: Rng, opts: RollOptions = {}): GameState {
  // Cooldown: don't fire if we already fired on the same day
  if (state.flags._lastEventDay === state.day) return state;

  const event = rollEvent(state, rng, opts);
  if (!event) return state;

  const defaultChoice = event.choices.find((c) => c.isDefault) ?? event.choices[0];
  const resolved = resolveEvent(state, event, defaultChoice.id, rng);
  return {
    ...resolved,
    flags: { ...resolved.flags, _lastEventDay: state.day }
  };
}
