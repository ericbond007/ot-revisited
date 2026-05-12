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
import { getWagon } from '../content/wagons';
import { ABANDON_PRIORITY } from '../systems/item-loss';
import { isSunday } from '../utils/calendar';
import type { FordMethod, Persona, PersonaForesight, PersonaId } from './types';
import type { FoodRestockOpts } from './shopping';
import { gapBufferDays, nextSupplyDistance } from './foresight';

/** Period basket consumption: flour 1.0 + bacon 0.3 + beans 0.15 +
 *  minor staples ≈ 1.5 lb/eater/day. Used by gap-aware food helpers
 *  to convert "days of food needed" into a pound threshold. */
const RAW_BASKET_LB_PER_DAY = 1.5;

/** #934 — Project the persona's expected days-to-next-supply-post.
 *  The single primitive every gap-aware decision builds on. */
function projectGapDays(state: GameState, fs: PersonaForesight): number {
  return gapBufferDays(nextSupplyDistance(state), {
    paceMiPerDay: fs.paceMiPerDay,
    safetyFactor: fs.safetyFactor,
    minDays: 0
  });
}

/** #932 — Gap-aware FoodRestockOpts. Floor is the max of the persona's
 *  base floor and the projected days-to-next-supply. Cap is floor +
 *  persona buffer, never below the base cap (short upcoming gaps don't
 *  shrink the restock target below the v10 default). */
function gapAwareFoodOpts(
  state: GameState,
  fs: PersonaForesight,
  base: { daysFloor: number; daysCap: number; saleratusOverstock?: boolean }
): FoodRestockOpts {
  const buffer = base.daysCap - base.daysFloor;
  const daysFloor = Math.max(base.daysFloor, projectGapDays(state, fs));
  const daysCap = Math.max(base.daysCap, daysFloor + buffer);
  return base.saleratusOverstock
    ? { daysFloor, daysCap, saleratusOverstock: true }
    : { daysFloor, daysCap };
}

/** #933 — Gap-aware food trigger (lb) for shouldTradeAtPost. */
function gapAwareFoodTrigger(
  state: GameState,
  fs: PersonaForesight,
  baseMinLb: number
): number {
  const eaters = state.party.filter((m) => !m.dead).length || 1;
  const gapLb = projectGapDays(state, fs) * eaters * RAW_BASKET_LB_PER_DAY;
  return Math.max(baseMinLb, gapLb);
}

/** #934 — Gap-aware ox health floor for pickOxSwapCount. At posts
 *  before a long supply-less leg, raise the "worn enough to swap"
 *  threshold so the persona refreshes the team preemptively. The
 *  thinThreshold (target team size) stays at the persona's base —
 *  gap doesn't change "how big a team I run," it changes "how worn
 *  is too worn to enter a 300-mile dead zone with."
 *  Period: emigrants knew the long legs (Hall→Boise dry plains,
 *  Boise→Whitman Blue Mountains) and traded for fresh teams at the
 *  last resupply even when the current team was technically still
 *  pulling. */
