import { describe, it, expect } from 'vitest';
import type { Ox } from '../src/lib/game/types';
import {
  oxHydration,
  drainPerDayFor,
  OX_DRAIN_PER_DAY,
  MULE_DRAIN_PER_DAY
} from '../src/lib/game/systems/ox-hydration';

const ox = (over: Partial<Ox> = {}): Ox => ({
  id: 'o1', health: 100, fatigue: 0, shod: true, ...over
});

describe('oxHydration reader', () => {
  it('defaults to 100 when the field is absent (no save migration)', () => {
    expect(oxHydration(ox())).toBe(100);
  });
  it('returns the stored value when present', () => {
    expect(oxHydration(ox({ hydration: 42 }))).toBe(42);
  });
});

describe('drainPerDayFor', () => {
  it('oxen drain faster than mules in the desert', () => {
    expect(drainPerDayFor(ox({ kind: 'ox' }))).toBe(OX_DRAIN_PER_DAY);
    expect(drainPerDayFor(ox({ kind: 'mule' }))).toBe(MULE_DRAIN_PER_DAY);
    expect(MULE_DRAIN_PER_DAY).toBeLessThan(OX_DRAIN_PER_DAY);
  });
  it('treats an undefined kind as an ox', () => {
    expect(drainPerDayFor(ox())).toBe(OX_DRAIN_PER_DAY);
  });
});

import {
  applyOxHydration,
  isWateredDay,
  hydrationPaceMult,
  HYDRATION_AMBER,
  HYDRATION_RED,
  RED_HP_DRAIN_AT_ZERO
} from '../src/lib/game/systems/ox-hydration';
import type { GameState } from '../src/lib/game/types';

function baseState(over: Partial<GameState> = {}): GameState {
  return {
    oxen: [],
    location: { terrain: 'desert', atLandmarkId: null } as GameState['location'],
    eventLog: [],
    ...over
  } as unknown as GameState;
}

describe('isWateredDay', () => {
  it('false on a dry desert leg', () => {
    expect(isWateredDay(baseState({ location: { terrain: 'desert', atLandmarkId: null } as GameState['location'] }))).toBe(false);
  });
  it('true on non-desert terrain (streams at the halts)', () => {
    expect(isWateredDay(baseState({ location: { terrain: 'prairie', atLandmarkId: null } as GameState['location'] }))).toBe(true);
  });
  it('true at a desert landmark that is a waterSource (Salmon Falls = Snake River)', () => {
    expect(isWateredDay(baseState({ location: { terrain: 'desert', atLandmarkId: 'salmon_falls' } as GameState['location'] }))).toBe(true);
  });
  it('true at a river-kind landmark even when terrain is tagged desert (kind branch)', () => {
    // terrain:'desert' so we get past the terrain guard and actually exercise
    // the `lm.kind === 'river'` branch. green_river is kind:'river' in the catalog.
    expect(isWateredDay(baseState({ location: { terrain: 'desert', atLandmarkId: 'green_river' } as GameState['location'] }))).toBe(true);
  });
});

describe('applyOxHydration drain/refill', () => {
  it('drains by the per-kind rate on a dry desert day', () => {
    const s = baseState({
      oxen: [
        { id: 'o', health: 100, fatigue: 0, shod: true, kind: 'ox', hydration: 100 },
        { id: 'm', health: 100, fatigue: 0, shod: true, kind: 'mule', hydration: 100 }
      ]
    });
    const out = applyOxHydration(s);
    expect(out.oxen[0].hydration).toBe(100 - OX_DRAIN_PER_DAY);
    expect(out.oxen[1].hydration).toBe(100 - MULE_DRAIN_PER_DAY);
  });
  it('refills every animal to 100 on a watered day', () => {
    const s = baseState({
      location: { terrain: 'prairie', atLandmarkId: null } as GameState['location'],
      oxen: [{ id: 'o', health: 100, fatigue: 0, shod: true, kind: 'ox', hydration: 30 }]
    });
    expect(applyOxHydration(s).oxen[0].hydration).toBe(100);
  });
  it('floors at 0, never negative', () => {
    const s = baseState({
      oxen: [{ id: 'o', health: 100, fatigue: 0, shod: true, kind: 'ox', hydration: 1 }]
    });
    expect(applyOxHydration(s).oxen[0].hydration).toBe(0);
  });
  it('defaults a missing hydration to 100 before draining', () => {
    const s = baseState({
      oxen: [{ id: 'o', health: 100, fatigue: 0, shod: true, kind: 'ox' }]
    });
    expect(applyOxHydration(s).oxen[0].hydration).toBe(100 - OX_DRAIN_PER_DAY);
  });
  it('dead animal (health 0) is not drained or refilled', () => {
    const dead = { id: 'd', health: 0, fatigue: 0, shod: true, kind: 'ox' as const, hydration: 50 };
    const s1 = baseState({ oxen: [dead] });
    expect(applyOxHydration(s1).oxen[0].hydration).toBe(50);
    const s2 = baseState({ location: { terrain: 'prairie', atLandmarkId: null } as GameState['location'], oxen: [dead] });
    expect(applyOxHydration(s2).oxen[0].hydration).toBe(50);
  });
  it('does not mutate the input state', () => {
    const s = baseState({
      oxen: [{ id: 'o', health: 100, fatigue: 0, shod: true, kind: 'ox', hydration: 100 }]
    });
    applyOxHydration(s);
    expect(s.oxen[0].hydration).toBe(100);
  });
});

