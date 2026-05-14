// Integration coverage of the /outfit server action's wagon + oxen wiring.
// Exercises the internal helpers that the action uses (kept in the same
// file as the action itself — we re-export them via the public action test
// by invoking the action with a form).

import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/lib/game/engine';
import { getWagon } from '../src/lib/game/content/wagons';
import { milesPerDay } from '../src/lib/game/systems/travel';

describe('wagon-model integration with createInitialState', () => {
  it('default game gets prairie schooner', () => {
    const s = createInitialState({
      seed: 't',
      leader: { name: 'A', profession: 'farmer' },
      companions: [{ name: 'B', profession: 'doctor' }],
      startDate: { year: 1848, month: 4, day: 15 }
    });
    expect(s.wagon.model).toBe('prairie_schooner');
    expect(s.wagon.carryCapacity).toBe(2500);
  });

  it('light wagon sets 1500 lb cap', () => {
    const s = createInitialState({
      seed: 't',
      leader: { name: 'A', profession: 'farmer' },
      companions: [{ name: 'B', profession: 'doctor' }],
      startDate: { year: 1848, month: 4, day: 15 },
      wagonModel: 'light'
    });
    expect(s.wagon.model).toBe('light');
    expect(s.wagon.carryCapacity).toBe(1500);
  });

  it('heavy wagon sets 3500 lb cap', () => {
    const s = createInitialState({
      seed: 't',
      leader: { name: 'A', profession: 'farmer' },
      companions: [{ name: 'B', profession: 'doctor' }],
      startDate: { year: 1848, month: 4, day: 15 },
      wagonModel: 'heavy'
    });
    expect(s.wagon.model).toBe('heavy');
    expect(s.wagon.carryCapacity).toBe(3500);
  });

  it('heavy wagon with default 6 oxen exactly meets optimal team (#963b1)', () => {
    // #963b1: starter oxen bumped 4 → 6 to match Marcy 1859's
    // "indispensable extra yoke". Heavy wagon (optimalTeam=6) is now
    // exactly fitted by default rather than under-teamed.
    const s = createInitialState({
      seed: 't',
      leader: { name: 'A', profession: 'farmer' },
      companions: [{ name: 'B', profession: 'doctor' }],
      startDate: { year: 1848, month: 4, day: 15 },
      wagonModel: 'heavy'
    });
    const heavy = getWagon('heavy');
    expect(s.oxen.length).toBe(heavy.optimalTeam);
    // milesPerDay should be positive at optimal team
    expect(milesPerDay(s)).toBeGreaterThan(0);
  });

  it('getWagon(heavy).baseSpeedMult < prairie.baseSpeedMult', () => {
    expect(getWagon('heavy').baseSpeedMult).toBeLessThan(getWagon('prairie_schooner').baseSpeedMult);
  });

  it('getWagon(light).optimalTeam is smaller than prairie', () => {
    expect(getWagon('light').optimalTeam).toBeLessThan(getWagon('prairie_schooner').optimalTeam);
  });
});
