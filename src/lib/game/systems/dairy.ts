import type { GameState } from '../types';
import { grazingQuality } from './oxen';
import { setSpoilClock } from './spoilage';

// #139 — Daily milk yield from the wagon's milk cow(s). Period reality:
// emigrant families brought 1-3 milk cows tied to the wagon. A cow in
// good grass produced 2-3 gal/day; on the alkali stretches and through
// the dormant winter months, yields fell to ~0.5 gal or dried up
// entirely. Heat days cut yield further (cows lose weight in heat,
// produce thinner milk).
//
// Pipeline: runs alongside applyEggLay — fresh milk is available the
// same day it's drawn, so today's milking lands in inventory before
// today's consumption pull.

/** Base yield per cow under ideal conditions (grazing 1.0, no heat). */
const BASE_YIELD_PER_COW = 2;

/** Heat days drop yield ~30% — cows graze less in midday sun and pant
 *  through the afternoon. Period diaries record dramatic mid-summer
 *  yield drops on the lower Platte. */
const HEAT_YIELD_MULT = 0.7;

/** Minimum grazing fraction below which the cow goes dry. Real cows
 *  need ~25 lb of dry-matter forage daily; below the threshold the
 *  body diverts what it gets to survival, not lactation. */
const DRY_GRAZING_THRESHOLD = 0.25;

export function dailyMilkYield(state: GameState): number {
  const cows = state.inventory.milk_cow ?? 0;
  if (cows <= 0) return 0;

  const grazing = grazingQuality(state);
  if (grazing < DRY_GRAZING_THRESHOLD) return 0;

  const weatherMult = state.weather === 'heat' ? HEAT_YIELD_MULT : 1.0;
  return Math.round(cows * BASE_YIELD_PER_COW * grazing * weatherMult);
}

export function applyDairy(state: GameState): GameState {
  const yieldGal = dailyMilkYield(state);
  if (yieldGal <= 0) return state;

  const next: GameState = {
    ...state,
    inventory: {
      ...state.inventory,
      milk: (state.inventory.milk ?? 0) + yieldGal
    }
  };
  // Refresh the spoil clock, weather-sensitive. Period reality: raw milk
  // souring at trail temperatures was 24h in summer heat, 48h moderate,
  // 4 days in frost / cold. Diaries describe deliberate clabbering for
  // biscuits — "spoiled" milk usually still got used, only true rot
  // beyond 3-4 days in summer ever got dumped.
  const days = state.weather === 'heat' ? 1
    : (state.weather === 'frost' || state.weather === 'snow') ? 4
    : 2;
  return setSpoilClock(next, 'milk', days);
}

// #222 — Wagon-pail butter. The headline period dairy mechanic: a
// covered crock with a paddle dasher in the lid, hung from a hook
// inside the wagon. The day's jostling churns the cream automatically.
// Fires only inside tickDayPausable (= a travel day by definition,
// since camp/visit go through different routes). Runs BEFORE
// applyDailyConsumption so the morning's surplus lands in butter
// rather than breakfast — period reality: women set the crock at
// dawn before anyone drank coffee.

const MILK_PER_BUTTER = 2;
const BUTTER_LB_PER_BATCH = 1;

export function dailyButterYield(state: GameState): number {
  if ((state.inventory.butter_crock ?? 0) < 1) return 0;
  const milk = state.inventory.milk ?? 0;
  return Math.floor(milk / MILK_PER_BUTTER) * BUTTER_LB_PER_BATCH;
}

export function applyButterChurn(state: GameState): GameState {
  if ((state.inventory.butter_crock ?? 0) < 1) return state;
  const milk = state.inventory.milk ?? 0;
  if (milk < MILK_PER_BUTTER) return state;

  const batches = Math.floor(milk / MILK_PER_BUTTER);
  const milkUsed = batches * MILK_PER_BUTTER;
  const butterMade = batches * BUTTER_LB_PER_BATCH;

  return {
    ...state,
    inventory: {
      ...state.inventory,
      milk: milk - milkUsed,
      butter: (state.inventory.butter ?? 0) + butterMade
    },
    eventLog: [
      ...state.eventLog,
      { day: state.day, text: `Wagon-pail churn: ${milkUsed} gal milk → ${butterMade} lb butter.` }
    ]
  };
}
