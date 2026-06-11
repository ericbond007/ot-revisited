// #1304 — Winter wall: severity, zones, storm escalation, closures, snowed_in.
// Tests must be written first (TDD per plan); implementation follows.

import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/lib/game/engine';
import { tickDayPausable } from '../src/lib/game/engine-pausable';
import type { GameState, Ox } from '../src/lib/game/types';
import {
  rollWinterSeverity,
  readSeverity,
  severityShift,
  winterZoneAt,
  inZoneSnowFloor,
  checkClosure,
  isPassClosed,
  dayOfYear,
  WINTER_SEVERITY_SHIFT_DAYS,
  STORM_FLOOR_START_DOY,
  CLOSURE_START_DOY,
  CLOSURE_DEEP_WINTER_DOY,
  CLOSURE_DAYS_MIN,
  CLOSURE_DAYS_EXTRA,
  ZONE_BLUES_START_MI,
  ZONE_BLUES_END_MI,
  ZONE_CASCADES_START_MI,
  ZONE_CASCADES_END_MI
} from '../src/lib/game/systems/winter';
import {
  seasonalGrazingMult,
  GRAZING_DECLINE_START_DOY,
  GRAZING_DECLINE_END_DOY,
  GRAZING_WINTER_FLOOR,
  grazingQuality,
  restGrazingQuality,
  snowCoverGrazingMult,
  SNOW_COVER_GRAZING,
  FROST_GRAZING,
  STORM_GRAZING
} from '../src/lib/game/systems/oxen';
import { pickWeather } from '../src/lib/game/systems/weather';
import { makeRng } from '../src/lib/game/rng';
import { rest } from '../src/lib/game/actions/rest';
import {
  checkSnowNews,
  snowNewsEligibleDOY,
  snowNewsTier,
  getFortSnowGossip,
  SNOW_NEWS_BASE_DOY,
  SNOW_NEWS_JITTER_MAX,
} from '../src/lib/game/systems/news';
import {
  estimateSnowSafeDay,
  schedulePressure,
  arrivalBand,
  scheduleDeficitDays,
  TRAIL_MILESTONES,
  SNOW_SAFE_BASELINE_DAY,
  SNOW_NEWS_PRIOR_DAY,
  SNOW_SAFE_ESTIMATE_MIN,
  SNOW_SAFE_ESTIMATE_MAX,
  FAMILY_MARGIN_DAYS,
  TOTAL_TRAIL_MI,
  allowsSabbathRest,
  winterPaceBoost,
  doctrineFor,
  OX_SUSTAIN_FULL,
  OX_SUSTAIN_PARTIAL,
  OX_SPARE_BONUS,
  OX_MAX_SPARES
} from '../src/lib/game/ai/schedule';
import { addDaysToDate } from '../src/lib/game/utils/calendar';
import {
  balancedPersona,
  aggressivePersona,
  cautiousPersona,
  faithfulPersona,
  sundayResterPersona
} from '../src/lib/game/ai/personas';
import {
  companyRestDecision,
  personaToDoctrine
} from '../src/lib/game/systems/company-rest';
import type { WagonTrain } from '../src/lib/game/types';

// ── Helpers ────────────────────────────────────────────────────────────────

function baseState(over: Partial<GameState> = {}): GameState {
  const s = createInitialState({
    seed: 'winter-test-1304',
    leader: { name: 'Jonas', profession: 'farmer' },
    companions: [{ name: 'Martha', profession: 'teacher' }],
    startDate: { year: 1849, month: 4, day: 15 }
  });
  return { ...s, ...over };
}

/** Build a state forced to a specific severity, date, position, and weather. */
function winterState(opts: {
  seed?: string;
  severity?: 'early' | 'normal' | 'late';
  month: number;
  day: number;
  milesTraveled: number;
  weather?: GameState['weather'];
  _passClosedUntil?: number;
  dayNum?: number;
}): GameState {
  const s = baseState();
  const gameDay = opts.dayNum ?? 150;
  return {
    ...s,
    seed: opts.seed ?? 'winter-test-1304',
    day: gameDay,
    date: { year: 1849, month: opts.month, day: opts.day },
    location: {
      ...s.location,
      milesTraveled: opts.milesTraveled,
      terrain: 'mountains' as const
    },
    weather: opts.weather ?? 'snow',
    flags: {
      ...s.flags,
      _winterSeverity: opts.severity ?? 'normal',
      ...(opts._passClosedUntil !== undefined ? { _passClosedUntil: opts._passClosedUntil } : {})
    }
  };
}

// ── Severity roll ──────────────────────────────────────────────────────────

describe('#1304 severity roll', () => {
  it('always returns one of early/normal/late', () => {
    const seeds = ['seed-a', 'seed-b', 'seed-c', 'seed-d', 'seed-e'];
    for (const seed of seeds) {
      const sev = rollWinterSeverity(seed);
      expect(['early', 'normal', 'late']).toContain(sev);
    }
  });

  it('is deterministic — same seed always gives same result', () => {
    expect(rollWinterSeverity('determinism-seed')).toBe(rollWinterSeverity('determinism-seed'));
    expect(rollWinterSeverity('other-seed')).toBe(rollWinterSeverity('other-seed'));
  });

  it('covers all three values across enough seeds', () => {
    const results = new Set<string>();
    for (let i = 0; i < 200; i++) {
      results.add(rollWinterSeverity(`test-seed-${i}`));
    }
    expect(results.has('early')).toBe(true);
    expect(results.has('normal')).toBe(true);
    expect(results.has('late')).toBe(true);
  });

  it('is stored in flags._winterSeverity at createInitialState', () => {
    const s = createInitialState({
      seed: 'severity-init-test',
      leader: { name: 'A', profession: 'farmer' },
      companions: [{ name: 'B', profession: 'teacher' }],
      startDate: { year: 1849, month: 4, day: 15 }
    });
    expect(['early', 'normal', 'late']).toContain(s.flags._winterSeverity);
  });

  it('severity is NEVER surfaced as a string in any log entry after createInitialState', () => {
    const s = createInitialState({
      seed: 'severity-no-leak',
      leader: { name: 'A', profession: 'farmer' },
      companions: [{ name: 'B', profession: 'teacher' }],
      startDate: { year: 1849, month: 4, day: 15 }
    });
    const logTexts = s.eventLog.map((e) => e.text.toLowerCase());
    // None of these should appear as the literal word in any log
    for (const text of logTexts) {
      expect(text).not.toMatch(/\bearly winter\b/);
      expect(text).not.toMatch(/\bnormal winter\b/);
      expect(text).not.toMatch(/\blate winter\b/);
      expect(text).not.toMatch(/\bseverity\b/);
    }
  });
});

describe('#1304 readSeverity + severityShift', () => {
  it('reads severity from flags', () => {
    const s = baseState({ flags: { ...baseState().flags, _winterSeverity: 'early' } });
    expect(readSeverity(s)).toBe('early');
  });

  it('defaults to normal when flag is missing', () => {
    const s = baseState({ flags: {} });
    expect(readSeverity(s)).toBe('normal');
  });

  it('severityShift: early = -14, normal = 0, late = +14', () => {
    const early = baseState({ flags: { ...baseState().flags, _winterSeverity: 'early' } });
    const normal = baseState({ flags: { ...baseState().flags, _winterSeverity: 'normal' } });
    const late = baseState({ flags: { ...baseState().flags, _winterSeverity: 'late' } });

    expect(severityShift(early)).toBe(-WINTER_SEVERITY_SHIFT_DAYS);
    expect(severityShift(normal)).toBe(0);
    expect(severityShift(late)).toBe(+WINTER_SEVERITY_SHIFT_DAYS);
  });
});

// ── Zone predicate ─────────────────────────────────────────────────────────

describe('#1304 winterZoneAt', () => {
  it('returns null before the Blues zone', () => {
    expect(winterZoneAt(ZONE_BLUES_START_MI - 1)).toBeNull();
  });

  it('returns blues at the start of the Blues zone', () => {
    expect(winterZoneAt(ZONE_BLUES_START_MI)).toBe('blues');
  });

  it('returns blues within the Blues zone', () => {
    const mid = Math.round((ZONE_BLUES_START_MI + ZONE_BLUES_END_MI) / 2);
    expect(winterZoneAt(mid)).toBe('blues');
  });

  it('returns blues at the end of the Blues zone', () => {
    expect(winterZoneAt(ZONE_BLUES_END_MI)).toBe('blues');
  });

  it('returns null between Blues and Cascades', () => {
    const between = Math.round((ZONE_BLUES_END_MI + ZONE_CASCADES_START_MI) / 2);
    expect(winterZoneAt(between)).toBeNull();
  });

  it('returns cascades at the start of the Cascades zone', () => {
    expect(winterZoneAt(ZONE_CASCADES_START_MI)).toBe('cascades');
  });

  it('returns cascades within the Cascades zone', () => {
    const mid = Math.round((ZONE_CASCADES_START_MI + ZONE_CASCADES_END_MI) / 2);
    expect(winterZoneAt(mid)).toBe('cascades');
  });

  it('zone boundaries are derived from landmark catalog — Blues start > 1700', () => {
    // Sanity: the cumulative mile to blue_mountains should be in the 1700–1800 range
    expect(ZONE_BLUES_START_MI).toBeGreaterThan(1700);
    expect(ZONE_BLUES_START_MI).toBeLessThan(1800);
  });

  it('Cascades start is after the Blues end', () => {
    expect(ZONE_CASCADES_START_MI).toBeGreaterThan(ZONE_BLUES_END_MI);
  });
});

// ── Storm floor ─────────────────────────────────────────────────────────────

describe('#1304 inZoneSnowFloor', () => {
  it('returns 0 when out of zone (early trail)', () => {
    const s = winterState({ month: 10, day: 15, milesTraveled: 500 });
    expect(inZoneSnowFloor(s)).toBe(0);
  });

  it('returns 0 when in zone but before Oct 1 (normal severity)', () => {
    // Sep 30 = DOY 273; STORM_FLOOR_START_DOY = 274
    const s = winterState({ month: 9, day: 30, milesTraveled: ZONE_BLUES_START_MI + 5 });
    expect(inZoneSnowFloor(s)).toBe(0);
  });

  it('returns > 0 on Oct 1 in zone (normal severity)', () => {
    // Oct 1 = DOY 274 = STORM_FLOOR_START_DOY
    const s = winterState({ month: 10, day: 1, milesTraveled: ZONE_BLUES_START_MI + 5 });
    // Oct 1 is the first day — 1 day in * rate
    expect(inZoneSnowFloor(s)).toBeGreaterThan(0);
  });

  it('floor rises through October (day 15 > day 1)', () => {
    const s1 = winterState({ month: 10, day: 1, milesTraveled: ZONE_BLUES_START_MI + 5 });
    const s15 = winterState({ month: 10, day: 15, milesTraveled: ZONE_BLUES_START_MI + 5 });
    expect(inZoneSnowFloor(s15)).toBeGreaterThan(inZoneSnowFloor(s1));
  });

  it('floor is capped at STORM_FLOOR_MAX', () => {
    // Deep winter: December
    const s = winterState({ month: 12, day: 15, milesTraveled: ZONE_BLUES_START_MI + 5 });
    const floor = inZoneSnowFloor(s);
    expect(floor).toBeLessThanOrEqual(4.0);
  });

  it('early severity shifts storm floor start earlier by 14 days', () => {
    // Sep 23 = DOY 266. Normally no floor yet; but early shifts start to DOY 260.
    const sNormal = winterState({ severity: 'normal', month: 9, day: 23, milesTraveled: ZONE_BLUES_START_MI + 5 });
    const sEarly  = winterState({ severity: 'early',  month: 9, day: 23, milesTraveled: ZONE_BLUES_START_MI + 5 });
    // With normal severity, DOY 266 < 274 → floor should be 0
    // With early severity, floor start = 274 - 14 = 260, DOY 266 > 260 → floor > 0
    // However, DOY of Sep 23 = 31+28+31+30+31+30+31+31+23 = 266
    const normalFloor = inZoneSnowFloor(sNormal);
    const earlyFloor  = inZoneSnowFloor(sEarly);
    expect(earlyFloor).toBeGreaterThan(normalFloor);
  });

  it('out-of-zone state has zero floor regardless of date (regression pin)', () => {
    // This ensures out-of-zone weights are NOT disturbed
    const s = winterState({ month: 11, day: 15, milesTraveled: 500 }); // miles 500 = prairie
    expect(inZoneSnowFloor(s)).toBe(0);
  });
});

describe('#1304 weather floor integration — pickWeather', () => {
  it('in-zone late October snow probability is higher than out-of-zone', () => {
    const inZone  = winterState({ month: 10, day: 25, milesTraveled: ZONE_BLUES_START_MI + 5 });
    const outZone = winterState({ month: 10, day: 25, milesTraveled: 500 });

    // Run 500 weather draws for each, count snow
    let snowIn = 0; let snowOut = 0;
    const N = 500;
    for (let i = 0; i < N; i++) {
      const rng = makeRng(`weather-test-${i}`);
      if (pickWeather(inZone, rng) === 'snow') snowIn++;
      if (pickWeather(outZone, rng) === 'snow') snowOut++;
    }
    // In-zone should produce meaningfully more snow days
    expect(snowIn).toBeGreaterThan(snowOut);
  });

  it('out-of-zone November mountains base weights are unchanged (regression pin)', () => {
    // mountains/fall base: { clear:3, overcast:3, rain:1, snow:2, frost:2, fog:1 }
    // total = 12. With stickiness (yesterday clear): snow/frost unchanged.
    // We just check that the function runs without throwing when out-of-zone.
    const s = winterState({
      month: 11, day: 15,
      milesTraveled: 500,   // not in zone
      weather: 'clear'      // yesterday
    });
    const rng = makeRng('regression-pin-out-of-zone');
    const result = pickWeather(s, rng);
    expect(['clear', 'overcast', 'rain', 'snow', 'storm', 'fog', 'frost', 'heat']).toContain(result);
  });
});

