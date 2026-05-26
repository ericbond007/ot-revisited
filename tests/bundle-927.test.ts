import { describe, it, expect } from 'vitest';
import { urgency } from '../src/lib/game/ai/bundle';
import { createInitialState } from '../src/lib/game/engine';
import type { GameState } from '../src/lib/game/types';

function baseState(over: Partial<GameState> = {}): GameState {
  const s = createInitialState({
    seed: 'b927',
    leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'doctor' }],
    startDate: { year: 1849, month: 6, day: 15 }
  });
  return { ...s, ...over };
}

describe('#927 urgency — water', () => {
  it('find_water: <5gal → 10', () => {
    const s = baseState({ resources: { water: 4, waterCap: 20 } });
    expect(urgency(s, 'find_water')).toBe(10);
  });
  it('find_water: 5-9gal → 5', () => {
    const s = baseState({ resources: { water: 7, waterCap: 20 } });
    expect(urgency(s, 'find_water')).toBe(5);
  });
  it('find_water: ≥10gal → 0', () => {
    const s = baseState({ resources: { water: 18, waterCap: 20 } });
    expect(urgency(s, 'find_water')).toBe(0);
  });
});

describe('#927 urgency — firewood', () => {
  it('gather_firewood: <5lb → 10', () => {
    const s = baseState({ resources: { water: 10, waterCap: 20, firewood: 3 } });
    expect(urgency(s, 'gather_firewood')).toBe(10);
  });
  it('gather_firewood: ≥5lb → 0', () => {
    const s = baseState({ resources: { water: 10, waterCap: 20, firewood: 10 } });
    expect(urgency(s, 'gather_firewood')).toBe(0);
  });
});

describe('#927 urgency — cure_meat', () => {
  it('≥20lb game_meat → 10 (spoilage urgency)', () => {
    const s = baseState({ inventory: { game_meat: 25 } });
    expect(urgency(s, 'cure_meat')).toBe(10);
  });
  it('any game_meat → 5', () => {
    const s = baseState({ inventory: { game_meat: 5 } });
    expect(urgency(s, 'cure_meat')).toBe(5);
  });
  it('no game_meat → 0', () => {
    const s = baseState({ inventory: {} });
    expect(urgency(s, 'cure_meat')).toBe(0);
  });
});

describe('#927 urgency — patch_wagon', () => {
  it('condition<60 → 10', () => {
    const s = baseState();
    s.wagon = { ...s.wagon, condition: 50 };
    expect(urgency(s, 'patch_wagon')).toBe(10);
  });
  it('60≤condition<80 → 6', () => {
    const s = baseState();
    s.wagon = { ...s.wagon, condition: 70 };
    expect(urgency(s, 'patch_wagon')).toBe(6);
  });
  it('condition≥80 → 2', () => {
    const s = baseState();
    s.wagon = { ...s.wagon, condition: 95 };
    expect(urgency(s, 'patch_wagon')).toBe(2);
  });
});

describe('#927 urgency — terrain-gated', () => {
  it('dig_well: only when desert + shovel + water<5', () => {
    const s = baseState({
      resources: { water: 4, waterCap: 20 },
      inventory: { shovel: 1 },
      location: { ...baseState().location, terrain: 'desert' }
    });
    expect(urgency(s, 'dig_well')).toBe(10);
  });
  it('dig_well: 0 elsewhere', () => {
    const s = baseState({
      resources: { water: 4, waterCap: 20 },
      inventory: { shovel: 1 },
      location: { ...baseState().location, terrain: 'prairie' }
    });
    expect(urgency(s, 'dig_well')).toBe(0);
  });
  it('wash_clothes: only on river terrain', () => {
    const sRiver = baseState();
    sRiver.location = { ...sRiver.location, terrain: 'river' };
    expect(urgency(sRiver, 'wash_clothes')).toBe(6);
    const sPrairie = baseState();
    expect(urgency(sPrairie, 'wash_clothes')).toBe(0);
  });
});

describe('#927 urgency — morale-gated', () => {
  it('big_meal: morale<50 → 6, else 3', () => {
    expect(urgency(baseState({ morale: 40 }), 'big_meal')).toBe(6);
    expect(urgency(baseState({ morale: 70 }), 'big_meal')).toBe(3);
  });
  it('teach_kids: only when children present', () => {
    const sNoKids = baseState();
    expect(urgency(sNoKids, 'teach_kids')).toBe(0);
    const sWithKids = baseState();
    sWithKids.party = [...sWithKids.party, {
      id: 'k', name: 'A', sex: 'male', kind: 'child', isLeader: false,
      age: 8, health: 100, conditions: [], dead: false
    }];
    expect(urgency(sWithKids, 'teach_kids')).toBe(5);
  });
});

