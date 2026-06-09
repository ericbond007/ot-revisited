// #1266 stage1b — dissent-override must charge ox/wagon/dehydration wear.
// Fixture reused from company-dissent-1046b.test.ts: trainGame() + tickDayPausable
// to land in a _companyDissentPending state.
import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import { generateTrain } from '../src/lib/game/content/trains';
import type { GameState } from '../src/lib/game/types';
import { tickDayPausable, applyCompanyDissent } from '../src/lib/game/engine-pausable';

/** Reuse the same trainGame shape from company-dissent-1046b.test.ts */
function g(): GameState {
  return createInitialState({
    seed: 'b', leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'doctor' }],
    startDate: { year: 1849, month: 6, day: 15 }
  });
}

function trainGame(doctrine: 'prudent' | 'hard_driver' | 'devout', leaderId = 'player'): GameState {
  const s = g();
  const t = generateTrain('bd', 1, null, makeRng('bd'), { fresh: true });
  return {
    ...s,
    wagonTrain: { ...t, doctrine, leaderId,
      companyDecisionBlock: { mode: 'maintenance_layby', blockStartDay: s.day } }
  };
}

/** Build a dissent-pending state: high ox fatigue triggers lay-by + dissent,
 *  but we then override the oxen to fatigue:0 so we can measure increase. */
function dissentPendingState(): GameState {
  // Step 1: use high fatigue to force the lay-by + dissent pause
  const s = trainGame('prudent');
  const withHighFatigue: GameState = {
    ...s,
    date: { year: 1849, month: 6, day: 18 }, // Monday (not Sabbath)
    wagonTrain: {
      ...s.wagonTrain!,
      companyDecisionBlock: undefined,
      companions: s.wagonTrain!.companions.map((w) => ({
        ...w,
        oxen: w.oxen.map((o) => ({ ...o, fatigue: 90 }))
      }))
    },
    oxen: s.oxen.map((o) => ({ ...o, fatigue: 90 }))
  };
  const { state: paused } = tickDayPausable(withHighFatigue);
  // Verify it paused
  if (!paused.flags._companyDissentPending) {
    throw new Error('fixture: expected _companyDissentPending to be set');
  }
  // Step 2: reset oxen to fatigue:0 on the paused state so we can detect change
  return {
    ...paused,
    oxen: paused.oxen.map((o) => ({ ...o, fatigue: 0 })),
    // Empty the keg so applyDehydration fires
    resources: { ...paused.resources, water: 0, dirtyWater: 0 }
  };
}

describe('#1266 stage1b — dissent-override charges wear', () => {
  it('override branch: ox fatigue increases, wagon condition decreases, dehydration ticks', () => {
    const paused = dissentPendingState();
    const startFatigue = paused.oxen.reduce((sum, o) => sum + o.fatigue, 0);
    const startCondition = paused.wagon.condition;

    const after = applyCompanyDissent(paused, 'override', makeRng('dissent-wear'));

    const endFatigue = after.oxen.reduce((sum, o) => sum + o.fatigue, 0);
    expect(endFatigue).toBeGreaterThan(startFatigue); // tickOxen ran

    expect(after.wagon.condition).toBeLessThan(startCondition); // tickWagon ran

    // applyDehydration ran on an empty keg → _dehydrationDays >= 1
    expect(typeof after.flags._dehydrationDays).toBe('number');
    expect(after.flags._dehydrationDays as number).toBeGreaterThanOrEqual(1);
  });

  it('abide branch: ox fatigue stays 0 (lay-by is restful), dehydration still ticks on empty keg', () => {
    const paused = dissentPendingState();

    const after = applyCompanyDissent(paused, 'abide', makeRng('dissent-wear'));

    // No travel on abide — oxen should NOT gain fatigue (they rested)
    const endFatigue = after.oxen.reduce((sum, o) => sum + o.fatigue, 0);
    expect(endFatigue).toBe(0);

    // applyDehydration still runs via POST_EVENT_TAIL_STEPS on any day — empty keg → _dehydrationDays >= 1
    expect(typeof after.flags._dehydrationDays).toBe('number');
    expect(after.flags._dehydrationDays as number).toBeGreaterThanOrEqual(1);
  });
});
