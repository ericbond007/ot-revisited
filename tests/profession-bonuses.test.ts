// Numeric-bonus verification for the phase-1 balance pass.
// Trade stacking and Farmer food reduction are covered in their own files;
// this file covers Teamster, Preacher, Whore, and Carpenter bonuses.

import { describe, it, expect } from 'vitest';
import type { GameState, PartyMember, ProfessionId } from '../src/lib/game/types';
import { tickOxen } from '../src/lib/game/systems/oxen';
import { adjustMorale } from '../src/lib/game/systems/morale';
import { rest } from '../src/lib/game/actions/rest';
import {
  consumeWagonPart,
  deathMoralePenalty,
  applyWhoreTradingPostEarnings
} from '../src/lib/game/professions/bonuses';
import { makeRng } from '../src/lib/game/rng';
import { milesPerDay } from '../src/lib/game/systems/travel';
import { progressConditions } from '../src/lib/game/systems/conditions';

function mkMember(id: string, profession: ProfessionId, name = id): PartyMember {
  // Default to male adults; tests that care about sex override inline.
  return {
    id, name, profession, sex: 'male', kind: 'adult', isLeader: false, age: 30, health: 100, conditions: [], dead: false
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
    wagon: { model: 'prairie_schooner', condition: 100, carryCapacity: 2500 },
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

  it('contributes no passive rest morale — replaced by share_the_whore camp action', () => {
    // Previously: passive +1/male/night. Now: zero passive contribution
    // — the player picks share_the_whore explicitly during camp.
    const plain = baseState(['carpenter', 'doctor']);
    const withWhore = baseState(['whore', 'doctor']);
    const w = withWhore.party.find((m) => m.profession === 'whore');
    if (w) w.sex = 'female';

    const plainAfter = rest(plain, 1);
    const whoreAfter = rest(withWhore, 1);

    // Both rest the same — no passive morale tilt.
    expect(whoreAfter.morale).toBe(plainAfter.morale);
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

describe('Whore trading-post earnings', () => {
  it('adds $5-15 to cash and logs "the hard way"', () => {
    const s = baseState(['whore', 'doctor'], { cash: 100 });
    const after = applyWhoreTradingPostEarnings(s, makeRng('ft:1'), 'Fort Laramie');
    expect(after.cash).toBeGreaterThan(100);
    expect(after.cash - 100).toBeGreaterThanOrEqual(5);
    expect(after.cash - 100).toBeLessThanOrEqual(15);
    const last = after.eventLog[after.eventLog.length - 1];
    expect(last.text).toMatch(/earned \$\d+ at Fort Laramie the hard way/);
  });

  it('does nothing when no Whore is alive', () => {
    const s = baseState(['carpenter', 'doctor'], { cash: 100 });
    const after = applyWhoreTradingPostEarnings(s, makeRng('ft:1'), 'Fort Laramie');
    expect(after.cash).toBe(100);
    expect(after.eventLog.length).toBe(0);
  });

  it('uses the first alive whore by name', () => {
    const s = baseState(['whore', 'whore'], { cash: 0 });
    s.party[0].name = 'Jenny';
    s.party[1].name = 'Mae';
    const after = applyWhoreTradingPostEarnings(s, makeRng('ft:1'), 'Fort Kearny');
    expect(after.eventLog[0].text).toContain('Jenny');
  });
});

describe('Doctor (#154)', () => {
  it('reduces daily condition health damage by ~30%', () => {
    const noDoc = baseState(['carpenter']);
    noDoc.party[0].conditions = [{ id: 'cholera', daysSinceOnset: 0 }];
    const after1 = progressConditions(noDoc, makeRng('d:1'));
    expect(after1.party[0].health).toBe(90); // 100 - 10

    const doc = baseState(['doctor']);
    doc.party[0].conditions = [{ id: 'cholera', daysSinceOnset: 0 }];
    const after2 = progressConditions(doc, makeRng('d:2'));
    expect(after2.party[0].health).toBe(93); // 100 - round(10 * 0.7) = 93
  });
});

describe('Blacksmith (#154)', () => {
  it('rolls a 40% iron-scrap salvage when a metal part is consumed', () => {
    const s = baseState(['blacksmith'], { inventory: { flour: 0, bacon: 0, wheel: 1 } });
    let salvages = 0;
    for (let i = 0; i < 50; i++) {
      const r = consumeWagonPart({ ...s, inventory: { ...s.inventory, wheel: 1 } }, makeRng(`b-${i}`), 'wheel');
      if (r.salvaged) salvages++;
    }
    // ~40% expected — over 50 rolls we should see well above 0 and well below 50.
    expect(salvages).toBeGreaterThan(5);
    expect(salvages).toBeLessThan(45);
  });

  it('never salvages when no Blacksmith is in the party', () => {
    const s = baseState(['carpenter'], { inventory: { flour: 0, bacon: 0, wheel: 1 } });
    for (let i = 0; i < 10; i++) {
      const r = consumeWagonPart({ ...s, inventory: { ...s.inventory, wheel: 1 } }, makeRng(`b-${i}`), 'wheel');
      expect(r.salvaged).toBe(false);
    }
  });

  it('skips salvage on non-metal parts (canvas, plank)', () => {
    const s = baseState(['blacksmith'], { inventory: { flour: 0, bacon: 0, canvas: 1 } });
    for (let i = 0; i < 10; i++) {
      const r = consumeWagonPart({ ...s, inventory: { ...s.inventory, canvas: 1 } }, makeRng(`b-${i}`), 'canvas');
      expect(r.salvaged).toBe(false);
    }
  });
});

describe('Scout (#154)', () => {
  it('grants +8% travel speed', () => {
    const noScout = baseState(['carpenter']);
    const withScout = baseState(['scout']);
    expect(milesPerDay(withScout)).toBeGreaterThan(milesPerDay(noScout));
  });
});

describe('Farmer (#154)', () => {
  it('forages 4 lb berries per rest day in season (Apr-Sep)', () => {
    const s = baseState(['farmer'], {
      date: { year: 1848, month: 6, day: 1 },
      inventory: { flour: 200, bacon: 100, berries: 0 }
    });
    const after = rest(s, 1);
    expect(after.inventory.berries).toBe(4);
  });

  it('does not forage off-season (Oct-Mar)', () => {
    const s = baseState(['farmer'], {
      date: { year: 1848, month: 1, day: 1 },
      inventory: { flour: 200, bacon: 100, berries: 0 }
    });
    const after = rest(s, 1);
    expect(after.inventory.berries ?? 0).toBe(0);
  });

  it('reduces food consumption by 10% when alive', () => {
    // Farmer eats less — visible in foodConsumedToday output.
    // (Direct calc tested in consumption.test.ts; this is a sanity stack.)
    const s = baseState(['farmer'], { inventory: { flour: 200, bacon: 100 } });
    const after = rest(s, 1);
    const foodEaten = (200 + 100) - ((after.inventory.flour ?? 0) + (after.inventory.bacon ?? 0));
    // 1 adult * 2 lb/day * 0.9 = 1.8, floored to 1 lb.
    expect(foodEaten).toBeLessThan(2);
  });
});
