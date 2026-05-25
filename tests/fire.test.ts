import { describe, it, expect } from 'vitest';
import {
  attemptFire,
  FIRE_WOOD_PER_NIGHT,
  gatherFirewoodOnTravel
} from '../src/lib/game/systems/fire';
import { makeRng } from '../src/lib/game/rng';
import { createInitialState } from '../src/lib/game/engine';
import type { GameState } from '../src/lib/game/types';

function newGame() {
  return createInitialState({
    seed: 't',
    leader: { name: 'A', profession: 'farmer' },
    companions: [{ name: 'B', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
}

describe('attemptFire', () => {
  it('wood on hand → fire lights and wood is consumed', () => {
    const s = {
      ...newGame(),
      resources: { ...newGame().resources, firewood: 20 }
    };
    const next = attemptFire(s, makeRng('fire-1'));
    expect(next.flags.hadFireLastNight).toBe(true);
    expect(next.resources.firewood).toBe(20 - FIRE_WOOD_PER_NIGHT);
  });

  it('no wood → cold camp, no fire, wood unchanged', () => {
    const s = {
      ...newGame(),
      resources: { ...newGame().resources, firewood: 0 },
      morale: 50
    };
    const next = attemptFire(s, makeRng('fire-2'));
    expect(next.flags.hadFireLastNight).toBe(false);
    expect(next.resources.firewood ?? 0).toBe(0);
    // Cold camp applies morale penalty.
    expect(next.morale).toBeLessThan(s.morale);
    // And logs a line.
    expect(next.eventLog[next.eventLog.length - 1].text.toLowerCase()).toMatch(/firewood|cold/);
  });

  it('cold terrain without fire drains adult health', () => {
    const s = {
      ...newGame(),
      resources: { ...newGame().resources, firewood: 0 },
      location: { ...newGame().location, terrain: 'mountains' as const }
    };
    const next = attemptFire(s, makeRng('cold-mountain'));
    // At least one alive adult should have lost health.
    const before = s.party.filter((m) => !m.dead).reduce((a, m) => a + m.health, 0);
    const after = next.party.filter((m) => !m.dead).reduce((a, m) => a + m.health, 0);
    expect(after).toBeLessThan(before);
  });

  it('warm terrain without fire spares health but still hits morale', () => {
    const base = newGame();
    const s = {
      ...base,
      // #888c — BASE_KIT now ships a tent which halves the no-fire
      // morale hit. Strip it so this test measures the bare-camp
      // baseline.
      inventory: { ...base.inventory, tent: 0 },
      resources: { ...base.resources, firewood: 0 },
      location: { ...base.location, terrain: 'prairie' as const },
      date: { year: 1848, month: 7, day: 1 }, // July — warm
      morale: 60
    };
    const next = attemptFire(s, makeRng('warm-no-fire'));
    const before = s.party.filter((m) => !m.dead).reduce((a, m) => a + m.health, 0);
    const after = next.party.filter((m) => !m.dead).reduce((a, m) => a + m.health, 0);
    expect(after).toBe(before); // no health drop in warm terrain
    // #1019/#1073 — was -2 under the binary (any no-fire night = full hit).
    // Continuous narrows this: July prairie ~72°F night → intensity=0, so
    // only the Math.max(1, ...) floor applies — the camp still wakes a
    // bit sour without a fire, but no longer takes the full cold-night dose.
    expect(next.morale).toBe(s.morale - 1);
  });
});

describe('gatherFirewoodOnTravel', () => {
  it('forest yields more than desert', () => {
    const forest = {
      ...newGame(),
      resources: { ...newGame().resources, firewood: 0 },
      location: { ...newGame().location, terrain: 'forest' as const }
    };
    const desert = {
      ...newGame(),
      resources: { ...newGame().resources, firewood: 0 },
      location: { ...newGame().location, terrain: 'desert' as const }
    };
    // Run many seeds and compare means.
    let forestSum = 0;
    let desertSum = 0;
    for (let i = 0; i < 20; i++) {
      forestSum += gatherFirewoodOnTravel(forest, makeRng(`f-${i}`)).resources.firewood ?? 0;
      desertSum += gatherFirewoodOnTravel(desert, makeRng(`d-${i}`)).resources.firewood ?? 0;
    }
    expect(forestSum).toBeGreaterThan(desertSum * 2);
  });

  it('wet weather (#143) cuts the gather pile', () => {
    // Same forest, different weather. Sample multiple days per weather
    // so the deterministic per-day jitter doesn't hide the trend.
    const base = newGame();
    function totalOver(weather: 'clear' | 'rain' | 'storm' | 'snow'): number {
      let sum = 0;
      for (let day = 1; day <= 25; day++) {
        const s = {
          ...base,
          day,
          weather,
          resources: { ...base.resources, firewood: 0 },
          location: { ...base.location, terrain: 'forest' as const }
        };
        sum += gatherFirewoodOnTravel(s, makeRng(`w-${day}`)).resources.firewood ?? 0;
      }
      return sum;
    }
    const clear = totalOver('clear');
    const rain  = totalOver('rain');
    const snow  = totalOver('snow');
    const storm = totalOver('storm');

    // Ordering: clear > snow > rain > storm. Storm is dramatically lower.
    expect(rain).toBeLessThan(clear);
    expect(snow).toBeLessThan(clear);
    expect(storm).toBeLessThan(rain);
    // Approximate the configured factors (1.0 / 0.5 / 0.6 / 0.2).
    expect(rain  / clear).toBeGreaterThan(0.4);
    expect(rain  / clear).toBeLessThan(0.6);
    expect(storm / clear).toBeLessThan(0.3);
  });

  it('logs a "wet weather" line when today\'s gather is well below normal', () => {
    const s = {
      ...newGame(),
      day: 7,
      weather: 'storm' as const,
      resources: { ...newGame().resources, firewood: 0 },
      location: { ...newGame().location, terrain: 'prairie' as const }
    };
    const out = gatherFirewoodOnTravel(s, makeRng('wet-log'));
    const line = out.eventLog[out.eventLog.length - 1]?.text ?? '';
    expect(line.toLowerCase()).toMatch(/wet weather|firewood/);
  });

  it('does not log on clear days', () => {
    const s = {
      ...newGame(),
      day: 7,
      weather: 'clear' as const,
      resources: { ...newGame().resources, firewood: 0 },
      eventLog: [],
      location: { ...newGame().location, terrain: 'forest' as const }
    };
    const out = gatherFirewoodOnTravel(s, makeRng('clear-log'));
    // Clear day in a forest should yield well above the wet threshold —
    // no log line.
    expect(out.eventLog).toEqual([]);
  });
});

describe('#1019 + #1073 — continuous cold-camp scaling', () => {
  // Build a no-firewood state at a chosen landmark/terrain/month/weather.
  // Pins party health at 80 so HP-hit assertions have headroom.
  function stateWithNight(opts: {
    landmarkId?: string;
    terrain?: GameState['location']['terrain'];
    month?: number;
    weather?: GameState['weather'];
    miles?: number;
  }): GameState {
    const s = createInitialState({
      seed: 't1019fire',
      leader: { name: 'L', profession: 'farmer' },
      companions: [{ name: 'C', profession: 'farmer' }],
      startDate: { year: 1849, month: opts.month ?? 7, day: 15 }
    });
    return {
      ...s,
      date: { ...s.date, month: opts.month ?? s.date.month },
      weather: opts.weather ?? 'clear',
      resources: { ...s.resources, firewood: 0 }, // forces cold-camp branch
      location: {
        ...s.location,
        previousLandmarkId: null,
        nextLandmarkId: opts.landmarkId ?? 'ft_kearny',
        milesTraveled: opts.miles ?? 0,
        terrain: opts.terrain ?? 'prairie'
      },
      party: s.party.map((m) => ({ ...m, health: 80 }))
    };
  }

  const rng = makeRng('t');

  it('borderline night (≈59°F) → no cold-camp HP penalty (coldIntensity=0)', () => {
    // Prairie ft_kearny May clear → mid ≈ 70−6+5 = 69; night = 69−10 = 59°F.
    // Well above the 40°F threshold → intensity=0 → no HP hit on the party.
    const s = stateWithNight({ landmarkId: 'ft_kearny', terrain: 'prairie', month: 5, weather: 'clear' });
    const before = s.party[0].health;
    const after = attemptFire(s, rng);
    expect(after.party[0].health).toBe(before);
  });

  it('cool night (≈34°F) → HP hit ≈ ×0.75 of binary baseline (0 < hit ≤ 3)', () => {
    // Mountains terrain at ft_kearny (elev 2200), November clear, miles=0:
    // mid = 70−6−0−15+0 = 49; mountains nightSwing 15 → night = 34°F.
    // intensity = (40−34)/8 = 0.75 → baseHit = 2.25 × exp ≈ 1-3 HP.
    const s = stateWithNight({ landmarkId: 'ft_kearny', terrain: 'mountains', month: 11, weather: 'clear' });
    const before = s.party[0].health;
    const after = attemptFire(s, rng);
    expect(after.party[0].health).toBeLessThan(before);
    expect(after.party[0].health).toBeGreaterThanOrEqual(before - 3);
  });

  it('deep mountain winter (< 20°F) → near-max HP hit (well below baseline)', () => {
    // Mountains south_pass (elev 7400), January clear, mid-trail miles 970:
    // elevDelta=32, latDelta≈2.65, monthDelta(1)=-25 → mid ≈ 10.4;
    // night ≈ -4.6°F. intensity capped at 3 → baseHit = 9 → -9 HP.
    const s = stateWithNight({ landmarkId: 'south_pass', terrain: 'mountains', month: 1, weather: 'frost', miles: 970 });
    const before = s.party[0].health;
    const after = attemptFire(s, rng);
    expect(after.party[0].health).toBeLessThan(before - 4);
  });

  it('warm summer prairie storm → NO HP hit (Bryant 1846 "shivered but bore it")', () => {
    // July prairie ft_kearny storm: mid = 70−6+15−10 = 69; night = 59°F.
    // The binary's overclaim ("storm = always cold") no longer takes the
    // full -3 HP dose on a summer-warm storm night.
    const s = stateWithNight({ landmarkId: 'ft_kearny', terrain: 'prairie', month: 7, weather: 'storm' });
    const before = s.party[0].health;
    const after = attemptFire(s, rng);
    expect(after.party[0].health).toBe(before);
  });

  it('frost weather caps nightTempF at 32°F → triggers cold-camp HP penalty', () => {
    // July prairie frost: bare-deltas mid would be 64°F, night 54°F (warm).
    // The frost weather-name floor caps nightTempF at 32°F regardless of
    // season — so frost ALWAYS reads as cold-camp.
    const s = stateWithNight({ landmarkId: 'ft_kearny', terrain: 'prairie', month: 7, weather: 'frost' });
    const before = s.party[0].health;
    const after = attemptFire(s, rng);
    expect(after.party[0].health).toBeLessThan(before);
  });
});
