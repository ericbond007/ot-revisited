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
    const s = {
      ...newGame(),
      resources: { ...newGame().resources, firewood: 0 },
      location: { ...newGame().location, terrain: 'prairie' as const },
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
});
