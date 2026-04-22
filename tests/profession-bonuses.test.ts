// Numeric-bonus verification for the phase-1 balance pass.
// Trade stacking and Farmer food reduction are covered in their own files;
// this file covers Teamster, Preacher, Whore, and Carpenter bonuses.

import { describe, it, expect } from 'vitest';
import type { GameState, PartyMember, ProfessionId } from '../src/lib/game/types';
import { tickOxen } from '../src/lib/game/systems/oxen';
import { adjustMorale } from '../src/lib/game/systems/morale';
import { rest } from '../src/lib/game/actions/rest';
import { consumeWagonPart, deathMoralePenalty } from '../src/lib/game/professions/bonuses';
import { makeRng } from '../src/lib/game/rng';

function mkMember(id: string, profession: ProfessionId, name = id): PartyMember {
  return {
    id, name, profession, isLeader: false, age: 30, health: 100, conditions: [], dead: false
  };
}

function baseState(partyProfs: ProfessionId[] = ['carpenter'], overrides: Partial<GameState> = {}): GameState {
  return {
    seed: 't',
    day: 1,
    date: { year: 1848, month: 4, day: 1 },
    location: {
      trailPosition: 0,
      nextLandmarkId: 'ft_kearny',
      previousLandmarkId: null,
      milesTraveled: 0,
      terrain: 'prairie'
    },
    party: partyProfs.map((p, i) => mkMember(`m${i}`, p, `M${i}`)),
    wagon: { condition: 100, carryCapacity: 2500 },
    oxen: [
      { id: 'o1', health: 100, fatigue: 10, shod: true },
      { id: 'o2', health: 100, fatigue: 10, shod: true }
    ],
    inventory: { flour: 200, bacon: 100 },
    cash: 100,
    resources: { water: 10, waterCap: 20 },
    morale: 60,
    pace: 'moderate',
    rations: 'normal',
    eventLog: [],
    flags: {},
    completed: false,
    outcome: 'in-progress',
    ...overrides
  };
}

describe('Teamster', () => {
  it('reduces ox fatigue accumulation by 15%', () => {
    const plain = baseState(['carpenter', 'doctor']);
    const withTeam = baseState(['teamster', 'doctor']);
    const plainAfter = tickOxen(plain, makeRng('t'));
    const teamAfter = tickOxen(withTeam, makeRng('t'));
    expect(teamAfter.oxen[0].fatigue).toBeLessThan(plainAfter.oxen[0].fatigue);
  });

  it('boosts ox fatigue recovery at rest', () => {
    const plain = baseState(['carpenter', 'doctor'], {
      oxen: [{ id: 'o1', health: 100, fatigue: 80, shod: true }]
    });
    const withTeam = baseState(['teamster', 'doctor'], {
      oxen: [{ id: 'o1', health: 100, fatigue: 80, shod: true }]
    });
    const plainAfter = rest(plain, 1);
    const teamAfter = rest(withTeam, 1);
    expect(teamAfter.oxen[0].fatigue).toBeLessThan(plainAfter.oxen[0].fatigue);
  });
});

describe('Preacher', () => {
  it('halves death morale penalty (rounded up)', () => {
    const withPreacher = baseState(['preacher']);
    const withoutPreacher = baseState(['carpenter']);
    expect(deathMoralePenalty(withPreacher, 4)).toBe(2); // 4 * 0.5
    expect(deathMoralePenalty(withPreacher, 3)).toBe(2); // 3 * 0.5 = 1.5 ceil → 2
    expect(deathMoralePenalty(withoutPreacher, 4)).toBe(4);
  });

  it('grants +1 morale per rest night', () => {
    const withPreacher = baseState(['preacher', 'doctor']);
    const withoutPreacher = baseState(['carpenter', 'doctor']);
    const plainAfter = rest(withoutPreacher, 1);
    const preacherAfter = rest(withPreacher, 1);
    expect(preacherAfter.morale).toBeGreaterThan(plainAfter.morale);
  });
});

describe('Whore', () => {
  it('clamps morale floor to 15', () => {
    const withWhore = baseState(['whore', 'doctor'], { morale: 5, inventory: {} });
    // Force a morale-losing pass (rations meager + no food) so adjustMorale tries to decrement
    const s = { ...withWhore, rations: 'meager' as const };
    const after = adjustMorale(s, makeRng('t'));
    expect(after.morale).toBeGreaterThanOrEqual(15);
  });

  it('does not prevent normal decreases above the floor', () => {
    const withWhore = baseState(['whore', 'doctor'], { morale: 50, inventory: {}, rations: 'meager' });
    const after = adjustMorale(withWhore, makeRng('t'));
    // Meager + no food should drop morale, just not below 15
    expect(after.morale).toBeLessThan(50);
    expect(after.morale).toBeGreaterThanOrEqual(15);
  });

  it('grants +2 morale per rest night (stacks with Preacher)', () => {
    const plain = baseState(['carpenter', 'doctor']);
    const withWhore = baseState(['whore', 'doctor']);
    const withBoth = baseState(['whore', 'preacher']);
    const plainAfter = rest(plain, 1);
    const whoreAfter = rest(withWhore, 1);
    const bothAfter = rest(withBoth, 1);
    expect(whoreAfter.morale - plainAfter.morale).toBe(2);
    expect(bothAfter.morale - plainAfter.morale).toBe(3);
  });
});

describe('Carpenter', () => {
  it('sometimes saves the spare part (50% chance when alive)', () => {
    // Run many trials, confirm the save-rate is ~50% (±15pp)
    const s = baseState(['carpenter'], { inventory: { wheel: 1 } });
    let saves = 0;
    for (let i = 0; i < 200; i++) {
      const rng = makeRng(`t:${i}`);
      const { saved } = consumeWagonPart(s, rng, 'wheel');
      if (saved) saves++;
    }
    expect(saves).toBeGreaterThan(70);
    expect(saves).toBeLessThan(130);
  });

  it('always consumes the part when no Carpenter is alive', () => {
    const s = baseState(['hunter'], { inventory: { wheel: 1 } });
    for (let i = 0; i < 50; i++) {
      const rng = makeRng(`t:${i}`);
      const { state: after, saved } = consumeWagonPart(s, rng, 'wheel');
      expect(saved).toBe(false);
      expect(after.inventory.wheel).toBe(0);
    }
  });
});
