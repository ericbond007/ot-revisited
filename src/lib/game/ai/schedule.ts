import type { GameState } from '../types';
import type { PersonaId } from './types';
import { LANDMARKS } from '../content/landmarks';
import { getWagon } from '../content/wagons';

/** Full Oregon Trail length in miles. Single source of truth; personas.ts
 *  imports this. */
export const TOTAL_TRAIL_MI = 2195;

const MIN_JUDGE_DAYS = 20;
const MIN_JUDGE_MILES = 100;
const CRITICAL_MARGIN = 15;

// ── Emigrant milestone timetable ───────────────────────────────────────────

/**
 * #1304-T4b / T6b — Period emigrant timetable (Apr 15 jump-off): the schedule
 * successful trains actually kept, not the last-safe / reassurance floor.
 *
 * Palmer (1845–46, lines 6079–6083) preached banking time early: leave by
 * mid-April, because companies starting as late as May 10 "seldom arrive in
 * Oregon until after the rainy season commences in the Cascade range."  The
 * famous Jul-4-at-Independence-Rock was the LAST-SAFE checkpoint — a celebrated
 * floor ("you're okay if you're here by now"), not the on-pace target a healthy
 * fast train aimed for.  We set targets ahead of the last-safe dates so that
 * pressure fires while choices still matter and a fast (15 mi/day) wagon must
 * still maintain discipline.
 *
 * These are the targets successful trains kept (mid-April out, Fort Hall ~day
 * 110, Blues by mid/late September, Willamette before the Cascade autumn rains).
 * Game wagons doing ~15 mi/day healthy reach each milestone on schedule; the
 * tighter numbers make pace discipline meaningful rather than trivially easy.
 *
 * Cumulative miles verified against the landmark catalog.
 * Day ladder (15 mi/day on-pace check):
 *   ft_kearny   319 mi  day 30  → 10.6 mi/day avg (slow grass weeks early on)
 *   ft_laramie  650 mi  day 58  → 11.2 mi/day (after the 200-mi Platte)
 *   indep_rock  815 mi  day 72  → 11.3 mi/day (Jul 4 was the FLOOR; on-pace is earlier)
 *   south_pass  915 mi  day 85  → 10.8 mi/day (high-altitude slog)
 *   ft_hall    1290 mi  day 110 → 11.7 mi/day
 *   salmon_fls 1380 mi  day 122 → 11.3 mi/day (Snake desert drain)
 *   ft_boise   1570 mi  day 135 → 11.6 mi/day
 *   grande_ronde 1745 mi day 152 → 11.5 mi/day  (mid-Sept — through Blues before rains)
 *   the_dalles 1950 mi  day 168 → 11.6 mi/day
 *
 * All landmark IDs verified to exist in LANDMARKS catalog.
 */
export const TRAIL_MILESTONES: ReadonlyArray<{ landmarkId: string; targetDay: number }> = [
  { landmarkId: 'ft_kearny',          targetDay: 30  },  // ~May 15 — push early, grass is good
  { landmarkId: 'ft_laramie',         targetDay: 58  },  // ~Jun 11 — ahead of the last-safe Jun 21
  { landmarkId: 'independence_rock',  targetDay: 72  },  // ~Jun 25 — Jul 4 was the floor, not the goal
  { landmarkId: 'south_pass',         targetDay: 85  },  // ~Jul 9 — through the divide early
  { landmarkId: 'ft_hall',            targetDay: 110 },  // ~Aug 3 — on-pace, not last-safe (day 125)
  { landmarkId: 'salmon_falls',       targetDay: 122 },  // ~Aug 15
  { landmarkId: 'ft_boise',           targetDay: 135 },  // ~Aug 28
  { landmarkId: 'grande_ronde',       targetDay: 152 },  // ~Sep 14 — Blues before the autumn rains
  { landmarkId: 'the_dalles',         targetDay: 168 },  // ~Sep 30 — Willamette before Cascade rains
];

/**
 * Lazily-computed cumulative miles for each milestone landmark, derived
 * directly from the LANDMARKS catalog. Deferred so we don't compute at
 * module-load time (no cost if unused in tests).
 */
let _milestoneMiles: Array<{ targetDay: number; cumMiles: number }> | null = null;

