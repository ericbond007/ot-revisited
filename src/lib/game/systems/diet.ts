import type { GameState } from '../types';

// Diet bonuses (#110).
//
// Two small daily mechanics that reward stocking variety on the
// trail:
//
//   1. Varied diet — drawing from ≥2 nutrition groups in one day's
//      consumption (starch / meat / fresh) gives +1 morale. Tracked
//      via flags._lastFoodGroups, written by applyDailyConsumption.
//
//   2. Hot drinks — coffee or tea on hand means the party brews
//      every day. Each brew-day: +1 morale, and (because they boil
//      the water) cuts waterborne-disease odds via the existing
//      waterborneDiseaseModifier. Each tin lasts ~5 brew-days, so
//      a full lb is ~5 days of mornings.
//
// Both are positive-only — players notice the absence rather than
// being punished for the lack. Keeps the surface read-able.

const HOT_DRINK_DAYS_PER_LB = 5;

/** +1 morale on days the party drew from ≥2 nutrition groups. */
export function applyDietVariety(state: GameState): GameState {
  const groups = (state.flags._lastFoodGroups as unknown as string[] | undefined) ?? [];
  if (!Array.isArray(groups) || groups.length < 2) return state;
  return {
    ...state,
    morale: Math.min(100, state.morale + 1)
  };
}

/** Daily coffee/tea brew. Consumes 1 lb every HOT_DRINK_DAYS_PER_LB
 *  brew-days. While supply lasts: +1 morale and the disease-modifier
 *  side-effect (applied by applyDirtyWaterRisk reading the inventory).
 *  Sets _lastHotDrink so the UI can surface "we brewed today". */
export function applyHotDrinks(state: GameState): GameState {
  const haveCoffee = (state.inventory.coffee ?? 0) > 0;
  const haveTea = (state.inventory.tea ?? 0) > 0;
  if (!haveCoffee && !haveTea) {
    // Reset the brew clock so a half-finished tin doesn't carry over.
    if (state.flags._hotDrinkClock !== undefined) {
      const flags = { ...state.flags };
      delete flags._hotDrinkClock;
      return { ...state, flags };
    }
    return state;
  }

  const drinkId = haveCoffee ? 'coffee' : 'tea';
  const clock = (state.flags._hotDrinkClock as number | undefined) ?? 0;
  const next = clock + 1;
  const consumed = next >= HOT_DRINK_DAYS_PER_LB;

  const inventory = consumed
    ? { ...state.inventory, [drinkId]: (state.inventory[drinkId] ?? 0) - 1 }
    : state.inventory;

  return {
    ...state,
    inventory,
    morale: Math.min(100, state.morale + 1),
    flags: {
      ...state.flags,
      _hotDrinkClock: consumed ? 0 : next,
      _lastHotDrink: drinkId
    }
  };
}
