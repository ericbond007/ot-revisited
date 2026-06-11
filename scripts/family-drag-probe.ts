// #1304 SO-tuning — family-drag probe. The SO baseline showed every
// child-carrying archetype at ~0% arrivals (Traditional Family 0/150)
// while the '49er Mess sits at 96%. This probe isolates WHERE the ~40+
// lost days come from via a controlled 2×2 (persona × children) plus
// the real Mess as anchor:
//
//   A  family (farmer+doctor, 4 kids, balanced)     — the failing archetype
//   B  same adults, 0 kids, balanced                — children isolated
//   C  same adults, 4 kids, pace_pusher             — persona isolated
//   D  mess (5 adults, pace_pusher)                 — the passing anchor
//
// Per cell: arrivals, final miles, action-day split, and a rest-day
// CAUSE classification done on the pre-action state via the runner's
// onIterationEnd hook (sabbath / crisis-HP / oxen-worn / morale / water /
// other), plus child-vs-adult HP tracking and pace distribution.
//
// Usage: npx tsx scripts/family-drag-probe.ts [--runs 40] [--out /tmp/family-drag.md]

import { runBot } from '../src/lib/dev/bot/runner';
import type { BotRunOpts } from '../src/lib/dev/bot/types';
import type { GameState } from '../src/lib/game/types';
import { isSunday } from '../src/lib/game/utils/calendar';
import { writeFileSync } from 'node:fs';

const argRuns = process.argv.indexOf('--runs');
const RUNS = argRuns !== -1 ? parseInt(process.argv[argRuns + 1], 10) : 40;
const argOut = process.argv.indexOf('--out');
const OUT = argOut !== -1 ? process.argv[argOut + 1] : '/tmp/family-drag.md';

interface Cell {
  key: string;
  label: string;
  opts: Omit<BotRunOpts, 'seed' | 'onIterationEnd'>;
}

const CELLS: Cell[] = [
  {
    key: 'A',
    label: 'family: 2 adults + 4 kids, balanced (Traditional Family)',
    opts: { persona: 'balanced', leaderProfession: 'farmer', companionProfessions: ['doctor'], childCount: 4 }
  },
  {
    key: 'B',
    label: 'no-kids control: same 2 adults, 0 kids, balanced',
    opts: { persona: 'balanced', leaderProfession: 'farmer', companionProfessions: ['doctor'], childCount: 0 }
  },
  {
    key: 'C',
    label: 'persona control: 2 adults + 4 kids, pace_pusher',
    opts: { persona: 'pace_pusher', leaderProfession: 'farmer', companionProfessions: ['doctor'], childCount: 4 }
  },
  {
    key: 'D',
    label: "mess anchor: 5 adults, 0 kids, pace_pusher ('49er Mess)",
    opts: { persona: 'pace_pusher', leaderProfession: 'doctor', companionProfessions: ['hunter', 'teamster', 'blacksmith', 'scout'], childCount: 0 }
  }
];

// Mirror personas.ts thresholds for classification (not exported; keep in sync).
function minAliveHealth(s: GameState, kind?: 'adult' | 'child'): number {
  const pool = s.party.filter((m) => !m.dead && (kind === undefined || m.kind === kind));
  return pool.length ? Math.min(...pool.map((m) => m.health)) : 100;
}
function avgAliveHealth(s: GameState, kind: 'adult' | 'child'): number | null {
  const pool = s.party.filter((m) => !m.dead && m.kind === kind);
  return pool.length ? pool.reduce((a, m) => a + m.health, 0) / pool.length : null;
}
function avgOxFatigue(s: GameState): number {
  const alive = s.oxen.filter((o) => o.health > 0);
  return alive.length ? alive.reduce((a, o) => a + o.fatigue, 0) / alive.length : 0;
}
function hasLiveProf(s: GameState, prof: string): boolean {
  return s.party.some((m) => !m.dead && m.profession === prof);
}

type RestCause = 'sabbath' | 'crisisHp' | 'oxenWorn' | 'morale' | 'water' | 'other';

