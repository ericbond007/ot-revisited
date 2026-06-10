// #1280/#1281 — per-leg pacing + water diagnosis. Runs the bot N times per
// persona (same fixed party as bot-stats-250) and emits a trail-ordered table:
// for each leg, avg days spent (split travel/rest/find-water/other), realized
// miles/day, avg keg %, dry-day share, deaths. The "where does the calendar
// go / where does the water go" answer for the stalls + dehydration findings.
//
// Usage: npx tsx scripts/leg-pacing-1280.ts [--runs 100] [--personas balanced,aggressive,cautious] [--out /tmp/leg-pacing.md]

import { runBot } from '../src/lib/dev/bot/runner';
import type { BotRunReport } from '../src/lib/dev/bot/types';
import { LANDMARKS, getLandmark } from '../src/lib/game/content/landmarks';
import type { PersonaId } from '../src/lib/game/ai/types';
import { writeFileSync } from 'node:fs';

const ALL: PersonaId[] = [
  'cautious', 'balanced', 'aggressive', 'chaos', 'sunday_rester',
  'pace_pusher', 'hoarder', 'generous', 'faithful', 'drinker'
];

const argRuns = process.argv.indexOf('--runs');
const RUNS = argRuns !== -1 ? parseInt(process.argv[argRuns + 1], 10) : 100;
const argP = process.argv.indexOf('--personas');
const PERSONAS: PersonaId[] = argP !== -1
  ? (process.argv[argP + 1].split(',') as PersonaId[])
  : ALL;
const argOut = process.argv.indexOf('--out');
const OUT = argOut !== -1 ? process.argv[argOut + 1] : '/tmp/leg-pacing-1280.md';

// Trail order: 'start' first, then landmarks by catalog order (LANDMARKS is
// already trail-ordered in content).
const LEG_ORDER: string[] = ['start', ...LANDMARKS.map((l) => l.id)];
const legIndex = new Map(LEG_ORDER.map((id, i) => [id, i]));

function legLabel(key: string): string {
  if (key === 'start') return '(jump-off) → ' + LANDMARKS[0].name;
  const i = LEG_ORDER.indexOf(key);
  const next = i >= 0 && i + 1 < LEG_ORDER.length ? getLandmark(LEG_ORDER[i + 1]).name : 'Oregon City';
  try { return `${getLandmark(key).name} → ${next}`; } catch { return key; }
}

interface Agg {
  days: number; travelDays: number; restDays: number; findWaterDays: number;
  otherDays: number; miles: number; dryDays: number; kegPctSum: number;
  kegSamples: number; deaths: number; runsTouched: number;
}
function newAgg(): Agg {
  return { days: 0, travelDays: 0, restDays: 0, findWaterDays: 0, otherDays: 0, miles: 0, dryDays: 0, kegPctSum: 0, kegSamples: 0, deaths: 0, runsTouched: 0 };
}

const lines: string[] = [];
function out(s = ''): void { lines.push(s); console.log(s); }

out(`# Per-leg pacing + water — ${RUNS} runs × ${PERSONAS.length} personas (${PERSONAS.join(', ')})`);
out();
out(`Same fixed party as bot-stats-250 (farmer+doctor+hunter+teamster+2 kids), 1849-04-15, 220-day cap.`);
out(`Days are attributed to the leg where the iteration STARTED. "dry%" = share of leg-days with keg at 0.`);
out();

const t0 = Date.now();
const perPersona: Record<string, Record<string, Agg>> = {};
const combined: Record<string, Agg> = {};
let totalRuns = 0;

for (const persona of PERSONAS) {
  const agg: Record<string, Agg> = {};
  for (let i = 0; i < RUNS; i++) {
    const r: BotRunReport = runBot({
      seed: `stats250:${persona}:${i}`,
      persona, leaderProfession: 'farmer', partySize: 4, childCount: 2
    });
    totalRuns += 1;
    for (const [key, b] of Object.entries(r.legStats)) {
      for (const store of [agg, combined]) {
        const a = store[key] ?? (store[key] = newAgg());
        a.days += b.days; a.travelDays += b.travelDays; a.restDays += b.restDays;
        a.findWaterDays += b.findWaterDays; a.otherDays += b.otherDays;
        a.miles += b.miles; a.dryDays += b.dryDays; a.kegPctSum += b.kegPctSum;
        a.kegSamples += b.kegSamples; a.deaths += b.deaths; a.runsTouched += 1;
      }
    }
  }
  perPersona[persona] = agg;
}

function table(agg: Record<string, Agg>, runs: number): void {
  out(`| Leg | Runs reached | Days/run | travel | rest | findH₂O | other | mi/day | keg avg | dry% | deaths |`);
  out(`|---|---|---|---|---|---|---|---|---|---|---|`);
  const keys = Object.keys(agg).sort((a, b) => (legIndex.get(a) ?? 999) - (legIndex.get(b) ?? 999));
  for (const key of keys) {
    const a = agg[key];
    if (a.runsTouched === 0 || a.days === 0) continue;
    const dpr = a.days / a.runsTouched;
    const mipd = a.travelDays > 0 ? a.miles / a.days : 0;
    const keg = a.kegSamples > 0 ? (a.kegPctSum / a.kegSamples) * 100 : 0;
    const dry = a.kegSamples > 0 ? (a.dryDays / a.kegSamples) * 100 : 0;
    out(`| ${legLabel(key)} | ${a.runsTouched} (${Math.round((a.runsTouched / runs) * 100)}%) | ${dpr.toFixed(1)} | ${(a.travelDays / a.runsTouched).toFixed(1)} | ${(a.restDays / a.runsTouched).toFixed(1)} | ${(a.findWaterDays / a.runsTouched).toFixed(1)} | ${(a.otherDays / a.runsTouched).toFixed(1)} | ${mipd.toFixed(1)} | ${keg.toFixed(0)}% | ${dry.toFixed(0)}% | ${a.deaths} |`);
  }
}

out(`## All personas combined (${totalRuns} runs)`);
out();
table(combined, totalRuns);
out();

for (const persona of PERSONAS) {
  out(`## ${persona}`);
  out();
  table(perPersona[persona], RUNS);
  out();
}

out(`Elapsed: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
writeFileSync(OUT, lines.join('\n') + '\n');
console.log(`\nreport written: ${OUT}`);
