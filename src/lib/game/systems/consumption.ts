import type { GameState, Rations } from '../types';
import { foodItemIds } from '../content/items';
import { hasLiveFarmer, hasLiveDoctor } from '../professions/predicates';

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
const FARMER_FOOD_MULT = 0.9;

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

  // Water draw — clean first, then fall back to dirty (risky). Track
  // how many gallons of dirty got drunk; applyDirtyWaterRisk reads it.
  let waterRemaining = waterNeeded;
  const cleanHave = state.resources.water;
  const dirtyHave = state.resources.dirtyWater ?? 0;
  const cleanDrawn = Math.min(cleanHave, waterRemaining);
  waterRemaining -= cleanDrawn;
  const dirtyDrawn = Math.min(dirtyHave, waterRemaining);
  waterRemaining -= dirtyDrawn;

  const resources = {
    ...state.resources,
    water: cleanHave - cleanDrawn,
    dirtyWater: dirtyHave - dirtyDrawn
  };

  // Surface today's food shortfall so applyStarvation (next in the
  // pipeline) can read it. `remaining` is what couldn't be drawn.
  // Dirty-water draw triggers applyDirtyWaterRisk separately.
  const flags = {
    ...state.flags,
    _lastFoodShortfall: remaining,
    _lastDirtyWaterDrawn: dirtyDrawn
  };

  return {
    ...state,
    inventory,
    resources,
    flags
  };
}

/** Doctor halves the per-adult disease chance from drinking dirty water. */
export const DIRTY_WATER_DISEASE_CHANCE = 0.05;
export const DIRTY_WATER_DISEASE_CHANCE_DOCTOR = 0.025;

/** Roll waterborne illness for each adult drinking dirty water today.
 *  At most one new infection per day to avoid wipe-out spirals. */
export function applyDirtyWaterRisk(state: GameState, rng: { chance: (p: number) => boolean; pick: <T>(a: readonly T[]) => T }): GameState {
  const dirtyDrawn = (state.flags._lastDirtyWaterDrawn as number | undefined) ?? 0;
  if (dirtyDrawn <= 0) return state;
  const chance = hasLiveDoctor(state)
    ? DIRTY_WATER_DISEASE_CHANCE_DOCTOR
    : DIRTY_WATER_DISEASE_CHANCE;
  const adults = state.party.filter((m) => !m.dead && m.kind === 'adult');
  for (const adult of adults) {
    if (rng.chance(chance)) {
      const disease = rng.pick(['cholera', 'dysentery'] as const);
      // Skip if they already have this condition.
      if (adult.conditions.some((c) => c.id === disease)) continue;
      return {
        ...state,
        party: state.party.map((m) =>
          m.id === adult.id
            ? { ...m, conditions: [...m.conditions, { id: disease, daysSinceOnset: 0 }] }
            : m
        ),
        eventLog: [
          ...state.eventLog,
          { day: state.day, text: `${adult.name} fell ill from drinking unboiled water — ${disease}.` }
        ]
      };
    }
  }
  return state;
}