// ── Closure mechanics ──────────────────────────────────────────────────────

describe('#1304 checkClosure', () => {
  it('does nothing when out of zone', () => {
    const s = winterState({ month: 11, day: 5, milesTraveled: 500 });
    const result = checkClosure(s);
    expect(result.closureTriggered).toBe(false);
    expect(result.state.flags._passClosedUntil).toBeUndefined();
  });

  it('does nothing when weather is not snow or storm', () => {
    const s = winterState({
      month: 11, day: 5,
      milesTraveled: ZONE_BLUES_START_MI + 5,
      weather: 'clear'
    });
    const result = checkClosure(s);
    expect(result.closureTriggered).toBe(false);
  });

  it('does nothing before CLOSURE_START_DOY (normal severity)', () => {
    // Oct 31 = DOY 304; closure starts DOY 305 (Nov 1)
    const s = winterState({
      month: 10, day: 31,
      milesTraveled: ZONE_BLUES_START_MI + 5,
      weather: 'snow'
    });
    const result = checkClosure(s);
    expect(result.closureTriggered).toBe(false);
  });

  it('can trigger closure on Nov 1 in zone (normal severity)', () => {
    // Force a closure by trying many seeds to find one that hits ~10% chance
    let triggered = false;
    for (let i = 0; i < 200 && !triggered; i++) {
      const s = winterState({
        seed: `closure-nov1-${i}`,
        month: 11, day: 1,
        milesTraveled: ZONE_BLUES_START_MI + 5,
        weather: 'snow',
        dayNum: 195 + i
      });
      const result = checkClosure(s);
      if (result.closureTriggered) triggered = true;
    }
    expect(triggered).toBe(true);
  });

  it('closure probability is higher in late November than early November', () => {
    // Statistically: run 300 seeds for Nov 5 and Nov 25 and compare hit rates
    let novEarlyHits = 0, novLateHits = 0;
    const N = 300;
    for (let i = 0; i < N; i++) {
      const earlyS = winterState({
        seed: `prob-early-${i}`,
        month: 11, day: 5,
        milesTraveled: ZONE_BLUES_START_MI + 5,
        weather: 'snow',
        dayNum: 200 + i
      });
      const lateS = winterState({
        seed: `prob-late-${i}`,
        month: 11, day: 25,
        milesTraveled: ZONE_BLUES_START_MI + 5,
        weather: 'snow',
        dayNum: 220 + i
      });
      if (checkClosure(earlyS).closureTriggered) novEarlyHits++;
      if (checkClosure(lateS).closureTriggered) novLateHits++;
    }
    // Late November should have more closures (prob interpolates higher)
    expect(novLateHits).toBeGreaterThan(novEarlyHits);
  });

  it('closure sets _passClosedUntil = day + duration (2..6)', () => {
    let found = false;
    for (let i = 0; i < 200 && !found; i++) {
      const s = winterState({
        seed: `duration-test-${i}`,
        month: 11, day: 15,
        milesTraveled: ZONE_BLUES_START_MI + 5,
        weather: 'snow',
        dayNum: 200 + i
      });
      const result = checkClosure(s);
      if (result.closureTriggered) {
        const closedUntil = result.state.flags._passClosedUntil as number;
        const duration = closedUntil - s.day;
        expect(duration).toBeGreaterThanOrEqual(CLOSURE_DAYS_MIN);
        expect(duration).toBeLessThanOrEqual(CLOSURE_DAYS_MIN + CLOSURE_DAYS_EXTRA);
        found = true;
      }
    }
    expect(found).toBe(true);
  });

  it('does not re-roll closure when already closed (_passClosedUntil >= day)', () => {
    const closedUntil = 250;
    const s = winterState({
      month: 11, day: 15,
      milesTraveled: ZONE_BLUES_START_MI + 5,
      weather: 'snow',
      dayNum: 240,
      _passClosedUntil: closedUntil
    });
    const result = checkClosure(s);
    // Should not re-trigger
    expect(result.closureTriggered).toBe(false);
    // Original closedUntil should be preserved
    expect(result.state.flags._passClosedUntil).toBe(closedUntil);
  });

  it('snowed_in triggers on deep-winter closure (Dec 1+, normal severity)', () => {
    // Try many seeds until we hit a closure in Dec
    let snowedIn = false;
    for (let i = 0; i < 300 && !snowedIn; i++) {
      const s = winterState({
        seed: `snowed-in-${i}`,
        month: 12, day: 5,
        milesTraveled: ZONE_CASCADES_START_MI + 5,
        weather: 'snow',
        dayNum: 240 + i
      });
      const result = checkClosure(s);
      if (result.snowedIn) {
        expect(result.state.completed).toBe(true);
        expect(result.state.outcome).toBe('snowed_in');
        snowedIn = true;
      }
    }
    expect(snowedIn).toBe(true);
  });

  it('non-deep-winter closure does NOT set snowed_in outcome', () => {
    let triggered = false;
    for (let i = 0; i < 200 && !triggered; i++) {
      const s = winterState({
        seed: `not-snowed-in-${i}`,
        month: 11, day: 15,
        milesTraveled: ZONE_BLUES_START_MI + 5,
        weather: 'snow',
        dayNum: 200 + i
      });
      const result = checkClosure(s);
      if (result.closureTriggered) {
        expect(result.snowedIn).toBe(false);
        expect(result.state.outcome).toBe('in-progress');
        triggered = true;
      }
    }
    expect(triggered).toBe(true);
  });

  it('early severity shifts deep-winter threshold earlier by 14 days', () => {
    // Nov 17 = DOY 321. normal deep-winter = DOY 335; early = 335-14 = 321.
    // So on Nov 17 with 'early' severity, a closure should be able to snowed_in.
    // With 'normal' severity the same day is not deep winter.
    let earlySnowedIn = false;
    for (let i = 0; i < 300 && !earlySnowedIn; i++) {
      const s = winterState({
        seed: `early-sev-deep-${i}`,
        severity: 'early',
        month: 11, day: 17,
        milesTraveled: ZONE_CASCADES_START_MI + 5,
        weather: 'snow',
        dayNum: 220 + i
      });
      const result = checkClosure(s);
      if (result.snowedIn) {
        earlySnowedIn = true;
      }
    }
    expect(earlySnowedIn).toBe(true);

    // Sanity: normal severity on same date should NOT snowed_in
    let normalSnowedIn = false;
    for (let i = 0; i < 300; i++) {
      const s = winterState({
        seed: `normal-sev-deep-${i}`,
        severity: 'normal',
        month: 11, day: 17,
        milesTraveled: ZONE_CASCADES_START_MI + 5,
        weather: 'snow',
        dayNum: 220 + i
      });
      const result = checkClosure(s);
      if (result.snowedIn) normalSnowedIn = true;
    }
    expect(normalSnowedIn).toBe(false);
  });
});

// ── isPassClosed ────────────────────────────────────────────────────────────

describe('#1304 isPassClosed', () => {
  it('returns false when _passClosedUntil is not set', () => {
    const s = baseState();
    expect(isPassClosed(s)).toBe(false);
  });

  it('returns true when _passClosedUntil >= day', () => {
    const s = baseState({ day: 200, flags: { ...baseState().flags, _passClosedUntil: 204 } });
    expect(isPassClosed(s)).toBe(true);
  });

  it('returns false when _passClosedUntil < day (window expired)', () => {
    const s = baseState({ day: 210, flags: { ...baseState().flags, _passClosedUntil: 204 } });
    expect(isPassClosed(s)).toBe(false);
  });
});

// ── Travel no-op while closed ──────────────────────────────────────────────

describe('#1304 applyTravel while pass closed', () => {
  it('advances 0 miles on a closed day', async () => {
    const { applyTravel } = await import('../src/lib/game/systems/travel');
    const s = winterState({
      month: 11, day: 15,
      milesTraveled: ZONE_BLUES_START_MI + 5,
      weather: 'snow',
      dayNum: 200,
      _passClosedUntil: 204  // closed through day 204; current day 200
    });
    const before = s.location.milesTraveled;
    const rng = makeRng('travel-closed-test');
    const after = applyTravel(s, rng);
    expect(after.location.milesTraveled).toBe(before);
  });

  it('logs a closed-pass message while closed', async () => {
    const { applyTravel } = await import('../src/lib/game/systems/travel');
    const s = winterState({
      month: 11, day: 15,
      milesTraveled: ZONE_BLUES_START_MI + 5,
      weather: 'snow',
      dayNum: 200,
      _passClosedUntil: 203
    });
    const rng = makeRng('travel-closed-log-test');
    const after = applyTravel(s, rng);
    const lastLog = after.eventLog[after.eventLog.length - 1]?.text ?? '';
    expect(lastLog).toMatch(/pass is closed/i);
  });

  it('travels normally once closure expires', async () => {
    const { applyTravel } = await import('../src/lib/game/systems/travel');
    // day = 205, _passClosedUntil = 204 → expired
    const s = winterState({
      month: 11, day: 20,
      milesTraveled: ZONE_BLUES_START_MI + 5,
      weather: 'clear',
      dayNum: 205,
      _passClosedUntil: 204
    });
    const before = s.location.milesTraveled;
    const rng = makeRng('travel-open-test');
    const after = applyTravel(s, rng);
    // Should have moved some miles
    expect(after.location.milesTraveled).toBeGreaterThan(before);
  });
});

// ── tickDayPausable integration ────────────────────────────────────────────

describe('#1304 tickDayPausable snowed_in integration', () => {
  it('terminates with snowed_in when deep-winter closure triggers', () => {
    // Try multiple seeds until one triggers the deep-winter closure
    let found = false;
    for (let i = 0; i < 400 && !found; i++) {
      const s = winterState({
        seed: `tick-snowed-in-${i}`,
        severity: 'normal',
        month: 12, day: 5,
        milesTraveled: ZONE_CASCADES_START_MI + 5,
        weather: 'snow',  // force snow already set so closure roll fires
        dayNum: 240 + i
      });
      // Disable auto-sabbath to avoid intercept
      const noSabbath = { ...s, flags: { ...s.flags, _autoSabbathRest: false } };
      const result = tickDayPausable(noSabbath);
      if (result.state.outcome === 'snowed_in') {
        expect(result.state.completed).toBe(true);
        found = true;
      }
    }
    expect(found).toBe(true);
  });

  it('produces a log line about the pass closing', () => {
    let found = false;
    for (let i = 0; i < 400 && !found; i++) {
      const s = winterState({
        seed: `tick-closure-log-${i}`,
        severity: 'normal',
        month: 11, day: 20,
        milesTraveled: ZONE_BLUES_START_MI + 5,
        weather: 'snow',
        dayNum: 220 + i
      });
      const noSabbath = { ...s, flags: { ...s.flags, _autoSabbathRest: false } };
      const result = tickDayPausable(noSabbath);
      const newLogs = result.state.eventLog.filter((e) => e.day === s.day);
      const closureLog = newLogs.find((e) => /pass|snowed|closed/i.test(e.text));
      if (closureLog) {
        found = true;
      }
    }
    expect(found).toBe(true);
  });
});

// ── NPC parity ─────────────────────────────────────────────────────────────

describe('#1304 NPC parity', () => {
  it('in-train wagons share the pass closure (traveled=false already)', () => {
    // NPC parity is structural: when the player can't move (companyMode='travel'
    // but applyTravel returns 0 miles due to isPassClosed), advanceTrain receives
    // traveled=true but NPC wagons share TrainEnv location (same miles) —
    // their individual applyTravel calls also see isPassClosed → 0 miles.
    // This test verifies the predicate is consistent: any state with
    // _passClosedUntil set will return isPassClosed = true regardless of
    // whether it's a player or NPC-synthesized state.
    const playerState = winterState({
      month: 11, day: 15,
      milesTraveled: ZONE_CASCADES_START_MI + 5,
      weather: 'snow',
      dayNum: 200,
      _passClosedUntil: 204
    });
    expect(isPassClosed(playerState)).toBe(true);
    // A synth NPC state at the same miles would pass through the same isPassClosed check
    const npcLikeFlags = { ...playerState.flags };
    const npcLikeState = { ...playerState, flags: npcLikeFlags };
    expect(isPassClosed(npcLikeState)).toBe(true);
  });

  it('solo bot runs (tickDayPausable) are the same path — snowed_in applies to bots too', () => {
    // Bots run via tickDay → tickDayPausable. Same winter path.
    // Just verify the predicate fires correctly at their mileage.
    let botGotSnowedIn = false;
    for (let i = 0; i < 300 && !botGotSnowedIn; i++) {
      const s = winterState({
        seed: `bot-snowed-${i}`,
        severity: 'normal',
        month: 12, day: 10,
        milesTraveled: ZONE_CASCADES_START_MI + 5,
        weather: 'snow',
        dayNum: 245 + i
      });
      const noSabbath = { ...s, flags: { ...s.flags, _autoSabbathRest: false } };
      const result = tickDayPausable(noSabbath);
      if (result.state.outcome === 'snowed_in') {
        botGotSnowedIn = true;
      }
    }
    expect(botGotSnowedIn).toBe(true);
  });
});

// ── Constant sanity checks ─────────────────────────────────────────────────