function milestoneMilesTable(): Array<{ targetDay: number; cumMiles: number }> {
  if (_milestoneMiles) return _milestoneMiles;

  // Build a landmarkId→cumMiles lookup from the catalog
  const cumById = new Map<string, number>();
  let running = 0;
  for (const l of LANDMARKS) {
    running += l.milesFromPrevious;
    cumById.set(l.id, running);
  }

  _milestoneMiles = TRAIL_MILESTONES.map(({ landmarkId, targetDay }) => {
    const cumMiles = cumById.get(landmarkId) ?? 0;
    return { targetDay, cumMiles };
  });
  return _milestoneMiles;
}

/**
 * #1304-T4b — Days behind the period emigrant timetable at the current
 * trail position. Interpolates between the two bracketing milestones by
 * cumulative miles to give a smooth expected-day estimate.
 *
 * Negative return = ahead of schedule; 0 = exactly on schedule;
 * positive = days behind.
 *
 * Edge cases:
 *   - Before the first milestone: linearly extrapolated from origin (0 mi,
 *     day 0) to the first milestone.
 *   - Past the last milestone (the_dalles): no timetable pressure — returns 0
 *     (the party is near the end; the projection / estimate term governs).
 *   - miles ≤ 0: returns 0.
 */
export function scheduleDeficitDays(state: GameState): number {
  const miles = state.location?.milesTraveled ?? 0;
  const day   = state.day ?? 0;
  // Mirror the projection guard: before we have enough travel history the
  // timetable comparison is noise. Return 0 (no pressure) rather than
  // penalizing parties that haven't been moving long enough to judge.
  if (day < MIN_JUDGE_DAYS || miles < MIN_JUDGE_MILES) return 0;
  if (miles <= 0) return 0;

  const table = milestoneMilesTable();

  // Sentinel origin: start (mile 0, day 0)
  let prev = { targetDay: 0, cumMiles: 0 };
  let next: { targetDay: number; cumMiles: number } | null = null;

  for (const m of table) {
    if (miles <= m.cumMiles) {
      next = m;
      break;
    }
    prev = m;
  }

  if (next === null) {
    // Past the last timetable milestone — no deficit pressure, party is near
    // the end. The projection / snow-safe term still governs the endgame.
    return 0;
  }

  const segMiles = next.cumMiles - prev.cumMiles;
  const frac     = segMiles > 0 ? (miles - prev.cumMiles) / segMiles : 0;
  const expectedDay = prev.targetDay + frac * (next.targetDay - prev.targetDay);
  return day - expectedDay;
}

export type SchedulePressure = 'ok' | 'behind' | 'critical';

export interface ScheduleDoctrine {
  targetArrivalDay: number | null;
  sabbathSacred: boolean;
}

// ── Snow-safe day estimator ────────────────────────────────────────────────

/**
 * #1304-T4 — Day-of-journey baseline: historical prior for the last safe
 * day to cross the high passes. Day 185 from an April 15 start ≈ Oct 16.
 * This is the neutral prior when no signals have been observed.
 */
export const SNOW_SAFE_BASELINE_DAY = 185;

/**
 * #1304-T4 — The "expected" first-snow-news day in a normal year (Oct 5 ≈
 * day 173 from April 15). When news arrives EARLIER than this, the agent
 * adjusts its estimate down proportionally.
 */
export const SNOW_NEWS_PRIOR_DAY = 173;

/**
 * #1304-T4 — Clamp bounds for the estimator. An extreme early-year signal
 * can never push the estimate below day 165 (~Oct 1 departure deadline);
 * a very quiet year can still be trusted up to day 200 (~Nov 1).
 */
export const SNOW_SAFE_ESTIMATE_MIN = 165;
export const SNOW_SAFE_ESTIMATE_MAX = 200;

/**
 * #1304-T4 — Family tightening margin: family wagons tighten the
 * snow-safe estimate by this many days. Children in the snow drove real
 * captains to push harder — this is the #1235 inversion (old: exempt from
 * pressure; new: tighter deadline because the stakes are higher).
 * Period: emigrant diaries show family captains who had children pushed
 * harder through the fall mountains precisely because they feared the snow
 * more, not less (Faragher 1979).
 */
export const FAMILY_MARGIN_DAYS = 10;

