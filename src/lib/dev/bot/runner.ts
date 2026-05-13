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
import { tickDayPausable, applyPendingChoice } from '../../game/engine-pausable';
import { rest } from '../../game/actions/rest';
import { hunt, type HuntTarget, type AmmoBand } from '../../game/actions/hunt';
import { trade } from '../../game/actions/trade';
import { ford, type FordMethod, type RiverState } from '../../game/actions/ford';
import { stayAtInn, repairWagon, swapOxen, swapOxenCost } from '../../game/systems/town-services';
import { joinTrain } from '../../game/systems/wagon-train';
import { canBoilWater as canBoilWaterInState } from '../../game/systems/water-purity';
import { score as computeArrivalScore } from '../../game/systems/scoring';
import { getLandmark, type Landmark } from '../../game/content/landmarks';
import type { GameState, ProfessionId } from '../../game/types';
import type { Rng } from '../../game/rng';
import {
  getPersona,
  makeBotRng,
  type Persona,
  composeShoppingList,
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
    actionDays: { travel: 0, rest: 0, findWater: 0, hunt: 0, ford: 0, tradingPost: 0, eventChoice: 0, other: 0 }
  };
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

/** Pick a hunt target based on terrain. Big game on plains/prairie,
 *  small in forest, gather as the no-ammo fallback. */
function pickHuntTarget(state: GameState): { target: HuntTarget; ammo: AmmoBand } {
  const inv = state.inventory;
  const plenty = (inv.gunpowder ?? 0) > 30
    && ((inv.lead_balls ?? 0) > 30 || (inv.lead_pig ?? 0) >= 1)
    && (inv.percussion_caps ?? 0) > 30;
  const terrain = state.location.terrain;
  if (terrain === 'prairie' && plenty) return { target: 'big', ammo: 'moderate' };
  if (terrain === 'forest') return { target: 'medium', ammo: 'moderate' };
  return { target: 'small', ammo: 'light' };
}

/** Rest one day with a find_water + boil_water camp-action chain.
 *  Falls back gracefully if the rest action throws (e.g. firewood out,
 *  no boil capability): `gather_firewood + find_water + boil_water` →
 *  `find_water + boil_water` → `find_water` alone → plain rest.
 *  Used both by the explicit findWater branch (keg <persona threshold)
 *  and by the v8 rest-chains-water-when-low piggyback path so the bot
 *  doesn't burn separate calendar days on rest and water-find. */
