import { describe, it, expect } from 'vitest';
import {
  MORNING_STEPS,
  TRAVEL_OX_WAGON_STEPS,
  POST_BRANCH_STEPS,
  PRE_TRAVEL_STEPS,
  POST_EVENT_TAIL_STEPS,
  runSteps,
  type TickCtx,
  type TickStep
} from '../src/lib/game/daily-steps';
import type { GameState } from '../src/lib/game/types';
import { makeRng } from '../src/lib/game/rng';

describe('#1266 — daily-steps spine order is locked', () => {
  it('MORNING_STEPS exact order', () => {
    expect(MORNING_STEPS.map((s) => s.id)).toEqual([
      'progressConditions', 'applyEggLay', 'applyDairy', 'applyButterChurn',
      'applySpoilage', 'applyHeatSpoilage', 'decayCleanliness', 'applyDirtyMorale',
      'applyFilthDiseaseRisk', 'applyAmbientWaterRefill', 'applyDailyConsumption',
      'applyWaterRationStrain', 'applyDietVariety', 'applyHotDrinks',
      'applyPastryQuality', 'rollDailyTheft', 'applyDirtyWaterRisk', 'applyStarvation'
    ]);
  });
  it('TRAVEL_OX_WAGON_STEPS exact order', () => {
    expect(TRAVEL_OX_WAGON_STEPS.map((s) => s.id)).toEqual(['tickOxen', 'applyOxHydration', 'tickWagon']);
  });
  it('POST_BRANCH_STEPS exact order', () => {
    expect(POST_BRANCH_STEPS.map((s) => s.id)).toEqual(['adjustMorale', 'applyNpcMoraleBaseline', 'applyHolidays']);
  });
  it('PRE_TRAVEL_STEPS exact order', () => {
    expect(PRE_TRAVEL_STEPS.map((s) => s.id)).toEqual(['applyDailyRecovery', 'applyTrainShare', 'applySabbathTravelDebit']);
  });
  it('POST_EVENT_TAIL_STEPS exact order', () => {
    expect(POST_EVENT_TAIL_STEPS.map((s) => s.id)).toEqual(['attemptFire', 'applyDehydration', 'reapDead']);
  });
});

describe('#1266 — runSteps', () => {
  it('applies steps in order, threading state', () => {
    const calls: string[] = [];
    const fake = (id: string) => ({
      id,
      run: (s: GameState) => { calls.push(id); return { ...s, morale: s.morale + 1 }; }
    });
    const s0 = { morale: 0 } as unknown as GameState;
    const ctx: TickCtx = { traveled: true, driver: 'player' };
    const out = runSteps([fake('a'), fake('b'), fake('c')], s0, makeRng('t'), ctx);
    expect(calls).toEqual(['a', 'b', 'c']);
    expect(out.morale).toBe(3);
  });
});

describe('#1266 stage2 — scope filtering', () => {
  it('playerOnly steps are skipped for the npc driver (and vice versa)', () => {
    const calls: string[] = [];
    const steps: TickStep[] = [
      { id: 'a', run: (s: GameState) => { calls.push('a'); return s; } },
      { id: 'p', scope: 'playerOnly' as const, run: (s: GameState) => { calls.push('p'); return s; } },
      { id: 'n', scope: 'npcOnly' as const, run: (s: GameState) => { calls.push('n'); return s; } }
    ];
    const s0 = { morale: 0 } as unknown as GameState;
    runSteps(steps, s0, makeRng('t'), { traveled: true, driver: 'npc' });
    expect(calls).toEqual(['a', 'n']);
    calls.length = 0;
    runSteps(steps, s0, makeRng('t'), { traveled: true, driver: 'player' });
    expect(calls).toEqual(['a', 'p']);
  });
  it('tags: trainShare/attemptFire/adjustMorale playerOnly; npcMoraleBaseline npcOnly', () => {
    const tag = (arr: readonly TickStep[], id: string) => arr.find((x) => x.id === id)?.scope;
    expect(tag(PRE_TRAVEL_STEPS, 'applyTrainShare')).toBe('playerOnly');
    expect(tag(POST_EVENT_TAIL_STEPS, 'attemptFire')).toBe('playerOnly');
    expect(tag(POST_BRANCH_STEPS, 'adjustMorale')).toBe('playerOnly');
    expect(tag(POST_BRANCH_STEPS, 'applyNpcMoraleBaseline')).toBe('npcOnly');
  });
});
