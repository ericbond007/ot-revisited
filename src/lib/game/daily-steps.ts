// #1266 — the canonical daily-system spine. ONE ordered list per segment,
// consumed by every tick driver (tickDayPausable; the headless tickDay
// wrapper; the NPC tick in Stage 2). Wire a new daily system HERE, once.
//
// Segments, not one flat list: the day's pause points (events, dissent) and
// train orchestration are driver control-flow, not list entries. Order within
// each segment is LOAD-BEARING (shared rng stream) — see the spine-order
// test. Do not reorder without a determinism re-baseline.
import type { CompanyRestMode, GameState } from './types';
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
import { applyNpcMoraleBaseline } from './systems/npc-morale';
import { decayCleanliness, applyDirtyMorale, applyFilthDiseaseRisk } from './systems/cleanliness';
import { checkSnowNews } from './systems/news';
import { checkTrainPaceLift } from './systems/company-rest';

/** Per-day context a step may need beyond (state, rng). */
export interface TickCtx {
  /** True when the wagon travels today (companyMode === 'travel'). */
  traveled: boolean;
  /** Which driver is ticking: the player wagon or an NPC synth. Required so
   *  every call site must declare — npm run check finds any omissions. */
  driver: 'player' | 'npc';
  /** Read by applyDailyRecovery's NPC crisis-layby carve (#1046 §13 C).
   *  When driver==='npc' && companyRestMode==='crisis_layby', recovery is
   *  suppressed to prevent undead-crisis lock. */
  companyRestMode?: CompanyRestMode;
}

export interface TickStep {
  id: string;
  /** Default 'all' — a new step reaches BOTH drivers unless explicitly tagged.
   *  Tag playerOnly only for player-resource/recipient steps. */
  scope?: 'all' | 'playerOnly' | 'npcOnly';
  run: (s: GameState, rng: Rng, ctx: TickCtx) => GameState;
}

export function runSteps(steps: readonly TickStep[], s: GameState, rng: Rng, ctx: TickCtx): GameState {
  let next = s;
  for (const step of steps) {
    if ((step.scope === 'playerOnly' && ctx.driver === 'npc') ||
        (step.scope === 'npcOnly' && ctx.driver === 'player')) continue;
    next = step.run(next, rng, ctx);
  }
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
  { id: 'adjustMorale',   scope: 'playerOnly', run: (s, rng) => adjustMorale(s, rng) }, // NPCs run applyNpcMoraleBaseline instead; stacking both double-counts the daily morale nudge
  { id: 'applyNpcMoraleBaseline', scope: 'npcOnly', run: (s, _rng, ctx) => (ctx.traveled ? applyNpcMoraleBaseline(s) : s) }, // gate mirrors npc-engine.ts step 1h: runs travel-days only
  { id: 'applyHolidays',  run: (s) => applyHolidays(s) },
  // #1304-T3 — Seasonal snow-news schedule.  Uses sub-rng `snownews:${seed}`
  // so it never disturbs the main daily RNG stream.  scope='all' so both
  // player AND bot runs receive the signal on the same tick path — the
  // identical code path is what makes the estimator signal-honest (T4).
  { id: 'checkSnowNews',  run: (s) => checkSnowNews(s) },
  // #1304-T2 — level-trigger: emits a one-time log when the captain's
  // schedule pressure first crosses above 'ok' for an episode; clears the
  // flag when pressure returns to 'ok' so the next episode re-arms.
  // scope='playerOnly' — the player's eventLog carries this; NPC synths do
  // not persist flags across ticks (projectWagonDeltas doesn't sync flags),
  // so running it on NPC synths would silently no-op every tick anyway.
  { id: 'checkTrainPaceLift', scope: 'playerOnly' as const, run: (s) => checkTrainPaceLift(s) },
];

export const PRE_TRAVEL_STEPS: readonly TickStep[] = [
  { id: 'applyDailyRecovery',
    // crisis carve — no NPC lay-by heal, else undead crisis lock (#1046 §13 C)
    run: (s, _rng, ctx) => (ctx.driver === 'npc' && ctx.companyRestMode === 'crisis_layby') ? s : applyDailyRecovery(s, ctx.traveled) },
  { id: 'applyTrainShare',          scope: 'playerOnly', run: (s, rng) => applyTrainShare(s, rng) }, // player-recipient: transfers train food TO the player; no-op on the NPC synth stub
  { id: 'applySabbathTravelDebit',  run: (s, _rng, ctx) => applySabbathTravelDebit(s, ctx.traveled) },
];

export const POST_EVENT_TAIL_STEPS: readonly TickStep[] = [
  { id: 'attemptFire',    scope: 'playerOnly', run: (s, rng) => attemptFire(s, rng) }, // NPC synth stubs firewood to 0 — the cold-camp branch would exposure-drain NPCs nightly; excluded until NPCs carry firewood
  { id: 'applyDehydration', run: (s) => applyDehydration(s) },
  { id: 'reapDead',       run: (s, rng) => reapDead(s, rng) },
];