interface CellAgg {
  runs: number;
  arrived: number;
  snowedIn: number;
  wiped: number;
  daysSum: number;          // arrivals only
  milesSum: number;         // all runs (final miles)
  actionDays: Record<string, number>;
  restCauses: Record<RestCause, number>;
  /** Days where crisis-HP rest fired and the min-HP member was a child. */
  crisisHpChildDays: number;
  paceDays: Record<string, number>;
  /** Travel/event days where persona picked fast/grueling but the #176
   *  wagon-train clamp downgraded effective pace to moderate. */
  paceClampedDays: number;
  /** Day-weighted: in a wagon train at the start of the iteration. */
  inTrainDays: number;
  /** Day-weighted avg ox fatigue on travel/event days (pre-action). */
  travelOxFatigueSum: number; travelOxFatigueSamples: number;
  /** Day-weighted miles on travel/event days, for mi/moving-day. */
  movingDayMiles: number; movingDays: number;
  /** Travel/event iterations that advanced the calendar but moved 0 miles
   *  (company lay-bys, closures, dissent holds — the hidden stall). */
  zeroMileTravelDays: number;
  /** Zero-mile travel days bucketed by cause. */
  zeroMileCauses: Record<string, number>;
  /** Day-weighted sum of effective pace base miles (post-#176-clamp). */
  effPaceBaseSum: number;
  childHpSum: number; childHpSamples: number;
  adultHpSum: number; adultHpSamples: number;
  foodConsumedSum: number;
  childDeaths: number; adultDeaths: number;
  finalMiles: number[];
}

function newAgg(): CellAgg {
  return {
    runs: 0, arrived: 0, snowedIn: 0, wiped: 0, daysSum: 0, milesSum: 0,
    actionDays: {},
    restCauses: { sabbath: 0, crisisHp: 0, oxenWorn: 0, morale: 0, water: 0, other: 0 },
    crisisHpChildDays: 0,
    paceDays: {},
    paceClampedDays: 0,
    inTrainDays: 0,
    travelOxFatigueSum: 0, travelOxFatigueSamples: 0,
    movingDayMiles: 0, movingDays: 0,
    zeroMileTravelDays: 0,
    zeroMileCauses: {},
    effPaceBaseSum: 0,
    childHpSum: 0, childHpSamples: 0, adultHpSum: 0, adultHpSamples: 0,
    foodConsumedSum: 0, childDeaths: 0, adultDeaths: 0, finalMiles: []
  };
}

function classifyRest(before: GameState): { cause: RestCause; childIsMin: boolean } {
  // Order mirrors the persona shouldRest gates: sabbath first, then
  // crisis HP / worn oxen (unconditional), then morale, water last.
  const hpFloor = hasLiveProf(before, 'doctor') ? 15 : 25;
  const minHp = minAliveHealth(before);
  const minAdult = minAliveHealth(before, 'adult');
  const childIsMin = minAliveHealth(before, 'child') < minAdult;
  if (isSunday(before.date)) return { cause: 'sabbath', childIsMin: false };
  if (minHp < Math.max(hpFloor, 30)) return { cause: 'crisisHp', childIsMin };
  const fatigueLimit = hasLiveProf(before, 'teamster') ? 55 : 70;
  const aliveOxen = before.oxen.filter((o) => o.health > 0).length;
  if (aliveOxen === 0 || avgOxFatigue(before) > fatigueLimit) return { cause: 'oxenWorn', childIsMin: false };
  if (before.morale < 15) return { cause: 'morale', childIsMin: false };
  const cap = before.resources.waterCap || 1;
  if ((before.resources.water + (before.resources.dirtyWater ?? 0)) / cap < 0.6) return { cause: 'water', childIsMin: false };
  return { cause: 'other', childIsMin: false };
}

function pct(n: number, d: number): string {
  return d > 0 ? `${Math.round((n / d) * 100)}%` : '—';
}
function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

const lines: string[] = [];
lines.push(`# Family-drag probe — 2×2 persona × children + mess anchor (${RUNS} runs/cell, Apr 15 1849)`);
lines.push('');

const t0 = Date.now();
const aggs = new Map<string, CellAgg>();

