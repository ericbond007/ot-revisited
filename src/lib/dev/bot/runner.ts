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
import { stayAtInn, repairWagon } from '../../game/systems/town-services';
import { joinTrain } from '../../game/systems/wagon-train';
import { canBoilWater as canBoilWaterInState } from '../../game/systems/water-purity';
import { hasLiveHunter, hasLiveBlacksmith } from '../../game/professions/predicates';
import { score as computeArrivalScore } from '../../game/systems/scoring';
import { getLandmark, type Landmark } from '../../game/content/landmarks';
import type { GameState, ProfessionId } from '../../game/types';
import type { Rng } from '../../game/rng';
import { getPersona, makeBotRng, type Persona } from '../../game/ai';
import { computeFunScore } from './scoring';
import type { BotRunOpts, BotRunReport } from './types';

// Real emigrant journeys ran 4–6 months. 365 = ~1 year, comfortable
// headroom for slow / interrupted runs without letting infinite-loop
// bugs cook for hours.
const DEFAULT_MAX_DAYS = 365;

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

/** Build a buy list the bot wants when trading at a post. Filters to
 *  items the post actually stocks. Three layers, in priority order:
 *  (1) **survival gear** — coats / blankets / tents for cold-camp
 *  protection (the #1 cause of "Exposure" deaths in v2 smoke runs);
 *  (2) **food staples** — top up flour / bacon / beans when below
 *  threshold; (3) **utility** — shovel / cookware / water_skin if
 *  missing. Quantities tuned for a 3-person party. */
