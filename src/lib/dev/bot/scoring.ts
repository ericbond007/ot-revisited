// #275 Heuristic "fun" score for a bot run.
//
// Maps a run's stats to a 0–100 score that grades whether the run had:
//   - **Variety** — many different events fired (not the same encounter
//     50 times)
//   - **Drama** — close calls, ox deaths, party-member deaths, near-
//     starvations, river losses (anything that would make a player
//     lean forward)
//   - **Decisions** — the bot actually had to make meaningful choices
//     vs. autopilot drudgery
//   - **Survival arc** — outcome shape: full success, partial success
//     (some died but some made it), heroic failure all score better
//     than "boring grind to a yawn finish"
//   - **No long boring stretches** — penalty for runs of 10+ days with
//     no events at all
//
// This is for developer tuning, not a leaderboard. A fun score of 60+
// suggests the run was the kind a player would tell stories about; a
// fun score under 30 is the kind that makes you tab away.
//
// All weights are heuristic — adjust as the catalog of events / drama
// beats grows.

import type { Outcome } from '../../game/types';

interface FunScoreInput {
  daysElapsed: number;
  uniqueEventCount: number;
  dramaBeatCount: number;
  decisionsMade: number;
  longestBoringStretch: number;
  aliveCount: number;
  startingPartySize: number;
  outcome: Outcome;
  errorCount: number;
}

interface FunScoreBreakdown {
  variety: number;
  drama: number;
  decisions: number;
  survival: number;
  boredomPenalty: number;
}

export interface FunScoreResult {
  total: number;
  breakdown: FunScoreBreakdown;
}

const VARIETY_PER_UNIQUE_EVENT = 1.5;     // capped below
const VARIETY_CAP = 25;
const DRAMA_PER_BEAT = 2;                 // capped below
const DRAMA_CAP = 25;
const DECISIONS_PER_CHOICE = 0.5;         // capped below
const DECISIONS_CAP = 15;

/** Outcome × survival ratio bonus (max 25). */
function survivalBonus(outcome: Outcome, alive: number, started: number): number {
  if (started === 0) return 0;
  const ratio = alive / started;
  if (outcome === 'arrived') {
    // Arrived with everyone: triumph (25). Arrived with half: partial
    // win (15). Arrived alone: lonely epic (8).
    return Math.round(8 + 17 * ratio);
  }
  if (outcome === 'wiped') {
    // Wipe with no one alive — heroic disaster (10). It's a story.
    return ratio === 0 ? 10 : 8;
  }
  if (outcome === 'in-progress') {
    // Hit max-day cap — bot ran out of time. Worst kind of run.
    return 0;
  }
  return 5;
}

/** Boring-stretch penalty (max 15). 10+ event-free days = -3, 20+ = -8,
 *  30+ = -15. */
function boredomPenalty(longestStretch: number): number {
  if (longestStretch < 10) return 0;
  if (longestStretch < 20) return 3;
  if (longestStretch < 30) return 8;
  return 15;
}

export function computeFunScore(input: FunScoreInput): FunScoreResult {
  if (input.errorCount > 0) {
    // An error during the run is a hard failure — return 0 so it
    // surfaces as the worst outcome.
    return {
      total: 0,
      breakdown: { variety: 0, drama: 0, decisions: 0, survival: 0, boredomPenalty: 0 }
    };
  }

  const variety = Math.min(VARIETY_CAP, input.uniqueEventCount * VARIETY_PER_UNIQUE_EVENT);
  const drama = Math.min(DRAMA_CAP, input.dramaBeatCount * DRAMA_PER_BEAT);
  const decisions = Math.min(DECISIONS_CAP, input.decisionsMade * DECISIONS_PER_CHOICE);
  const survival = survivalBonus(input.outcome, input.aliveCount, input.startingPartySize);
  const penalty = boredomPenalty(input.longestBoringStretch);

  const total = Math.max(0, Math.min(100, variety + drama + decisions + survival - penalty));

  return {
    total: Math.round(total),
    breakdown: {
      variety: Math.round(variety),
      drama: Math.round(drama),
      decisions: Math.round(decisions),
      survival,
      boredomPenalty: penalty
    }
  };
}
