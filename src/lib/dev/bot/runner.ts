// #275 Bot run loop — drives a full game from outfit-skip through
// arrival or wipe via direct engine calls. No SvelteKit, no HTTP.
//
// Per-iteration decision tree (one game-day per loop):
//
//   At a landmark?
//     river          → ford() with persona-picked method
//     trading_post   → maybe trade for supplies, maybe stay at inn,
//                      then leave
//     end            → break (engine sets outcome='arrived')
//     landmark       → walk past
//   On the road?
//     food low + ammo? → hunt()
//     health/morale low? → rest(1)
//     else → tickDayPausable, handle pendingEvent if any

import { createInitialState } from '../../game/engine';
import { tickDayPausable, applyPendingChoice, applyCompanyDissent } from '../../game/engine-pausable';
import { companyRestDecision, type DissentChoice } from '../../game/systems/company-rest';
import { playerIsCaptain } from '../../game/systems/wagon-train-elections';
import { rest } from '../../game/actions/rest';
import { hunt, type HuntTarget, type AmmoBand } from '../../game/actions/hunt';
import { ford, type FordMethod, type RiverState } from '../../game/actions/ford';
import { stayAtInn, repairWagon, swapOxen, swapOxenCost } from '../../game/systems/town-services';
// #915 — barter at trading posts. Bot consults persona dispositions
// after the cash trade + ox swap; each disposition is re-quoted to
// guard against inventory drift mid-block.
import { quoteBarter } from '../../game/systems/barter';
import { settleTrade } from '../../game/systems/settle-trade';
import { postRemainingQty } from '../../game/systems/post-stock';

/** Convert a bot buy-list `[{item,qty}]` to a settleTrade `get` map (#1223). */
function _toGet(arr: Array<{ item: string; qty: number }>): Record<string, number> {
  const m: Record<string, number> = {};
  for (const b of arr) m[b.item] = (m[b.item] ?? 0) + b.qty;
  return m;
}
import { abandonHeavyLoad } from '../../game/systems/item-loss';
import { joinTrain } from '../../game/systems/wagon-train';
import { pickHuntTarget } from '../../game/ai/hunt';
import { defaultCompanions } from '../../game/ai/party';
import { pickRestCampChain } from '../../game/ai/rest';
import { bundleCampActions } from '../../game/ai/bundle';
import { CAMP_ACTIONS_BY_ID, hourCostFor, type CampActionId } from '../../game/actions/camp-actions';
import { score as computeArrivalScore } from '../../game/systems/scoring';
import { getLandmark, type Landmark } from '../../game/content/landmarks';
import { foodItemIds } from '../../game/content/items';
import type { GameState, ProfessionId } from '../../game/types';
import type { Rng } from '../../game/rng';
import {
  getPersona,
  makeBotRng,
  type Persona,
  composeShoppingList,
  gapAwareWaterBagTarget,
  type BuyOrder
} from '../../game/ai';
import { computeFunScore } from './scoring';
import type { BotRunOpts, BotRunReport } from './types';

// Real emigrant journeys ran 4–6 months (120–180 days). 220 = ~7
// months, a period-realistic ceiling — anything beyond is diagnostic-
// only territory. Bots that can't arrive in 220 days are stuck on
// a structural problem (rest-loop, event day-burn, disease cycle),
// not a slow-but-valid run. Pre-#924 cap was 365 (~1 yr) which let
// 73/75 bot runs cook in calendar-burn rest-loops past period reality.
const DEFAULT_MAX_DAYS = 220;

interface RunningStats {
  eventsFiredById: Record<string, number>;
  decisionsMade: number;
  dramaBeatCount: number;
  daysWithoutEvent: number;
  longestBoringStretch: number;
  deathsByCause: Record<string, number>;
  deadIds: Set<string>;
  errors: string[];
  /** Per-action-type day counter. Each iteration of the main loop
   *  attributes its day delta (state.day - dayBefore) to whichever
   *  action ran. */
  actionDays: BotRunReport['actionDays'];
  /** Supply flow accumulated from per-iteration inventory deltas. */
  supplies: BotRunReport['supplies'];
}

function newStats(): RunningStats {
  return {
    eventsFiredById: {},
    decisionsMade: 0,
    dramaBeatCount: 0,
    daysWithoutEvent: 0,
    longestBoringStretch: 0,
    deathsByCause: {},
    deadIds: new Set<string>(),
    errors: [],
    actionDays: { travel: 0, rest: 0, findWater: 0, hunt: 0, ford: 0, tradingPost: 0, eventChoice: 0, other: 0 },
    supplies: { foodConsumedLb: 0, foodAcquiredLb: 0, gunpowderUsedLb: 0, leadBallsUsed: 0, cashSpent: 0, cashEarned: 0 }
  };
}

/** Total food lbs in an inventory — same id set the consumption system eats from. */
function totalFoodLb(inv: Record<string, number>): number {
  return foodItemIds().reduce((sum, id) => sum + (inv[id] ?? 0), 0);
}

/** Accumulate one loop-iteration's inventory/cash deltas into supply flow.
 *  Signed deltas split into consumed/used (down) vs acquired/earned (up) —
 *  totals are exact even when one iteration spans multiple days. */
