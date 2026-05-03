// #275 Bot decision policies. Three heuristic personas — `cautious`,
// `balanced`, `aggressive` — each implementing the same `Persona`
// interface. The runner calls `pickEventChoice` whenever an event
// pauses tickDayPausable; the other hooks shape pace + rations and
// decide when to rest, hunt, etc.
//
// Personas are intentionally simple — they're not trying to play
// optimally, they're trying to expose three distinct play styles so
// the bot exercises different decision branches. Optimal play is a
// different research project.

import type { GameState } from '../../game/types';
import type { GameEvent } from '../../game/content/events';
import type { PersonaId } from './types';

export interface Persona {
  id: PersonaId;
  /** Pick a choice for an event. Returns the choice id. */
  pickEventChoice(state: GameState, event: GameEvent): string;
  /** Daily pace setting. May change as the run progresses. */
  pickPace(state: GameState): GameState['pace'];
  /** Daily rations. */
  pickRations(state: GameState): GameState['rations'];
  /** Should the party rest a day? */
  shouldRest(state: GameState): boolean;
  /** Should the party hunt? (Returns false for now — hunting modals are
   *  a follow-up; bot just travels.) */
  shouldHunt(state: GameState): boolean;
}

/** Lowest-health alive party member's HP. Defaults to 100 when nobody alive. */
function minPartyHealth(state: GameState): number {
  const alive = state.party.filter((m) => !m.dead);
  if (alive.length === 0) return 100;
  return Math.min(...alive.map((m) => m.health));
}

/** First non-default, non-hidden, non-gated choice on the event. Used
 *  as the fallback when persona-specific logic doesn't pick anything. */
function firstAvailableChoice(state: GameState, event: GameEvent): string {
  for (const c of event.choices) {
    if (c.hidden && c.hidden(state)) continue;
    if (c.requires && (state.inventory[c.requires.itemId] ?? 0) <= 0) continue;
    return c.id;
  }
  // Fallback — every event must have at least one choice; if all are
  // gated/hidden, take the first listed.
  return event.choices[0].id;
}

/** Default-marked choice if available, else first available. */
function defaultChoice(state: GameState, event: GameEvent): string {
  for (const c of event.choices) {
    if (c.isDefault) {
      if (c.hidden && c.hidden(state)) continue;
      if (c.requires && (state.inventory[c.requires.itemId] ?? 0) <= 0) continue;
      return c.id;
    }
  }
  return firstAvailableChoice(state, event);
}

/** Find a choice id by substring match on its label, case-insensitive.
 *  Returns null if nothing matches. */
function choiceMatching(state: GameState, event: GameEvent, ...patterns: RegExp[]): string | null {
  for (const c of event.choices) {
    if (c.hidden && c.hidden(state)) continue;
    if (c.requires && (state.inventory[c.requires.itemId] ?? 0) <= 0) continue;
    for (const p of patterns) {
      if (p.test(c.label)) return c.id;
    }
  }
  return null;
}

export const cautiousPersona: Persona = {
  id: 'cautious',
  pickEventChoice(state, event) {
    // Cautious avoids violence, pays tolls, accepts trades, helps strangers.
    return choiceMatching(state, event, /pay/i, /trade/i, /help/i, /share/i, /accept/i)
      ?? defaultChoice(state, event);
  },
  pickPace(state) {
    if (minPartyHealth(state) < 60) return 'slow';
    return 'moderate';
  },
  pickRations(state) {
    // Cautious eats well — generous rations until food is genuinely low.
    const flour = state.inventory.flour ?? 0;
    return flour > 50 ? 'filling' : 'normal';
  },
  shouldRest(state) {
    return minPartyHealth(state) < 60;
  },
  shouldHunt: () => false
};

export const balancedPersona: Persona = {
  id: 'balanced',
  pickEventChoice(state, event) {
    return defaultChoice(state, event);
  },
  pickPace() {
    return 'moderate';
  },
  pickRations() {
    return 'normal';
  },
  shouldRest(state) {
    return minPartyHealth(state) < 40;
  },
  shouldHunt: () => false
};

export const aggressivePersona: Persona = {
  id: 'aggressive',
  pickEventChoice(state, event) {
    // Aggressive refuses tolls, pushes through, hoards.
    return choiceMatching(state, event, /refuse/i, /push/i, /pass/i, /ignore/i, /wave/i)
      ?? defaultChoice(state, event);
  },
  pickPace(state) {
    if (minPartyHealth(state) < 30) return 'moderate';
    return 'grueling';
  },
  pickRations() {
    return 'meager';
  },
  shouldRest(state) {
    return minPartyHealth(state) < 20;
  },
  shouldHunt: () => false
};

export const PERSONAS: Record<PersonaId, Persona> = {
  cautious: cautiousPersona,
  balanced: balancedPersona,
  aggressive: aggressivePersona
};

export function getPersona(id: PersonaId): Persona {
  return PERSONAS[id];
}
