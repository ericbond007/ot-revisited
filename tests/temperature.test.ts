import { describe, it, expect } from 'vitest';
import {
  dayTempF, nightTempF, midTempF, monthDelta, weatherDelta,
  elevationDelta, latitudeDelta, elevationFtAt, latitudeN,
  BASE_TEMP_F
} from '../src/lib/game/systems/temperature';
import { createInitialState } from '../src/lib/game/engine';
import type { GameState } from '../src/lib/game/types';

// Build a state pinned at a specific landmark + miles + month + weather.
function stateAt(opts: {
  landmarkId: string;
  prevId?: string | null;
  miles?: number;
  month?: number;
  weather?: GameState['weather'];
  terrain?: GameState['location']['terrain'];
}): GameState {
  const s = createInitialState({
    seed: 't1019',
    leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'farmer' }],
    startDate: { year: 1849, month: opts.month ?? 6, day: 15 }
  });
  return {
    ...s,
    date: { ...s.date, month: opts.month ?? s.date.month },
    weather: opts.weather ?? 'clear',
    location: {
      ...s.location,
      previousLandmarkId: opts.prevId === undefined ? null : opts.prevId,
      nextLandmarkId: opts.landmarkId,
      milesTraveled: opts.miles ?? 0,
      terrain: opts.terrain ?? s.location.terrain
    }
  };
}

describe('#1019 monthDelta', () => {
  it('peaks at +15 in July (m=7)', () => {
    expect(Math.round(monthDelta(7))).toBe(15);
  });
  it('troughs at -25 in January (m=1)', () => {
    expect(Math.round(monthDelta(1))).toBe(-25);
  });
  it('is approximately zero (≈ -5) in April and October', () => {
    expect(monthDelta(4)).toBeCloseTo(-5, 0);
    expect(monthDelta(10)).toBeCloseTo(-5, 0);
  });
});

describe('#1019 weatherDelta', () => {
  it('clear=0, overcast=-3, rain=-5, storm=-10, snow=-15, frost=-15, heat=+10, fog=-2', () => {
    expect(weatherDelta('clear')).toBe(0);
    expect(weatherDelta('overcast')).toBe(-3);
    expect(weatherDelta('rain')).toBe(-5);
    expect(weatherDelta('storm')).toBe(-10);
    expect(weatherDelta('snow')).toBe(-15);
    expect(weatherDelta('frost')).toBe(-15);
    expect(weatherDelta('heat')).toBe(10);
    expect(weatherDelta('fog')).toBe(-2);
  });
});

describe('#1019 elevation + latitude', () => {
  it('elevationDelta = 0 at or below ELEVATION_REF_FT (1000)', () => {
    const s = stateAt({ landmarkId: 'oregon_city', terrain: 'river' });
    expect(elevationDelta(s)).toBe(0); // river default 1000
  });
  it('elevationDelta scales 5°F per 1000 ft above 1000 ft', () => {
    const s = stateAt({ landmarkId: 'south_pass', terrain: 'mountains' });
    // south_pass elevationFt=7400; above ref by 6400; 6.4 * 5 = 32
    expect(elevationDelta(s)).toBe(32);
  });
  it('latitudeN scales 39→45 across the 2195-mi trail', () => {
    const s0 = stateAt({ landmarkId: 'ft_kearny', miles: 0 });
    const sEnd = stateAt({ landmarkId: 'oregon_city', miles: 2195 });
    expect(latitudeN(s0)).toBeCloseTo(39, 1);
    expect(latitudeN(sEnd)).toBeCloseTo(45, 1);
  });
});

