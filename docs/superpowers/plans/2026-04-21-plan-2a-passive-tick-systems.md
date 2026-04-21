# Plan 2a: Passive Tick Systems + Travel — Hoosier Trail

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire every passive-ticking system into the day loop so a 30-day deterministic simulation evolves party health (conditions progress, morale shifts, members can die), oxen (health + fatigue), wagon (condition), water (daily drain + purification rules), fire (implicit buffer attempt each night), and trail position (miles/day based on pace × ox-health × terrain). No player actions yet — just state evolution on every `tickDay`.

**Architecture:** Each system is a pure function `(state: GameState, rng: Rng) => GameState`. `tickDay` composes them in a fixed order. A per-day RNG is constructed from `seed + ':' + day` so determinism is preserved and saves survive any serialization round-trip. No DB schema changes. No UI yet.

**Tech Stack:** Same as Plan 1 — SvelteKit, TypeScript, Vitest, Drizzle, better-sqlite3. All new work in `src/lib/game/`.

**Companion spec:** `docs/superpowers/specs/2026-04-20-hoosier-trail-design.md` (§4.2 tick sequence, §4.5 pace, §4.6 rations, §5.1 morale, §5.2 health, §5.3 conditions, §5.4 water, §5.7 wagon & oxen, §5.11 fire).

**Builds on:** `docs/superpowers/plans/2026-04-21-plan-1-foundation.md` (types, engine, RNG, consumption, saves).

---

## File Structure

### New files in this plan

| Path | Responsibility |
|---|---|
| `src/lib/game/content/conditions.ts` | Condition catalog: daily HP delta, morale impact, contagion flag, treatment tags |
| `src/lib/game/content/landmarks.ts` | Minimal landmark stub (Independence → Ft. Kearny) — full catalog in Plan 3 |
| `src/lib/game/systems/conditions.ts` | Daily progression of each active `Condition` on each `PartyMember` |
| `src/lib/game/systems/morale.ts` | Morale adjustment: decay triggers, recovery, healing-rate multiplier lookup |
| `src/lib/game/systems/oxen.ts` | Per-ox health + fatigue adjustment each day |
| `src/lib/game/systems/wagon.ts` | Wagon condition decay from daily stress |
| `src/lib/game/systems/travel.ts` | Miles covered today, trail position update, landmark-reached check |
| `src/lib/game/systems/water-purity.ts` | Boiling / coffee-purification rules; flags onto state |
| `src/lib/game/systems/fire.ts` | Per-night fire success roll (terrain × party size) |
| `tests/conditions.test.ts` | Condition catalog integrity + progression tests |
| `tests/morale.test.ts` | Morale delta + healing multiplier tests |
| `tests/oxen.test.ts` | Fatigue accrual + health drain + death |
| `tests/wagon.test.ts` | Condition decay + catastrophic threshold |
| `tests/travel.test.ts` | Pace math, terrain, landmark reach |
| `tests/water-purity.test.ts` | Boiling unlock (year-gated + Doctor-gated), coffee passive |
| `tests/fire.test.ts` | Terrain + size scaling, failure effects |
| `tests/engine-integration.test.ts` | 30-day deterministic simulation with all systems composing |

### Files modified

| Path | Change |
|---|---|
| `src/lib/game/types.ts` | Extend `GameState` with new fields (listed in Task 1) |
| `src/lib/game/engine.ts` | `tickDay` refactored to compose systems with per-day RNG |
| `tests/engine.test.ts` | Update existing tests to use the new composition; add new assertions |

### Boundaries
- System modules are pure functions. They accept `(state, rng)` and return a new `GameState`. No DB imports, no DOM, no filesystem.
- Content files (`content/*.ts`) are plain data — no functions except type-safe lookups (e.g., `getCondition(id)`).
- The `Rng` instance threaded through systems is a single instance per tick — re-using it preserves the call-sequence determinism the RNG depends on.
- Task 1 locks the composition order. Adding a new system later means inserting it in that order, not re-architecting.

---

## Conventions locked by this plan

### RNG threading (resolves Task #33)

- At the start of `tickDay`, construct a single per-day `Rng`:
  ```ts
  const rng = makeRng(`${state.seed}:${state.day}`);
  ```
- All systems receive this same `rng` instance. Systems that don't need randomness take no `rng` parameter.
- Player-initiated actions (Plan 2b) will use a separate seed suffix (e.g., `${seed}:hunt:${day}:${n}`).

**Why this over state-carried RNG:** zero state serialization concerns, replay works from any day by reconstructing, no hidden cursor, easier to reason about in tests.

### System composition order (locked in `tickDay`)

```
1. progressConditions(state, rng)       // apply daily HP deltas from each active condition
2. applyDailyConsumption(state)         // existing from Plan 1 — food + water
3. tickOxen(state, rng)                 // fatigue accrual, health drain if over-worked
4. tickWagon(state, rng)                // condition decay from travel stress
5. adjustMorale(state)                  // party-wide morale recomputation
6. applyTravel(state, rng)              // miles today, position update, landmark reach
7. attemptFire(state, rng)              // nightly fire roll (affects tomorrow's frostbite)
8. reapDead(state)                      // flip dead/deathCause/deathDay for anyone at 0 health
9. advanceDate(state)                   // existing from Plan 1 — calendar
```

Each function is pure; the composition is a pipe.

### `GameState` additions

Plan 2a extends `GameState`. New fields (added to `src/lib/game/types.ts` in Task 1):

| Field | Type | Purpose |
|---|---|---|
| `flags.hasBoilingKnowledge` | `boolean` | pre-1854 boiling is Doctor-gated; flips true when unlocked |
| `flags.hadFireLastNight` | `boolean` | gates frostbite damage |
| `wagon.condition` | existing, no change |  |
| *(oxen already have `health` + `fatigue` in Plan 1 types)* |  |  |

