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

// Coffee and tea consumption is per-adult, not flat. Each adult drinks
// roughly 1 oz of brew per day (real emigrant journals). 1 lb = 16 oz,
// so a single adult takes 16 days to finish a pound; a 3-adult party
// takes ~5 days; a 6-adult party ~2.5 days. Children skip the brew —
// pre-Civil-War kids drank water and milk, not coffee.
const HOT_DRINK_OZ_PER_LB = 16;
const HOT_DRINK_OZ_PER_ADULT_PER_DAY = 1;

/** +1 morale on days the party drew from ≥2 nutrition groups. */
export function applyDietVariety(state: GameState): GameState {
  const groups = (state.flags._lastFoodGroups as unknown as string[] | undefined) ?? [];
  if (!Array.isArray(groups) || groups.length < 2) return state;
  return {
    ...state,
    morale: Math.min(100, state.morale + 1)
  };
}

/** Daily coffee/tea brew. Consumption scales with the alive-adult
 *  count: 1 oz per adult per day, 16 oz per lb, so the per-lb burn
 *  rate matches party size honestly. While supply lasts: +1 morale
 *  and the disease-modifier side-effect (applied by
 *  applyDirtyWaterRisk reading the inventory). Sets _lastHotDrink so
 *  the UI can surface "we brewed today". */
export function applyHotDrinks(state: GameState): GameState {
  const adults = state.party.filter((m) => !m.dead && m.kind === 'adult').length;
  // No adults left → nobody's brewing. Reset the clock so a partial
  // tin doesn't time out on its own once kids inherit the stash.
  if (adults === 0) {
    if (state.flags._hotDrinkClock !== undefined) {
      const flags = { ...state.flags };
      delete flags._hotDrinkClock;
      return { ...state, flags };
    }
    return state;
  }

  const haveCoffee = (state.inventory.coffee ?? 0) > 0;
  const haveTea = (state.inventory.tea ?? 0) > 0;
  if (!haveCoffee && !haveTea) {
    if (state.flags._hotDrinkClock !== undefined) {
      const flags = { ...state.flags };
      delete flags._hotDrinkClock;
      return { ...state, flags };
    }
    return state;
  }

  const drinkId = haveCoffee ? 'coffee' : 'tea';
  // Clock counts ounces consumed since the last full lb was opened.
  const clock = (state.flags._hotDrinkClock as number | undefined) ?? 0;
  const ozToday = adults * HOT_DRINK_OZ_PER_ADULT_PER_DAY;
  const totalOz = clock + ozToday;
  const lbConsumed = Math.floor(totalOz / HOT_DRINK_OZ_PER_LB);
  const remainderOz = totalOz % HOT_DRINK_OZ_PER_LB;

  const inventory = lbConsumed > 0
    ? { ...state.inventory, [drinkId]: Math.max(0, (state.inventory[drinkId] ?? 0) - lbConsumed) }
    : state.inventory;

  return {
    ...state,
    inventory,
    morale: Math.min(100, state.morale + 1),
    flags: {
      ...state.flags,
      _hotDrinkClock: remainderOz,
      _lastHotDrink: drinkId
    }
  };
}
