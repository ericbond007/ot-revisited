// #963 audit: section-by-section trace of why bots don't finish.
// Runs ONE bot end-to-end with full persona logic and reports per-
// landmark progress. Combine with BOT_TRACE=N env var for per-N-day
// detail.

import { LANDMARKS } from '../src/lib/game/content/landmarks';
import { runBot } from '../src/lib/dev/bot/runner';
import type { PersonaId } from '../src/lib/dev/bot/types';
import type { ProfessionId } from '../src/lib/game/types';

function nearestLandmark(milesTraveled: number): string {
  let running = 0;
  let best = 'start';
  for (const l of LANDMARKS) {
    if (running > milesTraveled) break;
    best = l.id;
    running += l.milesFromPrevious;
  }
  return best;
}

function main() {
  const persona = (process.argv[2] ?? 'balanced') as PersonaId;
  const profession = (process.argv[3] ?? 'farmer') as ProfessionId;
  const seed = process.argv[4] ?? 'section-trace';

  const r = runBot({ seed, persona, leaderProfession: profession });

  console.log(`Persona: ${persona} × ${profession}, seed: ${seed}`);
  console.log(`Outcome: ${r.outcome}  Days: ${r.daysElapsed}  Miles: ${r.milesTraveled}`);
  console.log(`Final cash: $${r.finalCash}, morale: ${r.finalMorale}, alive: ${r.endingAliveCount}/${r.startingPartySize}`);
  console.log(`Final landmark area: ${nearestLandmark(r.milesTraveled)}`);
  console.log();

  const a = r.actionDays;
  const moveDays = a.travel + a.eventChoice;
  console.log(`Action breakdown (${r.daysElapsed}-day total): travel ${a.travel} + eventDays ${a.eventChoice} = ${moveDays} moving days`);
  console.log(`  rest ${a.rest}, findWater ${a.findWater}, hunt ${a.hunt}, ford ${a.ford}, post ${a.tradingPost}`);
  console.log(`  Miles per moving day: ${(r.milesTraveled / Math.max(1, moveDays)).toFixed(2)}`);
  console.log();

  const milestones = [
    { name: 'Independence', mile: 0 },
    { name: 'Fort Kearny', mile: 318 },
    { name: 'Fort Laramie', mile: 650 },
    { name: 'Independence Rock', mile: 825 },
    { name: 'South Pass', mile: 945 },
    { name: 'Fort Bridger', mile: 1090 },
    { name: 'Fort Hall', mile: 1262 },
    { name: 'Fort Boise', mile: 1532 },
    { name: 'Whitman Mission', mile: 1690 },
    { name: 'The Dalles', mile: 1947 },
    { name: 'Oregon City', mile: 2195 }
  ];
  console.log(`Landmark milestones:`);
  for (const m of milestones) {
    const got = r.milesTraveled >= m.mile ? '✓' : '✗';
    const pct = m.mile > 0 ? `${Math.round((r.milesTraveled / m.mile) * 100)}%` : '-';
    console.log(`  ${got} mile ${String(m.mile).padStart(4)}  ${m.name.padEnd(22)} (bot at ${pct} of target)`);
  }
  console.log();

  console.log(`Top 12 events fired (unique=${r.uniqueEventCount}, drama=${r.dramaBeatCount}):`);
  const evtRows = Object.entries(r.eventsFiredById as Record<string, number>)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);
  for (const [id, n] of evtRows) {
    console.log(`  ${id.padEnd(48)} ${n}`);
  }

  if (Object.keys(r.deathsByCause).length > 0) {
    console.log(`\nDeaths:`);
    for (const [cause, n] of Object.entries(r.deathsByCause)) {
      console.log(`  ${cause.padEnd(30)} ${n}`);
    }
  }
}

main();
