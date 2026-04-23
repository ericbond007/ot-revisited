import { describe, it, expect } from 'vitest';
import { WAGONS, getWagon, DEFAULT_WAGON_MODEL } from '../src/lib/game/content/wagons';
import { upgradeState } from '../src/lib/game/upgrade';
import type { GameState } from '../src/lib/game/types';

describe('wagon catalog', () => {
  it('has the three expected models', () => {
    expect(Object.keys(WAGONS).sort()).toEqual(['heavy', 'light', 'prairie_schooner']);
  });

  for (const id of Object.keys(WAGONS) as Array<keyof typeof WAGONS>) {
    it(`${id} has sane numeric fields`, () => {
      const w = WAGONS[id];
      expect(w.price).toBeGreaterThan(0);
      expect(w.carryCapacity).toBeGreaterThan(0);
      expect(w.baseSpeedMult).toBeGreaterThan(0);
      expect(w.minTeam).toBeGreaterThan(0);
      expect(w.optimalTeam).toBeGreaterThanOrEqual(w.minTeam);
      expect(w.name.length).toBeGreaterThan(0);
      expect(w.description.length).toBeGreaterThan(0);
    });
  }

  it('prairie schooner is the declared default', () => {
    expect(DEFAULT_WAGON_MODEL).toBe('prairie_schooner');
    expect(getWagon(DEFAULT_WAGON_MODEL).carryCapacity).toBe(2500);
  });

  it('getWagon throws on unknown id', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => getWagon('nonexistent' as any)).toThrow();
  });

  it('heavy is slower than prairie, light is faster', () => {
    expect(WAGONS.heavy.baseSpeedMult).toBeLessThan(WAGONS.prairie_schooner.baseSpeedMult);
    expect(WAGONS.light.baseSpeedMult).toBeGreaterThan(WAGONS.prairie_schooner.baseSpeedMult);
  });

  it('heavy carries more than prairie, light carries less', () => {
    expect(WAGONS.heavy.carryCapacity).toBeGreaterThan(WAGONS.prairie_schooner.carryCapacity);
    expect(WAGONS.light.carryCapacity).toBeLessThan(WAGONS.prairie_schooner.carryCapacity);
  });

  it('optimal teams match historical: light 2, prairie 4, heavy 6', () => {
    expect(WAGONS.light.optimalTeam).toBe(2);
    expect(WAGONS.prairie_schooner.optimalTeam).toBe(4);
    expect(WAGONS.heavy.optimalTeam).toBe(6);
  });
});

describe('save upgrade — wagon model', () => {
  function legacyState(): GameState {
    // Shape of a pre-wagon-model save. Missing wagon.model.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return {
      seed: 't', day: 1, date: { year: 1848, month: 4, day: 15 },
      location: {
        trailPosition: 0, nextLandmarkId: 'kansas_river', previousLandmarkId: null,
        milesTraveled: 0, terrain: 'prairie'
      },
      party: [],
      // Intentionally omitting .model to simulate a legacy save.
      wagon: { condition: 100, carryCapacity: 2500 } as any,
      oxen: [],
      inventory: {}, cash: 300, resources: { water: 20, waterCap: 20 },
      morale: 70, pace: 'moderate', rations: 'normal',
      eventLog: [], flags: {}, completed: false, outcome: 'in-progress'
    } as GameState;
  }

  it('legacy save (no wagon.model) gets prairie_schooner', () => {
    const upgraded = upgradeState(legacyState());
    expect(upgraded.wagon.model).toBe('prairie_schooner');
  });

  it('unknown model id snaps back to the default', () => {
    const s = legacyState();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s.wagon as any).model = 'not_a_real_model';
    const upgraded = upgradeState(s);
    expect(upgraded.wagon.model).toBe(DEFAULT_WAGON_MODEL);
  });

  it('preserves an already-valid model', () => {
    const s = legacyState();
    s.wagon.model = 'heavy';
    const upgraded = upgradeState(s);
    expect(upgraded.wagon.model).toBe('heavy');
  });
});
