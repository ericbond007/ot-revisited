// #1304 — Winter wall: severity, zones, storm escalation, closures,
// and the snowed_in terminal outcome.
//
// Design: docs/superpowers/specs/2026-06-10-winter-wall-design.md §1.
//
// Hidden severity is rolled once at game start, stored as `_winterSeverity`
// in the flags blob, and shifts every date constant by ±WINTER_SEVERITY_SHIFT_DAYS.
// It is NEVER surfaced in any UI string or agent call — it leaks only through
// the observable §3 signals (T3).
//
// Two winter zones are derived from the landmark catalog mile positions:
//   Blues    blue_mountains → grande_ronde region     (~mi 1720–1745)
//   Cascades barlow_road    → oregon_city              (~mi 1970–2170)
//
// Closure check lives in tickDayPausable (engine-pausable.ts) after weather
// is known, using sub-rng `winter:${seed}:${day}` so it never disturbs the
// main daily RNG stream.
//
// NPC parity: the closure is train-wide. When the player's pass is closed,
// companyMode gates traveled=false; advanceTrain passes 0 miles to every
// NPC wagon. Solo NPC bot runs tick through the same tickDayPausable path,
// so they hit the same checkClosure → snowed_in check as the player.
// No separate per-NPC closure roll is needed or performed.

import type { GameState } from '../types';
import { makeRng } from '../rng';
import { LANDMARKS } from '../content/landmarks';

// ── Severity shift ─────────────────────────────────────────────────────────

/** Days shifted by each severity tier: negative = earlier (harder), positive
 *  = later (easier). */
export const WINTER_SEVERITY_SHIFT_DAYS = 14;

export type WinterSeverity = 'early' | 'normal' | 'late';

/** Roll the hidden severity at game-start using the engine's seed.
 *  Weighted 25 / 50 / 25 per spec. Uses sub-rng so it never disturbs
 *  the main game-state RNG stream. */
export function rollWinterSeverity(seed: string): WinterSeverity {
  const rng = makeRng(`${seed}:winter-severity`);
  const r = rng.next();
  // 0..0.25 → 'early', 0.25..0.75 → 'normal', 0.75..1 → 'late'
  if (r < 0.25) return 'early';
  if (r < 0.75) return 'normal';
  return 'late';
}

/** Read the stored severity from flags, defaulting to 'normal' if missing
 *  (legacy saves pre-#1304). Never throws. */
export function readSeverity(state: GameState): WinterSeverity {
  const v = state.flags._winterSeverity;
  if (v === 'early' || v === 'normal' || v === 'late') return v;
  return 'normal';
}

/** The single date-shift helper — everything that references a calendar date
 *  in this module calls severityShift(state) once and adds the result to a
 *  base date expressed as a day-of-year integer. */
export function severityShift(state: GameState): number {
  const sev = readSeverity(state);
  if (sev === 'early') return -WINTER_SEVERITY_SHIFT_DAYS;
  if (sev === 'late')  return +WINTER_SEVERITY_SHIFT_DAYS;
  return 0;
}

// ── Zone boundaries ────────────────────────────────────────────────────────
// Derived from landmark catalog cumulative mileage (computed in-module so the
// source of truth is one place — landmark data, not hardcoded mystery miles).
//
//   blue_mountains  cumulative 1720 mi   → start of Blues zone
//   grande_ronde    cumulative 1745 mi   → end of Blues zone
//   barlow_road     cumulative 1970 mi   → start of Cascades zone
//   oregon_city     cumulative 2170 mi   → end of Cascades zone (final destination)
//
// We compute these using the LANDMARKS array directly (not runningMilesTo from
// travel.ts) to avoid a circular module dependency:
//   travel.ts imports winter.ts (isPassClosed) →
//   winter.ts must NOT import travel.ts at module scope.

function computeMilesTo(id: string): number {
  let sum = 0;
  for (const l of LANDMARKS) {
    sum += l.milesFromPrevious;
    if (l.id === id) return sum;
  }
  return sum;
}

