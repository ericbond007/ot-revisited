import type { GameState, Pace, Rations, Weather } from '../types';
import { foodItemIds } from '../content/items';
import { hasLiveFarmer, hasLiveDoctor } from '../professions/predicates';
import { weatherWaterMult } from './weather';
import { waterborneDiseaseModifier } from './water-purity';

// Food → nutrition group mapping for the varied-diet bonus (#110).
// Drawing from ≥2 of these groups in one day = +1 morale that day.
// Coffee / tea / sugar are treats, not main calories — excluded.
type NutritionGroup = 'starch' | 'meat' | 'fresh';

const NUTRITION_GROUP: Record<string, NutritionGroup> = {
  flour:       'starch',
  hardtack:    'starch',
  beans:       'starch',
  bacon:       'meat',
  jerky:       'meat',
  pemmican:    'meat',
  game_meat:   'meat',
  berries:     'fresh',
  egg:         'fresh',
  dried_fruit: 'fresh',
  milk:        'fresh',
  cheese:      'fresh',
  butter:      'fresh'
};

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

// Pace × food multiplier (#267). Period reality: a grueling 14-hour
// day pulling ahead of weather burned more calories than a slow
// nooning-friendly amble. Diaries record working parties eating 3+
// lb/day on hard pushes vs. ~1.5 lb on layover days. Multipliers
// stay small so flat-rations strategies still work — pace shifts
// food need by ±15-25%, not double.
export const PACE_FOOD_MULT: Record<Pace, number> = {
  slow:     0.85,
  moderate: 1.00,
  fast:     1.10,
  grueling: 1.25
};

// Cold-weather food bump (#268). Period reality: emigrant diaries
// crossing the Wasatch and Blue Mountain frosts record sharply higher
// food draw — a body burns more calories holding core temperature in
// the cold than it does plowing through summer prairie. +20% on snow
// and frost days; other weathers unchanged. Composes with pace and
// farmer mults.
export const WEATHER_FOOD_MULT: Record<Weather, number> = {
  clear:    1.00,
  overcast: 1.00,
  rain:     1.00,
  storm:    1.00,
  snow:     1.20,
  heat:     1.00,
  fog:      1.00,
  frost:    1.20
};

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
  const weatherMult = WEATHER_FOOD_MULT[state.weather] ?? 1.0;
  const adjusted = Math.round(base * PACE_FOOD_MULT[state.pace] * weatherMult);
  return hasLiveFarmer(state) ? Math.floor(adjusted * FARMER_FOOD_MULT) : adjusted;
}

export function waterConsumedToday(state: GameState): number {
  const adults = aliveAdultCount(state);
  const children = aliveChildCount(state);
  const base = adults * WATER_PER_ADULT_GAL + Math.ceil(children * WATER_PER_ADULT_GAL * CHILD_WATER_MULT);
  // Weather (#153) — heat doubles water needs, overcast/rain trims a bit.
  return Math.ceil(base * weatherWaterMult(state.weather));
}

export function applyDailyConsumption(state: GameState): GameState {
  const foodNeeded = foodConsumedToday(state);
  const waterNeeded = waterConsumedToday(state);
  const foodDrawOrder = foodItemIds();

  const inventory = { ...state.inventory };
  let remaining = foodNeeded;
  const groupsDrawn = new Set<NutritionGroup>();
  for (const id of foodDrawOrder) {
    if (remaining <= 0) break;
    const have = inventory[id] ?? 0;
    if (have <= 0) continue;
    const take = Math.min(have, remaining);
    inventory[id] = have - take;
    remaining -= take;
    const group = NUTRITION_GROUP[id];
    if (group) groupsDrawn.add(group);
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
  // _lastFoodGroups is read by applyDietVariety for the +1 morale
  // bonus on multi-group days.
  const flags = {
    ...state.flags,
    _lastFoodShortfall: remaining,
    _lastDirtyWaterDrawn: dirtyDrawn,
    _lastFoodGroups: [...groupsDrawn] as unknown as string
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
  const baseChance = hasLiveDoctor(state)
    ? DIRTY_WATER_DISEASE_CHANCE_DOCTOR
    : DIRTY_WATER_DISEASE_CHANCE;
  // Boiling water for coffee/tea cuts the disease odds — they don't
  // know why it works, just that the brew tastes better and they
  // get sick less. modifier is 1.0 when no coffee/tea.
  const chance = baseChance * waterborneDiseaseModifier(state);
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
