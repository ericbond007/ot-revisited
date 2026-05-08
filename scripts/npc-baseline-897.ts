// #897 — NPC persona baseline. For each PersonaId, generate a fresh
// NPC wagon, override personaId, tick a deterministic schedule, and
// report per-persona outcome stats. The output is the comparison
// point that subsequent persona-wiring slices (the gap audit's
// follow-up tickets) will be measured against.
//
// Schedule: 180 days. 6 travel days + 1 rest day per week (the
// emigrant standard). Mixed terrain pulled from a small loop.
// Weather mostly 'clear' with a few storms.
//
// Why direct tick instead of a full train run: #895 only wired
// `pickRations`. The other persona surface is still inert on the
// NPC path. A direct tick isolates the food-drain consequence of
// pickRations across personas without train-level noise (events,
// landmark interactions, captain decisions). Subsequent slices will
// expand the harness as more persona surface goes live.

import { tickNpcWagon } from '../src/lib/game/systems/npc-engine';
import type { NpcTickContext } from '../src/lib/game/systems/npc-engine';
import { generateTrain } from '../src/lib/game/content/trains';
import { makeRng } from '../src/lib/game/rng';
import type { NpcWagonState } from '../src/lib/game/types';
import type { PersonaId } from '../src/lib/game/ai/types';

const PERSONAS: PersonaId[] = [
  'cautious',
  'balanced',
  'aggressive',
  'chaos',
  'sunday_rester',
  'pace_pusher',
  'hoarder',
  'generous',
  'faithful',
  'drinker'
];

const FOOD_KEYS = [
  'game_meat', 'berries', 'egg', 'milk',
  'jerky', 'pemmican', 'salt_pork', 'bacon',
  'flour', 'cornmeal', 'beans', 'hardtack',
  'dried_fruit', 'cheese', 'butter'
];

function totalFood(inv: Record<string, number>): number {
  return FOOD_KEYS.reduce((sum, k) => sum + (inv[k] ?? 0), 0);
}

function aliveCount(w: NpcWagonState): number {
  return w.party.filter((m) => !m.dead).length;
}

interface PersonaResult {
  persona: PersonaId;
  outcome: NpcWagonState['outcome'];
  daysSurvived: number;
  alive: number;
  startingPartySize: number;
  finalFood: number;
  finalCash: number;
  finalMorale: number;
  oxAlive: number;
  rationsHistogram: Record<NpcWagonState['rations'], number>;
}

function buildCtx(day: number): NpcTickContext {
  const rest = day % 7 === 0;
  // Survivable prairie schedule — isolates rations math from
  // desert/storm noise. Once more persona surface is wired (#896
  // follow-ups) the harness can layer terrain/weather variance back
  // in to test those paths.
  return {
    day,
    traveled: !rest,
    pace: 'moderate',
    terrain: 'prairie',
    weather: day % 19 === 0 ? 'rain' : 'clear',
    traveledMiles: rest ? 0 : 14
  };
}

function runPersona(persona: PersonaId, days: number): PersonaResult {
  const seed = `npc-baseline-${persona}`;
  const train = generateTrain(seed, 1, 'independence_mo', makeRng(seed), { fresh: true });
  let wagon: NpcWagonState = { ...train.companions[0], personaId: persona };
  const startingPartySize = wagon.party.length;
  const rationsHistogram: Record<NpcWagonState['rations'], number> = {
    meager: 0,
    normal: 0,
    filling: 0
  };
  const tickRng = makeRng(`${seed}-tick`);
  let lastDay = 1;
  for (let d = 1; d <= days; d++) {
    // Simulate landmark / river-cross water refills the synthetic
    // harness can't drive directly. Real wagons top up at every
    // crossing + trading post (~every 5–10 days). Without this,
    // every persona dehydrates inside 2 weeks and the food-economy
    // signal is drowned by water death.
    if (d % 5 === 0) {
      wagon = { ...wagon, water: wagon.waterCap, dryDays: 0 };
    }
    const ctx = buildCtx(d);
    const { wagon: next } = tickNpcWagon(wagon, ctx, tickRng);
    wagon = next;
    rationsHistogram[wagon.rations] += 1;
    lastDay = d;
    if (wagon.outcome !== 'in-progress') break;
  }
  return {
    persona,
    outcome: wagon.outcome,
    daysSurvived: lastDay,
    alive: aliveCount(wagon),
    startingPartySize,
    finalFood: totalFood(wagon.inventory),
    finalCash: wagon.cash,
    finalMorale: wagon.morale,
    oxAlive: wagon.oxen.filter((o) => o.health > 0).length,
    rationsHistogram
  };
}

function table(rows: PersonaResult[]): string {
  const head = '| Persona | Outcome | Days | Alive | Food (lb) | Morale | Oxen | M/N/F rations |';
  const sep =  '|---|---|---|---|---|---|---|---|';
  const body = rows.map((r) => {
    const histo = `${r.rationsHistogram.meager}/${r.rationsHistogram.normal}/${r.rationsHistogram.filling}`;
    return `| ${r.persona} | ${r.outcome} | ${r.daysSurvived} | ${r.alive}/${r.startingPartySize} | ${r.finalFood} | ${r.finalMorale} | ${r.oxAlive} | ${histo} |`;
  }).join('\n');
  return [head, sep, body].join('\n');
}

function main() {
  const days = parseInt(process.argv[2] ?? '180', 10);
  console.log(`# NPC persona baseline — ${days} days`);
  console.log(`Schedule: 6 travel + 1 rest per week, mixed terrain, mostly clear weather.`);
  console.log();
  const rows = PERSONAS.map((p) => runPersona(p, days));
  console.log(table(rows));
}

main();
