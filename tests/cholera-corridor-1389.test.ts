/**
 * #1389 — cholera corridor mechanic tests.
 *
 * Covers:
 *  1. Year/location gate — fires only in 1849–1853 AND before Fort Laramie.
 *  2. Chance shape — coffee/tea modifier, doctor halving, child 1.5× bonus.
 *  3. At-most-one-per-day — corridor skips when dirty channel already bit.
 *  4. Inflicts cholera only; skips members already carrying it.
 *  5. Integration — ~45-tick corridor transit produces onset(s) on some seeds.
 *  6. Spine-order: applyCholeraCorridorRisk appears immediately after
 *     applyDirtyWaterRisk in MORNING_STEPS.
 */
import { describe, it, expect } from 'vitest';
import {
  applyCholeraCorridorRisk,
  CHOLERA_CORRIDOR_END_MI,
  CHOLERA_CORRIDOR_YEARS,
  CORRIDOR_AMBIENT_CHOLERA_CHANCE,
  CORRIDOR_AMBIENT_CHOLERA_CHANCE_DOCTOR,
  CHILD_DIRTY_WATER_RISK_MULT,
} from '../src/lib/game/systems/consumption';
import { MORNING_STEPS } from '../src/lib/game/daily-steps';
import { makeRng } from '../src/lib/game/rng';
import type { GameState } from '../src/lib/game/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal party member — all fields consumption.ts touches. */
function makeMember(overrides: {
  id?: string;
  name?: string;
  kind?: 'adult' | 'child';
  conditions?: Array<{ id: string; daysSinceOnset: number }>;
  dead?: boolean;
} = {}) {
  return {
    id: overrides.id ?? 'm1',
    name: overrides.name ?? 'Ezra',
    profession: 'carpenter',
    sex: 'male',
    kind: overrides.kind ?? 'adult',
    isLeader: true,
    age: 30,
    health: 100,
    conditions: overrides.conditions ?? [],
    dead: overrides.dead ?? false,
  };
}

/**
 * Minimal GameState sufficient for applyCholeraCorridorRisk.
 * Defaults to 1849 corridor start (year=1849, miles=0).
 */
function makeState(overrides: {
  year?: number;
  milesTraveled?: number;
  members?: ReturnType<typeof makeMember>[];
  inventory?: Record<string, number>;
} = {}): GameState {
  return {
    seed: 'cc-test',
    day: 1,
    date: { year: overrides.year ?? 1849, month: 5, day: 1 },
    location: {
      trailPosition: 0,
      nextLandmarkId: 'ft_kearny',
      previousLandmarkId: null,
      milesTraveled: overrides.milesTraveled ?? 0,
      terrain: 'prairie',
    },
    party: overrides.members ?? [makeMember()],
    wagon: {
      model: 'prairie_schooner',
      condition: 100,
      canvas: 100,
      carryCapacity: 2500,
      impairment: null,
    },
    oxen: [],
    inventory: overrides.inventory ?? {},
    cash: 0,
    resources: { water: 20, waterCap: 30 },
    morale: 60,
    pace: 'moderate',
    rations: 'normal',
    waterRation: 'normal',
    eventLog: [],
    flags: {},
    completed: false,
    outcome: 'in-progress',
  } as unknown as GameState;
}

/** RNG stub: always returns the given value for chance(), never called for pick. */
function stubChance(val: boolean) {
  return { chance: (_p: number) => val };
}

/** Count new cholera onsets (daysSinceOnset === 0) in the output party. */
function newCholeraCount(out: GameState): number {
  return out.party.filter((m) =>
    m.conditions.some((c) => c.id === 'cholera' && c.daysSinceOnset === 0)
  ).length;
}