/**
 * #1304-T4 — Pure function: agent's best estimate of the last safe travel
 * day before the mountain passes close. Reads ONLY observable signals from
 * state (flags set by T3 news system). Never reads `_winterSeverity`.
 *
 * Algorithm:
 *   1. Start from SNOW_SAFE_BASELINE_DAY (day 185, historical prior).
 *   2. If `_firstSnowNewsDay` is set: earlier news → earlier estimated wall.
 *      Adjustment = SNOW_NEWS_PRIOR_DAY − firstSnowNewsDay (positive when
 *      news came earlier than the normal year's first-report day).
 *      e.g. news on day 160 → 173−160 = +13 → estimate drops to 185−13=172.
 *      e.g. news on day 180 → 173−180 = −7 → adjustment clamped at 0
 *           (late news means "at least normal"; baseline holds).
 *   3. Family wagons: tighten by FAMILY_MARGIN_DAYS.
 *   4. Clamp to [SNOW_SAFE_ESTIMATE_MIN, SNOW_SAFE_ESTIMATE_MAX].
 *
 * Design choice — news-only (no frost-day count): T3 sets `_firstSnowNewsDay`
 * as the primary signal. Frost/early-snow weather days ARE felt weather (T3
 * §3 "Felt weather") but T1-T3 do not currently store a cumulative frost-day
 * counter in flags. Adding weather history state was explicitly ruled out
 * (spec §4: "only if a flag/history already exists"). This estimator is
 * therefore news-only for T4; frost-day weighting can be added in T6 if
 * the gate sweep shows it's needed for signal legibility.
 *
 * @param state Observable game state (no hidden fields accessed).
 * @returns Estimated last safe day (journey-day units from April 15 start),
 *          or SNOW_SAFE_BASELINE_DAY when no signals have fired yet.
 */
export function estimateSnowSafeDay(state: GameState): number {
  let estimate = SNOW_SAFE_BASELINE_DAY;

  const firstNewsDay = (state.flags ?? {})._firstSnowNewsDay as number | undefined;
  if (firstNewsDay !== undefined) {
    // Earlier news → more aggressive estimate. Later news → no adjustment
    // (clamp at 0 so a quiet year doesn't push the estimate above baseline).
    const newsAdjust = Math.max(0, SNOW_NEWS_PRIOR_DAY - firstNewsDay);
    estimate -= newsAdjust;
  }

  // Family tightening: children in the snow is the nightmare — raise the bar.
  const hasChild = (state.party ?? []).some((m) => !m.dead && m.kind === 'child');
  if (hasChild) {
    estimate -= FAMILY_MARGIN_DAYS;
  }

  return Math.max(SNOW_SAFE_ESTIMATE_MIN, Math.min(SNOW_SAFE_ESTIMATE_MAX, estimate));
}

export function projectedArrivalDay(state: GameState): number | null {
  const day = state.day ?? 0;
  const miles = state.location?.milesTraveled ?? 0;
  if (day < MIN_JUDGE_DAYS || miles < MIN_JUDGE_MILES) return null;
  return day * (TOTAL_TRAIL_MI / miles);
}

/**
 * #1304-T5 — Player-facing schedule band: how the player's projected
 * arrival compares to the shared snow-safe day estimate, AND the period
 * emigrant timetable.
 *
 * This mirrors the bands used by schedulePressure() but is driven
 * directly by estimateSnowSafeDay (no persona doctrine target) because
 * the player is not a persona — the mountain deadline is the only clock
 * they need to see.
 *
 * Two terms, take the worse:
 *   (a) Projection term — proj vs snowSafe estimate:
 *       ok       — proj <= snowSafe
 *       behind   — proj <= snowSafe + CRITICAL_MARGIN (15 days)
 *       critical — beyond that
 *   (b) Milestone term — deficit vs period timetable:
 *       ok       — deficit <= 0
 *       behind   — deficit 1..15
 *       critical — deficit > 15
 *
 * Returns null when projectedArrivalDay() returns null (early game,
 * not enough data to judge pace). The chip hides when null.
 *
 * #1304-T4b — Milestone term added so the player chip turns amber at
 * Fort Laramie when late, exactly like the bots.
 */
export function arrivalBand(state: GameState): SchedulePressure | null {
  const proj = projectedArrivalDay(state);
  if (proj === null) return null;

  const snowSafe = estimateSnowSafeDay(state);
  const projectionPressure: SchedulePressure =
    proj <= snowSafe                  ? 'ok'      :
    proj <= snowSafe + CRITICAL_MARGIN ? 'behind'  :
                                        'critical';

  const deficit = scheduleDeficitDays(state);
  const milestonePressure: SchedulePressure =
    deficit > CRITICAL_MARGIN ? 'critical' :
    deficit > 0               ? 'behind'   :
                                'ok';

  const ORDER: Record<SchedulePressure, number> = { ok: 0, behind: 1, critical: 2 };
  return ORDER[milestonePressure] >= ORDER[projectionPressure]
    ? milestonePressure
    : projectionPressure;
}