function gapAwareOxHealthFloor(
  state: GameState,
  base: { healthFloor: number; bigGapMiles: number; bigGapHealthBoost: number }
): number {
  return nextSupplyDistance(state) >= base.bigGapMiles
    ? base.healthFloor + base.bigGapHealthBoost
    : base.healthFloor;
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
 *  medicine — chronic cholera/typhoid/dysentery cycles trap the run.
 *  #275 v10 — thresholds calibrated to Marcy 1859: a 5-person family
 *  on a 6-month journey carried 30-60 doses of each major drug. The
 *  pre-v10 thresholds of <3/<2 were a fraction of period reality and
 *  trapped the bot in chronic-disease rest cycles past Bridger. */
function postStocksMissingMedicine(state: GameState, here: Landmark): boolean {
  const stock = new Set(here.stock ?? []);
  const inv = state.inventory;
  if (stock.has('quinine') && (inv.quinine ?? 0) < 8) return true;
  if (stock.has('bandages') && (inv.bandages ?? 0) < 6) return true;
  if (stock.has('laudanum') && (inv.laudanum ?? 0) < 4) return true;
  if (stock.has('calomel') && (inv.calomel ?? 0) < 5) return true;
  if (stock.has('paregoric') && (inv.paregoric ?? 0) < 4) return true;
  if (stock.has('dovers_powder') && (inv.dovers_powder ?? 0) < 3) return true;
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

/** Decide how many fresh oxen the bot should acquire at this post.
 *  Returns 0 unless the team is genuinely thin or worn — emigrants
 *  didn't blow cash at Laramie if the team was holding. Reads the
 *  wagon's minTeam from state.wagon.model — that's the floor where
 *  movement stops, so we want a buffer of at least 2 above it. */
function pickOxSwapCountFor(
  state: GameState,
  thinThreshold: number,
  healthFloor: number
): number {
  const minTeam = getWagon(state.wagon.model).minTeam;
  const alive = state.oxen.filter((o) => o.health > 0);
  const aliveCount = alive.length;
  if (aliveCount === 0) return Math.max(2, minTeam + 1);
  const avgHealth = alive.reduce((a, o) => a + o.health, 0) / aliveCount;
  // Two trigger conditions: thin team OR worn-down team.
  const tooThin = aliveCount < minTeam + thinThreshold;
  const tooWorn = avgHealth < healthFloor;
  if (!tooThin && !tooWorn) return 0;
  // Target = minTeam + thinThreshold (a comfortable buffer) - aliveCount.
  // For worn-team trigger, swap 2 to refresh the average.
  const need = Math.max(0, (minTeam + thinThreshold) - aliveCount);
  return tooThin ? Math.max(1, need) : 2;
}

// --- #303c slice B default helpers ---
// Each method that's purely a refactor (current behavior preserved)
// gets a `defaultX` helper here. Personas call these unless they want
// to override. Future #287 named profiles override per character.

function defaultShouldJoinTrain(): boolean {
  // Period reality: every emigrant joined a company at the first
  // gathering point. Train benefits (morale, smithy, pace clamp)
  // stack positive for any sensible bot. #287 loner profiles override.
  return true;
}

function defaultShouldBuyCookwareSpare(state: GameState, here: Landmark): boolean {
  // Mirrors the cookware portion of postStocksMissingEquipment. When
  // the post stocks cookware AND the bot has none, buy. Cookware loss
  // (#306 buffalo stampede) makes this important.
  const stock = new Set(here.stock ?? []);
  return stock.has('cookware') && (state.inventory.cookware ?? 0) < 1;
}

function defaultShouldBuySaleratus(state: GameState, here: Landmark): boolean {
  // Mirrors postStocksLowSaleratus. Bot starts with 4 units (~133 days
  // for 3 eaters); refill before the chest goes dry.
  const stock = new Set(here.stock ?? []);
  if (!stock.has('saleratus')) return false;
  return (state.inventory.saleratus ?? 0) < 2;
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
export function choiceMatching(state: GameState, event: GameEvent, ...patterns: RegExp[]): string | null {
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
  foresight: { paceMiPerDay: 8, safetyFactor: 1.5 },
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
    // #922 — Sabbath observance. Period: Tabitha Brown / Methodist
    // emigrants kept the Sabbath strictly. The deliberate Sunday rest
    // also feeds the +10/day morale lift introduced in #922.
    // #924 — voluntary-rest triggers tightened (HP 45→30, morale
    // 25→15). With Sunday-rest now default + #922 morale recovery,
    // pre-tune triggers fired 4× period reality. Pushing through low
    // HP with the #922 healingMultiplier softening is now viable.
    if (isSunday(state.date)) return true;
    return minPartyHealth(state) < 30
      || state.morale < 15
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
    return foodOnHand(state) < gapAwareFoodTrigger(state, this.foresight, 100)
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
    // #920 → 0.5 → 0.30. #926 → 0.30 → 0.15. With passive ambient
    // refill on travel days (river / forest / prairie / mountain
    // terrains) and full keg refill at every ford, the keg now stays
    // topped through ordinary travel. The 0.15 trigger reserves
    // findWater for genuinely dry stretches where ambient sources
    // aren't enough.
    return waterRatio(state) < 0.15 && state.location.terrain !== 'desert';
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
  },
  pickOxSwapCount(state, here) {
    if (!(here.services ?? []).includes('ox_swap')) return 0;
    // Cautious wants a generous buffer (2 above minTeam) and refreshes
    // worn teams aggressively (health <70). Survival-first. #934 —
    // gap-aware: at posts before a long leg (≥150 mi), bump the
    // worn-team threshold to 85 so cautious refreshes even a healthy-
    // looking 70-health team before entering Kearny→Robidoux etc.
    const healthFloor = gapAwareOxHealthFloor(state, {
      healthFloor: 70,
      bigGapMiles: 150,
      bigGapHealthBoost: 15
    });
    return pickOxSwapCountFor(state, 2, healthFloor);
  },
  pickRepairBudget(state, here) {
    // Cautious repairs early, spends generously. Period: emigrant
    // captains who treated the wagon as the load-bearing asset.
    if (!(here.services ?? []).includes('blacksmith')) return 0;
    if (state.wagon.condition >= 75) return 0;
    if (state.cash < 20) return 0;
    return Math.min(40, state.cash, Math.round(100 - state.wagon.condition));
  },
  pickFoodRestockOpts(state) {
    return gapAwareFoodOpts(state, this.foresight, {
      daysFloor: 30,
      daysCap: 90,
      saleratusOverstock: true
    });
  },
  pickEquipmentRestockOpts() {
    // #909 — Tabitha Brown carried backups of load-bearing kit.
    // Cautious is the only stock persona that carries a spare
    // cookware against #306 buffalo-stampede loss.
    return { cookwareSpare: true };
  },
  shouldJoinTrain: defaultShouldJoinTrain,
  shouldBuyCookwareSpare: defaultShouldBuyCookwareSpare,
  shouldBuySaleratus: defaultShouldBuySaleratus,
  shouldCannibalize() {
    // Default true — even the most period-cautious party (Donner survivors,
    // who also fit the cautious profile) cannibalized when nothing else
    // remained. Personality refusal lives in #287 (preacher).
    return true;
  },
  pickNpcEventChoice() {
    // Surface only — no current choice-bearing NPC events.
    return null;
  },
  mudAbandonmentPriority() {
    return ABANDON_PRIORITY;
  }
};

export const balancedPersona: Persona = {
  id: 'balanced',
  foresight: { paceMiPerDay: 10, safetyFactor: 1.2 },
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
    // #922 — Sabbath observance. Period: most emigrant companies
    // (Bryant 1846, Carpenter 1857, Palmer 1845) kept Sunday rest
    // by default. The pace-pusher / Reed archetype that PUSHED past
    // Sundays was noted as deliberate and reckless, not standard.
    // Aggressive overrides this; the balanced default holds Sunday.
    // #924 — voluntary-rest triggers tightened (HP 40/30 → 25/15,
    // morale 20→10). Sunday-rest covers the recovery cadence;
    // voluntary rest now reserved for genuine crises.
    if (isSunday(state.date)) return true;
    const hpFloor = hasLiveDoctor(state) ? 15 : 25;
    return minPartyHealth(state) < hpFloor
      || state.morale < 10
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
    return foodOnHand(state) < gapAwareFoodTrigger(state, this.foresight, 60)
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
    // #926 → 0.18 → 0.10. Same logic as cautious — passive ambient
    // refill keeps the keg topped through ordinary travel.
    return waterRatio(state) < 0.10 && state.location.terrain !== 'desert';
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
  },
  pickOxSwapCount(state, here) {
    if (!(here.services ?? []).includes('ox_swap')) return 0;
    // #930 — thinThreshold=2 targets optimalTeam (4 for prairie
    // schooner) to recover the 25% travel-speed penalty of a 3-ox
    // team. #934 — gap-aware: at ≥150 mi gaps, bump health floor
    // 55 → 75 so balanced refreshes mid-life teams before long legs.
    const healthFloor = gapAwareOxHealthFloor(state, {
      healthFloor: 55,
      bigGapMiles: 150,
      bigGapHealthBoost: 20
    });
    return pickOxSwapCountFor(state, 2, healthFloor);
  },
  pickRepairBudget(state, here) {
    // Balanced is thriftier than cautious — repairs at <60 (vs 75)
    // and caps spend at $30 (vs 40). Frees ~$10/post for medicine
    // and food, addressing the v10 cash-pressure regression.
    if (!(here.services ?? []).includes('blacksmith')) return 0;
    if (state.wagon.condition >= 60) return 0;
    if (state.cash < 15) return 0;
    return Math.min(30, state.cash, Math.round(100 - state.wagon.condition));
  },
  pickFoodRestockOpts(state) {
    return gapAwareFoodOpts(state, this.foresight, { daysFloor: 25, daysCap: 60 });
  },
  pickEquipmentRestockOpts() {
    // #909 — no spare cookware by default. Inheritor personas
    // (sunday_rester / pace_pusher / hoarder / generous / faithful /
    // drinker) pick this up via `...balancedPersona`.
    return {};
  },
  shouldJoinTrain: defaultShouldJoinTrain,
  shouldBuyCookwareSpare: defaultShouldBuyCookwareSpare,
  shouldBuySaleratus: defaultShouldBuySaleratus,
  shouldCannibalize: () => true,
  pickNpcEventChoice: () => null,
  mudAbandonmentPriority: () => ABANDON_PRIORITY
};

export const aggressivePersona: Persona = {
  id: 'aggressive',
  foresight: { paceMiPerDay: 12, safetyFactor: 1.0 },
  pickEventChoice(state, event) {
    // Aggressive refuses tolls, pushes through, hoards.
    return choiceMatching(state, event, /refuse/i, /push/i, /pass/i, /ignore/i, /wave/i)
      ?? defaultChoice(state, event);
  },
  pickPace(state) {
    if (minPartyHealth(state) < 30) return 'moderate';
    // #275 v10b — back off pace when oxen are stressed. Period reality:
    // even hard-driving emigrants (the parties that "pushed" per the
    // diaries) read the team — a smart driver knew grueling pace on a
    // worn ox team killed the wagon. Aggressive without this tweak ran
    // grueling at 70+ fatigue, lost oxen between non-swap posts, and
    // wiped before Laramie.
    if (oxenWornOut(state)) return 'moderate';
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
  shouldTradeAtPost(state, here) {
    // #916 — recalibrated. Period reality: Bidwell 1841 / Reed 1846
    // didn't skip forts — they bought lean. The "small purchases"
    // disposition is already encoded in pickFoodRestockOpts {15, 45}.
    // shouldTradeAtPost gates on REAL need (food critical, missing
    // gear) — tighter than balanced's "moderate need" thresholds.
    if (state.cash < 10) return false;
    return foodOnHand(state) < gapAwareFoodTrigger(state, this.foresight, 40)
      || postStocksMissingWarmthGear(state, here)
      || postStocksMissingMedicine(state, here)
      || postStocksMissingEquipment(state, here);
  },
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
  },
  pickOxSwapCount(state, here) {
    // Aggressive runs lean teams — only swaps below minTeam in
    // normal conditions. #934 — gap-aware: at ≥200 mi gaps (Kearny→
    // Robidoux, Hall→Boise, Boise→Whitman), even aggressive bumps
    // the health floor 30 → 55 because slow-walking the dead zone
    // costs more days than the swap costs cash.
    if (!(here.services ?? []).includes('ox_swap')) return 0;
    const healthFloor = gapAwareOxHealthFloor(state, {
      healthFloor: 30,
      bigGapMiles: 200,
      bigGapHealthBoost: 25
    });
    return pickOxSwapCountFor(state, 0, healthFloor);
  },
  pickRepairBudget(state, here) {
    // Aggressive only repairs when the wagon is genuinely failing
    // (<40) and caps spend at $20. Per the persona — push hard, fix
    // only what's about to break the journey. Period: the parties
    // that limped into Oregon City with cracked frames.
    if (!(here.services ?? []).includes('blacksmith')) return 0;
    if (state.wagon.condition >= 40) return 0;
    if (state.cash < 10) return 0;
    return Math.min(20, state.cash, Math.round(100 - state.wagon.condition));
  },
  pickFoodRestockOpts(state) {
    return gapAwareFoodOpts(state, this.foresight, { daysFloor: 15, daysCap: 45 });
  },
  pickEquipmentRestockOpts() {
    // #909 — Bidwell-1841 lean: no spare cookware.
    return {};
  },
  shouldJoinTrain: defaultShouldJoinTrain,
  shouldBuyCookwareSpare(state, here) {
    // Aggressive packs lean — single cookware, no spare. The emergency
    // post-loss path can buy a replacement at the next post.
    if (!defaultShouldBuyCookwareSpare(state, here)) return false;
    // Already has 0 → still buy the first one (won't have eaten paste).
    return true;
  },
  shouldBuySaleratus: defaultShouldBuySaleratus,
  shouldCannibalize: () => true,
  pickNpcEventChoice: () => null,
  mudAbandonmentPriority: () => ABANDON_PRIORITY
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
  // Neutral foresight — chaos's behaviour is dominated by the rng
  // rolls in its other decisions. The shared gap-aware helpers still
  // need a valid identity (paceMi=10, safety=1.0) for any baseline
  // call that doesn't get overridden.
  id: 'chaos',
  foresight: { paceMiPerDay: 10, safetyFactor: 1.0 },
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
  },
  pickOxSwapCount(_state, here, rng) {
    if (!(here.services ?? []).includes('ox_swap')) return 0;
    // Chaos randomly buys 0-3 fresh oxen each visit. Doesn't care if
    // the team is fresh — fuzz coverage of the swap action.
    return rng.int(0, 3);
  },
  pickRepairBudget(state, here) {
    // Chaos: random budget 0-50 regardless of condition.
    if (!(here.services ?? []).includes('blacksmith')) return 0;
    // No rng available here on the helper signature (Persona.pickRepairBudget
    // doesn't take rng) — derive a pseudo-random from state.day so chaos
    // is still deterministic per seed. Modulo 7 for a [0..50] range with
    // 0 representing "skip this stop."
    const cap = (state.day * 17) % 7 * 8;
    return Math.min(cap, state.cash);
  },
  pickFoodRestockOpts(state) {
    // Chaos: wide swings — small or huge restock, deterministic on day.
    // #909 — saleratusOverstock cycles every 5 days for fuzz coverage
    // independent of the food-cap swing.
    const swing = state.day % 3;
    const saleratusOverstock = state.day % 5 === 0;
    if (swing === 0) return { daysFloor: 10, daysCap: 30, saleratusOverstock };
    if (swing === 1) return { daysFloor: 30, daysCap: 90, saleratusOverstock };
    return { daysFloor: 60, daysCap: 180, saleratusOverstock };
  },
  pickEquipmentRestockOpts(state) {
    // #909 — chaos cookware-spare cycles every 3 days. Deterministic
    // by day for fuzz reproducibility.
    return { cookwareSpare: state.day % 3 === 0 };
  },
  shouldJoinTrain(_state, _here, rng) {
    // Chaos joins about 70% of the time — fuzz coverage of both paths.
    return rng.chance(0.7);
  },
  shouldBuyCookwareSpare(state, here) {
    // Roll the standard predicate but with a 50% accept rate even
    // when the post stocks a needed cookware.
    return defaultShouldBuyCookwareSpare(state, here);
  },
  shouldBuySaleratus(state, here) {
    return defaultShouldBuySaleratus(state, here);
  },
  shouldCannibalize: () => true,
  pickNpcEventChoice() {
    return null; // surface-only
  },
  mudAbandonmentPriority: () => ABANDON_PRIORITY
};

