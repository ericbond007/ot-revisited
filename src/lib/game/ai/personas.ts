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

import type { GameState, ConditionId } from '../types';
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
// #939l — ABANDON_PRIORITY import dropped with `mudAbandonmentPriority`.
// `systems/item-loss.ts` exports the constant directly; restore the
// import + a Persona method when a profile actually overrides the
// drop order.
import { isSunday } from '../utils/calendar';
import type { FordMethod, Persona, PersonaForesight, PersonaId } from './types';
import type { FoodRestockOpts } from './shopping';
import { gapBufferDays, nextSupplyDistance, effectiveGapMiles, desertWaterFloor } from './foresight';
import { warmthFor } from '../systems/warmth';
import { quoteBarter, BARTER_RATE_FLOOR } from '../systems/barter';
import type { BarterDisposition } from './types';

/** Period basket consumption: flour 1.0 + bacon 0.3 + beans 0.15 +
 *  minor staples ≈ 1.5 lb/eater/day. Used by gap-aware food helpers
 *  to convert "days of food needed" into a pound threshold. */
const RAW_BASKET_LB_PER_DAY = 1.5;

/** #934 + #963 — Project the persona's expected days for food
 *  planning. Uses `effectiveGapMiles` so late-trail decisions see
 *  the whole remaining run, not just the next post. */
function projectGapDays(state: GameState, fs: PersonaForesight): number {
  return gapBufferDays(effectiveGapMiles(state), {
    paceMiPerDay: fs.paceMiPerDay,
    safetyFactor: fs.safetyFactor,
    minDays: 0
  });
}

/** Total trail miles (Independence → Oregon City). See
 *  `content/landmarks.ts` — sum of milesFromPrevious. Used by
 *  #963 trail-progress scaling on food restocks. */
const TOTAL_TRAIL_MI = 2195;

/** #963 — Trail-progress multiplier on food restock cap.
 *
 *  Initial framing: drop early-trail caps to save cash for late
 *  posts. Tested 0.65×/0.85×/1.0× tier — sweep showed miles DOWN
 *  ~80-130 because the bot was under-stocking food at early posts
 *  (where it's cheapest) and reaching mid-trail with less buffer.
 *
 *  Revised framing: front-load at early posts (where food is
 *  cheapest), front-line the late ones. Period reality: emigrants
 *  who outfitted lavishly at Independence then ran lean at the forts
 *  fared better than those who tried to skim early. Bryant 1846:
 *  "We came out of St. Louis heavy and arrived at Fort Bridger
 *  light, by design — every pound of flour cost double the further
 *  west we went."
 *
 *  Below 700 mi remaining = late trail, 1.3× (last shot, fill the wagon).
 *  700-1500 mi remaining = mid trail, 1.0×.
 *  >1500 mi remaining = early trail, 1.0× (default). */
function trailProgressCapMult(state: GameState): number {
  const milesRemaining = TOTAL_TRAIL_MI - state.location.milesTraveled;
  if (milesRemaining < 700) return 1.3;
  return 1.0;
}

/** #932 — Gap-aware FoodRestockOpts. Floor is the max of the persona's
 *  base floor and the projected days-to-next-supply. Cap is floor +
 *  persona buffer, never below the base cap (short upcoming gaps don't
 *  shrink the restock target below the v10 default).
 *
 *  #963 — Cap further modulated by trail-progress so early-trail
 *  restocks don't drain cash that's needed for the back half. */
function gapAwareFoodOpts(
  state: GameState,
  fs: PersonaForesight,
  base: { daysFloor: number; daysCap: number; saleratusOverstock?: boolean }
): FoodRestockOpts {
  const buffer = base.daysCap - base.daysFloor;
  const daysFloor = Math.max(base.daysFloor, projectGapDays(state, fs));
  const rawCap = Math.max(base.daysCap, daysFloor + buffer);
  const daysCap = Math.max(daysFloor, Math.round(rawCap * trailProgressCapMult(state)));
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
 *  pulling.
 *
 *  #963 — uses `effectiveGapMiles` so the late-trail posts (Hall,
 *  Bridger after Sublette) evaluate against the whole remaining
 *  run, not just the next leg. At Hall the next leg is only 289mi
 *  to Boise, but Boise→Oregon City is another 644mi of mountains
 *  + desert. The original `nextSupplyDistance ≥ 150` already
 *  triggered at Hall, but the same threshold also fires at every
 *  intermediate post — using effective gap raises the bar
 *  proportionally for the genuinely long remaining runs. */
