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
import { stayAtInn } from '../../game/systems/town-services';
import { canBoilWater as canBoilWaterInState } from '../../game/systems/water-purity';
import { score as computeArrivalScore } from '../../game/systems/scoring';
import { getLandmark, type Landmark } from '../../game/content/landmarks';
import type { GameState, ProfessionId } from '../../game/types';
import { getPersona, type Persona } from './personas';
import { computeFunScore } from './scoring';
import type { BotRunOpts, BotRunReport } from './types';

const DEFAULT_MAX_DAYS = 250;

interface RunningStats {
  eventsFiredById: Record<string, number>;
  decisionsMade: number;
  dramaBeatCount: number;
  daysWithoutEvent: number;
  longestBoringStretch: number;
  deathsByCause: Record<string, number>;
  deadIds: Set<string>;
  errors: string[];
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
    errors: []
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

/** Build a buy list of staples the bot wants when trading at a post.
 *  Filters to items the post actually stocks. */
function buildBotShoppingList(
  state: GameState,
  here: Landmark
): Array<{ item: string; qty: number }> {
  const stock = new Set(here.stock ?? []);
  const buys: Array<{ item: string; qty: number }> = [];
  if (stock.has('flour') && (state.inventory.flour ?? 0) < 100) {
    buys.push({ item: 'flour', qty: 50 });
  }
  if (stock.has('bacon') && (state.inventory.bacon ?? 0) < 30) {
    buys.push({ item: 'bacon', qty: 20 });
  }
  if (stock.has('beans') && (state.inventory.beans ?? 0) < 20) {
    buys.push({ item: 'beans', qty: 10 });
  }
  return buys;
}

/** Try to handle the landmark we're parked at. Returns the new state
 *  with atLandmarkId cleared (or unchanged at the end-of-trail). */
function handleLandmark(state: GameState, persona: Persona, stats: RunningStats): GameState {
  const id = state.location.atLandmarkId;
  if (!id) return state;
  const here = getLandmark(id);
  let s = state;

  try {
    if (here.kind === 'river') {
      const method = persona.pickFordMethod(s, here);
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
      // Maybe buy supplies, maybe stay at inn, then leave.
      if (persona.shouldTradeAtPost(s, here)) {
        const buys = buildBotShoppingList(s, here);
        const totalGuess = buys.reduce((sum, b) => sum + b.qty * 0.5, 0); // rough cap
        if (buys.length > 0 && s.cash >= totalGuess) {
          try {
            s = trade(s, { buys });
            stats.decisionsMade += 1;
          } catch {
            // Trade failed (cash, stock, etc.) — skip.
          }
        }
      }
      if (persona.shouldStayAtInn(s, here)) {
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
    const aliveAdults = state.party.filter((m) => !m.dead && m.kind === 'adult').length;
    return hunt(state, { target, ammo, hunters: Math.max(1, aliveAdults) });
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
  const companions = (opts.companionProfessions ?? ['doctor', 'hunter']).map((p, i) => ({
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

  let dayCount = 0;
  while (!state.completed && dayCount < maxDays) {
    dayCount += 1;
    const dayBefore = state.day;
    try {
      let firedEventToday = false;

      if (state.location.atLandmarkId) {
        // Landmark handling — may advance multiple days (inn stay) or
        // exactly one (ford), or zero (just clear scenic flag).
        state = handleLandmark(state, persona, stats);
        firedEventToday = true;
      } else if (persona.shouldFindWater(state)) {
        // Rest one day with find_water (and boil_water if firewood +
        // boiling-knowledge). Falls back to find_water alone (dirty
        // water — disease risk — beats dying of thirst). Falls back to
        // plain rest if even that fails.
        const tryCamps: Array<readonly ('find_water' | 'boil_water')[]> = [];
        const fw = state.resources.firewood ?? 0;
        if (canBoilWaterInState(state) && fw >= 1) {
          tryCamps.push(['find_water', 'boil_water']);
        }
        tryCamps.push(['find_water']);
        let restored = false;
        for (const camp of tryCamps) {
          try {
            state = rest(state, 1, { campActions: [...camp] });
            restored = true;
            break;
          } catch {
            // try next fallback
          }
        }
        if (!restored) {
          // Final fallback — passive rest, no camp actions. At least
          // doesn't burn the day on a thrown error.
          try {
            state = rest(state, 1);
          } catch (err) {
            stats.errors.push(`rest-fallback: ${(err as Error).message}`);
            break;
          }
        }
        stats.decisionsMade += 1;
        firedEventToday = true;
      } else if (persona.shouldHunt(state)) {
        state = doBotHunt(state, stats);
        firedEventToday = true;
        stats.decisionsMade += 1;
      } else if (persona.shouldRest(state)) {
        try {
          state = rest(state, 1);
          stats.decisionsMade += 1;
          firedEventToday = true;
        } catch (err) {
          stats.errors.push(`rest: ${(err as Error).message}`);
          // Bail on the run when an error fires.
          break;
        }
      } else {
        // Travel day.
        state = {
          ...state,
          pace: persona.pickPace(state),
          rations: persona.pickRations(state)
        };
        const tick = tickDayPausable(state);
        state = tick.state;

        if (tick.pendingEvent) {
          firedEventToday = true;
          const ev = tick.pendingEvent;
          stats.eventsFiredById[ev.id] = (stats.eventsFiredById[ev.id] ?? 0) + 1;
          const choiceId = persona.pickEventChoice(state, ev);
          stats.decisionsMade += 1;
          state = applyPendingChoice(state, ev, choiceId);
        }
      }

      recordDeaths(state, stats);
      prevLowHealthIds = recordHealthDrama(state, prevLowHealthIds, stats);
      prevLiveOxen = recordOxDeaths(state, prevLiveOxen, stats);

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
    funBreakdown: funScore.breakdown
  };
}
