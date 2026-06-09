// #897 — NPC persona baseline. For each PersonaId, generate a fresh
// NPC wagon, override personaId, tick a deterministic schedule
// punctuated by synthetic trading-post visits, and report per-persona
// outcome stats. The output is the comparison point that subsequent
// persona-wiring slices (the gap audit's follow-up tickets) are
// measured against.
//
// Schedule: 180 days. 6 travel days + 1 rest day per week (the
// emigrant standard). Prairie terrain, mostly clear weather. Posts
// every ~30 days hit the real trail order (Kearny → Laramie →
// Bridger → Hall → Boise) and drive applyNpcPostRestock — which
// since #911 runs the full six-slice shopping basket on each visit.
//
// #914 — Extended with the post schedule so the landmark-time wires
// (#899 / #902 / #905 / #906 / #909 / #911) actually move the table.
// Pre-#914 the harness only ticked, missing every restock decision.

import { tickNpcWagon } from '../src/lib/game/systems/npc-engine';
import type { NpcTickContext } from '../src/lib/game/systems/npc-engine';
import { applyNpcPostRestock } from '../src/lib/game/systems/wagon-train';
import { generateTrain } from '../src/lib/game/content/trains';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState, NpcWagonState, WagonTrain } from '../src/lib/game/types';
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
  /** #914 — posts visited and total cash spent on restocks. */
  postsVisited: number;
  cashSpentAtPosts: number;
}

/** #914 — synthetic post schedule. Real trail order, ~30 days apart
 *  at 14 mi/day. Each visit fires applyNpcPostRestock so the persona
 *  spread actually expresses through the shopping basket. */
const POST_SCHEDULE: { day: number; landmarkId: string }[] = [
  { day: 30, landmarkId: 'ft_kearny' },
  { day: 60, landmarkId: 'ft_laramie' },
  { day: 90, landmarkId: 'ft_bridger' },
  { day: 120, landmarkId: 'ft_hall' },
  { day: 150, landmarkId: 'ft_boise' }
];

/** #914 — drive a single applyNpcPostRestock visit on the harness
 *  wagon. Wraps it in a one-companion train inside a minimal
 *  GameState, calls the production restock function, extracts the
 *  updated wagon. Cash spent is the delta. */
function applyPostVisit(
  wagon: NpcWagonState,
  day: number,
  landmarkId: string,
  year: number
): { wagon: NpcWagonState; cashDelta: number } {
  const seed = `${wagon.seed}:harness-post`;
  const playerState = createInitialState({
    seed,
    leader: { name: 'Harness', profession: 'farmer' },
    companions: [{ name: 'Wagonmate', profession: 'doctor' }],
    startDate: { year, month: 4, day: 15 }
  });
  const train: WagonTrain = {
    id: `harness-train-${day}`,
    name: 'Harness Company',
    joinedDay: 1,
    joinedAtLandmarkId: 'independence_mo',
    leaderId: 'player',
    companions: [wagon]
  };
  const fauxState: GameState = {
    ...playerState,
    day,
    location: { ...playerState.location, atLandmarkId: landmarkId },
    flags: {},
    wagonTrain: train
  };
  const before = wagon.cash;
  const result = applyNpcPostRestock(fauxState);
  const updated = result.wagonTrain!.companions[0];
  return { wagon: updated, cashDelta: before - updated.cash };
}

function buildCtx(day: number): NpcTickContext {
  const rest = day % 7 === 0;
  // #1266 stage2 — every other rest day is a RIVER camp (fortnightly),
  // matching real trail cadence (the Platte/Sweetwater/Snake legs hug
  // water). Without river camps the cleanliness systems (which NPCs now
  // run) have no wash opportunity and the schedule becomes an unwinnable
  // filth spiral for player and NPC alike — the pre-#1266 pure-prairie
  // schedule was only survivable because NPCs skipped cleanliness.
  // Weekly river camps: the Platte/Sweetwater/Snake legs camped at water
  // most nights; one watered camp per week is conservative-realistic.
  const riverCamp = rest;
  const terrain = riverCamp ? ('river' as const) : ('prairie' as const);
  return {
    day,
    traveled: !rest,
    pace: 'moderate',
    terrain,
    // The synth reads location.terrain (NOT ctx.terrain) — pass a real
    // location so river camps reach the bundle's wash scoring.
    location: {
      trailPosition: day * 14,
      nextLandmarkId: 'lone_elm_campground',
      previousLandmarkId: null,
      milesTraveled: day * 14,
      terrain
    },
    weather: day % 19 === 0 ? 'rain' : 'clear',
    traveledMiles: rest ? 0 : 14
  };
}

