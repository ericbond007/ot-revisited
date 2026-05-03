// #280b Per-wagon engine tick. NPC companion wagons advance through
// a focused subset of the daily systems alongside the player's
// state — they eat, get tired, fall sick, and possibly die.
//
// Scope (this branch):
//   - daily food consumption (own inventory drains)
//   - condition tick (cholera/typhoid/etc. — same dailyHealthDelta math)
//   - ox fatigue accrual on travel days; ox death from overwork
//   - starvation onset when food runs out
//   - death reaping (member.health <= 0 → dead)
//   - outcome update ('wiped' if all party dead; 'in-progress' otherwise)
//
// Out of scope (deferred):
//   - per-wagon weather effects (#280c)
//   - per-wagon dirty-water / disease rolls (#280c — needs water tracking)
//   - bot-driven decisions per wagon (rations, hunt, rest — #280d)
//   - per-wagon events (#280c — wheel breaks, snake bite, etc.)
//
// Why a separate file: existing systems take the full GameState. The
// NPC tick uses the WagonStateLike subset + an EngineContext for
// shared/global state (day, terrain, pace, etc.). Future iterations
// can extract the existing system math into parametric helpers and
// dedupe with this — but for now a focused reimpl keeps the existing
// 1400+ tests stable while NPCs come alive.

import type { Rng } from '../rng';
import type {
  NpcWagonState,
  Outcome,
  Pace,
  PartyMember,
  Terrain
} from '../types';
import { getCondition } from '../content/conditions';
import { hasLive } from '../professions/predicates';

/** Inputs the NPC tick needs from the train's shared environment. */
export interface NpcTickContext {
  /** Today's day number (for log entries). */
  day: number;
  /** True when the train moved today (oxen take fatigue). False on
   *  rest / camp days (oxen recover; food still drains). */
  traveled: boolean;
  /** Today's pace — drives ox fatigue accrual when traveling. */
  pace: Pace;
  /** Today's terrain — affects ox grazing recovery on rest days. */
  terrain: Terrain;
}

// Per-rations daily food draw (lb/eater/day). Matches the player's
// consumption math in `applyDailyConsumption` at a coarse level. Real
// engine adds diet-variety, hunt-haul priority, etc.; #280b is the
// minimum viable drain to cause attrition over time.
const RATIONS_LB_PER_EATER: Record<NpcWagonState['rations'], number> = {
  meager: 1.5,
  normal: 2.5,
  filling: 3.5
};

// Food draw priority — game meat first (spoils), then staples.
const FOOD_DRAW_ORDER = [
  'game_meat', 'berries', 'egg', 'milk',
  'jerky', 'pemmican', 'salt_pork', 'bacon',
  'flour', 'cornmeal', 'beans', 'hardtack',
  'dried_fruit', 'cheese', 'butter'
];

// Fatigue accrual per pace. Same shape as engine's
// FATIGUE_PER_DAY_BY_PACE in systems/oxen.ts.
const NPC_FATIGUE_PER_DAY: Record<Pace, number> = {
  slow: 2,
  moderate: 4,
  fast: 6,
  grueling: 9
};

// Doctor profession dampens condition damage 30%, same as player path
// (engine #154). Mirror the constant locally — keeping this dependency
// explicit makes the future system-extraction obvious.
const DOCTOR_RELIEF_MULT = 0.7;

// Treatment item halves daily condition damage + 25% chance to clear.
// Mirrors `progressConditions` for the player.
const TREATMENT_DAMAGE_MULT = 0.5;
const TREATMENT_CURE_CHANCE = 0.25;

// Starvation drain — when food=0, every alive party member loses HP
// at this rate per day. Modest at first (2 days you can sleep through);
// after multiple days the cumulative drop kills the wagon.
const STARVATION_HP_PER_DAY = 4;

function consumeFood(
  inventory: Record<string, number>,
  drawLb: number
): { inventory: Record<string, number>; ate: number } {
  const next = { ...inventory };
  let remaining = drawLb;
  for (const id of FOOD_DRAW_ORDER) {
    if (remaining <= 0) break;
    const have = next[id] ?? 0;
    if (have <= 0) continue;
    const take = Math.min(have, remaining);
    next[id] = have - take;
    remaining -= take;
  }
  return { inventory: next, ate: drawLb - remaining };
}

function npcHasLiveDoctor(wagon: NpcWagonState): boolean {
  return hasLive(wagon, 'doctor');
}

