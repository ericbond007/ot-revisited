import { describe, it, expect } from 'vitest';
import { LANDMARKS } from '../src/lib/game/content/landmarks';

describe('full trail catalog', () => {
  it('has ~30+ stops', () => {
    expect(LANDMARKS.length).toBeGreaterThanOrEqual(30);
  });

  it('starts at Independence and ends at Oregon City', () => {
    expect(LANDMARKS[0].id).toBe('independence');
    expect(LANDMARKS[LANDMARKS.length - 1].id).toBe('oregon_city');
  });

  it('mileage totals ~2000 miles', () => {
    const total = LANDMARKS.reduce((sum, l) => sum + l.milesFromPrevious, 0);
    expect(total).toBeGreaterThan(1800);
    expect(total).toBeLessThan(2200);
  });

  it('every landmark has kind and terrain', () => {
    for (const l of LANDMARKS) {
      expect(l.kind).toBeTruthy();
      expect(l.terrain).toBeTruthy();
    }
  });

  it('includes the iconic stops', () => {
    const ids = LANDMARKS.map((l) => l.id);
    for (const id of [
      'ft_kearny', 'chimney_rock', 'ft_laramie', 'independence_rock',
      'south_pass', 'soda_springs', 'ft_hall', 'the_dalles', 'oregon_city'
    ]) {
      expect(ids).toContain(id);
    }
  });

  it('includes river crossings', () => {
    const rivers = LANDMARKS.filter((l) => l.kind === 'river');
    expect(rivers.length).toBeGreaterThanOrEqual(5);
  });
});
