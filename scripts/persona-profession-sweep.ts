// Persona × profession × party-size sweep. Crosses every named
// PersonaId with every ProfessionId at multiple party sizes, N replicas
// each, prints markdown tables.
//
// Usage:
//   npx tsx scripts/persona-profession-sweep.ts [--runs N] [--sizes 3,4,5,6] [--tag baseline] [--quiet]
//
// Default sizes: 3, 4, 5, 6 (per #1032 — sweep was previously locked at
// 3 adults; expanded to cover small-couple → big-outfit demographics).

import { runBot } from '../src/lib/dev/bot/runner';
import { PROFESSIONS } from '../src/lib/game/content/professions';
import type { ProfessionId } from '../src/lib/game/types';
import type { PersonaId } from '../src/lib/dev/bot/types';

const PERSONAS: PersonaId[] = [
  'cautious', 'balanced', 'aggressive', 'chaos',
  'sunday_rester', 'pace_pusher', 'hoarder', 'generous', 'faithful', 'drinker'
];

function main() {
  const args = process.argv.slice(2);
  const runs = parseInt(args[args.indexOf('--runs') + 1] ?? '5', 10);
  const tag = args[args.indexOf('--tag') + 1] ?? `sweep-${Date.now()}`;
  const sizesArg = args.indexOf('--sizes') >= 0 ? args[args.indexOf('--sizes') + 1] : '3,4,5,6';
  const sizes = sizesArg.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => n >= 2 && n <= 6);
  const quiet = args.includes('--quiet');

  const profIds = Object.keys(PROFESSIONS) as ProfessionId[];

  const totalRuns = PERSONAS.length * profIds.length * sizes.length * runs;
  console.log(`# Persona × profession × size sweep — ${tag}`);
  console.log(`Runs per cell: ${runs}. Personas: ${PERSONAS.length}. Professions: ${profIds.length}. Sizes: ${sizes.join(',')}. Total runs: ${totalRuns}.`);
  console.log();

  // Pre-compute all runs once and cache per (persona, prof, size). Each
  // dimension is averaged independently below.
  const grid: Record<string, ReturnType<typeof runBot>[]> = {};
  const start = Date.now();
  for (const persona of PERSONAS) {
    for (const prof of profIds) {
      for (const size of sizes) {
        const reports: ReturnType<typeof runBot>[] = [];
        for (let i = 0; i < runs; i++) {
          const seed = `${tag}-${persona}-${prof}-s${size}-${i}`;
          reports.push(runBot({ seed, persona, leaderProfession: prof, partySize: size }));
        }
        grid[`${persona}|${prof}|${size}`] = reports;
      }
    }
  }
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  // Per-size cross-tab (rows=persona, cols=profession, value=avg miles
  // and arrival %). One table per size to keep cell widths readable.
  for (const size of sizes) {
    console.log(`## Matrix — party size ${size}`);
    console.log(`| Persona | ${profIds.join(' | ')} |`);
    console.log(`| --- | ${profIds.map(() => '---').join(' | ')} |`);
    for (const persona of PERSONAS) {
      const cells: string[] = [];
      for (const prof of profIds) {
        const reports = grid[`${persona}|${prof}|${size}`];
        const avgMiles = reports.reduce((s, r) => s + r.milesTraveled, 0) / reports.length;
        const arrPct = Math.round((reports.filter((r) => r.outcome === 'arrived').length / reports.length) * 100);
        cells.push(`${Math.round(avgMiles)}mi/${arrPct}%`);
      }
      console.log(`| ${persona} | ${cells.join(' | ')} |`);
    }
    console.log();
    if (quiet) continue;
  }

  // Per-persona summary, averaged across professions, broken down by size.
  console.log(`## Per-persona summary (averaged across all professions, per size)`);
  console.log(`| Persona | Size | Avg days | Avg miles | Arrived % | Wiped % | Stalled % |`);
  console.log(`|---|---|---|---|---|---|---|`);
  for (const persona of PERSONAS) {
    for (const size of sizes) {
      let totDays = 0, totMiles = 0, totArr = 0, totWipe = 0, totStall = 0, total = 0;
      for (const prof of profIds) {
        for (const r of grid[`${persona}|${prof}|${size}`]) {
          totDays += r.daysElapsed; totMiles += r.milesTraveled;
          if (r.outcome === 'arrived') totArr++;
          else if (r.outcome === 'wiped') totWipe++;
          else totStall++;
          total++;
        }
      }
      console.log(`| ${persona} | ${size} | ${Math.round(totDays / total)} | ${Math.round(totMiles / total)} | ${Math.round((totArr / total) * 100)}% | ${Math.round((totWipe / total) * 100)}% | ${Math.round((totStall / total) * 100)}% |`);
    }
  }

  // Per-size summary, averaged across personas + professions — the
  // "headline" view of how party-size alone affects outcomes.
  console.log();
  console.log(`## Per-size summary (averaged across all personas + professions)`);
  console.log(`| Size | Avg days | Avg miles | Arrived % | Wiped % | Stalled % |`);
  console.log(`|---|---|---|---|---|---|`);
  for (const size of sizes) {
    let totDays = 0, totMiles = 0, totArr = 0, totWipe = 0, totStall = 0, total = 0;
    for (const persona of PERSONAS) {
      for (const prof of profIds) {
        for (const r of grid[`${persona}|${prof}|${size}`]) {
          totDays += r.daysElapsed; totMiles += r.milesTraveled;
          if (r.outcome === 'arrived') totArr++;
          else if (r.outcome === 'wiped') totWipe++;
          else totStall++;
          total++;
        }
      }
    }
    console.log(`| ${size} | ${Math.round(totDays / total)} | ${Math.round(totMiles / total)} | ${Math.round((totArr / total) * 100)}% | ${Math.round((totWipe / total) * 100)}% | ${Math.round((totStall / total) * 100)}% |`);
  }

  console.log();
  console.log(`Elapsed: ${elapsed}s`);
}

main();
