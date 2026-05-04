// #285 — Wagon-train captain elections. Period reality: overland
// companies elected a captain ONCE at the staging town (Independence
// / St. Joseph). Joel Palmer 1845 and Bryant 1846 both document the
// initial vote; on the trail re-elections were event-driven, called
// by petition when the company was unhappy. William Russell was
// ousted on the trail not at any specific fort but because of
// mounting dissatisfaction; family-led trains (Sagers, Reeds) often
// kept the same captain end-to-end. Forts were natural gathering
// spots where dissent could organize, but a contented company at
// Fort Laramie just resupplied and rolled on.
//
// Phase 1 (this branch): elections fire when the player arrives at a
// major post (Kearny / Laramie / Bridger / Hall / Boise) AND the
// company is unhappy enough to call for a vote — average train
// morale below MORALE_VOTE_THRESHOLD. Above that, the captain stays
// and we just resupply. Vote weight per slot = base 1 + charisma ×
// 0.5 + a small RNG nudge. Incumbent gets +1.0 hysteresis so leaders
// aren't churned out by every roll.
//
// Phase 2 (deferred): vote on big decisions (Fort Hall split, pace
// bumps, layovers). Crisis-triggered re-elections — petition right
// after a starvation event or wrong-fork dispute, not just at a
// post. Leader-override-with-morale-cost mechanic. Player-facing
// modal at election time where the player can stand for captaincy
// or stand aside.

import type { GameState, ProfessionId } from '../types';
import type { Rng } from '../rng';
import { professionCharisma } from '../content/professions';

// Landmarks where the company calls for elections. Period grounding:
// these are the major company gathering points where re-elections
// historically happened (Bryant 1846 names Kearny + Laramie + Bridger
// + Hall as the standard re-election stops).
const ELECTION_LANDMARKS = new Set<string>([
  'ft_kearny',
  'ft_laramie',
  'ft_bridger',
  'ft_hall',
  'ft_boise'
]);

const INCUMBENT_BONUS = 1.0;
const CHARISMA_WEIGHT = 0.5;
/** Average train morale below which a vote is called. Period anchor:
 *  diaries record petitions when the company was clearly grumbling —
 *  not when they were merely tired. 55 sits in the middle of the
 *  morale band: above 55 = "the company is fine," below 55 = "people
 *  are talking around the campfire." */
const MORALE_VOTE_THRESHOLD = 55;

interface Candidate {
  id: 'player' | string;
  name: string;
  charisma: number;
  isIncumbent: boolean;
}

function playerLeaderProfession(state: GameState): ProfessionId | null {
  const leader = state.party.find((m) => m.isLeader && !m.dead);
  return (leader?.profession as ProfessionId | undefined) ?? null;
}

/** Average morale across the player + every in-progress companion.
 *  Drives the morale-pressure gate — companies that aren't grumbling
 *  don't call for a vote. */
function averageTrainMorale(state: GameState): number {
  if (!state.wagonTrain) return state.morale;
  const moraleValues: number[] = [state.morale];
  for (const c of state.wagonTrain.companions) {
    if (c.outcome !== 'in-progress') continue;
    moraleValues.push(c.morale);
  }
  if (moraleValues.length === 0) return state.morale;
  return moraleValues.reduce((s, m) => s + m, 0) / moraleValues.length;
}

function buildCandidates(state: GameState): Candidate[] {
  if (!state.wagonTrain) return [];
  const incumbent = state.wagonTrain.leaderId;
  const candidates: Candidate[] = [];
  // Player slot — eligible if leader is alive AND the player hasn't
  // chosen to stand aside (#285 phase 2 — set from the WagonTrain modal).
  const playerProf = playerLeaderProfession(state);
  if (playerProf && !state.wagonTrain.playerStandsAside) {
    candidates.push({
      id: 'player',
      name: state.party.find((m) => m.isLeader)?.name ?? 'Captain',
      charisma: professionCharisma(playerProf),
      isIncumbent: incumbent === 'player'
    });
  }
  // Companion slots — eligible while in-progress with at least one
  // alive party member.
  for (const c of state.wagonTrain.companions) {
    if (c.outcome !== 'in-progress') continue;
    if (!c.party.some((p) => !p.dead)) continue;
    candidates.push({
      id: c.id,
      name: c.name,
      charisma: professionCharisma(c.leaderProfession),
      isIncumbent: incumbent === c.id
    });
  }
  return candidates;
}

