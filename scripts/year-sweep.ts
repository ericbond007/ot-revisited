// Year sweep — does the start YEAR change outcomes? Sweeps the same
// seeds/personas across start years to surface the engine's year gates
// (canBoilWater >= 1854, Fort Hall abandonment 1856+, year-gated cholera
// arrival events, ferry/post period gates, raid/pan year floors).
//
// Party mirrors bot-stats-250's fixture: farmer leader + doctor + hunter
// + teamster + 2 children (6 souls). Same seeds across every (year,
// persona) cell — paired comparison.
//
// Usage: npx tsx scripts/year-sweep.ts [--runs 60] [--out /tmp/year-sweep.md]

import { runBot } from '../src/lib/dev/bot/runner';
import type { PersonaId } from '../src/lib/game/ai/types';
import { writeFileSync } from 'node:fs';

const argRuns = process.argv.indexOf('--runs');
const RUNS = argRuns !== -1 ? parseInt(process.argv[argRuns + 1], 10) : 60;
const argOut = process.argv.indexOf('--out');
const OUT = argOut !== -1 ? process.argv[argOut + 1] : '/tmp/year-sweep.md';

const YEARS = [1843, 1846, 1849, 1852, 1855, 1858];
const PERSONAS: PersonaId[] = ['balanced', 'cautious', 'pace_pusher'];

interface Cell {
  arrived: number; snowedIn: number; wiped: number; stalled: number;
  adultDeaths: number; childDeaths: number;
  causes: Record<string, number>;
  arrivalDays: number[];
  diseaseOnsets: number;
}

function newCell(): Cell {
  return { arrived: 0, snowedIn: 0, wiped: 0, stalled: 0, adultDeaths: 0, childDeaths: 0, causes: {}, arrivalDays: [], diseaseOnsets: 0 };
}
function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

const t0 = Date.now();
const cells = new Map<string, Cell>();

for (const year of YEARS) {
  for (const persona of PERSONAS) {
    const cell = newCell();
    cells.set(`${year}:${persona}`, cell);
    for (let i = 0; i < RUNS; i++) {
      const r = runBot({
        seed: `year:${i}`,
        persona,
        leaderProfession: 'farmer',
        companionProfessions: ['doctor', 'hunter', 'teamster'],
        childCount: 2,
        startDate: { year, month: 4, day: 15 }
      });
      if (r.outcome === 'arrived') { cell.arrived += 1; cell.arrivalDays.push(r.daysElapsed); }
      else if (r.outcome === 'snowed_in') cell.snowedIn += 1;
      else if (r.outcome === 'wiped') cell.wiped += 1;
      else cell.stalled += 1;
      for (const m of r.finalState.party) {
        if (!m.dead) continue;
        if (m.kind === 'child') cell.childDeaths += 1; else cell.adultDeaths += 1;
        const cause = m.deathCause ?? 'unknown';
        cell.causes[cause] = (cell.causes[cause] ?? 0) + 1;
      }
      cell.diseaseOnsets += Object.entries(r.eventsFiredById)
        .filter(([id]) => /cholera|dysentery|disease|sick/i.test(id))
        .reduce((s, [, n]) => s + n, 0);
    }
  }
}

const lines: string[] = [];
lines.push(`# Year sweep — ${RUNS} runs × ${PERSONAS.length} personas × ${YEARS.length} start years (Apr 15), 4 adults + 2 children`);
lines.push('');
for (const persona of PERSONAS) {
  lines.push(`## ${persona}`);
  lines.push('');
  lines.push('| Year | Arrived | Snowed in | Wiped | Stalled | Deaths/run (a+c) | Child share | Median arrival day | Disease-event fires/run | Top causes |');
  lines.push('|---|---|---|---|---|---|---|---|---|---|');
  for (const year of YEARS) {
    const c = cells.get(`${year}:${persona}`)!;
    const deaths = c.adultDeaths + c.childDeaths;
    const share = deaths > 0 ? `${Math.round((c.childDeaths / deaths) * 100)}%` : '—';
    const causes = Object.entries(c.causes).sort((a, b) => b[1] - a[1]).slice(0, 3)
      .map(([k, v]) => `${k} ${v}`).join(' · ') || '—';
    lines.push(`| ${year} | ${c.arrived} (${Math.round((c.arrived / RUNS) * 100)}%) | ${c.snowedIn} | ${c.wiped} | ${c.stalled} | ${(deaths / RUNS).toFixed(2)} (${c.adultDeaths}+${c.childDeaths}) | ${share} | ${median(c.arrivalDays)} | ${(c.diseaseOnsets / RUNS).toFixed(2)} | ${causes} |`);
  }
  lines.push('');
}
lines.push(`Elapsed: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
writeFileSync(OUT, lines.join('\n') + '\n');
console.log(lines.join('\n'));
