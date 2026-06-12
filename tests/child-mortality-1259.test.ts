/**
 * #1259 child-mortality — §1 age-banded disease lethality + §4 ox-death flag riders.
 *
 * TDD: these tests are written first and must FAIL before the implementation
 * lands, then pass after.
 */
import { describe, it, expect } from 'vitest';
import { progressConditions, CHILD_DEHYDRATING_DISEASE_MULT, DEHYDRATING_CONDITIONS } from '../src/lib/game/systems/conditions';
import { rollStrayMorning } from '../src/lib/game/systems/strays';
import { ENCOUNTER_EVENTS } from '../src/lib/game/content/encounters';
import { resolveEvent } from '../src/lib/game/systems/events';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState, PartyMember } from '../src/lib/game/types';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

/** Minimal game state with no treatment items, no doctor — raw condition tick. */
function newGame(): GameState {
  const s = createInitialState({
    seed: 'cm1259',
    leader: { name: 'Ada', profession: 'farmer' },
    companions: [{ name: 'Bob', profession: 'carpenter' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
  // Strip ALL treatment items so we test raw damage, not treatment math.
  return {
    ...s,
    inventory: {
      ...s.inventory,
      quinine: 0,
      calomel: 0,
      laudanum: 0,
      paregoric: 0,
      dovers_powder: 0,
      bandages: 0,
      camphor: 0,
      epsom_salts: 0,
      castor_oil: 0,
      hartshorn: 0
    }
  };
}

/** Clone and set a party member's kind + health. */
function withMember(s: GameState, idx: number, patch: Partial<PartyMember>): GameState {
  const party = s.party.map((m, i) => (i === idx ? { ...m, ...patch } : m));
  return { ...s, party };
}

// ---------------------------------------------------------------------------
// §1 — age-banded disease lethality
// ---------------------------------------------------------------------------

describe('#1259 §1 — CHILD_DEHYDRATING_DISEASE_MULT export', () => {
  it('exports CHILD_DEHYDRATING_DISEASE_MULT = 1.75', () => {
    expect(CHILD_DEHYDRATING_DISEASE_MULT).toBe(1.75);
  });
});

describe('#1259 §1 — DEHYDRATING_CONDITIONS set', () => {
  it('contains cholera', () => {
    expect(DEHYDRATING_CONDITIONS.has('cholera')).toBe(true);
  });

  it('contains dysentery', () => {
    expect(DEHYDRATING_CONDITIONS.has('dysentery')).toBe(true);
  });

  it('does NOT contain measles (flat per Bashore/BYU data)', () => {
    expect(DEHYDRATING_CONDITIONS.has('measles')).toBe(false);
  });

  it('does NOT contain typhoid (flat per Bashore/BYU data)', () => {
    expect(DEHYDRATING_CONDITIONS.has('typhoid')).toBe(false);
  });
});

describe('#1259 §1 — cholera: child takes ~1.75× adult damage per tick', () => {
  it('child with cholera loses more HP than identically-afflicted adult', () => {
    // Use a deterministic seed where natural-course resolve doesn't fire.
    // Both members start at HP=100, have cholera(daysSinceOnset=0).
    // No treatment items (stripped above). No doctor.
    // Expected: adult loses 7 HP (cholera dailyHealthDelta = -7 × 1.0).
    //           child loses round(7 × 1.75) = 12 HP.
    const base = newGame();

    // Member 0 → adult at HP 100 with cholera.
    // Member 1 → child at HP 100 with cholera.
    let s = withMember(base, 0, {
      kind: 'adult',
      health: 100,
      conditions: [{ id: 'cholera', daysSinceOnset: 0 }]
    });
    s = withMember(s, 1, {
      kind: 'child',
      health: 100,
      conditions: [{ id: 'cholera', daysSinceOnset: 0 }]
    });

    // Use a seed where natural-course resolve won't fire at daysSinceOnset=0
    // (minCourseDays=2 for cholera — resolve returns 0 before min, safe).
    const rng = makeRng('cm1259-cholera');
    const next = progressConditions(s, rng);

    const adultHP = next.party[0].health;
    const childHP = next.party[1].health;

    // Adult: 100 - 7 = 93.
    expect(adultHP).toBe(93);
    // Child: 100 - round(7 * 1.75) = 100 - 12 = 88.
    expect(childHP).toBe(88);
    // Verify the ratio is approximately 1.75.
    const adultDmg = 100 - adultHP;
    const childDmg = 100 - childHP;
    expect(childDmg / adultDmg).toBeCloseTo(1.75, 0);
  });
});

describe('#1259 §1 — dysentery: child takes ~1.75× adult damage per tick', () => {
  it('child with dysentery loses more HP than adult', () => {
    // dysentery dailyHealthDelta = -3. Adult loses 3; child loses round(3 * 1.75) = 5.
    const base = newGame();
    let s = withMember(base, 0, {
      kind: 'adult',
      health: 100,
      conditions: [{ id: 'dysentery', daysSinceOnset: 0 }]
    });
    s = withMember(s, 1, {
      kind: 'child',
      health: 100,
      conditions: [{ id: 'dysentery', daysSinceOnset: 0 }]
    });

    const rng = makeRng('cm1259-dysentery');
    const next = progressConditions(s, rng);

    const adultHP = next.party[0].health;
    const childHP = next.party[1].health;

    expect(adultHP).toBe(97); // 100 - 3
    expect(childHP).toBe(95); // 100 - round(3 * 1.75) = 100 - 5
  });
});

describe('#1259 §1 — measles: child and adult take EQUAL damage (flat, not dehydrating)', () => {
  it('child with measles takes the same HP loss as adult', () => {
    // measles dailyHealthDelta = -3. Both should lose 3.
    const base = newGame();
    let s = withMember(base, 0, {
      kind: 'adult',
      health: 100,
      conditions: [{ id: 'measles', daysSinceOnset: 0 }]
    });
    s = withMember(s, 1, {
      kind: 'child',
      health: 100,
      conditions: [{ id: 'measles', daysSinceOnset: 0 }]
    });

    const rng = makeRng('cm1259-measles');
    const next = progressConditions(s, rng);

    const adultHP = next.party[0].health;
    const childHP = next.party[1].health;

    // Both should take 3 HP damage — measles is NOT in DEHYDRATING_CONDITIONS.
    expect(adultHP).toBe(97);
    expect(childHP).toBe(97);
  });
});

describe('#1259 §1 — typhoid: child and adult take EQUAL damage (flat)', () => {
  it('child with typhoid takes the same HP loss as adult', () => {
    // typhoid dailyHealthDelta = -4. Both lose 4.
    const base = newGame();
    let s = withMember(base, 0, {
      kind: 'adult',
      health: 100,
      conditions: [{ id: 'typhoid', daysSinceOnset: 0 }]
    });
    s = withMember(s, 1, {
      kind: 'child',
      health: 100,
      conditions: [{ id: 'typhoid', daysSinceOnset: 0 }]
    });

    const rng = makeRng('cm1259-typhoid');
    const next = progressConditions(s, rng);

    expect(next.party[0].health).toBe(96); // 100 - 4
    expect(next.party[1].health).toBe(96); // 100 - 4 (no multiplier)
  });
});

// ---------------------------------------------------------------------------
// §4 — _lastOxDeathDay stamped at event/action ox-kill sites
// ---------------------------------------------------------------------------

describe('#1259 §4 — stray permanent loss stamps _lastOxDeathDay', () => {
  it('rollStrayMorning permanent-loss path sets flags._lastOxDeathDay = state.day', () => {
    // Find a seed that triggers the permanent-loss branch (5% chance per
    // stray incident; stray itself is 25% base). Try up to 5000 seeds.
    const base = createInitialState({
      seed: 'cm1259-stray',
      leader: { name: 'Ezra', profession: 'farmer' },
      companions: [{ name: 'Ruth', profession: 'carpenter' }],
      startDate: { year: 1848, month: 4, day: 15 }
    });

    const startCount = base.oxen.filter((o) => o.health > 0).length;
    expect(startCount).toBeGreaterThan(1); // need >1 healthy ox for loss to fire

    let foundFlag = false;
    for (let i = 0; i < 5000 && !foundFlag; i++) {
      const r = rollStrayMorning(base, makeRng(`cm1259-stray-${i}`));
      const after = r.state.oxen.filter((o) => o.health > 0).length;
      if (after < startCount) {
        // Permanent loss occurred — flag must be set.
        expect(r.state.flags._lastOxDeathDay).toBe(base.day);
        foundFlag = true;
      }
    }
    expect(foundFlag).toBe(true);
  });
});

describe('#1259 §4 — raid-revenge flee choice stamps _lastOxDeathDay when ox is killed', () => {
  it('encounter_raid_revenge "flee" choice sets flags._lastOxDeathDay when killOx = true', () => {
    // Set up a state that passes the raid_revenge gate:
    // _raidRevengeDay <= state.day AND tribesAtMile returns non-empty.
    // Mile ~300 = Sioux country.
    const base = createInitialState({
      seed: 'cm1259-raid',
      leader: { name: 'Ezra', profession: 'farmer' },
      companions: [{ name: 'Ruth', profession: 'carpenter' }],
      startDate: { year: 1848, month: 4, day: 15 }
    });
    const s: GameState = {
      ...base,
      day: 10,
      location: { ...base.location, milesTraveled: 300 },
      flags: {
        ...base.flags,
        _raidRevengeDay: 10 // gate: day >= _raidRevengeDay
      }
    };

    const ev = ENCOUNTER_EVENTS.find((e) => e.id === 'encounter_raid_revenge')!;
    expect(ev).toBeDefined();

    // Find a seed where RAID_REVENGE_OX_KILL_CHANCE (40%) fires on the flee choice.
    let foundKill = false;
    for (let i = 0; i < 200 && !foundKill; i++) {
      const rng = makeRng(`cm1259-raid-${i}`);
      const result = resolveEvent(s, ev, 'flee', rng);
      const killedOx = result.oxen.filter((o) => o.health > 0).length < s.oxen.filter((o) => o.health > 0).length;
      if (killedOx) {
        expect(result.flags._lastOxDeathDay).toBe(s.day);
        foundKill = true;
      }
    }
    expect(foundKill).toBe(true);
  });
});
