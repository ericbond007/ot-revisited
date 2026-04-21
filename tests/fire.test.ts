import { describe, it, expect } from 'vitest';
import { attemptFire, fireSuccessChance } from '../src/lib/game/systems/fire';
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

describe('fireSuccessChance', () => {
  it('forest terrain is near-guaranteed', () => {
    const s = { ...newGame(), location: { ...newGame().location, terrain: 'forest' as const } };
    expect(fireSuccessChance(s)).toBeGreaterThan(0.95);
  });

  it('prairie is common', () => {
    const s = { ...newGame(), location: { ...newGame().location, terrain: 'prairie' as const } };
    expect(fireSuccessChance(s)).toBeGreaterThan(0.85);
    expect(fireSuccessChance(s)).toBeLessThan(0.99);
  });

  it('desert is lowest', () => {
    const s = { ...newGame(), location: { ...newGame().location, terrain: 'desert' as const } };
    expect(fireSuccessChance(s)).toBeLessThan(0.85);
  });

  it('bigger parties get a small bonus', () => {
    const small = newGame();
    const big = createInitialState({
      seed: 't',
      leader: { name: 'A', profession: 'farmer' },
      companions: [
        { name: 'B', profession: 'doctor' },
        { name: 'C', profession: 'hunter' },
        { name: 'D', profession: 'scout' },
        { name: 'E', profession: 'preacher' },
        { name: 'F', profession: 'gunsmith' }
      ],
      startDate: { year: 1848, month: 4, day: 15 }
    });
    expect(fireSuccessChance(big)).toBeGreaterThan(fireSuccessChance(small));
  });
});

describe('attemptFire', () => {
  it('sets hadFireLastNight based on the roll', () => {
    const s = { ...newGame(), location: { ...newGame().location, terrain: 'forest' as const } };
    const next = attemptFire(s, makeRng('t:1'));
    expect(next.flags.hadFireLastNight).toBe(true);
  });

  it('logs a line only on failure', () => {
    const s = {
      ...newGame(),
      location: { ...newGame().location, terrain: 'desert' as const }
    };
    for (let d = 0; d < 200; d++) {
      const r = makeRng(`${s.seed}:${d}`);
      const result = attemptFire(s, r);
      if (!result.flags.hadFireLastNight) {
        expect(result.eventLog[result.eventLog.length - 1].text).toMatch(/fire/i);
        return;
      }
    }
    throw new Error('Expected at least one failure across 200 seeds');
  });
});
