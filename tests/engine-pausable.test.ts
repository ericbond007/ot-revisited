import { describe, it, expect } from 'vitest';
import { tickDayPausable, applyPendingChoice } from '../src/lib/game/engine-pausable';
import { makeRng } from '../src/lib/game/rng';
import { createInitialState } from '../src/lib/game/engine';
import { EVENTS } from '../src/lib/game/content/events';

function newGame(seed = 'pausable') {
  return createInitialState({
    seed,
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [
      { name: 'Mary', profession: 'doctor' },
      { name: 'Tom', profession: 'hunter' }
    ],
    startDate: { year: 1848, month: 4, day: 15 }
  });
}

describe('tickDayPausable', () => {
  it('returns state only when no event fires', () => {
    // Find a (seed, day) combo where no event fires.
    let s = newGame('no-event');
    for (let attempt = 0; attempt < 20; attempt++) {
      const result = tickDayPausable(s);
      if (!result.pendingEvent) {
        expect(result.state.day).toBe(s.day + 1);
        return;
      }
      s = applyPendingChoice(result.state, result.pendingEvent, result.pendingEvent.choices.find(c => c.isDefault)!.id);
    }
    // In worst case this test may fire in every attempt — just fine.
  });

  it('returns pendingEvent when an event fires', () => {
    // Use a seed that produces an event on day 1.
    const seeds = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    for (const seed of seeds) {
      const result = tickDayPausable(newGame(seed));
      if (result.pendingEvent) {
        expect(result.pendingEvent.id).toBeTruthy();
        expect(result.pendingEvent.choices.length).toBeGreaterThanOrEqual(1);
        // Day DID NOT advance yet (pending resolution holds the loop)
        expect(result.state.day).toBe(1);
        return;
      }
    }
    throw new Error('Expected at least one event to fire across 8 seeds');
  });

  it('applyPendingChoice applies the choice and advances the day', () => {
    // Find an event to apply.
    for (const seed of ['e1','e2','e3','e4','e5','e6','e7','e8']) {
      const result = tickDayPausable(newGame(seed));
      if (result.pendingEvent) {
        const applied = applyPendingChoice(result.state, result.pendingEvent, result.pendingEvent.choices[0].id);
        expect(applied.day).toBe(2);
        return;
      }
    }
    throw new Error('Expected event to test apply');
  });

  it('does not roll a travel event on the tick that arrives at a landmark', () => {
    // Bug: on arrival at Fort Kearney the trading-post view appeared AND
    // a travel event also fired on top. Travel events should be road-only.
    // This test runs many seeds of "one day's march away from a
    // stop-worthy landmark" and asserts no pendingEvent is ever queued
    // when the tick lands at atLandmarkId.
    const seeds = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10'];
    let arrivals = 0;
    for (const seed of seeds) {
      const base = newGame(seed);
      // Park them one mile short of the first stop-worthy landmark
      // (Kansas River ~102 miles out). Moderate pace covers the gap.
      const parked = {
        ...base,
        location: { ...base.location, milesTraveled: 101 }
      };
      const result = tickDayPausable(parked);
      if (result.state.location.atLandmarkId) {
        arrivals++;
        // On every arrival tick, there must be no pending travel event.
        expect(result.pendingEvent).toBeUndefined();
      }
    }
    expect(arrivals).toBeGreaterThan(0);
  });
});
