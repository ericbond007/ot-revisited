import { describe, it, expect } from 'vitest';
import {
  LANDMARK_APPROACH_EVENTS,
  approachFiredFlag,
  pickApproachEvent
} from '../src/lib/game/content/landmark-approach-events';
import { milesToLandmark } from '../src/lib/game/systems/travel';
import { tickDayPausable } from '../src/lib/game/engine-pausable';
import { createInitialState } from '../src/lib/game/engine';
import type { GameState } from '../src/lib/game/types';

function newGame(over: Partial<GameState> = {}): GameState {
  const s = createInitialState({
    seed: 'approach-233',
    leader: { name: 'Ezra', profession: 'banker' },
    companions: [{ name: 'Mary', profession: 'farmer' }],
    startDate: { year: 1848, month: 5, day: 1 }
  });
  return { ...s, ...over };
}

// #1040 — historical mileage pass: chimney_rock cumulative is now the
// canonical 492 mi from Independence (was 620).
function setMilesAndNext(s: GameState, milesTraveled: number, nextLandmarkId: string): GameState {
  return {
    ...s,
    location: { ...s.location, milesTraveled, nextLandmarkId }
  };
}

describe('#233 landmark approach events — registry', () => {
  it('chimney_rock first-sight is registered', () => {
    const entry = LANDMARK_APPROACH_EVENTS.find((e) => e.landmarkId === 'chimney_rock');
    expect(entry).toBeDefined();
    expect(entry!.event.id).toBe('approach_chimney_rock');
    expect(entry!.milesAway).toBeGreaterThanOrEqual(20);
  });

  it('approach event has more than one choice', () => {
    const entry = LANDMARK_APPROACH_EVENTS.find((e) => e.landmarkId === 'chimney_rock')!;
    expect(entry.event.choices.length).toBeGreaterThanOrEqual(2);
  });
});

describe('#233 milesToLandmark helper', () => {
  it('returns positive distance to a future landmark', () => {
    const s = newGame();
    expect(milesToLandmark(s, 'chimney_rock')).toBe(492);
  });

  it('returns negative for a passed landmark', () => {
    const s = setMilesAndNext(newGame(), 700, 'scotts_bluff');
    expect(milesToLandmark(s, 'chimney_rock')).toBeLessThan(0);
  });

  it('returns -1 for an unknown id', () => {
    expect(milesToLandmark(newGame(), 'nowhere_real')).toBe(-1);
  });
});

describe('#233 pickApproachEvent — gating', () => {
  it('does not fire when far from the target', () => {
    const s = setMilesAndNext(newGame(), 100, 'kansas_river');
    const picked = pickApproachEvent(s, (id) => milesToLandmark(s, id));
    expect(picked).toBeUndefined();
  });

  it('fires once miles-away drops to threshold', () => {
    // 30 mi from chimney_rock → 620 - 30 = 590 traveled.
    const s = setMilesAndNext(newGame(), 462, 'courthouse_rock');
    const picked = pickApproachEvent(s, (id) => milesToLandmark(s, id));
    expect(picked).toBeDefined();
    expect(picked!.landmarkId).toBe('chimney_rock');
  });

  it('does not re-fire once one-shot flag is set', () => {
    const s: GameState = {
      ...setMilesAndNext(newGame(), 462, 'courthouse_rock'),
      flags: { ...newGame().flags, [approachFiredFlag('chimney_rock')]: true }
    };
    const picked = pickApproachEvent(s, (id) => milesToLandmark(s, id));
    expect(picked).toBeUndefined();
  });

  it('does not fire after the landmark has been passed', () => {
    const s = setMilesAndNext(newGame(), 700, 'scotts_bluff');
    const picked = pickApproachEvent(s, (id) => milesToLandmark(s, id));
    expect(picked).toBeUndefined();
  });
});

describe('#233 engine wiring', () => {
  it('day-tick pauses with the approach event when threshold is crossed', () => {
    const base = setMilesAndNext(newGame(), 452, 'courthouse_rock');
    const result = tickDayPausable(base);
    // Travel will advance milesTraveled; at moderate pace that lands within 30mi of chimney_rock.
    expect(result.pendingEvent).toBeDefined();
    expect(result.pendingEvent!.id).toBe('approach_chimney_rock');
    // One-shot flag set on the returned state.
    expect(result.state.flags[approachFiredFlag('chimney_rock')]).toBe(true);
  });

  it('approach event does not re-fire on a subsequent tick', () => {
    const base = setMilesAndNext(newGame(), 452, 'courthouse_rock');
    const first = tickDayPausable(base);
    expect(first.pendingEvent?.id).toBe('approach_chimney_rock');
    // Clear the pause and tick again from the marked state.
    const second = tickDayPausable({
      ...first.state,
      flags: { ...first.state.flags, _lastEventDay: 0 }
    });
    expect(second.pendingEvent?.id ?? null).not.toBe('approach_chimney_rock');
  });

  it('press-on choice grants morale +2', () => {
    const entry = LANDMARK_APPROACH_EVENTS.find((e) => e.landmarkId === 'chimney_rock')!;
    const press = entry.event.choices.find((c) => c.id === 'press_on')!;
    const before: GameState = { ...newGame(), morale: 50 };
    const after = press.apply(before, undefined as never);
    expect(after.morale).toBe(52);
  });

  it('journal choice grants morale +4', () => {
    const entry = LANDMARK_APPROACH_EVENTS.find((e) => e.landmarkId === 'chimney_rock')!;
    const journal = entry.event.choices.find((c) => c.id === 'journal')!;
    const before: GameState = { ...newGame(), morale: 50 };
    const after = journal.apply(before, undefined as never);
    expect(after.morale).toBe(54);
  });

  it('morale gains clamp at 100', () => {
    const entry = LANDMARK_APPROACH_EVENTS.find((e) => e.landmarkId === 'chimney_rock')!;
    const journal = entry.event.choices.find((c) => c.id === 'journal')!;
    const before: GameState = { ...newGame(), morale: 99 };
    const after = journal.apply(before, undefined as never);
    expect(after.morale).toBe(100);
  });
});
