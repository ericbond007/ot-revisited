import type { GameState, NpcWagonState } from '../types';
import { midTempF } from './temperature';

/**
 * Fresh-pile spoilage. Each tracked item has a freshness window in
 * days; the day-tick zeros the inventory and clears the flag once the
 * clock runs out. Runs BEFORE daily consumption so the party can't
 * eat rotten food — if today is spoil-day, the pile's gone first.
 *
 * Generalized in #265 — game_meat (3d) was the original; eggs (14d
 * unwashed at cool temp) and berries (3d fresh) ride the same flag
 * pattern. Heat-day attrition on bacon + salt_pork is a separate
 * mechanic — see applyHeatSpoilage below.
 */

/** Days a fresh kill keeps in the wagon before rotting. */
export const GAME_MEAT_FRESH_DAYS = 3;

/** Days fresh eggs keep at cool temp, unwashed. */
export const EGG_FRESH_DAYS = 14;

/** Days fresh berries keep before molding. */
export const BERRY_FRESH_DAYS = 3;

/* -------------------------------------------------------------------- *
 * Temperature-driven spoilage (#temp-spoil). The fresh-day windows above
 * are calibrated at SPOIL_REF_TEMP_F. The real spoil rate scales with the
 * day's temperature (midTempF): food rots fast in summer heat and keeps
 * for days in a cold mountain camp. Q10 rule of thumb — spoilage roughly
 * doubles per ~15°F.
 * -------------------------------------------------------------------- */

/** Temperature at which a pile ages at the nominal 1 fresh-day / real day. */
export const SPOIL_REF_TEMP_F = 70;
/** °F step that doubles (above) / halves (below) the spoilage rate. */
export const SPOIL_DOUBLING_F = 15;

/** Spoilage rate multiplier for a given temperature. 1.0 at the reference
 *  temp, ~2x per +15°F, ~0.5x per -15°F. Clamped so extremes stay sane
 *  (near-frozen food still ages a hair; desert heat caps at 6x). */
export function spoilageAgingFactor(tempF: number): number {
  const f = Math.pow(2, (tempF - SPOIL_REF_TEMP_F) / SPOIL_DOUBLING_F);
  return Math.max(0.1, Math.min(6, f));
}

/** Days fresh milk keeps in a cool wagon. Period dairying without
 *  refrigeration: 2 days at moderate temps; the spoil clock refreshes
 *  whenever the cow is milked again, which (#139) happens daily on
 *  every grass-decent day, so a working cow keeps the pile turning
 *  over even though any given gallon is short-lived. */
export const MILK_FRESH_DAYS = 2;

/** Per-item freshness rules. The flag name is the per-pile clock the
 *  spoilage tick watches. */
interface SpoilRule {
  itemId: string;
  flagKey: string;
  freshDays: number;
  /** Whether the global temperature curve scales this pile's aging.
   *  Milk is false — dairy.ts already sets its window from the weather
   *  (heat 1d / normal 2d / frost 4d), so the global factor would
   *  double-count temperature for it. */
  tempSensitive: boolean;
  /** Log line when the pile rots. {qty} is replaced with the lb amount. */
  spoilText: (qty: number) => string;
}

/** Export so the #939 unified-tick synth helper can bridge the NPC's
 *  typed `wagon.spoilDays[itemId]` map into the engine's
 *  `flags._{x}SpoilDay` shape and back. */
