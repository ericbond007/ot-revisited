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
  const oxen: Ox[] = [
    { id: 'o1', health: 100, fatigue: 0, shod: true },
    { id: 'o2', health: 100, fatigue: 0, shod: true }
  ];
  return { ...s, oxen };
}

describe('milesPerDay', () => {
  it('moderate pace on prairie with fresh team is around 18 mi/day', () => {
    const s = newGame();
    const mi = milesPerDay(s);
    expect(mi).toBeGreaterThanOrEqual(17);
    expect(mi).toBeLessThanOrEqual(19);
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

  it('fewer than 2 healthy oxen = 0 mi/day', () => {
    const s = newGame();
    const stranded = { ...s, oxen: [{ id: 'o1', health: 0, fatigue: 0, shod: true }] };
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
    expect(next.location.previousLandmarkId).toBe('independence');
    expect(next.location.nextLandmarkId).not.toBe('ft_kearny');
  });

  it('appends a log entry when a landmark is reached', () => {
    const s = newGame();
    // Position party just before Fort Kearny (cumulative mile 300) with nextLandmarkId set directly.
    const nearKearny = {
      ...s,
      location: { ...s.location, nextLandmarkId: 'ft_kearny', milesTraveled: 289 }
    };
    const next = applyTravel(nearKearny, makeRng('t:1'));
    expect(next.eventLog.length).toBeGreaterThan(s.eventLog.length);
    const last = next.eventLog[next.eventLog.length - 1];
    expect(last.text).toMatch(/Kearny/i);
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
});