function gapAwareOxHealthFloor(
  state: GameState,
  base: { healthFloor: number; bigGapMiles: number; bigGapHealthBoost: number }
): number {
  return effectiveGapMiles(state) >= base.bigGapMiles
    ? base.healthFloor + base.bigGapHealthBoost
    : base.healthFloor;
}

/** #935 — Gap-aware wagon-condition trigger for pickRepairBudget. At
 *  posts before a long supply-less leg, raise the "worn enough to
 *  repair" threshold so the persona tops up the wagon preemptively.
 *  Cap on spend stays unchanged (it's already gated by cash +
 *  100-condition); only the trigger condition shifts.
 *  Period: emigrants who knew they were heading into Sublette Cutoff
 *  or the Blue Mountains topped off the wagon at the last smithy
 *  regardless of whether anything was visibly failing. */
function gapAwareRepairTrigger(
  state: GameState,
  base: { conditionTrigger: number; bigGapMiles: number; bigGapConditionBoost: number }
): number {
  return nextSupplyDistance(state) >= base.bigGapMiles
    ? base.conditionTrigger + base.bigGapConditionBoost
    : base.conditionTrigger;
}

/** Lowest-health alive party member's HP. Defaults to 100 when nobody alive. */
function minPartyHealth(state: GameState): number {
  const alive = state.party.filter((m) => !m.dead);
  if (alive.length === 0) return 100;
  return Math.min(...alive.map((m) => m.health));
}

/** #921 — the fast-killing disease cluster: cholera (−7/day), typhoid
 *  (−4), dysentery (−3). Explicitly the set the #921 audit named — not
 *  derived from `dailyHealthDelta` so it doesn't also catch one-off
 *  trauma (snakebite/bear_mauling) that resting doesn't fix. These are
 *  the conditions #161 documents as "survivable with 2-3 days of rest"
 *  for a fed/watered party — i.e. exactly the spirals a timely rest
 *  trigger can break. */
