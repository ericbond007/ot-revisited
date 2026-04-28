import { describe, it, expect } from 'vitest';
import { tickDayPausable, applyPendingChoice } from '../src/lib/game/engine-pausable';
import { createInitialState } from '../src/lib/game/engine';
import { LANDMARKS } from '../src/lib/game/content/landmarks';
import {
  LANDMARK_ARRIVAL_EVENTS,
  getLandmarkArrivalEvent
} from '../src/lib/game/content/landmark-arrival-events';
import type { GameState } from '../src/lib/game/types';

function runningMilesTo(id: string): number {
  let sum = 0;
  for (const l of LANDMARKS) {
    sum += l.milesFromPrevious;
    if (l.id === id) return sum;
  }
  throw new Error(`unknown landmark ${id}`);
}

function newGame(seed = 'arrival-test'): GameState {
  const s = createInitialState({
    seed,
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [
      { name: 'Mary', profession: 'doctor' },
      { name: 'Tom', profession: 'hunter' }
    ],
    startDate: { year: 1848, month: 4, day: 15 }
  });
  // Pad water + firewood so a long no-interaction run doesn't kill the
  // party before they reach the iconic landmarks.
  return { ...s, resources: { water: 5000, waterCap: 5000, firewood: 5000 } };
}

/** Place the party one mile shy of the named landmark, with the right
 *  pointers so the next tick crosses it. */
function justBefore(state: GameState, landmarkId: string): GameState {
  return {
    ...state,
    location: {
      ...state.location,
      milesTraveled: runningMilesTo(landmarkId) - 1,
      nextLandmarkId: landmarkId,
      // previousLandmarkId stays whatever it was (the engine compares
      // before/after to detect a change). 'independence_mo' is the
      // safe starting value (the trail-start city).
      previousLandmarkId: state.location.previousLandmarkId ?? 'independence_mo'
    }
  };
}

describe('landmark arrival events', () => {
  it('catalog covers the iconic scenic landmarks', () => {
    expect(getLandmarkArrivalEvent('alcove_spring')).toBeTruthy();
    expect(getLandmarkArrivalEvent('ash_hollow')).toBeTruthy();
    expect(getLandmarkArrivalEvent('chimney_rock')).toBeTruthy();
    expect(getLandmarkArrivalEvent('scotts_bluff')).toBeTruthy();
    expect(getLandmarkArrivalEvent('register_cliff')).toBeTruthy();
    expect(getLandmarkArrivalEvent('independence_rock')).toBeTruthy();
    expect(getLandmarkArrivalEvent('devils_gate')).toBeTruthy();
    expect(getLandmarkArrivalEvent('south_pass')).toBeTruthy();
    expect(getLandmarkArrivalEvent('pacific_springs')).toBeTruthy();
    expect(getLandmarkArrivalEvent('soda_springs')).toBeTruthy();
    expect(getLandmarkArrivalEvent('laurel_hill')).toBeTruthy();
  });

  it('returns undefined for landmarks without an arrival event', () => {
    // Visual-only landmarks — render on the map, log "Passed X.", no modal.
    expect(getLandmarkArrivalEvent('guernsey_ruts')).toBeUndefined();
    expect(getLandmarkArrivalEvent('courthouse_rock')).toBeUndefined();
    expect(getLandmarkArrivalEvent('farewell_bend')).toBeUndefined();
    expect(getLandmarkArrivalEvent('ft_kearny')).toBeUndefined(); // trading post — no arrival event
  });

  it('every arrival event has at least one choice with a default', () => {
    for (const ev of Object.values(LANDMARK_ARRIVAL_EVENTS)) {
      expect(ev.choices.length).toBeGreaterThan(0);
      const hasDefault = ev.choices.some((c) => c.isDefault);
      expect(hasDefault).toBe(true);
    }
  });

  it('crossing chimney_rock fires its arrival event', () => {
    let s = justBefore(newGame(), 'chimney_rock');
    let pending = null;
    // Travel up to a few days to make sure we land on chimney_rock.
    for (let i = 0; i < 5; i++) {
      const result = tickDayPausable(s);
      if (result.pendingEvent) {
        pending = result.pendingEvent;
        break;
      }
      s = result.state;
    }
    expect(pending).toBeTruthy();
    expect(pending!.id).toBe('arrival_chimney_rock');
  });

  it('resolving an arrival event applies the chosen effect and advances the day', () => {
    let s = justBefore(newGame(), 'chimney_rock');
    let result = tickDayPausable(s);
    // March forward until the arrival fires.
    while (!result.pendingEvent) {
      s = result.state;
      result = tickDayPausable(s);
    }
    const before = result.state;
    const after = applyPendingChoice(before, result.pendingEvent!, 'pause');
    expect(after.morale).toBeGreaterThanOrEqual(before.morale + 4);
    expect(after.day).toBe(before.day + 1);
  });

  it('does not double-fire on the same arrival', () => {
    let s = justBefore(newGame(), 'chimney_rock');
    // Travel until arrival, resolve, then keep ticking — should not re-fire.
    let result = tickDayPausable(s);
    while (!result.pendingEvent) {
      s = result.state;
      result = tickDayPausable(s);
    }
    const resolved = applyPendingChoice(result.state, result.pendingEvent!, 'press_on');
    // Continue ticking — chimney_rock is now in our past.
    let next = resolved;
    for (let i = 0; i < 5; i++) {
      const r = tickDayPausable(next);
      next = r.state;
      // Should NOT re-fire chimney_rock.
      if (r.pendingEvent && r.pendingEvent.id === 'arrival_chimney_rock') {
        throw new Error('chimney_rock fired twice');
      }
    }
  });
});
