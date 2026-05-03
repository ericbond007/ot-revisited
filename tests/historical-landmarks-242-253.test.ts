import { describe, it, expect } from 'vitest';
import { LANDMARKS, getLandmark, isLandmarkAbandoned } from '../src/lib/game/content/landmarks';

describe('#242-#253 historical-landmark batch — registration', () => {
  const ids = LANDMARKS.map((l) => l.id);

  it.each([
    'lone_elm_campground',
    'vieux_crossing',
    'rock_creek_station',
    'windlass_hill',
    'rachel_pattison_grave',
    'ft_caspar',
    'martins_cove',
    'big_hill',
    'massacre_rocks',
    'salmon_falls',
    'burnt_river_canyon',
    'flagstaff_hill'
  ])('%s is in LANDMARKS', (id) => {
    expect(ids).toContain(id);
  });
});

describe('#242-#253 trail mileage preservation', () => {
  it('total mileage to Oregon City is unchanged at 2195', () => {
    let sum = 0;
    for (const l of LANDMARKS) sum += l.milesFromPrevious;
    expect(sum).toBe(2195);
  });

  it('cumulative miles to chimney_rock stays at 620', () => {
    let sum = 0;
    for (const l of LANDMARKS) {
      sum += l.milesFromPrevious;
      if (l.id === 'chimney_rock') break;
    }
    expect(sum).toBe(620);
  });

  it('cumulative miles to ft_kearny stays at 335', () => {
    let sum = 0;
    for (const l of LANDMARKS) {
      sum += l.milesFromPrevious;
      if (l.id === 'ft_kearny') break;
    }
    expect(sum).toBe(335);
  });
});

describe('#244 Rock Creek Station — year gating', () => {
  const lm = getLandmark('rock_creek_station');

  it('is a trading_post with frontier postKind', () => {
    expect(lm.kind).toBe('trading_post');
    expect(lm.postKind).toBe('frontier');
  });

  it('is abandoned (treated as not-yet-built) before 1857', () => {
    expect(isLandmarkAbandoned(lm, 1846)).toBe(true);
    expect(isLandmarkAbandoned(lm, 1856)).toBe(true);
  });

  it('is open in 1857+', () => {
    expect(isLandmarkAbandoned(lm, 1857)).toBe(false);
    expect(isLandmarkAbandoned(lm, 1860)).toBe(false);
  });
});

describe('#247 Fort Caspar — year gating', () => {
  const lm = getLandmark('ft_caspar');

  it('is an Army post (us_army)', () => {
    expect(lm.kind).toBe('trading_post');
    expect(lm.postKind).toBe('us_army');
  });

  it('does not buy from emigrants (Army quartermaster)', () => {
    expect(lm.buysFromEmigrants).toBe(false);
  });

  it('is abandoned (not-yet-built) before 1855', () => {
    expect(isLandmarkAbandoned(lm, 1849)).toBe(true);
    expect(isLandmarkAbandoned(lm, 1854)).toBe(true);
  });

  it('is open in 1855+', () => {
    expect(isLandmarkAbandoned(lm, 1855)).toBe(false);
    expect(isLandmarkAbandoned(lm, 1860)).toBe(false);
  });
});

describe('#247-#248 Mormon Ferry / Martin Cove sequencing', () => {
  it('ft_caspar appears before martins_cove', () => {
    const ids = LANDMARKS.map((l) => l.id);
    expect(ids.indexOf('ft_caspar')).toBeLessThan(ids.indexOf('martins_cove'));
  });

  it('both sit between guernsey_ruts and north_platte_2', () => {
    const ids = LANDMARKS.map((l) => l.id);
    const guernsey = ids.indexOf('guernsey_ruts');
    const np2 = ids.indexOf('north_platte_2');
    expect(ids.indexOf('ft_caspar')).toBeGreaterThan(guernsey);
    expect(ids.indexOf('martins_cove')).toBeLessThan(np2);
  });
});

describe('isLandmarkAbandoned — both directions', () => {
  it('abandonedAfterYear still works (existing behavior)', () => {
    const ftHall = getLandmark('ft_hall');  // abandonedAfterYear: 1856
    expect(isLandmarkAbandoned(ftHall, 1855)).toBe(false);
    expect(isLandmarkAbandoned(ftHall, 1857)).toBe(true);
  });
});
