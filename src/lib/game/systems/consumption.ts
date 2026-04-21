import type { GameState, Rations } from '../types';

const FOOD_PER_PERSON: Record<Rations, number> = {
  meager: 1,
  normal: 2,
  filling: 3
};

const WATER_PER_PERSON_GAL = 1;

// Order food staples are drawn down — first is eaten first.
const FOOD_DRAW_ORDER = [
  'flour',
  'beans',
  'bacon',
  'hardtack',
  'dried_fruit',
  'pemmican'
];

export function aliveCount(state: GameState): number {
  return state.party.filter((m) => !m.dead).length;
}

export function foodConsumedToday(state: GameState): number {
  return aliveCount(state) * FOOD_PER_PERSON[state.rations];
}

export function waterConsumedToday(state: GameState): number {
  return aliveCount(state) * WATER_PER_PERSON_GAL;
}

export function applyDailyConsumption(state: GameState): GameState {
  const foodNeeded = foodConsumedToday(state);
  const waterNeeded = waterConsumedToday(state);

  const inventory = { ...state.inventory };
  let remaining = foodNeeded;
  for (const id of FOOD_DRAW_ORDER) {
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
