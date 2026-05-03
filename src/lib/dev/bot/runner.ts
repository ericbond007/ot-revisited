// #275 Bot run loop — drives a full game from outfit-skip through
// arrival or wipe via direct engine calls. No SvelteKit, no HTTP.
//
// Loop shape per day:
//   1. Set pace + rations from persona
//   2. tickDayPausable — fire weather, consumption, conditions, travel
//   3. If a pendingEvent fired, persona picks choice, applyPendingChoice
//   4. If at landmark, walk past (visit/trade modals are follow-ups)
//   5. If completed, stop

import { createInitialState } from '../../game/engine';
import { tickDayPausable, applyPendingChoice } from '../../game/engine-pausable';
import { score as computeArrivalScore } from '../../game/systems/scoring';
import type { GameState, ProfessionId } from '../../game/types';
import { getPersona } from './personas';
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

/** Track health-based drama beats: any new dip below 30 HP on an alive
 *  member counts as one beat per onset. We track via a flag set so a
 *  member that dips, recovers, dips again counts twice — but a member
 *  that lingers below 30 isn't a fresh beat each tick. */
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
    if (!prevLowHealthIds.has(id)) {
      stats.dramaBeatCount += 1;
    }
  }
  return currentLow;
}

/** Track ox death drama. */
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
    try {
      // Apply persona pace + rations before the tick.
      state = {
        ...state,
        pace: persona.pickPace(state),
        rations: persona.pickRations(state)
      };

      const tick = tickDayPausable(state);
      state = tick.state;

      let firedEventToday = false;

      if (tick.pendingEvent) {
        firedEventToday = true;
        const ev = tick.pendingEvent;
        stats.eventsFiredById[ev.id] = (stats.eventsFiredById[ev.id] ?? 0) + 1;
        const choiceId = persona.pickEventChoice(state, ev);
        stats.decisionsMade += 1;
        state = applyPendingChoice(state, ev, choiceId);
      }

      // At-landmark stops (rivers, trading posts, end). The bot just
      // clears the at-landmark flag so travel resumes — Visit / Ford /
      // Trade modal logic is a follow-up.
      if (state.location.atLandmarkId) {
        // Treat as a decision moment for scoring purposes.
        firedEventToday = true;
        stats.decisionsMade += 1;
        state = {
          ...state,
          location: { ...state.location, atLandmarkId: null }
        };
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
    } catch (err) {
      stats.errors.push(`day ${state.day}: ${(err as Error).message}`);
      // Bail on the run when an error fires — better to surface it
      // cleanly than to mask follow-on cascading errors.
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
