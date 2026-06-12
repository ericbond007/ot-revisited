// #1403 morale probe — 50 runs × 3 personas (balanced/cautious/pace_pusher)
// Fixed party: farmer + doctor + hunter + teamster + 2 children (6 souls).
// Captures per-iteration morale via onIterationEnd.
// Target: run-min median 50–65; finals ≥80; days<20 <3/run; days@0 ~0.

import { runBot } from '../src/lib/dev/bot/runner';
import type { PersonaId } from '../src/lib/game/ai/types';

const PERSONAS: PersonaId[] = ['balanced', 'cautious', 'pace_pusher'];
const RUNS = 50;

function median(ns: number[]): number {
  if (!ns.length) return 0;
  const s = [...ns].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}
function avg(ns: number[]): number {
  return ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : 0;
}
function pct(n: number, d: number): string {
  return d === 0 ? '0%' : `${Math.round((n / d) * 100)}%`;
}

const allFinals: number[] = [];
const allMins: number[] = [];
const allAt0: number[] = [];
const allLt20: number[] = [];

// separate: runs that had at least one death
const deathRunMins: number[] = [];

for (const persona of PERSONAS) {
  const finals: number[] = [];
  const mins: number[] = [];
  const at0perRun: number[] = [];
  const lt20perRun: number[] = [];
  let arrivalCount = 0;
  let runsWithDeaths = 0;
  const deathRunMinsLocal: number[] = [];

  for (let i = 0; i < RUNS; i++) {
    const moralePoints: number[] = [];

    const r = runBot({
      seed: `morale1403:${persona}:${i}`,
      persona,
      leaderProfession: 'farmer',
      partySize: 4,
      childCount: 2,
      onIterationEnd: (_before, after, _actionType, _delta) => {
        moralePoints.push(after.morale);
      }
    });

    finals.push(r.finalState.morale);
    if (r.outcome === 'arrived') arrivalCount++;

    const runMin = moralePoints.length ? Math.min(...moralePoints) : r.finalState.morale;
    mins.push(runMin);

    const nAt0 = moralePoints.filter((v) => v === 0).length;
    const nLt20 = moralePoints.filter((v) => v < 20).length;
    at0perRun.push(nAt0);
    lt20perRun.push(nLt20);

    // check for deaths
    const anyDead = r.finalState.party.some((m) => m.dead);
    if (anyDead) {
      runsWithDeaths++;
      deathRunMinsLocal.push(runMin);
    }
  }

  const medMin = median(mins);
  const medFinal = median(finals);

  console.log(`\n=== ${persona} (${RUNS} runs, arrived: ${arrivalCount}/${RUNS}) ===`);
  console.log(`  median final morale:           ${medFinal}  (avg: ${avg(finals).toFixed(1)}, min: ${Math.min(...finals)})`);
  console.log(`  median run-min morale (ALL):   ${medMin}  (avg: ${avg(mins).toFixed(1)}, min: ${Math.min(...mins)})`);
  console.log(`  median iters@0/run:            ${median(at0perRun)}   median iters<20/run: ${median(lt20perRun)}`);
  console.log(`  runs with ≥1 death: ${runsWithDeaths}/${RUNS}  median run-min (death runs): ${deathRunMinsLocal.length ? median(deathRunMinsLocal) : 'N/A'}`);

  allFinals.push(...finals);
  allMins.push(...mins);
  allAt0.push(...at0perRun);
  allLt20.push(...lt20perRun);
  deathRunMins.push(...deathRunMinsLocal);
}

console.log(`\n=== GRAND SUMMARY (${PERSONAS.length * RUNS} total runs) ===`);
console.log(`  median final morale (all):       ${median(allFinals)}`);
console.log(`  median run-min morale (all):     ${median(allMins)}`);
console.log(`  median run-min (death runs):     ${deathRunMins.length ? median(deathRunMins) : 'N/A'}  (n=${deathRunMins.length})`);
console.log(`  median iters@0/run:              ${median(allAt0)}`);
console.log(`  median iters<20/run:             ${median(allLt20)}`);
