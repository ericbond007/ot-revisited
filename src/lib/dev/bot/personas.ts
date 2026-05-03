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
import type { Landmark } from '../../game/content/landmarks';
import type { PersonaId } from './types';

export type FordMethod = 'ford' | 'caulk' | 'ferry' | 'wait' | 'native_ferry';

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
  /** Should the party hunt? Returns true when food is low + ammo available. */
  shouldHunt(state: GameState): boolean;
  /** Pick a river-crossing method. `native_ferry` is preferred when the
   *  river has the option AND the party can pay. */
  pickFordMethod(state: GameState, here: Landmark): FordMethod;
  /** Should the party trade at this post? Returns true when food/water/
   *  ammo are low AND the party has cash to spend. */
  shouldTradeAtPost(state: GameState, here: Landmark): boolean;
  /** Should the party stay at the inn? Returns true when the post has an
   *  inn AND morale or party HP justifies the cost. */
  shouldStayAtInn(state: GameState, here: Landmark): boolean;
  /** Should the party rest a day to find + boil water? Returns true
   *  when the keg is heading toward empty AND off-desert AND we have
   *  the means to boil (doctor or post-1854). */
  shouldFindWater(state: GameState): boolean;
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

/** Total food on hand (lb). Used by hunt + trade decisions. */
function foodOnHand(state: GameState): number {
  const inv = state.inventory;
  return (inv.flour ?? 0) + (inv.beans ?? 0) + (inv.bacon ?? 0)
    + (inv.salt_pork ?? 0) + (inv.hardtack ?? 0) + (inv.jerky ?? 0)
    + (inv.pemmican ?? 0) + (inv.dried_fruit ?? 0) + (inv.cornmeal ?? 0);
}

/** Water-keg fill ratio (0-1). Used by water-low check. */
function waterRatio(state: GameState): number {
  const cap = state.resources.waterCap ?? 20;
  if (cap === 0) return 1;
  return state.resources.water / cap;
}

/** Has a working rifle + ammo? Required for hunt(). */
function canHunt(state: GameState): boolean {
  const inv = state.inventory;
  if ((inv.rifle ?? 0) < 1) return false;
  if ((inv.gunpowder ?? 0) < 5) return false;
  if ((inv.lead_balls ?? 0) < 5 && (inv.lead_pig ?? 0) < 1) return false;
  if ((inv.percussion_caps ?? 0) < 5) return false;
  return true;
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
    return minPartyHealth(state) < 60 || state.morale < 35;
  },
  shouldHunt(state) {
    return canHunt(state) && foodOnHand(state) < 80;
  },
  pickFordMethod(state, here) {
    // Cautious prefers safety: native_ferry > ferry > caulk > ford.
    const nf = here.river?.nativeFerry;
    if (nf && (state.inventory[nf.priceItem] ?? 0) >= nf.priceQty) {
      return 'native_ferry';
    }
    if (state.cash >= (here.river?.ferryPrice ?? 5)) return 'ferry';
    return 'caulk';
  },
  shouldTradeAtPost(state) {
    return state.cash >= 10 && foodOnHand(state) < 100;
  },
  shouldStayAtInn(state, here) {
    return (here.services ?? []).includes('inn')
      && state.cash >= 5
      && (state.morale < 50 || minPartyHealth(state) < 70);
  },
  shouldFindWater(state) {
    return waterRatio(state) < 0.5 && state.location.terrain !== 'desert';
  }
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
    return minPartyHealth(state) < 40 || state.morale < 20;
  },
  shouldHunt(state) {
    return canHunt(state) && foodOnHand(state) < 50;
  },
  pickFordMethod(state, here) {
    // Balanced ferries when cash is comfortable, fords otherwise.
    const ferryPrice = here.river?.ferryPrice ?? 5;
    if (state.cash >= ferryPrice * 3) return 'ferry';
    const nf = here.river?.nativeFerry;
    if (nf && (state.inventory[nf.priceItem] ?? 0) >= nf.priceQty) {
      return 'native_ferry';
    }
    return 'ford';
  },
  shouldTradeAtPost(state) {
    return state.cash >= 20 && foodOnHand(state) < 60;
  },
  shouldStayAtInn(state, here) {
    return (here.services ?? []).includes('inn')
      && state.cash >= 10
      && (state.morale < 30 || minPartyHealth(state) < 50);
  },
  shouldFindWater(state) {
    return waterRatio(state) < 0.35 && state.location.terrain !== 'desert';
  }
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
  shouldHunt(state) {
    // Aggressive only hunts when starving — burns ammo for nothing
    // otherwise. Time-on-the-trail is the priority.
    return canHunt(state) && foodOnHand(state) < 25;
  },
  pickFordMethod() {
    return 'ford';
  },
  shouldTradeAtPost: () => false,
  shouldStayAtInn: () => false,
  shouldFindWater(state) {
    // Only when nearly out of water — aggressive doesn't waste time on stops.
    return waterRatio(state) < 0.2 && state.location.terrain !== 'desert';
  }
};

export const PERSONAS: Record<PersonaId, Persona> = {
  cautious: cautiousPersona,
  balanced: balancedPersona,
  aggressive: aggressivePersona
};

export function getPersona(id: PersonaId): Persona {
  return PERSONAS[id];
}
