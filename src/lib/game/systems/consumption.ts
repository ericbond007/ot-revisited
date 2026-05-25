import type { GameState, Pace, Rations, Terrain, Weather } from '../types';
import type { Rng } from '../rng';
import { foodItemIds } from '../content/items';
import { hasLiveFarmer, hasLiveDoctor } from '../professions/predicates';
import { weatherWaterMult } from './weather';
import { waterborneDiseaseModifier } from './water-purity';
import { dayTempF } from './temperature';

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

// Children eat roughly 60% of an adult's ration. Water ration is lower
// at 50% — period reality (Faragher 1979 / Schlissel 1982): emigrant
// parents rationed children's water harder than themselves, "the
// little ones got a half-cup when papa got a full cup." Helen
// Carpenter 1857 on the Hastings/Sublette dry stretch: "I tipped
// the children's pannikin first and what was left fell to me."
// Scales the daily per-member count; floored so the sum stays integer.
const CHILD_FOOD_MULT = 0.6;
// #1031b — 0.7 → 0.5 to model period-realistic child water rationing.
const CHILD_WATER_MULT = 0.5;
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
  // state.weather is optional on pre-#153 saves; default to clear weather
  // mult (1.0×) when absent.
  const weatherMult = state.weather ? WEATHER_FOOD_MULT[state.weather] : 1.0;
  const adjusted = Math.round(base * PACE_FOOD_MULT[state.pace] * weatherMult);
  return hasLiveFarmer(state) ? Math.floor(adjusted * FARMER_FOOD_MULT) : adjusted;
}

/** #1074 — Continuous heat multiplier on water draw. Period: Marcy 1859
 *  (Prairie Traveler) — working ox team needs 20-30 gal/day at temperate
 *  weather, up to 40-50 gal in hot. Replaces the binary
 *  `weather === 'heat' → ×2` that lived in weatherWaterMult.
 *
 *    70°F  → ×1.0  (baseline)
 *    85°F  → ×1.5
 *   100°F  → ×2.0  (matches the old binary)
 *   130°F  → ×3.0  (cap)
 */
function tempWaterMult(state: GameState): number {
  const t = dayTempF(state);
  return Math.max(1, 1 + (t - 70) / 30);
}

export function waterConsumedToday(state: GameState): number {
  const adults = aliveAdultCount(state);
  const children = aliveChildCount(state);
  const base = adults * WATER_PER_ADULT_GAL + Math.ceil(children * WATER_PER_ADULT_GAL * CHILD_WATER_MULT);
  // Weather (#153) trims for damp-cool (overcast/rain); temperature
  // (#1074) scales continuously up from 70°F to a ×3 cap.
  return Math.ceil(base * weatherWaterMult(state.weather) * tempWaterMult(state));
}

/** #926 — passive ambient water refill on travel days. Period reality:
 *  emigrants topped kegs at creek crossings, springs, runoff pools
 *  without making a deliberate "find water" stop. The frequency
 *  scales with terrain — river country had water everywhere, mountains
 *  had it at switchbacks, deserts had none. Runs BEFORE
 *  applyDailyConsumption so the gallon found today is drinkable today.
 *
 *  Probabilities + gain per terrain (caps at waterCap):
 *  - river: deterministic +5 (you crossed a creek today, no roll)
 *  - forest: +3 at 60% (creeks + springs are frequent)
 *  - prairie: +2 at 30% (mud-pools / runoff after rain)
 *  - mountain: +1 at 15% (snowmelt at switchbacks)
 *  - desert: 0 (go to a post)
 *
 *  The refill doesn't apply on rest days — `rest()` handles its own
 *  water mechanics via the find_water camp action. */
export function applyAmbientWaterRefill(state: GameState, rng: Rng): GameState {
  const terrain: Terrain = state.location.terrain;
  // Each tuple: gain on a hit, hit probability (river is deterministic).
  const params: Record<Terrain, { gain: number; chance: number }> = {
    river: { gain: 5, chance: 1.0 },
    forest: { gain: 3, chance: 0.60 },
    prairie: { gain: 2, chance: 0.30 },
    mountains: { gain: 1, chance: 0.15 },
    desert: { gain: 0, chance: 0 }
  };
  const { gain, chance } = params[terrain];
  if (gain <= 0) return state;
  if (chance < 1 && !rng.chance(chance)) return state;
  const room = Math.max(0, state.resources.waterCap - state.resources.water);
  const added = Math.min(room, gain);
  if (added <= 0) return state;
  return {
    ...state,
    resources: { ...state.resources, water: state.resources.water + added }
  };
}

export function applyDailyConsumption(state: GameState): GameState {
  const foodNeeded = foodConsumedToday(state);
  const waterNeeded = waterConsumedToday(state);
  const foodDrawOrder = foodItemIds();

  const inventory = { ...state.inventory };
  let remaining = foodNeeded;
  const groupsDrawn = new Set<NutritionGroup>();
  // #304/#305 — track flour + cornmeal draws for the saleratus / cookware
  // pastry-quality pass (`applyPastryQuality`). These are the period
  // staples that required cooking — biscuits and johnnycakes — and
  // their daily quality depends on having saleratus to leaven and
  // cookware to bake in.
  let pastryDrawn = 0;
  for (const id of foodDrawOrder) {
    if (remaining <= 0) break;
    const have = inventory[id] ?? 0;
    if (have <= 0) continue;
    const take = Math.min(have, remaining);
    inventory[id] = have - take;
    remaining -= take;
    if (id === 'flour' || id === 'cornmeal') pastryDrawn += take;
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
    _lastFoodGroups: [...groupsDrawn] as unknown as string,
    _pastryDrawnLb: pastryDrawn
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
