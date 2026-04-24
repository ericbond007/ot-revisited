import { describe, it, expect } from 'vitest';
import { hunt } from '../src/lib/game/actions/hunt';
import { adjustMorale } from '../src/lib/game/systems/morale';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState, Ox } from '../src/lib/game/types';

function newGame(): GameState {
  const s = createInitialState({
    seed: 'dog-test',
    leader: { name: 'A', profession: 'hunter' },
    companions: [{ name: 'B', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
  const oxen: Ox[] = [
    { id: 'o1', health: 100, fatigue: 10, shod: true },
    { id: 'o2', health: 100, fatigue: 10, shod: true }
  ];
  return { ...s, oxen, inventory: { ...s.inventory, rifle: 1, bullets: 40 } };
}

describe('dog', () => {
  it('adds +15% hunt yield when present', () => {
    const withDog = { ...newGame(), dog: { name: 'Shep' } };
    const withoutDog = newGame();
    // Same seed + same target/ammo/hunters → deterministic rng path.
    // Dog branch adds 0.15 to yieldMultiplier after the profession bonus,
    // so the meat gain should be strictly higher with the dog present.
    const h1 = hunt(withDog, { target: 'medium', ammo: 'moderate', hunters: 1 });
    const h2 = hunt(withoutDog, { target: 'medium', ammo: 'moderate', hunters: 1 });
    const meat1 = h1.inventory.game_meat ?? 0;
    const meat2 = h2.inventory.game_meat ?? 0;
    expect(meat1).toBeGreaterThan(meat2);
  });

  it('adjustMorale ticks +1 when a dog is present', () => {
    const rng = makeRng('morale-dog');
    const base = { ...newGame(), morale: 50, rations: 'normal' as const };
    const withDog = { ...base, dog: { name: 'Rex' } };
    const noDog = base;
    const m1 = adjustMorale(withDog, rng).morale;
    const m2 = adjustMorale(noDog, rng).morale;
    expect(m1 - m2).toBe(1);
  });

  it('dog name survives serialization round-trip through JSON', () => {
    const s = { ...newGame(), dog: { name: 'Old Blue' } };
    const json = JSON.stringify(s);
    const parsed = JSON.parse(json) as GameState;
    expect(parsed.dog?.name).toBe('Old Blue');
  });
});