function recordSupplyFlow(
  before: { food: number; gunpowder: number; leadBalls: number; cash: number },
  state: GameState,
  stats: RunningStats
): void {
  const dFood = totalFoodLb(state.inventory) - before.food;
  if (dFood < 0) stats.supplies.foodConsumedLb += -dFood;
  else stats.supplies.foodAcquiredLb += dFood;
  const dPowder = (state.inventory.gunpowder ?? 0) - before.gunpowder;
  if (dPowder < 0) stats.supplies.gunpowderUsedLb += -dPowder;
  const dBalls = (state.inventory.lead_balls ?? 0) - before.leadBalls;
  if (dBalls < 0) stats.supplies.leadBallsUsed += -dBalls;
  const dCash = state.cash - before.cash;
  if (dCash < 0) stats.supplies.cashSpent += -dCash;
  else stats.supplies.cashEarned += dCash;
}

function recordDeaths(state: GameState, stats: RunningStats): void {
  for (const m of state.party) {
    if (m.dead && !stats.deadIds.has(m.id)) {
      stats.deadIds.add(m.id);
      const cause = m.deathCause ?? 'unknown';
      stats.deathsByCause[cause] = (stats.deathsByCause[cause] ?? 0) + 1;
      stats.dramaBeatCount += 1;
    }
  }
}

function recordHealthDrama(
  state: GameState,
  prevLowHealthIds: Set<string>,
  stats: RunningStats
): Set<string> {
  const currentLow = new Set<string>();
  for (const m of state.party) {
    if (!m.dead && m.health < 30) currentLow.add(m.id);
  }
  for (const id of currentLow) {
    if (!prevLowHealthIds.has(id)) stats.dramaBeatCount += 1;
  }
  return currentLow;
}

function recordOxDeaths(
  state: GameState,
  prevLiveOxen: Set<string>,
  stats: RunningStats
): Set<string> {
  const currentLive = new Set<string>();
  for (const o of state.oxen) {
    if (o.health > 0) currentLive.add(o.id);
  }
  for (const id of prevLiveOxen) {
    if (!currentLive.has(id)) stats.dramaBeatCount += 1;
  }
  return currentLive;
}

/** Rest one day with a find_water + boil_water camp-action chain.
 *  Falls back gracefully if the rest action throws (e.g. firewood out,
 *  no boil capability): the chains come from `pickRestCampChain`
 *  (game/ai/rest.ts, #303b); this driver tries each in turn and
 *  falls back to a plain rest if every chain throws.
 *  Used both by the explicit findWater branch (keg <persona threshold)
 *  and by the v8 rest-chains-water-when-low piggyback path so the bot
 *  doesn't burn separate calendar days on rest and water-find. */
function restWithWaterChain(state: GameState, stats: RunningStats): GameState {
  for (const camp of pickRestCampChain(state)) {
    try {
      // #919 — piggyback free morale camp actions on every water-chain
      // attempt. Helper no-ops when budget is full or gear is absent.
      const camps = addMoraleCampPiggyback(state, [...camp]);
      const next = rest(state, 1, { campActions: camps });
      stats.decisionsMade += 1;
      return next;
    } catch {
      // try next fallback
    }
  }
  // All chains failed — passive rest, no camp actions other than the
  // morale piggyback (when gear permits).
  try {
    const camps = addMoraleCampPiggyback(state, []);
    const next = camps.length > 0
      ? rest(state, 1, { campActions: camps })
      : rest(state, 1);
    stats.decisionsMade += 1;
    return next;
  } catch (err) {
    stats.errors.push(`rest-fallback: ${(err as Error).message}`);
    return state;
  }
}

/** #919 — Free-morale piggyback on rest days. read_bible (1h) and
 *  sing_along (2h) both add morale and cost nothing but time. When the
 *  bot has the gear (bible / fiddle / harmonica) and the camp budget
 *  has room after the bundle's primary picks, append them. Skip
 *  pass_whiskey deliberately — it consumes whiskey and has a 15%
 *  squabble downside, so it's a judgement call rather than a free pick.
 *  Each action's own availability check is consulted defensively in
 *  case a future gate (e.g. weather) blocks it. */
const REST_BUDGET_HOURS = 12;
function addMoraleCampPiggyback(
  state: GameState,
  existing: CampActionId[],
): CampActionId[] {
  const usedHours = existing.reduce(
    (sum, id) => sum + hourCostFor(CAMP_ACTIONS_BY_ID[id], state),
    0,
  );
  let remaining = REST_BUDGET_HOURS - usedHours;
  const out: CampActionId[] = [...existing];
  for (const id of ['read_bible', 'sing_along'] as const) {
    if (out.includes(id)) continue;
    const action = CAMP_ACTIONS_BY_ID[id];
    const cost = hourCostFor(action, state);
    if (cost > remaining) continue;
    if (!action.availability(state).available) continue;
    out.push(id);
    remaining -= cost;
  }
  return out;
}

/** #927 — replaces restWithWaterChain. Asks the persona for a 12h camp
 *  bundle (+ optional hunt directive) via bundleCampActions, applies
 *  via rest() then hunt(). Falls back to the legacy chain if the bundle
 *  is empty or applying it throws on availability race. */