import {
  defaultBundleCampActions,
  bundleCampActions,
  chaosBundle,
  TIME_BUDGET_HOURS,
  HUNT_HOURS,
} from '../src/lib/game/ai/bundle';
import { makeRng } from '../src/lib/game/rng';
import { hourCostFor, CAMP_ACTIONS_BY_ID } from '../src/lib/game/actions/camp-actions';
import {
  cautiousPersona,
  aggressivePersona,
  drinkerPersona,
  faithfulPersona,
} from '../src/lib/game/ai/personas';

function totalCampHours(state: GameState, campActions: string[]): number {
  return campActions.reduce(
    (sum, id) =>
      sum + hourCostFor(CAMP_ACTIONS_BY_ID[id as keyof typeof CAMP_ACTIONS_BY_ID], state),
    0,
  );
}

// Explicit non-zero weights for algorithm tests. Default personas are
// zero-weighted post-#927 tuning (opt-in bundling); these tests pin the
// algorithm contract independent of any persona's tuning.
const algoWeights = { survival: 2, food: 2, maintenance: 2, hygiene: 1, morale: 1 };
const cautiousFns = {
  weights: algoWeights,
  shouldHunt: cautiousPersona.shouldHunt.bind(cautiousPersona),
};

describe('#927 defaultBundleCampActions — algorithm shape', () => {
  it('primary is always first when provided', () => {
    const s = baseState({ resources: { water: 4, waterCap: 20, firewood: 3 } });
    const out = defaultBundleCampActions(s, 'find_water', cautiousFns.weights, cautiousFns.shouldHunt, makeRng('p'));
    expect(out.campActions[0]).toBe('find_water');
  });

  it('primary auto-promoted to highest-urgency when null', () => {
    // Water-critical state → find_water should rise to score 10×weight.
    const s = baseState({ resources: { water: 3, waterCap: 20, firewood: 20 } });
    const out = defaultBundleCampActions(s, null, cautiousFns.weights, cautiousFns.shouldHunt, makeRng('p'));
    expect(out.campActions[0]).toBe('find_water');
  });

  it('bundle total camp hours ≤ TIME_BUDGET_HOURS (invariant)', () => {
    for (let i = 0; i < 20; i++) {
      const s = baseState({ resources: { water: 4, waterCap: 20, firewood: 3 } });
      const out = defaultBundleCampActions(s, 'find_water', cautiousFns.weights, cautiousFns.shouldHunt, makeRng(`seed-${i}`));
      const used = totalCampHours(s, out.campActions);
      const huntUsed = out.hunt ? HUNT_HOURS : 0;
      expect(used + huntUsed).toBeLessThanOrEqual(TIME_BUDGET_HOURS);
    }
  });

  it('hunt directive shape is valid when present', () => {
    const s = baseState({
      resources: { water: 4, waterCap: 20, firewood: 3 },
      inventory: { gunpowder: 50, lead_balls: 50, percussion_caps: 50 }
    });
    const out = defaultBundleCampActions(s, 'find_water', cautiousFns.weights, cautiousFns.shouldHunt, makeRng('h'));
    if (out.hunt) {
      expect(out.hunt.hunters).toBeGreaterThanOrEqual(1);
      expect(out.hunt.hunters).toBeLessThanOrEqual(2);
    }
  });

  it('determinism: same inputs yield identical bundle', () => {
    const s = baseState({ resources: { water: 4, waterCap: 20, firewood: 3 } });
    const a = defaultBundleCampActions(s, 'find_water', cautiousFns.weights, cautiousFns.shouldHunt, makeRng('det'));
    const b = defaultBundleCampActions(s, 'find_water', cautiousFns.weights, cautiousFns.shouldHunt, makeRng('det'));
    expect(a).toEqual(b);
  });
});

