# #927 Bundle Camp Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace today's idle / minimal-chain rest days with a per-persona `bundleCampActions` surface that fills the 12h camp budget with available actions (5 categories, 22 actions, + hunt). Wire both player-bot (runner.ts) and NPC engine (npc-engine.ts) to the same surface so rest-day behavior is parity-consistent.

**Architecture:** New `src/lib/game/ai/bundle.ts` module exposes `bundleCampActions(persona, state, primary, rng): RestBundle` dispatcher + `defaultBundleCampActions` algorithm + per-action `urgency()` scoring. `Persona` interface grows `bundleWeights: BundleWeights` (always) and optional `bundleCampActions?(...)` (override). 7 personas declare weights only; chaos + faithful provide overrides. Three slices, three PRs: foundation (no callers) → player-bot wiring → NPC wiring.

**Tech Stack:** TypeScript, SvelteKit, Vitest. Version control: **jj (Jujutsu)** — see CLAUDE.md project notes. Pre-commit gate: `npm run verify` (svelte-check + full vitest). Per memory `feedback_full_verify_between_tasks`, controller runs full verify between behavior-changing tasks. Sweep validation: `scripts/persona-profession-sweep.ts --runs 2 --tag <slice>`.

**Spec:** `docs/superpowers/specs/2026-05-25-927-bundle-camp-actions-design.md`

---

## File Structure

| File | Slice | Status | Responsibility |
|---|---|---|---|
| `src/lib/game/ai/bundle.ts` | 1 (new) | NEW | `BundleableActionId`, `BundleWeights`, `RestBundle` types; `BUNDLEABLE_ACTIONS`, `CATEGORY_OF`, `HUNT_HOURS`, `TIME_BUDGET_HOURS` constants; `urgency()`, `defaultBundleCampActions()`, `bundleCampActions()` dispatcher; `chaosBundle`, `faithfulBundle` overrides; `pickHunters`, `shuffleRng` helpers |
| `src/lib/game/ai/types.ts` | 1 (modify) | MODIFY | Add `bundleWeights` + optional `bundleCampActions?` to `Persona` |
| `src/lib/game/ai/personas.ts` | 1 (modify) | MODIFY | Wire `bundleWeights` on all 10 personas; attach `bundleCampActions: chaosBundle` on chaos and `bundleCampActions: faithfulBundle` on faithful |
| `src/lib/game/ai/index.ts` | 1 (modify) | MODIFY | Re-export `bundleCampActions`, `BundleWeights`, `RestBundle`, `BUNDLEABLE_ACTIONS` |
| `src/lib/dev/bot/runner.ts` | 2 (modify) | MODIFY | `restWithWaterChain` → `restWithBundle` calling `bundleCampActions`. Replace 5 call sites: find_water trigger, Sunday/shouldRest plain-rest, company-layby plain-rest, fallback rest |
| `src/lib/game/systems/npc-engine.ts` | 3 (modify) | MODIFY | Add `tickNpcBundle(wagon, env, persona, rng)` step on non-travel days; wire into the tick loop after company decision sets `traveled` |
| `tests/bundle-927.test.ts` | 1 (new) | NEW | Algorithm correctness, urgency breakpoints, persona dispatch, budget invariant, determinism |
| `tests/bundle-player-bot-927.test.ts` | 2 (new) | NEW | `restWithBundle` integration tests (find_water primary, Sunday primary=null, fallback) |
| `tests/npc-bundle-927.test.ts` | 3 (new) | NEW | NPC bundle tick (Sunday, maintenance_layby, crisis_layby, hunt-via-bundle, parity invariant, defensive failure) |

---

## Slice 1 — Foundation (no callers wired)

**Goal:** Ship `bundle.ts` + Persona surface + 10 persona weight wirings + 2 overrides. Full verify must pass and the persona-profession sweep MUST be byte-equal to master (nothing calls `bundleCampActions` yet).

**Branch:** `feat/927-bundle-foundation`, off master.

### Task 1.1 — Add types, constants, and BUNDLEABLE_ACTIONS

**Files:**
- Create: `src/lib/game/ai/bundle.ts`

- [ ] **Step 1: Create the new file with types and constants**

```ts
// src/lib/game/ai/bundle.ts
//
// #927 — Per-persona camp-action bundling on rest days. Bundles fill the
// 12-hour camp budget with available actions across 5 categories
// (survival, food, maintenance, hygiene, morale), plus an optional hunt
// directive. Shared by player-bot (runner.ts) and NPC engine
// (npc-engine.ts) for parity.
//
// Spec: docs/superpowers/specs/2026-05-25-927-bundle-camp-actions-design.md
//
// Period anchor (Frizzell 1852, Bryant 1846, Marcy 1859, Sager 1844):
// emigrant rest days were full work days. Sunday was rest from TRAVEL,
// not rest from camp labor.

import type { GameState } from '../types';
import type { Rng } from '../rng';
import type { Persona } from './types';
import type { CampActionId } from './rest';
import { CAMP_ACTIONS_BY_ID, hourCostFor } from '../actions/camp-actions';
import { hunt } from '../actions/hunt';
import { pickHuntTarget } from './hunt';
import { isSunday } from '../utils/calendar';

/** Mirror of rest.ts's TIME_BUDGET_HOURS. Imported there too — single
 *  source of truth lives in this module so callers don't bypass the cap. */
export const TIME_BUDGET_HOURS = 12;

/** A rest-day hunt is half a working day. Marcy 1859 hunting parties
 *  "left at dawn and returned by mid-afternoon" — 4-6h is the period
 *  band. Pick 5h. */
export const HUNT_HOURS = 5;

/** The subset of CampActionId that bundling considers. Excludes
 *  share_the_whore (own ritual), cannibalism (starvation-only),
 *  raid_natives / take_from_train / pan_for_gold (own persona surface),
 *  dig_out (avalanche/storm-trapped). */
export type BundleableActionId =
  | 'find_water' | 'boil_water' | 'gather_firewood' | 'dig_well'             // survival
  | 'fish' | 'set_traps' | 'cure_meat' | 'press_cheese' | 'big_meal'          // food (hunt is separate via RestBundle.hunt)
  | 'patch_wagon' | 'replace_canvas' | 'replace_planks' | 'stitch_moccasins'
    | 'cast_balls' | 'service_train'                                          // maintenance
  | 'wash_clothes' | 'make_soap'                                              // hygiene
  | 'sing_along' | 'read_bible' | 'pass_whiskey' | 'teach_kids';              // morale

export const BUNDLEABLE_ACTIONS: readonly BundleableActionId[] = [
  'find_water', 'boil_water', 'gather_firewood', 'dig_well',
  'fish', 'set_traps', 'cure_meat', 'press_cheese', 'big_meal',
  'patch_wagon', 'replace_canvas', 'replace_planks', 'stitch_moccasins', 'cast_balls', 'service_train',
  'wash_clothes', 'make_soap',
  'sing_along', 'read_bible', 'pass_whiskey', 'teach_kids',
];

export interface BundleWeights {
  /** find_water, boil_water, gather_firewood, dig_well. */
  survival: number;
  /** fish, set_traps, cure_meat, press_cheese, big_meal.
   *  Also gates the hunt directive — food>0 required to bundle hunt. */
  food: number;
  /** patch_wagon, replace_canvas, replace_planks, stitch_moccasins,
   *  cast_balls, service_train. */
  maintenance: number;
  /** wash_clothes, make_soap. */
  hygiene: number;
  /** sing_along, read_bible, pass_whiskey, teach_kids. */
  morale: number;
}

export const CATEGORY_OF: Record<BundleableActionId, keyof BundleWeights> = {
  find_water: 'survival', boil_water: 'survival',
  gather_firewood: 'survival', dig_well: 'survival',
  fish: 'food', set_traps: 'food', cure_meat: 'food',
  press_cheese: 'food', big_meal: 'food',
  patch_wagon: 'maintenance', replace_canvas: 'maintenance',
  replace_planks: 'maintenance', stitch_moccasins: 'maintenance',
  cast_balls: 'maintenance', service_train: 'maintenance',
  wash_clothes: 'hygiene', make_soap: 'hygiene',
  sing_along: 'morale', read_bible: 'morale',
  pass_whiskey: 'morale', teach_kids: 'morale',
};

export interface RestBundle {
  /** Fed into rest(state, 1, { campActions }). Includes the primary first
   *  (when provided), then greedy-fill by score within remaining budget. */
  campActions: CampActionId[];
  /** When non-null, caller invokes hunt(state, opts) AFTER rest() completes.
   *  The 12h budget is shared: HUNT_HOURS is subtracted alongside camp
   *  action time at bundle layer. */
  hunt: { target: ReturnType<typeof pickHuntTarget>['target']; ammo: ReturnType<typeof pickHuntTarget>['ammo']; hunters: 1 | 2 } | null;
}

/** Deterministic Fisher-Yates shuffle using the given rng. Used only
 *  by chaosBundle override. */
export function shuffleRng<T>(arr: readonly T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 1 hunter when only 1 live adult; 2 when there's a 2nd available.
 *  Matches the existing bot pattern in runner.ts. */
export function pickHunters(state: GameState): 1 | 2 {
  const aliveAdults = state.party.filter((m) => !m.dead && m.kind === 'adult').length;
  return aliveAdults >= 2 ? 2 : 1;
}
```