/** #916 — shared seed across all personas. The original harness used
 *  per-persona seeds which drew different profiles per row (cautious
 *  → Donner 9 souls, chaos → Meek 2 souls, etc.). That confounded
 *  party size with persona, making lifespans unfair to compare. With
 *  a shared seed, every row runs against the same profile (Bidwell-
 *  Bartleson, 4 souls, $122 cash) and only persona varies. */
const SHARED_BASELINE_SEED = 'npc-baseline-shared';

function runPersona(persona: PersonaId, days: number, year: number): PersonaResult {
  const train = generateTrain(SHARED_BASELINE_SEED, 1, 'independence_mo', makeRng(SHARED_BASELINE_SEED), { fresh: true });
  let wagon: NpcWagonState = { ...train.companions[0], personaId: persona };
  const startingPartySize = wagon.party.length;
  const rationsHistogram: Record<NpcWagonState['rations'], number> = {
    meager: 0,
    normal: 0,
    filling: 0
  };
  // Per-persona tick RNG so chaos remains seed-deterministic AND the
  // tick stream diverges across rows (otherwise every row would draw
  // identical event rolls).
  const tickRng = makeRng(`${SHARED_BASELINE_SEED}-tick-${persona}`);
  let lastDay = 1;
  let postsVisited = 0;
  let cashSpentAtPosts = 0;
  // Index into POST_SCHEDULE — advance as days pass.
  let nextPostIdx = 0;
  for (let d = 1; d <= days; d++) {
    // Simulate landmark / river-cross water refills the synthetic
    // harness can't drive directly. Real wagons top up at every
    // crossing + trading post (~every 5–10 days). Without this,
    // every persona dehydrates inside 2 weeks and the food-economy
    // signal is drowned by water death.
    if (d % 5 === 0) {
      wagon = { ...wagon, water: wagon.waterCap, dryDays: 0 };
    }
    // #914 — synthetic post visit. Drives applyNpcPostRestock against
    // a real trading_post landmark so the full shopping basket fires
    // (food + warmth + equipment + ox swap + smithy + medicine etc.).
    if (nextPostIdx < POST_SCHEDULE.length && d === POST_SCHEDULE[nextPostIdx].day) {
      const visit = applyPostVisit(wagon, d, POST_SCHEDULE[nextPostIdx].landmarkId, year);
      wagon = visit.wagon;
      cashSpentAtPosts += visit.cashDelta;
      postsVisited += 1;
      nextPostIdx += 1;
      // The visit doesn't itself advance the day — fall through to
      // tickNpcWagon below for the regular daily attrition.
    }
    const ctx = buildCtx(d);
    const { wagon: next } = tickNpcWagon(wagon, ctx, tickRng);
    wagon = next;
    // River camp = water access: top the keg up to cap, as a real wagon
    // would (player equivalent: the #1039 water-source refills + nightly
    // camps at the river). Without this, mortal wagons dehydrate on the
    // harness's synthetic schedule no matter what they do.
    if (ctx.terrain === 'river') {
      wagon = { ...wagon, water: wagon.waterCap, dryDays: 0 };
    }
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
    rationsHistogram,
    postsVisited,
    cashSpentAtPosts
  };
}

function table(rows: PersonaResult[]): string {
  const head = '| Persona | Outcome | Days | Alive | Food (lb) | Cash | Morale | Oxen | Posts | $ at posts | M/N/F rations |';
  const sep =  '|---|---|---|---|---|---|---|---|---|---|---|';
  const body = rows.map((r) => {
    const histo = `${r.rationsHistogram.meager}/${r.rationsHistogram.normal}/${r.rationsHistogram.filling}`;
    return `| ${r.persona} | ${r.outcome} | ${r.daysSurvived} | ${r.alive}/${r.startingPartySize} | ${r.finalFood} | $${r.finalCash} | ${r.finalMorale} | ${r.oxAlive} | ${r.postsVisited} | $${r.cashSpentAtPosts.toFixed(0)} | ${histo} |`;
  }).join('\n');
  return [head, sep, body].join('\n');
}

function main() {
  const days = parseInt(process.argv[2] ?? '180', 10);
  const year = parseInt(process.argv[3] ?? '1849', 10);
  console.log(`# NPC persona baseline — ${days} days (${year} run)`);
  console.log(`Schedule: 6 travel + 1 rest per week, prairie terrain, mostly clear weather.`);
  console.log(`Posts visited: ${POST_SCHEDULE.map((p) => `${p.landmarkId}@d${p.day}`).join(', ')}`);
  console.log();
  const rows = PERSONAS.map((p) => runPersona(p, days, year));
  console.log(table(rows));
}

main();
