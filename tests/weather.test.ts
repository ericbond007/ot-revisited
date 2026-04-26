import { describe, it, expect } from 'vitest';
import { tickWeather, weatherTravelMult, weatherWaterMult, pickWeather } from '../src/lib/game/systems/weather';
import { makeRng } from '../src/lib/game/rng';
import { createInitialState } from '../src/lib/game/engine';
import type { GameState, Weather } from '../src/lib/game/types';

function newGame(overrides: Partial<GameState> = {}): GameState {
  const s = createInitialState({
    seed: 'weather-test',
    leader: { name: 'A', profession: 'carpenter' },
    companions: [{ name: 'B', profession: 'doctor' }],
    startDate: { year: 1848, month: 7, day: 15 }
  });
  return { ...s, ...overrides };
}

describe('weather picker', () => {
  it('picks deterministically given the same seed and state', () => {
    const s = newGame();
    const a = pickWeather(s, makeRng('a:1'));
    const b = pickWeather(s, makeRng('a:1'));
    expect(a).toBe(b);
  });

  it('honors stickiness — yesterday biases today', () => {
    // Run 200 days fixed at one weather, count how often the picker
    // re-picks 'storm'. With 2x stickiness on a base storm weight of 2/14
    // on prairie summer, we should see well above the 14% baseline.
    const base = newGame({ weather: 'storm' });
    let stormStreak = 0;
    for (let i = 0; i < 200; i++) {
      const next = pickWeather(base, makeRng(`stick:${i}`));
      if (next === 'storm') stormStreak++;
    }
    // Baseline storm weight in prairie/summer is 2 / (6+2+1+2+3) = ~14%.
    // With 2x stickiness applied on top of 'storm', we should get >20%.
    expect(stormStreak).toBeGreaterThan(40);
  });
});

describe('weather travel multiplier', () => {
  it('storms slow travel hardest', () => {
    expect(weatherTravelMult('storm')).toBeLessThan(weatherTravelMult('rain'));
    expect(weatherTravelMult('rain')).toBeLessThan(weatherTravelMult('clear'));
  });
  it('clear is the baseline 1.0', () => {
    expect(weatherTravelMult('clear')).toBe(1.0);
  });
});

describe('weather water multiplier', () => {
  it('heat doubles water consumption', () => {
    expect(weatherWaterMult('heat')).toBe(2.0);
  });
  it('overcast and rain trim water consumption', () => {
    expect(weatherWaterMult('overcast')).toBeLessThan(1.0);
    expect(weatherWaterMult('rain')).toBeLessThan(1.0);
  });
});

describe('tickWeather side effects', () => {
  it('rain refills clean water up to cap', () => {
    // Force the state so the picker returns 'rain' — easiest is to
    // simulate the side-effect by calling the rain branch directly via
    // tickWeather + checking when it actually rolls rain. Run the loop
    // until we get a rain day, then check refill.
    const s = newGame({
      resources: { water: 10, waterCap: 40, firewood: 20 },
      weather: 'rain' // sticky bias toward rain
    });
    // 50 attempts: at least one should pick rain and refill.
    let sawRefill = false;
    for (let day = 1; day <= 50; day++) {
      const test = { ...s, day };
      const after = tickWeather(test, makeRng(`probe:${day}`));
      if (after.weather === 'rain' && after.resources.water > 10) {
        expect(after.resources.water).toBeLessThanOrEqual(after.resources.waterCap);
        sawRefill = true;
        break;
      }
    }
    expect(sawRefill).toBe(true);
  });

  it('storm chips wagon condition and morale', () => {
    const s = newGame({ weather: 'storm' });
    let sawDamage = false;
    for (let day = 1; day <= 50; day++) {
      const test = { ...s, day };
      const after = tickWeather(test, makeRng(`probe:${day}`));
      if (after.weather === 'storm') {
        expect(after.wagon.condition).toBeLessThan(s.wagon.condition);
        expect(after.morale).toBeLessThan(s.morale);
        sawDamage = true;
        break;
      }
    }
    expect(sawDamage).toBe(true);
  });

  it('uses an isolated rng sub-stream — does not perturb the passed rng', () => {
    // tickWeather is called with the daily pipeline's rng but should
    // pull from its own seeded sub-stream so adding/removing it
    // doesn't shift downstream event rolls. Verify by calling
    // tickWeather with a shared rng and confirming the rng's next
    // pull matches what it would have produced without weather.
    const sharedRng = makeRng('shared:1');
    const baselineFirst = sharedRng.next();
    const baselineSecond = sharedRng.next();

    const fresh = makeRng('shared:1');
    const s = newGame();
    tickWeather(s, fresh);
    // After tickWeather, the next rng pull on `fresh` should still be
    // the original first value (the shared rng was untouched by weather).
    expect(fresh.next()).toBe(baselineFirst);
    expect(fresh.next()).toBe(baselineSecond);
  });

  it('records weather on state', () => {
    const s = newGame();
    const after = tickWeather(s, makeRng('w:1'));
    const valid: Weather[] = ['clear', 'overcast', 'rain', 'storm', 'snow', 'heat', 'fog', 'frost'];
    expect(valid).toContain(after.weather);
  });
});