export function schedulePressure(
  state: GameState,
  targetArrivalDay: number | null
): SchedulePressure {
  // #1304-T4 — chaos exemption preserved: a null target means "ignore the
  // clock entirely." This is the fuzzer's contract; seasonal pressure does
  // not override it. Even with estimateSnowSafeDay available, chaos stays
  // pressure-free so it continues to exercise unconstrained decision sequences.
  if (targetArrivalDay === null) return 'ok';

  // #1304-T4b — Milestone term: compare current position against the
  // period emigrant timetable. This is the early-trail pressure signal
  // that the projection term misses — a party dawdling in June projects
  // fine (fresh oxen, 15+ mi/day), but they're already blowing the
  // Independence Rock deadline. The milestone term catches that.
  //
  // deficit > 0  → at least 'behind'
  // deficit > 15 → 'critical'
  const deficit = scheduleDeficitDays(state);
  const milestonePressure: SchedulePressure =
    deficit > CRITICAL_MARGIN ? 'critical' :
    deficit > 0               ? 'behind'   :
                                'ok';

  const proj = projectedArrivalDay(state);
  if (proj === null) return milestonePressure;

  // #1304-T4 — Seasonal pressure: measure against the tighter of the
  // persona's target and the shared snow-safe day estimate. Agents who
  // have no strong personal target (target 200+) still feel pressure from
  // the mountain deadline. Agents already fast enough to beat both feel none.
  const snowSafe = estimateSnowSafeDay(state);
  const effectiveTarget = Math.min(targetArrivalDay, snowSafe);

  const projectionPressure: SchedulePressure =
    proj <= effectiveTarget                  ? 'ok'      :
    proj <= effectiveTarget + CRITICAL_MARGIN ? 'behind'  :
                                               'critical';

  // Take the worse of the two terms: milestone bites in June, projection
  // governs the endgame.
  const ORDER: Record<SchedulePressure, number> = { ok: 0, behind: 1, critical: 2 };
  return ORDER[milestonePressure] >= ORDER[projectionPressure]
    ? milestonePressure
    : projectionPressure;
}

export const personaScheduleDoctrine: Record<PersonaId, ScheduleDoctrine> = {
  pace_pusher:   { targetArrivalDay: 165, sabbathSacred: false },
  aggressive:    { targetArrivalDay: 175, sabbathSacred: false },
  balanced:      { targetArrivalDay: 185, sabbathSacred: false },
  generous:      { targetArrivalDay: 190, sabbathSacred: false },
  cautious:      { targetArrivalDay: 190, sabbathSacred: false },
  sunday_rester: { targetArrivalDay: 195, sabbathSacred: true },
  faithful:      { targetArrivalDay: 195, sabbathSacred: true },
  hoarder:       { targetArrivalDay: 205, sabbathSacred: false },
  drinker:       { targetArrivalDay: 205, sabbathSacred: false },
  chaos:         { targetArrivalDay: null, sabbathSacred: false }
};

export function doctrineFor(id: PersonaId): ScheduleDoctrine {
  return personaScheduleDoctrine[id] ?? personaScheduleDoctrine.balanced;
}

/** Keg ratio at/under which find-water is a survival need, never suppressed. */
const CRITICAL_WATER_RATIO = 0.35;
/** Food (lbs) at/under which hunting is a survival need, never suppressed. */
const STARVATION_FLOOR = 45;
/** Below this (but above the death-spiral crisis floor), a party is too
 *  fragile to push: schedule pressure must NOT cut its recovery rest/forage.
 *  Keyed on HP only — morale is comfort, not survival, so a demoralised but
 *  HEALTHY party that's behind should push on grumpy, not rest into the clock
 *  (#1235b — morale clause dropped; it was disabling the gate for the whole
 *  morale-sagging late-trail majority). Worn oxen are handled by crisis rest. */
const MIN_PUSH_HP = 60;

function minAliveHealth(state: GameState): number {
  const alive = (state.party ?? []).filter((m) => !m.dead);
  if (alive.length === 0) return 100;
  return Math.min(...alive.map((m) => m.health));
}

