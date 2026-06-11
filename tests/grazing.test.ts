import { describe, it, expect } from 'vitest';
import {
  grazingQuality,
  consumeOxenFeed,
  tickOxen,
  GRAIN_LB_PER_OX
} from '../src/lib/game/systems/oxen';
import { rest } from '../src/lib/game/actions/rest';
import { makeRng } from '../src/lib/game/rng';
import { createInitialState } from '../src/lib/game/engine';
import type { GameState } from '../src/lib/game/types';

function newGame(overrides: Partial<GameState> = {}): GameState {
  const s = createInitialState({
    seed: 'graze',
    leader: { name: 'A', profession: 'carpenter' },
    companions: [{ name: 'B', profession: 'doctor' }],
    startDate: { year: 1848, month: 7, day: 15 }
  });
  return { ...s, ...overrides };
}

describe('grazingQuality', () => {
  it('prairie summer is the best grazing', () => {
    const s = newGame({ location: { ...newGame().location, terrain: 'prairie' } });
    expect(grazingQuality(s)).toBe(1.0);
  });

  it('mountains in summer is poor', () => {
    const s = newGame({ location: { ...newGame().location, terrain: 'mountains' } });
    expect(grazingQuality(s)).toBeCloseTo(0.4);
  });

  it('desert in summer is dire', () => {
    const s = newGame({ location: { ...newGame().location, terrain: 'desert' } });
    expect(grazingQuality(s)).toBeCloseTo(0.2);
  });

  // #1304 T6c re-baseline — the calendar-decline model (T2) is replaced by
  // weather-driven snow cover.  grazingQuality is now terrain × snowCoverGrazingMult
  // (weather).  The calendar date has NO effect.
  //
  // Clear day → full terrain quality regardless of month:
  //   - prairie clear (any month): 1.0 × 1.0 = 1.0
  //   - mountains clear (any month): 0.4 × 1.0 = 0.4
  //
  // Snow day → cover penalty:
  //   - prairie snow: 1.0 × 0.25 = 0.25
  //   - mountains snow: 0.4 × 0.25 = 0.10
  it('clear winter day has FULL terrain quality — no calendar penalty (T6c)', () => {
    // Marcy 2583–2587: intermountain grass cures on stem; calendar does not kill it.
    const clearWinterPrairie = newGame({
      date: { year: 1848, month: 1, day: 15 },
      weather: 'clear' as const,
      location: { ...newGame().location, terrain: 'prairie' }
    });
    expect(grazingQuality(clearWinterPrairie)).toBeCloseTo(1.0);

    const clearMountains = newGame({
      date: { year: 1848, month: 12, day: 1 },
      weather: 'clear' as const,
      location: { ...newGame().location, terrain: 'mountains' }
    });
    expect(grazingQuality(clearMountains)).toBeCloseTo(0.4);
  });

  it('snow day is severely reduced — cover blocks pawing access (T6c)', () => {
    // Marcy 2578: >2 ft snow blocks pawing. SNOW_COVER_GRAZING = 0.25.
    const snowPrairie = newGame({
      weather: 'snow' as const,
      location: { ...newGame().location, terrain: 'prairie' }
    });
    expect(grazingQuality(snowPrairie)).toBeCloseTo(0.25);

    const snowMountains = newGame({
      weather: 'snow' as const,
      location: { ...newGame().location, terrain: 'mountains' }
    });
    expect(grazingQuality(snowMountains)).toBeCloseTo(0.1);
  });
});

