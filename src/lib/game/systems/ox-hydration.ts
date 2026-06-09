import type { GameState, Ox } from '../types';
import { getLandmark } from '../content/landmarks';

// #1264 — desert draft-animal thirst. Period accounts: oxen on a dry drive
// drank 15-20 gal/day each and failed fast without water (an uncarriable
// 60-80 gal/day for a team), so the desert was a reach-water-in-time problem.
// The drain fires on every 'desert' travel day and refills at real water
// (river / waterSource landmark) — NOT at find_water/dig_well. Because the
// trail's back half carries a lot of desert terrain between water landmarks,
// the rates are deliberately LOW: a sweep-tuned drain that gives the desert a
// modest bite (a few % arrival dip, mules clearly advantaged) without
// re-breaking the #1245 fair crossing. Below AMBER (50) the team drags
// (recoverable pace penalty); below RED (20) health drains (the lethal tail);
// the 0.7 pace floor keeps a parched-but-alive team moving (death comes from
// the health drain + min-team stranding, not a pace stall). Tune via the
// BEFORE/AFTER persona sweep — higher drains crater the desert-reaching runs.
/** Per-day hydration loss on a dry desert travel day. Ox ≈ 20-day runway. */
export const OX_DRAIN_PER_DAY = 5;
/** Mules tolerate the desert — the strategic edge (≈ 33-day runway). */
export const MULE_DRAIN_PER_DAY = 3;

/** ≥ this = green (no penalty). Below = amber (pace penalty). */
export const HYDRATION_AMBER = 50;
/** Below this = red (health drains, lethal tail). */
export const HYDRATION_RED = 20;
/**
 * HP/day an animal loses at hydration 0 (the steepest point of the lethal
 * tail; the drain ramps linearly from 0 at HYDRATION_RED up to this at 0).
 * Kept low alongside the low drain so the lethal tail only catches teams that
 * sustain near-zero hydration over a long dry stretch (worn/slow runs, or the
 * future #1145 dry-route fork) — not every team that crosses the desert.
 */
export const RED_HP_DRAIN_AT_ZERO = 5;

/** Hydration with the no-migration default applied. 100 = freshly watered. */
export function oxHydration(o: Ox): number {
  return o.hydration ?? 100;
}

/** Daily desert drain for one animal — mules tolerate it better. */
export function drainPerDayFor(o: Ox): number {
  return o.kind === 'mule' ? MULE_DRAIN_PER_DAY : OX_DRAIN_PER_DAY;
}

/**
 * True when the team can drink today: watered country (terrain ≠ desert),
 * or the current landmark is a river ford / flagged waterSource.
 * NOTE: human find_water / dig_well do NOT count — that exclusion is the
 * strategic teeth (can't water a 60-80 gal/day team from a dug well).
 */
export function isWateredDay(state: GameState): boolean {
  if (state.location.terrain !== 'desert') return true;
  const id = state.location.atLandmarkId;
  if (!id) return false;
  const lm = getLandmark(id); // non-nullable; throws only on an unknown id
  return lm.kind === 'river' || lm.waterSource === true;
}

export function hydrationPaceMult(oxen: Ox[]): number {
  const alive = oxen.filter((o) => o.health > 0);
  if (alive.length === 0) return 1;
  const avg = alive.reduce((sum, o) => sum + oxHydration(o), 0) / alive.length;
  if (avg >= HYDRATION_AMBER) return 1;
  if (avg <= HYDRATION_RED) return 0.7;
  // lerp 1.0 @50 → 0.7 @20
  return 0.7 + 0.3 * ((avg - HYDRATION_RED) / (HYDRATION_AMBER - HYDRATION_RED));
}

/**
 * Daily ox/mule hydration tick. Refill to 100 at water; drain per-animal
 * on a dry desert leg; floor at 0. Below HYDRATION_RED, health drains
 * proportionally. Emits stage-crossing log entries (amber/red).
 */
export function applyOxHydration(state: GameState): GameState {
  const watered = isWateredDay(state);
  const logs: GameState['eventLog'] = [];
  const beforeMin = minAliveHydration(state.oxen);

  const oxen = state.oxen.map((o) => {
    if (o.health === 0) return o; // dead animals don't drink or drain
    if (watered) return { ...o, hydration: 100 };
    const nextHyd = Math.max(0, oxHydration(o) - drainPerDayFor(o));
    let health = o.health;
    // Health drain is PER-ANIMAL; the pace penalty (hydrationPaceMult) is
    // team-AVG. So one badly parched animal can be dying while the team still
    // moves near-normal — deliberate: the others pull its weight until it
    // drops the team below minTeam (the stranding failure path).
    if (nextHyd < HYDRATION_RED) {
      // Linear ramp: 0 at HYDRATION_RED → RED_HP_DRAIN_AT_ZERO at hydration 0.
      const drain = Math.round((RED_HP_DRAIN_AT_ZERO * (HYDRATION_RED - nextHyd)) / HYDRATION_RED);
      health = Math.max(0, health - drain);
    }
    return { ...o, hydration: nextHyd, health };
  });

  const afterMin = minAliveHydration(oxen);
  // Stage-crossing logs (fire once on the day the team first crosses down).
  // Keyed on MIN (the thirstiest animal), not avg: warn the player the moment
  // the weakest animal enters a zone — earlier than the avg-based pace penalty.
  if (!watered) {
    if (beforeMin >= HYDRATION_AMBER && afterMin < HYDRATION_AMBER && afterMin >= HYDRATION_RED) {
      logs.push(makeOxLog(state, 'The team is flagging for want of water.'));
    }
    if (beforeMin >= HYDRATION_RED && afterMin < HYDRATION_RED) {
      logs.push(makeOxLog(state, 'The oxen are failing — find water.'));
    }
  }

  return { ...state, oxen, eventLog: [...state.eventLog, ...logs] };
}

function minAliveHydration(oxen: Ox[]): number {
  const alive = oxen.filter((o) => o.health > 0);
  if (alive.length === 0) return 100;
  return Math.min(...alive.map(oxHydration));
}

function makeOxLog(state: GameState, text: string): GameState['eventLog'][number] {
  return { day: state.day, text };
}
