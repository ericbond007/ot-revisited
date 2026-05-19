import { describe, it, expect } from 'vitest';
import { rest } from '../src/lib/game/actions/rest';
import { tickDayPausable } from '../src/lib/game/engine-pausable';
import { REST_HEAL_PER_DAY } from '../src/lib/game/systems/travel-recovery';
import { createInitialState } from '../src/lib/game/engine';
import { tickNpcWagon } from '../src/lib/game/systems/npc-engine';
import { generateTrain } from '../src/lib/game/content/trains';
import { makeRng } from '../src/lib/game/rng';
import type { GameState, NpcWagonState } from '../src/lib/game/types';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

function g(): GameState {
  const s = createInitialState({
    seed: 'int1046',
    leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'farmer' }],
    startDate: { year: 1849, month: 6, day: 15 }
  });
  return { ...s, morale: 60, inventory: { flour: 400 }, resources: { ...s.resources, water: 40 },
    party: s.party.map((m) => ({ ...m, health: 60 })) };
}

describe('#1046 A+D — rest.ts unchanged after DRY', () => {
  it('one rest day still heals within [floor, 100]; REST_HEAL_PER_DAY is 8', () => {
    const before = g();
    const after = rest(before, 1);
    expect(after.party[0].health).toBeGreaterThanOrEqual(60);
    expect(after.party[0].health).toBeLessThanOrEqual(100);
    expect(REST_HEAL_PER_DAY).toBe(8);
  });
});

describe('#1046 A+D — engine layby pays off, no double-apply', () => {
  it('a no-train solo travel day heals condition-free +1 exactly once', () => {
    const r = tickDayPausable(g());
    const st = (r as { state: GameState }).state;
    expect(st.party[0].health).toBe(61);
  });
});

// #1046 A+D — NPC parity helpers.
// Use generateTrain to get a fully-valid NpcWagonState (correct
// leaderProfession, hasChildren, etc.) and then surgically mutate
// for the sick/healthy test cases. This mirrors the pattern used by
// npc-rest-parity-937.test.ts and npc-engine-280b.test.ts.
function freshNpcWagon(): NpcWagonState {
  const train = generateTrain('npc1046', 1, 'independence_mo', makeRng('npc1046'), {
    fresh: true
  });
  const w = train.companions[0];
  // Set party to HP=50, well-fed, watered so careLevel returns 'tended'.
  return {
    ...w,
    morale: 60,
    water: 30,
    inventory: { flour: 200 },
    party: w.party.map((m) => ({ ...m, health: 50, conditions: [] }))
  };
}

function withDysentery(w: NpcWagonState): NpcWagonState {
  return {
    ...w,
    party: w.party.map((m, i) =>
      i === 0
        ? { ...m, conditions: [{ id: 'dysentery' as const, daysSinceOnset: 2 }] }
        : m
    )
  };
}

// NpcTickContext helpers — mirrors the shape from NpcTickContext interface.
const travelCtx = {
  day: 10,
  date: { year: 1849, month: 6, day: 25 },
  traveled: true,
  traveledMiles: 15,
  pace: 'moderate' as const,
  terrain: 'prairie' as const,
  weather: 'clear' as const,
  // companyRestMode='travel' → C2 gate bypassed (persona.shouldRest skipped),
  // so `traveled` stays true and the A-parity block fires on the travel branch.
  companyRestMode: 'travel' as const
};

const laybyCtx = {
  day: 10,
  date: { year: 1849, month: 6, day: 25 },
  traveled: false,
  traveledMiles: 0,
  pace: 'moderate' as const,
  terrain: 'prairie' as const,
  weather: 'clear' as const,
  companyRestMode: 'maintenance_layby' as const
};

describe('#1046 A+D — NPC parity', () => {
  it('sick NPC on a travel day convalesces (HP does not pure-decline)', () => {
    const w = withDysentery(freshNpcWagon());
    const r = tickNpcWagon(w, travelCtx, makeRng('npc:r1'));
    const sick = r.wagon.party.find((m) => m.conditions.length > 0);
    // Tended wagon (food + water + morale≥25) → convalesceGain > 0
    // on a moderate-pace travel day. HP must not pure-decline.
    expect(sick && sick.health).toBeGreaterThanOrEqual(47);
  });

  it('NPC on a company lay-by gets the rest heal (not zero)', () => {
    const w = freshNpcWagon();
    const r = tickNpcWagon(w, laybyCtx, makeRng('npc:r2'));
    expect(r.wagon.party[0].health).toBeGreaterThan(50);
  });

  it('synth carries every field applyDailyRecovery reads — no crash loop', () => {
    expect(() =>
      tickNpcWagon(withDysentery(freshNpcWagon()), travelCtx, makeRng('npc:r3'))
    ).not.toThrow();
    expect(() =>
      tickNpcWagon(freshNpcWagon(), laybyCtx, makeRng('npc:r4'))
    ).not.toThrow();
  });
});