function restWithWaterChain(state: GameState, stats: RunningStats): GameState {
  const tryCamps: Array<readonly ('find_water' | 'boil_water' | 'gather_firewood')[]> = [];
  const fw = state.resources.firewood ?? 0;
  if (canBoilWaterInState(state)) {
    if (fw < 5) {
      tryCamps.push(['gather_firewood', 'find_water', 'boil_water']);
    }
    if (fw >= 1) {
      tryCamps.push(['find_water', 'boil_water']);
    }
  }
  tryCamps.push(['find_water']);
  for (const camp of tryCamps) {
    try {
      const next = rest(state, 1, { campActions: [...camp] });
      stats.decisionsMade += 1;
      return next;
    } catch {
      // try next fallback
    }
  }
  // All chains failed — passive rest, no camp actions.
  try {
    const next = rest(state, 1);
    stats.decisionsMade += 1;
    return next;
  } catch (err) {
    stats.errors.push(`rest-fallback: ${(err as Error).message}`);
    return state;
  }
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
  return composeShoppingList(
    { wagon: state, stock },
    {
      food: persona.pickFoodRestockOpts(state),
      equipment: persona.pickEquipmentRestockOpts(state)
    }
  );
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
      if (!s.wagonTrain && persona.shouldJoinTrain(s, here, rng)) {
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
        // attempt the trade if shouldTradeAtPost said yes; if it
        // throws (cash short for full list), the cull-from-tail loop
        // inside `trade()` drops items until cost fits, OR fall back
        // to food-only as before.
        if (buys.length > 0) {
          try {
            s = trade(s, { buys });
            stats.decisionsMade += 1;
          } catch {
            // Trade refused full list — try food-only fallback.
            const fallback = buys.filter((b) =>
              b.item === 'flour' || b.item === 'bacon' || b.item === 'beans'
              || b.item === 'jerky'
            );
            if (fallback.length > 0) {
              try {
                s = trade(s, { buys: fallback });
                stats.decisionsMade += 1;
              } catch {
                // Even the fallback failed — last resort: buy only
                // flour with whatever cash remains. trade() will cull
                // qty down to fit (#287a NPC pattern).
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
                    s = trade(s, { buys: [{ item: 'flour', qty: Math.min(flourOnly.qty, affordableQty) }] });
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
              s = trade(s, { buys: medsOnly });
              stats.decisionsMade += 1;
            } catch {
              const essentials = medsOnly.filter((b) =>
                b.item === 'quinine' || b.item === 'calomel'
              );
              if (essentials.length > 0) {
                try { s = trade(s, { buys: essentials }); stats.decisionsMade += 1; } catch { /* skip */ }
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
              s = trade(s, { buys: foodOnly });
              stats.decisionsMade += 1;
            } catch {
              // Cash short on the full list — drop to flour + bacon only.
              const essentials = foodOnly.filter((b) =>
                b.item === 'flour' || b.item === 'bacon'
              );
              if (essentials.length > 0) {
                try { s = trade(s, { buys: essentials }); stats.decisionsMade += 1; } catch { /* skip */ }
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
          const barterNeed = 2 * want;
          let swapped = false;
          if (sorted.length >= barterNeed) {
            const surrenderIds = sorted.slice(0, barterNeed).map((o) => o.id);
            const { cost } = swapOxenCost(s, want, {});
            if (s.cash >= cost) {
              try {
                s = swapOxen(s, surrenderIds, want, {}).state;
                stats.decisionsMade += 1;
                swapped = true;
              } catch {
                // Barter failed — try cash-only fallback below.
              }
            }
          }
          if (!swapped) {
            const { cost: cashCost } = swapOxenCost(s, want, { cashOnly: true });
            if (s.cash >= cashCost) {
              try {
                s = swapOxen(s, [], want, { cashOnly: true }).state;
                stats.decisionsMade += 1;
              } catch {
                // Cash-only failed — skip.
              }
            }
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

/** Auto-fill companion professions to reach the requested party size,
 *  picking in priority order: doctor (medic), hunter (food), teamster
 *  (oxen), blacksmith (repairs), scout (speed). Capped at 5 companions
 *  (= party size 6). Skips the leader's profession to avoid duplicates
 *  when the leader is one of the priority roles. */
const COMPANION_PRIORITY: ProfessionId[] = ['doctor', 'hunter', 'teamster', 'blacksmith', 'scout'];

function defaultCompanions(partySize: number, leader: ProfessionId): ProfessionId[] {
  const want = Math.max(0, Math.min(5, partySize - 1));
  const picks: ProfessionId[] = [];
  for (const p of COMPANION_PRIORITY) {
    if (picks.length >= want) break;
    if (p !== leader) picks.push(p);
  }
  // If the leader was in the priority list, the loop above produced one
  // short — pad with farmer (generic able-body) until we hit the count.
  while (picks.length < want) picks.push('farmer');
  return picks;
}

export function runBot(opts: BotRunOpts): BotRunReport {
  const persona = getPersona(opts.persona);
  const startDate = opts.startDate ?? { year: 1849, month: 4, day: 15 };
  const maxDays = opts.maxDays ?? DEFAULT_MAX_DAYS;
  const leaderProfession: ProfessionId = opts.leaderProfession ?? 'farmer';
  const partySize = Math.max(1, Math.min(6, opts.partySize ?? 3));
  const companionProfs = opts.companionProfessions
    ?? defaultCompanions(partySize, leaderProfession);
  const companions = companionProfs.map((p, i) => ({
    name: `Comp${i + 1}`,
    profession: p,
    sex: i % 2 === 0 ? ('female' as const) : ('male' as const)
  }));

  let state: GameState = createInitialState({
    seed: opts.seed,
    leader: { name: 'Botleader', profession: leaderProfession },
    companions,
    startDate
  });

  const stats = newStats();
  const startingPartySize = state.party.length;

  let prevLowHealthIds = new Set<string>(
    state.party.filter((m) => !m.dead && m.health < 30).map((m) => m.id)
  );
  let prevLiveOxen = new Set<string>(state.oxen.filter((o) => o.health > 0).map((o) => o.id));

  // Bot-side RNG — distinct from the engine's tick RNG so chaos
  // randomness doesn't reach into engine state. Threaded into every
  // persona method.
  const botRng = makeBotRng(opts.seed);

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
        state = restWithWaterChain(state, stats);
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
        // v8: chain find_water + boil_water into the rest day when the
        // keg is heading low. The party is already burning the day on
        // rest — pulling double duty topping the keg avoids a separate
        // findWater day later. `restWithWaterChain` falls back to a
        // plain rest if no chain succeeds.
        const cap = state.resources.waterCap ?? 20;
        const ratio = cap > 0 ? state.resources.water / cap : 1;
        if (ratio < 0.6) {
          state = restWithWaterChain(state, stats);
        } else {
          try {
            state = rest(state, 1);
            stats.decisionsMade += 1;
            firedEventToday = true;
          } catch (err) {
            stats.errors.push(`rest: ${(err as Error).message}`);
            break;
          }
        }
      } else {
        // Travel day.
        actionType = 'travel';
        state = {
          ...state,
          pace: persona.pickPace(state, botRng),
          rations: persona.pickRations(state, botRng)
        };
        const tick = tickDayPausable(state);
        state = tick.state;

        if (tick.pendingEvent) {
          firedEventToday = true;
          actionType = 'eventChoice';
          const ev = tick.pendingEvent;
          stats.eventsFiredById[ev.id] = (stats.eventsFiredById[ev.id] ?? 0) + 1;
          const choiceId = persona.pickEventChoice(state, ev, botRng);
          stats.decisionsMade += 1;
          state = applyPendingChoice(state, ev, choiceId);
        }
      }

      // Attribute the day delta to the action that ran. Some actions
      // (zero-day landmark walk-pasts) are 0; rest/find_water/inn-stay
      // can be ≥1.
      const delta = Math.max(1, state.day - dayBefore);
      stats.actionDays[actionType] += delta;

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
    actionDays: stats.actionDays
  };
}
