import { describe, it, expect } from 'vitest';
import { getLandmark, isLandmarkAbandoned } from '../src/lib/game/content/landmarks';

describe('landmark abandonment', () => {
  it('Fort Hall is open in 1848', () => {
    expect(isLandmarkAbandoned(getLandmark('ft_hall'), 1848)).toBe(false);
  });

  it('Fort Hall is open in 1856 (HBC still present)', () => {
    expect(isLandmarkAbandoned(getLandmark('ft_hall'), 1856)).toBe(false);
  });

  it('Fort Hall is abandoned in 1857', () => {
    expect(isLandmarkAbandoned(getLandmark('ft_hall'), 1857)).toBe(true);
  });

  it('other trading posts are not abandoned on the same year', () => {
    expect(isLandmarkAbandoned(getLandmark('ft_laramie'), 1857)).toBe(false);
    expect(isLandmarkAbandoned(getLandmark('ft_bridger'), 1857)).toBe(false);
    expect(isLandmarkAbandoned(getLandmark('the_dalles'), 1870)).toBe(false);
  });

  it('landmarks with no abandonedAfterYear never register as abandoned', () => {
    expect(isLandmarkAbandoned(getLandmark('kansas_river'), 9999)).toBe(false);
  });
});
