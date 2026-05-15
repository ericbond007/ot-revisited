// Persona × profession × party-shape sweep. Crosses every named
// PersonaId with every ProfessionId at multiple party shapes (adults +
// children), N replicas each, prints markdown tables.
//
// Usage:
//   npx tsx scripts/persona-profession-sweep.ts [--runs N] [--shapes <a/c,...>] [--tag baseline] [--quiet]
//
// A "shape" is `adults/children` — e.g. `2/2` is 2 adults + 2 children
// (the modal historical emigrant family per Faragher 1979 / Unruh 1979).
//
// Default shapes capture the period demographic spread:
//   3/0 — small adult-only party (current baseline, mid-range)
//   4/0 — bachelor / young-men wagon (Bidwell 1841, '49er archetype)
//   2/2 — modal emigrant family (parents + two children)
//   2/4 — large family wagon (Donner brothers, Sager 1844)
//
// Legacy `--sizes` flag is preserved as a shortcut: `--sizes 3,4` → shapes `3/0,4/0`.

import { runBot } from '../src/lib/dev/bot/runner';
import { PROFESSIONS } from '../src/lib/game/content/professions';
import type { ProfessionId } from '../src/lib/game/types';
import type { PersonaId } from '../src/lib/dev/bot/types';

const PERSONAS: PersonaId[] = [
  'cautious', 'balanced', 'aggressive', 'chaos',
  'sunday_rester', 'pace_pusher', 'hoarder', 'generous', 'faithful', 'drinker'
];

interface Shape {
  adults: number;
  children: number;
  label: string;
}

function parseShapes(arg: string): Shape[] {
  return arg.split(',')
    .map((s) => s.trim())
    .map((s) => {
      const [aStr, cStr = '0'] = s.split('/');
      const adults = parseInt(aStr, 10);
      const children = parseInt(cStr, 10);
      return { adults, children, label: `${adults}/${children}` };
    })
    .filter((sh) => sh.adults >= 2 && sh.adults <= 6 && sh.children >= 0 && sh.children <= 8);
}

function main() {
  const args = process.argv.slice(2);
  const runs = parseInt(args[args.indexOf('--runs') + 1] ?? '5', 10);
  const tag = args[args.indexOf('--tag') + 1] ?? `sweep-${Date.now()}`;
  let shapes: Shape[];
  if (args.indexOf('--shapes') >= 0) {
    shapes = parseShapes(args[args.indexOf('--shapes') + 1]);
  } else if (args.indexOf('--sizes') >= 0) {
    // legacy shortcut: convert sizes (adult-only) to shapes
    shapes = parseShapes(args[args.indexOf('--sizes') + 1].split(',').map((s) => `${s.trim()}/0`).join(','));
  } else {
    shapes = parseShapes('3/0,4/0,2/2,2/4');
  }
  const quiet = args.includes('--quiet');

  const profIds = Object.keys(PROFESSIONS) as ProfessionId[];

  const totalRuns = PERSONAS.length * profIds.length * shapes.length * runs;
  console.log(`# Persona × profession × shape sweep — ${tag}`);
  console.log(`Runs per cell: ${runs}. Personas: ${PERSONAS.length}. Professions: ${profIds.length}. Shapes: ${shapes.map((s) => s.label).join(', ')}. Total runs: ${totalRuns}.`);
  console.log();

  const grid: Record<string, ReturnType<typeof runBot>[]> = {};
  const start = Date.now();
  for (const persona of PERSONAS) {
    for (const prof of profIds) {
      for (const shape of shapes) {
        const reports: ReturnType<typeof runBot>[] = [];
        for (let i = 0; i < runs; i++) {
          const seed = `${tag}-${persona}-${prof}-${shape.label}-${i}`;
          reports.push(runBot({
            seed,
            persona,
            leaderProfession: prof,
            partySize: shape.adults,
            childCount: shape.children
          }));
        }
        grid[`${persona}|${prof}|${shape.label}`] = reports;
      }
    }
  }
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  // Per-shape cross-tab (rows=persona, cols=profession).
  for (const shape of shapes) {
    console.log(`## Matrix — party ${shape.label} (${shape.adults} adults + ${shape.children} children)`);
    console.log(`| Persona | ${profIds.join(' | ')} |`);
    console.log(`| --- | ${profIds.map(() => '---').join(' | ')} |`);
    for (const persona of PERSONAS) {
      const cells: string[] = [];
      for (const prof of profIds) {
        const reports = grid[`${persona}|${prof}|${shape.label}`];
        const avgMiles = reports.reduce((s, r) => s + r.milesTraveled, 0) / reports.length;
        const arrPct = Math.round((reports.filter((r) => r.outcome === 'arrived').length / reports.length) * 100);
        cells.push(`${Math.round(avgMiles)}mi/${arrPct}%`);
      }
      console.log(`| ${persona} | ${cells.join(' | ')} |`);
    }
    console.log();
    if (quiet) continue;
  }

  // Per-persona summary, averaged across professions, broken down by shape.
  console.log(`## Per-persona summary (averaged across all professions, per shape)`);
  console.log(`| Persona | Shape | Avg days | Avg miles | Arrived % | Wiped % | Stalled % |`);
  console.log(`|---|---|---|---|---|---|---|`);
  for (const persona of PERSONAS) {
    for (const shape of shapes) {
      let totDays = 0, totMiles = 0, totArr = 0, totWipe = 0, totStall = 0, total = 0;
      for (const prof of profIds) {
        for (const r of grid[`${persona}|${prof}|${shape.label}`]) {
          totDays += r.daysElapsed; totMiles += r.milesTraveled;
          if (r.outcome === 'arrived') totArr++;
          else if (r.outcome === 'wiped') totWipe++;
          else totStall++;
          total++;
        }
      }
      console.log(`| ${persona} | ${shape.label} | ${Math.round(totDays / total)} | ${Math.round(totMiles / total)} | ${Math.round((totArr / total) * 100)}% | ${Math.round((totWipe / total) * 100)}% | ${Math.round((totStall / total) * 100)}% |`);
    }
  }

  // Per-shape headline — how shape alone affects outcomes.
  console.log();
  console.log(`## Per-shape summary (averaged across all personas + professions)`);
  console.log(`| Shape | Avg days | Avg miles | Arrived % | Wiped % | Stalled % |`);
  console.log(`|---|---|---|---|---|---|`);
  for (const shape of shapes) {
    let totDays = 0, totMiles = 0, totArr = 0, totWipe = 0, totStall = 0, total = 0;
    for (const persona of PERSONAS) {
      for (const prof of profIds) {
        for (const r of grid[`${persona}|${prof}|${shape.label}`]) {
          totDays += r.daysElapsed; totMiles += r.milesTraveled;
          if (r.outcome === 'arrived') totArr++;
          else if (r.outcome === 'wiped') totWipe++;
          else totStall++;
          total++;
        }
      }
    }
    console.log(`| ${shape.label} | ${Math.round(totDays / total)} | ${Math.round(totMiles / total)} | ${Math.round((totArr / total) * 100)}% | ${Math.round((totWipe / total) * 100)}% | ${Math.round((totStall / total) * 100)}% |`);
  }

  console.log();
  console.log(`Elapsed: ${elapsed}s`);
}

main();
