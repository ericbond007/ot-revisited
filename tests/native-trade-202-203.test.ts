import { describe, it, expect } from 'vitest';
import { LANDMARKS, getLandmark, isNativeCampHostile } from '../src/lib/game/content/landmarks';
import { resolveEvent } from '../src/lib/game/systems/events';
import { EVENTS } from '../src/lib/game/content/events';
import { ENCOUNTER_EVENTS } from '../src/lib/game/content/encounters';
import { adjustTribeAttitude, getTribeAttitude } from '../src/lib/game/systems/tribe-relations';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState } from '../src/lib/game/types';

function newGame(over: Partial<GameState> = {}): GameState {
  const s = createInitialState({
    seed: 'native-trade',
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [{ name: 'Mary', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
  return { ...s, ...over };
}

describe('native landmarks (#202)', () => {
  it('cheyenne_camp + shoshone_camp are registered with postKind=native', () => {
    const cheyenne = getLandmark('cheyenne_camp');
    const shoshone = getLandmark('shoshone_camp');
    expect(cheyenne.postKind).toBe('native');
    expect(cheyenne.tribeId).toBe('cheyenne');
    expect(shoshone.postKind).toBe('native');
    expect(shoshone.tribeId).toBe('shoshone');
  });

  it('both camps are trading_post landmarks with stock', () => {
    for (const id of ['cheyenne_camp', 'shoshone_camp']) {
      const l = getLandmark(id);
      expect(l.kind).toBe('trading_post');
      expect((l.stock ?? []).length).toBeGreaterThan(0);
    }
  });

  it('total trail mileage is the canonical 2170 (#1040 historical pass)', () => {
    const totalMiles = LANDMARKS.reduce((sum, l) => sum + l.milesFromPrevious, 0);
    // #1040 re-anchored every milesFromPrevious to canonical Oregon
    // Trail figures (Franzwa/NPS/Haines/OCTA). Total is now 2170 mi,
    // the standard Independence→Oregon City figure.
    expect(totalMiles).toBe(2170);
  });
});

describe('isNativeCampHostile (#202)', () => {
  it('returns false for non-native posts', () => {
    expect(isNativeCampHostile(getLandmark('ft_laramie'), 0)).toBe(false);
  });

  it('returns false for native posts when tribe is wary+', () => {
    expect(isNativeCampHostile(getLandmark('cheyenne_camp'), 35)).toBe(false);
    expect(isNativeCampHostile(getLandmark('cheyenne_camp'), 21)).toBe(false);
  });

  it('returns true for native posts when tribe is hostile (<21)', () => {
    expect(isNativeCampHostile(getLandmark('cheyenne_camp'), 20)).toBe(true);
    expect(isNativeCampHostile(getLandmark('cheyenne_camp'), 0)).toBe(true);
  });
});

describe('native_hide_trade encounter (#203)', () => {
  const event = ENCOUNTER_EVENTS.find((e) => e.id === 'encounter_native_hide_trade')!;

  it('is registered in ENCOUNTER_EVENTS and EVENTS', () => {
    expect(event).toBeTruthy();
    expect(EVENTS.some((e) => e.id === 'encounter_native_hide_trade')).toBe(true);
  });

  it('gates off when party has no raw_hide', () => {
    const s = newGame({
      location: { ...newGame().location, milesTraveled: 500 }, // Sioux + Cheyenne territory
      inventory: {}
    });
    expect(event.gate!(s)).toBe(false);
  });

  it('gates off when no wary+ tribe is at hand', () => {
    const s = newGame({
      location: { ...newGame().location, milesTraveled: 500 },
      inventory: { raw_hide: 2 }
    });
    // Drop both Sioux + Cheyenne to hostile.
    let next = adjustTribeAttitude(s, 'sioux', -100);
    next = adjustTribeAttitude(next, 'cheyenne', -100);
    expect(event.gate!(next)).toBe(false);
  });

  it('gates ON when party has hide AND a wary+ tribe is at hand', () => {
    const s = newGame({
      location: { ...newGame().location, milesTraveled: 500 },
      inventory: { raw_hide: 2 }
    });
    expect(event.gate!(s)).toBe(true);
  });

  it('trade_robe consumes 2 hides and adds 1 buffalo_robe', () => {
    const s = newGame({
      location: { ...newGame().location, milesTraveled: 500 },
      inventory: { raw_hide: 3 }
    });
    const after = resolveEvent(s, event, 'trade_robe', makeRng('robe'));
    expect(after.inventory.raw_hide).toBe(1);
    expect(after.inventory.buffalo_robe).toBe(1);
  });

  it('trade_robe with only 1 hide is a no-op (defensive)', () => {
    const s = newGame({
      location: { ...newGame().location, milesTraveled: 500 },
      inventory: { raw_hide: 1 }
    });
    const after = resolveEvent(s, event, 'trade_robe', makeRng('def'));
    expect(after.inventory.raw_hide).toBe(1);
    expect(after.inventory.buffalo_robe ?? 0).toBe(0);
  });

  it('trade_pemmican consumes 1 hide, adds 5 lb pemmican, +1 attitude', () => {
    const s = newGame({
      location: { ...newGame().location, milesTraveled: 500 },
      inventory: { raw_hide: 2 }
    });
    const before = getTribeAttitude(s, 'sioux');
    const after = resolveEvent(s, event, 'trade_pemmican', makeRng('pem'));
    expect(after.inventory.raw_hide).toBe(1);
    expect(after.inventory.pemmican).toBe(5);
    // Attitude shifted +1 on whichever tribe was picked.
    const tribes = ['sioux', 'cheyenne'] as const;
    const lifted = tribes.some((t) => getTribeAttitude(after, t) > before);
    expect(lifted).toBe(true);
  });

  it('trade_moccasins consumes 1 hide, adds 2 moccasins', () => {
    const s = newGame({
      location: { ...newGame().location, milesTraveled: 500 },
      inventory: { raw_hide: 2 }
    });
    const after = resolveEvent(s, event, 'trade_moccasins', makeRng('moc'));
    expect(after.inventory.raw_hide).toBe(1);
    expect(after.inventory.moccasins).toBe(2);
  });

  it('pass drops attitude -1 on whichever tribe was picked', () => {
    const s = newGame({
      location: { ...newGame().location, milesTraveled: 500 },
      inventory: { raw_hide: 2 }
    });
    const before = {
      sioux: getTribeAttitude(s, 'sioux'),
      cheyenne: getTribeAttitude(s, 'cheyenne')
    };
    const after = resolveEvent(s, event, 'pass', makeRng('pass'));
    const dropped = (['sioux', 'cheyenne'] as const).some(
      (t) => getTribeAttitude(after, t) < before[t]
    );
    expect(dropped).toBe(true);
  });
});