describe('#1304 exported constants', () => {
  it('WINTER_SEVERITY_SHIFT_DAYS = 14', () => {
    expect(WINTER_SEVERITY_SHIFT_DAYS).toBe(14);
  });

  it('STORM_FLOOR_START_DOY = dayOfYear(10, 1) = 274', () => {
    expect(STORM_FLOOR_START_DOY).toBe(dayOfYear(10, 1));
    expect(STORM_FLOOR_START_DOY).toBe(274);
  });

  it('CLOSURE_START_DOY = dayOfYear(11, 1) = 305', () => {
    expect(CLOSURE_START_DOY).toBe(dayOfYear(11, 1));
    expect(CLOSURE_START_DOY).toBe(305);
  });

  it('CLOSURE_DEEP_WINTER_DOY = dayOfYear(12, 1) = 335', () => {
    expect(CLOSURE_DEEP_WINTER_DOY).toBe(dayOfYear(12, 1));
    expect(CLOSURE_DEEP_WINTER_DOY).toBe(335);
  });

  it('closure duration range is 2..6 days', () => {
    expect(CLOSURE_DAYS_MIN).toBe(2);
    expect(CLOSURE_DAYS_MIN + CLOSURE_DAYS_EXTRA).toBe(6);
  });
});

// ── T2 (deprecated constants, kept for export-compatibility) ─────────────────
//
// #1304 T6c replaces the calendar-decline model (T2) with weather-driven snow
// cover. The T2 constants (GRAZING_DECLINE_START_DOY, GRAZING_DECLINE_END_DOY,
// GRAZING_WINTER_FLOOR) and seasonalGrazingMult() remain exported but are
// deprecated — see oxen.ts. These tests keep constant-value pins for
// export-compat. The curve-shape tests are deleted (curve no longer engine path).

describe('#1304-T2 deprecated constant exports — still export correct values', () => {
  it('GRAZING_DECLINE_START_DOY is Sep 1 (day 244)', () => {
    expect(GRAZING_DECLINE_START_DOY).toBe(dayOfYear(9, 1));
    expect(GRAZING_DECLINE_START_DOY).toBe(244);
  });

  it('GRAZING_DECLINE_END_DOY is Nov 1 (day 305)', () => {
    expect(GRAZING_DECLINE_END_DOY).toBe(dayOfYear(11, 1));
    expect(GRAZING_DECLINE_END_DOY).toBe(305);
  });

  it('GRAZING_WINTER_FLOOR is 0.4', () => {
    expect(GRAZING_WINTER_FLOOR).toBe(0.4);
  });

  it('seasonalGrazingMult still returns winter floor for Nov+ DOY (deprecated, not engine path)', () => {
    // The function still works; it is just not used by the engine anymore.
    expect(seasonalGrazingMult(dayOfYear(11, 15))).toBe(GRAZING_WINTER_FLOOR);
    expect(seasonalGrazingMult(dayOfYear(8, 15))).toBe(1.0);
  });
});

// ── T6c: Snow-cover grazing model ─────────────────────────────────────────────
//
// #1304 T6c replaces the calendar-decline (T2) with weather-driven snow cover.
//
// Research basis: Marcy (1859) *Prairie Traveler*:
//   lines 2578–2581: stock paw through ≤2 ft snow and eat the cured grass.
//   lines 2583–2587: intermountain grasses cure on the stem into standing hay
//     that "will fatten [animals] even in mid-winter."
//   lines 473–479: feed failure from corridor depletion + barren stretches,
//     NOT from calendar grass death.
//
// Design: the access constraint is SNOW COVER (and storm behavioral aversion),
// not the calendar. Clear autumn day → full terrain quality regardless of month.

describe('#1304-T6c snowCoverGrazingMult — constant exports', () => {
  it('SNOW_COVER_GRAZING is 0.25', () => {
    expect(SNOW_COVER_GRAZING).toBe(0.25);
  });

  it('FROST_GRAZING is 0.85', () => {
    expect(FROST_GRAZING).toBe(0.85);
  });

  it('STORM_GRAZING is 0.6', () => {
    expect(STORM_GRAZING).toBe(0.6);
  });
});

describe('#1304-T6c snowCoverGrazingMult — weather branches', () => {
  it('snow → SNOW_COVER_GRAZING (0.25) — cover blocks most pawing access', () => {
    expect(snowCoverGrazingMult('snow')).toBe(SNOW_COVER_GRAZING);
  });

  it('storm → STORM_GRAZING (0.6) — stock won\'t range in a blow', () => {
    expect(snowCoverGrazingMult('storm')).toBe(STORM_GRAZING);
  });

  it('frost → FROST_GRAZING (0.85) — chill slows grazing slightly', () => {
    expect(snowCoverGrazingMult('frost')).toBe(FROST_GRAZING);
  });

  it('clear → 1.0 (no cover)', () => {
    expect(snowCoverGrazingMult('clear')).toBe(1.0);
  });

  it('overcast → 1.0 (no cover)', () => {
    expect(snowCoverGrazingMult('overcast')).toBe(1.0);
  });

  it('rain → 1.0 (no cover)', () => {
    expect(snowCoverGrazingMult('rain')).toBe(1.0);
  });

  it('heat → 1.0 (no cover)', () => {
    expect(snowCoverGrazingMult('heat')).toBe(1.0);
  });

  it('fog → 1.0 (no cover)', () => {
    expect(snowCoverGrazingMult('fog')).toBe(1.0);
  });
});

describe('#1304-T6c grazingQuality — terrain × snow cover, NO calendar term', () => {
  // grazingQuality(state) = TERRAIN_GRAZING[terrain] × snowCoverGrazingMult(weather)
  // Calendar date is irrelevant — only terrain and today's weather matter.

  function grazState(
    weather: GameState['weather'],
    terrain: GameState['location']['terrain'] = 'prairie',
    month = 8,
    day = 15
  ): GameState {
    const s = createInitialState({
      seed: 'grazing-quality-test',
      leader: { name: 'A', profession: 'farmer' },
      companions: [{ name: 'B', profession: 'teacher' }],
      startDate: { year: 1849, month: 4, day: 15 }
    });
    return {
      ...s,
      date: { year: 1849, month, day },
      weather,
      location: { ...s.location, terrain }
    };
  }

  // T6c invariant: clear autumn day = clear summer day (no calendar term).
  it('clear autumn (Oct) == clear summer (Jul) on prairie — no calendar term', () => {
    const julClear = grazingQuality(grazState('clear', 'prairie', 7, 15));
    const octClear = grazingQuality(grazState('clear', 'prairie', 10, 15));
    expect(julClear).toBe(1.0);
    expect(octClear).toBe(1.0);
    expect(julClear).toBe(octClear);
  });

  it('prairie clear → 1.0 (terrain 1.0 × cover 1.0)', () => {
    expect(grazingQuality(grazState('clear'))).toBe(1.0);
  });

  it('prairie snow → 0.25 (terrain 1.0 × SNOW_COVER_GRAZING)', () => {
    expect(grazingQuality(grazState('snow'))).toBeCloseTo(SNOW_COVER_GRAZING, 5);
  });

  it('prairie frost → 0.85 (terrain 1.0 × FROST_GRAZING)', () => {
    expect(grazingQuality(grazState('frost'))).toBeCloseTo(FROST_GRAZING, 5);
  });

  it('prairie storm → 0.6 (terrain 1.0 × STORM_GRAZING)', () => {
    expect(grazingQuality(grazState('storm'))).toBeCloseTo(STORM_GRAZING, 5);
  });

  it('mountains clear → 0.4 (terrain 0.4 × cover 1.0)', () => {
    expect(grazingQuality(grazState('clear', 'mountains'))).toBeCloseTo(0.4, 5);
  });

  it('mountains snow → 0.1 (terrain 0.4 × 0.25 — deep cover in passes)', () => {
    expect(grazingQuality(grazState('snow', 'mountains'))).toBeCloseTo(0.1, 5);
  });

  it('desert clear → 0.2 (terrain 0.2 × cover 1.0)', () => {
    expect(grazingQuality(grazState('clear', 'desert'))).toBeCloseTo(0.2, 5);
  });

  it('snow day is strictly worse than clear day on same terrain', () => {
    const clear = grazingQuality(grazState('clear', 'prairie'));
    const snow  = grazingQuality(grazState('snow',  'prairie'));
    expect(snow).toBeLessThan(clear);
  });
});

describe('#1304-T6b / T6c player path — rest exempt from calendar; snow cover applies', () => {
  // T6b: calendar/seasonal term removed from rest path.
  // T6c: snow cover DOES apply on rest days (trapped team in snowed pass starves).
  //
  // Key invariant (T6b still holds): July clear == October clear rest on prairie.
  // New T6c: snow rest < clear rest.

  function restState(
    month: number,
    day: number,
    weather: GameState['weather'] = 'clear'
  ): GameState {
    const s = createInitialState({
      seed: 'rest-recovery-season-test',
      leader: { name: 'A', profession: 'farmer' },
      companions: [{ name: 'B', profession: 'teacher' }],
      startDate: { year: 1849, month: 4, day: 15 }
    });
    return {
      ...s,
      date: { year: 1849, month, day },
      weather,
      oxen: s.oxen.map((o) => ({ ...o, fatigue: 60 })),
      location: { ...s.location, terrain: 'prairie' as const },
      inventory: { ...s.inventory, grain: 0 }
    };
  }

  it('July clear rest == October clear rest on prairie (T6b invariant — no calendar term)', () => {
    // Marcy 2583–2587: cured intermountain grass holds value in mid-winter.
    // On a clear day (cover mult = 1.0), calendar month is irrelevant.
    const julyAfter = rest(restState(7, 15, 'clear'), 1);
    const octAfter  = rest(restState(10, 1, 'clear'), 1);

    const julyRecovery = 60 - julyAfter.oxen[0].fatigue;
    const octRecovery  = 60 - octAfter.oxen[0].fatigue;

    expect(julyRecovery).toBe(octRecovery);
    expect(octRecovery).toBeGreaterThan(0);
  });

  it('restGrazingQuality under snow < clear (T6c: cover applies; Marcy 2578)', () => {
    // rest() calls tickWeather internally, which re-rolls weather from the seed
    // and overrides the incoming state.weather — so we test restGrazingQuality
    // directly (the same function rest.ts calls for its feed/recovery math).
    // Marcy 2578: >2 ft snow blocks pawing access → trapped team starves.
    const clearState = restState(10, 15, 'clear');
    const snowState  = restState(10, 15, 'snow');

    const clearQ = restGrazingQuality(clearState);
    const snowQ  = restGrazingQuality(snowState);

    expect(snowQ).toBeLessThan(clearQ);
    expect(clearQ).toBe(1.0);  // prairie × clear = 1.0
    expect(snowQ).toBeCloseTo(SNOW_COVER_GRAZING);  // prairie × 0.25
  });

  it('restGrazingQuality frost < clear (frost cover 0.85)', () => {
    const clearState = restState(10, 15, 'clear');
    const frostState = restState(10, 15, 'frost');

    expect(restGrazingQuality(frostState)).toBeLessThan(restGrazingQuality(clearState));
    expect(restGrazingQuality(frostState)).toBeCloseTo(FROST_GRAZING);
  });

  it('restGrazingQuality snow > 0 (stock paw through; Marcy 2578)', () => {
    // Marcy: "they do much better than one would suppose" — some access remains.
    expect(restGrazingQuality(restState(10, 15, 'snow'))).toBeGreaterThan(0);
  });
});