function tickConditions(wagon: NpcWagonState, rng: Rng): NpcWagonState {
  const reliefMult = npcHasLiveDoctor(wagon) ? DOCTOR_RELIEF_MULT : 1.0;
  const inventory: Record<string, number> = { ...wagon.inventory };
  const party: PartyMember[] = wagon.party.map((m) => {
    if (m.dead) return m;
    let healthDelta = 0;
    const nextConditions: typeof m.conditions = [];
    for (const c of m.conditions) {
      const meta = getCondition(c.id);
      // Treatment item — halves damage + 25% cure roll.
      const treatment = (meta.treatmentItems ?? []).find(
        (id) => (inventory[id] ?? 0) > 0
      );
      if (treatment) {
        inventory[treatment] = (inventory[treatment] ?? 0) - 1;
        if (rng.chance(TREATMENT_CURE_CHANCE)) {
          continue; // condition cleared
        }
        healthDelta += meta.dailyHealthDelta * reliefMult * TREATMENT_DAMAGE_MULT;
      } else {
        healthDelta += meta.dailyHealthDelta * reliefMult;
      }
      nextConditions.push({ ...c, daysSinceOnset: c.daysSinceOnset + 1 });
    }
    const health = Math.max(0, Math.min(100, m.health + Math.round(healthDelta)));
    return { ...m, health, conditions: nextConditions };
  });
  return { ...wagon, party, inventory };
}

function tickOxenTravel(wagon: NpcWagonState, ctx: NpcTickContext): NpcWagonState {
  const fatigueAdd = NPC_FATIGUE_PER_DAY[ctx.pace];
  const oxen = wagon.oxen.map((o) => {
    if (o.health <= 0) return o;
    const fatigue = Math.min(100, o.fatigue + fatigueAdd);
    // Overwork: at 100 fatigue, lose ~3 HP/day. Compounds → death.
    const healthDrain = fatigue >= 100 ? 3 : 0;
    const health = Math.max(0, o.health - healthDrain);
    return { ...o, fatigue, health };
  });
  return { ...wagon, oxen };
}

function tickOxenRest(wagon: NpcWagonState, ctx: NpcTickContext): NpcWagonState {
  // Recovery on rest/camp days. Terrain modulates: prairie grazing
  // recovers fast (15/day), mountains/desert slowly (5/day).
  const recovery = ctx.terrain === 'desert' || ctx.terrain === 'mountains' ? 5 : 15;
  const oxen = wagon.oxen.map((o) => {
    if (o.health <= 0) return o;
    return { ...o, fatigue: Math.max(0, o.fatigue - recovery) };
  });
  return { ...wagon, oxen };
}

function applyStarvation(wagon: NpcWagonState): NpcWagonState {
  // Counts every food item in FOOD_DRAW_ORDER + grain (ox feed
  // doesn't count as people food, but if everything else is zero
  // they're starving regardless).
  const food = FOOD_DRAW_ORDER.reduce(
    (sum, id) => sum + (wagon.inventory[id] ?? 0),
    0
  );
  if (food > 0) return wagon;
  const party = wagon.party.map((m) => {
    if (m.dead) return m;
    return { ...m, health: Math.max(0, m.health - STARVATION_HP_PER_DAY) };
  });
  return { ...wagon, party };
}

function reapDead(wagon: NpcWagonState, day: number): NpcWagonState {
  let logged: string[] = [];
  const party = wagon.party.map((m) => {
    if (m.dead) return m;
    if (m.health > 0) return m;
    logged.push(m.name);
    return { ...m, dead: true, deathDay: day, deathCause: 'attrition' };
  });
  if (logged.length === 0) return wagon;
  const log = logged.map(
    (name) => ({ day, text: `${name} died — the trail took them.` })
  );
  return {
    ...wagon,
    party,
    eventLog: [...wagon.eventLog, ...log]
  };
}

function updateOutcome(wagon: NpcWagonState): NpcWagonState {
  // Per-wagon wipe condition: every party member dead.
  const allDead = wagon.party.every((m) => m.dead);
  if (allDead && wagon.outcome === 'in-progress') {
    return { ...wagon, outcome: 'wiped' as Outcome };
  }
  return wagon;
}

/** Advance one NPC wagon by one day. The order mirrors the player's
 *  daily pipeline at a coarse level: conditions drain HP first
 *  (treatments may consume inventory), then food consumption, then
 *  starvation onset if food=0, then ox fatigue/recovery, then death
 *  reaping, then outcome update. */
export function tickNpcWagon(
  wagon: NpcWagonState,
  ctx: NpcTickContext,
  rng: Rng
): NpcWagonState {
  // Already-finished wagons don't tick — they sit in their final state
  // for the wagon-party view (#280d) until the run ends.
  if (wagon.outcome !== 'in-progress') return wagon;

  let next = wagon;

  // 1. Conditions tick + treatment.
  next = tickConditions(next, rng);

  // 2. Food consumption.
  const eaters = next.party.filter((m) => !m.dead).length;
  if (eaters > 0) {
    const drawLb = eaters * RATIONS_LB_PER_EATER[next.rations];
    const result = consumeFood(next.inventory, drawLb);
    next = { ...next, inventory: result.inventory };
  }

  // 3. Starvation if food=0.
  next = applyStarvation(next);

  // 4. Ox tick — fatigue on travel, recovery on rest.
  next = ctx.traveled ? tickOxenTravel(next, ctx) : tickOxenRest(next, ctx);

  // 5. Death reaping.
  next = reapDead(next, ctx.day);

  // 6. Outcome.
  next = updateOutcome(next);

  return next;
}