// ---------------------------------------------------------------------------
// 1. Year / location gate
// ---------------------------------------------------------------------------
describe('#1389 — year/location gate', () => {
  it('CHOLERA_CORRIDOR_END_MI equals runningMilesTo(ft_laramie) = 650', () => {
    expect(CHOLERA_CORRIDOR_END_MI).toBe(650);
  });

  it('CHOLERA_CORRIDOR_YEARS spans 1849–1853', () => {
    expect(CHOLERA_CORRIDOR_YEARS).toEqual([1849, 1850, 1851, 1852, 1853]);
  });

  it('1848 — no infection regardless of seed (year gate)', () => {
    const s = makeState({ year: 1848, milesTraveled: 0 });
    const out = applyCholeraCorridorRisk(s, stubChance(true));
    expect(out).toBe(s); // reference-equal → no allocation
  });

  it('1854 — no infection (year gate)', () => {
    const s = makeState({ year: 1854, milesTraveled: 0 });
    const out = applyCholeraCorridorRisk(s, stubChance(true));
    expect(out).toBe(s);
  });

  it('1849 at mile 649 (one mile before Laramie) — can infect', () => {
    const s = makeState({ year: 1849, milesTraveled: 649 });
    const out = applyCholeraCorridorRisk(s, stubChance(true));
    expect(newCholeraCount(out)).toBe(1);
  });

  it('1849 at CHOLERA_CORRIDOR_END_MI exactly — no infection (mile gate uses strict <)', () => {
    const s = makeState({ year: 1849, milesTraveled: CHOLERA_CORRIDOR_END_MI });
    const out = applyCholeraCorridorRisk(s, stubChance(true));
    expect(out).toBe(s);
  });

  it('1849 at mile 900 (post-Laramie) — no infection', () => {
    const s = makeState({ year: 1849, milesTraveled: 900 });
    const out = applyCholeraCorridorRisk(s, stubChance(true));
    expect(out).toBe(s);
  });

  it('1853 in corridor — can infect (last corridor year)', () => {
    const s = makeState({ year: 1853, milesTraveled: 100 });
    const out = applyCholeraCorridorRisk(s, stubChance(true));
    expect(newCholeraCount(out)).toBe(1);
  });

  it('1850 in corridor — can infect', () => {
    const s = makeState({ year: 1850, milesTraveled: 300 });
    const out = applyCholeraCorridorRisk(s, stubChance(true));
    expect(newCholeraCount(out)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 2. Chance shape — coffee/tea modifier, doctor halving, child multiplier
// ---------------------------------------------------------------------------
describe('#1389 — chance shape (deterministic seed assertions)', () => {
  // Use a seeded RNG so assertions are deterministic across runs.
  // Seed chosen such that a single adult rolls FALSE at base chance 0.005
  // (most seeds will miss at 0.5% — we want to confirm the shape, not luck out).
  // We test via "always hit" stubs to test guard paths, and seeded runs for
  // integration confidence.

  it('base adult chance constant is 0.005', () => {
    expect(CORRIDOR_AMBIENT_CHOLERA_CHANCE).toBe(0.005);
  });

  it('doctor halved constant is 0.0025', () => {
    expect(CORRIDOR_AMBIENT_CHOLERA_CHANCE_DOCTOR).toBe(0.0025);
  });

  it('child risk multiplier reused from CHILD_DIRTY_WATER_RISK_MULT = 1.5', () => {
    expect(CHILD_DIRTY_WATER_RISK_MULT).toBe(1.5);
  });

  it('always-hit adult member — infected exactly once (at-most-one cap)', () => {
    const s = makeState({
      members: [
        makeMember({ id: 'a', kind: 'adult' }),
        makeMember({ id: 'b', kind: 'adult' }),
        makeMember({ id: 'c', kind: 'adult' }),
      ]
    });
    const out = applyCholeraCorridorRisk(s, stubChance(true));
    expect(newCholeraCount(out)).toBe(1); // at most one regardless
  });

  it('always-hit child member — infected (children roll at 1.5×, still at-most-one)', () => {
    const s = makeState({ members: [makeMember({ id: 'c1', kind: 'child' })] });
    const out = applyCholeraCorridorRisk(s, stubChance(true));
    expect(newCholeraCount(out)).toBe(1);
  });

  it('always-miss — no infection on any party', () => {
    const s = makeState({
      members: [
        makeMember({ id: 'a', kind: 'adult' }),
        makeMember({ id: 'b', kind: 'child' }),
      ]
    });
    const out = applyCholeraCorridorRisk(s, stubChance(false));
    expect(out).toBe(s);
  });

  it('coffee/tea modifier: inventory with 20 coffee — rng chance argument must be smaller than bare', () => {
    // We capture what p-value was passed by injecting a spy into chance().
    const pValues: number[] = [];
    const spyRng = { chance: (p: number) => { pValues.push(p); return false; } };

    // Without coffee/tea
    const bare = makeState({ inventory: {} });
    applyCholeraCorridorRisk(bare, spyRng);
    const pBare = pValues[0];
    pValues.length = 0;

    // With coffee (boiling = protection)
    const withCoffee = makeState({ inventory: { coffee: 20 } });
    applyCholeraCorridorRisk(withCoffee, spyRng);
    const pCoffee = pValues[0];

    expect(pCoffee).toBeLessThan(pBare);
  });

  it('doctor halving: state with profession=doctor in party → smaller chance p passed', () => {
    const pValues: number[] = [];
    const spyRng = { chance: (p: number) => { pValues.push(p); return false; } };

    const noDoctor = makeState({ members: [makeMember({ id: 'a' })] });
    applyCholeraCorridorRisk(noDoctor, spyRng);
    const pNoDoc = pValues[0];
    pValues.length = 0;

    // Doctor needs 'doctor' profession AND alive, non-dead
    const withDoctor = makeState({
      members: [
        { ...makeMember({ id: 'a' }), profession: 'doctor' },
        makeMember({ id: 'b' }),
      ] as ReturnType<typeof makeMember>[]
    });
    applyCholeraCorridorRisk(withDoctor, spyRng);
    const pDoc = pValues[0]; // first adult rolled

    expect(pDoc).toBeLessThan(pNoDoc);
  });

  it('children roll at higher p than adults — spy verifies via mixed party', () => {
    const pValues: { id: string; p: number }[] = [];
    // We use a state where adults roll first, then children; capture each p.
    let memberIdx = 0;
    const memberIds = ['adult1', 'child1'];
    const members = [
      makeMember({ id: 'adult1', kind: 'adult' }),
      makeMember({ id: 'child1', kind: 'child' }),
    ];
    const spyRng = {
      chance: (p: number) => {
        pValues.push({ id: memberIds[memberIdx++], p });
        return false; // never actually infect — we only need p values
      }
    };

    const s = makeState({ members });
    applyCholeraCorridorRisk(s, spyRng);

    const adultP = pValues.find((x) => x.id === 'adult1')!.p;
    const childP = pValues.find((x) => x.id === 'child1')!.p;
    expect(childP).toBeCloseTo(adultP * 1.5, 10);
  });
});

// ---------------------------------------------------------------------------
// 3. At-most-one-per-day coordination with the dirty channel
// ---------------------------------------------------------------------------
describe('#1389 — at-most-one-per-day (dirty channel coordination)', () => {
  it('if dirty channel already infected someone (daysSinceOnset=0 cholera) — corridor skips', () => {
    const s = makeState({
      members: [
        makeMember({
          id: 'a',
          conditions: [{ id: 'cholera', daysSinceOnset: 0 }], // already bit today
        }),
        makeMember({ id: 'b' }), // healthy
      ]
    });
    // Even with always-hit rng, corridor should skip because someone already
    // has a daysSinceOnset=0 cholera condition.
    const out = applyCholeraCorridorRisk(s, stubChance(true));
    expect(out).toBe(s); // reference-equal → no allocation, skipped
  });

  it('if dirty channel infected with dysentery (daysSinceOnset=0) — corridor also skips', () => {
    const s = makeState({
      members: [
        makeMember({
          id: 'a',
          conditions: [{ id: 'dysentery', daysSinceOnset: 0 }],
        }),
        makeMember({ id: 'b' }),
      ]
    });
    const out = applyCholeraCorridorRisk(s, stubChance(true));
    expect(out).toBe(s);
  });

  it('onset from a previous day (daysSinceOnset=1) does NOT block the corridor', () => {
    // daysSinceOnset > 0 means it happened before today — corridor should still run.
    const s = makeState({
      members: [
        makeMember({
          id: 'a',
          conditions: [{ id: 'cholera', daysSinceOnset: 1 }], // old infection
        }),
        makeMember({ id: 'b' }), // healthy
      ]
    });
    // Always-hit; member 'a' already has cholera so will be skipped by the
    // "already has cholera" guard, but 'b' can be infected.
    const out = applyCholeraCorridorRisk(s, stubChance(true));
    // Member b should be newly infected (onset=0)
    const bAfter = out.party.find((m) => m.id === 'b')!;
    expect(bAfter.conditions.some((c) => c.id === 'cholera' && c.daysSinceOnset === 0)).toBe(true);
  });

  it('healthy party with no prior infections — corridor can infect (baseline)', () => {
    const s = makeState({ members: [makeMember({ id: 'a' })] });
    const out = applyCholeraCorridorRisk(s, stubChance(true));
    expect(newCholeraCount(out)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 4. Inflicts cholera only; skips members already carrying it
// ---------------------------------------------------------------------------
describe('#1389 — inflicts cholera only; skips existing carriers', () => {
  it('output condition id is always "cholera" (never dysentery)', () => {
    const s = makeState({ members: [makeMember({ id: 'a' })] });
    const out = applyCholeraCorridorRisk(s, stubChance(true));
    const gained = out.party[0].conditions.find((c) => c.daysSinceOnset === 0);
    expect(gained?.id).toBe('cholera');
  });

  it('member already carrying cholera is skipped; next healthy member is infected', () => {
    const s = makeState({
      members: [
        makeMember({
          id: 'a',
          conditions: [{ id: 'cholera', daysSinceOnset: 3 }], // old — not today
        }),
        makeMember({ id: 'b' }),
      ]
    });
    const out = applyCholeraCorridorRisk(s, stubChance(true));
    // 'a' is already carrying cholera → skipped
    const aAfter = out.party.find((m) => m.id === 'a')!;
    expect(aAfter.conditions.length).toBe(1); // unchanged
    // 'b' is healthy → infected
    const bAfter = out.party.find((m) => m.id === 'b')!;
    expect(bAfter.conditions.some((c) => c.id === 'cholera' && c.daysSinceOnset === 0)).toBe(true);
  });

  it('if ALL alive members already carry cholera — state is returned unchanged', () => {
    const s = makeState({
      members: [
        makeMember({ id: 'a', conditions: [{ id: 'cholera', daysSinceOnset: 2 }] }),
        makeMember({ id: 'b', conditions: [{ id: 'cholera', daysSinceOnset: 1 }] }),
      ]
    });
    // Always-hit, but both skip — should get the plain state back
    // (note: the state WILL be allocated because always-hit passes
    // the dirtyAlreadyBit check and enters the loop, but every member
    // is skipped — so we still return the original state).
    const out = applyCholeraCorridorRisk(s, stubChance(true));
    expect(newCholeraCount(out)).toBe(0);
  });

  it('dead members are skipped', () => {
    const s = makeState({
      members: [
        makeMember({ id: 'a', dead: true }),
        makeMember({ id: 'b', dead: false }),
      ]
    });
    const out = applyCholeraCorridorRisk(s, stubChance(true));
    const aAfter = out.party.find((m) => m.id === 'a')!;
    expect(aAfter.conditions.length).toBe(0); // dead — not touched
    const bAfter = out.party.find((m) => m.id === 'b')!;
    expect(bAfter.conditions.some((c) => c.id === 'cholera' && c.daysSinceOnset === 0)).toBe(true);
  });

  it('event log entry mentions cholera and the member name', () => {
    const s = makeState({ members: [makeMember({ id: 'a', name: 'Silas' })] });
    const out = applyCholeraCorridorRisk(s, stubChance(true));
    const entry = out.eventLog.at(-1);
    expect(entry?.text).toMatch(/Silas/);
    expect(entry?.text.toLowerCase()).toMatch(/cholera/);
  });
});

// ---------------------------------------------------------------------------
// 5. Integration — ~45-tick corridor transit
// ---------------------------------------------------------------------------
describe('#1389 — corridor transit integration (seeded, deterministic)', () => {
  /**
   * Simulates N ticks of applyCholeraCorridorRisk for a single state
   * using a seeded RNG (one rng instance advances across all ticks).
   * Returns the number of members who gained cholera at any point.
   */
  function corridorTransit(seed: string, partySize = 6, ticks = 45): {
    infected: number;
    events: string[];
  } {
    const rng = makeRng(seed);
    const members = Array.from({ length: partySize }, (_, i) =>
      makeMember({ id: `m${i}`, name: `Member${i}`, kind: i < 4 ? 'adult' : 'child' })
    );
    let state = makeState({ members, year: 1849, milesTraveled: 100 });
    const events: string[] = [];

    for (let t = 0; t < ticks; t++) {
      state = applyCholeraCorridorRisk(state, rng) as GameState;
      if (state.eventLog.length > events.length) {
        events.push(...state.eventLog.slice(events.length).map((e) => e.text));
      }
    }

    const infected = state.party.filter((m) => m.conditions.some((c) => c.id === 'cholera')).length;
    return { infected, events };
  }

  it('seed "cc-s1" — corridor transit produces a deterministic result (non-zero or zero)', () => {
    // This is primarily a determinism lock: same seed → same result always.
    const r1 = corridorTransit('cc-s1');
    const r2 = corridorTransit('cc-s1');
    expect(r1.infected).toBe(r2.infected);
  });

  it('seed "cc-s2" — different seed produces same determinism guarantee', () => {
    const r1 = corridorTransit('cc-s2');
    const r2 = corridorTransit('cc-s2');
    expect(r1.infected).toBe(r2.infected);
  });

  it('seed "full-1" (validated) — 6 members × 45 ticks produces ≥1 onset', () => {
    // Pre-validated: full-1 is a hit seed (confirmed by seed-finder sweep).
    // Deterministic lock: same seed → same outcome forever.
    const r = corridorTransit('full-1');
    expect(r.infected).toBeGreaterThanOrEqual(1);
  });

  it('seed "full-0" (validated) — 6 members × 45 ticks produces 0 onsets (corridor is not certain death)', () => {
    // Pre-validated: full-0 is a zero seed (confirmed by seed-finder sweep).
    // The corridor attack rate is ~15–25%, not 100%. This seed misses all 270 rolls.
    // Deterministic lock: same seed → same outcome forever.
    const r = corridorTransit('full-0');
    expect(r.infected).toBe(0);
  });

  it('post-Laramie (miles=700) — no infection even with always-hit rng (gate holds across ticks)', () => {
    const rng = makeRng('cc-postlaramie');
    const members = Array.from({ length: 6 }, (_, i) => makeMember({ id: `m${i}` }));
    let state = makeState({ members, year: 1849, milesTraveled: 700 });
    for (let t = 0; t < 45; t++) {
      state = applyCholeraCorridorRisk(state, stubChance(true)) as GameState;
    }
    expect(newCholeraCount(state)).toBe(0);
  });

  it('1848 — no infection over 45 ticks even with always-hit (year gate holds)', () => {
    const members = Array.from({ length: 6 }, (_, i) => makeMember({ id: `m${i}` }));
    let state = makeState({ members, year: 1848, milesTraveled: 100 });
    for (let t = 0; t < 45; t++) {
      state = applyCholeraCorridorRisk(state, stubChance(true)) as GameState;
    }
    // Year 1848 — always returns original state
    expect(state.party.every((m) => m.conditions.length === 0)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 6. Spine order: applyCholeraCorridorRisk immediately after applyDirtyWaterRisk
// ---------------------------------------------------------------------------
describe('#1389 — spine order: corridor step immediately after dirty-water step', () => {
  it('applyCholeraCorridorRisk appears in MORNING_STEPS', () => {
    const ids = MORNING_STEPS.map((s) => s.id);
    expect(ids).toContain('applyCholeraCorridorRisk');
  });

  it('applyCholeraCorridorRisk is immediately after applyDirtyWaterRisk', () => {
    const ids = MORNING_STEPS.map((s) => s.id);
    const dirtyIdx = ids.indexOf('applyDirtyWaterRisk');
    const corridorIdx = ids.indexOf('applyCholeraCorridorRisk');
    expect(dirtyIdx).toBeGreaterThanOrEqual(0);
    expect(corridorIdx).toBe(dirtyIdx + 1);
  });

  it('applyCholeraCorridorRisk has no scope tag (unscoped = NPC parity)', () => {
    const step = MORNING_STEPS.find((s) => s.id === 'applyCholeraCorridorRisk');
    expect(step?.scope).toBeUndefined();
  });
});
