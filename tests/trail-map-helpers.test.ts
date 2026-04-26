import { describe, it, expect } from 'vitest';
import {
  accumulateMiles,
  currentLeg,
  milesToNext,
  milesToNextOfKind,
  interpolatePosition,
  totalMiles,
  legOrdinal,
  type MarkedLandmark
} from '../src/lib/ui/trail-map/trail-map-helpers';
import { LANDMARKS } from '../src/lib/game/content/landmarks';

const fixture: MarkedLandmark[] = accumulateMiles([
  { id: 'a', name: 'Start',     milesFromPrevious: 0,   terrain: 'prairie', kind: 'start' },
  { id: 'b', name: 'Mid',       milesFromPrevious: 100, terrain: 'prairie', kind: 'landmark' },
  { id: 'c', name: 'River',     milesFromPrevious: 50,  terrain: 'river',   kind: 'river' },
  { id: 'd', name: 'Fort',      milesFromPrevious: 75,  terrain: 'prairie', kind: 'trading_post' },
  { id: 'e', name: 'End',       milesFromPrevious: 200, terrain: 'forest',  kind: 'end' }
]);

describe('accumulateMiles', () => {
  it('builds running cumulative miles', () => {
    expect(fixture.map((m) => m.mile)).toEqual([0, 100, 150, 225, 425]);
  });

  it('handles the real LANDMARKS array', () => {
    const real = accumulateMiles(LANDMARKS);
    expect(real.length).toBe(LANDMARKS.length);
    expect(real[0].mile).toBe(0);
    expect(real[real.length - 1].mile).toBeGreaterThan(2000);
  });
});

describe('currentLeg', () => {
  it('at game start (mileage 0) — last is Start, next is Mid', () => {
    const { last, next } = currentLeg(fixture, 0);
    expect(last?.id).toBe('a');
    expect(next?.id).toBe('b');
  });

  it('mid-leg between Mid and River', () => {
    const { last, next } = currentLeg(fixture, 130);
    expect(last?.id).toBe('b');
    expect(next?.id).toBe('c');
  });

  it('exactly at a landmark — that landmark counts as last', () => {
    const { last, next } = currentLeg(fixture, 150);
    expect(last?.id).toBe('c');
    expect(next?.id).toBe('d');
  });

  it('past the final landmark — next is null', () => {
    const { last, next } = currentLeg(fixture, 9999);
    expect(last?.id).toBe('e');
    expect(next).toBe(null);
  });

  it('before the first landmark — last is null (negative mileage edge case)', () => {
    const { last, next } = currentLeg(fixture, -10);
    expect(last).toBe(null);
    expect(next?.id).toBe('a');
  });
});

describe('milesToNext', () => {
  it('rounds the miles to the nearest integer', () => {
    expect(milesToNext(fixture, 130.4)).toEqual({ name: 'River', miles: 20 });
  });

  it('returns null when past the end', () => {
    expect(milesToNext(fixture, 9999)).toBe(null);
  });
});

describe('milesToNextOfKind', () => {
  it('finds the next trading_post past current mileage', () => {
    expect(milesToNextOfKind(fixture, 50, 'trading_post')).toEqual({ name: 'Fort', miles: 175 });
  });

  it('skips a same-kind landmark already passed', () => {
    expect(milesToNextOfKind(fixture, 230, 'trading_post')).toBe(null);
  });

  it('returns null when there is none of that kind ahead', () => {
    expect(milesToNextOfKind(fixture, 0, 'start')).toBe(null);
  });
});

describe('interpolatePosition', () => {
  const coords = {
    a: [0, 0],
    b: [100, 50],
    c: [200, 60],
    d: [300, 40],
    e: [400, 20]
  } as const satisfies Record<string, readonly [number, number]>;

  it('lerps halfway between two landmarks', () => {
    // Halfway from Mid (100mi, [100,50]) to River (150mi, [200,60]).
    const [x, y] = interpolatePosition(fixture, 125, coords);
    expect(x).toBeCloseTo(150);
    expect(y).toBeCloseTo(55);
  });

  it('snaps exactly at a landmark', () => {
    expect(interpolatePosition(fixture, 150, coords)).toEqual([200, 60]);
  });

  it('clamps before the start', () => {
    expect(interpolatePosition(fixture, -5, coords)).toEqual([0, 0]);
  });

  it('clamps past the end', () => {
    expect(interpolatePosition(fixture, 9999, coords)).toEqual([400, 20]);
  });

  it('returns origin when the coords map is missing the relevant ids', () => {
    const empty: Record<string, readonly [number, number]> = {};
    expect(interpolatePosition(fixture, 125, empty)).toEqual([0, 0]);
  });
});

describe('totalMiles', () => {
  it('matches the last landmark mile', () => {
    expect(totalMiles(fixture)).toBe(425);
  });

  it('returns 0 for empty', () => {
    expect(totalMiles([])).toBe(0);
  });
});

describe('legOrdinal', () => {
  // Stop kinds: start(0), river(150), trading_post(225), end(425) → 3 legs
  it('first leg before any stop crossed', () => {
    expect(legOrdinal(fixture, 50)).toEqual({ current: 1, total: 3 });
  });

  it('second leg between river and fort', () => {
    expect(legOrdinal(fixture, 200)).toEqual({ current: 2, total: 3 });
  });

  it('past the fort, in the final leg', () => {
    expect(legOrdinal(fixture, 300)).toEqual({ current: 3, total: 3 });
  });
});