describe('#927 bundleCampActions dispatcher', () => {
  it('cautious routes through default (no override)', () => {
    const s = baseState({ resources: { water: 4, waterCap: 20, firewood: 3 } });
    const out = bundleCampActions(cautiousPersona, s, 'find_water', makeRng('c'));
    expect(out.campActions[0]).toBe('find_water');
  });

  it('drinker (1,0,0,0,1) never picks food/maintenance/hygiene actions', () => {
    const s = baseState({
      resources: { water: 4, waterCap: 20, firewood: 3 },
      inventory: { game_meat: 20, tallow: 5, hide: 1, gunpowder: 50, lead_balls: 50, percussion_caps: 50 }
    });
    s.wagon = { ...s.wagon, condition: 50 };
    const out = bundleCampActions(drinkerPersona, s, 'find_water', makeRng('d'));
    // food (cure_meat, fish, set_traps, big_meal, press_cheese) — none should appear
    for (const id of ['cure_meat', 'fish', 'set_traps', 'big_meal', 'press_cheese']) {
      expect(out.campActions).not.toContain(id);
    }
    // maintenance (patch_wagon etc.) — none
    for (const id of ['patch_wagon', 'cast_balls', 'replace_canvas', 'replace_planks', 'stitch_moccasins', 'service_train']) {
      expect(out.campActions).not.toContain(id);
    }
    // hygiene — none
    for (const id of ['wash_clothes', 'make_soap']) {
      expect(out.campActions).not.toContain(id);
    }
    // drinker.food === 0 → no hunt directive ever
    expect(out.hunt).toBeNull();
  });

  it('food category with non-zero weight picks cure_meat when meat available', () => {
    const s = baseState({
      resources: { water: 4, waterCap: 20, firewood: 3 },
      inventory: { game_meat: 25, salt: 5 }
    });
    s.wagon = { ...s.wagon, condition: 50 };
    const out = defaultBundleCampActions(
      s, null,
      { survival: 2, food: 1, maintenance: 0, hygiene: 0, morale: 0 },
      () => false,
      makeRng('a'),
    );
    expect(out.campActions).toContain('cure_meat');
  });
});

describe('#927 chaosBundle (exported, unwired after #1153)', () => {
  // Wiring removed in #1153 — chaosPersona opt-out of bundling after
  // 4/0 wipe rate hit 80%. The function stays exported for future
  // tuning/re-enable. Tests pin algorithm contract.

  it('produces variance across seeds', () => {
    const s = baseState({ resources: { water: 4, waterCap: 20, firewood: 3 } });
    const bundles = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const out = chaosBundle(s, null, makeRng(`c-${i}`));
      bundles.add(JSON.stringify(out.campActions));
    }
    expect(bundles.size).toBeGreaterThan(5);
  });

  it('caps at 2 actions per rest day (CHAOS_MAX_ACTIONS)', () => {
    for (let i = 0; i < 10; i++) {
      const s = baseState({ resources: { water: 4, waterCap: 20, firewood: 3 } });
      const out = chaosBundle(s, null, makeRng(`c-${i}`));
      expect(out.campActions.length).toBeLessThanOrEqual(2);
    }
  });

  it('respects 12h budget invariant', () => {
    for (let i = 0; i < 20; i++) {
      const s = baseState({ resources: { water: 4, waterCap: 20, firewood: 3 } });
      const out = chaosBundle(s, null, makeRng(`c-${i}`));
      const used = totalCampHours(s, out.campActions);
      const huntUsed = out.hunt ? HUNT_HOURS : 0;
      expect(used + huntUsed).toBeLessThanOrEqual(TIME_BUDGET_HOURS);
    }
  });

  it('determinism: same seed yields identical bundle', () => {
    const s = baseState({ resources: { water: 4, waterCap: 20, firewood: 3 } });
    const a = chaosBundle(s, null, makeRng('same'));
    const b = chaosBundle(s, null, makeRng('same'));
    expect(a).toEqual(b);
  });
});

describe('#927 faithful override — Sabbath-sequenced', () => {
  it('on Sunday: bundle skips maintenance category (weight=0)', () => {
    // 1849-04-15 is a Sunday (per the calendar utility).
    const s = baseState();
    s.date = { year: 1849, month: 4, day: 15 };
    s.wagon = { ...s.wagon, condition: 40 };
    const out = bundleCampActions(faithfulPersona, s, null, makeRng('sun'));
    expect(out.campActions).not.toContain('patch_wagon');
    expect(out.campActions).not.toContain('cast_balls');
  });

  it('on Monday: bundle includes maintenance (weight=2)', () => {
    const s = baseState({ inventory: { raw_hide: 2 } });
    s.date = { year: 1849, month: 4, day: 16 }; // Monday
    s.wagon = { ...s.wagon, condition: 40, canvas: 60 };
    const out = bundleCampActions(faithfulPersona, s, null, makeRng('mon'));
    expect(out.campActions).toContain('patch_wagon');
  });

  it('respects 12h budget invariant', () => {
    for (let i = 0; i < 10; i++) {
      const s = baseState({ resources: { water: 4, waterCap: 20, firewood: 3 } });
      const out = bundleCampActions(faithfulPersona, s, null, makeRng(`f-${i}`));
      const used = totalCampHours(s, out.campActions);
      const huntUsed = out.hunt ? HUNT_HOURS : 0;
      expect(used + huntUsed).toBeLessThanOrEqual(TIME_BUDGET_HOURS);
    }
  });
});