function buildBotShoppingList(
  state: GameState,
  here: Landmark
): Array<{ item: string; qty: number }> {
  const stock = new Set(here.stock ?? []);
  const inv = state.inventory;
  const aliveCount = state.party.filter((m) => !m.dead).length || 1;
  const buys: Array<{ item: string; qty: number }> = [];

  // Survival gear — coat + blanket per person, one tent for the party.
  // Period reality: emigrants who left Independence without warm gear
  // either bought at Kearny / Laramie or froze on the high plains.
  if (stock.has('coat')) {
    const need = Math.max(0, aliveCount - (inv.coat ?? 0));
    if (need > 0) buys.push({ item: 'coat', qty: need });
  }
  if (stock.has('blanket')) {
    const need = Math.max(0, aliveCount - (inv.blanket ?? 0));
    if (need > 0) buys.push({ item: 'blanket', qty: need });
  }
  if (stock.has('tent') && (inv.tent ?? 0) < 1) {
    buys.push({ item: 'tent', qty: 1 });
  }
  if (stock.has('boots')) {
    const need = Math.max(0, aliveCount - (inv.boots ?? 0));
    if (need > 0) buys.push({ item: 'boots', qty: need });
  }

  // Utility — shovel, cookware, water_skins.
  if (stock.has('shovel') && (inv.shovel ?? 0) < 1) {
    buys.push({ item: 'shovel', qty: 1 });
  }
  if (stock.has('cookware') && (inv.cookware ?? 0) < 1) {
    buys.push({ item: 'cookware', qty: 1 });
  }
  if (stock.has('water_skin') && (inv.water_skin ?? 0) < 2) {
    buys.push({ item: 'water_skin', qty: 1 });
  }
  if (stock.has('rope') && (inv.rope ?? 0) < 1) {
    buys.push({ item: 'rope', qty: 1 });
  }

  // Food staples — top off generously. v8 trace showed runs were
  // surviving the team-fatigue trap, then starving on the
  // Laramie→Bridger stretch (200+ mi between posts) because flour
  // was at ~80 lb leaving Laramie. A 3-person party burns ~5 lb/day
  // staples; 200 lb flour + 60 lb meat + 40 lb beans = ~50 days of
  // food, comfortable for any inter-post leg. Quantities scale with
  // party size to keep the math working with the children expansion.
  const partyMul = Math.max(1, aliveCount);
  // Flour cap pushed to 300 in v8 — Fort Bridger→Hall is ~220 mi at
  // ~10 mi/day in mountains/plateau = 22 days = ~330 lb staples for
  // a 3-person party. Bot was leaving Bridger at 200 lb and starving
  // before Boise.
  if (stock.has('flour') && (inv.flour ?? 0) < 300) {
    buys.push({ item: 'flour', qty: 200 - (inv.flour ?? 0) });
  }
  if (stock.has('bacon') && (inv.bacon ?? 0) < 80) {
    buys.push({ item: 'bacon', qty: 60 - (inv.bacon ?? 0) });
  }
  if (stock.has('beans') && (inv.beans ?? 0) < 50) {
    buys.push({ item: 'beans', qty: 40 - (inv.beans ?? 0) });
  }
  if (stock.has('jerky') && (inv.jerky ?? 0) < 30) {
    buys.push({ item: 'jerky', qty: 20 - (inv.jerky ?? 0) });
  }
  // Grain for oxen/mules — without it, oxen draw fatigue penalty on
  // poor-grazing terrain. 20 lb covers ~5 days of poor grazing for a
  // 4-team. Stockpiling small qty rather than a full barrel.
  if (stock.has('grain') && (inv.grain ?? 0) < 30 * partyMul) {
    buys.push({ item: 'grain', qty: 30 });
  }

  // Hunter on the party → hunt is the primary food source on long
  // legs, so ammo capacity is a load-bearing input. Stock more
  // gunpowder + lead + caps so the bot doesn't run dry mid-stretch.
  if (hasLiveHunter(state)) {
    if (stock.has('gunpowder') && (inv.gunpowder ?? 0) < 30) {
      buys.push({ item: 'gunpowder', qty: 30 - (inv.gunpowder ?? 0) });
    }
    if (stock.has('lead_balls') && (inv.lead_balls ?? 0) < 30) {
      buys.push({ item: 'lead_balls', qty: 30 - (inv.lead_balls ?? 0) });
    }
    if (stock.has('percussion_caps') && (inv.percussion_caps ?? 0) < 30) {
      buys.push({ item: 'percussion_caps', qty: 30 - (inv.percussion_caps ?? 0) });
    }
    if (stock.has('salt') && (inv.salt ?? 0) < 10) {
      // Salt preserves fresh game meat (#122) — without it, meat spoils
      // and the hunt's haul rots before the next post.
      buys.push({ item: 'salt', qty: 10 - (inv.salt ?? 0) });
    }
  }

  // Blacksmith on the party → smithy repair is half-price (engine
  // #154), so the bot buys more spare wagon parts to leverage that
  // and keep the wagon high-condition. Period: blacksmith was the
  // emigrant's value-multiplier at every fort along the trail.
  if (hasLiveBlacksmith(state)) {
    if (stock.has('axle') && (inv.axle ?? 0) < 1) {
      buys.push({ item: 'axle', qty: 1 });
    }
    if (stock.has('wheel') && (inv.wheel ?? 0) < 1) {
      buys.push({ item: 'wheel', qty: 1 });
    }
    if (stock.has('tongue') && (inv.tongue ?? 0) < 1) {
      buys.push({ item: 'tongue', qty: 1 });
    }
    if (stock.has('tar_bucket') && (inv.tar_bucket ?? 0) < 1) {
      buys.push({ item: 'tar_bucket', qty: 1 });
    }
  }

  // Medicine — without these, cholera / typhoid / dysentery deal full
  // daily damage and the bot grinds to a rest-cycle halt. Period
  // reality: emigrants who could afford it stocked quinine, bandages,
  // laudanum at every major post. Modest quantities — these are
  // priced like luxuries. Treatment items are consumed one per day per
  // condition, so 3-5 doses per drug usually covers a 3-person party
  // through the next disease cluster.
  if (stock.has('quinine') && (inv.quinine ?? 0) < 4) {
    buys.push({ item: 'quinine', qty: 4 - (inv.quinine ?? 0) });
  }
  if (stock.has('bandages') && (inv.bandages ?? 0) < 4) {
    buys.push({ item: 'bandages', qty: 4 - (inv.bandages ?? 0) });
  }
  if (stock.has('laudanum') && (inv.laudanum ?? 0) < 3) {
    buys.push({ item: 'laudanum', qty: 3 - (inv.laudanum ?? 0) });
  }
  if (stock.has('dovers_powder') && (inv.dovers_powder ?? 0) < 3) {
    buys.push({ item: 'dovers_powder', qty: 3 - (inv.dovers_powder ?? 0) });
  }
  // Dysentery treatments — stocked separately because dysentery is the
  // most persistent "background" condition (-3/day, no auto-clear). v8
  // trace: bot stalled at mi 1343 because dysentery ticked for 90 days
  // unmedicated, morale collapsed, party gave up.
  if (stock.has('calomel') && (inv.calomel ?? 0) < 3) {
    buys.push({ item: 'calomel', qty: 3 - (inv.calomel ?? 0) });
  }
  if (stock.has('paregoric') && (inv.paregoric ?? 0) < 3) {
    buys.push({ item: 'paregoric', qty: 3 - (inv.paregoric ?? 0) });
  }
  if (stock.has('epsom_salts') && (inv.epsom_salts ?? 0) < 3) {
    buys.push({ item: 'epsom_salts', qty: 3 - (inv.epsom_salts ?? 0) });
  }
  // Dried fruit is the scurvy auto-cure — stockpile a small supply.
  if (stock.has('dried_fruit') && (inv.dried_fruit ?? 0) < 5) {
    buys.push({ item: 'dried_fruit', qty: 5 - (inv.dried_fruit ?? 0) });
  }

  return buys;
}

