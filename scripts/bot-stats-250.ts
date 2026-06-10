// Bot stats pass — N runs for EVERY persona (no profession/shape grid),
// fixed party so persona is the only variable. Emits a detailed per-persona
// report: outcomes, duration, miles, supply flow (food consumed/acquired,
// ammo, cash), death causes/timing, and WHERE runs ended (trail leg between
// landmarks) for wipes and stalls.
//
// Usage: npx tsx scripts/bot-stats-250.ts [--runs 250] [--out /tmp/bot-stats.md]
//
// Fixed config: leader farmer + doctor/hunter/teamster + 2 children
// (6 souls — large family wagon; exercises child mortality), 1849 Apr 15
// start, 220-day cap (the runner default).

import { runBot } from '../src/lib/dev/bot/runner';
import type { BotRunReport } from '../src/lib/dev/bot/types';
import { getLandmark } from '../src/lib/game/content/landmarks';
import type { PersonaId } from '../src/lib/game/ai/types';
import { writeFileSync } from 'node:fs';

const PERSONAS: PersonaId[] = [
  'cautious', 'balanced', 'aggressive', 'chaos', 'sunday_rester',
  'pace_pusher', 'hoarder', 'generous', 'faithful', 'drinker'
];

const argRuns = process.argv.indexOf('--runs');
const RUNS = argRuns !== -1 ? parseInt(process.argv[argRuns + 1], 10) : 250;
const argOut = process.argv.indexOf('--out');
const OUT = argOut !== -1 ? process.argv[argOut + 1] : '/tmp/bot-stats-250.md';

function lmName(id: string | null | undefined): string {
  if (!id) return 'jumping-off';
  try { return getLandmark(id).name; } catch { return id; }
}

function legOf(r: BotRunReport): string {
  const loc = r.finalState.location;
  return `${lmName(loc.previousLandmarkId)} → ${lmName(loc.nextLandmarkId)}`;
}

function pct(n: number, d: number): string {
  return d === 0 ? '0%' : `${Math.round((n / d) * 100)}%`;
}
function avg(ns: number[]): number {
  return ns.length === 0 ? 0 : ns.reduce((a, b) => a + b, 0) / ns.length;
}
function median(ns: number[]): number {
  if (ns.length === 0) return 0;
  const s = [...ns].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}
function fmt(n: number, dp = 0): string {
  return n.toFixed(dp);
}
function topN(counts: Record<string, number>, n: number): [string, number][] {
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, n);
}
function bump(rec: Record<string, number>, key: string, by = 1): void {
  rec[key] = (rec[key] ?? 0) + by;
}

const FOOD_END_KEYS = ['flour', 'bacon', 'beans', 'game_meat', 'jerky', 'hardtack', 'cornmeal'];

const lines: string[] = [];
function out(s = ''): void { lines.push(s); console.log(s); }

out(`# Bot stats pass — ${RUNS} runs × ${PERSONAS.length} personas (${RUNS * PERSONAS.length} total)`);
out();
out(`Fixed party: Botleader (farmer) + doctor + hunter + teamster + 2 children (6 souls).`);
out(`Start 1849-04-15, 220-day cap. Seeds \`stats250:<persona>:<i>\`. Outcomes: arrived / wiped / stalled (still in-progress at cap).`);
out();

const t0 = Date.now();
const grandLegWipes: Record<string, number> = {};
const grandLegStalls: Record<string, number> = {};
const grandCauses: Record<string, number> = {};

