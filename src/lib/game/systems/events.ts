import type { GameState } from '../types';
import type { Rng } from '../rng';
import { EVENTS } from '../content/events';
import type { GameEvent } from '../content/events';

const BASE_FIRE_CHANCE = 0.30;

export interface RollOptions {
  pool?: GameEvent[];   // default: global EVENTS
  fireChance?: number;  // default: BASE_FIRE_CHANCE
}

export function eligibleEvents(state: GameState, pool: GameEvent[] = EVENTS): GameEvent[] {
  return pool.filter((e) => !e.gate || e.gate(state));
}

export function rollEvent(state: GameState, rng: Rng, opts: RollOptions = {}): GameEvent | null {
  const pool = opts.pool ?? EVENTS;
  const fireChance = opts.fireChance ?? BASE_FIRE_CHANCE;
  if (!rng.chance(fireChance)) return null;

  const eligible = eligibleEvents(state, pool);
  if (eligible.length === 0) return null;

  const totalWeight = eligible.reduce((sum, e) => sum + e.weight, 0);
  if (totalWeight <= 0) return null;

  let pick = rng.next() * totalWeight;
  for (const e of eligible) {
    pick -= e.weight;
    if (pick <= 0) return e;
  }
  return eligible[eligible.length - 1];
}

export function resolveEvent(state: GameState, event: GameEvent, choiceId: string, rng: Rng): GameState {
  const choice = event.choices.find((c) => c.id === choiceId);
  if (!choice) throw new Error(`resolveEvent: unknown choice "${choiceId}" for event "${event.id}"`);
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
