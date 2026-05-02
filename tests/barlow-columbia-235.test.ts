import { describe, it, expect } from 'vitest';
import {
  LANDMARK_APPROACH_EVENTS,
  pickApproachEvent
} from '../src/lib/game/content/landmark-approach-events';
import { milesToLandmark, applyTravel, runningMilesTo } from '../src/lib/game/systems/travel';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState } from '../src/lib/game/types';

function newGame(over: Partial<GameState> = {}): GameState {
  const s = createInitialState({
    seed: 'barlow-235',
    leader: { name: 'Ezra', profession: 'banker' },
    companions: [{ name: 'Mary', profession: 'farmer' }],
    startDate: { year: 1848, month: 7, day: 1 }
  });
  return { ...s, ...over };
}

const event = LANDMARK_APPROACH_EVENTS.find((e) => e.landmarkId === 'barlow_road')!;

function rollUntil(target: number, label: string): GameState | null {
  // Find a seed whose first rng roll lands in the target band, so we can
  // deterministically exercise each raft outcome bucket.
  for (let i = 0; i < 5000; i++) {
    const rng = makeRng(`${label}-${i}`);
    const r = rng.next();
    if (r < target) {
      const fresh = makeRng(`${label}-${i}`);
      const choice = event.event.choices.find((c) => c.id === 'raft')!;
      return choice.apply(newGame(), fresh);
    }
  }
  return null;
}

describe('#235 Barlow / Columbia approach event — registry', () => {
  it('is registered at 5 mi out', () => {
    expect(event).toBeDefined();
    expect(event.milesAway).toBe(5);
    expect(event.event.id).toBe('approach_barlow_or_columbia');
  });

  it('has both choices', () => {
    const ids = event.event.choices.map((c) => c.id);
    expect(ids).toEqual(['barlow', 'raft']);
  });

  it('barlow choice is the default', () => {
    const barlow = event.event.choices.find((c) => c.id === 'barlow')!;
    expect(barlow.isDefault).toBe(true);
  });
});

describe('#235 1846 gate', () => {
  const barlow = event.event.choices.find((c) => c.id === 'barlow')!;

  it('barlow is hidden in 1845', () => {
    const s: GameState = { ...newGame(), date: { year: 1845, month: 9, day: 1 } };
    expect(barlow.hidden!(s)).toBe(true);
  });

  it('barlow is visible in 1846', () => {
    const s: GameState = { ...newGame(), date: { year: 1846, month: 9, day: 1 } };
    expect(barlow.hidden!(s)).toBe(false);
  });

  it('barlow is visible in 1849+', () => {
    const s: GameState = { ...newGame(), date: { year: 1849, month: 9, day: 1 } };
    expect(barlow.hidden!(s)).toBe(false);
  });
});

describe('#235 barlow toll math', () => {
  const barlow = event.event.choices.find((c) => c.id === 'barlow')!;

  it('charges $5/wagon + $0.10/head for a 2-adult party', () => {
    const before: GameState = { ...newGame(), cash: 100 };
    const after = barlow.apply(before, makeRng('toll'));
    // 2 adults: $5 + 2 × $0.10 = $5.20.
    expect(before.cash - after.cash).toBeCloseTo(5.2, 2);
  });

  it('skips dead members in the headcount', () => {
    const base = newGame();
    const before: GameState = {
      ...base,
      cash: 100,
      party: [base.party[0], { ...base.party[1], dead: true }]
    };
    const after = barlow.apply(before, makeRng('toll-dead'));
    // 1 living head: $5 + $0.10 = $5.10.
    expect(before.cash - after.cash).toBeCloseTo(5.1, 2);
  });

  it('clamps cash at 0 when broke', () => {
    const before: GameState = { ...newGame(), cash: 1 };
    const after = barlow.apply(before, makeRng('broke'));
    expect(after.cash).toBe(0);
  });

  it('does not set the columbia raft flag', () => {
    const before: GameState = { ...newGame(), cash: 50 };
    const after = barlow.apply(before, makeRng('toll'));
    expect(after.flags._columbiaRaft).toBeFalsy();
  });

  it('does not advance milesTraveled', () => {
    const before: GameState = { ...newGame(), cash: 50, location: { ...newGame().location, milesTraveled: 100 } };
    const after = barlow.apply(before, makeRng('toll'));
    expect(after.location.milesTraveled).toBe(100);
  });
});