// Blues zone: the Blue Mountains ascent + Grande Ronde valley.
// Period reality: the Blues were the first high-elevation gate; late wagons
// were storm-trapped here in early October (Applegate 1843, Bidwell 1843).
export const ZONE_BLUES_START_MI  = computeMilesTo('blue_mountains');
export const ZONE_BLUES_END_MI    = computeMilesTo('grande_ronde');

// Cascades zone: Barlow Road through Laurel Hill to Oregon City.
// The Barlow toll road opened 1846; before that the only option was the
// Columbia River raft (which bypasses this zone — bypassers are already
// through via the river, not the pass). Closes ~2 weeks later than Blues.
export const ZONE_CASCADES_START_MI = computeMilesTo('barlow_road');
export const ZONE_CASCADES_END_MI   = computeMilesTo('oregon_city');

export type WinterZone = 'blues' | 'cascades';

/** Return the zone the party is currently in, or null if not in a winter zone.
 *  Derived from the landmark catalog mile positions — not hardcoded raw miles
 *  without context. */
export function winterZoneAt(milesTraveled: number): WinterZone | null {
  if (milesTraveled >= ZONE_BLUES_START_MI && milesTraveled <= ZONE_BLUES_END_MI) {
    return 'blues';
  }
  if (milesTraveled >= ZONE_CASCADES_START_MI && milesTraveled <= ZONE_CASCADES_END_MI) {
    return 'cascades';
  }
  return null;
}

// ── Storm floor (in-zone October escalation) ───────────────────────────────
// From October 1 (day-of-year 274), snow probability in-zone gains a rising
// floor that stacks on top of the existing Markov weights. Expressed as a
// fractional boost to the 'snow' weight.
//
// Period anchor: emigrant diaries from 1844–1851 consistently record first
// mountain snows in late September / early October at the Blues; October
// storms at the Cascades were regular through the decade.

/** Day-of-year when the in-zone storm floor begins (Oct 1 at normal
 *  severity). Apply severityShift to get the actual start for a given run. */
export const STORM_FLOOR_START_DOY = 274; // Oct 1

/** The floor rises this many points per day past STORM_FLOOR_START_DOY. After
 *  31 days (Nov 1) the cumulative floor is 31 * 0.06 ≈ 1.86 extra weight
 *  units, roughly doubling the base fall-mountain snow weight of 2. */
export const STORM_FLOOR_RATE_PER_DAY = 0.06;

/** Maximum floor value (caps at Nov 30 / Dec 1 deep-winter threshold).
 *  The floor is added on top of the base Markov snow weight via Math.max
 *  (see weather.ts) — an additive minimum, not a full override. Deep-winter
 *  snow probability is still probabilistic; it is just anchored to a high
 *  baseline. */
export const STORM_FLOOR_MAX = 4.0;

// ── Closure constants ──────────────────────────────────────────────────────

/** Day-of-year when closure rolls begin (Nov 1 at normal severity). */
export const CLOSURE_START_DOY = 305; // Nov 1

/** Day-of-year of deep winter (Dec 1 at normal severity). Any closure from
 *  this date onward triggers the snowed_in terminal outcome. */
export const CLOSURE_DEEP_WINTER_DOY = 335; // Dec 1

/** Closure probability per in-zone snowstorm at CLOSURE_START_DOY (~10%). */
export const CLOSURE_PROB_START = 0.10;

/** Closure probability per in-zone snowstorm at CLOSURE_DEEP_WINTER_DOY (~40%). */
export const CLOSURE_PROB_DEEP  = 0.40;

/** Minimum days a pass stays closed. */
export const CLOSURE_DAYS_MIN = 2;

/** Closure duration bonus range (rng.int(0, CLOSURE_DAYS_EXTRA)). */
export const CLOSURE_DAYS_EXTRA = 4; // total range: 2..6 days

// ── Calendar helpers ───────────────────────────────────────────────────────

/** Day-of-year for a calendar month + day (1-indexed, non-leap-year basis). */
const MONTH_STARTS = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

export function dayOfYear(month: number, day: number): number {
  return MONTH_STARTS[month - 1] + day;
}

/** Day-of-year for the current game date. */
export function stateDayOfYear(state: GameState): number {
  return dayOfYear(state.date.month, state.date.day);
}