// === #287b — named-profile variants ===
//
// Each variant inherits balanced behavior via spread, then overrides
// the methods that express its signature trait. Period anchors live
// on the bot-profiles dossier (docs/handoff/bot-profiles-dossier.md).

/** sunday_rester — lays by every Sunday. Period: Whitman missionaries,
 *  Sager family under Whitman protection. The Sabbath was non-negotiable.
 *  Other days: balanced behavior. */
export const sundayResterPersona: Persona = {
  ...balancedPersona,
  id: 'sunday_rester',
  shouldRest(state, rng) {
    if (isSunday(state.date)) return true;
    return balancedPersona.shouldRest(state, rng);
  }
};

/** pace_pusher — grueling when healthy. Period: James Reed pushed for
 *  the Hastings Cutoff to save time; Lansford Hastings promoted his
 *  unproven shortcut on speed grounds. Pushes pace, skimps on rest
 *  unless the team is genuinely failing. */
export const pacePusherPersona: Persona = {
  ...balancedPersona,
  id: 'pace_pusher',
  pickPace(state) {
    if (minPartyHealth(state) >= 70 && !oxenWornOut(state)) return 'grueling';
    if (minPartyHealth(state) >= 50) return 'fast';
    return 'moderate';
  },
  shouldRest(state) {
    // Only rest when the team is actually failing — not on the cautious
    // 45/25 trigger. Period: Reed pushed past prudent rest limits.
    return minPartyHealth(state) < 30 || oxenWornOut(state);
  }
};