describe('#1019 period anchors', () => {
  it('South Pass July clear night ≈ 35°F (Marcy 1859 high-pass cold nights)', () => {
    const s = stateAt({
      landmarkId: 'south_pass', terrain: 'mountains',
      month: 7, weather: 'clear', miles: 970 // ~lat 41.6
    });
    const night = nightTempF(s);
    expect(night).toBeGreaterThanOrEqual(30);
    expect(night).toBeLessThanOrEqual(40);
  });
  it('Snake desert August clear day ≈ 90-95°F', () => {
    const s = stateAt({
      landmarkId: 'ft_boise', terrain: 'desert',
      month: 8, weather: 'clear', miles: 1600 // ~lat 43.4
    });
    const day = dayTempF(s);
    expect(day).toBeGreaterThanOrEqual(85);
    expect(day).toBeLessThanOrEqual(100);
  });
  it('Prairie December clear night well below cold-camp threshold (< 40°F)', () => {
    const s = stateAt({
      landmarkId: 'ft_kearny', terrain: 'prairie',
      month: 12, weather: 'clear', miles: 320
    });
    expect(nightTempF(s)).toBeLessThan(40);
  });
  it('Independence July storm night is NOT cold-camp grade (> 50°F)', () => {
    // Bryant 1846: "men shivered but bore it" — uncomfortable, not deadly.
    const s = stateAt({
      landmarkId: 'ft_kearny', terrain: 'prairie',
      month: 7, weather: 'storm', miles: 0
    });
    expect(nightTempF(s)).toBeGreaterThan(50);
  });
});

describe('#1019 weather-name physical floors on nightTempF', () => {
  it('frost weather caps nightTempF at 32°F regardless of season', () => {
    const s = stateAt({
      landmarkId: 'ft_kearny', terrain: 'prairie',
      month: 7, weather: 'frost', miles: 0
    });
    expect(nightTempF(s)).toBeLessThanOrEqual(32);
  });
  it('snow weather caps nightTempF at 28°F regardless of season', () => {
    const s = stateAt({
      landmarkId: 'ft_kearny', terrain: 'prairie',
      month: 7, weather: 'snow', miles: 0
    });
    expect(nightTempF(s)).toBeLessThanOrEqual(28);
  });
});

describe('#1019 day/night swing per terrain', () => {
  it('desert swings wider than prairie (day > prairie day; night < prairie night)', () => {
    const desert = stateAt({ landmarkId: 'ft_boise', terrain: 'desert', month: 7 });
    const prairie = stateAt({ landmarkId: 'ft_kearny', terrain: 'prairie', month: 7 });
    // Same month + weather, similar lat/elev: desert day should be > prairie day,
    // desert night < prairie night (deltas: +25/-20 vs +15/-10).
    expect(dayTempF(desert) - midTempF(desert)).toBeGreaterThan(dayTempF(prairie) - midTempF(prairie));
    expect(nightTempF(desert) - midTempF(desert)).toBeLessThan(nightTempF(prairie) - midTempF(prairie));
  });
});

describe('#1019 elevation interpolation', () => {
  it('first segment (previousLandmarkId=null) uses nextLandmark elevation', () => {
    const s = stateAt({ landmarkId: 'south_pass', prevId: null, terrain: 'mountains' });
    expect(elevationFtAt(s)).toBe(7400);
  });
  it('mid-segment between low + high landmarks lands between the two', () => {
    const s = stateAt({
      landmarkId: 'south_pass', prevId: 'ft_laramie',
      terrain: 'mountains'
    });
    const e = elevationFtAt(s);
    // ft_laramie=4300, south_pass=7400; mid ≈ 5850
    expect(e).toBeGreaterThan(4300);
    expect(e).toBeLessThan(7400);
  });
});

describe('#1019 latitudeDelta', () => {
  it('zero at trail start (lat≈39 = LATITUDE_REF_N)', () => {
    const s = stateAt({ landmarkId: 'ft_kearny', miles: 0 });
    expect(latitudeDelta(s)).toBeCloseTo(0, 5);
  });
  it('positive at trail end (lat≈45)', () => {
    const s = stateAt({ landmarkId: 'oregon_city', miles: 2195 });
    expect(latitudeDelta(s)).toBeCloseTo(6, 1);
  });
});

describe('#1019 BASE_TEMP_F sanity', () => {
  it('70°F mid-June clear at the reference (low-elev, lat 39, prairie) sits at BASE', () => {
    // miles=0 → lat=39 (no latDelta); month=6 → monthDelta≈+12; weather=clear=0.
    // landmark ft_kearny elevation=2200 → elev delta = (2200-1000)/1000 * 5 = 6.
    // midTemp = 70 - 6 - 0 + 12 + 0 = 76. Day swing prairie=+15 → dayTemp = 91.
    const s = stateAt({ landmarkId: 'ft_kearny', month: 6, weather: 'clear', miles: 0 });
    expect(midTempF(s)).toBeCloseTo(BASE_TEMP_F - 6 + monthDelta(6), 5);
  });
});
