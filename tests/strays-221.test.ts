import { describe, it, expect } from 'vitest';
import {
  strayChance,
  rollStrayMorning,
  STRAY_BASE_CHANCE,
  PICKET_PINS_STRAY_MULT,
  DOG_STRAY_MULT
} from '../src/lib/game/systems/strays';
import { TEAMSTER_STRAY_MULT } from '../src/lib/game/systems/oxen';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState } from '../src/lib/game/types';

function newGame(over: Partial<GameState> = {}): GameState {
  const s = createInitialState({
    seed: 'strays-test',
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [{ name: 'Mary', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
  return { ...s, ...over };
}

describe('#221 stray-oxen chance + #220 Teamster bonus', () => {
  it('base chance with no mitigations is the constant', () => {
    expect(strayChance(newGame())).toBeCloseTo(STRAY_BASE_CHANCE, 5);
  });

  it('picket pins halve the chance', () => {
    const s = { ...newGame(), inventory: { ...newGame().inventory, picket_pins: 1 } };
    expect(strayChance(s)).toBeCloseTo(STRAY_BASE_CHANCE * PICKET_PINS_STRAY_MULT, 5);
  });

  it('dog reduces the chance by 30%', () => {
    const s: GameState = { ...newGame(), dog: { name: 'Rex' } };
    expect(strayChance(s)).toBeCloseTo(STRAY_BASE_CHANCE * DOG_STRAY_MULT, 5);
  });

  it('Teamster reduces the chance by 40%', () => {
    const base = newGame();
    const s: GameState = {
      ...base,
      party: [{ ...base.party[0], profession: 'teamster' }, ...base.party.slice(1)]
    };
    expect(strayChance(s)).toBeCloseTo(STRAY_BASE_CHANCE * TEAMSTER_STRAY_MULT, 5);
  });

  it('all three mitigations stack multiplicatively', () => {
    const base = newGame();
    const s: GameState = {
      ...base,
      inventory: { ...base.inventory, picket_pins: 1 },
      dog: { name: 'Rex' },
      party: [{ ...base.party[0], profession: 'teamster' }, ...base.party.slice(1)]
    };
    const expected =
      STRAY_BASE_CHANCE * PICKET_PINS_STRAY_MULT * DOG_STRAY_MULT * TEAMSTER_STRAY_MULT;
    expect(strayChance(s)).toBeCloseTo(expected, 5);
    // Stacked rate stays low but never hits zero — period-correct.
    expect(strayChance(s)).toBeGreaterThan(0);
    expect(strayChance(s)).toBeLessThan(0.1);
  });

  it('roll returns milesMult=1 + null log when chance fails', () => {
    // Force-fail the chance with a maximally-stingy rng (always returns
    // ~1.0 so chance() returns false). makeRng is deterministic, so
    // pick a seed where the first draw is high.
    const s = newGame();
    let r = rollStrayMorning(s, makeRng('no-strays'));
    // Loop a few seeds in case the first one fired.
    for (let i = 0; i < 50 && r.logLine !== null; i++) {
      r = rollStrayMorning(s, makeRng(`no-strays-${i}`));
    }
    expect(r.milesMult).toBe(1);
    expect(r.logLine).toBeNull();
    expect(r.state).toBe(s);
  });

  it('a fired incident produces a log line and miles loss', () => {
    // Force the chance to 1.0 so we always fire. Cheapest path: stack
    // the inventory with a picket-pins count of zero (default base
    // chance) and find a seed that hits.
    const s = newGame();
    let r = rollStrayMorning(s, makeRng('strays-fire-1'));
    for (let i = 0; i < 50 && r.logLine === null; i++) {
      r = rollStrayMorning(s, makeRng(`strays-fire-${i}`));
    }
    expect(r.logLine).not.toBeNull();
    expect(r.milesMult).toBeLessThan(1);
    expect(r.milesMult).toBeGreaterThan(0.5);
  });

  it('permanent-loss branch can fire when there are >1 healthy oxen', () => {
    // Try many seeds — eventually one hits the rare permanent-loss
    // path with the base ox count from a fresh game.
    const s = newGame();
    const startCount = s.oxen.filter((o) => o.health > 0).length;
    expect(startCount).toBeGreaterThan(1);
    let lostOne = false;
    for (let i = 0; i < 5000 && !lostOne; i++) {
      const r = rollStrayMorning(s, makeRng(`perm-${i}`));
      const after = r.state.oxen.filter((o) => o.health > 0).length;
      if (after < startCount) lostOne = true;
    }
    expect(lostOne).toBe(true);
  });
});
