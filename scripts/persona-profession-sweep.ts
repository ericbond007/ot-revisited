// Persona × profession sweep. Crosses every named PersonaId with every
// ProfessionId, N replicas each, prints a markdown table.
//
// Usage: npx tsx scripts/persona-profession-sweep.ts [--runs N] [--tag baseline]

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

  const profIds = Object.keys(PROFESSIONS) as ProfessionId[];

  console.log(`# Persona × profession sweep — ${tag}`);
  console.log(`Runs per cell: ${runs}. Personas: ${PERSONAS.length}. Professions: ${profIds.length}. Total: ${PERSONAS.length * profIds.length * runs}.`);
  console.log();

  // Pre-compute all runs once and cache per (persona, prof) so the
  // matrix and the per-persona summary both read the same data.
  const grid: Record<string, ReturnType<typeof runBot>[]> = {};
  const start = Date.now();
  for (const persona of PERSONAS) {
    for (const prof of profIds) {
      const reports: ReturnType<typeof runBot>[] = [];
      for (let i = 0; i < runs; i++) {
        const seed = `${tag}-${persona}-${prof}-${i}`;
        reports.push(runBot({ seed, persona, leaderProfession: prof }));
      }
      grid[`${persona}|${prof}`] = reports;
    }
  }
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  // Matrix: rows = personas, cols = professions, value = avg miles / arrival %
  console.log(`| Persona | ${profIds.join(' | ')} |`);
  console.log(`| --- | ${profIds.map(() => '---').join(' | ')} |`);
  for (const persona of PERSONAS) {
    const cells: string[] = [];
    for (const prof of profIds) {
      const reports = grid[`${persona}|${prof}`];
      const avgMiles = reports.reduce((s, r) => s + r.milesTraveled, 0) / reports.length;
      const arrPct = Math.round((reports.filter((r) => r.outcome === 'arrived').length / reports.length) * 100);
      cells.push(`${Math.round(avgMiles)}mi/${arrPct}%`);
    }
    console.log(`| ${persona} | ${cells.join(' | ')} |`);
  }

  // Per-persona summary, averaged across professions.
  console.log();
  console.log(`## Per-persona summary (averaged across all professions)`);
  console.log(`| Persona | Avg days | Avg miles | Arrived % | Wiped % | Stalled % |`);
  console.log(`|---|---|---|---|---|---|`);
  for (const persona of PERSONAS) {
    let totDays = 0, totMiles = 0, totArr = 0, totWipe = 0, totStall = 0, total = 0;
    for (const prof of profIds) {
      for (const r of grid[`${persona}|${prof}`]) {
        totDays += r.daysElapsed; totMiles += r.milesTraveled;
        if (r.outcome === 'arrived') totArr++;
        else if (r.outcome === 'wiped') totWipe++;
        else totStall++;
        total++;
      }
    }
    console.log(`| ${persona} | ${Math.round(totDays / total)} | ${Math.round(totMiles / total)} | ${Math.round((totArr / total) * 100)}% | ${Math.round((totWipe / total) * 100)}% | ${Math.round((totStall / total) * 100)}% |`);
  }
  console.log();
  console.log(`Elapsed: ${elapsed}s`);
}

main();