/** hoarder — supply-stockpiler. Deep saleratus reserves, spare
 *  cookware, never trades the team for fresh oxen ("don't give up
 *  what's mine"). Period archetype: the prepper-style emigrant who
 *  filled the wagon at outfit and topped off at every fort.
 *
 *  NOTE: pickFoodRestockOpts and pickRepairBudget are inherited from
 *  pre-#909 behavior (tight food cap, low repair) which read more
 *  "cash-frugal" than "supply-stockpiler." The full redefinition
 *  lives in VK #912 (introducing a separate `sparing` persona for
 *  the cash-frugal archetype + bumping hoarder's food cap). #909
 *  only flips the saleratus + cookware dispositions. */
export const hoarderPersona: Persona = {
  ...balancedPersona,
  id: 'hoarder',
  pickFoodRestockOpts() {
    // Tight floor + tight cap (pre-#909 behavior, kept until #912
    // bumps the cap to match a stockpiler's deeper stash). #909 —
    // saleratusOverstock true: hoarder packs the saleratus tin
    // generously even while keeping flour days light.
    return { daysFloor: 15, daysCap: 30, saleratusOverstock: true };
  },
  pickEquipmentRestockOpts() {
    // #909 — stockpiler carries spare cookware against #306
    // buffalo-stampede loss.
    return { cookwareSpare: true };
  },
  pickOxSwapCount() {
    // Never swap. Hoarder keeps the team they have, even when the post
    // offers fresh stock.
    return 0;
  },
  pickRepairBudget(state, here) {
    // Half balanced's repair budget — hoarder defers maintenance.
    if (!(here.services ?? []).includes('blacksmith')) return 0;
    if (state.wagon.condition >= 60) return 0;
    if (state.cash < 10) return 0;
    return Math.min(15, state.cash);
  }
};

