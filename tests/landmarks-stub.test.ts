import { describe, it, expect } from 'vitest';
import { LANDMARKS, getLandmark, nextLandmarkAfter } from '../src/lib/game/content/landmarks';

describe('landmark stub (Plan 2a)', () => {
  it('has at least Independence and Fort Kearny', () => {
    const ids = LANDMARKS.map((l) => l.id);
    expect(ids).toContain('independence');
    expect(ids).toContain('ft_kearny');
  });

  it('getLandmark throws on unknown id', () => {
    expect(() => getLandmark('atlantis')).toThrow();
  });

  it('nextLandmarkAfter finds the next one in order', () => {
    const next = nextLandmarkAfter('independence');
    expect(next?.id).toBe('ft_kearny');
  });

  it('nextLandmarkAfter returns null at the end', () => {
    const last = LANDMARKS[LANDMARKS.length - 1].id;
    expect(nextLandmarkAfter(last)).toBeNull();
  });
});