export const SPOIL_RULES: readonly SpoilRule[] = [
  {
    itemId: 'game_meat',
    tempSensitive: true,
    flagKey: '_gameMeatSpoilDay',
    freshDays: GAME_MEAT_FRESH_DAYS,
    spoilText: (qty) => `${qty} lb of fresh game meat spoiled in the wagon.`
  },
  {
    itemId: 'egg',
    tempSensitive: true,
    flagKey: '_eggSpoilDay',
    freshDays: EGG_FRESH_DAYS,
    spoilText: (qty) => `${qty} eggs went bad in the basket — none laid in two weeks.`
  },
  {
    itemId: 'berries',
    tempSensitive: true,
    flagKey: '_berrySpoilDay',
    freshDays: BERRY_FRESH_DAYS,
    spoilText: (qty) => `${qty} lb of berries molded through.`
  },
  {
    itemId: 'milk',
    tempSensitive: false,
    flagKey: '_milkSpoilDay',
    freshDays: MILK_FRESH_DAYS,
    spoilText: (qty) => `${qty} gal of milk soured in the bucket.`
  }
];

/** Returns the day number on which a pile added right now should spoil. */
export function computeSpoilDay(currentDay: number, freshDays = GAME_MEAT_FRESH_DAYS): number {
  return currentDay + freshDays;
}

/** Set or refresh the spoil-day clock for the given item. Adders
 *  (hunt action, chickens lay, find_berries event) call this when
 *  adding to the pile so the clock is current.
 *
 *  Pass `daysOverride` to lengthen / shorten the window for weather-
 *  sensitive piles (#139 milk: heat 1d / normal 2d / frost 4d). Other
 *  callers stick with the rule's default. */
export function setSpoilClock(state: GameState, itemId: string, daysOverride?: number): GameState {
  const rule = SPOIL_RULES.find((r) => r.itemId === itemId);
  if (!rule) return state;
  const days = daysOverride ?? rule.freshDays;
  return {
    ...state,
    flags: { ...state.flags, [rule.flagKey]: state.day + days }
  };
}

/** Day-tick step. For every tracked item, if today has reached the
 *  spoil day, zero the inventory and log. Clears the flag in either
 *  case (stale flag with empty inventory gets cleaned up). */
export function applySpoilage(state: GameState): GameState {
  let next = state;
  for (const rule of SPOIL_RULES) {
    const spoilDay = next.flags[rule.flagKey];
    if (typeof spoilDay !== 'number') continue;
    const qty = next.inventory[rule.itemId] ?? 0;
    if (qty <= 0) {
      const flags = { ...next.flags };
      delete (flags as Record<string, unknown>)[rule.flagKey];
      next = { ...next, flags };
      continue;
    }
    // Temperature-weighted aging: each real day consumes `factor` fresh-
    // days of budget (hot pulls the spoil-day earlier, cold pushes it
    // later). Persist the nudge so it accumulates across ticks. At
    // SPOIL_REF_TEMP_F (or a non-temp-sensitive pile) factor is 1.0 and
    // behaviour matches the flat-rate model.
    const factor = rule.tempSensitive ? spoilageAgingFactor(midTempF(next)) : 1;
    const adjustedSpoilDay = spoilDay - (factor - 1);
    if (next.day < adjustedSpoilDay) {
      next = { ...next, flags: { ...next.flags, [rule.flagKey]: adjustedSpoilDay } };
      continue;
    }
    const inventory = { ...next.inventory, [rule.itemId]: 0 };
    const flags = { ...next.flags };
    delete (flags as Record<string, unknown>)[rule.flagKey];
    next = {
      ...next,
      inventory,
      flags,
      eventLog: [
        ...next.eventLog,
        { day: next.day, text: rule.spoilText(qty) }
      ]
    };
  }
  return next;
}

/**
 * Heat-day attrition on bacon + salt_pork (#265). Period reality:
 * bacon turned in mid-summer past the Platte; diaries record losing
 * up to half the stock on hot stretches. Marcy spec'd packing in a
 * bran-fill barrel as the mitigation, which on our wagon is the
 * `hasBranBarrel` trait (#264) — halves the daily loss when present.
 *
 * Runs every day-tick; loss scales with the day's temperature (midTempF)
 * above a warm threshold. Salt pork's heavier cure makes it half as
 * vulnerable as bacon.
 */
export const BACON_HEAT_LB_PER_DAY = 3;
export const SALT_PORK_HEAT_LB_PER_DAY = 1.5;

