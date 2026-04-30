import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/lib/game/engine';
import { rest } from '../src/lib/game/actions/rest';
import type { GameState } from '../src/lib/game/types';

// Replica of the +page.server.ts ?/rest action flag-management logic.
// This is the part the multi-day camp rework hangs on — if the flags
// don't track right across calls, the UI can't surface the day count.
function restServerAction(state: GameState, opts: { plannedDaysFromForm: number }): GameState {
  const plannedFromFlag = state.flags._campPlannedDays as number | undefined;
  const planned = plannedFromFlag ?? opts.plannedDaysFromForm;
  const sofarBefore = (state.flags._campDaysSoFar as number | undefined) ?? 0;
  let next = rest(state, 1, {});
  const sofarAfter = sofarBefore + 1;
  const flags: typeof next.flags = { ...next.flags };
  if (sofarAfter >= planned) {
    delete flags._campPlannedDays;
    delete flags._campDaysSoFar;
  } else {
    flags._campPlannedDays = planned;
    flags._campDaysSoFar = sofarAfter;
    delete flags._campSummary;
  }
  return { ...next, flags };
}

function newGame(): GameState {
  return createInitialState({
    seed: 'multi-day',
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [{ name: 'Mary', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
}

describe('multi-day camp flag tracking (#187)', () => {
  it('first call sets _campPlannedDays + _campDaysSoFar=1 and suppresses summary', () => {
    let s = newGame();
    s = restServerAction(s, { plannedDaysFromForm: 3 });
    expect(s.flags._campPlannedDays).toBe(3);
    expect(s.flags._campDaysSoFar).toBe(1);
    expect(s.flags._campSummary).toBeUndefined();
  });

  it('second call increments _campDaysSoFar to 2', () => {
    let s = newGame();
    s = restServerAction(s, { plannedDaysFromForm: 3 });
    s = restServerAction(s, { plannedDaysFromForm: 999 }); // form value ignored when flag set
    expect(s.flags._campPlannedDays).toBe(3);
    expect(s.flags._campDaysSoFar).toBe(2);
  });

  it('final call clears both flags + leaves summary in place', () => {
    let s = newGame();
    s = restServerAction(s, { plannedDaysFromForm: 3 });
    s = restServerAction(s, { plannedDaysFromForm: 999 });
    s = restServerAction(s, { plannedDaysFromForm: 999 });
    expect(s.flags._campPlannedDays).toBeUndefined();
    expect(s.flags._campDaysSoFar).toBeUndefined();
    // Summary should be set on the final day so the modal can pop.
    expect(s.flags._campSummary).toBeDefined();
  });

  it('1-day stay clears flags after a single call', () => {
    let s = newGame();
    s = restServerAction(s, { plannedDaysFromForm: 1 });
    expect(s.flags._campPlannedDays).toBeUndefined();
    expect(s.flags._campSummary).toBeDefined();
  });

  it('day actually advances each call', () => {
    let s = newGame();
    const startDay = s.day;
    s = restServerAction(s, { plannedDaysFromForm: 3 });
    expect(s.day).toBe(startDay + 1);
    s = restServerAction(s, { plannedDaysFromForm: 999 });
    expect(s.day).toBe(startDay + 2);
    s = restServerAction(s, { plannedDaysFromForm: 999 });
    expect(s.day).toBe(startDay + 3);
  });
});
