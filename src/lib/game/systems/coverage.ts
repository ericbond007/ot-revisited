// src/lib/game/systems/coverage.ts
//
// #1172 — outfit-screen coverage hints. Recomputed against the REAL
// engine consumption constants + water-cap helper so the hint can never
// drift from what the player actually experiences mid-trail. Pre-journey
// there is no pace/weather/terrain context, so food is measured at
// `normal` rations (the engine's baseline).
//
// NOTE: The plan referenced a non-existent `waterCapacityGal` function.
// The real export from water-cap.ts is `computeWaterCap(wagonModel, inventory)`
// which takes a WagonModelId directly — no getWagon() wrapper needed.
import type { PartyMember } from '../types';
import { ITEMS, foodItemIds } from '../content/items';
import { type WagonModelId } from '../content/wagons';
import { FOOD_PER_ADULT, CHILD_FOOD_MULT, WATER_PER_ADULT_GAL, CHILD_WATER_MULT } from './consumption';
import { computeWaterCap } from './water-cap';

export interface CoverageInput {
  party: PartyMember[];
  /** What the party already owns (starter kit). */
  starterInventory: Record<string, number>;
  /** Pending purchases (the `buyQty` basket). */
  basket: Record<string, number>;
  wagonModel: WagonModelId;
}

export interface Coverage {
  /** Days of food at normal rations for the live party. */
  foodDays: number;
  /** Days of water at the wagon's keg capacity + bags. */
  waterDays: number;
  /** Usable rounds: min(lead_balls, percussion_caps). */
  shots: number;
  /** Worst per-soul coverage of coat/boots/blanket (1 = one each per soul). */
  clothingCov: number;
}

const FOOD_IDS = new Set(foodItemIds());

function isAliveAdult(m: PartyMember): boolean {
  return !m.dead && m.kind === 'adult';
}
function isAliveChild(m: PartyMember): boolean {
  return !m.dead && m.kind === 'child';
}

export function computeCoverage(input: CoverageInput): Coverage {
  const { party, starterInventory, basket, wagonModel } = input;
  const combined: Record<string, number> = {};
  for (const [id, q] of Object.entries(starterInventory)) combined[id] = (combined[id] ?? 0) + q;
  for (const [id, q] of Object.entries(basket)) combined[id] = (combined[id] ?? 0) + q;

  const adults = party.filter(isAliveAdult).length;
  const children = party.filter(isAliveChild).length;
  const souls = adults + children;

  // Food — total lbs of food items / daily draw at normal rations.
  const perAdult = FOOD_PER_ADULT.normal;
  const dailyFood = adults * perAdult + Math.floor(children * perAdult * CHILD_FOOD_MULT);
  let foodLbs = 0;
  for (const [id, q] of Object.entries(combined)) {
    if (FOOD_IDS.has(id)) foodLbs += q * (ITEMS[id]?.weightLbPerUnit ?? 0);
  }
  const foodDays = dailyFood > 0 ? foodLbs / dailyFood : 0;

  // Water — real keg capacity (+ bags) / daily water draw.
  // computeWaterCap takes (WagonModelId, inventory) directly.
  const dailyWater = adults * WATER_PER_ADULT_GAL + Math.ceil(children * WATER_PER_ADULT_GAL * CHILD_WATER_MULT);
  const waterCap = computeWaterCap(wagonModel, combined);
  const waterDays = dailyWater > 0 ? waterCap / dailyWater : 0;

  // Ammo — a usable round needs both a ball and a cap.
  const shots = Math.min(combined.lead_balls ?? 0, combined.percussion_caps ?? 0);

  // Clothing — worst per-soul coverage of the three winter items.
  const clothingCov = souls > 0
    ? Math.min(
        (combined.coat ?? 0) / souls,
        (combined.boots ?? 0) / souls,
        (combined.blanket ?? 0) / souls
      )
    : 0;

  return { foodDays, waterDays, shots, clothingCov };
}