describe('lethal-tail health drain (< HYDRATION_RED)', () => {
  it('no health drain when next hydration is at or above HYDRATION_RED', () => {
    // start so nextHyd === HYDRATION_RED (exactly) → not < RED → no drain.
    const s = baseState({
      oxen: [{ id: 'o', health: 100, fatigue: 0, shod: true, kind: 'ox', hydration: HYDRATION_RED + OX_DRAIN_PER_DAY }]
    });
    expect(applyOxHydration(s).oxen[0].health).toBe(100);
  });
  it('drains the full RED_HP_DRAIN_AT_ZERO when hydration hits 0', () => {
    // start hydration === OX_DRAIN_PER_DAY → nextHyd 0 → steepest drain.
    const s = baseState({
      oxen: [{ id: 'o', health: 100, fatigue: 0, shod: true, kind: 'ox', hydration: OX_DRAIN_PER_DAY }]
    });
    const out = applyOxHydration(s);
    expect(out.oxen[0].hydration).toBe(0);
    expect(out.oxen[0].health).toBe(100 - RED_HP_DRAIN_AT_ZERO);
  });
  it('a parched team sustained at 0 eventually dies (health floors at 0)', () => {
    // health === RED_HP_DRAIN_AT_ZERO → one tick at hydration 0 kills it.
    let s = baseState({
      oxen: [{ id: 'o', health: RED_HP_DRAIN_AT_ZERO, fatigue: 0, shod: true, kind: 'ox', hydration: 0 }]
    });
    s = applyOxHydration(s);
    expect(s.oxen[0].health).toBe(0);
  });
  it('emits an amber log on first crossing into the dragging zone', () => {
    // nextHyd lands at HYDRATION_AMBER-1 (just into amber) from above.
    const s = baseState({
      oxen: [{ id: 'o', health: 100, fatigue: 0, shod: true, kind: 'ox', hydration: HYDRATION_AMBER - 1 + OX_DRAIN_PER_DAY }]
    });
    const out = applyOxHydration(s);
    expect(out.eventLog.some((e) => /want of water|flagging/i.test(e.text))).toBe(true);
  });
  it('emits a red log on first crossing into the failing zone', () => {
    // nextHyd lands at HYDRATION_RED-1 (just into red); beforeMin < AMBER so only red fires.
    const s = baseState({
      oxen: [{ id: 'o', health: 100, fatigue: 0, shod: true, kind: 'ox', hydration: HYDRATION_RED - 1 + OX_DRAIN_PER_DAY }]
    });
    const out = applyOxHydration(s);
    expect(out.eventLog.some((e) => /failing|find water/i.test(e.text))).toBe(true);
  });
  it('does not re-emit the amber log on a subsequent dry day (already crossed)', () => {
    let s = baseState({
      oxen: [{ id: 'o', health: 100, fatigue: 0, shod: true, kind: 'ox', hydration: HYDRATION_AMBER - 1 + OX_DRAIN_PER_DAY }]
    });
    s = applyOxHydration(s); // amber log fires
    const after = applyOxHydration({ ...s, eventLog: [] }); // beforeMin already < AMBER
    expect(after.eventLog.some((e) => /want of water|flagging/i.test(e.text))).toBe(false);
  });
  it('re-emits the amber log after the team recovers at water and re-dries', () => {
    const desert = { terrain: 'desert', atLandmarkId: null } as GameState['location'];
    let s = baseState({
      oxen: [{ id: 'o', health: 100, fatigue: 0, shod: true, kind: 'ox', hydration: HYDRATION_AMBER - 1 + OX_DRAIN_PER_DAY }]
    });
    s = applyOxHydration(s); // amber log
    // watered day refills to 100
    s = applyOxHydration({ ...s, eventLog: [], location: { terrain: 'prairie', atLandmarkId: null } as GameState['location'] });
    expect(s.oxen[0].hydration).toBe(100);
    // re-dry: drain day by day (fresh log each day) until it crosses amber again.
    let last = s;
    let fired = false;
    for (let i = 0; i < 40 && !fired; i++) {
      last = applyOxHydration({ ...last, eventLog: [], location: desert });
      fired = last.eventLog.some((e) => /want of water|flagging/i.test(e.text));
    }
    expect(fired).toBe(true);
  });
});

describe('hydrationPaceMult', () => {
  it('1.0 when the team is green (>=50)', () => {
    expect(hydrationPaceMult([{ id: 'o', health: 100, fatigue: 0, shod: true, hydration: 80 }])).toBe(1);
  });
  it('0.7 floor at hydration 20', () => {
    expect(hydrationPaceMult([{ id: 'o', health: 100, fatigue: 0, shod: true, hydration: 20 }])).toBeCloseTo(0.7, 5);
  });
  it('lerps between (1.0 @50) and (0.7 @20)', () => {
    expect(hydrationPaceMult([{ id: 'o', health: 100, fatigue: 0, shod: true, hydration: 35 }])).toBeCloseTo(0.85, 5);
  });
  it('ignores dead animals when averaging', () => {
    const team = [
      { id: 'a', health: 0, fatigue: 0, shod: true, hydration: 0 },
      { id: 'b', health: 100, fatigue: 0, shod: true, hydration: 80 }
    ];
    expect(hydrationPaceMult(team)).toBe(1);
  });
});
