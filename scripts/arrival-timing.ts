// #1304 — arrival-timing distribution + winter-severity legibility gate.
// N runs per persona; per-persona arrival-day percentiles with calendar
// dates, an all-arrivals histogram, and (when the winter wall is present)
// severity-bucketed outcomes: arrivals / snowed_in / median arrival / median
// Blues-clear day per hidden severity. The legibility proof: 'early'-winter
// agents must clear the Blue Mountains sooner than 'late'-winter agents —
// evidence the §3 signals are readable.
//
// #1304 winter telemetry tables added: per-persona winter zone breakdown
// (zoneDays, zoneStormDays, closureCount, closureDays, zoneRestDays split
// by outcome arrived-vs-not), snowed-in location histogram, and NON-arrived
// NON-snowed-in median final mile (the 260-day-cap crawlers).
//
// SO model (Standard Operating, 2026-06-11): pass --model so to run the
// 14-archetype SO_MODEL catalog instead of the legacy single-fixture loop.
// The SO model is the project's standard gate fixture going forward.
// The default (--model legacy or no --model flag) remains the old single
// 4-adult+2-child fixture for historical comparability — flip the default
// once Dave confirms the SO baseline.
//
// SO mode: --runs N applies per archetype (N × 14 total runs, default 150
// per archetype = 2,100 total, within the ~1k–2k sweep budget).
//
// Usage:
//   npx tsx scripts/arrival-timing.ts [--runs 250] [--out /tmp/arrival-timing.md]
//   npx tsx scripts/arrival-timing.ts --model so [--runs 150] [--out /tmp/so-baseline.md]

import { runBot } from '../src/lib/dev/bot/runner';
import type { BotRunReport } from '../src/lib/dev/bot/types';
import { LANDMARKS } from '../src/lib/game/content/landmarks';
import type { PersonaId } from '../src/lib/game/ai/types';
import { SO_MODEL } from '../src/lib/dev/bot/so-model';
import { writeFileSync } from 'node:fs';

const PERSONAS: PersonaId[] = ['cautious', 'balanced', 'aggressive', 'chaos', 'sunday_rester', 'pace_pusher', 'hoarder', 'generous', 'faithful', 'drinker'];
const argRuns = process.argv.indexOf('--runs');
const RUNS = argRuns !== -1 ? parseInt(process.argv[argRuns + 1], 10) : 250;
const argOut = process.argv.indexOf('--out');
const OUT = argOut !== -1 ? process.argv[argOut + 1] : '/tmp/arrival-timing.md';
const argModel = process.argv.indexOf('--model');
const MODEL = argModel !== -1 ? process.argv[argModel + 1] : 'legacy';