function restWithBundle(
  state: GameState,
  persona: Persona,
  primary: CampActionId | null,
  rng: Rng,
  stats: RunningStats,
): GameState {
  // Opt-in bundling. Personas without an override AND with all-zero
  // weights run the legacy chain unchanged (no behavior drift). Personas
  // that set non-zero weights or a custom bundle (chaos, faithful) opt
  // into the new surface. This preserves master arrival rates for the
  // default cohort while exposing the architecture for tuning.
  const w = persona.bundleWeights;
  const optsIn = !!persona.bundleCampActions
    || w.survival > 0 || w.food > 0 || w.maintenance > 0
    || w.hygiene > 0 || w.morale > 0;
  if (!optsIn) {
    if (primary === null) {
      // #919 — even on a passive rest day, piggyback free morale camp
      // actions when the bot has the gear (bible / fiddle / harmonica).
      // Each adds morale at the cost of nothing but camp hours, which
      // would otherwise go unused on a plain rest tick.
      const camps = addMoraleCampPiggyback(state, []);
      try {
        const s = camps.length > 0
          ? rest(state, 1, { campActions: camps })
          : rest(state, 1);
        stats.decisionsMade += 1;
        return s;
      } catch (err) {
        stats.errors.push(`rest-plain: ${(err as Error).message}`);
        return state;
      }
    }
    return restWithWaterChain(state, stats);
  }
  try {
    const bundle = bundleCampActions(persona, state, primary, rng);
    if (bundle.campActions.length > 0) {
      // #919 — augment the bundle with free morale piggyback within the
      // shared 12h budget. If the bundle is already full the helper
      // no-ops; otherwise read_bible / sing_along ride along.
      const camps = addMoraleCampPiggyback(state, bundle.campActions);
      const s = rest(state, 1, { campActions: camps });
      stats.decisionsMade += 1;
      return s;
    }
  } catch {
    // bundle apply failed — fall through
  }
  if (primary === null) {
    try {
      const camps = addMoraleCampPiggyback(state, []);
      const s = camps.length > 0
        ? rest(state, 1, { campActions: camps })
        : rest(state, 1);
      stats.decisionsMade += 1;
      return s;
    } catch (err) {
      stats.errors.push(`rest-plain: ${(err as Error).message}`);
      return state;
    }
  }
  return restWithWaterChain(state, stats);
}

/** Build a buy list the bot wants when trading at a post. Six tiers
 *  composed in priority order via #303a's `composeShoppingList`:
 *  warmth → equipment → food → hunter → repair → medicine. The slice
 *  functions live in `game/ai/shopping.ts` so the same brain can drive
 *  NPC restocks (#299) and future encountered-train wagons. Player-bot
 *  here passes its full GameState shape (which structurally satisfies
 *  WagonStateLike) directly. */
function buildBotShoppingList(state: GameState, here: Landmark, persona: Persona): BuyOrder[] {
  const stock = new Set(here.stock ?? []);
  // #303c — thread persona-tunable food opts so balanced restocks
  // smaller (60d cap) than cautious (90d). Frees cash for medicine /
  // repair, addressing the v10 cash-pressure regression.
  // #909 — also thread the equipment opts (cookwareSpare). Cautious
  // (Tabitha Brown) is the only stock persona that carries a spare
  // cookware against #306 buffalo-stampede loss.
  // #1023 — overlay gap-aware water_bag target on the persona's
  // equipment opts so every player-bot persona stocks 4 vessels before
  // a meaningful (≥ 200 mi) gap and 2 otherwise. Period anchor lives
  // on `gapAwareWaterBagTarget`. NPC drivers (wagon-train.ts) keep the
  // default-2 behavior for now; flip in #1023 follow-up if NPC death
  // attribution shows the same dehydration pattern.
  const equipmentOpts = {
    ...persona.pickEquipmentRestockOpts(state),
    waterBagTarget: gapAwareWaterBagTarget(state)
  };
  const list = composeShoppingList(
    { wagon: state, stock },
    {
      food: persona.pickFoodRestockOpts(state),
      equipment: equipmentOpts
    }
  );
  // #1223 — the bot buys exactly what a real player can: settleTrade
  // enforces per-post stock (all-or-nothing — any line over the shelf
  // throws the whole basket), and the player UI is stock-gated, so the
  // bot must be too. composeShoppingList sizes to NEED (e.g. ~400 lb
  // flour for a 90-day cushion); cap each line at the remaining shelf
  // qty and drop sold-out lines. The unmet need carries to the next
  // post, same as a player who couldn't fully stock up.
  const capped: BuyOrder[] = [];
  for (const o of list) {
    const avail = postRemainingQty(state, here, o.item);
    if (avail <= 0) continue;
    capped.push(o.qty > avail ? { ...o, qty: avail } : o);
  }
  return capped;
}

/** Try to handle the landmark we're parked at. Returns the new state
 *  with atLandmarkId cleared (or unchanged at the end-of-trail). */