function weightFor(c: Candidate, rng: Rng): number {
  // Base 1, plus charisma × 0.5, plus a small RNG nudge so identical
  // charisma scores still produce variance.
  const base = 1 + c.charisma * CHARISMA_WEIGHT;
  const nudge = rng.next() * 0.3;
  const incumbent = c.isIncumbent ? INCUMBENT_BONUS : 0;
  return base + nudge + incumbent;
}

export interface ElectionResult {
  state: GameState;
  /** Whether an election fired this call. */
  ran: boolean;
  /** New leader id, or undefined if no election ran. */
  newLeader?: 'player' | string;
  /** True when the leader changed (used by the player log to read
   *  "elected" vs "re-elected"). */
  changed?: boolean;
  /** Why the vote was skipped — "morale_ok" if the company was
   *  contented, "not_in_train" / "not_at_election_landmark" /
   *  "already_fired_today" / "single_candidate" otherwise. Useful for
   *  tests and future telemetry. */
  skipReason?:
    | 'not_in_train'
    | 'not_at_election_landmark'
    | 'already_fired_today'
    | 'single_candidate'
    | 'morale_ok';
}

/** Run an election if the conditions are right: player is in a train,
 *  arrived at one of the election landmarks, hasn't already held a
 *  vote at this landmark today, AND average train morale has dropped
 *  below MORALE_VOTE_THRESHOLD (the company is grumbling). A
 *  contented company at Fort Laramie just resupplies — no vote.
 *  Side effects: updates `state.wagonTrain.leaderId` and pushes a log
 *  entry. */
export function maybeElectCaptain(state: GameState, rng: Rng): ElectionResult {
  if (!state.wagonTrain) return { state, ran: false, skipReason: 'not_in_train' };
  const landmarkId = state.location.atLandmarkId;
  if (!landmarkId || !ELECTION_LANDMARKS.has(landmarkId)) {
    return { state, ran: false, skipReason: 'not_at_election_landmark' };
  }
  // Per-landmark guard: only one election per (landmark, day) so
  // bouncing in/out of TownStage doesn't re-roll the captaincy.
  const flagKey = `_electionFiredAt_${landmarkId}`;
  if (state.flags[flagKey]) {
    return { state, ran: false, skipReason: 'already_fired_today' };
  }

  // Morale gate — period-faithful. Re-elections were petitioned, not
  // scheduled. Above the threshold, the company is content and the
  // captain stays. Mark the flag so we don't keep re-checking the
  // same day.
  const avgMorale = averageTrainMorale(state);
  if (avgMorale >= MORALE_VOTE_THRESHOLD) {
    return {
      state: { ...state, flags: { ...state.flags, [flagKey]: true } },
      ran: false,
      skipReason: 'morale_ok'
    };
  }

  const candidates = buildCandidates(state);
  if (candidates.length < 2) {
    // Single candidate (everyone else dead/wiped) — leadership stays
    // with whoever's there; just mark the flag so we don't keep
    // checking.
    return {
      state: { ...state, flags: { ...state.flags, [flagKey]: true } },
      ran: false,
      skipReason: 'single_candidate'
    };
  }

  // Weighted draw — sum weights and roll.
  const weights = candidates.map((c) => weightFor(c, rng));
  const total = weights.reduce((s, w) => s + w, 0);
  let r = rng.next() * total;
  let winner = candidates[0];
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) {
      winner = candidates[i];
      break;
    }
  }

  const incumbent = state.wagonTrain.leaderId;
  const changed = winner.id !== incumbent;
  const previousName = incumbent === 'player'
    ? (state.party.find((m) => m.isLeader)?.name ?? 'the player')
    : state.wagonTrain.companions.find((c) => c.id === incumbent)?.name ?? 'the previous captain';

  // Morale-pressure framing — the vote was called because the
  // company was grumbling, not because we hit a fort.
  let logText: string;
  if (!changed) {
    logText = winner.id === 'player'
      ? `Discontent at ${landmarkLabel(landmarkId)} pressed the company to a vote — they re-elected you captain.`
      : `Discontent at ${landmarkLabel(landmarkId)} pressed the company to a vote — ${winner.name} kept the captaincy.`;
  } else {
    logText = winner.id === 'player'
      ? `Discontent at ${landmarkLabel(landmarkId)} pressed the company to a vote — they elected you captain over ${previousName}.`
      : `Discontent at ${landmarkLabel(landmarkId)} pressed the company to a vote — ${winner.name} took the captaincy from ${previousName}.`;
  }

  const next: GameState = {
    ...state,
    wagonTrain: { ...state.wagonTrain, leaderId: winner.id },
    flags: { ...state.flags, [flagKey]: true },
    eventLog: [...state.eventLog, { day: state.day, text: logText }]
  };
  return { state: next, ran: true, newLeader: winner.id, changed };
}

