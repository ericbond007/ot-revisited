import type { GameState, Rations } from '../types';
import { foodItemIds } from '../content/items';
import { hasLiveFarmer } from '../professions/predicates';

const FOOD_PER_ADULT: Record<Rations, number> = {
  meager: 1,
  normal: 2,
  filling: 3
};

// Children eat roughly 60% of an adult's ration, drink 70% of the water.
// Scales the daily per-member count; floored so the sum stays integer.
const CHILD_FOOD_MULT = 0.6;
const CHILD_WATER_MULT = 0.7;
const WATER_PER_ADULT_GAL = 1;
const FARMER_FOOD_MULT = 0.95;

export function aliveCount(state: GameState): number {
  return state.party.filter((m) => !m.dead).length;
}

export function aliveAdultCount(state: GameState): number {
  return state.party.filter((m) => !m.dead && m.kind === 'adult').length;
}

export function aliveChildCount(state: GameState): number {
  return state.party.filter((m) => !m.dead && m.kind === 'child').length;
}

export function foodConsumedToday(state: GameState): number {
  const perAdult = FOOD_PER_ADULT[state.rations];
  const adults = aliveAdultCount(state);
  const children = aliveChildCount(state);
  const base = adults * perAdult + Math.floor(children * perAdult * CHILD_FOOD_MULT);
  return hasLiveFarmer(state) ? Math.floor(base * FARMER_FOOD_MULT) : base;
}

export function waterConsumedToday(state: GameState): number {
  const adults = aliveAdultCount(state);
  const children = aliveChildCount(state);
  return adults * WATER_PER_ADULT_GAL + Math.ceil(children * WATER_PER_ADULT_GAL * CHILD_WATER_MULT);
}

export function applyDailyConsumption(state: GameState): GameState {
  const foodNeeded = foodConsumedToday(state);
  const waterNeeded = waterConsumedToday(state);
  const foodDrawOrder = foodItemIds();

  const inventory = { ...state.inventory };
  let remaining = foodNeeded;
  for (const id of foodDrawOrder) {
    if (remaining <= 0) break;
    const have = inventory[id] ?? 0;
    if (have <= 0) continue;
    const take = Math.min(have, remaining);
    inventory[id] = have - take;
    remaining -= take;
  }

  const resources = {
    ...state.resources,
    water: Math.max(0, state.resources.water - waterNeeded)
  };

  return {
    ...state,
    inventory,
    resources
  };
}