// ── Storm floor API ────────────────────────────────────────────────────────

/** Extra 'snow' weight to add when the party is in a winter zone and the
 *  calendar is past STORM_FLOOR_START_DOY (adjusted for severity). Returns 0
 *  when out-of-zone or too early. Capped at STORM_FLOOR_MAX. */
export function inZoneSnowFloor(state: GameState): number {
  const zone = winterZoneAt(state.location.milesTraveled);
  if (!zone) return 0;
  const startDoy = STORM_FLOOR_START_DOY + severityShift(state);
  const currentDoy = stateDayOfYear(state);
  if (currentDoy < startDoy) return 0;
  // +1 so the floor is non-zero on the start day itself (first day of October
  // already has a rising risk; daysIn=0 would yield nothing otherwise).
  const daysIn = currentDoy - startDoy + 1;
  return Math.min(STORM_FLOOR_MAX, daysIn * STORM_FLOOR_RATE_PER_DAY);
}

// ── Closure check ──────────────────────────────────────────────────────────

export interface ClosureCheckResult {
  /** Updated state, possibly with _passClosedUntil set or snowed_in outcome. */
  state: GameState;
  /** True when a new closure was just triggered (caller may log). */
  closureTriggered: boolean;
  /** True when the snowed_in terminal was set. */
  snowedIn: boolean;
}

/** Check whether an in-zone snowstorm triggers a pass closure. Call after
 *  weather is known (today's weather is 'snow') and the party is in a winter
 *  zone. Uses the dedicated sub-rng `winter:${seed}:${day}` so it never
 *  disturbs the main daily RNG stream.
 *
 *  Writes _passClosedUntil = (day + duration) to flags when closed.
 *  Writes completed + outcome 'snowed_in' when deep-winter closure triggers. */
export function checkClosure(state: GameState): ClosureCheckResult {
  const noOp: ClosureCheckResult = { state, closureTriggered: false, snowedIn: false };

  if (state.completed) return noOp;
  const zone = winterZoneAt(state.location.milesTraveled);
  if (!zone) return noOp;
  if (state.weather !== 'snow' && state.weather !== 'storm') return noOp;

  const shift = severityShift(state);
  const closureStartDoy = CLOSURE_START_DOY + shift;
  const currentDoy = stateDayOfYear(state);
  if (currentDoy < closureStartDoy) return noOp;

  // Already closed? Don't re-roll; the existing close holds.
  const existingClose = state.flags._passClosedUntil as number | undefined;
  if (existingClose !== undefined && existingClose >= state.day) return noOp;

  // Interpolate closure probability from start → deep-winter.
  const deepDoy = CLOSURE_DEEP_WINTER_DOY + shift;
  const t = Math.min(1.0, (currentDoy - closureStartDoy) / Math.max(1, deepDoy - closureStartDoy));
  const prob = CLOSURE_PROB_START + t * (CLOSURE_PROB_DEEP - CLOSURE_PROB_START);

  const rng = makeRng(`winter:${state.seed}:${state.day}`);
  if (!rng.chance(prob)) return noOp;

  // Closure triggered.
  const duration = CLOSURE_DAYS_MIN + rng.int(0, CLOSURE_DAYS_EXTRA);
  const closedUntil = state.day + duration;

  // Deep winter → snowed_in terminal.
  const isDeepWinter = currentDoy >= deepDoy;
  if (isDeepWinter) {
    const s: GameState = {
      ...state,
      flags: { ...state.flags, _passClosedUntil: closedUntil },
      completed: true,
      outcome: 'snowed_in'
    };
    return { state: s, closureTriggered: true, snowedIn: true };
  }

  const s: GameState = {
    ...state,
    flags: { ...state.flags, _passClosedUntil: closedUntil }
  };
  return { state: s, closureTriggered: true, snowedIn: false };
}

/** True when the player's current day is within a closure window. Travel
 *  should no-op when this returns true. */
export function isPassClosed(state: GameState): boolean {
  const closedUntil = state.flags._passClosedUntil as number | undefined;
  return closedUntil !== undefined && closedUntil >= state.day;
}