function walkTs(dir: string, acc: string[]): string[] {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) walkTs(p, acc);
    else if (ent.name.endsWith('.ts')) acc.push(p);
  }
  return acc;
}

// #1046 D — condition-add-site audit.
//
// Goal: every place that constructs a runtime `Condition` literal must
// initialize `daysSinceOnset`. Dropping it (`{ id: 'cholera' }` instead
// of `{ id: 'cholera', daysSinceOnset: 0 }`) ships an `undefined` counter
// that breaks natural-resolve math.
//
// COVERAGE — `findOffenders` matches and classifies these literal shapes:
//   1. Quoted-id, no trailing fields:   `{ id: 'cholera' }`
//      (with optional `as const`)        `{ id: 'cholera' as const }`
//      → no `daysSinceOnset` in body → OFFENDER (this is the exact bug
//        the audit exists to catch; the prior `\s*,\s*` matcher REQUIRED
//        a comma after the id and so could never match this shape — a
//        tautology that passed even with the bug injected).
//   2. Quoted-id, with trailing fields:  `{ id: 'cholera', daysSinceOnset: 0 }`
//      → counter present → OK.   `{ id: 'cholera', foo: 1 }` → OFFENDER.
//   3. Variable-id (e.g. consumption.ts:237 `{ id: disease, daysSinceOnset: 0 }`):
//      a bare identifier where a quoted id would go. The generic walk
//      CANNOT safely flag bare-id literals — TS *type* annotations
//      (`Array<{ id: string; qty: number }>`) and many non-condition
//      value literals share that shape, so a bare-id matcher false-flags
//      them. Instead this one real variable-id site is covered by a
//      dedicated explicit assertion (`consumption.ts variable-id push`
//      test below), which reads that exact literal and requires the
//      counter — genuinely covering the site review flagged, with no
//      false-positive surface. The self-fixture still exercises a
//      bare-id offender against `findOffenders` to prove that code path.
//
// EXCLUSION — the static `ConditionMeta` catalog in content/conditions.ts
// (`{ id: 'cholera', name: 'Cholera', dailyHealthDelta: -7, ... }`) is
// NOT a runtime add-site; it always carries `name:` / `dailyHealthDelta:`,
// fields that never appear on a runtime `Condition` instance. The
// `isConditionMeta` guard skips exactly those. It cannot mask a real
// add-site because runtime add literals never contain those two fields.
//
// RESIDUAL LIMIT — the body capture is `[^{}]*`: it stops at the FIRST
// `{` or `}`, so the matcher only sees flat single-object literals. This
// is deliberate. An earlier `[^}]*` (no `{` exclusion) let a large
// non-condition literal — e.g. an `EventDef` `{ id: 'health_cholera',
// category: ..., title: ..., ... }` ~975 chars — greedily swallow the
// real `{ id: 'cholera' }` condition add-site that followed it on the
// matchAll cursor, hiding the bug. Excluding `{` bounds every match to
// its own braces so a big sibling literal can no longer eclipse a
// downstream add-site. The trade-off: a condition literal that nests an
// object BEFORE `daysSinceOnset` would be missed; no such site exists
// and the shape is unidiomatic. The negative self-fixture below proves
// the audit actually bites so it cannot rot back into a tautology.

// TS primitive/type names that appear as a bare id in a *type*
// annotation (`{ id: string; ... }`), never a runtime condition value.
const TYPE_ANNOTATION_IDS = new Set([
  'string','number','boolean','unknown','any','never','ConditionId'
]);