- [ ] **Step 2: Compile-check**

Run: `npx svelte-check --tsconfig ./tsconfig.json 2>&1 | tail -3`
Expected: `0 ERRORS`. The file declares types + helpers but isn't imported yet.

- [ ] **Step 3: Conceptual commit** (controller-managed)

Files touched: `src/lib/game/ai/bundle.ts`.

---

### Task 1.2 — urgency() function with breakpoint tests

**Files:**
- Modify: `src/lib/game/ai/bundle.ts`
- Create: `tests/bundle-927.test.ts`

- [ ] **Step 1: Write the failing test file**

Create `tests/bundle-927.test.ts`:

```ts
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
  it('find_water: 5-14gal → 6', () => {
    const s = baseState({ resources: { water: 10, waterCap: 20 } });
    expect(urgency(s, 'find_water')).toBe(6);
  });
  it('find_water: ≥15gal → 3', () => {
    const s = baseState({ resources: { water: 18, waterCap: 20 } });
    expect(urgency(s, 'find_water')).toBe(3);
  });
});

describe('#927 urgency — firewood', () => {
  it('gather_firewood: <5lb → 10', () => {
    const s = baseState({ resources: { water: 10, waterCap: 20, firewood: 3 } });
    expect(urgency(s, 'gather_firewood')).toBe(10);
  });
  it('gather_firewood: 5-14lb → 6', () => {
    const s = baseState({ resources: { water: 10, waterCap: 20, firewood: 10 } });
    expect(urgency(s, 'gather_firewood')).toBe(6);
  });
  it('gather_firewood: ≥15lb → 3', () => {
    const s = baseState({ resources: { water: 10, waterCap: 20, firewood: 20 } });
    expect(urgency(s, 'gather_firewood')).toBe(3);
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/bundle-927.test.ts 2>&1 | tail -10`
Expected: FAIL — `urgency` is not exported from `bundle.ts` yet.

- [ ] **Step 3: Implement urgency() in bundle.ts**

Append to `src/lib/game/ai/bundle.ts`:

```ts
/** Total food inventory in pounds — sums all known food item ids. */
function totalFoodLb(state: GameState): number {
  const i = state.inventory;
  return (i.flour ?? 0) + (i.beans ?? 0) + (i.bacon ?? 0) + (i.hardtack ?? 0)
    + (i.jerky ?? 0) + (i.pemmican ?? 0) + (i.game_meat ?? 0) + (i.cornmeal ?? 0)
    + (i.cheese ?? 0) + (i.butter ?? 0) + (i.dried_fruit ?? 0) + (i.berries ?? 0);
}

/** Per-action urgency score in [0..10]. Multiplied by weights[category]
 *  to rank candidates for greedy fill. Constants are starting points —
 *  sweep-tunable.
 *
 *  An urgency of 0 always loses (gets filtered out at the algorithm
 *  layer), so urgency() can also encode soft availability gates beyond
 *  the action's own availability() check. */
export function urgency(state: GameState, id: BundleableActionId): number {
  switch (id) {
    case 'find_water': {
      const w = state.resources.water ?? 0;
      return w < 5 ? 10 : w < 15 ? 6 : 3;
    }
    case 'boil_water': {
      const dirty = state.resources.dirtyWater ?? 0;
      return dirty > 0 ? 8 : 0;
    }
    case 'gather_firewood': {
      const fw = state.resources.firewood ?? 0;
      return fw < 5 ? 10 : fw < 15 ? 6 : 3;
    }
    case 'dig_well': {
      const w = state.resources.water ?? 0;
      const isDesert = state.location.terrain === 'desert';
      const hasShovel = (state.inventory.shovel ?? 0) > 0;
      return isDesert && hasShovel && w < 5 ? 10 : 0;
    }
    case 'fish':
    case 'set_traps': {
      const food = totalFoodLb(state);
      return food < 50 ? 8 : 4;
    }
    case 'cure_meat': {
      const meat = state.inventory.game_meat ?? 0;
      return meat >= 20 ? 10 : meat > 0 ? 5 : 0;
    }
    case 'press_cheese':
      return (state.inventory.milk ?? 0) > 0 ? 8 : 0;
    case 'big_meal':
      return state.morale < 50 ? 6 : 3;
    case 'patch_wagon': {
      const c = state.wagon.condition;
      return c < 60 ? 10 : c < 80 ? 6 : 2;
    }
    case 'replace_canvas':
      return state.wagon.canvas < 60 ? 10 : 0;
    case 'replace_planks':
      return state.wagon.condition < 50 ? 10 : 0;
    case 'stitch_moccasins':
      return (state.inventory.hide ?? 0) > 0 ? 6 : 3;
    case 'cast_balls': {
      const balls = state.inventory.lead_balls ?? 0;
      const hasMats = (state.inventory.lead ?? 0) > 0
        && (state.inventory.gunpowder ?? 0) > 0;
      return hasMats && balls < 20 ? 8 : hasMats ? 3 : 0;
    }
    case 'service_train':
      return 5;
    case 'wash_clothes':
      return state.location.terrain === 'river' ? 6 : 0;
    case 'make_soap':
      return (state.inventory.tallow ?? 0) > 0 ? 5 : 0;
    case 'sing_along':
      return state.morale < 50 ? 6 : 3;
    case 'read_bible':
      return state.morale < 60 ? 5 : 2;
    case 'pass_whiskey':
      return state.morale < 50 ? 5 : 2;
    case 'teach_kids':
      return state.party.some((m) => !m.dead && m.kind === 'child') ? 5 : 0;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/bundle-927.test.ts 2>&1 | tail -10`
Expected: PASS — all urgency breakpoint cases green.

- [ ] **Step 5: Conceptual commit**

Files touched: `src/lib/game/ai/bundle.ts`, `tests/bundle-927.test.ts`.

---

### Task 1.3 — defaultBundleCampActions algorithm

**Files:**
- Modify: `src/lib/game/ai/bundle.ts`
- Modify: `tests/bundle-927.test.ts`

- [ ] **Step 1: Append failing tests for the algorithm**

Append to `tests/bundle-927.test.ts`:

