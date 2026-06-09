// #1266 — the canonical daily-system spine. ONE ordered list per segment,
// consumed by every tick driver (tickDayPausable; the headless tickDay
// wrapper; the NPC tick in Stage 2). Wire a new daily system HERE, once.
//
// Segments, not one flat list: the day's pause points (events, dissent) and
// train orchestration are driver control-flow, not list entries. Order within
// each segment is LOAD-BEARING (shared rng stream) — see the spine-order
// test. Do not reorder without a determinism re-baseline.
import type { GameState } from './types';
import type { Rng } from './rng';
import { applyAmbientWaterRefill, applyDailyConsumption, applyDirtyWaterRisk } from './systems/consumption';
import { applyPastryQuality } from './systems/pastry';
import { rollDailyTheft } from './systems/item-loss';
import { applyStarvation } from './systems/starvation';
import { progressConditions } from './systems/conditions';
import { tickOxen } from './systems/oxen';
import { tickWagon } from './systems/wagon';
import { adjustMorale } from './systems/morale';
import { applySabbathTravelDebit } from './systems/sabbath-travel';
import { attemptFire } from './systems/fire';
import { reapDead } from './systems/death';
import { applySpoilage, applyHeatSpoilage } from './systems/spoilage';
import { applyDehydration } from './systems/dehydration';
import { applyWaterRationStrain } from './systems/water-ration';
import { applyOxHydration } from './systems/ox-hydration';
import { applyEggLay } from './systems/eggs';
import { applyDairy, applyButterChurn } from './systems/dairy';
import { applyDietVariety, applyHotDrinks } from './systems/diet';
import { applyDailyRecovery } from './systems/travel-recovery';
import { applyTrainShare } from './systems/train-share';
import { applyHolidays } from './systems/holidays';
import { decayCleanliness, applyDirtyMorale, applyFilthDiseaseRisk } from './systems/cleanliness';

/** Per-day context a step may need beyond (state, rng). */
export interface TickCtx {
  /** True when the wagon travels today (companyMode === 'travel'). */
  traveled: boolean;
}

export interface TickStep {
  id: string;
  run: (s: GameState, rng: Rng, ctx: TickCtx) => GameState;
}

export function runSteps(steps: readonly TickStep[], s: GameState, rng: Rng, ctx: TickCtx): GameState {
  let next = s;
  for (const step of steps) next = step.run(next, rng, ctx);
  return next;
}

export const MORNING_STEPS: readonly TickStep[] = [
  { id: 'progressConditions',   run: (s, rng) => progressConditions(s, rng) },
  { id: 'applyEggLay',          run: (s) => applyEggLay(s) },
  { id: 'applyDairy',           run: (s) => applyDairy(s) },
  { id: 'applyButterChurn',     run: (s) => applyButterChurn(s) },
  { id: 'applySpoilage',        run: (s) => applySpoilage(s) },
  { id: 'applyHeatSpoilage',    run: (s) => applyHeatSpoilage(s) },
  { id: 'decayCleanliness',     run: (s) => decayCleanliness(s) },
  { id: 'applyDirtyMorale',     run: (s) => applyDirtyMorale(s) },
  { id: 'applyFilthDiseaseRisk',run: (s, rng) => applyFilthDiseaseRisk(s, rng) },
  { id: 'applyAmbientWaterRefill', run: (s, rng) => applyAmbientWaterRefill(s, rng) },
  { id: 'applyDailyConsumption',run: (s) => applyDailyConsumption(s) },
  { id: 'applyWaterRationStrain', run: (s) => applyWaterRationStrain(s) },
  { id: 'applyDietVariety',     run: (s) => applyDietVariety(s) },
  { id: 'applyHotDrinks',       run: (s) => applyHotDrinks(s) },
  { id: 'applyPastryQuality',   run: (s, rng) => applyPastryQuality(s, rng).state },
  { id: 'rollDailyTheft',       run: (s, rng) => rollDailyTheft(s, rng).state },
  { id: 'applyDirtyWaterRisk',  run: (s, rng) => applyDirtyWaterRisk(s, rng) },
  { id: 'applyStarvation',      run: (s) => applyStarvation(s) },
];

export const TRAVEL_OX_WAGON_STEPS: readonly TickStep[] = [
  { id: 'tickOxen',       run: (s, rng) => tickOxen(s, rng) },
  { id: 'applyOxHydration', run: (s) => applyOxHydration(s) },
  { id: 'tickWagon',      run: (s, rng) => tickWagon(s, rng) },
];

export const POST_BRANCH_STEPS: readonly TickStep[] = [
  { id: 'adjustMorale',   run: (s, rng) => adjustMorale(s, rng) },
  { id: 'applyHolidays',  run: (s) => applyHolidays(s) },
];

export const PRE_TRAVEL_STEPS: readonly TickStep[] = [
  { id: 'applyDailyRecovery',       run: (s, _rng, ctx) => applyDailyRecovery(s, ctx.traveled) },
  { id: 'applyTrainShare',          run: (s, rng) => applyTrainShare(s, rng) },
  { id: 'applySabbathTravelDebit',  run: (s, _rng, ctx) => applySabbathTravelDebit(s, ctx.traveled) },
];

export const POST_EVENT_TAIL_STEPS: readonly TickStep[] = [
  { id: 'attemptFire',    run: (s, rng) => attemptFire(s, rng) },
  { id: 'applyDehydration', run: (s) => applyDehydration(s) },
  { id: 'reapDead',       run: (s, rng) => reapDead(s, rng) },
];