function handleLandmark(state: GameState, persona: Persona, stats: RunningStats, rng: Rng): GameState {
  const id = state.location.atLandmarkId;
  if (!id) return state;
  const here = getLandmark(id);
  let s = state;

  try {
    if (here.kind === 'river') {
      const method = persona.pickFordMethod(s, here, rng);
      const river: RiverState = {
        depthFt: here.river?.depthFt ?? 3,
        currentMph: here.river?.currentMph ?? 3,
        ferryPrice: here.river?.ferryPrice ?? 5,
        nativeFerry: here.river?.nativeFerry
      };
      s = tryFordWithFallback(s, method, river, stats);
      stats.decisionsMade += 1;
      return s;
    }

    if (here.kind === 'trading_post') {
      // #176 — first thing the bot does at any trading post: join a
      // wagon train if one's not already on hand. Period reality:
      // emigrants joined at the first practical gathering point and
      // stayed in the company for as long as the route held. The bot
      // gets +1 morale/day, possibly half-price smithy, and pace-clamp
      // safety — all positive-EV unless the player is committing to a
      // grueling-pace push (the bot doesn't, so this is pure upside).
      const rejoinCooldown = s.flags._leftTrainCooldownUntilDay as number | undefined;
      if (
        !s.wagonTrain &&
        (rejoinCooldown === undefined || s.day >= rejoinCooldown) &&
        persona.shouldJoinTrain(s, here, rng)
      ) {
        try {
          s = joinTrain(s, rng).state;
          stats.decisionsMade += 1;
        } catch {
          // Already in a train — silent skip.
        }
      }

      // Order at a post: smithy repair → trade for goods → inn stay → leave.
      // Repair first because hauling broken-wagon damage further is the
      // worst outcome; cash spent on repair stops the bleed. #303c —
      // budget is now persona-tunable (cautious bigger, balanced
      // thriftier, aggressive only-when-failing).
      const services = new Set(here.services ?? []);
      const repairBudget = persona.pickRepairBudget(s, here);
      if (repairBudget > 0) {
        try {
          s = repairWagon(s, repairBudget).state;
          stats.decisionsMade += 1;
        } catch {
          // Repair failed — skip.
        }
      }

      if (persona.shouldTradeAtPost(s, here, rng)) {
        const buys = buildBotShoppingList(s, here, persona);
        // #963 — removed the 0.25× cashCap gate that blocked trades
        // when the buy list grew large. The May-13 trace audit showed
        // bots arriving at Fort Hall with $115 cash + a gap-aware
        // wishlist of ~1100 lb flour ($1100+ at post prices), failing
        // the 0.25× gate ($412), then skipping the trade ENTIRELY and
        // starving on the Boise → Columbia leg. New behavior: always
        // attempt the trade if shouldTradeAtPost said yes. settleTrade
        // throws when cash is short for the full basket (#1223 — unlike
        // the old `trade()`, it does not cull internally), so the catch
        // ladder below does the culling: full list → food-only →
        // flour-only-at-affordable-qty.
        if (buys.length > 0) {
          try {
            s = settleTrade(s, { mode: 'cash', get: _toGet(buys), give: {} }).state;
            stats.decisionsMade += 1;
          } catch {
            // Trade refused full list — try food-only fallback.
            const fallback = buys.filter((b) =>
              b.item === 'flour' || b.item === 'bacon' || b.item === 'beans'
              || b.item === 'jerky'
            );
            if (fallback.length > 0) {
              try {
                s = settleTrade(s, { mode: 'cash', get: _toGet(fallback), give: {} }).state;
                stats.decisionsMade += 1;
              } catch {
                // Even the fallback failed — last resort: buy only
                // flour, qty explicitly pared to whatever cash remains
                // (affordableQty below; #287a NPC pattern).
                // #963 — flour fallback pared down to fit cash. Period
                // emigrants at the last forts (Hall, Bridger) bought
                // whatever flour their dwindling coin could afford —
                // they didn't walk away because they couldn't afford a
                // full barrel. Roughly $0.30-0.50/lb at post markup;
                // use $0.50 to be conservative and divide by post mult.
                const flourOnly = buys.find((b) => b.item === 'flour');
                if (flourOnly && s.cash >= 5) {
                  const postMult = here.priceMultiplier ?? 1.0;
                  const unitCost = 0.5 * postMult;
                  const affordableQty = Math.max(1, Math.floor((s.cash - 2) / unitCost));
                  try {
                    s = settleTrade(s, { mode: 'cash', get: { flour: Math.min(flourOnly.qty, affordableQty) }, give: {} }).state;
                    stats.decisionsMade += 1;
                  } catch {
                    // Truly out of options — skip.
                  }
                }
              }
            }
          }
        }
      } else {
        // #275 v10b — Emergency overrides. Bypass the persona gate
        // when the bot is dying. Period reality: even hard-pushing
        // emigrants stopped for food/medicine when the company was
        // out. Aggressive's hardcoded shouldTradeAtPost=false was
        // leaving it without flour and quinine alike → starvation +
        // cumulative-disease wipes around mile 450.
        const inv = s.inventory;
        const stockSet = new Set(here.stock ?? []);
        const allBuys = buildBotShoppingList(s, here, persona);

        // Emergency MEDICINE — chest critically empty.
        const medCritEmpty =
          (stockSet.has('quinine') && (inv.quinine ?? 0) < 2)
          || (stockSet.has('calomel') && (inv.calomel ?? 0) < 1)
          || (stockSet.has('bandages') && (inv.bandages ?? 0) < 2);
        if (medCritEmpty && s.cash >= 5) {
          const medsOnly = allBuys.filter((b) =>
            b.item === 'quinine' || b.item === 'bandages' || b.item === 'laudanum'
            || b.item === 'calomel' || b.item === 'paregoric' || b.item === 'dovers_powder'
            || b.item === 'epsom_salts'
          );
          if (medsOnly.length > 0) {
            try {
              s = settleTrade(s, { mode: 'cash', get: _toGet(medsOnly), give: {} }).state;
              stats.decisionsMade += 1;
            } catch {
              const essentials = medsOnly.filter((b) =>
                b.item === 'quinine' || b.item === 'calomel'
              );
              if (essentials.length > 0) {
                try { s = settleTrade(s, { mode: 'cash', get: _toGet(essentials), give: {} }).state; stats.decisionsMade += 1; } catch { /* skip */ }
              }
            }
          }
        }

        // Emergency FOOD — staples low. Aggressive's grueling-pace +
        // meager-rations diet burns ~3 lb/day per eater = 9 lb/day for
        // a 3-person party. Fort-to-fort gaps run 100-150 miles =
        // 7-12 days = 60-100 lb consumed between posts. Threshold of
        // 200 lb gives ~22 days of buffer at the post visit, enough
        // to span the longest gap (Robidoux→Laramie 130 mi). Period
        // reality: every emigrant diary records restocking at every
        // fort regardless of pace philosophy — Marcy 1859 explicit.
        const aliveCount = s.party.filter((m) => !m.dead).length;
        const totalFood = (inv.flour ?? 0) + (inv.beans ?? 0) + (inv.bacon ?? 0)
          + (inv.salt_pork ?? 0) + (inv.hardtack ?? 0) + (inv.jerky ?? 0)
          + (inv.pemmican ?? 0) + (inv.cornmeal ?? 0);
        const foodCritLow = aliveCount > 0 && totalFood < 200;
        if (foodCritLow && s.cash >= 10) {
          const foodOnly = allBuys.filter((b) =>
            b.item === 'flour' || b.item === 'bacon' || b.item === 'beans'
            || b.item === 'jerky' || b.item === 'cornmeal' || b.item === 'salt_pork'
            || b.item === 'hardtack' || b.item === 'pemmican'
          );
          if (foodOnly.length > 0) {
            try {
              s = settleTrade(s, { mode: 'cash', get: _toGet(foodOnly), give: {} }).state;
              stats.decisionsMade += 1;
            } catch {
              // Cash short on the full list — drop to flour + bacon only.
              const essentials = foodOnly.filter((b) =>
                b.item === 'flour' || b.item === 'bacon'
              );
              if (essentials.length > 0) {
                try { s = settleTrade(s, { mode: 'cash', get: _toGet(essentials), give: {} }).state; stats.decisionsMade += 1; } catch { /* skip */ }
              }
            }
          }
        }
      }

      if (persona.shouldStayAtInn(s, here, rng)) {
        try {
          s = stayAtInn(s, 1, here.innNightlyRate).state;
          stats.decisionsMade += 1;
        } catch {
          // Inn failed (cash etc.) — skip.
        }
      }

      // #278 — Trading-post oxen swap. Persona returns the count of
      // fresh oxen to acquire; the runner picks barter (worst-2-per-1)
      // when the team has enough surrender candidates, else falls
      // back to cash-only mode at the higher per-head rate. The
      // load-bearing fix for the post-Bridger ox-attrition wall.
      if ((here.services ?? []).includes('ox_swap')) {
        const want = persona.pickOxSwapCount(s, here, rng);
        if (want > 0) {
          // Sort alive oxen by combined attrition (low health + high
          // fatigue first) and try barter when we have ≥2*want of
          // them. Otherwise cash-only fallback.
          const sorted = [...s.oxen]
            .filter((o) => o.health > 0)
            .sort((a, b) => (a.health - a.fatigue) - (b.health - b.fatigue));
          let swapped = false;

          // #963 — try the persona's want count first; if cash short,
          // step down to want-1, want-2, ... until something fits or
          // we hit zero. Pre-#963, the bot saw a $112 cash-only
          // estimate at Hall vs $115 cash, refused, and walked into
          // the mountains with a worn 3-ox team. Period emigrants
          // bought ONE fresh ox when they couldn't afford two.
          for (let n = want; n >= 1 && !swapped; n--) {
            const barterNeed = 2 * n;
            if (sorted.length >= barterNeed) {
              const surrenderIds = sorted.slice(0, barterNeed).map((o) => o.id);
              const { cost } = swapOxenCost(s, n, {});
              if (s.cash >= cost) {
                try {
                  s = swapOxen(s, surrenderIds, n, {}).state;
                  stats.decisionsMade += 1;
                  swapped = true;
                  break;
                } catch {
                  // Barter failed — fall through to cash-only.
                }
              }
            }
            const { cost: cashCost } = swapOxenCost(s, n, { cashOnly: true });
            if (s.cash >= cashCost) {
              try {
                s = swapOxen(s, [], n, { cashOnly: true }).state;
                stats.decisionsMade += 1;
                swapped = true;
              } catch {
                // Cash-only also failed at this size — try smaller.
              }
            }
          }
        }
      }

      // #915 — barter pass. After cash trades + ox swaps, persona
      // proposes goods-for-goods swaps for items the post wants.
      // Each disposition is re-quoted (inventory may have shifted
      // from the cash trade or ox swap) and applied if fair.
      if (here.barterEnabled !== false) {
        const dispositions = persona.pickBarterDispositions(s, here, rng);
        for (const d of dispositions) {
          const quote = quoteBarter(s, d.give, d.receive);
          if (!quote.fair) continue;
          try {
            s = settleTrade(s, { mode: 'barter', get: { [d.receive.item]: d.receive.qty }, give: { [d.give.item]: d.give.qty } }).state;
            stats.decisionsMade += 1;
          } catch {
            // Inventory drifted, qty cap hit, or another race — skip.
          }
        }
      }

      // Leave the post.
      s = { ...s, location: { ...s.location, atLandmarkId: null } };
      return s;
    }

    if (here.kind === 'end') {
      // Engine sets outcome='arrived' when last landmark is passed; this
      // branch is just defensive — clear any lingering at-flag.
      s = { ...s, location: { ...s.location, atLandmarkId: null } };
      return s;
    }

    // 'landmark' kind — scenic only, walk past.
    s = { ...s, location: { ...s.location, atLandmarkId: null } };
    return s;
  } catch (err) {
    stats.errors.push(`landmark ${id}: ${(err as Error).message}`);
    // Fall back to clearing the flag so the loop can advance.
    return { ...s, location: { ...s.location, atLandmarkId: null } };
  }
}