/** True when the party is too worn (low HP or morale) to be pushed past its
 *  recovery rest — schedule pressure stands down so it can recoup.
 *
 *  #1304-T4 — #1235 family exemption INVERTED. Family wagons (child present)
 *  previously returned true here (exempt from schedule push). That rationale
 *  was logistical (more mouths = slower), but the historical and gameplay
 *  reality is the OPPOSITE: captains with children in their wagons pushed
 *  HARDER through the fall mountains because they feared the snow more, not
 *  less. The mechanics consequence: `estimateSnowSafeDay` already tightens
 *  the snow-safe estimate by FAMILY_MARGIN_DAYS when a child is present, so
 *  schedule pressure naturally fires sooner and harder for family wagons.
 *  `tooFragileToPush` no longer exempts them — they are subject to pressure
 *  like any other wagon, just with a tighter deadline.
 *
 *  The old logistics rationale (more mouths thin provisions) is superseded:
 *  the tight deadline already captures the urgency, and the health floor below
 *  still protects a genuinely fragile party from being pushed into the ground.
 */
export function tooFragileToPush(state: GameState): boolean {
  return minAliveHealth(state) < MIN_PUSH_HP;
}

// ── T6d — Ox-aware winter pace ceiling ────────────────────────────────────
//
// Historical basis:
//   Marcy (1859, Prairie Traveler): "a spare yoke is indispensable on a
//   long journey" — rotating the team lets the worn pairs recover while the
//   fresh pair pulls. Without spares, pushing to max pace stops more than
//   it moves (the Three Island→Boise ox-cycle: fast→fatigue spikes→forced
//   rest→repeat, 28 days at 5.4 effective mi/day vs sustainable moderate).
//
// Design: the pressure still suppresses Sabbath/discretionary camps via the
// existing gates (allowsSabbathRest, suppressCamp). Those are where the time
// comes from. What we cut now is forced RESTS caused by overspent teams, not
// the pressure itself.
//
// Thresholds are in avg-fatigue space (0-100). Spare yokes rotate the load —
// each spare above optimalTeam raises the ceiling by OX_SPARE_BONUS, capped
// at OX_MAX_SPARES (two extra yokes cover the realistic emigrant load-rotation
// margin; hauling more than that was rare outside professional freight outfits).

/** Below this avg fatigue (before spare bonus), the team can sustain a full
 *  boost: critical → fast, behind → one rung up. */
export const OX_SUSTAIN_FULL = 40;
/** Below this avg fatigue (before spare bonus), boost is capped at 'moderate':
 *  critical and behind both pin at moderate, never fast. Above → NO boost. */
export const OX_SUSTAIN_PARTIAL = 60;
/** Fatigue headroom each spare ox above optimalTeam adds to the ceilings. */
export const OX_SPARE_BONUS = 10;
/** Maximum spare count that raises the thresholds (two extra yokes). */
export const OX_MAX_SPARES = 2;

/**
 * #1304-T4 / T6d — Ox-aware pace upgrade helper. Given a persona's naturally
 * chosen base pace, apply winter pressure subject to how worn the team is and
 * how many spare oxen are available to rotate.
 *
 * Pressure gates (existing):
 *   ok       → no boost (return basePace)
 *   tooFragile → no boost (health floor wins; spec §4)
 *
 * Ox ceiling (T6d, new):
 *   spares  = max(0, liveOxen − wagon.optimalTeam)   [floor 0]
 *   bonus   = OX_SPARE_BONUS × min(spares, OX_MAX_SPARES)
 *   fullCeil    = OX_SUSTAIN_FULL    + bonus  (default 40; 2 spares → 60)
 *   partialCeil = OX_SUSTAIN_PARTIAL + bonus  (default 60; 2 spares → 80)
 *
 *   avgFatigue < fullCeil    → full boost  (critical→fast; behind→+1 rung)
 *   avgFatigue < partialCeil → partial cap (both critical and behind → 'moderate', never fast)
 *   else                     → NO boost    (hold basePace — worn team pushed to max stops more than it moves)
 *
 * Sacred (faithful/sunday_rester) and secular personas both call this.
 * Chaos is NOT wired here — chaos.pickPace uses pure RNG (fuzzer contract).
 * Pace union (ascending): 'slow' | 'moderate' | 'fast' | 'grueling'.
 */