describe('#235 columbia raft outcomes', () => {
  it('always sets the raft flag', () => {
    const raft = event.event.choices.find((c) => c.id === 'raft')!;
    const after = raft.apply(newGame(), makeRng('any'));
    expect(after.flags._columbiaRaft).toBe(true);
  });

  it('always re-anchors miles to one shy of Oregon City', () => {
    const raft = event.event.choices.find((c) => c.id === 'raft')!;
    const after = raft.apply(newGame(), makeRng('any-2'));
    const orMiles = runningMilesTo('oregon_city');
    expect(after.location.milesTraveled).toBe(orMiles - 1);
    expect(after.location.nextLandmarkId).toBe('oregon_city');
    expect(after.location.previousLandmarkId).toBe('the_dalles');
  });

  it('smooth float gives morale +3 with no inventory loss', () => {
    const result = rollUntil(0.30, 'smooth');
    expect(result).not.toBeNull();
    const before = newGame();
    expect(result!.morale).toBe(before.morale + 3);
    // Inventory untouched on smooth float.
    expect(result!.inventory.flour).toBe(before.inventory.flour);
  });

  it('rough water drops morale -4 and trims inventory ~25%', () => {
    // Roll lands in [0.30, 0.85) → rough.
    let outcome: GameState | null = null;
    for (let i = 0; i < 5000 && !outcome; i++) {
      const rng = makeRng(`rough-${i}`);
      const r = rng.next();
      if (r >= 0.30 && r < 0.85) {
        const fresh = makeRng(`rough-${i}`);
        outcome = event.event.choices.find((c) => c.id === 'raft')!.apply(newGame(), fresh);
      }
    }
    expect(outcome).not.toBeNull();
    const before = newGame();
    expect(outcome!.morale).toBe(before.morale - 4);
    expect(outcome!.inventory.flour).toBeLessThan(before.inventory.flour);
    expect(outcome!.inventory.flour).toBeCloseTo(Math.floor(before.inventory.flour * 0.75), 0);
  });

  it('disaster halves inventory and bruises an adult', () => {
    let outcome: GameState | null = null;
    for (let i = 0; i < 5000 && !outcome; i++) {
      const rng = makeRng(`bust-${i}`);
      const r = rng.next();
      if (r >= 0.85) {
        const fresh = makeRng(`bust-${i}`);
        outcome = event.event.choices.find((c) => c.id === 'raft')!.apply(newGame(), fresh);
      }
    }
    expect(outcome).not.toBeNull();
    const before = newGame();
    expect(outcome!.morale).toBe(Math.max(0, before.morale - 10));
    expect(outcome!.inventory.flour).toBeCloseTo(Math.floor(before.inventory.flour * 0.5), 0);
    const hurt = outcome!.party.find((m) => m.health < 100);
    expect(hurt).toBeDefined();
  });
});

describe('#235 engine bypasses barlow + laurel after raft', () => {
  it('miles within barlow_road do not park when raft flag set', () => {
    // Park the player at one mile before barlow_road with the raft flag.
    const barlowMiles = runningMilesTo('barlow_road');
    const s: GameState = {
      ...newGame(),
      location: {
        ...newGame().location,
        milesTraveled: barlowMiles - 5,
        nextLandmarkId: 'barlow_road',
        previousLandmarkId: 'the_dalles',
        terrain: 'forest'
      },
      flags: { ...newGame().flags, _columbiaRaft: true }
    };
    const after = applyTravel(s, makeRng('post-raft'));
    expect(after.location.atLandmarkId).toBeNull();
  });

  it('without raft flag, barlow_road does not park (it is a non-stop landmark)', () => {
    // Sanity baseline — the engine doesn't park at scenic landmarks even without bypass.
    const barlowMiles = runningMilesTo('barlow_road');
    const s: GameState = {
      ...newGame(),
      location: {
        ...newGame().location,
        milesTraveled: barlowMiles - 5,
        nextLandmarkId: 'barlow_road',
        previousLandmarkId: 'the_dalles',
        terrain: 'forest'
      }
    };
    const after = applyTravel(s, makeRng('plain'));
    // barlow_road is a 'landmark' kind — never parks regardless. This test
    // documents the baseline so the bypass test above isn't accidentally
    // confirming the wrong invariant.
    expect(after.location.atLandmarkId).toBeNull();
  });
});

describe('#235 picks event near barlow_road', () => {
  it('fires when within 5 mi', () => {
    const barlowMiles = runningMilesTo('barlow_road');
    const s: GameState = {
      ...newGame(),
      location: {
        ...newGame().location,
        milesTraveled: barlowMiles - 4,
        nextLandmarkId: 'barlow_road'
      }
    };
    const picked = pickApproachEvent(s, (id) => milesToLandmark(s, id));
    expect(picked?.landmarkId).toBe('barlow_road');
  });

  it('does not fire 20 mi out', () => {
    const barlowMiles = runningMilesTo('barlow_road');
    const s: GameState = {
      ...newGame(),
      location: {
        ...newGame().location,
        milesTraveled: barlowMiles - 20,
        nextLandmarkId: 'barlow_road'
      }
    };
    const picked = pickApproachEvent(s, (id) => milesToLandmark(s, id));
    expect(picked).toBeUndefined();
  });
});