/** Has the party got the basic survival gear? Used by the persona's
 *  shouldTradeAtPost trigger so the bot stops at posts that stock
 *  warmth gear even when food is fine. */
function missingSurvivalGear(state: GameState): boolean {
  const inv = state.inventory;
  const aliveCount = state.party.filter((m) => !m.dead).length || 1;
  return (inv.coat ?? 0) < aliveCount
    || (inv.blanket ?? 0) < aliveCount
    || (inv.tent ?? 0) < 1;
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
      if (!s.wagonTrain) {
        try {
          s = joinTrain(s, rng).state;
          stats.decisionsMade += 1;
        } catch {
          // Already in a train — silent skip.
        }
      }

      // Order at a post: smithy repair → trade for goods → inn stay → leave.
      // Repair first because hauling broken-wagon damage further is the
      // worst outcome; cash spent on repair stops the bleed.
      const services = new Set(here.services ?? []);
      if (services.has('blacksmith') && s.wagon.condition < 70 && s.cash >= 20) {
        try {
          const want = Math.min(40, s.cash, Math.round(100 - s.wagon.condition));
          if (want > 0) {
            s = repairWagon(s, want).state;
            stats.decisionsMade += 1;
          }
        } catch {
          // Repair failed — skip.
        }
      }

      if (persona.shouldTradeAtPost(s, here, rng)) {
        const buys = buildBotShoppingList(s, here);
        // Conservative cash check — assume average $1.50/unit; trade()
        // will refuse if the actual total exceeds cash. v8 lowered
        // the gate from 0.5 to 0.25 because the buy list grew (food
        // caps doubled, dysentery meds added) and a 0.5 gate was
        // making the bot skip trades on partial cash and starve later.
        const cashCap = buys.reduce((sum, b) => sum + b.qty * 1.5, 0);
        if (buys.length > 0 && s.cash >= cashCap * 0.25) {
          try {
            s = trade(s, { buys });
            stats.decisionsMade += 1;
          } catch {
            // Trade failed (cash, stock, etc.) — try a smaller buy
            // (food only) as a fallback.
            const fallback = buys.filter((b) =>
              b.item === 'flour' || b.item === 'bacon' || b.item === 'beans'
              || b.item === 'jerky'
            );
            if (fallback.length > 0) {
              try {
                s = trade(s, { buys: fallback });
                stats.decisionsMade += 1;
              } catch {
                // Even the fallback failed — skip silently.
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
