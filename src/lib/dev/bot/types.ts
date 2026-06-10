// #275 Game-playing bot — shared types.
//
// The bot drives `tickDayPausable` + `applyPendingChoice` directly at the
// engine level (no SvelteKit, no HTTP). Each run produces a `BotRunReport`
// with arrival outcome, deaths, events fired, and a heuristic "fun score"
// that grades whether the run had drama, variety, and meaningful choices.

import type { GameState, Outcome, ProfessionId } from '../../game/types';
// #302 — PersonaId moved to game/ai/types. Re-exported here so existing
// importers (scripts/bot.ts CLI, BotRunOpts consumers) keep working.
import type { PersonaId } from '../../game/ai/types';
export type { PersonaId };

export interface BotRunOpts {
  /** Seed string forwarded into the engine RNG. */
  seed: string;
  /** Decision-policy persona. */
  persona: PersonaId;
  /** Leader profession (drives scoring + behavior). */
  leaderProfession?: ProfessionId;
  /** Companion professions (skip for solo runs). Overrides `partySize`. */
  companionProfessions?: ProfessionId[];
  /** Total party size including leader (2-6). When `companionProfessions` is
   *  not given, the runner picks companions in this priority order:
   *  doctor → hunter → teamster → blacksmith → scout. Defaults to 3 (a
   *  realistic mid-range emigrant party — leader, partner, and one helper).
   *  This is the ADULT count — children are added on top via `childCount`. */
  partySize?: number;
  /** #1030 — number of children to add on top of `partySize` adults.
   *  Each child has no profession, defaults to age 8, alternates sex.
   *  Used by the bot sweep to model the period-modal 2-adult-2-child
   *  family wagon (Faragher 1979). Defaults to 0 (adult-only party,
   *  preserves pre-#1030 behavior). */
  childCount?: number;
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
  /** Per-action-type day counters — where the calendar actually went.
   *  Travel = ticked through tickDayPausable; rest, findWater, hunt,
   *  ford, etc. all consume one or more days but don't move the
   *  wagon. Use this to diagnose pacing issues. */
  actionDays: {
    travel: number;
    rest: number;
    findWater: number;
    hunt: number;
    ford: number;
    tradingPost: number;
    eventChoice: number;
    other: number;
  };
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
  /** Supply flow over the whole run, accumulated per loop iteration
   *  (a multi-day rest aggregates into one sample; totals are exact). */
  supplies: {
    /** Food lbs that left the inventory (eaten + spoiled + stolen + shared). */
    foodConsumedLb: number;
    /** Food lbs that entered the inventory (hunts, forage, trade, gifts). */
    foodAcquiredLb: number;
    gunpowderUsedLb: number;
    leadBallsUsed: number;
    cashSpent: number;
    cashEarned: number;
  };
  /** #1280/#1281 — per-trail-leg telemetry. Key = previousLandmarkId at the
   *  start of each runner iteration ('start' before the first landmark).
   *  Days split by action family; keg level + dry days weighted by day. */
  legStats: Record<string, {
    days: number;
    travelDays: number;
    restDays: number;
    findWaterDays: number;
    otherDays: number;
    miles: number;
    dryDays: number;
    kegPctSum: number;
    kegSamples: number;
    deaths: number;
  }>;
  /** Full end-of-run state — drives location/death/inventory detail in
   *  stats harnesses without widening this report for every field. */
  finalState: GameState;
}