/** Try the persona's chosen ford method; on failure (cash short, item
 *  missing, attitude too low), fall back to plain ford. */
function tryFordWithFallback(
  state: GameState,
  method: FordMethod,
  river: RiverState,
  stats: RunningStats
): GameState {
  try {
    return ford(state, { method, river });
  } catch {
    try {
      return ford(state, { method: 'ford', river });
    } catch (err) {
      stats.errors.push(`ford-fallback failed: ${(err as Error).message}`);
      // Last-ditch — clear at-flag so the loop doesn't get stuck.
      return { ...state, location: { ...state.location, atLandmarkId: null } };
    }
  }
}

/** Run a single hunt, falling back to gather if the hunt action throws
 *  (no rifle, missing ammo, etc.). */
function doBotHunt(state: GameState, stats: RunningStats): GameState {
  try {
    const { target, ammo } = pickHuntTarget(state);
    // hunt() caps hunters at 2 — partner-hunting was the period max.
    const aliveAdults = state.party.filter((m) => !m.dead && m.kind === 'adult').length;
    const hunters = Math.min(2, Math.max(1, aliveAdults));
    return hunt(state, { target, ammo, hunters });
  } catch (err) {
    stats.errors.push(`hunt: ${(err as Error).message}`);
    return state;
  }
}

