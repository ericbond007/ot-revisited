// #275 Bot decision policies. Three heuristic personas — `cautious`,
// `balanced`, `aggressive` — each implementing the same `Persona`
// interface (declared in `./types`). The runner calls `pickEventChoice`
// whenever an event pauses tickDayPausable; the other hooks shape pace
// + rations and decide when to rest, hunt, etc.
//
// Personas are intentionally simple — they're not trying to play
// optimally, they're trying to expose three distinct play styles so
// the bot exercises different decision branches. Optimal play is a
// different research project.
//
// #302 — Lifted from `dev/bot/` to `game/ai/`. Same code, new home —
// the decision layer is shared infrastructure for the player bot, NPC
// companion wagons (#280b), and any future encountered-train wagon.

import type { GameState } from '../types';
import type { GameEvent } from '../content/events';
import type { Landmark } from '../content/landmarks';
import type { Rng } from '../rng';
import { makeRng } from '../rng';
import {
  hasLiveDoctor,
  hasLiveHunter,
  hasLiveTeamster
} from '../professions/predicates';
import type { FordMethod, Persona, PersonaId } from './types';

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

/** Equipment-missing trigger (#308 from #307 audit): the bot can lose
 *  cookware to buffalo stampede (#306 phase 1) or river fords (#306
 *  phase 2). Without this stop trigger, a bot that's food/warmth/
 *  medicine fine walks past Laramie or Walla Walla without buying a
 *  replacement — and carries the −2 morale "ate paste again" debit
 *  per pastry day for the rest of the journey. Period reality:
 *  emigrants who lost cooking pots ABSOLUTELY stopped at the next
 *  post that stocked them. Cookware is the load-bearing item; rope /
 *  shovel / water_skin are also worth catching since they each have
 *  a downstream gameplay role. */
function postStocksMissingEquipment(state: GameState, here: Landmark): boolean {
  const stock = new Set(here.stock ?? []);
  const inv = state.inventory;
  if (stock.has('cookware') && (inv.cookware ?? 0) < 1) return true;
  if (stock.has('shovel') && (inv.shovel ?? 0) < 1) return true;
  if (stock.has('rope') && (inv.rope ?? 0) < 1) return true;
  if (stock.has('water_skin') && (inv.water_skin ?? 0) < 1) return true;
  return false;
}

/** Gold-panning gate (#313): same axes as the camp action — river
 *  terrain + miles ≥ 700 + year ≥ 1849 + cooldown so the bot doesn't
 *  spam-pan every day at a long river crossing. Period: emigrants
 *  panned occasionally when the timing was right, not obsessively. */
function canPanForGold(state: GameState): boolean {
  if (state.date.year < 1849) return false;
  if (state.location.terrain !== 'river') return false;
  if (state.location.milesTraveled < 700) return false;
  // Cooldown: at least 7 days since last pan attempt — the bot
  // doesn't recognize the gold-bearing creek as "exhausted" but a
  // weekly cap keeps gameplay moving and matches period frequency.
  const last = (state.flags._lastPannedDay as number | undefined) ?? -100;
  if (state.day - last < 7) return false;
  return true;
}

/** Saleratus-low trigger (#308 from #307 audit): bot starts with 4
 *  units (2 lb) which lasts ~133 days for a 3-eater family. Once it
 *  hits 0, every flour-day takes −1 morale until restock. Without
 *  this trigger, a food/warmth/medicine-fine bot walks past
 *  Laramie/Bridger/Hall without refilling. Threshold of <2 units
 *  fires the stop early enough to top off before depletion. */
function postStocksLowSaleratus(state: GameState, here: Landmark): boolean {
  const stock = new Set(here.stock ?? []);
  if (!stock.has('saleratus')) return false;
  return (state.inventory.saleratus ?? 0) < 2;
}

/** Medicine restock trigger: bot is light on any of the front-line
 *  drugs that cover the most condition damage. Without this, the bot
 *  only stops at the first warmth-gear post and never resupplies
 *  medicine — chronic cholera/typhoid/dysentery cycles trap the run. */