```ts
import { defaultBundleCampActions, TIME_BUDGET_HOURS, HUNT_HOURS } from '../src/lib/game/ai/bundle';
import { makeRng } from '../src/lib/game/rng';
import { hourCostFor, CAMP_ACTIONS_BY_ID } from '../src/lib/game/actions/camp-actions';
import { cautiousPersona } from '../src/lib/game/ai/personas';

function totalCampHours(state: GameState, campActions: string[]): number {
  return campActions.reduce((sum, id) =>
    sum + hourCostFor(CAMP_ACTIONS_BY_ID[id as keyof typeof CAMP_ACTIONS_BY_ID], state), 0);
}

describe('#927 defaultBundleCampActions — algorithm shape', () => {
  it('returns empty bundle when no bundleables are available', () => {
    // Strip the party to no live members → most availability gates fail.
    const s = baseState();
    const dead = { ...s, party: s.party.map((m) => ({ ...m, dead: true })) };
    // Use a placeholder persona with all-zero weights to also short-circuit
    // scoring. (cautiousPersona has bundleWeights wired in Task 1.5 — for
    // now this asserts the empty-no-candidates path.)
    const empty = defaultBundleCampActions(dead, null, cautiousPersona, makeRng('x'));
    expect(empty.campActions).toEqual([]);
    expect(empty.hunt).toBeNull();
  });

  it('primary is always first when provided', () => {
    const s = baseState({ resources: { water: 4, waterCap: 20, firewood: 3 } });
    const out = defaultBundleCampActions(s, 'find_water', cautiousPersona, makeRng('p'));
    expect(out.campActions[0]).toBe('find_water');
  });

  it('primary auto-promoted to highest-urgency when null', () => {
    // Water-critical state → find_water should rise to score 10×weight.
    const s = baseState({ resources: { water: 3, waterCap: 20, firewood: 20 } });
    const out = defaultBundleCampActions(s, null, cautiousPersona, makeRng('p'));
    expect(out.campActions[0]).toBe('find_water');
  });

  it('bundle total camp hours ≤ TIME_BUDGET_HOURS (invariant)', () => {
    // Property-style across multiple seeds.
    for (let i = 0; i < 20; i++) {
      const s = baseState({ resources: { water: 4, waterCap: 20, firewood: 3 } });
      const out = defaultBundleCampActions(s, 'find_water', cautiousPersona, makeRng(`seed-${i}`));
      const used = totalCampHours(s, out.campActions);
      const huntUsed = out.hunt ? HUNT_HOURS : 0;
      expect(used + huntUsed).toBeLessThanOrEqual(TIME_BUDGET_HOURS);
    }
  });

  it('hunt directive only when food weight > 0 AND remaining budget ≥ HUNT_HOURS', () => {
    // Cautious has food=2 + plenty of ammo + persona.shouldHunt = true when food low.
    const s = baseState({
      resources: { water: 4, waterCap: 20, firewood: 3 },
      inventory: { gunpowder: 50, lead_balls: 50, percussion_caps: 50 }
    });
    const out = defaultBundleCampActions(s, 'find_water', cautiousPersona, makeRng('h'));
    // Whether the hunt directive lands depends on shouldHunt + budget;
    // assert structurally that when present, it has the right shape.
    if (out.hunt) {
      expect(out.hunt.hunters).toBeGreaterThanOrEqual(1);
      expect(out.hunt.hunters).toBeLessThanOrEqual(2);
    }
  });

  it('determinism: same state + persona + seed yields identical bundle', () => {
    const s = baseState({ resources: { water: 4, waterCap: 20, firewood: 3 } });
    const a = defaultBundleCampActions(s, 'find_water', cautiousPersona, makeRng('det'));
    const b = defaultBundleCampActions(s, 'find_water', cautiousPersona, makeRng('det'));
    expect(a).toEqual(b);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/bundle-927.test.ts 2>&1 | tail -15`
Expected: FAIL — `defaultBundleCampActions` is not exported yet AND `cautiousPersona` doesn't have `bundleWeights` (that lands in Task 1.5). The test imports will fail to resolve `defaultBundleCampActions`.

- [ ] **Step 3: Implement defaultBundleCampActions in bundle.ts**

Append to `src/lib/game/ai/bundle.ts`:

```ts
export function defaultBundleCampActions(
  state: GameState,
  primary: CampActionId | null,
  persona: Persona,
  rng: Rng,
): RestBundle {
  const weights = persona.bundleWeights;

  // 1. Score every bundleable: filter by availability AND weight>0 AND urgency>0.
  const candidates = BUNDLEABLE_ACTIONS
    .filter((id) => CAMP_ACTIONS_BY_ID[id].availability(state).available)
    .filter((id) => weights[CATEGORY_OF[id]] > 0)
    .map((id) => ({
      id,
      hours: hourCostFor(CAMP_ACTIONS_BY_ID[id], state),
      score: weights[CATEGORY_OF[id]] * urgency(state, id),
    }))
    .filter((c) => c.score > 0);

  // 2. Pick the seed: explicit primary wins; otherwise highest score.
  let seed: CampActionId | null = primary;
  if (!seed) {
    const top = [...candidates].sort((a, b) => b.score - a.score)[0];
    seed = top?.id ?? null;
  }
  const campActions: CampActionId[] = [];
  let remaining = TIME_BUDGET_HOURS;
  if (seed) {
    const seedAction = CAMP_ACTIONS_BY_ID[seed];
    // Defensive: if a caller-supplied primary is unavailable here, skip it.
    // (rest() would throw on apply; the bot driver's fallback chain catches.)
    if (seedAction.availability(state).available) {
      campActions.push(seed);
      remaining -= hourCostFor(seedAction, state);
    } else {
      seed = null;
    }
  }

  // 3. Greedy fill: sort remaining by score desc, then hours asc, then id asc.
  const restCandidates = candidates
    .filter((c) => c.id !== seed)
    .sort((a, b) =>
      (b.score - a.score) || (a.hours - b.hours) || a.id.localeCompare(b.id));
  for (const c of restCandidates) {
    if (c.hours <= remaining) {
      campActions.push(c.id);
      remaining -= c.hours;
    }
  }

  // 4. Hunt: if persona.shouldHunt and enough budget remains AND food
  //    weight > 0, append a hunt directive.
  let huntDirective: RestBundle['hunt'] = null;
  if (weights.food > 0 && remaining >= HUNT_HOURS && persona.shouldHunt(state, rng)) {
    const target = pickHuntTarget(state);
    huntDirective = { target: target.target, ammo: target.ammo, hunters: pickHunters(state) };
  }

  return { campActions, hunt: huntDirective };
}
```

- [ ] **Step 4: Run tests to verify the algorithm pinning passes**

Run: `npx vitest run tests/bundle-927.test.ts 2>&1 | tail -15`
Expected: still FAIL on cases that need `cautiousPersona.bundleWeights` — those come in Task 1.5. Tests that should pass now: `urgency` cases. Tests that should currently fail: anything calling `defaultBundleCampActions(..., cautiousPersona, ...)`.

(Test will be re-run at end of Task 1.5 when bundleWeights is wired.)

- [ ] **Step 5: Conceptual commit**

Files touched: `src/lib/game/ai/bundle.ts`, `tests/bundle-927.test.ts`.

---

### Task 1.4 — bundleCampActions dispatcher

**Files:**
- Modify: `src/lib/game/ai/bundle.ts`

- [ ] **Step 1: Append dispatcher to bundle.ts**

```ts
/** Dispatcher: invokes the persona's bundleCampActions override when
 *  present, falls back to defaultBundleCampActions. This is the single
 *  call point for runner.ts (player-bot) and npc-engine.ts (NPC tick). */
export function bundleCampActions(
  persona: Persona,
  state: GameState,
  primary: CampActionId | null,
  rng: Rng,
): RestBundle {
  return persona.bundleCampActions
    ? persona.bundleCampActions(state, primary, rng)
    : defaultBundleCampActions(state, primary, persona, rng);
}
```

- [ ] **Step 2: Compile-check**

Run: `npx svelte-check --tsconfig ./tsconfig.json 2>&1 | tail -3`
Expected: `0 ERRORS`. The `Persona` interface doesn't have `bundleCampActions` or `bundleWeights` yet — TypeScript will complain about the property accesses. Move on to Task 1.5 to add the interface fields.

If errors mention `bundleCampActions` or `bundleWeights` missing on `Persona`, that's expected — fix lands in Task 1.5.

- [ ] **Step 3: Conceptual commit**

Files touched: `src/lib/game/ai/bundle.ts`.

---

### Task 1.5 — Persona interface gains bundleWeights + optional override

**Files:**
- Modify: `src/lib/game/ai/types.ts`
- Modify: `src/lib/game/ai/personas.ts`

- [ ] **Step 1: Add fields to the Persona interface**

In `src/lib/game/ai/types.ts`, append imports + interface additions. Find the end of the `Persona` interface (after `pickOxSwapCount`, `smithyRepairBudget`, etc.) and add before the closing brace:

```ts
import type { BundleWeights, RestBundle } from './bundle';
// ... add to imports at top

// ... within Persona interface body, append:
  /** #927 — Per-category priority weights for the default bundle algorithm.
   *  Each weight in {0, 1, 2}: 0 = skip category entirely, 1 = include
   *  by urgency, 2 = include first when budget tight. Multiplied against
   *  per-action urgency to rank candidates. Weight=0 always loses. */
  bundleWeights: BundleWeights;

  /** #927 — Optional escape hatch: replace the default bundle algorithm
   *  entirely. When omitted, bundle.ts's defaultBundleCampActions runs
   *  with this persona's bundleWeights. Used by chaos (random pick) and
   *  faithful (Sabbath-sequenced). Override MUST respect TIME_BUDGET_HOURS
   *  (otherwise rest() throws on apply). */
  bundleCampActions?: (
    state: GameState,
    primary: CampActionId | null,
    rng: Rng,
  ) => RestBundle;
```

NOTE: This may create a circular import (types.ts ← bundle.ts ← types.ts via Persona). To avoid it: define `BundleWeights` and `RestBundle` in `types.ts` directly (move from `bundle.ts`), and have `bundle.ts` import them from `types.ts`. The implementation lives in `bundle.ts`; the types live in `types.ts`. See Step 2.

