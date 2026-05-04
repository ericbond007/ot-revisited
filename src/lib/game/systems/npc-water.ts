// #303e — NPC water systems. Mirrors the player's water pipeline at a
// per-wagon level: daily consumption (clean first, then dirty), keg-dry
// dehydration HP/morale damage, dirty-water dysentery / cholera roll.
//
// Keeps the per-wagon math local instead of parametrizing the player
// systems — same shape decision as #295 (npc-engine.ts re-implements
// food consumption rather than sharing applyDailyConsumption). When
// the player water systems extract to a `WagonStateLike` form, this
// module becomes the second consumer.

import type { NpcWagonState, Weather } from '../types';
import type { Rng } from '../rng';
import { weatherWaterMult } from './weather';
import { hasLive } from '../professions/predicates';

/** Per-adult daily water draw in gallons. Matches player's
 *  WATER_PER_ADULT_GAL in consumption.ts. */
const WATER_PER_ADULT_GAL = 1;
/** Children drink 70% of an adult's ration. Matches player CHILD_WATER_MULT. */
const CHILD_WATER_MULT = 0.7;

/** Daily dirty-water disease chance per drinking adult; doctor halves
 *  it. Matches player DIRTY_WATER_DISEASE_CHANCE. */
const DIRTY_WATER_DISEASE_CHANCE = 0.05;
const DIRTY_WATER_DISEASE_CHANCE_DOCTOR = 0.025;

/** Dehydration damage curve — health hit per consecutive dry day.
 *  Mirrors player applyDehydration HEALTH_PER_DRY_DAY. */
const HEALTH_PER_DRY_DAY = [0, 0, 10, 20, 30, 40] as const;
/** Morale hit per consecutive dry day. Mirrors player MORALE_PER_DRY_DAY. */
const MORALE_PER_DRY_DAY = [0, 10, 10, 15, 20, 25] as const;

function healthHit(days: number): number {
  return HEALTH_PER_DRY_DAY[Math.min(days, HEALTH_PER_DRY_DAY.length - 1)];
}
function moraleHit(days: number): number {
  return MORALE_PER_DRY_DAY[Math.min(days, MORALE_PER_DRY_DAY.length - 1)];
}

/** Total water gallons the wagon's alive party would draw today.
 *  Adult full ration + child 0.7× × weather mult. */
export function npcWaterConsumedToday(wagon: NpcWagonState, weather: Weather | undefined): number {
  const alive = wagon.party.filter((m) => !m.dead);
  const adults = alive.filter((m) => m.kind === 'adult').length;
  const children = alive.filter((m) => m.kind === 'child').length;
  const base = adults * WATER_PER_ADULT_GAL
    + Math.ceil(children * WATER_PER_ADULT_GAL * CHILD_WATER_MULT);
  return Math.ceil(base * weatherWaterMult(weather));
}

/** Drain the wagon's keg by today's draw — clean first, then dirty.
 *  Returns the wagon plus how many gallons of dirty got drunk (read
 *  by `applyNpcDirtyWaterRisk`). On a dry-keg day the wagon takes 0
 *  intake — `applyNpcDehydration` reads the resulting `water` to
 *  update the dry-day counter. */
export function applyNpcWaterDrain(
  wagon: NpcWagonState,
  weather: Weather | undefined
): { wagon: NpcWagonState; dirtyDrawn: number } {
  const need = npcWaterConsumedToday(wagon, weather);
  if (need <= 0) return { wagon, dirtyDrawn: 0 };
  const cleanDrawn = Math.min(wagon.water, need);
  const remaining = need - cleanDrawn;
  const dirtyDrawn = Math.min(wagon.dirtyWater, remaining);
  return {
    wagon: {
      ...wagon,
      water: wagon.water - cleanDrawn,
      dirtyWater: wagon.dirtyWater - dirtyDrawn
    },
    dirtyDrawn
  };
}

/** Roll a per-adult dysentery / cholera check when the wagon drank
 *  unboiled water today. Capped at one new infection per tick to
 *  match the player's spirals-prevention rule. Doctor halves the
 *  per-adult chance. */
export function applyNpcDirtyWaterRisk(
  wagon: NpcWagonState,
  dirtyDrawn: number,
  rng: Rng,
  day: number
): NpcWagonState {
  if (dirtyDrawn <= 0) return wagon;
  const chance = hasLive(wagon, 'doctor')
    ? DIRTY_WATER_DISEASE_CHANCE_DOCTOR
    : DIRTY_WATER_DISEASE_CHANCE;
  const adults = wagon.party.filter((m) => !m.dead && m.kind === 'adult');
  for (const adult of adults) {
    if (rng.chance(chance)) {
      const disease: 'cholera' | 'dysentery' = rng.chance(0.5) ? 'cholera' : 'dysentery';
      if (adult.conditions.some((c) => c.id === disease)) continue;
      return {
        ...wagon,
        party: wagon.party.map((m) =>
          m.id === adult.id
            ? { ...m, conditions: [...m.conditions, { id: disease, daysSinceOnset: 0 }] }
            : m
        ),
        eventLog: [
          ...wagon.eventLog,
          { day, text: `${adult.name} fell ill from drinking unboiled water — ${disease}.` }
        ]
      };
    }
  }
  return wagon;
}

/** Apply dehydration HP + morale damage when the keg is empty.
 *  Increments `wagon.dryDays` on dry tick, resets to 0 on a wet day.
 *  Terrain mult applied at the call site since NpcTickContext carries it. */
export function applyNpcDehydration(
  wagon: NpcWagonState,
  terrainMult: number,
  day: number
): NpcWagonState {
  const dry = wagon.water <= 0;

  if (!dry) {
    return wagon.dryDays === 0 ? wagon : { ...wagon, dryDays: 0 };
  }

  const days = wagon.dryDays + 1;
  const hpLoss = Math.round(healthHit(days) * terrainMult);
  const moraleLoss = Math.round(moraleHit(days) * terrainMult);
  const party = wagon.party.map((m) => {
    if (m.dead) return m;
    const mult = m.kind === 'child' ? 0.7 : 1.0;
    const loss = Math.round(hpLoss * mult);
    return { ...m, health: Math.max(0, m.health - loss) };
  });
  return {
    ...wagon,
    party,
    morale: Math.max(0, wagon.morale - moraleLoss),
    dryDays: days,
    eventLog: hpLoss > 0 || moraleLoss > 0
      ? [...wagon.eventLog, { day, text: `Day ${days} without water. ${wagon.name}'s wagon is failing.` }]
      : wagon.eventLog
  };
}