export function winterPaceBoost(
  state: GameState,
  personaId: PersonaId,
  basePace: NonNullable<GameState['pace']>
): NonNullable<GameState['pace']> {
  const doctrine = doctrineFor(personaId);
  const pressure = schedulePressure(state, doctrine.targetArrivalDay);
  if (pressure === 'ok') return basePace;

  // Health/oxen emergency guard: if tooFragileToPush, the persona already chose
  // a reduced base pace because of a crisis. Don't override that with a boost —
  // pushing a dying/worn party harder defeats the health-floor protection.
  // This implements "never override the slow-when-sick/oxen-worn branches" (spec §4).
  if (tooFragileToPush(state)) return basePace;

  // ── T6d: ox-aware ceiling ────────────────────────────────────────────────
  // Compute team state: live-ox count, avg fatigue, spare headroom.
  const liveOxen = (state.oxen ?? []).filter((o) => o.health > 0 && o.kind !== 'mule').length;
  const avgFatigue = liveOxen > 0
    ? (state.oxen ?? [])
        .filter((o) => o.health > 0 && o.kind !== 'mule')
        .reduce((s, o) => s + o.fatigue, 0) / liveOxen
    : 0;
  const wagon = getWagon(state.wagon?.model ?? 'prairie_schooner');
  const spares = Math.max(0, liveOxen - wagon.optimalTeam);
  const bonus = OX_SPARE_BONUS * Math.min(spares, OX_MAX_SPARES);
  const fullCeil    = OX_SUSTAIN_FULL    + bonus;
  const partialCeil = OX_SUSTAIN_PARTIAL + bonus;

  const PACES: NonNullable<GameState['pace']>[] = ['slow', 'moderate', 'fast', 'grueling'];
  const idx = PACES.indexOf(basePace);

  if (avgFatigue < fullCeil) {
    // Fresh-enough team: full boost semantics.
    // critical → fast; behind → +1 rung capped at fast.
    if (pressure === 'critical') {
      return idx >= 2 ? basePace : 'fast';
    }
    const upgraded = PACES[Math.min(idx + 1, PACES.length - 1)];
    return upgraded === 'grueling' ? 'fast' : upgraded;
  }

  if (avgFatigue < partialCeil) {
    // Moderately worn team: cap boost at 'moderate'. Spare yokes aren't enough
    // to absorb a hard push — hold to a sustainable rhythm.
    // Marcy: steady pace preserves the team; a worn team pushed to max stops
    // more than it moves (Reed Donner lesson). Cut STOPS not stamina.
    return idx >= 1 ? basePace : 'moderate';   // only boost if below moderate
  }

  // Worn team: no boost — holding basePace. The pressure still suppresses
  // Sabbath and discretionary camps (allowsSabbathRest / suppressCamp),
  // which is where the time savings come from. Pushing the team further
  // would trigger oxenWornOut → forced rest → net negative.
  return basePace;
}

export type DiscretionaryCamp = 'hunt' | 'pan' | 'findWater';

/** True = schedule pressure should veto this discretionary camp action now.
 *  Critical floors (near-empty keg, near-starvation) always return false. */
export function suppressCamp(
  state: GameState,
  personaId: PersonaId,
  kind: DiscretionaryCamp,
  opts: { waterRatio?: number; foodOnHand?: number } = {}
): boolean {
  const doctrine = doctrineFor(personaId);
  const pressure = schedulePressure(state, doctrine.targetArrivalDay);
  if (pressure === 'ok') return false;
  if (tooFragileToPush(state)) return false;
  switch (kind) {
    case 'hunt':
      return (opts.foodOnHand ?? Infinity) > STARVATION_FLOOR;
    case 'findWater':
      return (opts.waterRatio ?? 1) >= CRITICAL_WATER_RATIO;
    case 'pan':
      return true;
  }
}

/**
 * Sunday-rest gate.
 *
 * #1304-T4 — Sacred personas (faithful, sunday_rester) now break Sabbath
 * under 'critical' pressure. Previously these personas ALWAYS rested on
 * Sunday regardless of schedule; that was historically inaccurate once a
 * snowy mountain winter is at stake. The period agony, in one line: even
 * devout captains broke the Sabbath when the passes were closing. Faithful
 * keeps the Sabbath at 'behind' (the moral hesitation is real), but yields
 * at 'critical' (the children / the snow / the pass). Non-sacred personas
 * skip Sunday rest when behind as before.
 */
export function allowsSabbathRest(state: GameState, personaId: PersonaId): boolean {
  const doctrine = doctrineFor(personaId);
  const pressure = schedulePressure(state, doctrine.targetArrivalDay);
  if (doctrine.sabbathSacred) {
    // Sacred: keep Sabbath at 'ok' or 'behind'; break at 'critical'.
    if (pressure === 'critical') return false;
    return true;
  }
  if (tooFragileToPush(state)) return true;
  return pressure === 'ok';
}