for (const persona of PERSONAS) {
  const reports: BotRunReport[] = [];
  for (let i = 0; i < RUNS; i++) {
    reports.push(runBot({
      seed: `stats250:${persona}:${i}`,
      persona,
      leaderProfession: 'farmer',
      partySize: 4,
      childCount: 2
    }));
  }

  const arrived = reports.filter((r) => r.outcome === 'arrived');
  const wiped = reports.filter((r) => r.outcome === 'wiped');
  const stalled = reports.filter((r) => r.outcome !== 'arrived' && r.outcome !== 'wiped');

  // Deaths across all runs, from finalState party detail.
  const causes: Record<string, number> = {};
  const deathsByKind = { adult: 0, child: 0 };
  const deathDays: number[] = [];
  let totalDeaths = 0;
  for (const r of reports) {
    for (const m of r.finalState.party) {
      if (!m.dead) continue;
      totalDeaths += 1;
      bump(causes, m.deathCause ?? 'unknown');
      bump(grandCauses, m.deathCause ?? 'unknown');
      deathsByKind[m.kind === 'child' ? 'child' : 'adult'] += 1;
      if (typeof m.deathDay === 'number') deathDays.push(m.deathDay);
    }
  }

  // Where wipes / stalls happened (trail leg).
  const legWipes: Record<string, number> = {};
  for (const r of wiped) { bump(legWipes, legOf(r)); bump(grandLegWipes, legOf(r)); }
  const legStalls: Record<string, number> = {};
  for (const r of stalled) { bump(legStalls, legOf(r)); bump(grandLegStalls, legOf(r)); }

  // Supplies.
  const foodConsumed = reports.map((r) => r.supplies.foodConsumedLb);
  const foodAcquired = reports.map((r) => r.supplies.foodAcquiredLb);
  const powder = reports.map((r) => r.supplies.gunpowderUsedLb);
  const balls = reports.map((r) => r.supplies.leadBallsUsed);
  const spent = reports.map((r) => r.supplies.cashSpent);
  const earned = reports.map((r) => r.supplies.cashEarned);
  const endFood = reports.map((r) =>
    FOOD_END_KEYS.reduce((s, k) => s + (r.finalState.inventory[k] ?? 0), 0));
  const endOxen = reports.map((r) => r.finalState.oxen.filter((o) => o.health > 0).length);
  const endCash = reports.map((r) => r.finalCash);
  const endMorale = reports.map((r) => r.finalMorale);

  // Action-day calendar.
  const ad = { travel: 0, rest: 0, findWater: 0, hunt: 0, ford: 0, tradingPost: 0, eventChoice: 0, other: 0 };
  for (const r of reports) for (const k of Object.keys(ad) as (keyof typeof ad)[]) ad[k] += r.actionDays[k];
  const totalDays = reports.reduce((s, r) => s + r.daysElapsed, 0);

  // Top events.
  const events: Record<string, number> = {};
  for (const r of reports) for (const [id, n] of Object.entries(r.eventsFiredById)) bump(events, id, n);

  const errRuns = reports.filter((r) => r.errors.length > 0).length;

  out(`## ${persona}`);
  out();
  out(`| Outcome | Runs | Avg days | Med days | Avg miles | Med miles | Avg survivors |`);
  out(`|---|---|---|---|---|---|---|`);
  for (const [label, set] of [['arrived', arrived], ['wiped', wiped], ['stalled', stalled]] as const) {
    out(`| ${label} | ${set.length} (${pct(set.length, RUNS)}) | ${fmt(avg(set.map((r) => r.daysElapsed)))} | ${median(set.map((r) => r.daysElapsed))} | ${fmt(avg(set.map((r) => r.milesTraveled)))} | ${median(set.map((r) => r.milesTraveled))} | ${fmt(avg(set.map((r) => r.endingAliveCount)), 1)} / 6 |`);
  }
  out();
  out(`**Deaths**: ${totalDeaths} total (${fmt(totalDeaths / RUNS, 2)}/run) — adults ${deathsByKind.adult}, children ${deathsByKind.child}. Median death day ${median(deathDays)}.`);
  out(`Causes: ${topN(causes, 8).map(([c, n]) => `${c} ${n} (${pct(n, totalDeaths)})`).join(' · ') || 'none'}`);
  out();
  if (wiped.length > 0) out(`**Wipe legs (top 5)**: ${topN(legWipes, 5).map(([l, n]) => `${l} ×${n}`).join(' · ')}`);
  if (stalled.length > 0) {
    out(`**Stall legs (top 5)**: ${topN(legStalls, 5).map(([l, n]) => `${l} ×${n}`).join(' · ')}`);
    out(`Stalled runs ended at avg mile ${fmt(avg(stalled.map((r) => r.milesTraveled)))} after 220 days.`);
  }
  out();
  out(`**Supplies (avg/run)**: food consumed ${fmt(avg(foodConsumed))} lb, acquired ${fmt(avg(foodAcquired))} lb (hunt/forage/trade/gifts); `
    + `gunpowder ${fmt(avg(powder), 1)} lb + ${fmt(avg(balls))} balls; cash spent $${fmt(avg(spent))}, earned $${fmt(avg(earned))}.`);
  out(`**End state (avg)**: ${fmt(avg(endFood))} lb staple food, ${fmt(avg(endOxen), 1)} live oxen, $${fmt(avg(endCash))} cash, morale ${fmt(avg(endMorale))}.`);
  out();
  out(`**Calendar** (share of ${totalDays} bot-days): travel ${pct(ad.travel, totalDays)}, rest ${pct(ad.rest, totalDays)}, hunt ${pct(ad.hunt, totalDays)}, find-water ${pct(ad.findWater, totalDays)}, ford ${pct(ad.ford, totalDays)}, post ${pct(ad.tradingPost, totalDays)}, event ${pct(ad.eventChoice, totalDays)}, other ${pct(ad.other, totalDays)}.`);
  out(`**Top events**: ${topN(events, 6).map(([id, n]) => `${id} ×${n}`).join(' · ')}.`);
  if (errRuns > 0) out(`**Runs with errors**: ${errRuns} (see runner error capture).`);
  out();
}

out(`## Cross-persona totals`);
out();
out(`**Death causes (all ${RUNS * PERSONAS.length} runs)**: ${topN(grandCauses, 10).map(([c, n]) => `${c} ${n}`).join(' · ')}`);
out(`**Deadliest legs (wipes)**: ${topN(grandLegWipes, 8).map(([l, n]) => `${l} ×${n}`).join(' · ')}`);
out(`**Stalliest legs**: ${topN(grandLegStalls, 8).map(([l, n]) => `${l} ×${n}`).join(' · ')}`);
out();
out(`Elapsed: ${((Date.now() - t0) / 1000).toFixed(1)}s`);

writeFileSync(OUT, lines.join('\n') + '\n');
console.log(`\nreport written: ${OUT}`);
