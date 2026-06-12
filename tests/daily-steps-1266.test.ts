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
      'applyPastryQuality', 'rollDailyTheft', 'applyDirtyWaterRisk',
      // #1389 — ambient Platte corridor cholera, 1849–1853, before Fort Laramie.
      // Unscoped (NPC parity). After dirty-water so at-most-one gate works.
      'applyCholeraCorridorRisk',
      'applyStarvation'
    ]);
  });
  it('TRAVEL_OX_WAGON_STEPS exact order', () => {
    expect(TRAVEL_OX_WAGON_STEPS.map((s) => s.id)).toEqual(['tickOxen', 'applyOxHydration', 'tickWagon']);
  });
  it('POST_BRANCH_STEPS exact order', () => {
    // #1304-T3: checkSnowNews appended (sub-rng, scope='all' — no rng-stream disturbance).
    // #1304-T2: checkTrainPaceLift appended (scope='playerOnly', no rng consumed, level-trigger).
    // #1403: applyMourningCap appended LAST (scope='all', NPC parity, must follow all morale sources).
    // Re-baselined per docs/superpowers/specs/2026-06-11-train-governance-research.md.
    expect(POST_BRANCH_STEPS.map((s) => s.id)).toEqual([
      'adjustMorale', 'applyNpcMoraleBaseline', 'applyHolidays', 'checkSnowNews', 'checkTrainPaceLift',
      'applyMourningCap'
    ]);
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


describe('#1266 stage3 — companyRestMode on TickCtx (PRE_TRAVEL NPC carve)', () => {
  // Minimal GameState stub: healthy enough to trigger layByRecovery.
  // morale=50 → healingMultiplier=1.0 → gain = Math.round(8 * 1.0) = 8.
  // Member at health=50, no conditions, alive → will gain +8 on a lay-by.
  const member = {
    name: 'Test',
    health: 50,
    conditions: [],
    dead: false,
    profession: 'farmer',
    sex: 'M',
    age: 30
  };
  function makeStub(overrides: Partial<{ morale: number; pace: string }> = {}) {
    return {
      morale: overrides.morale ?? 50,
      pace: overrides.pace ?? 'moderate',
      party: [{ ...member }],
      // Fields applyDailyRecovery doesn't read but runSteps touches via other steps
      // are irrelevant here — PRE_TRAVEL_STEPS steps other than applyDailyRecovery
      // are either playerOnly (applyTrainShare, filtered) or (applySabbathTravelDebit
      // which returns state unchanged when !isRestSunday && !traveled).
      date: { year: 1849, month: 6, day: 15 }, // not a Sunday — no Sabbath debit
      flags: {},
      resources: { water: 100 },
      inventory: { flour: 100 },
      oxen: [],
      wagon: { condition: 100, capacity: 1600 },
      waterRation: 'normal'
    } as unknown as import('../src/lib/game/types').GameState;
  }

  it('npc + crisis_layby skips daily recovery (health stays 50)', () => {
    const s = makeStub();
    const ctx: TickCtx = { traveled: false, driver: 'npc', companyRestMode: 'crisis_layby' };
    const out = runSteps(PRE_TRAVEL_STEPS, s, makeRng('t'), ctx);
    expect(out.party[0].health).toBe(50);
  });

  it('npc + maintenance_layby keeps the heal (health rises from 50)', () => {
    const s = makeStub();
    const ctx: TickCtx = { traveled: false, driver: 'npc', companyRestMode: 'maintenance_layby' };
    const out = runSteps(PRE_TRAVEL_STEPS, s, makeRng('t'), ctx);
    expect(out.party[0].health).toBeGreaterThan(50);
  });

  it('player heals even in crisis_layby (crisis carve is NPC-only)', () => {
    const s = makeStub();
    const ctx: TickCtx = { traveled: false, driver: 'player', companyRestMode: 'crisis_layby' };
    const out = runSteps(PRE_TRAVEL_STEPS, s, makeRng('t'), ctx);
    expect(out.party[0].health).toBeGreaterThan(50);
  });
});