function postStocksMissingMedicine(state: GameState, here: Landmark): boolean {
  const stock = new Set(here.stock ?? []);
  const inv = state.inventory;
  if (stock.has('quinine') && (inv.quinine ?? 0) < 3) return true;
  if (stock.has('bandages') && (inv.bandages ?? 0) < 3) return true;
  if (stock.has('laudanum') && (inv.laudanum ?? 0) < 2) return true;
  if (stock.has('calomel') && (inv.calomel ?? 0) < 2) return true;
  if (stock.has('paregoric') && (inv.paregoric ?? 0) < 2) return true;
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

/** Average fatigue across alive oxen (0-100). Returns 0 when no oxen
 *  alive — distinct from "fresh team", but `oxenWornOut` will catch
 *  that case via the count check below. */
function avgOxFatigue(state: GameState): number {
  const alive = state.oxen.filter((o) => o.health > 0);
  if (alive.length === 0) return 0;
  return alive.reduce((sum, o) => sum + o.fatigue, 0) / alive.length;
}

/** True when the team is in trouble — heavy avg fatigue OR no oxen
 *  left at all. Drives `shouldRest` so the bot stops before the team
 *  is run into the ground. v8 finding: bot was letting fatigue climb
 *  to 100 across all oxen by day ~60, killing the team and stranding
 *  the party at mi=400 for the rest of the year. Threshold 70 leaves
 *  headroom; the wagon's minTeam (1-4 depending on model) gates actual
 *  movement at the engine level — `milesPerDay` returns 0 below it.
 *
 *  v9 profession-aware: a live Teamster knows the team's habits and
 *  rests them sooner — drops the fatigue threshold to 55, catching
 *  the slide before damage compounds. Period reality: experienced
 *  teamsters watched the off-ox for the first signs of strain. */
function oxenWornOut(state: GameState): boolean {
  const alive = state.oxen.filter((o) => o.health > 0).length;
  if (alive === 0) return true;
  const fatigueLimit = hasLiveTeamster(state) ? 55 : 70;
  return avgOxFatigue(state) > fatigueLimit;
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

/** Health/water events default to the risky path (`risk_drink`,
 *  `press_on` while keg sits foul, etc.) — picking the default is
 *  a fast track to chronic disease that the engine has no cure for
 *  (cholera deals -10 HP/day with only doctor's 30% relief, never
 *  clears). This finder prefers safety-flagged choices: dump bad
 *  water, walk upstream, boil, wait, etc. Returns null if no safe
 *  choice exists. */
function saferHealthChoice(state: GameState, event: GameEvent): string | null {
  const isHealthish = event.category === 'health'
    || /water|cholera|sick|disease|drink|stream|foul|river/i.test(event.title);
  if (!isHealthish) return null;
  return choiceMatching(state, event,
    /upstream/i, /boil/i, /dump/i, /pour/i, /pure/i, /clean/i, /avoid/i, /skip/i, /carefully/i, /wait/i
  );
}

export const cautiousPersona: Persona = {
  id: 'cautious',
  pickEventChoice(state, event) {
    // Cautious avoids violence + chronic disease. Prefer safety on
    // health events first, then the cooperative-trade patterns, then
    // the marked default. Period reality: emigrant captains who
    // refused to drink dirty water lived; Donner Party did not.
    return saferHealthChoice(state, event)
      ?? choiceMatching(state, event, /pay/i, /trade/i, /help/i, /share/i, /accept/i)
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
    // <45 HP / <25 morale tuned in v4. v8 added oxen check — without
    // it, the bot ran 4-ox teams to 100 fatigue by day ~60 and killed
    // the team while the party was still at full HP, stranding the
    // wagon for the rest of the year. Resting at high ox fatigue lets
    // grain + grazing recover the team before damage compounds.
    return minPartyHealth(state) < 45
      || state.morale < 25
      || oxenWornOut(state);
  },
  shouldHunt(state) {
    // Hunter alive → hunt earlier (more total trips, +20% yield each).
    const threshold = hasLiveHunter(state) ? 200 : 150;
    return canHunt(state) && foodOnHand(state) < threshold;
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
    return foodOnHand(state) < 100
      || postStocksMissingWarmthGear(state, here)
      || postStocksMissingMedicine(state, here)
      || postStocksMissingEquipment(state, here)
      || postStocksLowSaleratus(state, here);
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
  },
  shouldPan() {
    // Cautious skips panning — period: didn't dawdle on speculative
    // money when the calendar was tight. Survival > opportunism.
    return false;
  },
  shouldRaid() {
    // Cautious never raids. Period: emigrant captains who shot first
    // got their entire company killed (Whitman 1847). The math is
    // 70% bad even before the revenge ambush.
    return false;
  },
  shouldStealFromTrain() {
    // Cautious never steals — the 50% caught outcome means
    // banishment, which on the trail meant death. The trade is bad
    // even at 100% reward.
    return false;
  }
};

export const balancedPersona: Persona = {
  id: 'balanced',
  pickEventChoice(state, event) {
    // Balanced takes the marked default for most events but still
    // routes around the "risk-drink" health trap — period emigrants
    // (and any sane modern player) chose the upstream walk over the
    // cholera roll. Aggressive overrides this; balanced doesn't.
    return saferHealthChoice(state, event) ?? defaultChoice(state, event);
  },
  pickPace() {
    return 'moderate';
  },
  pickRations() {
    return 'normal';
  },
  shouldRest(state) {
    // Profession-aware: a Doctor dampens condition damage 30% (engine
    // #154), so the bot can run a thinner HP margin without spiraling.
    // Hunter doesn't change rest — they help food, not health.
    const hpFloor = hasLiveDoctor(state) ? 30 : 40;
    return minPartyHealth(state) < hpFloor
      || state.morale < 20
      || oxenWornOut(state);
  },
  shouldHunt(state) {
    // Lifted from <50 in v8 — bot was waiting until it was already
    // starving to hunt. Below 100 lb total, a 3-person party has
    // less than 7 days of food left. Hunt proactively.
    // v9 profession-aware: a live Hunter gets +20% meat per haul
    // (engine #154), so it's worth hunting earlier — bigger threshold
    // means more total trips and more total meat over the run.
    const threshold = hasLiveHunter(state) ? 150 : 100;
    return canHunt(state) && foodOnHand(state) < threshold;
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
    return foodOnHand(state) < 60
      || postStocksMissingWarmthGear(state, here)
      || postStocksMissingMedicine(state, here)
      || postStocksMissingEquipment(state, here)
      || postStocksLowSaleratus(state, here);
  },
  shouldStayAtInn(state, here) {
    return (here.services ?? []).includes('inn')
      && state.cash >= 10
      && (state.morale < 30 || minPartyHealth(state) < 50);
  },
  shouldFindWater(state) {
    return waterRatio(state) < 0.18 && state.location.terrain !== 'desert';
  },
  shouldPan(state) {
    // Balanced tries panning when the timing is right — period:
    // typical emigrant who'd give it an evening at a known creek.
    // Cooldown in canPanForGold prevents weekly spamming.
    return canPanForGold(state);
  },
  shouldRaid() {
    // Balanced never raids — same math as cautious. The bad outcome
    // is severe (party HP loss + every band hostile + revenge
    // ambush). No reasonable bot picks this fight.
    return false;
  },
  shouldStealFromTrain() {
    // Balanced never steals from the company — same expected-value
    // math, and trains are a survival multiplier (#290 departures
    // hurt). Burning the whole train for one whiskey isn't balanced.
    return false;
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
    // Aggressive still respects oxen — burning the team to extinction
    // is not "aggressive", it's just a stuck wagon.
    return minPartyHealth(state) < 20 || oxenWornOut(state);
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
  },
  shouldPan(state) {
    // Aggressive bot has Gold Rush fever — pans every chance.
    // Period: the desperate-prospector personality, which most often
    // ended up broke or dead.
    return canPanForGold(state);
  },
  shouldRaid() {
    // Even aggressive refuses. The fight isn't aggressive vs.
    // cautious — it's "do you want every band west of Laramie
    // hunting you for the next 800 miles?" The 30/70 math is
    // worse than fording the Snake without a cable.
    return false;
  },
  shouldStealFromTrain() {
    // Aggressive doesn't burn the company down for a sack of
    // sugar. Hoarding ≠ thieving from the people you travel with.
    return false;
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
  },
  shouldPan(state, rng) {
    // Chaos pans 30% of eligible days regardless of cooldown — gates
    // are still on year/terrain/miles to keep it sane (no panning at
    // the Big Blue), but spam-frequency varies to exercise the action.
    if (state.date.year < 1849) return false;
    if (state.location.terrain !== 'river') return false;
    if (state.location.milesTraveled < 700) return false;
    return rng.chance(0.30);
  },
  shouldRaid(_state, rng) {
    // Chaos rolls 5% — exercises the path so the camp action and
    // revenge-ambush event get fuzz-tested. The camp action's own
    // availability gates still cover rifle/ammo/tribe-nearby/year.
    return rng.chance(0.05);
  },
  shouldStealFromTrain(state, rng) {
    // Chaos rolls 3% — fuzz-cover so the catch + departure cascade
    // gets exercised in bot runs. Availability gate still requires
    // an actual wagon train with live companions.
    if (!state.wagonTrain) return false;
    if (state.wagonTrain.companions.filter((c) => c.outcome === 'in-progress').length === 0) {
      return false;
    }
    return rng.chance(0.03);
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