No changes to existing fields. Save-format version field (Task #32) is still deferred — Plan 2a only adds fields, so backward-compat of deserialize is preserved (new fields with safe defaults are filled in by a state-upgrade helper in Task 1).

---

## Task 1: Engine refactor — compose systems with per-day RNG

**Files:**
- Modify: `src/lib/game/engine.ts`
- Modify: `src/lib/game/types.ts`
- Modify: `tests/engine.test.ts`
- Create: `src/lib/game/upgrade.ts`
- Create: `tests/upgrade.test.ts`

This task lands the **composition harness** — individual systems arrive in later tasks as plug-ins. `tickDay` becomes a pipe of no-op stubs where real logic will replace stubs one by one.

### Step 1: Extend `GameState` with new flags

In `src/lib/game/types.ts`, the existing `flags: Record<string, boolean>` field already exists — no type change needed. But add this helper type for discoverability:

```ts
// Append to src/lib/game/types.ts, just after the existing GameState interface:

export type GameStateFlag =
  | 'hasBoilingKnowledge'
  | 'hadFireLastNight';
```

(This is documentation-only; we don't switch `flags` to use this union because we want open-ended flags for future year-gated events. Optional — keep if it reads well.)

### Step 2: Write the upgrade helper test

Create `tests/upgrade.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { upgradeState } from '../src/lib/game/upgrade';
import { createInitialState } from '../src/lib/game/engine';

describe('upgradeState', () => {
  it('fills in missing flags with safe defaults', () => {
    const s = createInitialState({
      seed: 'u',
      leader: { name: 'A', profession: 'farmer' },
      companions: [{ name: 'B', profession: 'doctor' }],
      startDate: { year: 1848, month: 4, day: 15 }
    });
    // Simulate an old save where flags didn't have our new keys yet.
    const old = { ...s, flags: {} };
    const upgraded = upgradeState(old);
    expect(upgraded.flags.hasBoilingKnowledge).toBe(false);
    expect(upgraded.flags.hadFireLastNight).toBe(false);
  });

  it('does not overwrite existing flag values', () => {
    const s = createInitialState({
      seed: 'u',
      leader: { name: 'A', profession: 'farmer' },
      companions: [{ name: 'B', profession: 'doctor' }],
      startDate: { year: 1848, month: 4, day: 15 }
    });
    const mutated = { ...s, flags: { hasBoilingKnowledge: true, hadFireLastNight: true } };
    const upgraded = upgradeState(mutated);
    expect(upgraded.flags.hasBoilingKnowledge).toBe(true);
    expect(upgraded.flags.hadFireLastNight).toBe(true);
  });

  it('is idempotent', () => {
    const s = createInitialState({
      seed: 'u',
      leader: { name: 'A', profession: 'farmer' },
      companions: [{ name: 'B', profession: 'doctor' }],
      startDate: { year: 1848, month: 4, day: 15 }
    });
    const once = upgradeState(s);
    const twice = upgradeState(once);
    expect(twice).toEqual(once);
  });
});
```

### Step 3: Run to confirm failure

```bash
npm test -- tests/upgrade.test.ts
```

Expected: FAIL — module not found.

### Step 4: Implement the upgrade helper

Create `src/lib/game/upgrade.ts`:

```ts
import type { GameState } from './types';

const DEFAULT_FLAGS: Record<string, boolean> = {
  hasBoilingKnowledge: false,
  hadFireLastNight: false
};

export function upgradeState(state: GameState): GameState {
  const flags = { ...DEFAULT_FLAGS, ...state.flags };
  return { ...state, flags };
}
```

### Step 5: Run the upgrade test

```bash
npm test -- tests/upgrade.test.ts
```

Expected: 3 passed.

### Step 6: Wire `createInitialState` to include the default flags

In `src/lib/game/engine.ts`, the existing `createInitialState` returns `flags: {}`. Change it to seed the defaults:

```ts
// In createInitialState, change:
//   flags: {},
// to:
//   flags: { hasBoilingKnowledge: false, hadFireLastNight: false },
```

### Step 7: Refactor `tickDay` to the system-pipe pattern

Replace the current `tickDay` body in `src/lib/game/engine.ts` with the pipe-based version. Systems that don't exist yet use no-op stubs — later tasks replace stubs:

```ts
import { applyDailyConsumption } from './systems/consumption';
import { makeRng, type Rng } from './rng';
import { upgradeState } from './upgrade';

// --- system step signature ---
type TickStep = (state: GameState, rng: Rng) => GameState;

// --- stubs for systems that arrive in later tasks ---
const progressConditions: TickStep = (s) => s;
const tickOxen: TickStep = (s) => s;
const tickWagon: TickStep = (s) => s;
const adjustMorale: TickStep = (s) => s;
const applyTravel: TickStep = (s) => s;
const attemptFire: TickStep = (s) => s;
const reapDead: TickStep = (s) => s;

// --- composition ---
const DAILY_STEPS: TickStep[] = [
  progressConditions,
  // applyDailyConsumption has no RNG parameter — wrap it:
  (s) => applyDailyConsumption(s),
  tickOxen,
  tickWagon,
  adjustMorale,
  applyTravel,
  attemptFire,
  reapDead
];

export function tickDay(state: GameState): GameState {
  const normalized = upgradeState(state);
  const rng = makeRng(`${normalized.seed}:${normalized.day}`);
  let s = normalized;
  for (const step of DAILY_STEPS) {
    s = step(s, rng);
  }
  return {
    ...s,
    day: s.day + 1,
    date: advanceDate(s.date)
  };
}
```

(Keep `advanceDate` and `createInitialState` as they were in Plan 1 — only `tickDay`'s body changes. The existing `applyDailyConsumption` import + call is now wrapped in a step function.)

### Step 8: Update existing `engine.test.ts` tests

The existing tests should mostly continue passing — consumption still happens, date still advances. One assertion might need adjustment:

- The test `'is deterministic — same seed, same result after 10 ticks'` still passes because the per-day Rng is reconstructed from `seed:day` deterministically.
- The test `'does not mutate the input state'` still passes — all stubs are pure.
- No new assertions required in this task; the system stubs are intentionally no-ops.

Run:

```bash
npm test
```

Expected: all 47 + 3 new = 50 tests pass. If any fail, debug before committing.

### Step 9: Commit

```bash
git add -A
git commit -m "refactor(game): compose tickDay via system pipe + per-day RNG"
```

---

## Task 2: Condition catalog

**Files:**
- Create: `src/lib/game/content/conditions.ts`
- Create: `tests/conditions-catalog.test.ts`

Ships the data for all v1 conditions per spec §5.3.

### Step 1: Write failing tests

Create `tests/conditions-catalog.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { CONDITIONS, getCondition } from '../src/lib/game/content/conditions';
import type { ConditionId } from '../src/lib/game/types';

const EXPECTED_IDS: ConditionId[] = [
  'cholera', 'dysentery', 'typhoid', 'measles',
  'exhaustion', 'broken_leg', 'snakebite', 'frostbite', 'scurvy'
];

describe('condition catalog', () => {
  it('has all 9 conditions from the spec', () => {
    const ids = Object.keys(CONDITIONS).sort();
    expect(ids).toEqual([...EXPECTED_IDS].sort());
  });

  it('every condition has a non-empty name and daily HP delta', () => {
    for (const c of Object.values(CONDITIONS)) {
      expect(c.name).toBeTruthy();
      expect(typeof c.dailyHealthDelta).toBe('number');
    }
  });

  it('cholera deals -10 / day and is contagious', () => {
    const c = getCondition('cholera');
    expect(c.dailyHealthDelta).toBe(-10);
    expect(c.contagious).toBe(true);
  });

  it('dysentery deals -3 / day', () => {
    expect(getCondition('dysentery').dailyHealthDelta).toBe(-3);
  });

  it('snakebite has immediate shock + daily drip', () => {
    const c = getCondition('snakebite');
    expect(c.immediateDamage).toBe(15);
    expect(c.dailyHealthDelta).toBe(-5);
  });

  it('exhaustion also deals morale damage', () => {
    const c = getCondition('exhaustion');
    expect(c.dailyMoraleDelta).toBe(-1);
  });

  it('scurvy resolves on dried fruit', () => {
    const c = getCondition('scurvy');
    expect(c.resolvedByItems).toContain('dried_fruit');
  });

  it('getCondition throws for unknown ids', () => {
    // @ts-expect-error - deliberately wrong id
    expect(() => getCondition('bubonic_plague')).toThrow();
  });
});
```

### Step 2: Run to confirm failure

```bash
npm test -- tests/conditions-catalog.test.ts
```

Expected: FAIL — module not found.

### Step 3: Implement the catalog

Create `src/lib/game/content/conditions.ts`:

```ts
import type { ConditionId, ItemId } from '../types';

export interface ConditionMeta {
  id: ConditionId;
  name: string;
  dailyHealthDelta: number;           // per-day HP change (negative = damage)
  dailyMoraleDelta?: number;          // optional per-day morale shift
  immediateDamage?: number;           // one-shot HP loss on onset (e.g., snakebite)
  contagious?: boolean;
  resolvedByItems?: ItemId[];         // items that outright cure it
  treatmentItems?: ItemId[];          // items that reduce severity (e.g., quinine for cholera)
  // note: morale-health coupling (§5.2 table) applies separately — see systems/morale
}

// Values calibrated to spec §5.3 (already tuned for playability during brainstorm review).
export const CONDITIONS: Record<ConditionId, ConditionMeta> = {
  cholera: {
    id: 'cholera',
    name: 'Cholera',
    dailyHealthDelta: -10,
    contagious: true,
    treatmentItems: ['quinine']
  },
  dysentery: {
    id: 'dysentery',
    name: 'Dysentery',
    dailyHealthDelta: -3,
    treatmentItems: ['calomel']
  },
  typhoid: {
    id: 'typhoid',
    name: 'Typhoid',
    dailyHealthDelta: -5,
    contagious: true,
    treatmentItems: ['quinine']
  },
  measles: {
    id: 'measles',
    name: 'Measles',
    dailyHealthDelta: -3,
    contagious: true
  },
  exhaustion: {
    id: 'exhaustion',
    name: 'Exhaustion',
    dailyHealthDelta: -2,
    dailyMoraleDelta: -1
  },
  broken_leg: {
    id: 'broken_leg',
    name: 'Broken Leg',
    dailyHealthDelta: -1,
    treatmentItems: ['bandages', 'laudanum']
  },
  snakebite: {
    id: 'snakebite',
    name: 'Snakebite',
    dailyHealthDelta: -5,
    immediateDamage: 15,
    treatmentItems: ['bandages', 'laudanum']
  },
  frostbite: {
    id: 'frostbite',
    name: 'Frostbite',
    dailyHealthDelta: -3
  },
  scurvy: {
    id: 'scurvy',
    name: 'Scurvy',
    dailyHealthDelta: -1,
    dailyMoraleDelta: -1,
    resolvedByItems: ['dried_fruit']
  }
};

export function getCondition(id: ConditionId): ConditionMeta {
  const c = CONDITIONS[id];
  if (!c) throw new Error(`Unknown condition: ${id}`);
  return c;
}
```

### Step 4: Run tests, type-check, commit

```bash
npm test -- tests/conditions-catalog.test.ts
npm run check
git add -A
git commit -m "feat(game): add condition catalog"
```

---

## Task 3: Condition progression system

**Files:**
- Create: `src/lib/game/systems/conditions.ts`
- Create: `tests/conditions.test.ts`
- Modify: `src/lib/game/engine.ts` (swap stub for real implementation)

### Step 1: Write failing tests

Create `tests/conditions.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { progressConditions } from '../src/lib/game/systems/conditions';
import { makeRng } from '../src/lib/game/rng';
import { createInitialState } from '../src/lib/game/engine';
import type { GameState } from '../src/lib/game/types';

function newGame(): GameState {
  return createInitialState({
    seed: 't',
    leader: { name: 'A', profession: 'farmer' },
    companions: [{ name: 'B', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
}

describe('progressConditions', () => {
  it('no-ops when nobody has conditions', () => {
    const s = newGame();
    const rng = makeRng('t:1');
    const next = progressConditions(s, rng);
    expect(next.party[0].health).toBe(100);
    expect(next.party[1].health).toBe(100);
  });

  it('applies daily delta to each condition', () => {
    const s = newGame();
    s.party[0].conditions = [{ id: 'cholera', daysSinceOnset: 0 }];
    const rng = makeRng('t:1');
    const next = progressConditions(s, rng);
    expect(next.party[0].health).toBe(90);  // 100 - 10
    expect(next.party[0].conditions[0].daysSinceOnset).toBe(1);
  });

  it('stacks multiple conditions on the same member', () => {
    const s = newGame();
    s.party[0].conditions = [
      { id: 'cholera', daysSinceOnset: 0 },     // -10
      { id: 'dysentery', daysSinceOnset: 0 }    // -3
    ];
    const rng = makeRng('t:1');
    const next = progressConditions(s, rng);
    expect(next.party[0].health).toBe(87);  // 100 - 10 - 3
  });

  it('does not drop health below 0', () => {
    const s = newGame();
    s.party[0].health = 5;
    s.party[0].conditions = [{ id: 'cholera', daysSinceOnset: 0 }];
    const rng = makeRng('t:1');
    const next = progressConditions(s, rng);
    expect(next.party[0].health).toBe(0);
  });

  it('applies per-condition morale delta via party-wide morale', () => {
    const s = newGame();
    s.party[0].conditions = [{ id: 'exhaustion', daysSinceOnset: 0 }];
    const rng = makeRng('t:1');
    const next = progressConditions(s, rng);
    expect(next.morale).toBe(s.morale - 1);   // exhaustion = -1 morale/day
  });

  it('does not accrue damage on dead members', () => {
    const s = newGame();
    s.party[0].dead = true;
    s.party[0].health = 0;
    s.party[0].conditions = [{ id: 'cholera', daysSinceOnset: 0 }];
    const rng = makeRng('t:1');
    const next = progressConditions(s, rng);
    expect(next.party[0].health).toBe(0);
    expect(next.party[0].conditions).toHaveLength(1); // not modified
  });

  it('does not mutate input', () => {
    const s = newGame();
    s.party[0].conditions = [{ id: 'cholera', daysSinceOnset: 2 }];
    const snap = JSON.stringify(s);
    progressConditions(s, makeRng('t:1'));
    expect(JSON.stringify(s)).toBe(snap);
  });
});
```

### Step 2: Run to confirm failure

```bash
npm test -- tests/conditions.test.ts
```

Expected: FAIL.

### Step 3: Implement the system

Create `src/lib/game/systems/conditions.ts`:

```ts
import type { GameState } from '../types';
import type { Rng } from '../rng';
import { getCondition } from '../content/conditions';

export function progressConditions(state: GameState, _rng: Rng): GameState {
  let moraleDelta = 0;

  const party = state.party.map((m) => {
    if (m.dead) return m;
    let healthDelta = 0;
    const conditions = m.conditions.map((c) => {
      const meta = getCondition(c.id);
      healthDelta += meta.dailyHealthDelta;
      if (meta.dailyMoraleDelta) moraleDelta += meta.dailyMoraleDelta;
      return { ...c, daysSinceOnset: c.daysSinceOnset + 1 };
    });
    const health = Math.max(0, Math.min(100, m.health + healthDelta));
    return { ...m, health, conditions };
  });

  const morale = Math.max(0, Math.min(100, state.morale + moraleDelta));
  return { ...state, party, morale };
}
```

### Step 4: Wire it into `tickDay`

In `src/lib/game/engine.ts`, replace the stub:

```ts
// change:
// const progressConditions: TickStep = (s) => s;
// to:
import { progressConditions } from './systems/conditions';
```

Remove the local stub declaration and keep the reference in `DAILY_STEPS` unchanged.

### Step 5: Run full suite, type-check, commit

```bash
npm test
npm run check
git add -A
git commit -m "feat(game): add condition progression system"
```

---

## Task 4: Morale system

**Files:**
- Create: `src/lib/game/systems/morale.ts`
- Create: `tests/morale.test.ts`
- Modify: `src/lib/game/engine.ts` (wire in)

Spec §5.1 + §5.2 table.

### Step 1: Write failing tests

Create `tests/morale.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  adjustMorale,
  healingMultiplier
} from '../src/lib/game/systems/morale';
import { makeRng } from '../src/lib/game/rng';
import { createInitialState } from '../src/lib/game/engine';
import type { GameState } from '../src/lib/game/types';

function newGame(): GameState {
  return createInitialState({
    seed: 't',
    leader: { name: 'A', profession: 'farmer' },
    companions: [{ name: 'B', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
}

describe('healingMultiplier (§5.2 table)', () => {
  it('multiplier is 1.25 for morale 80-100', () => {
    expect(healingMultiplier(100)).toBe(1.25);
    expect(healingMultiplier(80)).toBe(1.25);
  });
  it('1.10 for 60-79', () => {
    expect(healingMultiplier(79)).toBe(1.10);
    expect(healingMultiplier(60)).toBe(1.10);
  });
  it('1.00 for 40-59', () => {
    expect(healingMultiplier(50)).toBe(1.00);
  });
  it('0.90 for 20-39', () => {
    expect(healingMultiplier(30)).toBe(0.90);
  });
  it('0.75 for 0-19', () => {
    expect(healingMultiplier(5)).toBe(0.75);
    expect(healingMultiplier(0)).toBe(0.75);
  });
});

describe('adjustMorale', () => {
  it('wellness feedback loop: +1 morale if every member has >70 health', () => {
    const s = { ...newGame(), morale: 50 };
    for (const m of s.party) m.health = 80;
    const next = adjustMorale(s, makeRng('t:1'));
    expect(next.morale).toBe(51);
  });

  it('no wellness bonus if anyone has <=70 health', () => {
    const s = { ...newGame(), morale: 50 };
    s.party[0].health = 70;
    const next = adjustMorale(s, makeRng('t:1'));
    expect(next.morale).toBe(50);
  });

  it('low food rations cause -1 morale (meager)', () => {
    const s = { ...newGame(), morale: 50, rations: 'meager' as const };
    const next = adjustMorale(s, makeRng('t:1'));
    expect(next.morale).toBe(49);
  });

  it('filling rations cause +1 morale', () => {
    const s = { ...newGame(), morale: 50, rations: 'filling' as const };
    const next = adjustMorale(s, makeRng('t:1'));
    expect(next.morale).toBe(51);
  });

  it('empty food inventory drives morale down hard', () => {
    const s = { ...newGame(), morale: 50, inventory: {} };
    const next = adjustMorale(s, makeRng('t:1'));
    expect(next.morale).toBeLessThan(48);
  });

  it('clamps at 0 and 100', () => {
    const high = { ...newGame(), morale: 100, rations: 'filling' as const };
    for (const m of high.party) m.health = 80;
    expect(adjustMorale(high, makeRng('t:1')).morale).toBe(100);

    const low = { ...newGame(), morale: 0, inventory: {} };
    expect(adjustMorale(low, makeRng('t:1')).morale).toBe(0);
  });
});
```

### Step 2: Run to confirm failure

```bash
npm test -- tests/morale.test.ts
```

Expected: FAIL.

### Step 3: Implement

Create `src/lib/game/systems/morale.ts`:

```ts
import type { GameState } from '../types';
import type { Rng } from '../rng';

// spec §5.2 healing multiplier table
export function healingMultiplier(morale: number): number {
  if (morale >= 80) return 1.25;
  if (morale >= 60) return 1.10;
  if (morale >= 40) return 1.00;
  if (morale >= 20) return 0.90;
  return 0.75;
}

// Sum of food items still in inventory (items listed in spec §7.1).
const FOOD_KEYS = ['flour', 'beans', 'bacon', 'hardtack', 'dried_fruit', 'pemmican'];
function totalFood(state: GameState): number {
  return FOOD_KEYS.reduce((sum, k) => sum + (state.inventory[k] ?? 0), 0);
}

export function adjustMorale(state: GameState, _rng: Rng): GameState {
  let delta = 0;

  // Wellness feedback loop (§5.2)
  const allAboveSeventy = state.party.every((m) => m.dead || m.health > 70);
  if (allAboveSeventy && state.party.some((m) => !m.dead)) {
    delta += 1;
  }

  // Rations modifier (§4.6)
  if (state.rations === 'filling') delta += 1;
  else if (state.rations === 'meager') delta -= 1;

  // Famine: zero food on hand = morale tanks -3/day
  if (totalFood(state) <= 0) delta -= 3;

  const morale = Math.max(0, Math.min(100, state.morale + delta));
  return { ...state, morale };
}
```

### Step 4: Wire into engine

In `src/lib/game/engine.ts`:

```ts
// replace stub:
// const adjustMorale: TickStep = (s) => s;
// with:
import { adjustMorale } from './systems/morale';
```

### Step 5: Run, check, commit

```bash
npm test
npm run check
git add -A
git commit -m "feat(game): add morale adjustment + healing multiplier"
```

---

## Task 5: Oxen system

**Files:**
- Create: `src/lib/game/systems/oxen.ts`
- Create: `tests/oxen.test.ts`
- Modify: `src/lib/game/engine.ts`

Spec §5.7.

### Step 1: Write failing tests

Create `tests/oxen.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { tickOxen, oxenSpeedFactor } from '../src/lib/game/systems/oxen';
import { makeRng } from '../src/lib/game/rng';
import { createInitialState } from '../src/lib/game/engine';
import type { GameState, Ox } from '../src/lib/game/types';

function gameWithOxen(oxen: Ox[]): GameState {
  const s = createInitialState({
    seed: 't',
    leader: { name: 'A', profession: 'farmer' },
    companions: [{ name: 'B', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
  return { ...s, oxen };
}

function newOx(overrides: Partial<Ox> = {}): Ox {
  return { id: 'o1', health: 100, fatigue: 0, shod: true, ...overrides };
}

describe('tickOxen', () => {
  it('no-ops when no oxen', () => {
    const s = gameWithOxen([]);
    const next = tickOxen(s, makeRng('t:1'));
    expect(next.oxen).toEqual([]);
  });

  it('accrues +4 fatigue on moderate pace per ox', () => {
    const s = gameWithOxen([newOx()]);
    const next = tickOxen(s, makeRng('t:1'));
    expect(next.oxen[0].fatigue).toBe(4);
  });

  it('accrues more fatigue on fast / grueling pace', () => {
    const slow = tickOxen({ ...gameWithOxen([newOx()]), pace: 'slow' }, makeRng('t:1'));
    const fast = tickOxen({ ...gameWithOxen([newOx()]), pace: 'fast' }, makeRng('t:1'));
    const grueling = tickOxen({ ...gameWithOxen([newOx()]), pace: 'grueling' }, makeRng('t:1'));
    expect(slow.oxen[0].fatigue).toBeLessThan(fast.oxen[0].fatigue);
    expect(fast.oxen[0].fatigue).toBeLessThan(grueling.oxen[0].fatigue);
  });

  it('shoeless ox fatigues faster', () => {
    const shod = tickOxen(gameWithOxen([newOx({ shod: true })]), makeRng('t:1'));
    const bare = tickOxen(gameWithOxen([newOx({ shod: false })]), makeRng('t:1'));
    expect(bare.oxen[0].fatigue).toBeGreaterThan(shod.oxen[0].fatigue);
  });

  it('high fatigue (>= 80) drains health over time', () => {
    const s = gameWithOxen([newOx({ fatigue: 85 })]);
    const next = tickOxen(s, makeRng('t:1'));
    expect(next.oxen[0].health).toBeLessThan(100);
  });

  it('caps fatigue at 100 and health at 0/100', () => {
    const s1 = gameWithOxen([newOx({ fatigue: 98 })]);
    expect(tickOxen({ ...s1, pace: 'grueling' }, makeRng('t:1')).oxen[0].fatigue).toBe(100);

    const s2 = gameWithOxen([newOx({ fatigue: 100, health: 2 })]);
    expect(tickOxen(s2, makeRng('t:1')).oxen[0].health).toBe(0);
  });
});

describe('oxenSpeedFactor', () => {
  it('is 1.0 with two full-health zero-fatigue oxen', () => {
    const oxen = [newOx(), newOx({ id: 'o2' })];
    expect(oxenSpeedFactor(oxen)).toBeCloseTo(1.0);
  });

  it('drops as fatigue rises', () => {
    const fresh = [newOx()];
    const tired = [newOx({ fatigue: 80 })];
    expect(oxenSpeedFactor(fresh)).toBeGreaterThan(oxenSpeedFactor(tired));
  });

  it('dead oxen are excluded', () => {
    const oxen = [newOx(), newOx({ id: 'dead', health: 0 })];
    const aliveOnly = [newOx()];
    expect(oxenSpeedFactor(oxen)).toBeCloseTo(oxenSpeedFactor(aliveOnly));
  });

  it('zero live oxen → 0 speed factor', () => {
    expect(oxenSpeedFactor([])).toBe(0);
    expect(oxenSpeedFactor([newOx({ health: 0 })])).toBe(0);
  });
});
```

### Step 2: Run to confirm failure

```bash
npm test -- tests/oxen.test.ts
```

### Step 3: Implement

Create `src/lib/game/systems/oxen.ts`:

```ts
import type { GameState, Ox, Pace } from '../types';
import type { Rng } from '../rng';

const FATIGUE_PER_DAY_BY_PACE: Record<Pace, number> = {
  slow: 2,
  moderate: 4,
  fast: 6,
  grueling: 9
};

const SHOELESS_FATIGUE_MULTIPLIER = 1.5;
const HIGH_FATIGUE_THRESHOLD = 80;
const OVERWORK_HEALTH_DRAIN = 2; // per day at high fatigue

export function tickOxen(state: GameState, _rng: Rng): GameState {
  const base = FATIGUE_PER_DAY_BY_PACE[state.pace];
  const oxen = state.oxen.map((ox) => {
    if (ox.health === 0) return ox;
    const fatigueGain = Math.round(base * (ox.shod ? 1 : SHOELESS_FATIGUE_MULTIPLIER));
    const fatigue = Math.min(100, ox.fatigue + fatigueGain);
    const healthDrain = fatigue >= HIGH_FATIGUE_THRESHOLD ? OVERWORK_HEALTH_DRAIN : 0;
    const health = Math.max(0, ox.health - healthDrain);
    return { ...ox, fatigue, health };
  });
  return { ...state, oxen };
}

// Travel-speed multiplier contributed by the ox team.
// Baseline: 2 live oxen with no fatigue = 1.0. Linear interpolation.
export function oxenSpeedFactor(oxen: Ox[]): number {
  const alive = oxen.filter((o) => o.health > 0);
  if (alive.length === 0) return 0;
  const avgFitness =
    alive.reduce((s, o) => s + (o.health / 100) * (1 - o.fatigue / 100), 0) / alive.length;
  const teamFactor = Math.min(1.2, alive.length / 2); // 2 oxen = 1.0, more = slight bonus up to 1.2
  return teamFactor * avgFitness;
}
```

### Step 4: Wire into engine

In `src/lib/game/engine.ts`:

```ts
// replace stub:
// const tickOxen: TickStep = (s) => s;
// with:
import { tickOxen } from './systems/oxen';
```

### Step 5: Run, check, commit

```bash
npm test
npm run check
git add -A
git commit -m "feat(game): add ox health + fatigue system"
```

---

## Task 6: Wagon system

**Files:**
- Create: `src/lib/game/systems/wagon.ts`
- Create: `tests/wagon.test.ts`
- Modify: `src/lib/game/engine.ts`

Passive decay only in Plan 2a. Repair actions are Plan 2b.

### Step 1: Write failing tests

Create `tests/wagon.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { tickWagon } from '../src/lib/game/systems/wagon';
import { makeRng } from '../src/lib/game/rng';
import { createInitialState } from '../src/lib/game/engine';

function newGame() {
  return createInitialState({
    seed: 't',
    leader: { name: 'A', profession: 'farmer' },
    companions: [{ name: 'B', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
}

describe('tickWagon', () => {
  it('decays at moderate rate on moderate pace and baseline terrain', () => {
    const s = newGame();
    expect(s.wagon.condition).toBe(100);
    const next = tickWagon(s, makeRng('t:1'));
    expect(next.wagon.condition).toBeLessThan(100);
    expect(next.wagon.condition).toBeGreaterThan(99);
  });

  it('decays faster on grueling pace', () => {
    const s = newGame();
    const moderate = tickWagon(s, makeRng('t:1')).wagon.condition;
    const grueling = tickWagon({ ...s, pace: 'grueling' }, makeRng('t:1')).wagon.condition;
    expect(grueling).toBeLessThan(moderate);
  });

  it('decays faster on mountains terrain', () => {
    const s = newGame();
    const prairie = tickWagon(s, makeRng('t:1')).wagon.condition;
    const mtns = tickWagon(
      { ...s, location: { ...s.location, terrain: 'mountains' } },
      makeRng('t:1')
    ).wagon.condition;
    expect(mtns).toBeLessThan(prairie);
  });

  it('clamps at 0', () => {
    const s = { ...newGame(), wagon: { condition: 0.1, carryCapacity: 2500 } };
    const next = tickWagon({ ...s, pace: 'grueling' }, makeRng('t:1'));
    expect(next.wagon.condition).toBeGreaterThanOrEqual(0);
  });
});
```

### Step 2: Run to confirm failure

```bash
npm test -- tests/wagon.test.ts
```

### Step 3: Implement

Create `src/lib/game/systems/wagon.ts`:

```ts
import type { GameState, Pace, Terrain } from '../types';
import type { Rng } from '../rng';

const PACE_DECAY: Record<Pace, number> = {
  slow: 0.3,
  moderate: 0.6,
  fast: 1.0,
  grueling: 1.8
};

const TERRAIN_MULTIPLIER: Record<Terrain, number> = {
  prairie: 1.0,
  forest: 1.1,
  desert: 1.2,
  mountains: 1.8,
  river: 1.0   // only relevant on ford days, which are player actions
};

export function tickWagon(state: GameState, _rng: Rng): GameState {
  const base = PACE_DECAY[state.pace];
  const terrain = TERRAIN_MULTIPLIER[state.location.terrain];
  const decay = base * terrain;
  const condition = Math.max(0, state.wagon.condition - decay);
  return { ...state, wagon: { ...state.wagon, condition } };
}
```

### Step 4: Wire + commit

```bash
# replace stub import in engine.ts:
# import { tickWagon } from './systems/wagon';
npm test
npm run check
git add -A
git commit -m "feat(game): add wagon condition decay"
```

---

## Task 7: Travel system + minimal landmark stub

**Files:**
- Create: `src/lib/game/content/landmarks.ts`
- Create: `src/lib/game/systems/travel.ts`
- Create: `tests/landmarks-stub.test.ts`
- Create: `tests/travel.test.ts`
- Modify: `src/lib/game/engine.ts`

Plan 3 ships the full landmark catalog. Plan 2a just needs enough data to test the travel math and landmark-reach hook.

### Step 1: Write failing test for landmark stub

Create `tests/landmarks-stub.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { LANDMARKS, getLandmark, nextLandmarkAfter } from '../src/lib/game/content/landmarks';

describe('landmark stub (Plan 2a)', () => {
  it('has at least Independence and Fort Kearny', () => {
    const ids = LANDMARKS.map((l) => l.id);
    expect(ids).toContain('independence');
    expect(ids).toContain('ft_kearny');
  });

  it('getLandmark throws on unknown id', () => {
    expect(() => getLandmark('atlantis')).toThrow();
  });

  it('nextLandmarkAfter finds the next one in order', () => {
    const next = nextLandmarkAfter('independence');
    expect(next?.id).toBe('ft_kearny');
  });

  it('nextLandmarkAfter returns null at the end', () => {
    const last = LANDMARKS[LANDMARKS.length - 1].id;
    expect(nextLandmarkAfter(last)).toBeNull();
  });
});
```

### Step 2: Implement the stub

Create `src/lib/game/content/landmarks.ts`:

```ts
import type { Terrain } from '../types';

export interface Landmark {
  id: string;
  name: string;
  milesFromPrevious: number;  // 0 for start
  terrain: Terrain;           // terrain of the leg leading into this landmark
  kind: 'start' | 'trading_post' | 'landmark' | 'river' | 'end';
}

// Minimal stub — Plan 3 expands this to the full ~31-stop catalog.
export const LANDMARKS: readonly Landmark[] = [
  { id: 'independence', name: 'Independence, MO', milesFromPrevious: 0, terrain: 'prairie', kind: 'start' },
  { id: 'ft_kearny', name: 'Fort Kearny', milesFromPrevious: 300, terrain: 'prairie', kind: 'trading_post' },
  { id: 'chimney_rock', name: 'Chimney Rock', milesFromPrevious: 250, terrain: 'prairie', kind: 'landmark' }
];

export function getLandmark(id: string): Landmark {
  const found = LANDMARKS.find((l) => l.id === id);
  if (!found) throw new Error(`Unknown landmark: ${id}`);
  return found;
}

export function nextLandmarkAfter(id: string): Landmark | null {
  const idx = LANDMARKS.findIndex((l) => l.id === id);
  if (idx < 0 || idx >= LANDMARKS.length - 1) return null;
  return LANDMARKS[idx + 1];
}
```

### Step 3: Write failing tests for travel

Create `tests/travel.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { applyTravel, milesPerDay } from '../src/lib/game/systems/travel';
import { makeRng } from '../src/lib/game/rng';
import { createInitialState } from '../src/lib/game/engine';
import type { Ox } from '../src/lib/game/types';

function newGame() {
  const s = createInitialState({
    seed: 't',
    leader: { name: 'A', profession: 'farmer' },
    companions: [{ name: 'B', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
  const oxen: Ox[] = [
    { id: 'o1', health: 100, fatigue: 0, shod: true },
    { id: 'o2', health: 100, fatigue: 0, shod: true }
  ];
  return { ...s, oxen };
}

describe('milesPerDay', () => {
  it('moderate pace on prairie with fresh team is around 18 mi/day', () => {
    const s = newGame();
    const mi = milesPerDay(s);
    expect(mi).toBeGreaterThanOrEqual(17);
    expect(mi).toBeLessThanOrEqual(19);
  });

  it('slow < moderate < fast < grueling on same terrain', () => {
    const s = newGame();
    const slow = milesPerDay({ ...s, pace: 'slow' });
    const mod = milesPerDay({ ...s, pace: 'moderate' });
    const fast = milesPerDay({ ...s, pace: 'fast' });
    const gru = milesPerDay({ ...s, pace: 'grueling' });
    expect(slow).toBeLessThan(mod);
    expect(mod).toBeLessThan(fast);
    expect(fast).toBeLessThan(gru);
  });

  it('mountains cut speed significantly', () => {
    const s = newGame();
    const prairie = milesPerDay({ ...s, location: { ...s.location, terrain: 'prairie' } });
    const mtns = milesPerDay({ ...s, location: { ...s.location, terrain: 'mountains' } });
    expect(mtns).toBeLessThan(prairie * 0.7);
  });

  it('fewer than 2 healthy oxen = 0 mi/day', () => {
    const s = newGame();
    const stranded = { ...s, oxen: [{ id: 'o1', health: 0, fatigue: 0, shod: true }] };
    expect(milesPerDay(stranded)).toBe(0);
  });
});

describe('applyTravel', () => {
  it('adds miles to milesTraveled', () => {
    const s = newGame();
    const next = applyTravel(s, makeRng('t:1'));
    expect(next.location.milesTraveled).toBeGreaterThan(0);
  });

  it('reaches the next landmark when miles accumulate', () => {
    const s = newGame();
    // Need 300 miles to reach Fort Kearny. Jump close.
    const nearly = { ...s, location: { ...s.location, milesTraveled: 299 } };
    const next = applyTravel(nearly, makeRng('t:1'));
    // At 299 + ~18 we reach ft_kearny and previousLandmarkId flips.
    expect(next.location.previousLandmarkId).toBe('independence');
    // and nextLandmarkId advances
    expect(next.location.nextLandmarkId).not.toBe('ft_kearny');
  });

  it('appends a log entry when a landmark is reached', () => {
    const s = newGame();
    const nearly = { ...s, location: { ...s.location, milesTraveled: 299 } };
    const next = applyTravel(nearly, makeRng('t:1'));
    expect(next.eventLog.length).toBeGreaterThan(s.eventLog.length);
    const last = next.eventLog[next.eventLog.length - 1];
    expect(last.text).toMatch(/Kearny/i);
  });

  it('does not advance past the final landmark', () => {
    const s = newGame();
    const atEnd = {
      ...s,
      location: {
        ...s.location,
        nextLandmarkId: 'chimney_rock',
        previousLandmarkId: 'ft_kearny',
        milesTraveled: 9999
      }
    };
    const next = applyTravel(atEnd, makeRng('t:1'));
    expect(next.completed).toBe(true);
  });
});
```

### Step 4: Implement travel system

Create `src/lib/game/systems/travel.ts`:

```ts
import type { GameState, Pace, Terrain } from '../types';
import type { Rng } from '../rng';
import { oxenSpeedFactor } from './oxen';
import { LANDMARKS, getLandmark, nextLandmarkAfter } from '../content/landmarks';

const PACE_BASE_MILES: Record<Pace, number> = {
  slow: 12,
  moderate: 18,
  fast: 24,
  grueling: 30
};

const TERRAIN_MULTIPLIER: Record<Terrain, number> = {
  prairie: 1.0,
  forest: 0.85,
  desert: 0.9,
  mountains: 0.55,
  river: 0.0   // stopped at a crossing; Plan 2b handles ford mechanics
};

// Sum of milesFromPrevious from start through (and including) the given landmark id.
function runningMilesTo(id: string): number {
  let sum = 0;
  for (const l of LANDMARKS) {
    sum += l.milesFromPrevious;
    if (l.id === id) return sum;
  }
  return sum;
}

export function milesPerDay(state: GameState): number {
  const aliveOxen = state.oxen.filter((o) => o.health > 0).length;
  if (aliveOxen < 2) return 0;
  const base = PACE_BASE_MILES[state.pace];
  const terrain = TERRAIN_MULTIPLIER[state.location.terrain];
  const oxen = oxenSpeedFactor(state.oxen);
  return Math.round(base * terrain * oxen);
}

export function applyTravel(state: GameState, _rng: Rng): GameState {
  if (state.completed) return state;

  const miles = milesPerDay(state);
  const milesTraveled = state.location.milesTraveled + miles;

  let next = {
    ...state,
    location: { ...state.location, milesTraveled }
  };

  // Check landmark reach
  const nextLandmark = getLandmark(state.location.nextLandmarkId);
  const prevId = state.location.previousLandmarkId ?? 'independence';
  const legStart =
    state.location.previousLandmarkId === null ? 0 : runningMilesTo(prevId);
  const targetMiles = legStart + nextLandmark.milesFromPrevious;

  if (milesTraveled >= targetMiles) {
    const after = nextLandmarkAfter(nextLandmark.id);
    next = {
      ...next,
      location: {
        ...next.location,
        previousLandmarkId: nextLandmark.id,
        nextLandmarkId: after?.id ?? nextLandmark.id,
        terrain: after?.terrain ?? next.location.terrain
      },
      eventLog: [
        ...next.eventLog,
        { day: state.day, text: `Reached ${nextLandmark.name}.` }
      ],
      completed: after === null ? true : next.completed,
      outcome: after === null ? 'arrived' : next.outcome
    };
  }

  return next;
}
```

### Step 5: Wire into engine

In `src/lib/game/engine.ts`:

```ts
// replace stub:
// const applyTravel: TickStep = (s) => s;
// with:
import { applyTravel } from './systems/travel';
```

### Step 6: Run everything, commit

```bash
npm test
npm run check
git add -A
git commit -m "feat(game): add travel system + minimal landmark stub"
```

---

## Task 8: Water purification rules

**Files:**
- Create: `src/lib/game/systems/water-purity.ts`
- Create: `tests/water-purity.test.ts`

No engine wiring — this is a lookup module used by condition-onset logic (mostly Plan 3's event catalog). Ships now so the interface is locked.

### Step 1: Write failing tests

Create `tests/water-purity.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  canBoilWater,
  waterborneDiseaseModifier
} from '../src/lib/game/systems/water-purity';
import { createInitialState } from '../src/lib/game/engine';
import type { GameState } from '../src/lib/game/types';

function newGame(overrides: Partial<GameState> = {}): GameState {
  const s = createInitialState({
    seed: 't',
    leader: { name: 'A', profession: 'farmer' },
    companions: [{ name: 'B', profession: 'hunter' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
  return { ...s, ...overrides };
}

describe('canBoilWater', () => {
  it('is false pre-1854 with no Doctor and no unlock flag', () => {
    const s = newGame();
    expect(canBoilWater(s)).toBe(false);
  });

  it('is true pre-1854 if a Doctor is in the party', () => {
    const s = newGame();
    s.party[1].profession = 'doctor';
    expect(canBoilWater(s)).toBe(true);
  });

  it('is false when the only Doctor is dead', () => {
    const s = newGame();
    s.party[1].profession = 'doctor';
    s.party[1].dead = true;
    expect(canBoilWater(s)).toBe(false);
  });

  it('is true post-1854 regardless of doctor', () => {
    const s = newGame({ date: { year: 1855, month: 4, day: 1 } });
    expect(canBoilWater(s)).toBe(true);
  });

  it('is true when the unlock flag is set (wise-traveler event)', () => {
    const s = newGame();
    s.flags.hasBoilingKnowledge = true;
    expect(canBoilWater(s)).toBe(true);
  });
});

describe('waterborneDiseaseModifier', () => {
  it('is 1.0 baseline (no reducer)', () => {
    const s = newGame();
    expect(waterborneDiseaseModifier(s)).toBeCloseTo(1.0);
  });

  it('drops 40% when coffee is in inventory', () => {
    const s = newGame();
    s.inventory.coffee = 20;
    expect(waterborneDiseaseModifier(s)).toBeCloseTo(0.6);
  });

  it('drops 40% when tea is in inventory', () => {
    const s = newGame();
    s.inventory.tea = 10;
    expect(waterborneDiseaseModifier(s)).toBeCloseTo(0.6);
  });

  it('only applies one coffee-OR-tea reduction, not both stacking', () => {
    const s = newGame();
    s.inventory.coffee = 10;
    s.inventory.tea = 10;
    expect(waterborneDiseaseModifier(s)).toBeCloseTo(0.6);
  });
});
```

### Step 2: Implement

Create `src/lib/game/systems/water-purity.ts`:

```ts
import type { GameState } from '../types';

const GERM_THEORY_YEAR = 1854;

export function canBoilWater(state: GameState): boolean {
  if (state.flags.hasBoilingKnowledge) return true;
  if (state.date.year >= GERM_THEORY_YEAR) return true;
  const hasLiveDoctor = state.party.some((m) => !m.dead && m.profession === 'doctor');
  return hasLiveDoctor;
}

// Multiplier applied to waterborne-disease onset odds in the event system.
// Coffee OR tea in supplies gives accidental purification (§5.4).
export function waterborneDiseaseModifier(state: GameState): number {
  const hasCoffee = (state.inventory.coffee ?? 0) > 0;
  const hasTea = (state.inventory.tea ?? 0) > 0;
  if (hasCoffee || hasTea) return 0.6; // 40% reduction, capped (not stacking)
  return 1.0;
}
```

### Step 3: Run, commit

```bash
npm test
npm run check
git add -A
git commit -m "feat(game): add water purification rules"
```

---

## Task 9: Fire system

**Files:**
- Create: `src/lib/game/systems/fire.ts`
- Create: `tests/fire.test.ts`
- Modify: `src/lib/game/engine.ts`

Per-night fire roll. Updates `flags.hadFireLastNight` for tomorrow's frostbite interaction.

### Step 1: Write failing tests

Create `tests/fire.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { attemptFire, fireSuccessChance } from '../src/lib/game/systems/fire';
import { makeRng } from '../src/lib/game/rng';
import { createInitialState } from '../src/lib/game/engine';

function newGame() {
  return createInitialState({
    seed: 't',
    leader: { name: 'A', profession: 'farmer' },
    companions: [{ name: 'B', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
}

describe('fireSuccessChance', () => {
  it('forest terrain is near-guaranteed', () => {
    const s = { ...newGame(), location: { ...newGame().location, terrain: 'forest' as const } };
    expect(fireSuccessChance(s)).toBeGreaterThan(0.95);
  });

  it('prairie is common', () => {
    const s = { ...newGame(), location: { ...newGame().location, terrain: 'prairie' as const } };
    expect(fireSuccessChance(s)).toBeGreaterThan(0.85);
    expect(fireSuccessChance(s)).toBeLessThan(0.99);
  });

  it('desert is lowest', () => {
    const s = { ...newGame(), location: { ...newGame().location, terrain: 'desert' as const } };
    expect(fireSuccessChance(s)).toBeLessThan(0.85);
  });

  it('bigger parties get a small bonus', () => {
    const small = newGame();
    const big = createInitialState({
      seed: 't',
      leader: { name: 'A', profession: 'farmer' },
      companions: [
        { name: 'B', profession: 'doctor' },
        { name: 'C', profession: 'hunter' },
        { name: 'D', profession: 'scout' },
        { name: 'E', profession: 'preacher' },
        { name: 'F', profession: 'gunsmith' }
      ],
      startDate: { year: 1848, month: 4, day: 15 }
    });
    expect(fireSuccessChance(big)).toBeGreaterThan(fireSuccessChance(small));
  });
});

describe('attemptFire', () => {
  it('sets hadFireLastNight based on the roll', () => {
    // Forest should almost always succeed
    const s = { ...newGame(), location: { ...newGame().location, terrain: 'forest' as const } };
    const next = attemptFire(s, makeRng('t:1'));
    expect(next.flags.hadFireLastNight).toBe(true);
  });

  it('logs a line only on failure', () => {
    // Force failure via a terrain/party that's close to minimum chance
    const s = {
      ...newGame(),
      location: { ...newGame().location, terrain: 'desert' as const }
    };
    // Find a seed where the roll fails
    for (let d = 0; d < 200; d++) {
      const r = makeRng(`${s.seed}:${d}`);
      const result = attemptFire(s, r);
      if (!result.flags.hadFireLastNight) {
        expect(result.eventLog[result.eventLog.length - 1].text).toMatch(/fire/i);
        return;
      }
    }
    // If we never failed in 200 seeds, that's evidence the chance is way too high
    throw new Error('Expected at least one failure across 200 seeds');
  });
});
```

### Step 2: Implement

Create `src/lib/game/systems/fire.ts`:

```ts
import type { GameState, Terrain } from '../types';
import type { Rng } from '../rng';

const TERRAIN_BASE_CHANCE: Record<Terrain, number> = {
  forest: 0.98,
  prairie: 0.90,
  mountains: 0.80,
  desert: 0.70,
  river: 0.90
};

const PER_MEMBER_BONUS = 0.01; // up to +5% with a full party

export function fireSuccessChance(state: GameState): number {
  const base = TERRAIN_BASE_CHANCE[state.location.terrain];
  const alive = state.party.filter((m) => !m.dead).length;
  const bonus = Math.min(0.05, alive * PER_MEMBER_BONUS);
  return Math.min(0.99, base + bonus);
}

export function attemptFire(state: GameState, rng: Rng): GameState {
  const success = rng.chance(fireSuccessChance(state));
  const flags = { ...state.flags, hadFireLastNight: success };
  if (success) return { ...state, flags };
  return {
    ...state,
    flags,
    eventLog: [
      ...state.eventLog,
      { day: state.day, text: 'Could not get a fire going tonight. Camp is cold and hungry.' }
    ]
  };
}
```

### Step 3: Wire into engine

In `src/lib/game/engine.ts`:

```ts
// replace stub:
// const attemptFire: TickStep = (s) => s;
// with:
import { attemptFire } from './systems/fire';
```

### Step 4: Run, commit

```bash
npm test
npm run check
git add -A
git commit -m "feat(game): add fire attempt system"
```

---

## Task 10: Death reaper + 30-day integration test

**Files:**
- Create: `src/lib/game/systems/death.ts`
- Create: `tests/death.test.ts`
- Create: `tests/engine-integration.test.ts`
- Modify: `src/lib/game/engine.ts`

### Step 1: Write failing tests for death

Create `tests/death.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { reapDead } from '../src/lib/game/systems/death';
import { makeRng } from '../src/lib/game/rng';
import { createInitialState } from '../src/lib/game/engine';

function newGame() {
  return createInitialState({
    seed: 't',
    leader: { name: 'A', profession: 'farmer' },
    companions: [{ name: 'B', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
}

describe('reapDead', () => {
  it('flips dead=true when health is 0', () => {
    const s = newGame();
    s.party[1].health = 0;
    const next = reapDead(s, makeRng('t:1'));
    expect(next.party[1].dead).toBe(true);
    expect(next.party[1].deathDay).toBe(s.day);
    expect(next.party[1].deathCause).toBeTruthy();
  });

  it('uses the most damaging condition as death cause', () => {
    const s = newGame();
    s.party[1].health = 0;
    s.party[1].conditions = [
      { id: 'scurvy', daysSinceOnset: 20 },
      { id: 'cholera', daysSinceOnset: 3 }  // larger daily damage
    ];
    const next = reapDead(s, makeRng('t:1'));
    expect(next.party[1].deathCause).toMatch(/cholera/i);
  });

  it('falls back to "exposure" when no conditions and health hit 0', () => {
    const s = newGame();
    s.party[1].health = 0;
    s.party[1].conditions = [];
    const next = reapDead(s, makeRng('t:1'));
    expect(next.party[1].deathCause).toMatch(/exposure/i);
  });

  it('marks outcome=wiped when the whole party dies', () => {
    const s = newGame();
    for (const m of s.party) m.health = 0;
    const next = reapDead(s, makeRng('t:1'));
    expect(next.outcome).toBe('wiped');
    expect(next.completed).toBe(true);
  });

  it('is idempotent — re-running does not re-stamp deathDay', () => {
    let s = newGame();
    s.party[1].health = 0;
    s = reapDead(s, makeRng('t:1'));
    const firstDeathDay = s.party[1].deathDay;
    s = reapDead(s, makeRng('t:2'));  // different day
    expect(s.party[1].deathDay).toBe(firstDeathDay);
  });
});
```

### Step 2: Implement death

Create `src/lib/game/systems/death.ts`:

```ts
import type { GameState, Condition } from '../types';
import type { Rng } from '../rng';
import { getCondition } from '../content/conditions';

function causeFromConditions(conditions: Condition[]): string | null {
  if (conditions.length === 0) return null;
  // Pick the condition whose daily damage is largest (most "blame").
  const sorted = [...conditions].sort(
    (a, b) => getCondition(a.id).dailyHealthDelta - getCondition(b.id).dailyHealthDelta
  );
  const worst = sorted[0];
  return getCondition(worst.id).name;
}

export function reapDead(state: GameState, _rng: Rng): GameState {
  let anyChange = false;
  const party = state.party.map((m) => {
    if (m.dead) return m;
    if (m.health > 0) return m;
    anyChange = true;
    const cause = causeFromConditions(m.conditions) ?? 'Exposure';
    return {
      ...m,
      dead: true,
      deathCause: cause,
      deathDay: state.day
    };
  });

  if (!anyChange) return state;

  const allDead = party.every((m) => m.dead);
  return {
    ...state,
    party,
    completed: allDead ? true : state.completed,
    outcome: allDead ? 'wiped' : state.outcome,
    eventLog: [
      ...state.eventLog,
      ...party
        .filter((m, i) => !state.party[i].dead && m.dead)
        .map((m) => ({ day: state.day, text: `${m.name} has died. Cause: ${m.deathCause}.` }))
    ]
  };
}
```

### Step 3: Wire into engine

In `src/lib/game/engine.ts`:

```ts
// replace stub:
// const reapDead: TickStep = (s) => s;
// with:
import { reapDead } from './systems/death';
```

### Step 4: Write the integration test

Create `tests/engine-integration.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createInitialState, tickDay } from '../src/lib/game/engine';
import type { Ox } from '../src/lib/game/types';

function freshGameWithOxen() {
  const s = createInitialState({
    seed: 'integration',
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [
      { name: 'Mary', profession: 'doctor' },
      { name: 'Tom', profession: 'hunter' }
    ],
    startDate: { year: 1848, month: 4, day: 15 }
  });
  const oxen: Ox[] = Array.from({ length: 4 }, (_, i) => ({
    id: `ox-${i}`,
    health: 100,
    fatigue: 0,
    shod: true
  }));
  return { ...s, oxen };
}

describe('30-day deterministic simulation', () => {
  it('evolves all tracked stats across 30 days', () => {
    let s = freshGameWithOxen();
    const startingFlour = s.inventory.flour ?? 0;
    const startingCondition = s.wagon.condition;

    for (let i = 0; i < 30; i++) s = tickDay(s);

    expect(s.day).toBe(31);
    expect(s.inventory.flour).toBeLessThan(startingFlour);           // consumption
    expect(s.wagon.condition).toBeLessThan(startingCondition);       // wagon decay
    expect(s.oxen.some((o) => o.fatigue > 0)).toBe(true);            // fatigue accrues
    expect(s.location.milesTraveled).toBeGreaterThan(300);           // traveled
    expect(s.location.previousLandmarkId).not.toBe(null);            // reached at least one landmark
    expect(typeof s.flags.hadFireLastNight).toBe('boolean');         // fire rolls ran
  });

  it('same seed + same conditions = identical 30-day outcome', () => {
    function run() {
      let s = freshGameWithOxen();
      for (let i = 0; i < 30; i++) s = tickDay(s);
      return s;
    }
    expect(run()).toEqual(run());
  });

  it('a cholera outbreak + no doctor + low morale kills the party given enough days', () => {
    let s = freshGameWithOxen();
    // Everyone gets cholera on day 1
    s = {
      ...s,
      party: s.party.map((m) => ({
        ...m,
        conditions: [{ id: 'cholera' as const, daysSinceOnset: 0 }]
      })),
      morale: 30
    };
    // 20 days of -10 HP / member = they should be dead by day ~11
    for (let i = 0; i < 20; i++) s = tickDay(s);
    expect(s.party.every((m) => m.dead)).toBe(true);
    expect(s.outcome).toBe('wiped');
    expect(s.completed).toBe(true);
  });

  it('reaches Fort Kearny within ~20 moderate days of travel', () => {
    let s = freshGameWithOxen();
    for (let i = 0; i < 25; i++) s = tickDay(s);
    expect(s.location.previousLandmarkId).toBe('ft_kearny');
  });
});
```

### Step 5: Run everything

```bash
npm test
npm run check
```

Expected: all previous tests plus the integration tests pass. Tune if any fail — the integration test asserts loose bounds so tightening or loosening bounds is fair play, but explain any changes in the commit message.

### Step 6: Commit

```bash
git add -A
git commit -m "feat(game): add death system + 30-day integration test"
```

---

## Verification Checklist

Before handing off to Plan 2b:

- [ ] `npm test` — all tests pass (~80+ across ~15 files).
- [ ] `npm run check` — 0 errors.
- [ ] `git log --oneline master..HEAD` shows ~10-12 commits, one per task + any review fixes.
- [ ] `src/lib/game/systems/` contains: conditions, morale, oxen, wagon, travel, water-purity, fire, death (plus consumption from Plan 1).
- [ ] `src/lib/game/content/` contains: conditions, landmarks (stub).
- [ ] `tickDay` in `engine.ts` is the composed-pipe version with per-day RNG.
- [ ] 30-day integration test reaches Fort Kearny and evolves all stats deterministically.
- [ ] Save file from Plan 1 still loads after `upgradeState` (existing `saves.test.ts` round-trips still pass; `deserialize` lets flags be absent — `upgradeState` fills them).

---

## Handoff to Plan 2b

Plan 2b builds on this with player-initiated actions:
- **Hunt / Gather** — choice-based (target + ammo; or pure gather if no rifles)
- **Camp** action — triggers nightly fire roll explicitly + enables shovel actions + Preacher service + Entertain
- **Shovel actions** (firepit, latrine, dig well, dig grave, dig out)
- **Rest** — multi-day stationary healing + foraging + Whore income
- **River Ford** — decision screen at river crossings (ford / caulk / ferry / wait)
- **Trading stub** — minimal buy/sell interface (full catalog in Plan 3)

Plan 2b uses a second RNG seed suffix: `makeRng('${seed}:action:${day}:${actionIndex}')` so player actions don't collide with tick-day determinism.