// `bareIdInScope=false` (the generic file walk) → quoted-id only,
// because TS type annotations and many non-condition value literals
// share the `{ id: <ident> }` shape and would false-flag. The single
// real variable-id add-site is covered by a dedicated assertion below.
// `bareIdInScope=true` (self-fixture only) → also exercises the bare-id
// path so that classification code is proven, not dead.
function findOffenders(src: string, condIds: string[], bareIdInScope = false): boolean {
  // id is either a quoted literal ('cholera') OR a bare identifier
  // (disease). Trailing `, <body>` is OPTIONAL so a counter-less
  // literal `{ id: 'cholera' }` still becomes a candidate (group 3
  // absent → empty body → omits daysSinceOnset → flagged). The prior
  // matcher REQUIRED `\s*,\s*` after the id and so could never match
  // the counter-less bug shape — a tautology.
  const re = /\{\s*id:\s*(?:'(\w+)'|(\w+))(?:\s+as\s+const)?\s*(?:,\s*([^{}]*))?\}/g;
  for (const m of src.matchAll(re)) {
    const quotedId = m[1];
    const bareId = m[2];
    const body = m[3] ?? '';
    // ConditionMeta catalog entry — not a runtime add-site. (Always has
    // a comma + these fields, so body is populated when this is true.)
    const isConditionMeta =
      body.indexOf('name:') !== -1 || body.indexOf('dailyHealthDelta') !== -1;
    if (isConditionMeta) continue;
    const omitsCounter = body.indexOf('daysSinceOnset') === -1;
    if (!omitsCounter) continue;
    if (quotedId !== undefined) {
      // Quoted id: flag only when it's a known condition id.
      if (condIds.indexOf(quotedId) !== -1) return true;
    } else if (bareId !== undefined && bareIdInScope) {
      // Bare-identifier id (e.g. `disease`). Only evaluated for the
      // self-fixture; excludes TS-type-annotation names.
      if (!TYPE_ANNOTATION_IDS.has(bareId)) return true;
    }
  }
  return false;
}

describe('#1046 D — every condition-add site initializes daysSinceOnset', () => {
  const condIds = ['dysentery','cholera','typhoid','measles','exhaustion','broken_leg','snakebite','frostbite','scurvy','starvation','pox','bear_mauling'];

  it('self-fixture: the audit actually flags a counter-less literal', () => {
    // Negative self-test — proves the matcher+guard pipeline bites.
    // If any of these stop being flagged the audit has rotted into a
    // tautology and THIS test fails first, before false-confidence ships.
    // Quoted-id offenders (the exact counter-less bug shape).
    expect(findOffenders("x = { id: 'cholera' }", condIds)).toBe(true);
    expect(findOffenders("x = { id: 'cholera' as const }", condIds)).toBe(true);
    expect(findOffenders("x = { id: 'cholera',\n  health: 1 }", condIds)).toBe(true);
    // Bare-id offenders (variable-id path, in-scope only for fixture).
    expect(findOffenders('x = { id: disease }', condIds, true)).toBe(true);
    expect(findOffenders('x = { id: disease, health: 1 }', condIds, true)).toBe(true);
    // Bare-id NOT flagged in generic-walk scope (avoids type-annot FPs).
    expect(findOffenders('x = { id: disease }', condIds, false)).toBe(false);
    expect(findOffenders('type T = { id: string; qty: number }', condIds, true)).toBe(false);
    // Sanity: correctly-formed literals are NOT flagged.
    expect(findOffenders("x = { id: 'cholera', daysSinceOnset: 0 }", condIds)).toBe(false);
    expect(findOffenders('x = { id: disease, daysSinceOnset: 0 }', condIds, true)).toBe(false);
    // ConditionMeta catalog shape is excluded (not a runtime add-site).
    expect(
      findOffenders("x = { id: 'cholera', name: 'Cholera', dailyHealthDelta: -7 }", condIds)
    ).toBe(false);
  });

  it('no condition-shaped literal in src/lib/game omits daysSinceOnset', () => {
    const offenders: string[] = [];
    for (const file of walkTs('src/lib/game', [])) {
      if (findOffenders(readFileSync(file, 'utf8'), condIds)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  it('consumption.ts variable-id push explicitly carries daysSinceOnset', () => {
    // Belt-and-suspenders for the variable-id site flagged by review.
    // Independent of the matcher: a direct read of the disease-push
    // literal in consumption.ts must contain the counter.
    const src = readFileSync('src/lib/game/systems/consumption.ts', 'utf8');
    const m = src.match(/\{\s*id:\s*disease[^}]*\}/);
    expect(m, 'disease-condition push literal not found').not.toBeNull();
    expect(m![0]).toContain('daysSinceOnset');
  });
});