for (const cell of CELLS) {
  const agg = newAgg();
  aggs.set(cell.key, agg);
  for (let i = 0; i < RUNS; i++) {
    const seed = `drag:${i}`; // SAME seeds across cells — paired comparison
    const report = runBot({
      ...cell.opts,
      seed,
      onIterationEnd(before, after, actionType, dayDelta) {
        if (dayDelta <= 0) return;
        if (actionType === 'rest' || actionType === 'findWater') {
          const { cause, childIsMin } = classifyRest(before);
          agg.restCauses[cause] += dayDelta;
          if (cause === 'crisisHp' && childIsMin) agg.crisisHpChildDays += dayDelta;
        }
        if (actionType === 'travel' || actionType === 'eventChoice') {
          agg.paceDays[after.pace] = (agg.paceDays[after.pace] ?? 0) + dayDelta;
          // #176 clamp detection: in a train, fast/grueling run at moderate.
          if (after.wagonTrain && (after.pace === 'fast' || after.pace === 'grueling')) {
            agg.paceClampedDays += dayDelta;
          }
          agg.travelOxFatigueSum += avgOxFatigue(before) * dayDelta;
          agg.travelOxFatigueSamples += dayDelta;
          agg.movingDayMiles += after.location.milesTraveled - before.location.milesTraveled;
          agg.movingDays += dayDelta;
          if (after.location.milesTraveled - before.location.milesTraveled <= 0) {
            agg.zeroMileTravelDays += dayDelta;
            const closedUntil = (after.flags._passClosedUntil as number | undefined) ?? 0;
            const blockMode = after.wagonTrain?.companyDecisionBlock?.mode;
            const cause = closedUntil >= after.day
              ? 'passClosed'
              : blockMode && blockMode !== 'travel'
                ? blockMode
                : (after.weather === 'storm' || after.weather === 'snow' ? `weather:${after.weather}` : 'unknown');
            agg.zeroMileCauses[cause] = (agg.zeroMileCauses[cause] ?? 0) + dayDelta;
          }
          const PACE_BASE: Record<string, number> = { slow: 14, moderate: 20, fast: 26, grueling: 32 };
          const effPace = after.wagonTrain && (after.pace === 'fast' || after.pace === 'grueling') ? 'moderate' : after.pace;
          agg.effPaceBaseSum += (PACE_BASE[effPace] ?? 20) * dayDelta;
        }
        if (before.wagonTrain) agg.inTrainDays += dayDelta;
        const cHp = avgAliveHealth(after, 'child');
        if (cHp !== null) { agg.childHpSum += cHp * dayDelta; agg.childHpSamples += dayDelta; }
        const aHp = avgAliveHealth(after, 'adult');
        if (aHp !== null) { agg.adultHpSum += aHp * dayDelta; agg.adultHpSamples += dayDelta; }
      }
    });
    agg.runs += 1;
    if (report.outcome === 'arrived') { agg.arrived += 1; agg.daysSum += report.daysElapsed; }
    else if (report.outcome === 'snowed_in') agg.snowedIn += 1;
    else if (report.outcome === 'wiped') agg.wiped += 1;
    agg.milesSum += report.milesTraveled;
    agg.finalMiles.push(report.milesTraveled);
    for (const [k, v] of Object.entries(report.actionDays)) {
      agg.actionDays[k] = (agg.actionDays[k] ?? 0) + v;
    }
    agg.foodConsumedSum += report.supplies.foodConsumedLb;
    for (const m of report.finalState.party) {
      if (m.dead) {
        if (m.kind === 'child') agg.childDeaths += 1;
        else agg.adultDeaths += 1;
      }
    }
  }
}

lines.push('## Outcomes');
lines.push('');
lines.push('| Cell | Composition | Arrived | Snowed in | Wiped | Stalled | Median final mi | Mean days (arrivals) |');
lines.push('|---|---|---|---|---|---|---|---|');
for (const cell of CELLS) {
  const a = aggs.get(cell.key)!;
  const stalled = a.runs - a.arrived - a.snowedIn - a.wiped;
  const meanDays = a.arrived ? Math.round(a.daysSum / a.arrived) : 0;
  lines.push(`| ${cell.key} | ${cell.label} | ${a.arrived} (${pct(a.arrived, a.runs)}) | ${a.snowedIn} | ${a.wiped} | ${stalled} | ${median(a.finalMiles)} | ${meanDays || '—'} |`);
}
lines.push('');

lines.push('## Where the calendar goes (mean days/run)');
lines.push('');
const actionKeys = ['travel', 'rest', 'findWater', 'hunt', 'ford', 'tradingPost', 'eventChoice', 'other'];
lines.push(`| Cell | ${actionKeys.join(' | ')} | total |`);
lines.push(`|---|${actionKeys.map(() => '---').join('|')}|---|`);
for (const cell of CELLS) {
  const a = aggs.get(cell.key)!;
  const row = actionKeys.map((k) => ((a.actionDays[k] ?? 0) / a.runs).toFixed(1));
  const total = actionKeys.reduce((s, k) => s + (a.actionDays[k] ?? 0), 0) / a.runs;
  lines.push(`| ${cell.key} | ${row.join(' | ')} | ${total.toFixed(1)} |`);
}
lines.push('');