/** generous — invests in the team and the wagon. Period: George Donner,
 *  captain by acclamation, distributed food freely; Tamzene continued
 *  even as their own stores ran low. High pickOxSwapCount (always wants
 *  a fresh, healthy team) + generous repair budget. */
export const generousPersona: Persona = {
  ...balancedPersona,
  id: 'generous',
  pickOxSwapCount(state, here) {
    if (!(here.services ?? []).includes('ox_swap')) return 0;
    // Generous mirrors cautious — wants 2 above minTeam, refreshes
    // worn at <70 health. #934 — gap-aware at the same bigGap shape
    // as cautious (+15 at ≥150 mi).
    const healthFloor = gapAwareOxHealthFloor(state, {
      healthFloor: 70,
      bigGapMiles: 150,
      bigGapHealthBoost: 15
    });
    return pickOxSwapCountFor(state, 2, healthFloor);
  },
  pickRepairBudget(state, here) {
    // 1.5× balanced — generous spends to keep the wagon running.
    if (!(here.services ?? []).includes('blacksmith')) return 0;
    if (state.wagon.condition >= 75) return 0;
    if (state.cash < 20) return 0;
    return Math.min(45, state.cash, Math.round((100 - state.wagon.condition) * 1.5));
  },
  shouldJoinTrain() {
    // Always joins — generous is a team player.
    return true;
  }
};