function landmarkLabel(id: string): string {
  // Short readable name for log entries — the full content/landmarks
  // table has the long names; we just want the post-shorthand here.
  switch (id) {
    case 'ft_kearny': return 'Fort Kearny';
    case 'ft_laramie': return 'Fort Laramie';
    case 'ft_bridger': return 'Fort Bridger';
    case 'ft_hall': return 'Fort Hall';
    case 'ft_boise': return 'Fort Boise';
    default: return id.replace(/_/g, ' ');
  }
}

/** True when the player's slot currently holds the captaincy. */
export function playerIsCaptain(state: GameState): boolean {
  return state.wagonTrain?.leaderId === 'player';
}

/** Reasons a crisis vote can be triggered. Stored in
 *  `state.flags._pendingCaptaincyVote` by the source event (e.g.,
 *  starvation refusal) and consumed by `tickDayPausable` on the next
 *  tick — gives the company a beat to gather around the campfire
 *  before the vote happens. */
export type CrisisVoteReason = 'refused-starvation-share';

/** Crisis preface — varies by reason AND by whether the player was the
 *  one whose action triggered the vote. Avoids the third-person /
 *  second-person voice mix when the player is simultaneously the
 *  refuser and the (re-)elected captain. */
function crisisPreface(reason: CrisisVoteReason, refuserIsPlayer: boolean): string {
  switch (reason) {
    case 'refused-starvation-share':
      return refuserIsPlayer
        ? 'After you refused to share food with a starving wagon, the company gathered and called for a new vote.'
        : 'After the captain refused to share food with a starving wagon, the company gathered and called for a new vote.';
  }
}

/** Run an election triggered by a crisis (not by arrival at a post).
 *  Bypasses the landmark and morale gates — the company has already
 *  organized; the vote happens. Uses the same charisma + incumbent
 *  weighting as the landmark path, and respects `playerStandsAside`.
 *  Clears the trigger flag. */
export function forceElection(
  state: GameState,
  rng: Rng,
  reason: CrisisVoteReason
): ElectionResult {
  if (!state.wagonTrain) return { state, ran: false, skipReason: 'not_in_train' };
  // Strip the trigger flag whether the vote runs or not — we don't
  // want it stuck if e.g. only one candidate remains.
  const clearedFlags = { ...state.flags };
  delete (clearedFlags as Record<string, unknown>)._pendingCaptaincyVote;
  const cleared: GameState = { ...state, flags: clearedFlags };

  const candidates = buildCandidates(cleared);
  if (candidates.length < 2) {
    return { state: cleared, ran: false, skipReason: 'single_candidate' };
  }
  const weights = candidates.map((c) => weightFor(c, rng));
  const total = weights.reduce((s, w) => s + w, 0);
  let r = rng.next() * total;
  let winner = candidates[0];
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) {
      winner = candidates[i];
      break;
    }
  }

  const incumbent = cleared.wagonTrain!.leaderId;
  const changed = winner.id !== incumbent;
  const previousName = incumbent === 'player'
    ? (cleared.party.find((m) => m.isLeader)?.name ?? 'the player')
    : cleared.wagonTrain!.companions.find((c) => c.id === incumbent)?.name ?? 'the previous captain';

  // The incumbent at the moment the vote is called is the captain
  // who took the action — i.e., the refuser for refused-starvation-share.
  const preface = crisisPreface(reason, incumbent === 'player');
  let logText: string;
  if (!changed) {
    logText = winner.id === 'player'
      ? `${preface} They re-elected you captain.`
      : `${preface} ${winner.name} kept the captaincy.`;
  } else {
    logText = winner.id === 'player'
      ? `${preface} They elected you captain over ${previousName}.`
      : `${preface} ${winner.name} took the captaincy from ${previousName}.`;
  }

  const next: GameState = {
    ...cleared,
    wagonTrain: { ...cleared.wagonTrain!, leaderId: winner.id },
    eventLog: [...cleared.eventLog, { day: cleared.day, text: logText }]
  };
  return { state: next, ran: true, newLeader: winner.id, changed };
}

// Re-export for tests.
export { ELECTION_LANDMARKS, MORALE_VOTE_THRESHOLD };
