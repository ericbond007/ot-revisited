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
import type { Rng } from '../../game/rng';
import { makeRng } from '../../game/rng';
import type { PersonaId } from './types';

export type FordMethod = 'ford' | 'caulk' | 'ferry' | 'wait' | 'native_ferry';

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

/** Cold-camp gear deficit: coats + blankets per alive person, one tent
 *  for the party. Returns true when the party is short any of these
 *  and the post stocks the gear. Drives `shouldTradeAtPost` — first
 *  post that stocks warmth gear should be a stop, not a flyby. */
function postStocksMissingWarmthGear(state: GameState, here: Landmark): boolean {
  const stock = new Set(here.stock ?? []);
  const aliveCount = state.party.filter((m) => !m.dead).length || 1;
  const inv = state.inventory;
  if (stock.has('coat') && (inv.coat ?? 0) < aliveCount) return true;
  if (stock.has('blanket') && (inv.blanket ?? 0) < aliveCount) return true;
  if (stock.has('tent') && (inv.tent ?? 0) < 1) return true;
  return false;
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
    if (minPartyHealth(state) < 50) return 'slow';
    return 'moderate';
  },
  pickRations(state) {
    // Cautious eats well — generous rations until food is genuinely low.
    const flour = state.inventory.flour ?? 0;
    return flour > 50 ? 'filling' : 'normal';
  },
  shouldRest(state) {
    // <45 HP / <25 morale tuned in v4 — when the bot rests less than
    // this, it dies of disease (cholera + foul water cycle) faster
    // than it covers ground. Smoke tuning showed: <30 HP threshold +
    // 4-day rest streak cap → 100% wipes; unbounded rest at <45 →
    // 0% wipes, full year survival, ~1500 mi avg. The bot trades
    // arrival for survival; this is the right call until medicine-
    // use is wired in (laudanum/quinine to clear conditions).
    return minPartyHealth(state) < 45 || state.morale < 25;
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
  shouldTradeAtPost(state, here) {
    if (state.cash < 10) return false;
    return foodOnHand(state) < 100 || postStocksMissingWarmthGear(state, here);
  },
  shouldStayAtInn(state, here) {
    return (here.services ?? []).includes('inn')
      && state.cash >= 5
      && (state.morale < 50 || minPartyHealth(state) < 70);
  },
  shouldFindWater(state) {
    // Cautious refills at 50% — smoke tuning showed this is the
    // sweet spot. Going lower (<25%) lets the keg run dry on a hot
    // day and triggers a dehydration cascade that costs more rest
    // days than the proactive find_water would have.
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
  shouldTradeAtPost(state, here) {
    if (state.cash < 20) return false;
    return foodOnHand(state) < 60 || postStocksMissingWarmthGear(state, here);
  },
  shouldStayAtInn(state, here) {
    return (here.services ?? []).includes('inn')
      && state.cash >= 10
      && (state.morale < 30 || minPartyHealth(state) < 50);
  },
  shouldFindWater(state) {
    return waterRatio(state) < 0.18 && state.location.terrain !== 'desert';
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

// `chaos` makes seeded-random choices — the "dumbass tourist" mode.
// Same seed → same outcome (Rng is threaded), but the bot will
// happily refuse every toll, ford the deepest rivers without coats,
// pick aggressive pace at low health, etc. The point is fuzz coverage
// of decision sequences a heuristic player would never produce.
//
// All chaos methods accept the Rng arg and use it to roll choices
// uniformly over the available options.
export const chaosPersona: Persona = {
  id: 'chaos',
  pickEventChoice(state, event, rng) {
    const visible = event.choices.filter((c) => {
      if (c.hidden && c.hidden(state)) return false;
      if (c.requires && (state.inventory[c.requires.itemId] ?? 0) <= 0) return false;
      return true;
    });
    const pool = visible.length > 0 ? visible : event.choices;
    return pool[rng.int(0, pool.length - 1)].id;
  },
  pickPace(_state, rng) {
    const paces: GameState['pace'][] = ['slow', 'moderate', 'fast', 'grueling'];
    return paces[rng.int(0, paces.length - 1)];
  },
  pickRations(_state, rng) {
    const rations: GameState['rations'][] = ['meager', 'normal', 'filling'];
    return rations[rng.int(0, rations.length - 1)];
  },
  shouldRest(_state, rng) {
    return rng.chance(0.15);
  },
  shouldHunt(state, rng) {
    return canHunt(state) && rng.chance(0.20);
  },
  pickFordMethod(state, here, rng) {
    // Build the universe of methods this river actually allows. All
    // four are technically callable; native_ferry only when the river
    // has the config AND attitude+inventory line up — but chaos rolls
    // without checking, the runner's tryFordWithFallback catches the
    // throw and degrades to plain ford.
    const methods: FordMethod[] = ['ford', 'caulk', 'ferry', 'wait'];
    if (here.river?.nativeFerry) methods.push('native_ferry');
    return methods[rng.int(0, methods.length - 1)];
  },
  shouldTradeAtPost(state, _here, rng) {
    return state.cash >= 5 && rng.chance(0.5);
  },
  shouldStayAtInn(state, here, rng) {
    return (here.services ?? []).includes('inn') && state.cash >= 5 && rng.chance(0.4);
  },
  shouldFindWater(state, rng) {
    return state.location.terrain !== 'desert' && rng.chance(0.25);
  }
};

export const PERSONAS: Record<PersonaId, Persona> = {
  cautious: cautiousPersona,
  balanced: balancedPersona,
  aggressive: aggressivePersona,
  chaos: chaosPersona
};

export function getPersona(id: PersonaId): Persona {
  return PERSONAS[id];
}

/** Convenience for the runner — derive a per-run RNG keyed off the
 *  game seed and a `:bot` namespace so persona randomness doesn't
 *  share entropy with the engine's tick RNG. */
export function makeBotRng(seed: string): Rng {
  return makeRng(`${seed}:bot`);
}