/** Cured meat only sweats and turns above this temperature; below it the
 *  cure holds and there is no daily loss. */
export const CURED_MEAT_WARM_THRESHOLD_F = 78;

export function applyHeatSpoilage(state: GameState): GameState {
  // Temperature-scaled cured-meat attrition (was a binary weather==='heat'
  // gate). Loss ramps from 0 at the warm threshold to ~1.5x the base rate
  // in desert heat, so any genuinely hot stretch turns the bacon.
  const lossFactor = Math.max(0, Math.min(1.5, (midTempF(state) - CURED_MEAT_WARM_THRESHOLD_F) / 14));
  if (lossFactor <= 0) return state;
  const baconHeld = state.inventory.bacon ?? 0;
  const saltPorkHeld = state.inventory.salt_pork ?? 0;
  if (baconHeld <= 0 && saltPorkHeld <= 0) return state;
  const mitMult = state.wagon.hasBranBarrel ? 0.5 : 1;
  const baconLoss = Math.min(baconHeld, Math.round(BACON_HEAT_LB_PER_DAY * lossFactor * mitMult));
  const saltPorkLoss = Math.min(saltPorkHeld, Math.round(SALT_PORK_HEAT_LB_PER_DAY * lossFactor * mitMult));
  if (baconLoss <= 0 && saltPorkLoss <= 0) return state;
  const inventory = { ...state.inventory };
  if (baconLoss > 0) inventory.bacon = baconHeld - baconLoss;
  if (saltPorkLoss > 0) inventory.salt_pork = saltPorkHeld - saltPorkLoss;
  const parts: string[] = [];
  if (baconLoss > 0) parts.push(`${baconLoss} lb bacon`);
  if (saltPorkLoss > 0) parts.push(`${saltPorkLoss} lb salt pork`);
  const note = state.wagon.hasBranBarrel
    ? `Heat turned ${parts.join(' + ')} rancid; the bran barrel kept the rest cool.`
    : `Heat turned ${parts.join(' + ')} rancid in the wagon — no bran barrel to insulate.`;
  return {
    ...state,
    inventory,
    eventLog: [...state.eventLog, { day: state.day, text: note }]
  };
}

/* -------------------------------------------------------------------- *
 * #295 — NPC wagon spoilage. Mirrors `applySpoilage` + `applyHeatSpoilage`
 * but for `NpcWagonState`, which doesn't carry a `flags` blob. Per-pile
 * clocks live on `wagon.spoilDays` (Record<itemId, dayNumber>).
 * Companion meat received via #294 company hunts now rots on the same
 * curve the player's pile does; bacon / salt_pork in companion wagons
 * also takes heat-day attrition.
 * -------------------------------------------------------------------- */

/** Set or refresh an NPC wagon's spoil-day clock for the given item.
 *  Called when perishable food is added to the wagon (currently
 *  game_meat from `hunt()` company-hunt redistribution; future hooks
 *  for milk / eggs / berries when those systems arrive on NPC wagons). */
export function setNpcSpoilClock(
  wagon: NpcWagonState,
  itemId: string,
  currentDay: number,
  daysOverride?: number
): NpcWagonState {
  const rule = SPOIL_RULES.find((r) => r.itemId === itemId);
  if (!rule) return wagon;
  const days = daysOverride ?? rule.freshDays;
  return {
    ...wagon,
    spoilDays: { ...(wagon.spoilDays ?? {}), [itemId]: currentDay + days }
  };
}

// #939b — applyNpcSpoilage + applyNpcHeatSpoilage parallel impls
// were deleted here. NPC tick now calls the engine's `applySpoilage`
// + `applyHeatSpoilage` via the wagon-synth helper (`tickNpcWagon`
// in npc-engine.ts). The shared `setNpcSpoilClock` adder is still
// used by hunt redistribution (writes to wagon.spoilDays directly).