lines.push('## Rest-day causes (mean days/run, classified on pre-rest state)');
lines.push('');
const causeKeys: RestCause[] = ['sabbath', 'crisisHp', 'oxenWorn', 'morale', 'water', 'other'];
lines.push(`| Cell | ${causeKeys.join(' | ')} | crisisHp w/ child at min |`);
lines.push(`|---|${causeKeys.map(() => '---').join('|')}|---|`);
for (const cell of CELLS) {
  const a = aggs.get(cell.key)!;
  const row = causeKeys.map((k) => (a.restCauses[k] / a.runs).toFixed(1));
  lines.push(`| ${cell.key} | ${row.join(' | ')} | ${(a.crisisHpChildDays / a.runs).toFixed(1)} |`);
}
lines.push('');

lines.push('## Pace mix on travel days (day-weighted)');
lines.push('');
lines.push('| Cell | slow | moderate | fast | grueling |');
lines.push('|---|---|---|---|---|');
for (const cell of CELLS) {
  const a = aggs.get(cell.key)!;
  const total = Object.values(a.paceDays).reduce((s, v) => s + v, 0);
  const row = ['slow', 'moderate', 'fast', 'grueling'].map((p) => pct(a.paceDays[p] ?? 0, total));
  lines.push(`| ${cell.key} | ${row.join(' | ')} |`);
}
lines.push('');

lines.push('## Movement efficiency + the #176 train clamp');
lines.push('');
lines.push('| Cell | mi/moving day | mi/NONZERO moving day | zero-mile travel days/run | eff pace base (clamped) | avg ox fatigue (travel) | days in train | fast picks clamped |');
lines.push('|---|---|---|---|---|---|---|---|');
for (const cell of CELLS) {
  const a = aggs.get(cell.key)!;
  const mpd = a.movingDays ? (a.movingDayMiles / a.movingDays).toFixed(1) : '—';
  const nonZero = a.movingDays - a.zeroMileTravelDays;
  const mpdNz = nonZero > 0 ? (a.movingDayMiles / nonZero).toFixed(1) : '—';
  const effBase = a.movingDays ? (a.effPaceBaseSum / a.movingDays).toFixed(1) : '—';
  const fat = a.travelOxFatigueSamples ? Math.round(a.travelOxFatigueSum / a.travelOxFatigueSamples) : 0;
  lines.push(`| ${cell.key} | ${mpd} | ${mpdNz} | ${(a.zeroMileTravelDays / a.runs).toFixed(1)} | ${effBase} | ${fat} | ${(a.inTrainDays / a.runs).toFixed(0)}/run | ${(a.paceClampedDays / a.runs).toFixed(1)}/run |`);
}
lines.push('');

lines.push('## Zero-mile travel-day causes (mean days/run)');
lines.push('');
{
  const allCauses = [...new Set(CELLS.flatMap((c) => Object.keys(aggs.get(c.key)!.zeroMileCauses)))].sort();
  lines.push(`| Cell | ${allCauses.join(' | ')} |`);
  lines.push(`|---|${allCauses.map(() => '---').join('|')}|`);
  for (const cell of CELLS) {
    const a = aggs.get(cell.key)!;
    lines.push(`| ${cell.key} | ${allCauses.map((c) => ((a.zeroMileCauses[c] ?? 0) / a.runs).toFixed(1)).join(' | ')} |`);
  }
}
lines.push('');

lines.push('## Party health + attrition');
lines.push('');
lines.push('| Cell | avg child HP | avg adult HP | child deaths | adult deaths | food lb/run |');
lines.push('|---|---|---|---|---|---|');
for (const cell of CELLS) {
  const a = aggs.get(cell.key)!;
  const cHp = a.childHpSamples ? Math.round(a.childHpSum / a.childHpSamples) : null;
  const aHp = a.adultHpSamples ? Math.round(a.adultHpSum / a.adultHpSamples) : null;
  lines.push(`| ${cell.key} | ${cHp ?? '—'} | ${aHp ?? '—'} | ${a.childDeaths} | ${a.adultDeaths} | ${Math.round(a.foodConsumedSum / a.runs)} |`);
}
lines.push('');
lines.push(`Elapsed: ${((Date.now() - t0) / 1000).toFixed(1)}s`);

writeFileSync(OUT, lines.join('\n') + '\n');
console.log(lines.join('\n'));
console.log(`\nWritten to ${OUT}`);
