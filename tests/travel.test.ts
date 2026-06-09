import { describe, it, expect } from 'vitest';
import { applyTravel, milesPerDay } from '../src/lib/game/systems/travel';
import { makeRng } from '../src/lib/game/rng';
import { createInitialState } from '../src/lib/game/engine';
import type { Ox } from '../src/lib/game/types';

function newGame() {
  const s = createInitialState({
    seed: 't',
    leader: { name: 'A', profession: 'farmer' },
    companions: [{ name: 'B', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
  // Prairie schooner's optimal team is 4; 4 healthy oxen keeps the team
  // factor at 1.0 so per-day-miles math is easy to reason about.
  const oxen: Ox[] = [
    { id: 'o1', health: 100, fatigue: 0, shod: true },
    { id: 'o2', health: 100, fatigue: 0, shod: true },
    { id: 'o3', health: 100, fatigue: 0, shod: true },
    { id: 'o4', health: 100, fatigue: 0, shod: true }
  ];
  return { ...s, oxen };
}

describe('milesPerDay', () => {
  it('moderate pace on prairie with fresh team is around 20 mi/day', () => {
    const s = newGame();
    const mi = milesPerDay(s);
    expect(mi).toBeGreaterThanOrEqual(19);
    expect(mi).toBeLessThanOrEqual(21);
  });

  it('slow < moderate < fast < grueling on same terrain', () => {
    const s = newGame();
    const slow = milesPerDay({ ...s, pace: 'slow' });
    const mod = milesPerDay({ ...s, pace: 'moderate' });
    const fast = milesPerDay({ ...s, pace: 'fast' });
    const gru = milesPerDay({ ...s, pace: 'grueling' });
    expect(slow).toBeLessThan(mod);
    expect(mod).toBeLessThan(fast);
    expect(fast).toBeLessThan(gru);
  });

  it('mountains cut speed significantly', () => {
    const s = newGame();
    const prairie = milesPerDay({ ...s, location: { ...s.location, terrain: 'prairie' } });
    const mtns = milesPerDay({ ...s, location: { ...s.location, terrain: 'mountains' } });
    expect(mtns).toBeLessThan(prairie * 0.7);
  });

  it('fewer oxen than the wagon model minimum = 0 mi/day', () => {
    const s = newGame();
    // Prairie schooner's minTeam is 2, so 1 healthy ox strands the party.
    const stranded = {
      ...s,
      oxen: [
        { id: 'o1', health: 0, fatigue: 0, shod: true },
        { id: 'o2', health: 0, fatigue: 0, shod: true },
        { id: 'o3', health: 0, fatigue: 0, shod: true },
        { id: 'o4', health: 100, fatigue: 0, shod: true }
      ]
    };
    expect(milesPerDay(stranded)).toBe(0);
  });
});

describe('applyTravel', () => {
  it('adds miles to milesTraveled', () => {
    const s = newGame();
    const next = applyTravel(s, makeRng('t:1'));
    expect(next.location.milesTraveled).toBeGreaterThan(0);
  });

  it('reaches the next landmark when miles accumulate', () => {
    const s = newGame();
    const nearly = { ...s, location: { ...s.location, milesTraveled: 299 } };
    const next = applyTravel(nearly, makeRng('t:1'));
    expect(next.location.previousLandmarkId).toBe('kansas_river');
    expect(next.location.nextLandmarkId).not.toBe('ft_kearny');
  });

  it('appends a "passed" log entry when a scenic landmark is reached', () => {
    const s = newGame();
    // Position just before Alcove Spring (scenic, non-stopping) via nextLandmarkId.
    const near = {
      ...s,
      location: { ...s.location, nextLandmarkId: 'alcove_spring', milesTraveled: 999 }
    };
    const next = applyTravel(near, makeRng('t:1'));
    expect(next.eventLog.length).toBeGreaterThan(s.eventLog.length);
    const last = next.eventLog[next.eventLog.length - 1];
    expect(last.text).toMatch(/passed/i);
    expect(last.text).toMatch(/alcove/i);
  });

  it('sets atLandmarkId without logging when a stop-worthy landmark is reached', () => {
    // The combined "traveled N days (M mi) to arrive at X" log is appended
    // by the server-side travel loop, not by applyTravel itself.
    const s = newGame();
    const nearKearny = {
      ...s,
      location: { ...s.location, nextLandmarkId: 'ft_kearny', milesTraveled: 325 }
    };
    const next = applyTravel(nearKearny, makeRng('t:1'));
    expect(next.location.atLandmarkId).toBe('ft_kearny');
    expect(next.eventLog.length).toBe(s.eventLog.length);
  });

  it('does not advance past the final landmark', () => {
    const s = newGame();
    const atEnd = {
      ...s,
      location: {
        ...s.location,
        nextLandmarkId: 'oregon_city',
        previousLandmarkId: 'laurel_hill',
        milesTraveled: 9999
      }
    };
    const next = applyTravel(atEnd, makeRng('t:1'));
    expect(next.completed).toBe(true);
  });

  it('sets atLandmarkId when reaching a trading post (stop-worthy)', () => {
    const s = newGame();
    // Fort Kearny is at cumulative mile 335 (post-#172 calibration) and
    // is a trading_post.
    const nearKearny = {
      ...s,
      location: { ...s.location, nextLandmarkId: 'ft_kearny', milesTraveled: 325 }
    };
    const next = applyTravel(nearKearny, makeRng('t:1'));
    expect(next.location.atLandmarkId).toBe('ft_kearny');
  });

  it('does not set atLandmarkId for scenic (non-stop) landmarks', () => {
    const s = newGame();
    // Chimney Rock is a scenic landmark (kind: 'landmark'), not a trading post.
    const nearChimney = {
      ...s,
      location: { ...s.location, nextLandmarkId: 'chimney_rock', milesTraveled: 814 }
    };
    const next = applyTravel(nearChimney, makeRng('t:1'));
    expect(next.location.atLandmarkId).toBeFalsy();
  });

  it('clears atLandmarkId on the next travel day (departure)', () => {
    const s = newGame();
    // Simulate having just arrived at Fort Kearny.
    const atKearny = {
      ...s,
      location: {
        ...s.location,
        previousLandmarkId: 'ft_kearny',
        nextLandmarkId: 'ash_hollow',
        milesTraveled: 300,
        atLandmarkId: 'ft_kearny'
      }
    };
    const next = applyTravel(atKearny, makeRng('t:1'));
    expect(next.location.atLandmarkId).toBeFalsy();
    expect(next.location.milesTraveled).toBeGreaterThan(300);
  });
});

describe('milesPerDay honors ox hydration', () => {
  it('a parched team travels fewer miles than a watered one, all else equal', () => {
    const base = newGame();
    // Put the team on a desert leg so hydration matters (non-desert is watered = mult 1.0).
    const desertState = { ...base, location: { ...base.location, terrain: 'desert' as const } };
    const watered = {
      ...desertState,
      oxen: desertState.oxen.map((o) => ({ ...o, hydration: 100 }))
    };
    const parched = {
      ...desertState,
      oxen: desertState.oxen.map((o) => ({ ...o, hydration: 20 }))
    };
    expect(milesPerDay(parched)).toBeLessThan(milesPerDay(watered));
  });
});