/** faithful — Sundays off (like sunday_rester) AND prefers prayer-flavored
 *  event choices. Period: Sager family under Whitman protection; Catherine
 *  Sager's memoir records constant prayer + community dependence. */
export const faithfulPersona: Persona = {
  ...balancedPersona,
  id: 'faithful',
  shouldRest(state, rng) {
    if (isSunday(state.date)) return true;
    return balancedPersona.shouldRest(state, rng);
  },
  pickEventChoice(state, event, rng) {
    // Prefer scripture / prayer / preacher choices when offered.
    const devout = choiceMatching(
      state, event,
      /pray/i, /scripture/i, /preach/i, /service/i, /faith/i, /bless/i, /funeral/i
    );
    if (devout) return devout;
    return balancedPersona.pickEventChoice(state, event, rng);
  },
  shouldCannibalize() {
    // #907 — period reality: the Whitman missionaries and Sager
    // family under their care refused to eat their dead even at the
    // worst of the 1846-47 winter. Catherine Sager's memoir records
    // funerals over corpses no one would touch. Faithful wagons take
    // the starvation deaths over the moral break.
    return false;
  }
};

/** drinker — prefers whiskey-flavored choices, lingers at posts with inns.
 *  Period: Joe Meek archetype — the ex-mountain-man for whom morale
 *  centered on the bottle. */
export const drinkerPersona: Persona = {
  ...balancedPersona,
  id: 'drinker',
  pickEventChoice(state, event, rng) {
    const drink = choiceMatching(
      state, event,
      /whiskey/i, /drink/i, /toast/i, /celebrate/i, /pass the bottle/i
    );
    if (drink) return drink;
    return balancedPersona.pickEventChoice(state, event, rng);
  },
  shouldStayAtInn(state, here) {
    // Lower the morale threshold — drinker stops at any inn for a drink
    // even when the party doesn't strictly need rest.
    return (here.services ?? []).includes('inn')
      && state.cash >= 5
      && (state.morale < 70 || minPartyHealth(state) < 80);
  }
};

export const PERSONAS: Record<PersonaId, Persona> = {
  cautious: cautiousPersona,
  balanced: balancedPersona,
  aggressive: aggressivePersona,
  chaos: chaosPersona,
  sunday_rester: sundayResterPersona,
  pace_pusher: pacePusherPersona,
  hoarder: hoarderPersona,
  generous: generousPersona,
  faithful: faithfulPersona,
  drinker: drinkerPersona
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