const SEVERE_CONDITIONS = new Set<ConditionId>(['cholera', 'typhoid', 'dysentery']);
function partyHasSevereCondition(state: GameState): boolean {
  return state.party.some(
    (m) => !m.dead && m.conditions.some((c) => SEVERE_CONDITIONS.has(c.id))
  );
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
 *  shovel / water_bag are also worth catching since they each have
 *  a downstream gameplay role. */
function postStocksMissingEquipment(state: GameState, here: Landmark): boolean {
  const stock = new Set(here.stock ?? []);
  const inv = state.inventory;
  if (stock.has('cookware') && (inv.cookware ?? 0) < 1) return true;
  if (stock.has('shovel') && (inv.shovel ?? 0) < 1) return true;
  if (stock.has('rope') && (inv.rope ?? 0) < 1) return true;
  if (stock.has('water_bag') && (inv.water_bag ?? 0) < 1) return true;
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

/** #963a — Soft predicate: oxen are starting to tire but NOT yet at
 *  the forced-rest threshold. Used by push-pace personas to back off
 *  ONE RUNG before crossing into oxenWornOut, breaking the fatigue →
 *  forced-rest cycle that pinned aggressive/pace_pusher trace runs at
 *  36% travel days vs 51% rest. 50/40 thresholds sit ~20 below the
 *  worn-out 70/55 limits — enough lead time that a single downshift
 *  averts the rest trigger. */
function oxenTired(state: GameState): boolean {
  const alive = state.oxen.filter((o) => o.health > 0).length;
  if (alive === 0) return false;
  const softLimit = hasLiveTeamster(state) ? 40 : 50;
  return avgOxFatigue(state) > softLimit;
}

/** #963 follow-up: ANY single ox is in danger — fatigue near the HP-drain
 *  threshold (80) or health already dropping. Catches the "one ox is
 *  failing while team avg looks fine" case that bit pace_pusher post-#963b1
 *  (spare oxen + sustained fast pace → individual ox HP drain → ox dies
 *  → next ox absorbs the load → cascade). Avg-based oxenWornOut misses
 *  this because 5 healthy oxen mask one dying one. */
function anyOxStrained(state: GameState): boolean {
  // #963 H1 companion: health threshold bumped 70 → 75. With H1 slow
  // HP recovery, oxen heal back above 70 between events. The tighter
  // 75 threshold keeps pace_pusher catching oxen showing wear before
  // they're fully healed, while not over-triggering rest on cosmetic
  // damage. Fatigue gate (75) unchanged.
  return state.oxen.some((o) => o.health > 0 && (o.fatigue >= 75 || o.health < 75));
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

/** #915 — Default barter dispositions: trade surplus food + hides for
 *  medicine when cash is short and the post takes the offered item.
 *  Each persona's `pickBarterDispositions` calls this as a baseline
 *  and modifies the output for character flavor (cautious widens the
 *  food surplus threshold, hoarder strips flour out, drinker offers
 *  whiskey, etc.). Common shape so each persona stays terse. */
interface DefaultBarterOpts {
  /** Minimum food-on-hand to start offering food in barter. Cautious
   *  uses 300 (preserves a deep reserve), balanced 200, aggressive
   *  100, drinker uses balanced default. */
  foodSurplusThreshold: number;
  /** Cash floor below which the bot prioritizes barter over cash
   *  trade. Above this, only character-flavor barters fire. */
  cashFloor: number;
  /** Per-disposition rate floor. Stricter than the engine FLOOR for
   *  picky personas (aggressive: 0.80 — won't take soaking trades). */
  rateFloor: number;
  /** Items the persona refuses to give up regardless of post need.
   *  Hoarder protects flour/beans/saleratus. */
  protected: ReadonlySet<string>;
}

function defaultBarterOpts(): DefaultBarterOpts {
  return {
    foodSurplusThreshold: 200,
    cashFloor: 50,
    rateFloor: BARTER_RATE_FLOOR,
    protected: new Set()
  };
}

/** Build a barter wishlist: items the post wants × need-based
 *  receive items. Returns each candidate disposition (give-side
 *  picked from preferred + bot's surplus; receive-side picked from
 *  medicine / ammo / staples the bot is short on). Caller validates
 *  each via `quoteBarter` before applying. */
function buildBarterCandidates(
  state: GameState,
  here: Landmark,
  opts: DefaultBarterOpts
): BarterDisposition[] {
  if (here.barterEnabled === false) return [];
  const preferred = new Set(here.barterPreferred ?? []);
  const stock = new Set(here.stock ?? []);
  if (stock.size === 0 || preferred.size === 0) return [];

  // What the bot wants to receive — period priority order: medicine
  // first (life-saving), then ammo (hunting backup), then food if
  // cash is short. Skip items the post doesn't stock.
  const receivePriority: Array<{ item: string; qty: number; need: () => boolean }> = [
    { item: 'quinine',          qty: 2,  need: () => (state.inventory.quinine ?? 0) < 4 },
    { item: 'calomel',          qty: 2,  need: () => (state.inventory.calomel ?? 0) < 2 },
    { item: 'laudanum',         qty: 2,  need: () => (state.inventory.laudanum ?? 0) < 2 },
    { item: 'bandages',         qty: 4,  need: () => (state.inventory.bandages ?? 0) < 4 },
    { item: 'gunpowder',        qty: 10, need: () => (state.inventory.gunpowder ?? 0) < 20 },
    { item: 'lead_balls',       qty: 10, need: () => (state.inventory.lead_balls ?? 0) < 20 },
    { item: 'percussion_caps',  qty: 10, need: () => (state.inventory.percussion_caps ?? 0) < 20 },
    { item: 'flour',            qty: 30, need: () => state.cash < opts.cashFloor && (state.inventory.flour ?? 0) < 100 }
  ];

  // What the bot will give — preferred items it has surplus of.
  // Surplus rules:
  //   - game_meat, jerky, pemmican: give 20 lb if total food on hand
  //     is above `foodSurplusThreshold`
  //   - buffalo_robe, raw_hide: give 1 if the bot has any (luxury
  //     by-products of hunting; period emigrants stockpiled them
  //     specifically to trade)
  const food = foodOnHand(state);
  const give: BarterDisposition['give'][] = [];
  for (const item of preferred) {
    if (opts.protected.has(item)) continue;
    const have = state.inventory[item] ?? 0;
    if (have <= 0) continue;
    if (item === 'buffalo_robe' || item === 'raw_hide' || item === 'pelts') {
      give.push({ item, qty: 1 });
    } else if (item === 'game_meat' || item === 'jerky' || item === 'pemmican') {
      if (food >= opts.foodSurplusThreshold && have >= 20) {
        give.push({ item, qty: 20 });
      }
    }
  }
  if (give.length === 0) return [];

  const dispositions: BarterDisposition[] = [];
  for (const r of receivePriority) {
    if (!stock.has(r.item)) continue;
    if (!r.need()) continue;
    for (const g of give) {
      dispositions.push({ give: g, receive: r });
    }
  }
  return dispositions;
}

/** Shared default impl. Personas with no character flavor call this
 *  directly; flavored personas wrap it. */
function defaultPickBarterDispositions(
  state: GameState,
  here: Landmark,
  _rng: Rng
): BarterDisposition[] {
  return buildBarterCandidates(state, here, defaultBarterOpts());
}

// #939l — `defaultShouldBuyCookwareSpare` / `defaultShouldBuySaleratus`
// removed alongside the persona surface methods. Cookware-spare
// disposition now lives on `pickEquipmentRestockOpts.cookwareSpare`
// (#909); saleratus disposition on
// `pickFoodRestockOpts.saleratusOverstock`. Both flow through
// `shopping.ts:composeShoppingList`, so the one consumer reads from
// the one surface.

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
  // #1028 — paceMiPerDay 8 → 10 (matches balanced). Slow trigger
  // tightened from <50 HP to <20 HP means cautious now actually
  // sustains the moderate pace it picks; the old 8 reflected the
  // many slow-pace days that no longer fire.
  foresight: { paceMiPerDay: 10, safetyFactor: 1.5 },
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
    // #1028 — cautious was the biggest "alive but out of days" persona
    // (66% stalled / 19% arrived). Old `slow at <50 HP` burned too much
    // calendar: every minor illness dropped pace from 20 → 14 mi/day
    // base, often for multi-day condition stretches. A first cut to
    // `fast` baseline killed too many teams (the Sunday + voluntary
    // rest cadence didn't leave room for sustained fast travel).
    //
    // Final pass: keep `moderate` baseline but tighten the slow trigger
    // to truly emergency-level (min health < 20) or worn oxen. Tabitha
    // Brown / Pringle 1846 didn't drop to a crawl every time a party
    // member ran a fever — they pushed at moderate until something was
    // genuinely failing.
    if (minPartyHealth(state) < 20 || oxenWornOut(state)) return 'slow';
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
    // #963 — trigger lifted modestly (150→180 / 200→225). Aggressive
    // values traded too many travel days for marginal extra meat;
    // these threshold bumps cap hunts at ~9-10 per run vs the prior 7.
    const threshold = hasLiveHunter(state) ? 225 : 180;
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
    //
    // #1022 — desert exclusion removed. In desert the runner's
    // restWithWaterChain falls back to dig_well (40% success per
    // attempt, Marcy 1859: "a well of moderate depth will yield
    // water on most parts of the Plains").
    //
    // #1026 — desert bump 0.15 → 0.25. Higher than well-watered
    // terrain because dig_well misses 60% of attempts (Marcy 1859);
    // dialed back from a 0.40 first cut after the sweep showed 0.40
    // converted wipes into stalls (every extra rest day in the Snake
    // bench burns calendar). 0.25 keeps a ~2-day cushion against a
    // failed dig sequence without dawdling.
    return waterRatio(state) < desertWaterFloor(state, 0.15, 0.25);
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
    // #935 — gap-aware: at ≥150 mi gaps, accept condition up to 85
    // (vs base 75) so cautious tops off the wagon before long legs.
    if (!(here.services ?? []).includes('blacksmith')) return 0;
    const trigger = gapAwareRepairTrigger(state, {
      conditionTrigger: 75,
      bigGapMiles: 150,
      bigGapConditionBoost: 10
    });
    if (state.wagon.condition >= trigger) return 0;
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
  pickBarterDispositions(state, here, _rng) {
    // Cautious holds a deep food reserve; only barters food when
    // truly surplus (>300 lb). Trades robes/hides aggressively for
    // medicine — Tabitha Brown brought robes specifically to swap
    // for quinine on the way west (#205 anchor).
    return buildBarterCandidates(state, here, {
      ...defaultBarterOpts(),
      foodSurplusThreshold: 300
    });
  },
  mudAbandonmentPriority() {
    // Tabitha Brown 1846: wagon integrity over comfort. Luxuries +
    // the tea set go first; the spare wheel/axle/tongue/canvas and
    // the food reserve are the last things she'd let the slough
    // have — a stranded wagon with no spares is a death sentence.
    return [
      'grandfather_clock', 'shelf_clock', 'china_tea_set',
      'silver_tea_service', 'feather_mattress', 'anvil',
      'printing_press', 'iron_strongbox', 'plow', 'flour', 'beans',
      'cornmeal', 'wheel', 'axle', 'tongue', 'canvas'
    ];
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
    // (Bryant 1846, Carpenter 1857, Palmer 1845) kept Sunday rest by
    // default. #1040 tested a persona-split (secular personas travel
    // 7 days per Unruh's "half observed" finding) — it lifted the
    // bachelor demographic (+10pp) but cratered the period-modal
    // family wagon (2/2: −8pp, balanced/drinker/hoarder/generous all
    // ~32% → ~6%). Sunday rest is mechanically load-bearing for
    // fragile family parties (#922 +10 morale/day + HP recovery is
    // what keeps a 2-adult-2-child wagon alive — same lesson as the
    // reverted #1029 rest-discipline experiment). The split is a real
    // period-vs-mechanics tradeoff deferred to a separate decision;
    // mainstream personas keep the Sabbath.
    // #924 — voluntary-rest triggers (HP 25/15, morale 10) still hold.
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
    // #963 — modest bump (100→140 / 150→200) so balanced hunts a few
    // more times across the back half without burning too many
    // travel days. Trace audit: pre-#963 balanced hunted ~3-7 runs;
    // target post-bump is ~8-10.
    const threshold = hasLiveHunter(state) ? 200 : 140;
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
    // #1022 — desert exclusion removed; runner falls back to dig_well.
    // #1026 — desert bump 0.10 → 0.20. Padding stays smaller than
    // cautious — balanced spends fewer days resting overall, so a
    // smaller cushion matches the personality. 0.20 covers ~1-2
    // failed dig_well attempts; the rest-day piggyback (water_chain
    // at <0.6 ratio on any rest) catches the rest.
    return waterRatio(state) < desertWaterFloor(state, 0.10, 0.20);
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
    // #935 — gap-aware: at ≥150 mi gaps, bump trigger 60 → 75.
    if (!(here.services ?? []).includes('blacksmith')) return 0;
    const trigger = gapAwareRepairTrigger(state, {
      conditionTrigger: 60,
      bigGapMiles: 150,
      bigGapConditionBoost: 15
    });
    if (state.wagon.condition >= trigger) return 0;
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
  shouldCannibalize: () => true,
  pickNpcEventChoice: () => null,
  pickBarterDispositions: defaultPickBarterDispositions
};

export const aggressivePersona: Persona = {
  id: 'aggressive',
  // #921r — safetyFactor 1.0 (zero margin) was "sacrifice planning to
  // make time": aggressive sized its water/food gap buffers with no
  // pad and ran dry in the desert. Lifted to balanced's 1.2 (competent
  // planning); paceMiPerDay stays 12 so the buffer-days math
  // (miles / pace × safety) is still naturally a hair leaner than
  // balanced's — it plans properly, it just also travels faster.
  foresight: { paceMiPerDay: 12, safetyFactor: 1.2 },
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
    //
    // #963c — pace rebalance (was 'grueling'). Period reality: emigrant
    // "aggressive" was FAST (15-18 mi/day sustained, the Reed/Donner
    // push out of Truckee), not GRUELING (25+, which only made sense
    // for true emergencies — outrunning a storm, racing to a ferry).
    // The grueling default trapped aggressive in fatigue-rest cycles:
    // 5 days grueling → oxen worn → forced rest → repeat → ox HP drains
    // → 39% rest days vs 42% travel. Trace-963 confirmed.
    if (oxenWornOut(state)) return 'moderate';
    // #963a — preemptive backoff. Step down one rung before fatigue
    // crosses the worn-out threshold so we don't bounce between
    // grueling-pace travel days and forced rest days. Trace-963 showed
    // aggressive was burning ~40% of the calendar resting AFTER hitting
    // fatigue 70; backing off at 50 keeps the team in continuous
    // motion at a slightly lower per-day rate but >2× the travel days.
    if (oxenTired(state)) return 'moderate';
    return 'fast';
  },
  pickRations(state) {
    // #921r — "don't cheap out on rations" means don't starve the
    // party DURING RECOVERY, not feed a healthy one lavishly. Meager
    // is the default — it stretches the larder across the longer
    // recovery-rest cadence #921r adds (unconditional normal burned
    // the food and merely traded dehydration deaths for a worse
    // starvation wave). But a hurt party's rest only heals with the
    // calories to back it: eat normal WHILE a member is actually
    // recovering (min HP < 40), provided food isn't itself the
    // emergency. Healthy + lean = fine (period emigrants ate lean);
    // hurt + lean + no food = the bug this fixes.
    const recovering = minPartyHealth(state) < 40;
    const foodOk = foodOnHand(state) >= 40;
    return recovering && foodOk ? 'normal' : 'meager';
  },
  shouldRest(state) {
    // Aggressive still respects oxen — burning the team to extinction
    // is not "aggressive", it's just a stuck wagon.
    if (minPartyHealth(state) < 20 || oxenWornOut(state)) return true;
    // #921r — post-shock recovery rebalance. The dominant aggressive
    // failure was NOT death (13% wiped) — it was 68% STRANDED: a
    // desert dehydration / ox loss around mile 1300-1600, then the
    // party + ox team limping at ~15 mi/day (vs 19 healthy) on meager
    // rations with almost no rest, never recovering, until the
    // 220-day season ran out. milesPerDay() is ox-condition-bound
    // (party HP doesn't slow the wagon — ox fatigue/health does, and
    // that only recovers with rest). So aggressive must rest back to a
    // workable minimum, then push again — that nets more total miles
    // than grinding forward broken. Still leaner than cautious/
    // balanced (it pushes sooner and resumes fast); it just stops
    // digging the hole deeper:
    //  - oxenTired: preemptive team recovery one rung before worn-out
    //    (mirrors the #963a pace backoff — same signal, now also
    //    applied to rest so the team recovers before damage compounds
    //    instead of after).
    //  - HP < 28: recover the party to a viable-travel floor before
    //    resuming the push (above the 20 emergency, below cautious 30).
    if (oxenTired(state) || minPartyHealth(state) < 28) return true;
    // #921 — chronic-disease + cold-exposure spirals. The bare HP<20
    // floor above is too late for a member running cholera (−7/day) or
    // dysentery (−3/day): by HP<20 they die within 1-3 ticks. #161
    // says these are survivable with 2-3 days' rest for a fed/watered
    // party — but only if the bot stops before the cliff. Gate on
    // HP<35 so a healthy party still gets the push:
    //  - any severe disease (cholera/typhoid/dysentery).
    //  - cold high-passes (mountains terrain — fire.ts treats alpine
    //    nights as always-cold) with thin warmth gear.
    if (minPartyHealth(state) < 35) {
      if (partyHasSevereCondition(state)) return true;
      if (state.location.terrain === 'mountains' && warmthFor(state) < 50) return true;
    }
    return false;
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
    // #1022 — desert exclusion removed; runner falls back to dig_well.
    // #1026 — desert bump 0.20 → 0.25. Aggressive rarely rests, so
    // the rest-day piggyback (water_chain at <0.6) doesn't help — the
    // dedicated trigger is this persona's only water mgmt in dry
    // country. Tiny bump from baseline buys one dig_well retry against
    // Marcy 1859's 60% miss rate.
    return waterRatio(state) < desertWaterFloor(state, 0.20, 0.25);
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
    // #935 — gap-aware: at ≥200 mi gaps (same threshold as ox swap),
    // bump trigger 40 → 55 so even aggressive fixes before the dead
    // zones. Bigger gap threshold than cautious/balanced preserves
    // the lean character at moderate gaps.
    if (!(here.services ?? []).includes('blacksmith')) return 0;
    const trigger = gapAwareRepairTrigger(state, {
      conditionTrigger: 40,
      bigGapMiles: 200,
      bigGapConditionBoost: 15
    });
    if (state.wagon.condition >= trigger) return 0;
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
  // #1031 — Aggressive is the impatient solo-outfit archetype. Reed
  // 1846 / Hastings 1845 promoted speed and split companies; the
  // aggressive bot starts ahead of the trains rather than waiting
  // to form one. Bot may STILL join a train mid-trail via the
  // post-arrival path (shouldJoinTrain stays true) — they just don't
  // wait at Independence for one to form.
  shouldStartInTrain: () => false,
  shouldCannibalize: () => true,
  pickNpcEventChoice: () => null,
  pickBarterDispositions(state, here, _rng) {
    // Aggressive packs lean and only barters when cash is genuinely
    // short. Rate threshold tighter than default (won't take soaking
    // trades even when out of money — Reed 1846 walked away from
    // Bridger's prices rather than pay them).
    if (state.cash >= 30) return [];
    return buildBarterCandidates(state, here, {
      ...defaultBarterOpts(),
      foodSurplusThreshold: 100,
      cashFloor: 30,
      rateFloor: 0.80
    });
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
  shouldFindWater(_state, rng) {
    // #1022 — desert exclusion removed; runner falls back to dig_well.
    return rng.chance(0.25);
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
  // #1031 — Chaos stays solo at start to preserve fuzz variance.
  // Trains homogenize decisions (pace clamp + pooled water + share-
  // watch morale lift), which is good for survival but bad for the
  // random-decision exercise chaos is meant to provide. Trace bot-275
  // test showed two different chaos seeds collapsing to identical
  // outcomes once both joined a train. Loner-by-default keeps the
  // chaos-divergence test (different seeds → different outcomes)
  // meaningful, while still allowing mid-trail train joins via the
  // post-arrival path.
  shouldStartInTrain: () => false,
  shouldCannibalize: () => true,
  pickNpcEventChoice() {
    return null; // surface-only
  },
  pickBarterDispositions(state, here, rng) {
    // Chaos rolls one random preferred-give × random-receive each
    // visit, fairness-gated. Deterministic per seed since
    // `buildBarterCandidates` is pure; rng picks which slice to keep.
    const all = buildBarterCandidates(state, here, defaultBarterOpts());
    if (all.length === 0) return [];
    const pick = all[rng.int(0, all.length - 1)];
    return [pick];
  }
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
  // #1031 — Reed/Donner archetype. Split companies to push pace ahead
  // of slower-moving family wagons. Starts solo at Independence even
  // though the period default was to form companies — pace_pusher is
  // exactly the archetype that wouldn't wait. (May still join a
  // train mid-trail via the post-arrival path if they catch up to one.)
  shouldStartInTrain: () => false,
  pickPace(state) {
    // #963c — pace rebalance (was grueling/fast/moderate). Real
    // "pace pusher" emigrants (the Reed/Donner outrunning-storms
    // archetype, the express riders) pushed FAST sustained, not
    // GRUELING — grueling pace was an emergency-only gait that
    // wrecked the team in a week. Old defaults trapped pace_pusher
    // in fatigue-rest cycles: 51% rest days vs 36% travel. Down one
    // rung: fast / moderate / slow.
    //
    // #963a — preemptive backoff. When oxen are tired (>50 fatigue
    // soft) but not yet worn out (>70), step DOWN one rung. Avoids
    // the cycle of pushing fast until forced-rest fires.
    //
    // #1031 — plan ahead for fatigue + HP cost of fast pace. The
    // smart pace_pusher knows fast travel will burn ~3-5 fatigue/day
    // and degrade ox HP. When a long supply gap looms (≥ 200 mi, no
    // post to swap/rest at mid-leg), going fast on a mid-fatigue
    // team means being forced into rest with no post nearby. So:
    // only push fast into long gaps when the team is genuinely
    // fresh (avg fatigue < 25). Period anchor: Reed's 1879 memoir —
    // he regretted not banking ox HP at Bridger before the Sublette
    // push; the team that crossed was the team that died in the
    // Sierra.
    if (minPartyHealth(state) >= 70 && !oxenWornOut(state)) {
      const longGapAhead = nextSupplyDistance(state) > 200;
      const teamFresh = avgOxFatigue(state) < 25;
      if (longGapAhead && !teamFresh) return 'moderate';
      return oxenTired(state) ? 'moderate' : 'fast';
    }
    if (minPartyHealth(state) >= 50) return oxenTired(state) ? 'slow' : 'moderate';
    return 'slow';
  },
  shouldRest(state) {
    // Only rest when the team is actually failing — not on the cautious
    // 45/25 trigger. Period: Reed pushed past prudent rest limits.
    //
    // #963 follow-up: also rest when ANY individual ox is strained
    // (fatigue ≥75 OR health <70). Post-#963b1 with spare oxen + new
    // rest math, pace_pusher could sustain fast pace long enough for
    // one ox to cross the HP-drain threshold (fatigue 80) while team
    // avg stayed under oxenWornOut's 70 limit. The dying ox went
    // unnoticed → cascade ox deaths → wipe rate climbed 27→47%.
    //
    // #963 H1 companion: ALSO rest when the team is chronically
    // wearing (avg ox health < 80). Without this, H1's slow HP
    // recovery means individual oxen heal back above the strained
    // 70-threshold between events while team avg keeps slipping —
    // pace_pusher misses the trend until oxen actually die. Avg-80
    // is the 'time to stop and recover' signal.
    return (
      minPartyHealth(state) < 30
      || oxenWornOut(state)
      || anyOxStrained(state)
    );
  },
  pickOxSwapCount(state, here) {
    // #963 follow-up: pace_pusher should trade fresh AGGRESSIVELY at
    // posts. The historical Reed regret (1879 memoir) was NOT trading
    // fresh at Bridger after Sublette Cutoff — the team Reed brought
    // out of Fort Bridger was the team that died in the Sierra. This
    // persona captures that lesson by overriding balanced's healthFloor
    // 55 → 70 (swap when team is mid-health, not just hurt).
    if (!(here.services ?? []).includes('ox_swap')) return 0;
    const healthFloor = gapAwareOxHealthFloor(state, {
      healthFloor: 70,
      bigGapMiles: 150,
      bigGapHealthBoost: 15
    });
    return pickOxSwapCountFor(state, 2, healthFloor);
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
  },
  pickBarterDispositions(state, here, _rng) {
    // Hoarder refuses to give up the staple stash. Trades hides /
    // robes only — luxury hunt by-products are fine to swap,
    // staples never. Period: the supply-stockpiler emigrant who
    // would rather keep flour for "if we get snowbound" than trade
    // it for medicine.
    return buildBarterCandidates(state, here, {
      ...defaultBarterOpts(),
      protected: new Set(['flour', 'beans', 'saleratus', 'bacon',
        'sugar', 'salt', 'jerky', 'pemmican', 'game_meat'])
    });
  },
  mudAbandonmentPriority() {
    // The stockpiler parts with luxuries grudgingly and clings to
    // spare parts + food to the bitter end — "we might need that wheel
    // / that flour if we get snowbound." Comfort goods first; the
    // wagon-integrity kit + bulk staples never if it can help it.
    return [
      'grandfather_clock', 'shelf_clock', 'china_tea_set',
      'silver_tea_service', 'feather_mattress', 'anvil',
      'printing_press', 'iron_strongbox', 'plow', 'wheel', 'axle',
      'tongue', 'canvas', 'flour', 'beans', 'cornmeal'
    ];
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
  },
  mudAbandonmentPriority() {
    // Tamzene Donner kept the table set for travellers even as their
    // own stores thinned — the tea services are hospitality, dumped
    // dead last. Anvil, clocks, and spare parts go first.
    return [
      'anvil', 'grandfather_clock', 'shelf_clock', 'printing_press',
      'iron_strongbox', 'plow', 'wheel', 'axle', 'tongue', 'canvas',
      'feather_mattress', 'flour', 'beans', 'cornmeal',
      'china_tea_set', 'silver_tea_service'
    ];
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
  },
  mudAbandonmentPriority() {
    // The preacher-led wagon pitches the demon drink first and clings
    // to the Word longest — the family Bible is the last thing off the
    // wagon, after even the food.
    return [
      'whiskey', 'anvil', 'grandfather_clock', 'shelf_clock',
      'feather_mattress', 'china_tea_set', 'silver_tea_service',
      'iron_strongbox', 'plow', 'printing_press', 'wheel', 'axle',
      'tongue', 'canvas', 'flour', 'beans', 'cornmeal', 'bible'
    ];
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
  },
  pickBarterDispositions(state, here, rng) {
    // Drinker is famously casual with the bottle — Joe Meek traded
    // whiskey for anything he needed (mountain-man diaries). Always
    // adds a whiskey-for-anything-the-post-stocks offer, on top of
    // the default candidates. Most posts refuse whiskey (Bridger /
    // Hall / Whitman in our data), so the engine's fairness gate
    // sorts out which ones actually fire.
    const base = defaultPickBarterDispositions(state, here, rng);
    const whiskey = state.inventory.whiskey ?? 0;
    if (whiskey > 0 && here.barterEnabled !== false) {
      const stock = new Set(here.stock ?? []);
      const targets = ['quinine', 'flour', 'bacon', 'gunpowder'];
      for (const t of targets) {
        if (!stock.has(t)) continue;
        base.push({
          give: { item: 'whiskey', qty: 1 },
          receive: { item: t, qty: t === 'flour' || t === 'bacon' ? 10 : 2 }
        });
      }
    }
    return base;
  },
  mudAbandonmentPriority() {
    // Joe Meek would pitch the family Bible and the parlor china before
    // the jug. Bottle goes last, food after that — everything else,
    // including the anvil, the river can have.
    return [
      'bible', 'china_tea_set', 'shelf_clock', 'grandfather_clock',
      'silver_tea_service', 'feather_mattress', 'anvil', 'plow',
      'printing_press', 'iron_strongbox', 'wheel', 'axle', 'tongue',
      'canvas', 'flour', 'beans', 'cornmeal', 'whiskey'
    ];
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
