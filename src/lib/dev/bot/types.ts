// #275 Game-playing bot — shared types.
//
// The bot drives `tickDayPausable` + `applyPendingChoice` directly at the
// engine level (no SvelteKit, no HTTP). Each run produces a `BotRunReport`
// with arrival outcome, deaths, events fired, and a heuristic "fun score"
// that grades whether the run had drama, variety, and meaningful choices.

import type { Outcome, ProfessionId } from '../../game/types';

export type PersonaId = 'cautious' | 'balanced' | 'aggressive' | 'chaos';

export interface BotRunOpts {
  /** Seed string forwarded into the engine RNG. */
  seed: string;
  /** Decision-policy persona. */
  persona: PersonaId;
  /** Leader profession (drives scoring + behavior). */
  leaderProfession?: ProfessionId;
  /** Companion professions (skip for solo runs). */
  companionProfessions?: ProfessionId[];
  /** Start date — defaults to a 1849 Apr 15 sweet-spot start. */
  startDate?: { year: number; month: number; day: number };
  /** Hard ceiling on days simulated — guards infinite-loop bugs. */
  maxDays?: number;
}

export interface BotRunReport {
  seed: string;
  persona: PersonaId;
  leaderProfession: ProfessionId;
  outcome: Outcome;
  daysElapsed: number;
  milesTraveled: number;
  finalCash: number;
  finalMorale: number;
  startingPartySize: number;
  endingAliveCount: number;
  /** Cause-of-death roll-up for the run. */
  deathsByCause: Record<string, number>;
  /** event.id → fire count. */
  eventsFiredById: Record<string, number>;
  /** Sum of unique event ids that fired (variety proxy). */
  uniqueEventCount: number;
  /** "Drama" beats — health <30, ox death, river loss, near-starvation, etc. */
  dramaBeatCount: number;
  /** Boring stretches — runs of N+ days with no events. */
  longestBoringStretch: number;
  /** Choices the bot actually had to make (vs auto-advances). */
  decisionsMade: number;
  /** Errors thrown during the run, if any. */
  errors: string[];
  /** Existing #148 arrival score (miles + survivors + arrival + luxuries). */
  arrivalScore: number;
  /**
   * Heuristic "fun" score 0–100. High = dramatic, varied, meaningful choices,
   * survival arc. Low = boring, autopilot, premature wipe, monotonous events.
   * See `computeFunScore` for the breakdown.
   */
  funScore: number;
  /** Component breakdown of the fun score for diagnostics. */
  funBreakdown: {
    variety: number;
    drama: number;
    decisions: number;
    survival: number;
    boredomPenalty: number;
  };
}