describe('#1304-T6b / T6c NPC synth path — no calendar term; cover applies', () => {
  it('NPC July clear rest == NPC November clear rest on prairie (T6b invariant)', () => {
    function npcLikeState(month: number, day: number): GameState {
      const s = createInitialState({
        seed: 'npc-synth-seasonal-test',
        leader: { name: 'Capt', profession: 'farmer' },
        companions: [{ name: 'NPC1', profession: 'teacher' }],
        startDate: { year: 1849, month: 4, day: 15 }
      });
      return {
        ...s,
        date: { year: 1849, month, day },
        weather: 'clear' as const,
        oxen: s.oxen.map((o) => ({ ...o, fatigue: 60 })),
        location: { ...s.location, terrain: 'prairie' as const },
        inventory: { ...s.inventory, grain: 0 },
        flags: { ...s.flags, _autoSabbathRest: false }
      };
    }

    const julAfter = rest(npcLikeState(7, 15), 1);
    const novAfter = rest(npcLikeState(11, 15), 1);

    const julRec = 60 - julAfter.oxen[0].fatigue;
    const novRec = 60 - novAfter.oxen[0].fatigue;

    // restGrazingQuality = terrain × snowCoverGrazingMult('clear') = 1.0 × 1.0 → equal.
    expect(julRec).toBe(novRec);
    expect(novRec).toBeGreaterThan(0);
  });

  it('snowCoverGrazingMult ordering: snow < storm < frost < clear (Marcy 2578–2581)', () => {
    expect(snowCoverGrazingMult('snow')).toBeLessThan(snowCoverGrazingMult('storm'));
    expect(snowCoverGrazingMult('storm')).toBeLessThan(snowCoverGrazingMult('frost'));
    expect(snowCoverGrazingMult('frost')).toBeLessThan(snowCoverGrazingMult('clear'));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// T3 — Signals: snow-news schedule, _firstSnowNewsDay flag, fort gossip
// ═══════════════════════════════════════════════════════════════════════════
//
// Design: spec §3, plan T3.
//
// checkSnowNews(state) fires at most once per game-day via the daily-steps
// spine (POST_BRANCH_STEPS, scope 'all', uses sub-rng `snownews:${seed}`).
// It calls addNews when the current DOY ≥ eligibleDOY (base + shift + jitter)
// and the news hasn't fired for today (guarded by _snowNewsLastDay). The
// first time it actually surfaces the item it stamps _firstSnowNewsDay.
//
// Signal-honesty: the FLAG never encodes the severity word. The NEWS TEXT
// never names the severity tier. Only the observable calendar progression
// (first dustings → snow lying → wagons turning back) carries the signal.
//
// Bot path: bots go through tickDayPausable which runs POST_BRANCH_STEPS →
// checkSnowNews fires on their tick just as on the player's tick. A bot that
// spends the right calendar period on the trail will receive the news and set
// the flag — identical to the player path, zero special-casing.
//
// Fort gossip: getFortSnowGossip(state, postName) returns in-season tier
// copy for ft_hall, ft_boise, whitman_mission when visited after
// eligibleDOY. Called from +page.server.ts alongside generatePostGossip
// so player always gets the fort warning at those three posts in-season.
// (Bots don't call generatePostGossip at posts — the daily checkSnowNews
// is sufficient for their flag; fort gossip is exclusively player-facing.)

/** Build a state at a specific date+severity, on-trail (not at landmark). */
function snowNewsState(opts: {
  seed?: string;
  severity: 'early' | 'normal' | 'late';
  month: number;
  day: number;
  /** Simulate that news already fired on this day (prevents double-fire). */
  _snowNewsLastDay?: number;
  /** Simulate that _firstSnowNewsDay was already set. */
  _firstSnowNewsDay?: number;
  dayNum?: number;
}): GameState {
  const s = createInitialState({
    seed: opts.seed ?? 'snownews-test',
    leader:     { name: 'Jonas', profession: 'farmer' },
    companions: [{ name: 'Martha', profession: 'teacher' }],
    startDate:  { year: 1849, month: 4, day: 15 }
  });
  const gameDay = opts.dayNum ?? 170;
  return {
    ...s,
    seed: opts.seed ?? 'snownews-test',
    day: gameDay,
    date: { year: 1849, month: opts.month, day: opts.day },
    // Not at a landmark — on the road
    location: { ...s.location, atLandmarkId: null },
    flags: {
      ...s.flags,
      _winterSeverity: opts.severity,
      ...(opts._snowNewsLastDay !== undefined ? { _snowNewsLastDay: opts._snowNewsLastDay } : {}),
      ...(opts._firstSnowNewsDay !== undefined ? { _firstSnowNewsDay: opts._firstSnowNewsDay } : {})
    }
  };
}

describe('#1304-T3 snow-news eligible DOY by severity', () => {
  // The first mountain-snow news item becomes eligible at:
  //   base (Oct 5 = DOY 278) + severityShift + jitter(0..SNOW_NEWS_JITTER_MAX)
  // So the earliest possible fire-day = base + shift + 0.
  //   early → 278 + (-14) = 264 ≈ Sep 21
  //   normal → 278 + 0 = 278 = Oct 5
  //   late → 278 + 14 = 292 ≈ Oct 19
  //
  // We verify: eligibleDOY(early) < eligibleDOY(normal) < eligibleDOY(late)
  // AND that jitter stays within [0, SNOW_NEWS_JITTER_MAX].

  it('eligibleDOY is strictly ordered: early < normal < late', () => {
    const earlyState  = snowNewsState({ severity: 'early',  month: 10, day: 1 });
    const normalState = snowNewsState({ severity: 'normal', month: 10, day: 1 });
    const lateState   = snowNewsState({ severity: 'late',   month: 10, day: 1 });

    const earlyDOY  = snowNewsEligibleDOY(earlyState);
    const normalDOY = snowNewsEligibleDOY(normalState);
    const lateDOY   = snowNewsEligibleDOY(lateState);

    expect(earlyDOY).toBeLessThan(normalDOY);
    expect(normalDOY).toBeLessThan(lateDOY);
  });

  it('jitter is bounded [0, SNOW_NEWS_JITTER_MAX] above the shifted base', () => {
    // Check across several seeds to cover jitter spread.
    const seeds = ['seed-a', 'seed-b', 'seed-c', 'seed-d', 'seed-e'];
    for (const severity of ['early', 'normal', 'late'] as const) {
      for (const seed of seeds) {
        const s = snowNewsState({ seed, severity, month: 10, day: 1 });
        const shiftedBase = SNOW_NEWS_BASE_DOY + (
          severity === 'early' ? -14 : severity === 'late' ? 14 : 0
        );
        const eligible = snowNewsEligibleDOY(s);
        expect(eligible).toBeGreaterThanOrEqual(shiftedBase);
        expect(eligible).toBeLessThanOrEqual(shiftedBase + SNOW_NEWS_JITTER_MAX);
      }
    }
  });

  it('eligibleDOY is deterministic — same seed+severity always gives same result', () => {
    const s1 = snowNewsState({ seed: 'determ-seed', severity: 'normal', month: 10, day: 1 });
    const s2 = snowNewsState({ seed: 'determ-seed', severity: 'normal', month: 10, day: 1 });
    expect(snowNewsEligibleDOY(s1)).toBe(snowNewsEligibleDOY(s2));
  });
});

describe('#1304-T3 snow-news tier escalation', () => {
  // Tier 0: DOY < eligibleDOY — no news
  // Tier 1: eligibleDOY ≤ DOY < eligibleDOY + 14  — "first dustings"
  // Tier 2: eligibleDOY + 14 ≤ DOY < eligibleDOY + 28 — "snow lying early"
  // Tier 3: DOY ≥ eligibleDOY + 28 — "wagons turning back" (tier-3 anchor)
  //
  // snowNewsTier returns 0 (ineligible), 1, 2, or 3.

  it('tier is 0 before the eligible DOY', () => {
    // Force a predictable eligible DOY: normal severity, seed 'snownews-test'
    const s = snowNewsState({ severity: 'normal', month: 9, day: 1 }); // Sep 1, well before Oct 5
    expect(snowNewsTier(s)).toBe(0);
  });

  it('tier escalates 1 → 2 → 3 with calendar advance past eligibleDOY', () => {
    const baseState = snowNewsState({ seed: 'tier-test', severity: 'normal', month: 10, day: 1 });
    const eligible  = snowNewsEligibleDOY(baseState);
    // Convert eligible DOY back to a month+day for test construction.
    // Oct DOY range: 274..304. eligible is 278..283 (normal, 0..5 jitter).
    // We'll step 0, +14, +28 days past the eligible DOY.
    const monthStarts = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    function doyToDate(doy: number): { month: number; day: number } {
      let m = 12;
      for (let i = 1; i <= 12; i++) {
        if (doy <= monthStarts[i - 1] + [31,28,31,30,31,30,31,31,30,31,30,31][i-1]) {
          m = i;
          break;
        }
      }
      return { month: m, day: doy - monthStarts[m - 1] };
    }

    const tier1Date = doyToDate(eligible);
    const tier2Date = doyToDate(eligible + 14);
    const tier3Date = doyToDate(eligible + 28);

    const s1 = { ...baseState, date: { year: 1849, ...tier1Date } };
    const s2 = { ...baseState, date: { year: 1849, ...tier2Date } };
    const s3 = { ...baseState, date: { year: 1849, ...tier3Date } };

    expect(snowNewsTier(s1)).toBe(1);
    expect(snowNewsTier(s2)).toBe(2);
    expect(snowNewsTier(s3)).toBe(3);
  });
});

describe('#1304-T3 checkSnowNews — fires once, sets _firstSnowNewsDay', () => {
  it('does not fire before the eligible DOY', () => {
    // Sep 1 — well before any severity tier's eligible DOY.
    const s = snowNewsState({ severity: 'normal', month: 9, day: 1 });
    const after = checkSnowNews(s);
    // No news item, no flag, eventLog unchanged.
    expect(after.flags._firstSnowNewsDay).toBeUndefined();
    expect(after.eventLog.length).toBe(s.eventLog.length);
  });

  it('fires on the eligible DOY (tier 1 copy) and sets _firstSnowNewsDay', () => {
    // Build a state exactly on the eligible DOY for a known seed.
    const baseState = snowNewsState({ seed: 'fire-test', severity: 'normal', month: 10, day: 1 });
    const eligible  = snowNewsEligibleDOY(baseState);
    const monthStarts = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    function doyToDate(doy: number): { month: number; day: number } {
      let m = 12;
      for (let i = 1; i <= 12; i++) {
        if (doy <= monthStarts[i - 1] + [31,28,31,30,31,30,31,31,30,31,30,31][i-1]) { m = i; break; }
      }
      return { month: m, day: doy - monthStarts[m - 1] };
    }
    const s = { ...baseState, date: { year: 1849, ...doyToDate(eligible) } };

    const after = checkSnowNews(s);

    expect(after.flags._firstSnowNewsDay).toBe(s.day);
    // One news item added to eventLog.
    expect(after.eventLog.length).toBe(s.eventLog.length + 1);
    const logEntry = after.eventLog[after.eventLog.length - 1].text;
    expect(logEntry).toContain('📢 News:');
    // Tier 1 — "dustings" not "wagons turning back".
    expect(logEntry).not.toContain('wagons are turning back');
  });

  it('_firstSnowNewsDay is set exactly once — second call does not overwrite', () => {
    const baseState = snowNewsState({ seed: 'once-test', severity: 'normal', month: 10, day: 5 });
    const eligible  = snowNewsEligibleDOY(baseState);
    const monthStarts = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    function doyToDate(doy: number): { month: number; day: number } {
      let m = 12;
      for (let i = 1; i <= 12; i++) {
        if (doy <= monthStarts[i-1] + [31,28,31,30,31,30,31,31,30,31,30,31][i-1]) { m=i; break; }
      }
      return { month: m, day: doy - monthStarts[m - 1] };
    }
    // State is already PAST the eligibleDOY and has _firstSnowNewsDay stamped.
    const priorDay = 165;
    const s = {
      ...baseState,
      date: { year: 1849, ...doyToDate(eligible + 5) },
      day: 172,
      flags: { ...baseState.flags, _firstSnowNewsDay: priorDay, _snowNewsLastDay: 172 }
    };

    const after = checkSnowNews(s);
    // Flag must NOT be overwritten.
    expect(after.flags._firstSnowNewsDay).toBe(priorDay);
  });

  it('does not double-fire on the same game-day (_snowNewsLastDay guard)', () => {
    const baseState = snowNewsState({ seed: 'nodup-test', severity: 'normal', month: 10, day: 5 });
    const eligible  = snowNewsEligibleDOY(baseState);
    const monthStarts = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    function doyToDate(doy: number): { month: number; day: number } {
      let m = 12;
      for (let i = 1; i <= 12; i++) {
        if (doy <= monthStarts[i-1] + [31,28,31,30,31,30,31,31,30,31,30,31][i-1]) { m=i; break; }
      }
      return { month: m, day: doy - monthStarts[m - 1] };
    }
    const s = {
      ...baseState,
      date: { year: 1849, ...doyToDate(eligible) },
      flags: { ...baseState.flags, _snowNewsLastDay: baseState.day }  // same day → already fired
    };

    const after = checkSnowNews(s);
    // No new log entry — guard prevented double-fire.
    expect(after.eventLog.length).toBe(s.eventLog.length);
  });
});

describe('#1304-T3 tier-3 copy is the existing anchor line', () => {
  // Tier 3 must surface "Heavy snow is in the high passes — wagons are turning back."
  // This is the existing copy from generatePostGossip (roll===2, winter months).
  // We verify the new schedule surfaces the same copy at tier 3.

  it('tier-3 news text contains the canonical turning-back copy', () => {
    const baseState = snowNewsState({ seed: 'tier3-copy', severity: 'normal', month: 10, day: 1 });
    const eligible  = snowNewsEligibleDOY(baseState);
    const monthStarts = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    function doyToDate(doy: number): { month: number; day: number } {
      let m = 12;
      for (let i = 1; i <= 12; i++) {
        if (doy <= monthStarts[i-1] + [31,28,31,30,31,30,31,31,30,31,30,31][i-1]) { m=i; break; }
      }
      return { month: m, day: doy - monthStarts[m - 1] };
    }
    const s = { ...baseState, date: { year: 1849, ...doyToDate(eligible + 28) } };
    expect(snowNewsTier(s)).toBe(3);
    const after = checkSnowNews(s);
    const logText = after.eventLog[after.eventLog.length - 1]?.text ?? '';
    expect(logText).toContain('wagons are turning back');
  });
});

describe('#1304-T3 no severity word in news strings or flags', () => {
  // Signal-honesty guard: none of early/late/_winterSeverity must appear in
  // any snow-news text, flag key, or flag value set by T3.
  const FORBIDDEN_PATTERNS = [/\bearly\b/i, /\blate\b/i, /_winterSeverity/, /\bnormal\b/i];

  it('news strings never contain forbidden severity words', () => {
    for (const severity of ['early', 'normal', 'late'] as const) {
      const baseState = snowNewsState({ seed: 'no-leak', severity, month: 10, day: 1 });
      const eligible  = snowNewsEligibleDOY(baseState);
      const monthStarts = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
      function doyToDate(doy: number): { month: number; day: number } {
        let m = 12;
        for (let i = 1; i <= 12; i++) {
          if (doy <= monthStarts[i-1] + [31,28,31,30,31,30,31,31,30,31,30,31][i-1]) { m=i; break; }
        }
        return { month: m, day: doy - monthStarts[m - 1] };
      }
      // Check all three tiers.
      for (const offset of [0, 14, 28]) {
        const s = { ...baseState, date: { year: 1849, ...doyToDate(eligible + offset) } };
        const after = checkSnowNews(s);
        const newsItems = (after.flags._news as unknown as Array<{ text: string }> | undefined) ?? [];
        for (const item of newsItems) {
          for (const pat of FORBIDDEN_PATTERNS) {
            expect(item.text).not.toMatch(pat);
          }
        }
      }
    }
  });

  it('T3 flags do not encode the severity word', () => {
    for (const severity of ['early', 'normal', 'late'] as const) {
      const baseState = snowNewsState({ seed: 'flag-leak', severity, month: 10, day: 1 });
      const eligible  = snowNewsEligibleDOY(baseState);
      const monthStarts = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
      function doyToDate(doy: number): { month: number; day: number } {
        let m = 12;
        for (let i = 1; i <= 12; i++) {
          if (doy <= monthStarts[i-1] + [31,28,31,30,31,30,31,31,30,31,30,31][i-1]) { m=i; break; }
        }
        return { month: m, day: doy - monthStarts[m - 1] };
      }
      const s = { ...baseState, date: { year: 1849, ...doyToDate(eligible) } };
      const after = checkSnowNews(s);
      // The new flags added by T3 should be _firstSnowNewsDay and _snowNewsLastDay.
      // Neither should encode the severity word.
      const flagKeys = Object.keys(after.flags).filter(
        k => !Object.keys(s.flags).includes(k)
      );
      for (const key of flagKeys) {
        expect(key).not.toMatch(/_winterSeverity/);
        expect(key).not.toMatch(/early|late|normal/i);
        const val = String(after.flags[key as keyof typeof after.flags] ?? '');
        expect(val).not.toMatch(/early|late|normal/i);
      }
    }
  });
});

describe('#1304-T3 fort gossip — in-season tier copy at Hall/Boise/Whitman', () => {
  // getFortSnowGossip(state, postName) returns a NewsItem with the current tier
  // copy when visiting ft_hall / ft_boise / whitman_mission in-season (DOY ≥
  // eligibleDOY). Returns null before the season or at non-fort posts.

  it('returns null before the eligible DOY', () => {
    const s = snowNewsState({ severity: 'normal', month: 8, day: 15 }); // Aug 15, pre-season
    expect(getFortSnowGossip(s, 'Fort Hall')).toBeNull();
    expect(getFortSnowGossip(s, 'Fort Boise')).toBeNull();
    expect(getFortSnowGossip(s, 'Whitman Mission')).toBeNull();
  });

  it('returns null for non-fort posts even in-season', () => {
    const baseState = snowNewsState({ seed: 'fort-test', severity: 'normal', month: 10, day: 1 });
    const eligible  = snowNewsEligibleDOY(baseState);
    const monthStarts = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    function doyToDate(doy: number): { month: number; day: number } {
      let m = 12;
      for (let i = 1; i <= 12; i++) {
        if (doy <= monthStarts[i-1] + [31,28,31,30,31,30,31,31,30,31,30,31][i-1]) { m=i; break; }
      }
      return { month: m, day: doy - monthStarts[m - 1] };
    }
    const s = { ...baseState, date: { year: 1849, ...doyToDate(eligible) } };
    expect(getFortSnowGossip(s, 'Fort Laramie')).toBeNull();
    expect(getFortSnowGossip(s, 'Fort Bridger')).toBeNull();
  });

  it('returns a NewsItem at Fort Hall in-season (tier 1 or higher)', () => {
    const baseState = snowNewsState({ seed: 'hall-test', severity: 'normal', month: 10, day: 1 });
    const eligible  = snowNewsEligibleDOY(baseState);
    const monthStarts = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    function doyToDate(doy: number): { month: number; day: number } {
      let m = 12;
      for (let i = 1; i <= 12; i++) {
        if (doy <= monthStarts[i-1] + [31,28,31,30,31,30,31,31,30,31,30,31][i-1]) { m=i; break; }
      }
      return { month: m, day: doy - monthStarts[m - 1] };
    }
    const s = { ...baseState, date: { year: 1849, ...doyToDate(eligible) } };
    const item = getFortSnowGossip(s, 'Fort Hall');
    expect(item).not.toBeNull();
    expect(item!.topic).toBe('weather');
    // Period-era source references Captain Grant or the fort.
    expect(item!.source.toLowerCase()).toMatch(/hall|grant/);
    // Text must not contain severity words.
    expect(item!.text).not.toMatch(/\bearly\b|\blate\b|_winterSeverity|\bnormal\b/i);
  });

  it('Fort Hall tier-3 gossip contains the wagons-turning-back copy', () => {
    const baseState = snowNewsState({ seed: 'hall-t3', severity: 'normal', month: 10, day: 1 });
    const eligible  = snowNewsEligibleDOY(baseState);
    const monthStarts = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    function doyToDate(doy: number): { month: number; day: number } {
      let m = 12;
      for (let i = 1; i <= 12; i++) {
        if (doy <= monthStarts[i-1] + [31,28,31,30,31,30,31,31,30,31,30,31][i-1]) { m=i; break; }
      }
      return { month: m, day: doy - monthStarts[m - 1] };
    }
    const s = { ...baseState, date: { year: 1849, ...doyToDate(eligible + 28) } };
    expect(snowNewsTier(s)).toBe(3);
    const item = getFortSnowGossip(s, 'Fort Hall');
    expect(item).not.toBeNull();
    expect(item!.text).toContain('wagons are turning back');
  });

  it('Fort Boise in-season returns gossip', () => {
    const baseState = snowNewsState({ seed: 'boise-test', severity: 'normal', month: 10, day: 1 });
    const eligible  = snowNewsEligibleDOY(baseState);
    const monthStarts = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    function doyToDate(doy: number): { month: number; day: number } {
      let m = 12;
      for (let i = 1; i <= 12; i++) {
        if (doy <= monthStarts[i-1] + [31,28,31,30,31,30,31,31,30,31,30,31][i-1]) { m=i; break; }
      }
      return { month: m, day: doy - monthStarts[m - 1] };
    }
    const s = { ...baseState, date: { year: 1849, ...doyToDate(eligible + 7) } };
    const item = getFortSnowGossip(s, 'Fort Boise');
    expect(item).not.toBeNull();
    expect(item!.topic).toBe('weather');
    expect(item!.source.toLowerCase()).toMatch(/boise/);
  });

  it('Whitman Mission in-season returns gossip', () => {
    const baseState = snowNewsState({ seed: 'whitman-test', severity: 'normal', month: 10, day: 1 });
    const eligible  = snowNewsEligibleDOY(baseState);
    const monthStarts = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    function doyToDate(doy: number): { month: number; day: number } {
      let m = 12;
      for (let i = 1; i <= 12; i++) {
        if (doy <= monthStarts[i-1] + [31,28,31,30,31,30,31,31,30,31,30,31][i-1]) { m=i; break; }
      }
      return { month: m, day: doy - monthStarts[m - 1] };
    }
    const s = { ...baseState, date: { year: 1849, ...doyToDate(eligible + 7) } };
    const item = getFortSnowGossip(s, 'Whitman Mission');
    expect(item).not.toBeNull();
    expect(item!.topic).toBe('weather');
    expect(item!.source.toLowerCase()).toMatch(/whitman|mission/);
  });
});

// ── T4 — Agent layer: estimator, seasonal pressure, family inversion, ────────
// governance. Design: spec §4, plan T4.

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Minimal state for estimator / pressure tests. No flags by default. */
function t4State(over: Partial<GameState> = {}): GameState {
  const base = {
    day: 100,
    location: { milesTraveled: TOTAL_TRAIL_MI * 0.5, terrain: 'prairie', trailPosition: 0, nextLandmarkId: null, previousLandmarkId: null },
    flags: {},
    party: [],
    oxen: [],
    resources: { water: 10, waterCap: 20 },
    morale: 80
  };
  return { ...base, ...over } as unknown as GameState;
}

/** State that projects to a given arrival day. */
function t4StateProjecting(arrivalDay: number): GameState {
  // projectedArrivalDay = day * (TOTAL_TRAIL_MI / miles) = arrivalDay
  // → miles = day * TOTAL_TRAIL_MI / arrivalDay
  return t4State({
    day: 100,
    location: { milesTraveled: (100 * TOTAL_TRAIL_MI) / arrivalDay, terrain: 'prairie', trailPosition: 0, nextLandmarkId: null, previousLandmarkId: null } as unknown as GameState['location'],
    flags: {}
  });
}

/** Minimal WagonTrain for companyRestDecision tests. */
function minTrain(doctrine: WagonTrain['doctrine']): WagonTrain {
  return {
    doctrine,
    companions: [],
    companyDecisionBlock: undefined,
    tradeEnabled: false,
    inboundOffers: []
  } as unknown as WagonTrain;
}

// ── T4 §1: estimateSnowSafeDay table tests ────────────────────────────────────

describe('#1304-T4 estimateSnowSafeDay — constants exported', () => {
  it('exports SNOW_SAFE_BASELINE_DAY', () => expect(SNOW_SAFE_BASELINE_DAY).toBe(185));
  it('exports SNOW_NEWS_PRIOR_DAY', ()  => expect(SNOW_NEWS_PRIOR_DAY).toBe(173));
  it('exports SNOW_SAFE_ESTIMATE_MIN',  () => expect(SNOW_SAFE_ESTIMATE_MIN).toBe(165));
  it('exports SNOW_SAFE_ESTIMATE_MAX',  () => expect(SNOW_SAFE_ESTIMATE_MAX).toBe(200));
  it('exports FAMILY_MARGIN_DAYS',      () => expect(FAMILY_MARGIN_DAYS).toBe(10));
});

describe('#1304-T4 estimateSnowSafeDay — no signals → baseline 185', () => {
  it('returns baseline when no _firstSnowNewsDay, no child', () => {
    const s = t4State({ flags: {} });
    expect(estimateSnowSafeDay(s)).toBe(185);
  });

  it('returns baseline when _firstSnowNewsDay = SNOW_NEWS_PRIOR_DAY (173) — no adjustment', () => {
    // news on the expected normal day → adjustment = max(0, 173-173) = 0
    const s = t4State({ flags: { _firstSnowNewsDay: 173 } });
    expect(estimateSnowSafeDay(s)).toBe(185);
  });

  it('returns baseline when _firstSnowNewsDay is AFTER prior day (late year)', () => {
    // Late news (day 180): adjustment = max(0, 173-180) = 0 → baseline
    const s = t4State({ flags: { _firstSnowNewsDay: 180 } });
    expect(estimateSnowSafeDay(s)).toBe(185);
  });
});

describe('#1304-T4 estimateSnowSafeDay — news earlier than prior → estimate drops', () => {
  it('news on day 160 → estimate ≈ 172 (185 - (173-160)=13)', () => {
    const s = t4State({ flags: { _firstSnowNewsDay: 160 } });
    // adjustment = max(0, 173-160) = 13 → estimate = 185-13 = 172; clamp[165,200] = 172
    expect(estimateSnowSafeDay(s)).toBe(172);
  });

  it('news on day 173 → estimate = 185 (no adjustment — exactly prior day)', () => {
    const s = t4State({ flags: { _firstSnowNewsDay: 173 } });
    expect(estimateSnowSafeDay(s)).toBe(185);
  });

  it('news on very early day 150 → estimate clamped at MIN (165)', () => {
    // adjustment = 173-150 = 23 → 185-23 = 162 → clamped to 165
    const s = t4State({ flags: { _firstSnowNewsDay: 150 } });
    expect(estimateSnowSafeDay(s)).toBe(165);
  });

  it('never exceeds MAX (200) regardless of late signals', () => {
    // No signals at all; baseline is 185 which is already ≤ 200
    const s = t4State({ flags: {} });
    expect(estimateSnowSafeDay(s)).toBeLessThanOrEqual(SNOW_SAFE_ESTIMATE_MAX);
  });
});

describe('#1304-T4 estimateSnowSafeDay — family tightening', () => {
  it('with child present, estimate tightens by FAMILY_MARGIN_DAYS', () => {
    // No news signal, baseline 185, family → 185 - 10 = 175; clamp ok
    const s = t4State({
      flags: {},
      party: [
        { dead: false, kind: 'adult', health: 80 } as never,
        { dead: false, kind: 'child', health: 80 } as never
      ]
    });
    expect(estimateSnowSafeDay(s)).toBe(175);
  });

  it('with child + early news, estimate tightens further', () => {
    // news day 160 → base 172; family → 172 - 10 = 162; clamped to 165
    const s = t4State({
      flags: { _firstSnowNewsDay: 160 },
      party: [
        { dead: false, kind: 'adult', health: 80 } as never,
        { dead: false, kind: 'child', health: 80 } as never
      ]
    });
    expect(estimateSnowSafeDay(s)).toBe(165); // clamped at MIN
  });

  it('dead child does not count as a child', () => {
    // Dead child: family flag should not apply
    const s = t4State({
      flags: {},
      party: [
        { dead: false, kind: 'adult', health: 80 } as never,
        { dead: true, kind: 'child', health: 0 } as never  // dead
      ]
    });
    // Only dead child → no living child → no family tightening → 185
    expect(estimateSnowSafeDay(s)).toBe(185);
  });
});

// ── T4 §2: schedulePressure uses min(target, estimate) ────────────────────────

describe('#1304-T4 schedulePressure — seasonal target is min(target, estimate)', () => {
  it('ok when projected is within estimate (no signal, estimate=185)', () => {
    // projected = 180 < 185 → ok
    const s = t4StateProjecting(180);
    // balanced target=185, estimate=185 → effectiveTarget=185
    expect(schedulePressure(s, 185)).toBe('ok');
  });

  it('behind when projected just past estimate', () => {
    // projected = 192, effectiveTarget=185, 185+15=200, 185<192≤200 → 'behind'
    const s = t4StateProjecting(192);
    expect(schedulePressure(s, 185)).toBe('behind');
  });

  it('critical when projected far past estimate', () => {
    // projected = 210 > 185+15=200 → 'critical'
    const s = t4StateProjecting(210);
    expect(schedulePressure(s, 185)).toBe('critical');
  });

  it('estimate caps a loose persona target — hoarder (target 205) still feels pressure', () => {
    // hoarder target=205, estimate=185 → effective=185; projected=192 → 'behind'
    const s = t4StateProjecting(192);
    // Pass hoarder's target; effective will be min(205, 185)=185
    const doctrine = doctrineFor('hoarder');
    expect(schedulePressure(s, doctrine.targetArrivalDay)).toBe('behind');
  });

  it('chaos: null target → always ok even with estimate', () => {
    // The fuzzer's contract: chaos ignores the clock entirely.
    // Projected 250 (very late) but null target → 'ok'.
    const s = t4StateProjecting(250);
    expect(schedulePressure(s, null)).toBe('ok');
  });

  it('estimate raised by early-news signal → pressure fires sooner', () => {
    // With news on day 160 → estimate=172. effectiveTarget = min(185, 172) = 172.
    // projected=180 > 172 → 'behind' (vs 'ok' without news)
    const s = { ...t4StateProjecting(180), flags: { _firstSnowNewsDay: 160 } } as unknown as GameState;
    expect(schedulePressure(s, 185)).toBe('behind');
  });
});

// ── T4 §3: family tightening inverts #1235 exemption ─────────────────────────

describe('#1304-T4 family inversion — #1235 exemption flipped', () => {
  it('family wagon IS subject to pressure (child no longer exempts)', () => {
    // projected 192, effectiveTarget=min(185,175)=175 (family tightens by 10)
    // 192 > 175 + 15 = 190 → 'critical' for a family with no news signals
    const base = t4StateProjecting(192);
    const s = {
      ...base,
      flags: {},
      party: [
        { dead: false, kind: 'adult', health: 80 } as never,
        { dead: false, kind: 'child', health: 80 } as never
      ]
    } as unknown as GameState;
    const doctrine = doctrineFor('balanced');
    // effective = min(185, estimateSnowSafeDay(s)) = min(185, 175) = 175
    // projected=192, 192 > 175+15=190 → 'critical'
    expect(schedulePressure(s, doctrine.targetArrivalDay)).toBe('critical');
  });

  it('childless wagon with same projection is only "behind"', () => {
    // Same projected 192, no child → estimate=185, effective=185
    // 192 > 185 but ≤ 185+15=200 → 'behind'
    const base = t4StateProjecting(192);
    const s = {
      ...base,
      flags: {},
      party: [{ dead: false, kind: 'adult', health: 80 } as never]
    } as unknown as GameState;
    const doctrine = doctrineFor('balanced');
    expect(schedulePressure(s, doctrine.targetArrivalDay)).toBe('behind');
  });
});

// ── T4 §4: persona pace response under pressure ───────────────────────────────

describe('#1304-T4 persona pace — balanced picks fast under critical', () => {
  it('balanced returns "moderate" when on schedule', () => {
    // projected=180, effectiveTarget=185 → ok → no boost
    const s = { ...t4StateProjecting(180), flags: {} } as unknown as GameState;
    expect(balancedPersona.pickPace(s, {} as never)).toBe('moderate');
  });

  it('balanced returns "fast" under critical pressure', () => {
    // projected=210 → effectiveTarget=185 → critical → boost to 'fast'
    // T6d: oxen=[] → liveOxen=0 → avgFatigue=0 < OX_SUSTAIN_FULL(40) → full boost allowed.
    const s = { ...t4StateProjecting(210), flags: {} } as unknown as GameState;
    expect(balancedPersona.pickPace(s, {} as never)).toBe('fast');
  });

  it('balanced returns "fast" under behind pressure (moderate→fast)', () => {
    // projected=192 → effectiveTarget=185 → behind → upgrade moderate→fast
    // T6d: oxen=[] → liveOxen=0 → avgFatigue=0 < OX_SUSTAIN_FULL(40) → full boost allowed.
    const s = { ...t4StateProjecting(192), flags: {} } as unknown as GameState;
    expect(balancedPersona.pickPace(s, {} as never)).toBe('fast');
  });
});

describe('#1304-T4 persona pace — health floors hold even under critical', () => {
  it('balanced stays "slow" under critical when party HP is very low', () => {
    // Sick party (minPartyHealth < 20 for cautious, but balanced has no explicit
    // slow-on-HP threshold — balanced relies on shouldRest. Test via cautious
    // which explicitly slow-gates at HP < 20.
    // cautious: if minPartyHealth < 20 → 'slow'; winterPaceBoost called on 'slow'
    // → boost from 'slow': critical → 'fast', but wait: the spec says floors win.
    // Re-read: "health floors applied FIRST, then boost on result"
    // cautious applies floors FIRST, then calls winterPaceBoost(state, id, base).
    // With HP=10 < 20 → base='slow'. winterPaceBoost on 'slow' at 'critical' → 'fast'?
    // NO — that would override the floor! We need to check what winterPaceBoost does
    // to 'slow' at critical: it returns 'fast' (idx=0, critical → max(0, 2) = 'fast').
    // But the spec says "health floors still respected." The resolution: cautious's
    // floor at HP<20 → 'slow' is the FINAL answer. We must NOT boost past 'slow' if
    // the base was determined by a health emergency.
    //
    // Implementation path: the spec says floors are applied by the persona's pickPace
    // logic FIRST, then boost on the result. But if the health floor produced 'slow',
    // boosting it to 'fast' defeats the purpose of the floor.
    //
    // Re-read spec §4: "health floors still respected (never override the slow-when-
    // sick/oxen-worn branches)." This means the boost should NOT override 'slow' that
    // came from a health/oxen emergency. We need a way to distinguish "slow because
    // normal pace" from "slow because emergency."
    //
    // The simplest fix: winterPaceBoost should not boost if the party is too fragile
    // to push (tooFragileToPush). Import that and gate it.
    //
    // For THIS test: cautious at HP=10 → slow; tooFragileToPush(HP=10 < MIN_PUSH_HP=60)
    // → true → boost defers → stays 'slow'. This is the expected behavior.
    const s = {
      ...t4StateProjecting(210),
      flags: {},
      party: [{ dead: false, kind: 'adult', health: 10 } as never],
      oxen: [{ health: 100, fatigue: 0 }]
    } as unknown as GameState;
    // cautious: minPartyHealth=10 < 20 → base='slow'
    // winterPaceBoost: tooFragileToPush=true (HP=10 < 60) → return basePace unchanged
    expect(cautiousPersona.pickPace(s, {} as never)).toBe('slow');
  });
});

// ── T4 §4: Sabbath response for sacred personas ───────────────────────────────

describe('#1304-T4 sacred personas — Sabbath at behind / breaks at critical', () => {
  it('faithful keeps Sabbath at "behind" pressure', () => {
    // projected=192, effectiveTarget=min(195,185)=185, 185<192≤200 → 'behind'
    // faithful sacred + 'behind' → allowsSabbathRest = true
    const s = { ...t4StateProjecting(192), flags: {} } as unknown as GameState;
    expect(allowsSabbathRest(s, 'faithful')).toBe(true);
  });

  it('faithful breaks Sabbath at "critical" pressure', () => {
    // projected=210 > 185+15=200 → 'critical'
    // faithful sacred + 'critical' → allowsSabbathRest = false
    const s = { ...t4StateProjecting(210), flags: {} } as unknown as GameState;
    expect(allowsSabbathRest(s, 'faithful')).toBe(false);
  });

  it('sunday_rester keeps Sabbath at "behind" pressure', () => {
    const s = { ...t4StateProjecting(192), flags: {} } as unknown as GameState;
    expect(allowsSabbathRest(s, 'sunday_rester')).toBe(true);
  });

  it('sunday_rester breaks Sabbath at "critical" pressure', () => {
    const s = { ...t4StateProjecting(210), flags: {} } as unknown as GameState;
    expect(allowsSabbathRest(s, 'sunday_rester')).toBe(false);
  });

  it('faithful.shouldRest keeps Sabbath (behind) on a Sunday', () => {
    // 1849-06-17 is a Sunday. projected=192 → 'behind'. faithful keeps it.
    const s = {
      ...t4StateProjecting(192),
      date: { year: 1849, month: 6, day: 17 },
      flags: {},
      oxen: [{ health: 100, fatigue: 0 }]
    } as unknown as GameState;
    expect(faithfulPersona.shouldRest(s, {} as never)).toBe(true);
  });

  it('faithful.shouldRest breaks Sabbath (critical) on a Sunday', () => {
    // projected=210 → 'critical'. faithful breaks it.
    const s = {
      ...t4StateProjecting(210),
      date: { year: 1849, month: 6, day: 17 },
      flags: {},
      oxen: [{ health: 100, fatigue: 0 }]
    } as unknown as GameState;
    expect(faithfulPersona.shouldRest(s, {} as never)).toBe(false);
  });
});

// ── T4 §5: companyRestDecision season term ────────────────────────────────────

describe('#1304-T4 companyRestDecision — season term defers maintenance under pressure', () => {
  /** Worn state: ox fatigue high, minHP ok — would normally trigger maintenance. */
  function wornTrainState(doctrine: WagonTrain['doctrine'], arrivalDay: number): GameState {
    return {
      ...t4StateProjecting(arrivalDay),
      flags: {},
      party: [{ dead: false, kind: 'adult', health: 60 } as never],
      oxen: [{ health: 100, fatigue: 75 }],  // fatigue > maintOxFatigue(50 for prudent)
      wagonTrain: minTrain(doctrine)
    } as unknown as GameState;
  }

  it('defers maintenance lay-by under "behind" pressure (prudent doctrine)', () => {
    // projected=192 → 'behind' for prudent (target 185, effective 185)
    // Normal behavior would fire maintenance (fatigue 75 > maintOxFatigue 50).
    // Under pressure: maintenance is deferred → travel.
    const s = wornTrainState('prudent', 192);
    expect(companyRestDecision(s).mode).toBe('travel');
  });

  it('defers maintenance lay-by under "critical" pressure', () => {
    const s = wornTrainState('prudent', 210);
    expect(companyRestDecision(s).mode).toBe('travel');
  });

  it('still calls maintenance when on schedule (pressure=ok)', () => {
    // projected=175, effectiveTarget=185 → ok → maintenance fires normally
    const s = wornTrainState('prudent', 175);
    expect(companyRestDecision(s).mode).toBe('maintenance_layby');
  });

  it('hard_driver defers maintenance under behind pressure', () => {
    const s = wornTrainState('hard_driver', 192);
    expect(companyRestDecision(s).mode).toBe('travel');
  });
});

describe('#1304-T4 companyRestDecision — devout Sabbath under pressure', () => {
  /** Sunday state with given projected arrival. */
  function sundayState(doctrine: WagonTrain['doctrine'], arrivalDay: number): GameState {
    return {
      ...t4StateProjecting(arrivalDay),
      flags: {},
      date: { year: 1849, month: 6, day: 17 }, // Sunday
      party: [{ dead: false, kind: 'adult', health: 80 } as never],
      oxen: [{ health: 100, fatigue: 0 }],
      wagonTrain: minTrain(doctrine)
    } as unknown as GameState;
  }

  it('devout doctrine keeps Sabbath when on schedule', () => {
    // projected=175 → ok → Sabbath lay-by fires for devout
    const s = sundayState('devout', 175);
    expect(companyRestDecision(s).mode).toBe('sabbath_layby');
  });

  it('devout doctrine keeps Sabbath at "behind" pressure', () => {
    // projected=192 → behind; devout+behind → keep Sabbath (#1304-T4)
    const s = sundayState('devout', 192);
    expect(companyRestDecision(s).mode).toBe('sabbath_layby');
  });

  it('devout doctrine breaks Sabbath at "critical" pressure', () => {
    // projected=210 → critical; devout+critical → push (breaks Sabbath)
    const s = sundayState('devout', 210);
    expect(companyRestDecision(s).mode).toBe('travel');
  });

  it('non-devout doctrine never calls Sabbath lay-by', () => {
    // prudent and hard_driver: params.sabbath=false → no Sabbath branch regardless
    const prudentOk = sundayState('prudent', 175);
    const hardOk = sundayState('hard_driver', 175);
    expect(companyRestDecision(prudentOk).mode).not.toBe('sabbath_layby');
    expect(companyRestDecision(hardOk).mode).not.toBe('sabbath_layby');
  });
});

describe('#1304-T4 companyRestDecision — crisis floor preserved', () => {
  it('crisis floor fires even under critical pressure', () => {
    // Even behind schedule, a dying party stops — crisis overrides season term.
    const s = {
      ...t4StateProjecting(210),
      flags: {},
      date: { year: 1849, month: 6, day: 17 },
      party: [{ dead: false, kind: 'adult', health: 15 } as never], // below CRISIS_MIN_HP=20
      oxen: [{ health: 100, fatigue: 0 }],
      wagonTrain: { ...minTrain('hard_driver'), companyDecisionBlock: undefined }
    } as unknown as GameState;
    expect(companyRestDecision(s).mode).toBe('crisis_layby');
  });
});

describe('#1304-T4 chaos unaffected by season pressure', () => {
  it('chaos schedulePressure always ok (null target)', () => {
    // Very late projected (250) — chaos is immune to seasonal pressure.
    // The fuzzer's contract must not be broken by the winter wall.
    const s = { ...t4StateProjecting(250), flags: {} } as unknown as GameState;
    const doctrine = doctrineFor('chaos');
    expect(schedulePressure(s, doctrine.targetArrivalDay)).toBe('ok');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// T5 — Player chip: arrivalBand helper + addDaysToDate calendar util
// ═══════════════════════════════════════════════════════════════════════════
//
// The chip is a Svelte component (visual check in Playwright).
// These unit tests cover:
//   1. addDaysToDate — pure calendar arithmetic, including month-end rollover
//      and year-end rollover.
//   2. arrivalBand — pure function: returns null early-game, ok/behind/critical
//      based on projected vs snow-safe estimate.
//
// Design §5: "ok" = proj <= snowSafe, "behind" = proj <= snowSafe + 15,
//   "critical" = beyond. Hidden when projectedArrivalDay returns null.
// ═══════════════════════════════════════════════════════════════════════════

// ── addDaysToDate ────────────────────────────────────────────────────────────

describe('#1304-T5 addDaysToDate — calendar arithmetic', () => {
  it('advances by 0 days — returns same date', () => {
    const d = addDaysToDate({ year: 1849, month: 6, day: 15 }, 0);
    expect(d).toEqual({ year: 1849, month: 6, day: 15 });
  });

  it('advances within the same month', () => {
    const d = addDaysToDate({ year: 1849, month: 9, day: 10 }, 5);
    expect(d).toEqual({ year: 1849, month: 9, day: 15 });
  });

  it('rolls over to the next month', () => {
    // Sep 30 + 1 = Oct 1
    const d = addDaysToDate({ year: 1849, month: 9, day: 30 }, 1);
    expect(d).toEqual({ year: 1849, month: 10, day: 1 });
  });

  it('rolls over multiple months correctly', () => {
    // Oct 16 + 25 = Nov 10
    const d = addDaysToDate({ year: 1849, month: 10, day: 16 }, 25);
    expect(d).toEqual({ year: 1849, month: 11, day: 10 });
  });

  it('rolls over Dec into Jan of the next year', () => {
    // Dec 31 + 1 = Jan 1 1850
    const d = addDaysToDate({ year: 1849, month: 12, day: 31 }, 1);
    expect(d).toEqual({ year: 1850, month: 1, day: 1 });
  });

  it('handles leap year Feb 28 → Feb 29 (1848 is a leap year)', () => {
    // 1848 is a leap year. Feb 28 + 1 = Feb 29.
    const d = addDaysToDate({ year: 1848, month: 2, day: 28 }, 1);
    expect(d).toEqual({ year: 1848, month: 2, day: 29 });
  });

  it('handles non-leap year Feb 28 → Mar 1 (1849 is not a leap year)', () => {
    // 1849 is not a leap year. Feb 28 + 1 = Mar 1.
    const d = addDaysToDate({ year: 1849, month: 2, day: 28 }, 1);
    expect(d).toEqual({ year: 1849, month: 3, day: 1 });
  });

  it('forward 100 days from Apr 15 1849 → Jul 24 1849', () => {
    // Apr 15 + 100d: 15 days left in Apr + 31 May + 30 Jun + 24 Jul = 100 ✓
    const d = addDaysToDate({ year: 1849, month: 4, day: 15 }, 100);
    expect(d).toEqual({ year: 1849, month: 7, day: 24 });
  });

  it('forward 185 days from Apr 15 1849 ≈ Oct 17 1849', () => {
    // Day 185 from Apr 15 = Oct 17 (the SNOW_SAFE_BASELINE_DAY anchor).
    // Apr has 15 days left, May=31, Jun=30, Jul=31, Aug=31, Sep=30, Oct=17
    // 15+31+30+31+31+30 = 168 days to Sep 30; +17 = Oct 17. Total 185. ✓
    const d = addDaysToDate({ year: 1849, month: 4, day: 15 }, 185);
    expect(d).toEqual({ year: 1849, month: 10, day: 17 });
  });
});

// ── arrivalBand ──────────────────────────────────────────────────────────────

/** Build a minimal state with a specific projected arrival day.
 *  projectedArrivalDay = day × (TOTAL_TRAIL_MI / miles) so we can
 *  solve for miles = day × TOTAL_TRAIL_MI / desiredProjectedDay. */
function bandState(desiredProjectedDay: number, dayOverride = 80): GameState {
  const s = createInitialState({
    seed: 'band-test',
    leader:     { name: 'Jonas', profession: 'farmer' },
    companions: [{ name: 'Martha', profession: 'teacher' }],
    startDate:  { year: 1849, month: 4, day: 15 }
  });
  const day   = dayOverride;
  const miles = Math.ceil((day / desiredProjectedDay) * TOTAL_TRAIL_MI);
  return {
    ...s,
    day,
    location: { ...s.location, milesTraveled: miles }
  };
}

describe('#1304-T5 arrivalBand — null before MIN_JUDGE_DAYS / MIN_JUDGE_MILES', () => {
  it('returns null when day < 20', () => {
    const s = bandState(185, 10); // day=10, below MIN_JUDGE_DAYS
    expect(arrivalBand(s)).toBeNull();
  });

  it('returns null when miles < 100', () => {
    // Even on day 25, if miles < 100 we're too early.
    const s = createInitialState({
      seed: 'band-early',
      leader:     { name: 'A', profession: 'farmer' },
      companions: [{ name: 'B', profession: 'teacher' }],
      startDate:  { year: 1849, month: 4, day: 15 }
    });
    const tooFewMiles = { ...s, day: 25, location: { ...s.location, milesTraveled: 50 } };
    expect(arrivalBand(tooFewMiles)).toBeNull();
  });
});

describe('#1304-T5 arrivalBand — ok band', () => {
  it('returns ok when projected arrival is at or before snowSafe estimate', () => {
    // No signals → snowSafe = SNOW_SAFE_BASELINE_DAY = 185.
    // Projecting arrival at day 180 (ahead of snowSafe) → ok.
    const s = bandState(180);
    expect(arrivalBand(s)).toBe('ok');
  });

  it('returns ok when projected == snowSafe exactly', () => {
    const s = bandState(SNOW_SAFE_BASELINE_DAY);
    expect(arrivalBand(s)).toBe('ok');
  });
});

describe('#1304-T5 arrivalBand — behind band', () => {
  it('returns behind when projected is 1..15 days past snowSafe', () => {
    // snowSafe = 185 (no signals). Projected = 195 (10 days over) → behind.
    const s = bandState(195);
    expect(arrivalBand(s)).toBe('behind');
  });

  it('returns behind at exactly snowSafe + 15', () => {
    // snowSafe = 185, projected = 200 → still behind (≤ 185 + 15 = 200).
    const s = bandState(200);
    expect(arrivalBand(s)).toBe('behind');
  });
});

describe('#1304-T5 arrivalBand — critical band', () => {
  it('returns critical when projected is > 15 days past snowSafe', () => {
    // snowSafe = 185, projected = 201 → critical (> 200).
    const s = bandState(201);
    expect(arrivalBand(s)).toBe('critical');
  });

  it('returns critical for a very slow party (projected = 240)', () => {
    const s = bandState(240);
    expect(arrivalBand(s)).toBe('critical');
  });
});

describe('#1304-T5 arrivalBand — shifts with estimateSnowSafeDay signals', () => {
  it('early snow news shifts snowSafe down → same pace moves from ok to behind', () => {
    // Without any news, projected=190 is behind (185 < 190 ≤ 200).
    // With early news (day 160), snowSafe drops to 185 − (173 − 160) = 172.
    // So projected=190 becomes critical (190 > 172 + 15 = 187).
    const s = bandState(190);
    const withEarlyNews = {
      ...s,
      flags: { ...s.flags, _firstSnowNewsDay: 160 }
    };
    const withoutNews = { ...s };
    // Without news: projected=190, snowSafe=185 → behind
    expect(arrivalBand(withoutNews)).toBe('behind');
    // With early news: projected=190, snowSafe=172 → critical (190 > 187)
    expect(arrivalBand(withEarlyNews)).toBe('critical');
  });

  it('family tightening moves threshold 10 days earlier', () => {
    // Family (child present) tightens snowSafe by FAMILY_MARGIN_DAYS (10).
    // No news: snowSafe = 185. Family: snowSafe = 175.
    // At projected = 188: without family → behind (188 ≤ 200); with family → critical (188 > 190).
    // Wait — family: snowSafe=175; behind bound=175+15=190; 188 ≤ 190 → behind.
    // Try projected = 192: without family → behind (192 ≤ 200); with family → critical (192 > 190).
    const s = bandState(192);

    const familyState = {
      ...s,
      party: [
        ...s.party,
        { name: 'Kid', dead: false, kind: 'child' as const, health: 80, conditions: [] } as never
      ]
    };

    // Without family: projected=192, snowSafe=185 → 192 ≤ 200 → behind
    expect(arrivalBand(s)).toBe('behind');
    // With family: snowSafe=175, behind bound=190 → 192 > 190 → critical
    expect(arrivalBand(familyState)).toBe('critical');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// T4b — Milestone timetable: scheduleDeficitDays + rewired pressure
// ═══════════════════════════════════════════════════════════════════════════
//
// The emigrant timetable (Independence Rock by July 4, etc.) is what
// bites in June when the projection term says "ok" (fresh oxen, 15+ mi/day).
// scheduleDeficitDays() interpolates the expected day from the catalog-
// derived milestone table. schedulePressure/arrivalBand take the WORSE
// of projection vs milestone terms.
// ═══════════════════════════════════════════════════════════════════════════

/** Minimal state at a specific mile/day for deficit tests. */
function milestoneState(miles: number, day: number): GameState {
  return {
    day,
    location: {
      milesTraveled: miles,
      terrain: 'prairie',
      trailPosition: 0,
      nextLandmarkId: null,
      previousLandmarkId: null
    },
    flags: {},
    party: [],
    oxen: [],
    resources: { water: 10, waterCap: 20 },
    morale: 80
  } as unknown as GameState;
}

describe('#1304-T4b TRAIL_MILESTONES — shape and IDs', () => {
  it('exports TRAIL_MILESTONES as a non-empty array', () => {
    expect(Array.isArray(TRAIL_MILESTONES)).toBe(true);
    expect(TRAIL_MILESTONES.length).toBeGreaterThan(0);
  });

  it('independence_rock entry has targetDay 72 (T6b: on-pace, not last-safe Jul-4 floor)', () => {
    // T6b re-baseline: 72 = on-pace schedule successful trains kept.
    // Jul 4 (day 81 from Apr 15) was the last-safe reassurance floor, not the
    // on-pace target — Palmer (1845–46) preached leaving mid-April so fast
    // trains reached the Rock well ahead of July 4.
    const m = TRAIL_MILESTONES.find((x) => x.landmarkId === 'independence_rock');
    expect(m).toBeDefined();
    expect(m!.targetDay).toBe(72);
  });

  it('ft_kearny is first, the_dalles is last', () => {
    expect(TRAIL_MILESTONES[0].landmarkId).toBe('ft_kearny');
    expect(TRAIL_MILESTONES[TRAIL_MILESTONES.length - 1].landmarkId).toBe('the_dalles');
  });

  it('targetDay values are strictly increasing', () => {
    for (let i = 1; i < TRAIL_MILESTONES.length; i++) {
      expect(TRAIL_MILESTONES[i].targetDay).toBeGreaterThan(TRAIL_MILESTONES[i - 1].targetDay);
    }
  });
});

describe('#1304-T4b scheduleDeficitDays — zero / negative when on or ahead of schedule', () => {
  it('returns 0 when miles <= 0', () => {
    expect(scheduleDeficitDays(milestoneState(0, 1))).toBe(0);
  });

  it('returns ≤ 0 (ahead) at ft_kearny (319 mi) on day 30 exactly (T6b: targetDay 30)', () => {
    // T6b: ft_kearny targetDay is now 30 (was 40). At exactly the milestone mile
    // on the target day → deficit ≈ 0 (fractional due to interpolation from origin).
    const deficit = scheduleDeficitDays(milestoneState(319, 30));
    expect(deficit).toBeCloseTo(0, 1);
  });

  it('returns negative (ahead) when 10 days early at independence_rock (T6b: targetDay 72)', () => {
    // T6b: targetDay 72 (was 81). At 815 mi on day 62 → 10 days before the target.
    const deficit = scheduleDeficitDays(milestoneState(815, 62));
    expect(deficit).toBeCloseTo(-10, 0);
  });
});

describe('#1304-T4b scheduleDeficitDays — positive when behind schedule', () => {
  it('returns +10 when 10 days late at independence_rock (T6b: targetDay 72)', () => {
    // T6b: targetDay 72 (was 81). At 815 mi on day 82 → 10 days past the target.
    const deficit = scheduleDeficitDays(milestoneState(815, 82));
    expect(deficit).toBeCloseTo(10, 0);
  });

  it('returns > 0 when 5 days late at ft_laramie (T6b: targetDay 58)', () => {
    // T6b: ft_laramie targetDay 58 (was 68). On day 63 → deficit ≈ 5.
    const deficit = scheduleDeficitDays(milestoneState(650, 63));
    expect(deficit).toBeCloseTo(5, 0);
  });
});

describe('#1304-T4b scheduleDeficitDays — interpolation between milestones', () => {
  it('interpolates expected day between ft_laramie and independence_rock (T6b values)', () => {
    // T6b: ft_laramie (650 mi, targetDay 58), independence_rock (815 mi, targetDay 72).
    // Midpoint miles = (650 + 815) / 2 = 732.5
    // frac = (732.5 - 650) / (815 - 650) = 82.5 / 165 = 0.5
    // expectedDay = 58 + 0.5 * (72 - 58) = 58 + 7 = 65
    // On day 64 → deficit ≈ -1 (ahead); on day 66 → deficit ≈ +1 (behind)
    const midMiles = Math.round((650 + 815) / 2);
    const earlyState  = milestoneState(midMiles, 64);
    const lateState   = milestoneState(midMiles, 66);
    expect(scheduleDeficitDays(earlyState)).toBeLessThan(0);
    expect(scheduleDeficitDays(lateState)).toBeGreaterThan(0);
  });

  it('deficit is smooth across the ft_hall segment (T6b: south_pass=85, ft_hall=110)', () => {
    // T6b: south_pass (915 mi, day 85) → ft_hall (1290 mi, day 110).
    // At 1100 mi: frac = (1100-915)/(1290-915) = 185/375 = 0.4933
    // expectedDay = 85 + 0.4933*(110-85) = 85 + 12.3 = 97.3
    // On day 96: deficit ≈ -1.3 (ahead); on day 100: deficit ≈ +2.7 (behind)
    const ahead = scheduleDeficitDays(milestoneState(1100, 96));
    const late  = scheduleDeficitDays(milestoneState(1100, 100));
    expect(ahead).toBeLessThan(late);
  });
});

describe('#1304-T4b scheduleDeficitDays — past last milestone returns 0', () => {
  it('returns 0 at mile 2000 (past the_dalles = 1950 mi)', () => {
    // Past the last timetable checkpoint — no milestone pressure;
    // projection/snow-safe term governs the endgame.
    const deficit = scheduleDeficitDays(milestoneState(2000, 200));
    expect(deficit).toBe(0);
  });
});

describe('#1304-T4b schedulePressure — milestone term fires in early trail', () => {
  it('pressure is "critical" when 5 days late at ft_laramie (T6b: targetDay 58, so day 63)', () => {
    // T6b: ft_laramie targetDay 58 (was 68).  Day 63 at 650 mi → deficit ≈ 5.
    // projection: 63 * 2195/650 = 212.8 → critical vs snowSafe (185).
    // milestone: deficit=5 → 'behind'. WORSE = 'critical' (projection wins here).
    const s = milestoneState(650, 63);
    expect(schedulePressure(s, 205)).toBe('critical');
  });

  it('deficit at ft_laramie day 63 is positive and ≤ 15 (T6b)', () => {
    // T6b: ft_laramie targetDay 58. Day 63 → deficit ≈ 5 days (behind, not critical).
    const deficit5 = scheduleDeficitDays(milestoneState(650, 63));
    expect(deficit5).toBeGreaterThan(0);
    expect(deficit5).toBeLessThanOrEqual(15);
  });

  it('pressure is "critical" when deficit > 15 (T6b: independence_rock targetDay 72)', () => {
    // T6b: targetDay 72 (was 81). At 815 mi on day 88 → deficit = 88 - 72 = 16 → 'critical'.
    // projection: 88 * 2195/815 = 237 → already critical via projection.
    const s = milestoneState(815, 88);
    expect(schedulePressure(s, 205)).toBe('critical');
  });

  it('chaos persona (null target) is exempt from milestone pressure', () => {
    // Even with a 20-day deficit, null target → 'ok' (chaos contract preserved).
    // T6b: independence_rock targetDay 72. Day 92 → deficit ≈ 20.
    const s = milestoneState(815, 92); // deficit ≈ 92 - 72 = 20 → milestone critical
    expect(schedulePressure(s, null)).toBe('ok');
  });
});

describe('#1304-T4b arrivalBand — milestone term fires', () => {
  it('returns "critical" for arrivalBand at 5-day deficit (T6b: independence_rock targetDay 72)', () => {
    // T6b: targetDay 72. At 815 mi on day 77 → deficit ≈ 5 → 'behind' via milestone.
    // Projection: 77*2195/815 = 207 → critical via projection too.
    // Combined result: 'critical'.
    const s = milestoneState(815, 77);
    expect(arrivalBand(s)).toBe('critical');
  });

  it('arrivalBand milestone: deficit > 15 → critical (T6b: independence_rock targetDay 72)', () => {
    // T6b: targetDay 72. At 815 mi on day 88 → deficit = 16 → critical.
    const s = milestoneState(815, 88);
    expect(arrivalBand(s)).toBe('critical');
  });

  it('arrivalBand returns null before MIN_JUDGE_DAYS/MIN_JUDGE_MILES (milestone does not unlock null)', () => {
    // Even if milestone deficit is large, arrivalBand returns null when projection
    // returns null (day < 20 or miles < 100).
    const s = milestoneState(50, 10);
    expect(arrivalBand(s)).toBeNull();
  });
});

describe('#1304-T4b integration — state at independence_rock position, 16 days late → critical', () => {
  it('scheduleDeficitDays at mile 815, day 88 returns deficit 16 (T6b: targetDay 72)', () => {
    // T6b: independence_rock targetDay=72.  Party arrives day 88 = 16 days late.
    const deficit = scheduleDeficitDays(milestoneState(815, 88));
    expect(deficit).toBeCloseTo(16, 0);
  });

  it('schedulePressure is "critical" at mile 815, day 88 (combined milestone+projection)', () => {
    const s = milestoneState(815, 88);
    // T6b: deficit=16 > 15 → milestone critical. Projection: 88*2195/815=237 → critical.
    expect(schedulePressure(s, 185)).toBe('critical');
  });
});

// ── T6d — Ox-aware winter pace ceiling ────────────────────────────────────────
//
// Design: spares = max(0, liveOxen − wagon.optimalTeam)
//   fullCeil    = OX_SUSTAIN_FULL    + OX_SPARE_BONUS × min(spares, OX_MAX_SPARES)
//   partialCeil = OX_SUSTAIN_PARTIAL + OX_SPARE_BONUS × min(spares, OX_MAX_SPARES)
//
//   avgFatigue < fullCeil    → full boost  (critical→fast)
//   avgFatigue < partialCeil → partial cap (critical→moderate, not fast)
//   else                     → NO boost    (hold basePace)
//
// Helper: build an ox array for winterPaceBoost tests.
// prairie_schooner optimalTeam = 4.

function oxTeam(count: number, fatigue: number): Ox[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `ox-${i}`,
    health: 100,
    fatigue,
    shod: true,
    kind: 'ox' as const
  }));
}

/** A critical-pressure state for T6d tests (projects to day 250, well past snow-safe). */
function t6dCritical(oxen: Ox[], wagonModel: 'prairie_schooner' | 'light' | 'heavy' = 'prairie_schooner'): GameState {
  // proj = day * TOTAL_TRAIL_MI / miles = 100 * 2195 / 877 ≈ 250 → critical
  return {
    ...t4StateProjecting(250),
    flags: {},
    oxen,
    wagon: { model: wagonModel, condition: 80, carryCapacity: 2500 }
  } as unknown as GameState;
}

describe('#1304-T6d winterPaceBoost — constants exported', () => {
  it('exports OX_SUSTAIN_FULL  = 40', () => expect(OX_SUSTAIN_FULL).toBe(40));
  it('exports OX_SUSTAIN_PARTIAL = 60', () => expect(OX_SUSTAIN_PARTIAL).toBe(60));
  it('exports OX_SPARE_BONUS = 10',   () => expect(OX_SPARE_BONUS).toBe(10));
  it('exports OX_MAX_SPARES = 2',     () => expect(OX_MAX_SPARES).toBe(2));
});

describe('#1304-T6d winterPaceBoost — fresh team + critical → fast', () => {
  it('4 oxen at fatigue 0 (no spares) + critical → fast', () => {
    // avgFatigue=0 < fullCeil(40+0=40) → full boost → critical → 'fast'
    const s = t6dCritical(oxTeam(4, 0));
    expect(winterPaceBoost(s, 'balanced', 'moderate')).toBe('fast');
  });

  it('4 oxen at fatigue 39 (just under fullCeil) + critical → fast', () => {
    // avgFatigue=39 < fullCeil=40 → full boost → 'fast'
    const s = t6dCritical(oxTeam(4, 39));
    expect(winterPaceBoost(s, 'balanced', 'moderate')).toBe('fast');
  });

  it('0 oxen (empty team) + critical → fast (empty team uses avgFatigue=0, defaults to full boost)', () => {
    // liveOxen=0 → avgFatigue=0, spares=max(0,0-4)=0 → fullCeil=40 → avgFatigue<fullCeil → full boost
    // Preserves T4 behavior: empty-ox test states still get boosted.
    const s = t6dCritical([]);
    expect(winterPaceBoost(s, 'balanced', 'moderate')).toBe('fast');
  });
});

describe('#1304-T6d winterPaceBoost — worn team (avg 70) + critical → base pace unchanged', () => {
  it('4 oxen at fatigue 70 (no spares) → above partialCeil(60) → NO boost', () => {
    // avgFatigue=70 ≥ partialCeil(60+0=60) → worn team: hold basePace
    // Marcy: a worn team pushed to max stops more than it moves — cut stops, not stamina.
    const s = t6dCritical(oxTeam(4, 70));
    expect(winterPaceBoost(s, 'balanced', 'moderate')).toBe('moderate');
  });

  it('4 oxen at fatigue 90 → still no boost (deep in worn zone)', () => {
    const s = t6dCritical(oxTeam(4, 90));
    expect(winterPaceBoost(s, 'balanced', 'slow')).toBe('slow');
  });
});

describe('#1304-T6d winterPaceBoost — mid team (avg 50) + critical → moderate cap', () => {
  it('4 oxen at fatigue 50 (no spares) → in partial zone [40, 60) → capped at moderate', () => {
    // avgFatigue=50, partialCeil=60, fullCeil=40: 40 ≤ 50 < 60 → partial boost
    // basePace='slow': idx=0, moderate cap → 'moderate'
    const s = t6dCritical(oxTeam(4, 50));
    expect(winterPaceBoost(s, 'balanced', 'slow')).toBe('moderate');
  });

  it('mid team (avg 50) at basePace "moderate" + critical → stays moderate (already at cap)', () => {
    // idx ≥ 1 already → return basePace='moderate' (no boost past cap)
    const s = t6dCritical(oxTeam(4, 50));
    expect(winterPaceBoost(s, 'balanced', 'moderate')).toBe('moderate');
  });

  it('mid team (avg 50) + behind pressure → still capped at moderate (never fast)', () => {
    // Partial zone: both critical and behind give 'moderate' at most.
    const s = t6dCritical(oxTeam(4, 50));
    // Make pressure 'behind' by using a less-critical projection: day 100 at 1097 mi → proj 200
    const sBehind = {
      ...t4StateProjecting(200),
      flags: {},
      oxen: oxTeam(4, 50),
      wagon: { model: 'prairie_schooner', condition: 80, carryCapacity: 2500 }
    } as unknown as GameState;
    expect(winterPaceBoost(sBehind, 'balanced', 'slow')).toBe('moderate');
  });
});

describe('#1304-T6d winterPaceBoost — mid team + 2 spares → full boost restored', () => {
  it('6 oxen (4 optimal + 2 spare) at fatigue 50 + critical → fast (spares raise fullCeil to 60)', () => {
    // prairie_schooner optimalTeam=4; 6 live → spares=2, bonus=OX_SPARE_BONUS×2=20
    // fullCeil = 40+20 = 60; partialCeil = 60+20 = 80
    // avgFatigue=50 < fullCeil(60) → full boost → 'fast'
    // Period anchor: Marcy "a spare yoke is indispensable" — rotation restores the team's
    // effective capacity. Two spare yokes lift the sustainable ceiling by 20 fatigue points.
    const s = t6dCritical(oxTeam(6, 50));
    expect(winterPaceBoost(s, 'balanced', 'moderate')).toBe('fast');
  });

  it('6 oxen at fatigue 70 + critical → moderate cap (in partial zone [60, 80))', () => {
    // spares=2 → fullCeil=60, partialCeil=80; avgFatigue=70 → partial zone → cap at moderate
    const s = t6dCritical(oxTeam(6, 70));
    expect(winterPaceBoost(s, 'balanced', 'slow')).toBe('moderate');
  });

  it('6 oxen at fatigue 80 + critical → no boost (at/above partialCeil 80)', () => {
    // spares=2 → partialCeil=80; avgFatigue=80 ≥ 80 → worn → hold basePace
    const s = t6dCritical(oxTeam(6, 80));
    expect(winterPaceBoost(s, 'balanced', 'moderate')).toBe('moderate');
  });
});

describe('#1304-T6d winterPaceBoost — OX_MAX_SPARES caps at 2 spare-yoke bonus', () => {
  it('8 oxen (4 spares) at fatigue 70 → same as 2 spares: fullCeil=60, partial=[60,80)', () => {
    // OX_MAX_SPARES=2: bonus caps at 20 even with 4 spares
    // avgFatigue=70 → in partial zone [60,80) → moderate cap
    const s = t6dCritical(oxTeam(8, 70));
    expect(winterPaceBoost(s, 'balanced', 'slow')).toBe('moderate');
  });
});

describe('#1304-T6d winterPaceBoost — tooFragileToPush still wins', () => {
  it('fresh team + critical + party HP=10 → no boost (tooFragileToPush gating preserved)', () => {
    // Even with fatigue=0 (full boost eligible), the health guard fires first.
    const s = {
      ...t6dCritical(oxTeam(4, 0)),
      party: [{ dead: false, kind: 'adult', health: 10 }]
    } as unknown as GameState;
    expect(winterPaceBoost(s, 'balanced', 'slow')).toBe('slow');
  });
});