export function runBot(opts: BotRunOpts): BotRunReport {
  const persona = getPersona(opts.persona);
  const startDate = opts.startDate ?? { year: 1849, month: 4, day: 15 };
  const maxDays = opts.maxDays ?? DEFAULT_MAX_DAYS;
  const leaderProfession: ProfessionId = opts.leaderProfession ?? 'farmer';
  const partySize = Math.max(1, Math.min(6, opts.partySize ?? 3));
  const companionProfs = opts.companionProfessions
    ?? defaultCompanions(partySize, leaderProfession);
  const adultCompanions = companionProfs.map((p, i) => ({
    name: `Comp${i + 1}`,
    profession: p,
    sex: i % 2 === 0 ? ('female' as const) : ('male' as const),
    kind: 'adult' as const
  }));
  // #1030 — append `childCount` children after adult companions. No
  // profession; alternating sex starting opposite from adults so a
  // 2-adult-2-child party reads as a mixed family. Age 8 default
  // (set in engine.makeMember).
  const childCount = Math.max(0, opts.childCount ?? 0);
  const children = Array.from({ length: childCount }, (_, i) => ({
    name: `Kid${i + 1}`,
    sex: i % 2 === 0 ? ('male' as const) : ('female' as const),
    kind: 'child' as const
  }));
  const companions = [...adultCompanions, ...children];

  let state: GameState = createInitialState({
    seed: opts.seed,
    leader: { name: 'Botleader', profession: leaderProfession },
    companions,
    startDate
  });

  // Bot-side RNG — distinct from the engine's tick RNG so chaos
  // randomness doesn't reach into engine state. Threaded into every
  // persona method.
  const botRng = makeBotRng(opts.seed);

  // #1031 — most personas start in a wagon train at Independence. Helen
  // Carpenter 1857 / Bryant 1846 anchor: single wagons did not pass the
  // frontier; companies formed at the jumping-off point. Loner personas
  // (aggressive, pace_pusher, sometimes chaos) override shouldStartInTrain
  // to false and run solo, matching the Reed/Donner-archetype emigrant
  // who split companies to push pace.
  if (persona.shouldStartInTrain?.(botRng) ?? true) {
    state = joinTrain(state, botRng).state;
  }

  const stats = newStats();
  const startingPartySize = state.party.length;

  let prevLowHealthIds = new Set<string>(
    state.party.filter((m) => !m.dead && m.health < 30).map((m) => m.id)
  );
  let prevLiveOxen = new Set<string>(state.oxen.filter((o) => o.health > 0).map((o) => o.id));

  // BOT_TRACE=1 prints a per-N-day snapshot of party HP, conditions,
  // morale, oxen, water, and key meds. Used to diagnose stall causes.
  // Throwaway diagnostic — not part of the BotRunReport contract.
  const traceEvery = parseInt(process.env.BOT_TRACE ?? '0', 10);
  let lastTraceDay = 0;
  function trace(action: string) {
    if (!traceEvery) return;
    if (state.day - lastTraceDay < traceEvery && state.day !== 1) return;
    lastTraceDay = state.day;
    const alive = state.party.filter((m) => !m.dead);
    const minHp = alive.length ? Math.min(...alive.map((m) => m.health)) : 0;
    const avgHp = alive.length ? Math.round(alive.reduce((a, m) => a + m.health, 0) / alive.length) : 0;
    const conds = alive.flatMap((m) => m.conditions.map((c) => c.id));
    const oxAlive = state.oxen.filter((o) => o.health > 0).length;
    const oxAvgFat = oxAlive ? Math.round(state.oxen.filter((o) => o.health > 0).reduce((a, o) => a + o.fatigue, 0) / oxAlive) : 0;
    const meds = `qui=${state.inventory.quinine ?? 0} cal=${state.inventory.calomel ?? 0} lau=${state.inventory.laudanum ?? 0}`;
    const food = `flr=${state.inventory.flour ?? 0} bcn=${state.inventory.bacon ?? 0} bns=${state.inventory.beans ?? 0}`;
    console.log(`  TRACE [${action.padEnd(11)}] d${String(state.day).padStart(3)} mi${String(state.location.milesTraveled).padStart(4)} hp(min/avg)=${minHp}/${avgHp} mor=${state.morale} c=${conds.length}[${conds.join(',')}] ox=${oxAlive}@${oxAvgFat}fat w${state.resources.water}/${state.resources.waterCap} fw=${state.resources.firewood} ${food} ${meds} $${state.cash}`);
  }
  trace('START');

  let dayCount = 0;
  // #161 — consecutive-rest cap explored in the May-12 audit branch
  // (cap=2 and cap=3 both swung wipe rate 22 → 95-100%). The cap idea
  // is preserved here for future tuning but kept disabled: it denies
  // recovery time mid-cholera, and bots that can't rest die. A safer
  // re-introduction would gate the cap on "HP is recovering" rather
  // than blanket day-count.
  while (!state.completed && dayCount < maxDays) {
    dayCount += 1;
    const dayBefore = state.day;
    const supplyBefore = {
      food: totalFoodLb(state.inventory),
      gunpowder: state.inventory.gunpowder ?? 0,
      leadBalls: state.inventory.lead_balls ?? 0,
      cash: state.cash
    };
    let actionType: keyof RunningStats['actionDays'] = 'other';
    try {
      let firedEventToday = false;

      if (state.location.atLandmarkId) {
        // Landmark handling — may advance multiple days (inn stay) or
        // exactly one (ford), or zero (just clear scenic flag).
        const here = getLandmark(state.location.atLandmarkId);
        actionType = here.kind === 'river' ? 'ford' : here.kind === 'trading_post' ? 'tradingPost' : 'other';
        state = handleLandmark(state, persona, stats, botRng);
        firedEventToday = true;
      } else if (persona.shouldFindWater(state, botRng)) {
        actionType = 'findWater';
        state = restWithBundle(state, persona, 'find_water', botRng, stats);
        firedEventToday = true;
      } else if (persona.shouldPan(state, botRng)) {
        // #313 — gold panning camp action. Half-day spent at a creek in
        // gold country (mile ≥ 700, river terrain, year ≥ 1849). Mostly
        // yields nothing per period reality; gentle cash trickle.
        // Cooldown lives in `canPanForGold` to keep weekly cadence.
        actionType = 'rest';
        try {
          state = rest(state, 1, { campActions: ['pan_for_gold'] });
          state = {
            ...state,
            flags: { ...state.flags, _lastPannedDay: state.day }
          };
          stats.decisionsMade += 1;
          firedEventToday = true;
        } catch (err) {
          stats.errors.push(`pan: ${(err as Error).message}`);
        }
      } else if (persona.shouldRaid(state, botRng)) {
        // #316 — raid the native camp. Camp action gates on rifle +
        // ammo + raidable tribe nearby + year ≥ 1845; the persona
        // surface decides the *want*. All default personas refuse;
        // chaos rolls a small chance to fuzz the path. Outcome is
        // 30/70 inside the action; revenge ambush event fires
        // 5-15 days later via _raidRevengeDay flag.
        actionType = 'rest';
        try {
          state = rest(state, 1, { campActions: ['raid_natives'] });
          stats.decisionsMade += 1;
          firedEventToday = true;
        } catch (err) {
          stats.errors.push(`raid: ${(err as Error).message}`);
        }
      } else if (persona.shouldStealFromTrain(state, botRng)) {
        // #314 — take from the train. Camp action gates on being in a
        // train with live companions; persona decides the *want*.
        // Default personas all refuse; chaos rolls 3% for fuzz cover.
        // 50/35/15 outcome (caught / small grab / bigger grab).
        actionType = 'rest';
        try {
          state = rest(state, 1, { campActions: ['take_from_train'] });
          stats.decisionsMade += 1;
          firedEventToday = true;
        } catch (err) {
          stats.errors.push(`steal: ${(err as Error).message}`);
        }
      } else if (persona.shouldHunt(state, botRng)) {
        actionType = 'hunt';
        state = doBotHunt(state, stats);
        firedEventToday = true;
        stats.decisionsMade += 1;
      } else if (persona.shouldRest(state, botRng)) {
        actionType = 'rest';
        // #927 — every rest day now bundles. find_water gets pre-elected
        // as primary when the keg is low; otherwise the bundle promotes
        // the highest-urgency action (gather_firewood when firewood is
        // low, cure_meat when meat is spoiling, etc.). Subsumes the
        // earlier v8 water-chain and #963 firewood-piggyback heuristics.
        const cap = state.resources.waterCap ?? 20;
        const ratio = cap > 0 ? state.resources.water / cap : 1;
        const primary: CampActionId | null = ratio < 0.6 ? 'find_water' : null;
        try {
          state = restWithBundle(state, persona, primary, botRng, stats);
          firedEventToday = true;
        } catch (err) {
          stats.errors.push(`rest: ${(err as Error).message}`);
          break;
        }
      } else {
        // Travel day.
        actionType = 'travel';
        state = {
          ...state,
          pace: persona.pickPace(state, botRng),
          rations: persona.pickRations(state, botRng),
          waterRation: persona.pickWaterRation(state, botRng)
        };
        const tick = tickDayPausable(state);
        state = tick.state;

        if (tick.pendingEvent) {
          firedEventToday = true;
          actionType = 'eventChoice';
          const ev = tick.pendingEvent;
          stats.eventsFiredById[ev.id] = (stats.eventsFiredById[ev.id] ?? 0) + 1;
          // #929 — wagon_wheel gets its own persona surface that encodes
          // blacksmith / spare / condition heuristics. Route it here
          // before the generic pickEventChoice fallthrough.
          let choiceId: string;
          if (ev.id === 'wagon_wheel') {
            choiceId = persona.pickWheelBreakResponse(state, botRng);
          } else {
            choiceId = persona.pickEventChoice(state, ev, botRng);
          }
          stats.decisionsMade += 1;
          state = applyPendingChoice(state, ev, choiceId);
          // #936b — the bot has no modal; if it chose `abandon_load`
          // (or any path that sets `_mudAbandonPending`), resolve it
          // here via the persona's drop order so the run never stalls.
          if (state.flags._mudAbandonPending) {
            state = abandonHeavyLoad(state, persona.mudAbandonmentPriority?.()).state;
            const flags = { ...state.flags };
            delete (flags as Record<string, unknown>)._mudAbandonPending;
            state = { ...state, flags };
          }
        }

        // #1046 B — company-rest dissent. If tickDayPausable paused for a
        // forced lay-by the player hasn't answered, resolve it here via
        // the persona's shouldDissent. Resume is applyCompanyDissent (a
        // tail-only continuation that finishes the day) — NOT a re-tick
        // (re-ticking double-drains food/conditions; that was the fixed bug).
        if (state.flags._companyDissentPending) {
          const decision = companyRestDecision(state);
          let choice: DissentChoice = persona.shouldDissent(state, decision, botRng);
          // A bot that IS the captain can't "lobby" itself → that maps
          // to the deterministic captain-override.
          if (choice === 'lobby' && playerIsCaptain(state)) choice = 'override';
          // Resume via the tail-only continuation — it resolves the
          // choice AND finishes the day (advances it). Do NOT `continue`
          // into a re-tick of the same day (would double-drain).
          state = applyCompanyDissent(state, choice, botRng);
          stats.decisionsMade += 1;
        }
      }

      // Attribute the day delta to the action that ran. Some actions
      // (zero-day landmark walk-pasts, trade/repair/ox-swap at a post)
      // consume 0 calendar days — they must NOT be attributed a
      // phantom day. #1040 fix: was `Math.max(1, …)`, which inflated
      // tradingPost (and any 0-day handler) by ~1 day per visit and
      // made `actionDays` overcount vs real `daysElapsed`. Now: only
      // attribute the true delta; 0-day iterations add nothing, so
      // sum(actionDays) === daysElapsed exactly.
      const delta = state.day - dayBefore;
      if (delta > 0) stats.actionDays[actionType] += delta;

      recordSupplyFlow(supplyBefore, state, stats);
      recordDeaths(state, stats);
      prevLowHealthIds = recordHealthDrama(state, prevLowHealthIds, stats);
      prevLiveOxen = recordOxDeaths(state, prevLiveOxen, stats);
      trace(actionType);

      if (firedEventToday) {
        stats.daysWithoutEvent = 0;
      } else {
        stats.daysWithoutEvent += 1;
        if (stats.daysWithoutEvent > stats.longestBoringStretch) {
          stats.longestBoringStretch = stats.daysWithoutEvent;
        }
      }

      // Loop-protection — if a day passed but state.day didn't advance
      // (could happen if a landmark handler short-circuited), force-
      // advance to avoid infinite loop.
      if (state.day === dayBefore && !state.completed) {
        // No-op to silence — the loop will check completed next; the
        // dayCount cap is the real safety net.
      }
    } catch (err) {
      stats.errors.push(`day ${state.day}: ${(err as Error).message}`);
      break;
    }
  }

  const arrivalScore = computeArrivalScore(state).total;
  const aliveCount = state.party.filter((m) => !m.dead).length;
  const uniqueEventCount = Object.keys(stats.eventsFiredById).length;

  const funScore = computeFunScore({
    daysElapsed: dayCount,
    uniqueEventCount,
    dramaBeatCount: stats.dramaBeatCount,
    decisionsMade: stats.decisionsMade,
    longestBoringStretch: stats.longestBoringStretch,
    aliveCount,
    startingPartySize,
    outcome: state.outcome,
    errorCount: stats.errors.length
  });

  return {
    seed: opts.seed,
    persona: opts.persona,
    leaderProfession,
    outcome: state.outcome,
    daysElapsed: dayCount,
    milesTraveled: Math.round(state.location.milesTraveled),
    finalCash: state.cash,
    finalMorale: state.morale,
    startingPartySize,
    endingAliveCount: aliveCount,
    deathsByCause: stats.deathsByCause,
    eventsFiredById: stats.eventsFiredById,
    uniqueEventCount,
    dramaBeatCount: stats.dramaBeatCount,
    longestBoringStretch: stats.longestBoringStretch,
    decisionsMade: stats.decisionsMade,
    errors: stats.errors,
    arrivalScore,
    funScore: funScore.total,
    funBreakdown: funScore.breakdown,
    actionDays: stats.actionDays,
    supplies: stats.supplies,
    finalState: state
  };
}
