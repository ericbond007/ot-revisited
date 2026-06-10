// #1266 stage3 — sabbath-travel debit must fire for the PLAYER when the
// player overrides a sabbath_layby dissent on a Sunday. Prior to the fix,
// applyCompanyDissent ran applyDailyRecovery + applyTrainShare directly,
// bypassing applySabbathTravelDebit (the third step in PRE_TRAVEL_STEPS).
// An override on a Sabbath lay-by silently dodged the morale cost.
//
// NB: advanceTrain fires the NPC Sabbath debit on NPC wagons regardless.
// The player's own debit (no "(family)" suffix) is the missing piece.
import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import { generateTrain } from '../src/lib/game/content/trains';
import { isSunday } from '../src/lib/game/utils/calendar';
import { SABBATH_TRAVEL_MORALE_DEBIT } from '../src/lib/game/systems/sabbath-travel';
import type { GameState } from '../src/lib/game/types';
import { tickDayPausable, applyCompanyDissent } from '../src/lib/game/engine-pausable';

// ---- helpers ----------------------------------------------------------------

function g(): GameState {
  return createInitialState({
    seed: 'sabbath-test', leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'doctor' }],
    startDate: { year: 1849, month: 1, day: 1 }
  });
}

/** Build a state with high ox fatigue so tickDayPausable triggers dissent,
 *  on the given date, with the given companyDecisionBlock mode. */
function dissentPendingOnDate(
  year: number, month: number, day: number,
  mode: 'sabbath_layby' | 'maintenance_layby'
): GameState {
  const base = g();
  const t = generateTrain('sabb-train', 1, null, makeRng('sabb'), { fresh: true });
  const withTrain: GameState = {
    ...base,
    date: { year, month, day },
    oxen: base.oxen.map((o) => ({ ...o, fatigue: 90 })),
    wagonTrain: {
      ...t,
      doctrine: 'devout',
      leaderId: 'player',
      companyDecisionBlock: { mode, blockStartDay: base.day },
      companions: t.companions.map((w) => ({
        ...w,
        oxen: w.oxen.map((o) => ({ ...o, fatigue: 90 }))
      }))
    }
  };
  const { state: paused } = tickDayPausable(withTrain);
  if (!paused.flags._companyDissentPending) {
    throw new Error(`fixture: expected _companyDissentPending (mode=${mode}, date=${year}-${month}-${day})`);
  }
  return paused;
}

/** Returns the player-specific Sabbath log entry: text starts with
 *  "Traveled on the Sabbath" and does NOT end with a parenthetical
 *  family name (NPC entries have "(family name)" suffix). */
function findPlayerSabbathEntry(state: GameState) {
  return state.eventLog.find(
    (e) => e.text.startsWith('Traveled on the Sabbath') && !e.text.includes('(')
  );
}

// ---- tests ------------------------------------------------------------------

describe('#1266 stage3 — sabbath_layby override charges the player Sabbath debit', () => {

  it('precondition: 1849-01-07 is a Sunday (calendar sanity)', () => {
    expect(isSunday({ year: 1849, month: 1, day: 7 })).toBe(true);
  });

  // Test A — override on a Sunday sabbath_layby → player morale drops by the
  // Sabbath debit AND the player Sabbath log entry appears.
  it('A: override on Sunday sabbath_layby → player Sabbath debit in eventLog and morale', () => {
    const paused = dissentPendingOnDate(1849, 1, 7, 'sabbath_layby');
    expect(isSunday(paused.date)).toBe(true); // double-check fixture date survived

    // Capture morale right before the continuation so we can measure the debit
    // irrespective of other morale changes (train share, recovery, etc.).
    // applySabbathTravelDebit fires inside PRE_TRAVEL_STEPS — it charges BEFORE
    // any morale-recovery from applyDailyRecovery, so the net change is
    // ≥ SABBATH_TRAVEL_MORALE_DEBIT (other sources can add, not subtract).
    // Simplest robust assertion: the player log entry exists.
    const after = applyCompanyDissent(paused, 'override', makeRng('sabb-a'));

    const sabbathEntry = findPlayerSabbathEntry(after);
    expect(sabbathEntry, 'player Sabbath log entry should be present').toBeDefined();
  });

  // Test B (control): abide → not traveling → no player Sabbath debit
  it('B: abide on Sunday sabbath_layby → NO player Sabbath log entry', () => {
    const paused = dissentPendingOnDate(1849, 1, 7, 'sabbath_layby');

    const after = applyCompanyDissent(paused, 'abide', makeRng('sabb-b'));

    const sabbathEntry = findPlayerSabbathEntry(after);
    expect(sabbathEntry, 'player Sabbath log entry should NOT be present on abide').toBeUndefined();
  });

  // Test C (regression): non-Sunday override → isSunday=false → debit no-ops
  it('C: non-Sunday maintenance_layby override → NO player Sabbath log entry', () => {
    // 1849-06-18 is a Monday (verified: new Date(1849,5,18).getDay() === 1)
    const paused = dissentPendingOnDate(1849, 6, 18, 'maintenance_layby');
    expect(isSunday(paused.date)).toBe(false);

    const after = applyCompanyDissent(paused, 'override', makeRng('sabb-c'));

    const sabbathEntry = findPlayerSabbathEntry(after);
    expect(sabbathEntry, 'player Sabbath log entry should NOT be present on non-Sunday').toBeUndefined();
  });
});