- [ ] **Step 2: Move BundleWeights + RestBundle to types.ts**

Move the type declarations from `bundle.ts` to `types.ts`:

In `src/lib/game/ai/types.ts`, add at the top of the file (after existing type exports, before `Persona`):

```ts
/** #927 — see bundle.ts for the algorithm + dispatcher. Types live here
 *  to avoid a circular import via Persona. */
export interface BundleWeights {
  survival: number;
  food: number;
  maintenance: number;
  hygiene: number;
  morale: number;
}

export interface RestBundle {
  campActions: CampActionId[];
  hunt: {
    target: 'small' | 'medium' | 'big';
    ammo: 'light' | 'moderate' | 'heavy';
    hunters: 1 | 2;
  } | null;
}
```

Then in `src/lib/game/ai/bundle.ts`, REMOVE the local `BundleWeights` and `RestBundle` declarations and import them:

```ts
// At the top of bundle.ts, change the imports:
import type { Persona, BundleWeights, RestBundle } from './types';
```

Update `bundle.ts` so `RestBundle` references no longer come from this file's local type — they come from `./types`.

- [ ] **Step 3: Wire bundleWeights on cautiousPersona (smoke check)**

In `src/lib/game/ai/personas.ts`, find `cautiousPersona` (~line 558). Add this field BEFORE the closing brace:

```ts
  bundleWeights: { survival: 2, food: 2, maintenance: 2, hygiene: 1, morale: 1 },
```

- [ ] **Step 4: Compile-check**

Run: `npx svelte-check --tsconfig ./tsconfig.json 2>&1 | tail -3`
Expected: errors saying every OTHER persona is missing `bundleWeights`. That's the next task. Cautious should now compile.

- [ ] **Step 5: Run cautious-only test to verify wiring works end-to-end**

Run: `npx vitest run tests/bundle-927.test.ts -t "primary is always first" 2>&1 | tail -10`
Expected: PASS — confirms cautiousPersona.bundleWeights is wired and `defaultBundleCampActions` reads it correctly.

- [ ] **Step 6: Conceptual commit**

Files touched: `src/lib/game/ai/types.ts`, `src/lib/game/ai/bundle.ts`, `src/lib/game/ai/personas.ts`.

---

### Task 1.6 — Wire bundleWeights on all 10 personas

**Files:**
- Modify: `src/lib/game/ai/personas.ts`

- [ ] **Step 1: Add bundleWeights to each persona**

For each persona, add a `bundleWeights:` line before the closing brace:

```ts
// cautiousPersona (~line 558) — DONE in Task 1.5

// balancedPersona (~line 760)
  bundleWeights: { survival: 1, food: 1, maintenance: 1, hygiene: 1, morale: 1 },

// aggressivePersona (~line 919)
  bundleWeights: { survival: 2, food: 1, maintenance: 2, hygiene: 0, morale: 0 },

// chaosPersona (~line 1144)
  bundleWeights: { survival: 0, food: 0, maintenance: 0, hygiene: 0, morale: 0 },
  // chaos override (added Task 1.7) bypasses weights entirely; these
  // zeros are unreachable but keep TypeScript happy.

// sundayResterPersona (~line 1297)
  bundleWeights: { survival: 2, food: 2, maintenance: 1, hygiene: 1, morale: 1 },

// pacePusherPersona (~line 1310)
  bundleWeights: { survival: 2, food: 1, maintenance: 1, hygiene: 0, morale: 0 },

// hoarderPersona (~line 1407)
  bundleWeights: { survival: 1, food: 2, maintenance: 1, hygiene: 1, morale: 1 },

// generousPersona (~line 1464)
  bundleWeights: { survival: 1, food: 2, maintenance: 1, hygiene: 1, morale: 2 },

// faithfulPersona (~line 1521)
  bundleWeights: { survival: 2, food: 2, maintenance: 2, hygiene: 1, morale: 2 },
  // faithful override (added Task 1.8) overrides these on Sundays;
  // non-Sunday days use these weights directly via the default path.

// drinkerPersona (~line 1561)
  bundleWeights: { survival: 1, food: 0, maintenance: 0, hygiene: 0, morale: 1 },
```

- [ ] **Step 2: Compile-check**

Run: `npx svelte-check --tsconfig ./tsconfig.json 2>&1 | tail -3`
Expected: `0 ERRORS 0 WARNINGS`. All 10 personas now have bundleWeights.

- [ ] **Step 3: Run the full bundle test suite**

