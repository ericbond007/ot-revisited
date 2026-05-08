import { describe, it, expect } from 'vitest';
import {
  attemptFire,
  FIRE_WOOD_PER_NIGHT,
  gatherFirewoodOnTravel
} from '../src/lib/game/systems/fire';
import { makeRng } from '../src/lib/game/rng';
import { createInitialState } from '../src/lib/game/engine';

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
    expect(next.morale).toBe(s.morale - 2);
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