describe('consumeOxenFeed', () => {
  it('does nothing on good grazing', () => {
    const s = newGame({
      location: { ...newGame().location, terrain: 'prairie' },
      inventory: { grain: 50 }
    });
    const out = consumeOxenFeed(s);
    expect(out.fedOxen).toBe(0);
    expect(out.state.inventory.grain).toBe(50);
    expect(out.effectiveGrazing).toBe(1.0);
  });

  it('feeds oxen on poor grazing when grain is plentiful', () => {
    const s = newGame({
      location: { ...newGame().location, terrain: 'mountains' },
      inventory: { grain: 50 }
    });
    const liveOxen = s.oxen.filter((o) => o.health > 0 && o.kind !== 'mule').length;
    expect(liveOxen).toBeGreaterThan(0);

    const out = consumeOxenFeed(s);
    expect(out.fedOxen).toBe(liveOxen);
    expect(out.state.inventory.grain).toBe(50 - liveOxen * GRAIN_LB_PER_OX);
    // All oxen fed → effective grazing = 1.0 (grain offsets fully).
    expect(out.effectiveGrazing).toBeCloseTo(1.0);
  });

  it('partial feed averages effective grazing', () => {
    const s = newGame({
      location: { ...newGame().location, terrain: 'desert' }, // grazing 0.2
      inventory: { grain: 1 } // only enough for 1 ox
    });
    const out = consumeOxenFeed(s);
    expect(out.fedOxen).toBe(1);
    // Some oxen fed (1.0), rest at terrain quality (0.2). Should be
    // strictly between 0.2 and 1.0.
    expect(out.effectiveGrazing).toBeGreaterThan(0.2);
    expect(out.effectiveGrazing).toBeLessThan(1.0);
  });

  it('with no grain on poor grazing, falls back to raw quality', () => {
    const s = newGame({
      location: { ...newGame().location, terrain: 'desert' },
      inventory: {}
    });
    const out = consumeOxenFeed(s);
    expect(out.fedOxen).toBe(0);
    expect(out.effectiveGrazing).toBeCloseTo(0.2);
  });
});

describe('tickOxen with grazing', () => {
  it('oxen tire faster on poor grazing without grain', () => {
    const baseState = newGame({
      location: { ...newGame().location, terrain: 'mountains' },
      inventory: {}
    });
    const fed = newGame({
      location: { ...newGame().location, terrain: 'mountains' },
      inventory: { grain: 100 }
    });

    const afterStarved = tickOxen(baseState, makeRng('a'));
    const afterFed = tickOxen(fed, makeRng('a'));

    const starvedFatigue = afterStarved.oxen[0].fatigue;
    const fedFatigue = afterFed.oxen[0].fatigue;
    expect(starvedFatigue).toBeGreaterThan(fedFatigue);
  });

  it('logs a thin-grazing line when oxen go unfed on poor terrain', () => {
    const s = newGame({
      location: { ...newGame().location, terrain: 'mountains' },
      inventory: {}
    });
    const after = tickOxen(s, makeRng('a'));
    const grazingLogs = after.eventLog.filter((e) => e.text.includes('Thin grazing'));
    expect(grazingLogs.length).toBe(1);
  });

  it('does not log thin-grazing on prairie summer', () => {
    const s = newGame({
      location: { ...newGame().location, terrain: 'prairie' }
    });
    const after = tickOxen(s, makeRng('a'));
    const grazingLogs = after.eventLog.filter((e) => e.text.includes('Thin grazing'));
    expect(grazingLogs.length).toBe(0);
  });
});

describe('rest with grazing', () => {
  it('rest recovers less fatigue on poor grazing without grain', () => {
    const fatiguedTeam = newGame().oxen.map((o) => ({ ...o, fatigue: 80 }));

    const onPrairie = newGame({
      location: { ...newGame().location, terrain: 'prairie' },
      oxen: fatiguedTeam
    });
    const onDesert = newGame({
      location: { ...newGame().location, terrain: 'desert' },
      oxen: fatiguedTeam,
      inventory: {} // no grain
    });

    const afterPrairie = rest(onPrairie, 1);
    const afterDesert = rest(onDesert, 1);

    const prairieFatigue = afterPrairie.oxen[0].fatigue;
    const desertFatigue = afterDesert.oxen[0].fatigue;
    expect(desertFatigue).toBeGreaterThan(prairieFatigue);
  });

  it('grain on rest day restores full recovery on poor terrain', () => {
    const fatiguedTeam = newGame().oxen.map((o) => ({ ...o, fatigue: 80 }));

    const onDesertNoGrain = newGame({
      location: { ...newGame().location, terrain: 'desert' },
      oxen: fatiguedTeam,
      inventory: {}
    });
    const onDesertWithGrain = newGame({
      location: { ...newGame().location, terrain: 'desert' },
      oxen: fatiguedTeam,
      inventory: { grain: 50 }
    });

    const noGrainAfter = rest(onDesertNoGrain, 1);
    const grainAfter = rest(onDesertWithGrain, 1);

    expect(grainAfter.oxen[0].fatigue).toBeLessThan(noGrainAfter.oxen[0].fatigue);
    // Grain consumed.
    expect(grainAfter.inventory.grain).toBeLessThan(50);
  });
});