function dateOf(day: number): string {
  const d = new Date(1849, 3, 15);
  d.setDate(d.getDate() + day - 1);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function pctile(sorted: number[], p: number): number {
  return sorted.length === 0 ? 0 : sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}
function median(ns: number[]): number {
  const s = [...ns].sort((a, b) => a - b);
  return pctile(s, 0.5);
}
function avg(ns: number[]): number {
  return ns.length === 0 ? 0 : Math.round(ns.reduce((s, v) => s + v, 0) / ns.length);
}
function fmt1(n: number): string { return n.toFixed(1); }

// Leg ids up to and including the Blues exit (grande_ronde region) — used to
// approximate the day a run cleared the Blue Mountains from legStats day sums.
const LEG_ORDER = ['start', ...LANDMARKS.map((l) => l.id)];
const BLUES_EXIT = 'grande_ronde';
const bluesExitIdx = LEG_ORDER.indexOf(BLUES_EXIT);

function bluesClearDay(r: BotRunReport): number | null {
  if (bluesExitIdx === -1) return null;
  let sum = 0;
  let touchedExit = false;
  for (const [key, b] of Object.entries(r.legStats)) {
    const i = LEG_ORDER.indexOf(key);
    if (i !== -1 && i <= bluesExitIdx) {
      sum += b.days;
      if (i === bluesExitIdx) touchedExit = true;
    }
  }
  return touchedExit ? sum : null; // null = never reached the Blues exit
}

interface Bucket { arrived: number; snowedIn: number; wiped: number; other: number; arrivalDays: number[]; bluesDays: number[]; total: number; }
function newBucket(): Bucket { return { arrived: 0, snowedIn: 0, wiped: 0, other: 0, arrivalDays: [], bluesDays: [], total: 0 }; }

// Per-persona winter accumulator split by outcome group (arrived vs not).
interface WinterSplit {
  arrived:    { zoneDays: number[]; zoneStormDays: number[]; closureCount: number[]; closureDays: number[]; zoneRestDays: number[]; n: number };
  notArrived: { zoneDays: number[]; zoneStormDays: number[]; closureCount: number[]; closureDays: number[]; zoneRestDays: number[]; n: number };
}
function newWinterSplit(): WinterSplit {
  const mk = () => ({ zoneDays: [] as number[], zoneStormDays: [] as number[], closureCount: [] as number[], closureDays: [] as number[], zoneRestDays: [] as number[], n: 0 });
  return { arrived: mk(), notArrived: mk() };
}

// Snowed-in location + final-mile accumulators.
const snowedInByZone: Record<'blues' | 'cascades', number> = { blues: 0, cascades: 0 };
// For NON-arrived, NON-snowed runs: collect final mile so we can find median.
const crawlerFinalMiles: Record<string, number[]> = {};  // keyed by persona

const lines: string[] = [];
function out(s = ''): void { lines.push(s); console.log(s); }

const t0 = Date.now();

// ---------------------------------------------------------------------------
// SO model mode — 14-archetype Standard Operating test fixture
// ---------------------------------------------------------------------------

if (MODEL === 'so') {
  const SO_RUNS = RUNS === 250 ? 150 : RUNS; // default to 150 per archetype in SO mode
  const totalRuns = SO_RUNS * SO_MODEL.length;
  out(`# SO model baseline — ${SO_RUNS} runs × ${SO_MODEL.length} archetypes = ${totalRuns} total (start Apr 15, 1849)`);
  out('## Standard Operating (SO) test model — project gate fixture since 2026-06-11');
  out();
  out('| # | Archetype | Tier | Arrived | Target | PASS/MISS | Snowed in | Wiped | Median arrival |');
  out('|---|---|---|---|---|---|---|---|---|');

  // Per-tier rollup accumulators
  const tierStats: Record<string, { arrived: number; total: number; target: [number, number] }> = {};

  for (let idx = 0; idx < SO_MODEL.length; idx++) {
    const arch = SO_MODEL[idx];
    const partySize = 1 + arch.companionProfessions.length; // leader + companions
    let arrivedCount = 0;
    let snowedIn = 0;
    let wiped = 0;
    const arrivalDays: number[] = [];

    for (let i = 0; i < SO_RUNS; i++) {
      const r = runBot({
        seed: `so:${arch.id}:${i}`,
        persona: arch.persona,
        leaderProfession: arch.leaderProfession,
        companionProfessions: arch.companionProfessions,
        partySize,
        childCount: arch.childCount,
      });
      if (r.outcome === 'arrived') { arrivedCount++; arrivalDays.push(r.daysElapsed); }
      else if (r.outcome === 'snowed_in') snowedIn++;
      else if (r.outcome === 'wiped') wiped++;
    }

    const arrPct = arrivedCount / SO_RUNS;
    const [lo, hi] = arch.targetArrival;
    const pass = arrPct >= lo && arrPct <= hi ? 'PASS' : (arrPct < lo ? 'LOW' : 'HIGH');
    const medDay = arrivalDays.length > 0 ? median(arrivalDays) : null;
    const medStr = medDay != null ? `${medDay} (${dateOf(medDay)})` : '—';

    out(`| ${idx + 1} | ${arch.name} | ${arch.tier} | ${arrivedCount} (${Math.round(arrPct * 100)}%) | ${Math.round(lo * 100)}–${Math.round(hi * 100)}% | ${pass} | ${snowedIn} | ${wiped} | ${medStr} |`);

    // Accumulate tier rollup
    if (!tierStats[arch.tier]) tierStats[arch.tier] = { arrived: 0, total: 0, target: arch.targetArrival };
    tierStats[arch.tier].arrived += arrivedCount;
    tierStats[arch.tier].total += SO_RUNS;
  }

  // Tier rollup table
  out();
  out('## Tier rollup');
  out();
  out('| Tier | Arrived | Total | Rate | Target |');
  out('|---|---|---|---|---|');
  for (const tier of ['easy', 'moderate', 'hard', 'brutal'] as const) {
    const ts = tierStats[tier];
    if (!ts) continue;
    const rate = ts.arrived / ts.total;
    const [lo, hi] = ts.target;
    out(`| ${tier} | ${ts.arrived} | ${ts.total} | ${Math.round(rate * 100)}% | ${Math.round(lo * 100)}–${Math.round(hi * 100)}% |`);
  }

  out();
  out(`Elapsed: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  writeFileSync(OUT, lines.join('\n') + '\n');
  console.log(`\nreport written: ${OUT}`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Legacy mode — original single-fixture persona loop (default)
// ---------------------------------------------------------------------------

out(`# Arrival timing + winter legibility — ${RUNS} runs × ${PERSONAS.length} personas (start Apr 15, 1849)`);
out();
out('| Persona | Arrived | Snowed in | Earliest | Median | p90 | Latest |');
out('|---|---|---|---|---|---|---|');

const allDays: number[] = [];
const bySeverity: Record<string, Bucket> = {};
const winterByPersona: Record<string, WinterSplit> = {};

for (const persona of PERSONAS) {
  const days: number[] = [];
  let snowed = 0;
  const ws = newWinterSplit();
  winterByPersona[persona] = ws;
  crawlerFinalMiles[persona] = [];

  for (let i = 0; i < RUNS; i++) {
    const r = runBot({ seed: `stats250:${persona}:${i}`, persona, leaderProfession: 'farmer', partySize: 4, childCount: 2 });
    const sev = (r.finalState.flags._winterSeverity as string | undefined) ?? 'none';
    const b = bySeverity[sev] ?? (bySeverity[sev] = newBucket());
    b.total += 1;
    const bc = bluesClearDay(r);
    if (bc !== null) b.bluesDays.push(bc);

    const isArrived = r.outcome === 'arrived';
    if (isArrived) { days.push(r.daysElapsed); allDays.push(r.daysElapsed); b.arrived += 1; b.arrivalDays.push(r.daysElapsed); }
    else if (r.outcome === 'snowed_in') { snowed += 1; b.snowedIn += 1; }
    else if (r.outcome === 'wiped') b.wiped += 1;
    else b.other += 1;

    // Winter split accumulation.
    const wg = isArrived ? ws.arrived : ws.notArrived;
    wg.n += 1;
    wg.zoneDays.push(r.winter.zoneDays);
    wg.zoneStormDays.push(r.winter.zoneStormDays);
    wg.closureCount.push(r.winter.closureCount);
    wg.closureDays.push(r.winter.closureDays);
    wg.zoneRestDays.push(r.winter.zoneRestDays);

    // Snowed-in zone histogram.
    if (r.outcome === 'snowed_in' && r.winter.snowedInZone) {
      snowedInByZone[r.winter.snowedInZone] = (snowedInByZone[r.winter.snowedInZone] ?? 0) + 1;
    }

    // Crawler final miles (non-arrived, non-snowed).
    if (!isArrived && r.outcome !== 'snowed_in') {
      crawlerFinalMiles[persona].push(r.milesTraveled);
    }
  }
  days.sort((a, b) => a - b);
  const med = pctile(days, 0.5);
  out(`| ${persona} | ${days.length} (${Math.round((days.length / RUNS) * 100)}%) | ${snowed} | ${days[0] ?? '—'}${days.length ? ` (${dateOf(days[0])})` : ''} | ${med || '—'}${med ? ` (${dateOf(med)})` : ''} | ${pctile(days, 0.9) || '—'} | ${days[days.length - 1] ?? '—'}${days.length ? ` (${dateOf(days[days.length - 1])})` : ''} |`);
}

out();
out('## Severity buckets (the legibility proof)');
out();
out('| Severity | Runs | Arrived | Snowed in | Wiped/other | Median arrival | Median Blues-clear day |');
out('|---|---|---|---|---|---|---|');
for (const sev of ['early', 'normal', 'late', 'none']) {
  const b = bySeverity[sev];
  if (!b) continue;
  out(`| ${sev} | ${b.total} | ${b.arrived} (${Math.round((b.arrived / b.total) * 100)}%) | ${b.snowedIn} | ${b.wiped + b.other} | ${median(b.arrivalDays) || '—'}${b.arrivalDays.length ? ` (${dateOf(median(b.arrivalDays))})` : ''} | ${median(b.bluesDays) || '—'}${b.bluesDays.length ? ` (${dateOf(median(b.bluesDays))})` : ''} |`);
}

out();
out('## Per-persona winter zone breakdown (avg days, arrived vs not-arrived)');
out();
out('Columns: zoneDays = days inside Blues/Cascades zones; zoneStorm = days in-zone with snow/storm weather;');
out('closure# = distinct pass-closure events; closureDays = days stuck under a closure; zoneRest = rest-action days in zone.');
out();
out('| Persona | Group | n | zoneDays | zoneStorm | closure# | closureDays | zoneRest |');
out('|---|---|---|---|---|---|---|---|');
for (const persona of PERSONAS) {
  const ws = winterByPersona[persona];
  for (const [label, grp] of [['arrived', ws.arrived], ['not-arrived', ws.notArrived]] as const) {
    if (grp.n === 0) { out(`| ${persona} | ${label} | 0 | — | — | — | — | — |`); continue; }
    out(`| ${persona} | ${label} | ${grp.n} | ${fmt1(avg(grp.zoneDays))} | ${fmt1(avg(grp.zoneStormDays))} | ${fmt1(avg(grp.closureCount))} | ${fmt1(avg(grp.closureDays))} | ${fmt1(avg(grp.zoneRestDays))} |`);
  }
}

out();
out('## Snowed-in location histogram');
out();
const totalSnowed = snowedInByZone.blues + snowedInByZone.cascades;
out(`| Zone | Count | Share |`);
out('|---|---|---|');
for (const zone of ['blues', 'cascades'] as const) {
  const n = snowedInByZone[zone] ?? 0;
  out(`| ${zone} | ${n} | ${totalSnowed > 0 ? Math.round((n / totalSnowed) * 100) : 0}% |`);
}
out(`| total | ${totalSnowed} | 100% |`);

out();
out('## Crawler final-mile distribution (non-arrived, non-snowed — 260-day-cap runs)');
out('Median mile where the clock runs out, per persona. Low = dying early; high = racing the cap but arriving late.');
out();
out('| Persona | Crawlers | Median final mile | Min | Max |');
out('|---|---|---|---|---|');
for (const persona of PERSONAS) {
  const miles = [...(crawlerFinalMiles[persona] ?? [])].sort((a, b) => a - b);
  if (miles.length === 0) { out(`| ${persona} | 0 | — | — | — |`); continue; }
  out(`| ${persona} | ${miles.length} | ${pctile(miles, 0.5)} | ${miles[0]} | ${miles[miles.length - 1]} |`);
}

out();
out('## All arrivals histogram (10-day buckets)');
out();
const buckets: Record<number, number> = {};
for (const d of allDays) { const k = Math.floor(d / 10) * 10; buckets[k] = (buckets[k] ?? 0) + 1; }
const keys = Object.keys(buckets).map(Number).sort((a, b) => a - b);
const maxN = Math.max(1, ...Object.values(buckets));
for (const k of keys) {
  out(`d${String(k).padStart(3)}–${k + 9} (${dateOf(k)}–${dateOf(k + 9)}): ${'█'.repeat(Math.max(1, Math.round((buckets[k] / maxN) * 50)))} ${buckets[k]}`);
}
out();
out(`Elapsed: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
writeFileSync(OUT, lines.join('\n') + '\n');
console.log(`\nreport written: ${OUT}`);