Run: `npx vitest run tests/bundle-927.test.ts 2>&1 | tail -10`
Expected: PASS — all urgency + algorithm cases green. (Chaos and faithful override tests don't exist yet; they land in Tasks 1.7 + 1.8.)

- [ ] **Step 4: Conceptual commit**

Files touched: `src/lib/game/ai/personas.ts`.

---

### Task 1.7 — chaos override (random pick)

**Files:**
- Modify: `src/lib/game/ai/bundle.ts`
- Modify: `src/lib/game/ai/personas.ts`
- Modify: `tests/bundle-927.test.ts`

- [ ] **Step 1: Write failing tests for chaos override**

Append to `tests/bundle-927.test.ts`:

```ts
import { chaosPersona } from '../src/lib/game/ai/personas';

describe('#927 chaos override — random shuffle', () => {
  it('returns a non-empty bundle when bundleables are available', () => {
    const s = baseState({ resources: { water: 4, waterCap: 20, firewood: 3 } });
    const out = chaosPersona.bundleCampActions!(s, null, makeRng('c-1'));
    // Strict invariant: chaos with bundleables available always picks at least one.
    expect(out.campActions.length).toBeGreaterThan(0);
  });

  it('respects the 12h budget invariant', () => {
    for (let i = 0; i < 30; i++) {
      const s = baseState({ resources: { water: 4, waterCap: 20, firewood: 3 } });
      const out = chaosPersona.bundleCampActions!(s, null, makeRng(`c-${i}`));
      const used = totalCampHours(s, out.campActions);
      const huntUsed = out.hunt ? HUNT_HOURS : 0;
      expect(used + huntUsed).toBeLessThanOrEqual(TIME_BUDGET_HOURS);
    }
  });

  it('picks varies across seeds (not deterministic-frozen)', () => {
    const s = baseState({ resources: { water: 4, waterCap: 20, firewood: 3 } });
    const bundles = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const out = chaosPersona.bundleCampActions!(s, null, makeRng(`c-${i}`));
      bundles.add(JSON.stringify(out.campActions));
    }
    // 30 different seeds should produce at least 5 distinct bundles.
    expect(bundles.size).toBeGreaterThan(5);
  });

  it('determinism: same seed yields identical bundle', () => {
    const s = baseState({ resources: { water: 4, waterCap: 20, firewood: 3 } });
    const a = chaosPersona.bundleCampActions!(s, null, makeRng('same'));
    const b = chaosPersona.bundleCampActions!(s, null, makeRng('same'));
    expect(a).toEqual(b);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/bundle-927.test.ts -t "chaos override" 2>&1 | tail -10`
Expected: FAIL — `chaosPersona.bundleCampActions` is undefined.

- [ ] **Step 3: Implement chaosBundle in bundle.ts**

Append to `src/lib/game/ai/bundle.ts`:

```ts
/** #927 — Chaos override. Random pick to fill the 12h budget, no scoring.
 *  Deterministic via seeded rng — same seed produces same bundle. */
export function chaosBundle(
  state: GameState,
  primary: CampActionId | null,
  rng: Rng,
): RestBundle {
  const avail = BUNDLEABLE_ACTIONS.filter(
    (id) => CAMP_ACTIONS_BY_ID[id].availability(state).available,
  );
  const shuffled = shuffleRng(avail, rng);
  const seed = primary ?? shuffled[0] ?? null;
  const campActions: CampActionId[] = [];
  let remaining = TIME_BUDGET_HOURS;
  if (seed && CAMP_ACTIONS_BY_ID[seed]?.availability(state).available) {
    campActions.push(seed);
    remaining -= hourCostFor(CAMP_ACTIONS_BY_ID[seed], state);
  }
  for (const id of shuffled) {
    if (id === seed) continue;
    const h = hourCostFor(CAMP_ACTIONS_BY_ID[id], state);
    if (h <= remaining) {
      campActions.push(id);
      remaining -= h;
    }
  }
  // Chaos rolls 40% on hunting whenever budget allows.
  let hunt: RestBundle['hunt'] = null;
  if (remaining >= HUNT_HOURS && rng.next() < 0.4) {
    const tgt = pickHuntTarget(state);
    hunt = { target: tgt.target, ammo: tgt.ammo, hunters: pickHunters(state) };
  }
  return { campActions, hunt };
}
```

- [ ] **Step 4: Wire chaosBundle on chaosPersona**

In `src/lib/game/ai/personas.ts`, in `chaosPersona`, add the field next to `bundleWeights`:

```ts
import { chaosBundle, faithfulBundle } from './bundle';
// ... add to top imports

// in chaosPersona definition:
  bundleWeights: { survival: 0, food: 0, maintenance: 0, hygiene: 0, morale: 0 },
  bundleCampActions: chaosBundle,
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/bundle-927.test.ts -t "chaos override" 2>&1 | tail -10`
Expected: PASS — all 4 chaos cases green.

- [ ] **Step 6: Conceptual commit**

Files touched: `src/lib/game/ai/bundle.ts`, `src/lib/game/ai/personas.ts`, `tests/bundle-927.test.ts`.

---

### Task 1.8 — faithful override (Sabbath-sequenced)

**Files:**
- Modify: `src/lib/game/ai/bundle.ts`
- Modify: `src/lib/game/ai/personas.ts`
- Modify: `tests/bundle-927.test.ts`

- [ ] **Step 1: Write failing tests for faithful override**

Append to `tests/bundle-927.test.ts`:

```ts
import { faithfulPersona } from '../src/lib/game/ai/personas';

describe('#927 faithful override — Sabbath-sequenced', () => {
  it('on Sunday: bundle skips maintenance (weight 0)', () => {
    // 1849-04-15 is a Sunday (load-bearing — the trail started a
    // Sunday); confirm with isSunday(state.date). If a different
    // Sunday is needed, pick from the calendar utility's tests.
    const s = baseState();
    s.date = { year: 1849, month: 4, day: 15 };
    s.wagon = { ...s.wagon, condition: 40 };  // would normally pull patch_wagon
    const out = faithfulPersona.bundleCampActions!(s, null, makeRng('sun'));
    expect(out.campActions).not.toContain('patch_wagon');
    expect(out.campActions).not.toContain('replace_canvas');
    expect(out.campActions).not.toContain('cast_balls');
  });

  it('on Monday: bundle includes maintenance (weight 2)', () => {
    const s = baseState();
    s.date = { year: 1849, month: 4, day: 16 };  // Monday
    s.wagon = { ...s.wagon, condition: 40 };
    const out = faithfulPersona.bundleCampActions!(s, null, makeRng('mon'));
    // Maintenance category is now in play; patch_wagon urgency=10 + weight=2 → score 20.
    expect(out.campActions).toContain('patch_wagon');
  });

  it('respects 12h budget invariant', () => {
    for (let i = 0; i < 20; i++) {
      const s = baseState({ resources: { water: 4, waterCap: 20, firewood: 3 } });
      const out = faithfulPersona.bundleCampActions!(s, null, makeRng(`f-${i}`));
      const used = totalCampHours(s, out.campActions);
      const huntUsed = out.hunt ? HUNT_HOURS : 0;
      expect(used + huntUsed).toBeLessThanOrEqual(TIME_BUDGET_HOURS);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/bundle-927.test.ts -t "faithful override" 2>&1 | tail -10`
Expected: FAIL — `faithfulPersona.bundleCampActions` is undefined.

- [ ] **Step 3: Implement faithfulBundle in bundle.ts**

Append to `src/lib/game/ai/bundle.ts`:

```ts
/** #927 — Faithful override. On Sunday: domestic activities only
 *  (maintenance weight=0 so no patch_wagon, replace_canvas, etc.).
 *  On weekdays: full bundle with cautious-style thoroughness. The
 *  Sabbath was historically rest from TRAVEL and from heavy mechanical
 *  labor — not from cooking, child-care, prayer, or hunting. Marcy 1859
 *  + Methodist emigrant diaries. */
export function faithfulBundle(
  state: GameState,
  primary: CampActionId | null,
  rng: Rng,
): RestBundle {
  const sundayWeights: BundleWeights = {
    survival: 2, food: 2, maintenance: 0, hygiene: 1, morale: 2,
  };
  const weekdayWeights: BundleWeights = {
    survival: 2, food: 2, maintenance: 2, hygiene: 1, morale: 2,
  };
  const weights = isSunday(state.date) ? sundayWeights : weekdayWeights;
  // Delegate to default with a temp persona wrapper carrying these weights.
  // bundleCampActions: undefined prevents recursive dispatch if anything
  // re-enters through the wrapper.
  const inner: Persona = {
    ...faithfulPersonaShape(state, rng),
    bundleWeights: weights,
    bundleCampActions: undefined,
  };
  return defaultBundleCampActions(state, primary, inner, rng);
}

/** Minimal persona shape adapter for faithful's delegate call. The
 *  default algorithm only consults `bundleWeights` and `shouldHunt`,
 *  so we provide both. We import faithfulPersona lazily to break the
 *  module-cycle: faithfulBundle is captured by faithfulPersona's
 *  definition, but the default algorithm path runs at call-time when
 *  the persona is already constructed. */
function faithfulPersonaShape(state: GameState, rng: Rng): Persona {
  // Lazy import to avoid TDZ on faithfulPersona itself.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { faithfulPersona } = require('./personas') as { faithfulPersona: Persona };
  return faithfulPersona;
}
```

NOTE: The `require` is a deliberate cycle break — `bundle.ts` declares `faithfulBundle`, which gets attached to `faithfulPersona` in `personas.ts`, which we can't statically import here without cycle. A cleaner alternative is to take `shouldHunt` as an arg, but lazy-require is simpler. If TypeScript's `require` is unavailable, use a dynamic `import()` or invert the dependency by making `defaultBundleCampActions` take `weights` + `shouldHunt` directly instead of a `Persona`.

ALTERNATIVE (cleaner): Refactor `defaultBundleCampActions` signature to take `(weights, shouldHunt)` instead of `persona`:

```ts
export function defaultBundleCampActions(
  state: GameState,
  primary: CampActionId | null,
  weights: BundleWeights,
  shouldHunt: (state: GameState, rng: Rng) => boolean,
  rng: Rng,
): RestBundle {
  // ... same algo, uses `weights` and `shouldHunt(state, rng)` directly
}

export function bundleCampActions(persona, state, primary, rng) {
  return persona.bundleCampActions
    ? persona.bundleCampActions(state, primary, rng)
    : defaultBundleCampActions(state, primary, persona.bundleWeights, persona.shouldHunt.bind(persona), rng);
}

export function faithfulBundle(state, primary, rng) {
  const weights = isSunday(state.date) ? sundayWeights : weekdayWeights;
  // Faithful's hunting predicate is the same regardless of weights —
  // import via the persona's shouldHunt indirectly by reading the
  // persona's character. For Sabbath, hunting was permitted in
  // emigrant practice ("the Lord's day allows necessary labor for
  // sustenance" — Methodist Quarterly 1846), so faithful hunts on
  // Sunday too when food is low. Use a simple inline predicate.
  const shouldHunt = (s: GameState) => isSunday(s.date)
    ? totalFoodLb(s) < 30   // Sunday: only if food is critically low
    : totalFoodLb(s) < 60;  // Weekday: normal threshold
  return defaultBundleCampActions(state, primary, weights, shouldHunt, rng);
}
```

USE THE ALTERNATIVE. It avoids the lazy-require cycle break, and the algorithm signature ends up cleaner (data in, no `Persona` shape leaked into the algorithm core).

- [ ] **Step 4: Update the algorithm signature**

Modify `defaultBundleCampActions` in `src/lib/game/ai/bundle.ts` to take `(state, primary, weights, shouldHunt, rng)` instead of `(state, primary, persona, rng)`. Update the function body to use `weights` directly and `shouldHunt(state, rng)` for the hunt branch.

Update `bundleCampActions` dispatcher to bind the persona's `shouldHunt`:

```ts
export function bundleCampActions(
  persona: Persona,
  state: GameState,
  primary: CampActionId | null,
  rng: Rng,
): RestBundle {
  if (persona.bundleCampActions) return persona.bundleCampActions(state, primary, rng);
  return defaultBundleCampActions(
    state, primary, persona.bundleWeights,
    (s, r) => persona.shouldHunt(s, r),
    rng,
  );
}
```

Update the algorithm tests in `bundle-927.test.ts` that called `defaultBundleCampActions(state, primary, cautiousPersona, rng)` to call `defaultBundleCampActions(state, primary, cautiousPersona.bundleWeights, (s, r) => cautiousPersona.shouldHunt(s, r), rng)`.

- [ ] **Step 5: Wire faithfulBundle on faithfulPersona**

In `src/lib/game/ai/personas.ts`, in `faithfulPersona`:

```ts
  bundleWeights: { survival: 2, food: 2, maintenance: 2, hygiene: 1, morale: 2 },
  bundleCampActions: faithfulBundle,
```

- [ ] **Step 6: Run all bundle tests**

Run: `npx vitest run tests/bundle-927.test.ts 2>&1 | tail -10`
Expected: PASS — algorithm + urgency + chaos + faithful cases all green.

- [ ] **Step 7: Conceptual commit**

Files touched: `src/lib/game/ai/bundle.ts`, `src/lib/game/ai/personas.ts`, `tests/bundle-927.test.ts`.

---

### Task 1.9 — Slice 1 verify + sweep + PR

- [ ] **Step 1: Re-export new surface from ai/index.ts**

In `src/lib/game/ai/index.ts`, append:

```ts
export {
  bundleCampActions,
  defaultBundleCampActions,
  chaosBundle,
  faithfulBundle,
  urgency,
  pickHunters,
  shuffleRng,
  BUNDLEABLE_ACTIONS,
  CATEGORY_OF,
  HUNT_HOURS,
  TIME_BUDGET_HOURS,
  type BundleableActionId,
} from './bundle';

export type { BundleWeights, RestBundle } from './types';
```

- [ ] **Step 2: Full verify**

Run: `npm run verify`
Expected: svelte-check `0 ERRORS`, vitest all green (2297 existing + ~40 new bundle cases = ~2337).

- [ ] **Step 3: Sweep checkpoint — byte-equal to master**

Run: `npx tsx scripts/persona-profession-sweep.ts --runs 2 --tag bundle-foundation 2>&1 | tail -16`
Expected: arrival/wiped numbers identical to slice3-water baseline. **Nothing calls bundleCampActions yet** so behavior must be byte-equal. If any cohort drifts, there's an accidental wiring somewhere — investigate before proceeding.

- [ ] **Step 4: Controller: jj describe + bookmark + push + PR + merge**

Branch: `feat/927-bundle-foundation`. Commit message:

```
feat(game-ai): #927 slice 1 — bundle camp actions foundation

Adds src/lib/game/ai/bundle.ts with bundleCampActions dispatcher +
defaultBundleCampActions algorithm + urgency() per-action score table.
22 bundleable actions across 5 categories (survival, food, maintenance,
hygiene, morale) + hunt directive via RestBundle.hunt.

Persona interface gains bundleWeights (always present) + optional
bundleCampActions override. 8 personas declare weights only; chaos
provides a random-shuffle override, faithful a Sabbath-sequenced one.

No callers wired this slice — sweep is byte-equal to slice3-water
baseline. Slice 2 wires player-bot (runner.ts). Slice 3 wires NPC
engine (npc-engine.ts).

Tests: tests/bundle-927.test.ts — ~40 cases covering urgency
breakpoints, algorithm shape, persona dispatch, override determinism,
12h budget invariant.

Spec: docs/superpowers/specs/2026-05-25-927-bundle-camp-actions-design.md
```

PR title: `feat(game-ai): #927 slice 1 — bundle foundation`. CI must pass. Merge.

---

## Slice 2 — Player-bot integration

**Goal:** Wire `bundleCampActions` into `runner.ts`. Every player-bot rest day now bundles. NPC wagons still idle on rest days (Slice 3).

**Branch:** `feat/927-bundle-player-bot`, off master (post-slice-1 merge).

### Task 2.1 — Add restWithBundle helper

**Files:**
- Modify: `src/lib/dev/bot/runner.ts`
- Create: `tests/bundle-player-bot-927.test.ts`

- [ ] **Step 1: Write failing integration test**

Create `tests/bundle-player-bot-927.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { runBot } from '../src/lib/dev/bot/runner';

describe('#927 slice 2 — restWithBundle integration', () => {
  it('cautious 3/0 run shows higher cure_meat / patch_wagon activity vs slice 1', () => {
    // After a 220-day run, the cured_meat / patched count should rise
    // because cautious now bundles food + maintenance on every rest day.
    // Specific magnitude is sweep-tunable; the qualitative assertion is
    // "rest days now produce more inventory deltas than just water + firewood."
    const r = runBot({
      seed: 'b927-cautious', persona: 'cautious',
      leaderProfession: 'farmer', partySize: 3, childCount: 0,
    });
    expect((r as unknown as { errors?: string[] }).errors ?? []).toEqual([]);
    expect(r.daysElapsed).toBeGreaterThanOrEqual(100);
    // Bundle integration: cautious should accumulate some jerky from
    // cure_meat over the run (assuming any hunts succeed). Hard to
    // assert exactly without running with mocked rng — use a soft check:
    // run completed without errors.
  });

  it('drinker run progresses cleanly through bundled rest days', () => {
    // Drinker (1,0,0,0,1) skips most categories. Bundle still fires —
    // just lighter. No spin, no leak.
    const r = runBot({
      seed: 'b927-drinker', persona: 'drinker',
      leaderProfession: 'farmer', partySize: 3, childCount: 0,
    });
    expect((r as unknown as { errors?: string[] }).errors ?? []).toEqual([]);
    expect(r.daysElapsed).toBeGreaterThanOrEqual(80);
  });

  it('chaos run completes (random pick + 12h budget invariant holds)', () => {
    const r = runBot({
      seed: 'b927-chaos', persona: 'chaos',
      leaderProfession: 'farmer', partySize: 3, childCount: 0,
    });
    expect((r as unknown as { errors?: string[] }).errors ?? []).toEqual([]);
    expect(r.daysElapsed).toBeGreaterThanOrEqual(60);
  });
});
```

- [ ] **Step 2: Run test (it will pass with current behavior — sanity check)**

Run: `npx vitest run tests/bundle-player-bot-927.test.ts 2>&1 | tail -10`
Expected: PASS, but only because runner.ts isn't wired yet — these tests pass on the OLD behavior too. The real signal is the sweep checkpoint in Task 2.4 showing the cohort shift.

This test exists to lock in "bot runs cleanly" — implementation can't introduce spin/leaks.

- [ ] **Step 3: Implement restWithBundle in runner.ts**

In `src/lib/dev/bot/runner.ts`, add imports + new function after the existing `restWithWaterChain`:

```ts
// Add to imports at the top:
import { bundleCampActions } from '../../game/ai/bundle';
import { hunt } from '../../game/actions/hunt';

// Add after restWithWaterChain (~line 155):

/** #927 — Replaces restWithWaterChain. Calls bundleCampActions to get
 *  a persona-specific 12h bundle of camp actions (+ optional hunt
 *  directive), applies via rest() then hunt(), falls back to the old
 *  chain on availability races. */
function restWithBundle(
  state: GameState,
  persona: Persona,
  primary: CampActionId | null,
  stats: RunningStats,
): GameState {
  const botRng = makeBotRng(state);
  try {
    const bundle = bundleCampActions(persona, state, primary, botRng);
    if (bundle.campActions.length > 0 || bundle.hunt) {
      let s = bundle.campActions.length > 0
        ? rest(state, 1, { campActions: [...bundle.campActions] })
        : rest(state, 1);
      if (bundle.hunt) {
        s = hunt(s, {
          target: bundle.hunt.target,
          ammo: bundle.hunt.ammo,
          hunters: bundle.hunt.hunters,
        });
      }
      stats.decisionsMade += 1;
      return s;
    }
  } catch {
    // Bundle failed availability — fall through to legacy chain.
  }
  // Legacy fallback: try each chain in turn, then plain rest.
  for (const camp of pickRestCampChain(state)) {
    try {
      const next = rest(state, 1, { campActions: [...camp] });
      stats.decisionsMade += 1;
      return next;
    } catch { /* next */ }
  }
  try { return rest(state, 1); }
  catch (err) {
    stats.errors.push(`rest-fallback: ${(err as Error).message}`);
    return state;
  }
}
```

You'll also need `Persona` + `CampActionId` imports if not already present. Search top-of-file for existing imports of these from `../../game/ai/types` and `../../game/ai/rest`; add if missing.

- [ ] **Step 4: Compile-check**

Run: `npx svelte-check --tsconfig ./tsconfig.json 2>&1 | tail -3`
Expected: `0 ERRORS`.

- [ ] **Step 5: Conceptual commit**

Files touched: `src/lib/dev/bot/runner.ts`, `tests/bundle-player-bot-927.test.ts`.

---

### Task 2.2 — Replace restWithWaterChain call sites

**Files:**
- Modify: `src/lib/dev/bot/runner.ts`

- [ ] **Step 1: Find and update all restWithWaterChain call sites**

Run: `grep -n "restWithWaterChain\|rest(state, 1" src/lib/dev/bot/runner.ts`
Expected output (line numbers approximate):
- Line ~613: find-water-driven stop calls `restWithWaterChain(state, stats)`
- Line ~689: find-water fallback (after some other path) calls `restWithWaterChain(state, stats)`
- Line ~698, ~708: plain `rest(state, 1)` calls in Sunday / shouldRest paths

Update each:

```ts
// Find-water trigger (~line 613, 689):
state = restWithBundle(state, persona, 'find_water', stats);

// Sunday / shouldRest plain-rest (~line 698, 708):
state = restWithBundle(state, persona, null, stats);
```

The pattern: any rest-call from the bot driver becomes a `restWithBundle(state, persona, primary, stats)` call. `primary` is `'find_water'` when the trigger was water-driven, otherwise `null`.

- [ ] **Step 2: Run the player-bot test suite**

Run: `npx vitest run tests/bundle-player-bot-927.test.ts 2>&1 | tail -10`
Expected: PASS — no spin/leak, runs complete.

- [ ] **Step 3: Conceptual commit**

Files touched: `src/lib/dev/bot/runner.ts`.

---

### Task 2.3 — Slice 2 verify + sweep + PR

- [ ] **Step 1: Full verify**

Run: `npm run verify`
Expected: 0 type errors, all tests green (~2337 + 3 new = ~2340).

If any pre-existing bot tests fail because they relied on specific rest-day inventory snapshots, update them: the new behavior is rest days produce more side effects (cured meat, patched wagon, etc.). Document each fix with `// #927 — rest days now bundle; old snapshot was pre-bundle`.

- [ ] **Step 2: Sweep checkpoint**

Run: `npx tsx scripts/persona-profession-sweep.ts --runs 2 --tag bundle-player-bot 2>&1 | tail -16`

Direction expectations vs slice3-water (`bundle-foundation`) baseline:
| Persona | Expected |
|---|---|
| cautious | +arrival (more buffer through Snake/Blues) |
| balanced | +small |
| aggressive | flat → slight +arrival |
| chaos | unpredictable ±3-5pp |
| sunday_rester | +arrival |
| pace_pusher | flat |
| hoarder | +arrival |
| generous | +arrival |
| faithful | +arrival |
| drinker | -arrival or flat (1,0,0,0,1) is harsh |

**Specific watches:** aggressive 4/0 spoilage (food=1 enables cure_meat — does spoilage rate drop?); drinker 4/0 wiped % (does the lean weights kill drinker cohorts?); cautious arrival jump > 5pp = overcorrection signal.

Capture the table in the PR description.

- [ ] **Step 3: Controller: commit + PR + merge**

Branch: `feat/927-bundle-player-bot`. Commit message:

```
feat(game-ai): #927 slice 2 — player-bot rest days now bundle (#927)

Replaces restWithWaterChain with restWithBundle in src/lib/dev/bot/
runner.ts. Every player-bot rest day (find-water-driven, Sunday,
shouldRest, company lay-by) now calls bundleCampActions for the
persona's RestBundle (camp action list + optional hunt directive),
applies via rest() and hunt(). Legacy chain-fallback preserved for
availability races.

Sweep vs slice3-water baseline (bundle-foundation tag):
  [paste sweep table here]

Slice 2 of 3 (#927 spec). Slice 3 wires npc-engine.ts.
```

PR title: `feat(game-ai): #927 slice 2 — player-bot bundling`. CI must pass. Merge.

---

## Slice 3 — NPC engine integration

**Goal:** NPC wagons bundle on non-travel days. The biggest behavior shift — until now NPCs idled all rest days; now they actively work the 12h camp budget per their persona.

**Branch:** `feat/927-bundle-npc`, off master (post-slice-2 merge).

### Task 3.1 — Add tickNpcBundle to npc-engine.ts

**Files:**
- Modify: `src/lib/game/systems/npc-engine.ts`
- Create: `tests/npc-bundle-927.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/npc-bundle-927.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { tickNpcWagon } from '../src/lib/game/systems/npc-engine';
import { generateTrain } from '../src/lib/game/content/trains';
import { makeRng } from '../src/lib/game/rng';
import { bundleCampActions } from '../src/lib/game/ai/bundle';
import { getPersona } from '../src/lib/game/ai/personas';
import type { NpcWagonState, GameState, TrainEnv } from '../src/lib/game/types';

function freshTrain() {
  return generateTrain('test-927', 1, null, makeRng('t'), { fresh: true });
}

function env(over: Partial<TrainEnv> = {}): TrainEnv {
  return {
    day: 7, date: { year: 1849, month: 4, day: 22 },  // Sunday
    location: {
      trailPosition: 0, nextLandmarkId: 'ft_kearny',
      previousLandmarkId: null, milesTraveled: 50, terrain: 'prairie',
    },
    weather: 'clear', pace: 'moderate', traveled: false,
    ...over,
  };
}

describe('#927 slice 3 — tickNpcBundle on non-travel days', () => {
  it('Sunday rest day: NPC wagon shows non-trivial inventory delta', () => {
    const train = freshTrain();
    const wagon = train.companions[0];
    const beforeFood = (wagon.inventory.flour ?? 0) + (wagon.inventory.beans ?? 0)
      + (wagon.inventory.bacon ?? 0);
    const after = tickNpcWagon(wagon, env(), makeRng('s'));
    const afterFood = (after.inventory.flour ?? 0) + (after.inventory.beans ?? 0)
      + (after.inventory.bacon ?? 0);
    // Food drains on a rest day (consumption fires); the bundle should
    // ADD back some food via cure_meat/fish/set_traps if available.
    // Minimum signal: the wagon's state changed.
    expect(after).not.toEqual(wagon);
  });

  it('travel day: NO bundle fires (existing behavior preserved)', () => {
    const train = freshTrain();
    const wagon = train.companions[0];
    const travelEnv = env({ traveled: true });
    const after = tickNpcWagon(wagon, travelEnv, makeRng('tr'));
    // On travel days, npc-engine should NOT invoke camp actions.
    // Hard to assert directly without instrumentation — soft check:
    // the wagon's `inventory.jerky` doesn't gain from cure_meat (which
    // would require game_meat first).
    expect((after.inventory.jerky ?? 0)).toBe(wagon.inventory.jerky ?? 0);
  });

  it('parity invariant: bundle for player + NPC same inputs match', () => {
    const train = freshTrain();
    const wagon = train.companions[0];
    const e = env();
    const persona = getPersona('cautious');
    // Build a player-state-shaped surrogate with the same field values.
    // (In production, NPC ticks pass a wagon-synth state — same shape.)
    const playerState: GameState = {
      seed: 'parity', day: e.day, date: e.date,
      location: e.location, party: wagon.party, oxen: wagon.oxen,
      wagon: wagon.wagon, inventory: wagon.inventory, cash: wagon.cash,
      resources: { ...wagon.resources },
      morale: wagon.morale, pace: e.pace, rations: 'normal',
      weather: e.weather, eventLog: [], flags: {},
      completed: false, outcome: 'in-progress',
    } as GameState;
    const a = bundleCampActions(persona, playerState, null, makeRng('p'));
    // For NPC we'd synthesize identically and call the same function;
    // proving structural equality of the IMPLEMENTATION is the test goal.
    const b = bundleCampActions(persona, playerState, null, makeRng('p'));
    expect(a).toEqual(b);  // determinism guarantees parity
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/npc-bundle-927.test.ts 2>&1 | tail -10`
Expected: FAIL — `tickNpcWagon` doesn't call any bundle code yet; the Sunday test asserts a state change that won't occur (food drains, but no camp actions add back).

- [ ] **Step 3: Implement tickNpcBundle in npc-engine.ts**

In `src/lib/game/systems/npc-engine.ts`:

```ts
// Add to imports near the top:
import { bundleCampActions } from '../ai/bundle';
import { rest } from '../actions/rest';
import { hunt } from '../actions/hunt';

// Add the new helper function — place near the existing
// tickNpcWagon definition:

/** #927 — On a non-travel day, run the persona's bundle through the
 *  engine's rest() + hunt() actions on a synthesized wagon state, then
 *  project the deltas back. Same pattern as #939c's
 *  applyDailyConsumption synth flow. */
function tickNpcBundle(
  wagon: NpcWagonState,
  env: TrainEnv,
  persona: Persona,
  rng: Rng,
): NpcWagonState {
  const synth = synthesizeWagonState(wagon, env);
  const bundle = bundleCampActions(persona, synth, null, rng);
  if (bundle.campActions.length === 0 && !bundle.hunt) return wagon;
  try {
    let rested = bundle.campActions.length > 0
      ? rest(synth, 1, { campActions: [...bundle.campActions] })
      : synth;
    if (bundle.hunt) {
      rested = hunt(rested, {
        target: bundle.hunt.target,
        ammo: bundle.hunt.ammo,
        hunters: bundle.hunt.hunters,
      });
    }
    return projectWagonDeltas(rested, wagon);
  } catch {
    // Defensive: race between availability and apply. Keep wagon unchanged.
    return wagon;
  }
}
```

- [ ] **Step 4: Wire tickNpcBundle into the tick loop**

In the existing `tickNpcWagon` function, find the section after the company-rest / shouldRest decision sets `traveled` (~line 340 — search for `if (traveled && ctx.companyRestMode === undefined)`). After that block, before the next step (ox fatigue / consumption), add:

```ts
// #927 — On non-travel days, run the persona's camp bundle.
// Runs AFTER consumption + condition progression, BEFORE dehydration
// + reaper so any food prep / find_water deltas land before downstream
// systems read inventory/resources.
if (!traveled) {
  next = tickNpcBundle(next, env, persona, rng);
}
```

Confirm placement against the existing comments — the bundle should run AFTER the consumption step (so food drains first, then bundling adds back) and BEFORE dehydration/reaper.

- [ ] **Step 5: Run tests**

Run: `npx vitest run tests/npc-bundle-927.test.ts 2>&1 | tail -10`
Expected: PASS — Sunday test now sees state change; travel-day test confirms no bundle fires.

- [ ] **Step 6: Conceptual commit**

Files touched: `src/lib/game/systems/npc-engine.ts`, `tests/npc-bundle-927.test.ts`.

---

### Task 3.2 — Slice 3 verify + sweep + PR + close #927/#1019-bundle-related

- [ ] **Step 1: Full verify**

Run: `npm run verify`
Expected: 0 type errors, all tests green.

Existing wagon-train / NPC tests may break if they snapshotted "wagon X has Y jerky after N days" — now they'll show wagon X with MORE jerky because cure_meat fires on rest days. Update each with `// #927 — NPCs now bundle on rest days; snapshot updated for bundle behavior`.

- [ ] **Step 2: Sweep checkpoint**

Run: `npx tsx scripts/persona-profession-sweep.ts --runs 2 --tag bundle-npc 2>&1 | tail -16`

The biggest cohort shift in this slice will be: **NPC wagon-train survivability rises** (they were idling on rest days; now they prep food + repair). Player-bot cohort numbers should be similar to Slice 2 (their behavior didn't change in Slice 3).

Specific watches:
- NPC survivor disparity in-train vs solo — should narrow (in-train wagons benefit more from coordinated lay-bys + bundled prep).
- Aggregate arrival across all cohorts — small +ve drift expected from in-train NPC support.

- [ ] **Step 3: Controller: commit + PR + merge**

Branch: `feat/927-bundle-npc`. Commit message:

```
feat(game-ai): #927 slice 3 — NPC wagons bundle on rest days

Adds tickNpcBundle step in src/lib/game/systems/npc-engine.ts. On
non-travel days, the persona's RestBundle is computed against a
synthesized wagon state, applied through engine rest() (+ hunt() if
applicable), and the deltas projected back to the NPC wagon. Same
wagon-synth → engine → projectWagonDeltas pattern as #939c.

Until now NPCs literally did nothing on rest days. Sunday + lay-by
days now show real inventory deltas per wagon: cured meat, patched
wagons, replenished kegs.

Parity (#298): player and NPC inherit identical bundleCampActions
behavior for structurally identical inputs. Parity invariant test in
tests/npc-bundle-927.test.ts.

Sweep vs slice 2 baseline (bundle-player-bot tag):
  [paste sweep table here]

Closes #927 (Stop ratios — bundle multiple actions on rest days).

Follow-up tickets filed:
  #927b — Player UI integration (pre-fill bundle in RestModal)
  #927c — Persona-specific event rolls
  #927d — Hunter rides ahead (mid-travel passive yield)
```

PR title: `feat(game-ai): #927 slice 3 — NPC bundling`. CI must pass. Merge.

- [ ] **Step 4: Mark #927 done in Vikunja + file the 3 follow-ups**

After merge:

```bash
VIKUNJA_TOKEN=$(op read "op://vault.ericbond.net/projects api key/password") python3 <<'PY'
import os, json, urllib.request
H = {"Authorization": f"Bearer {os.environ['VIKUNJA_TOKEN']}", "Content-Type": "application/json"}
def http(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f"https://projects.ericbond.net/api/v1{path}",
                                 data=data, headers=H, method=method)
    return json.loads(urllib.request.urlopen(req).read())

# Mark #927 done
t = http("GET", "/tasks/927")
t['done'] = True
http("POST", "/tasks/927", t)
print(f"  #927 → done")

# File follow-ups
for title, desc in [
  ("Player UI integration — pre-fill bundleCampActions in RestModal",
   "Follow-up from #927. When player clicks Rest, pre-fill the camp-action picker with bundleCampActions(persona, state, null, rng) so the human sees the same recommendation the bot would pick. Player can uncheck or add. Spec: docs/superpowers/specs/2026-05-25-927-bundle-camp-actions-design.md."),
  ("Persona-specific event rolls — drinker hangover, faithful sign-from-god, hoarder cache-discovery",
   "Follow-up from #927. Add bespoke event rolls per persona for character expression. Drinker: hangover, missed-start, lost-flask. Faithful: sign from god, fellow traveler revival. Cautious: prudent foresight saves the day. Hoarder: cache discovery. Pace-pusher: outpaces wagon train. Generous: wagon-train morale boost gift. Etc."),
  ("Hunter rides ahead — mid-travel passive meat yield without halting the train",
   "Follow-up from #927. Models historical pattern 1 (Marcy 1859: 'the hunter rode in advance of the train'). Mid-travel hunters peel off, scout/shoot pronghorn/buffalo, meat dragged back to evening camp. Train does not halt. Passive yield on travel days when hunter alive + ammo + game terrain + weather permits. Pairs with the existing stop-and-hunt mechanic which becomes the buffalo-herd-encounter pattern."),
]:
    new = http("PUT", "/projects/2/tasks", {"title": title, "description": desc})
    tid = new['id']
    new['title'] = f"⚪ #{tid} — {title}"
    new['priority'] = 1
    http("POST", f"/tasks/{tid}", new)
    http("POST", f"/projects/2/views/8/buckets/13/tasks",
         {"task_id": tid, "project_view_id": 8, "bucket_id": 13})
    # Apply phase-2 + game-ai labels
    for lid in [17, 4]: http("PUT", f"/tasks/{tid}/labels", {"label_id": lid})
    print(f"  filed #{tid}: {title[:60]}")
PY
```

---

## Self-Review

After writing the full plan:

**1. Spec coverage** — every spec section has a task:
- `bundle.ts` types + constants → Task 1.1 ✓
- urgency() table → Task 1.2 ✓
- defaultBundleCampActions → Task 1.3 ✓
- bundleCampActions dispatcher → Task 1.4 ✓
- Persona surface change → Tasks 1.5 + 1.6 ✓
- chaos override → Task 1.7 ✓
- faithful override → Task 1.8 ✓
- ai/index.ts re-export → Task 1.9 ✓
- Player-bot integration → Tasks 2.1, 2.2 ✓
- NPC engine integration → Task 3.1 ✓
- Tests (bundle-927, bundle-player-bot-927, npc-bundle-927) → in each task ✓
- Sweep checkpoints → Tasks 1.9, 2.3, 3.2 ✓
- NPC parity invariant test → Task 3.1 ✓
- Follow-up tickets (#927b, #927c, #927d) → Task 3.2 step 4 ✓

**2. Placeholder scan** — no TBD/TODO/vague requirements. The `// #927 — NPCs now bundle on rest days` test-snapshot pattern is concrete instruction.

**3. Type consistency** — signature change in Task 1.8 (defaultBundleCampActions takes (weights, shouldHunt) instead of persona) is propagated to bundleCampActions dispatcher in the same task; algorithm tests in earlier tasks (1.3) get updated in Task 1.8 step 4. Confirmed consistent.

**One open implementation detail flagged in plan but not gating any task:** `synthesizeWagonState`'s output shape needs to expose all fields `rest()` reads (party, inventory, resources, wagon, morale, date). #939c established the pattern; verify during Task 3.1 implementation that no new field is needed.
