# Ox Thirst (desert draft-animal hydration) — Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the draft team a per-ox `hydration` that drains on waterless desert legs and refills at real water; low hydration slows the team (recoverable), sustained near-empty kills it (lethal tail); mules tolerate the desert better than oxen.

**Architecture:** A new pure system `applyOxHydration(state)` (in `src/lib/game/systems/ox-hydration.ts`) runs each travel day in the engine pipeline right after `tickOxen`. It refills every alive animal to 100 on a watered day, drains per-animal on a dry desert day (ox −20, mule −13), and applies a ramping health drain below hydration 20. A derived `hydrationPaceMult` factors into `milesPerDay`. Legibility extends the existing ox UI (WagonPanel stat + chip, WagonModal bar). NPC parity rides the existing synth/project pattern in `npc-engine.ts`; bot/NPC pace easing rides the persona `pickPace` surface.

**Tech Stack:** SvelteKit 5, TypeScript, Vitest. Pure-function system pipeline (`engine.ts`). jj-colocated git. Sweep harness `scripts/persona-profession-sweep.ts`.

**Spec:** `docs/superpowers/specs/2026-06-08-ox-thirst-core-design.md`

**Key existing shapes (read before starting):**
- `Ox` interface — `src/lib/game/types.ts` (`{ id; health; fatigue; shod; kind? }`).
- `tickOxen` — `src/lib/game/systems/oxen.ts:114`; `HIGH_FATIGUE_THRESHOLD=80`, `OVERWORK_HEALTH_DRAIN=2`. The grain-feed mechanic in this file is **mule-only** — do NOT touch it; oxen graze free.
- Engine pipeline — `src/lib/game/engine.ts`: `tickOxen` at line ~209, `applyDehydration` at ~219.
- `milesPerDay` — `src/lib/game/systems/travel.ts:79`; returns `Math.round(base * terrain * oxen * ... * impairmentMult)`; already filters the alive team.
- Terrain type — `src/lib/game/types.ts:23`: `'prairie' | 'forest' | 'desert' | 'mountains' | 'river'`.
- Landmark water — `src/lib/game/content/landmarks.ts`: `waterSource?: boolean` (line 75); `kind: 'river'` for fords; `salmon_falls` is `terrain:'desert', waterSource:true` (the desert refill case); `state.location.atLandmarkId` + `state.location.terrain`.
- NPC ox tick — `src/lib/game/systems/npc-engine.ts:537` (`tickEngineOxen(synth, rng)` via synth/project); NPC dehydration block at ~647 (`applyEngineDehydration(synth)`). `synthesizeWagonState` carries `oxen` (wagon-synth.ts:155); `projectWagonDeltas` projects `oxen` back (line 201) — so `hydration` round-trips for free.
- Persona pace — `src/lib/game/ai/types.ts:79` `pickPace(state, rng)`; impls in `personas.ts` (cautious 582, aggressive 806, balanced 989, chaos 1242, +1414). Player-bot calls `persona.pickPace(state, botRng)` at `src/lib/dev/bot/runner.ts:820`.
- Dry-stretch helper — `projectedDryDaysToNextWater(state)` (module-local, `personas.ts:232`).
- UI — `WagonPanel.svelte` `ox-summary` row (❤ avg health, ⚡ avg fatigue, `⚠ thin grass` chip); `WagonModal.svelte` per-ox HEALTH (`#8bb96a`) + FATIGUE (`#c96a2a`) bars.

**No save migration** (project rule): the field is optional, read with `?? 100`; initialise to 100 only where oxen are *created/synthesised* if convenient, but never depend on it — `?? 100` is the contract.

---

### Task 1: `Ox.hydration` field + `ox-hydration.ts` constants and reader

**Files:**
- Modify: `src/lib/game/types.ts` (Ox interface)
- Create: `src/lib/game/systems/ox-hydration.ts`
- Test: `src/lib/game/systems/ox-hydration.test.ts`

- [ ] **Step 1: Add the field to the Ox interface**

In `src/lib/game/types.ts`, find the `Ox` interface and add `hydration` next to `fatigue`:

```ts
export interface Ox {
  id: string;
  health: number; // 0-100
  fatigue: number; // 0-100
  /** 0-100, 100 = freshly watered. Optional/legacy → read with `oxHydration()`. */
  hydration?: number;
  shod: boolean;
  kind?: DraftKind;
}
```

(Match the existing field order/comments in the real interface; only add the `hydration?` line.)

- [ ] **Step 2: Write the failing test for the reader + drain selector**

Create `src/lib/game/systems/ox-hydration.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { Ox } from '../types';
import {
  oxHydration,
  drainPerDayFor,
  OX_DRAIN_PER_DAY,
  MULE_DRAIN_PER_DAY
} from './ox-hydration';

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
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/lib/game/systems/ox-hydration.test.ts`
Expected: FAIL — module `./ox-hydration` not found.

- [ ] **Step 4: Create the module with constants + reader**

Create `src/lib/game/systems/ox-hydration.ts`:

```ts
import type { GameState, Ox } from '../types';

/** Per-day hydration loss on a dry desert leg. Ox ≈ 5-day runway. */
export const OX_DRAIN_PER_DAY = 20;
/** Mules tolerate the desert — the strategic edge (≈ 7-8 day runway). */
export const MULE_DRAIN_PER_DAY = 13;

/** ≥ this = green (no penalty). Below = amber (pace penalty). */
export const HYDRATION_AMBER = 50;
/** Below this = red (health drains, lethal tail). */
export const HYDRATION_RED = 20;

/** Hydration with the no-migration default applied. 100 = freshly watered. */
export function oxHydration(o: Ox): number {
  return o.hydration ?? 100;
}

/** Daily desert drain for one animal — mules tolerate it better. */
export function drainPerDayFor(o: Ox): number {
  return o.kind === 'mule' ? MULE_DRAIN_PER_DAY : OX_DRAIN_PER_DAY;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/lib/game/systems/ox-hydration.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
jj describe -m "feat(oxen): #1264 — Ox.hydration field + ox-hydration constants/reader"
```

---

### Task 2: `applyOxHydration` drain/refill + engine wiring

**Files:**
- Modify: `src/lib/game/systems/ox-hydration.ts`
- Modify: `src/lib/game/engine.ts` (pipeline, after `tickOxen`)
- Test: `src/lib/game/systems/ox-hydration.test.ts`

- [ ] **Step 1: Write the failing tests for the watered-day predicate + drain/refill**

Append to `src/lib/game/systems/ox-hydration.test.ts`:

```ts
import { applyOxHydration, isWateredDay } from './ox-hydration';
import type { GameState } from '../types';

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
  it('true at a river ford', () => {
    expect(isWateredDay(baseState({ location: { terrain: 'river', atLandmarkId: 'green_river' } as GameState['location'] }))).toBe(true);
  });
});

describe('applyOxHydration drain/refill', () => {
  it('drains ox -20 / mule -13 on a dry desert day', () => {
    const s = baseState({
      oxen: [
        { id: 'o', health: 100, fatigue: 0, shod: true, kind: 'ox', hydration: 100 },
        { id: 'm', health: 100, fatigue: 0, shod: true, kind: 'mule', hydration: 100 }
      ]
    });
    const out = applyOxHydration(s);
    expect(out.oxen[0].hydration).toBe(80);
    expect(out.oxen[1].hydration).toBe(87);
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
      oxen: [{ id: 'o', health: 100, fatigue: 0, shod: true, kind: 'ox', hydration: 10 }]
    });
    expect(applyOxHydration(s).oxen[0].hydration).toBe(0);
  });
  it('defaults a missing hydration to 100 before draining', () => {
    const s = baseState({
      oxen: [{ id: 'o', health: 100, fatigue: 0, shod: true, kind: 'ox' }]
    });
    expect(applyOxHydration(s).oxen[0].hydration).toBe(80);
  });
  it('does not mutate the input state', () => {
    const s = baseState({
      oxen: [{ id: 'o', health: 100, fatigue: 0, shod: true, kind: 'ox', hydration: 100 }]
    });
    applyOxHydration(s);
    expect(s.oxen[0].hydration).toBe(100);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/game/systems/ox-hydration.test.ts`
Expected: FAIL — `applyOxHydration` / `isWateredDay` not exported.

- [ ] **Step 3: Implement `isWateredDay` + `applyOxHydration` (drain/refill only)**

Add to `src/lib/game/systems/ox-hydration.ts` (the `getLandmark` import is the canonical landmark lookup):

```ts
import { getLandmark } from '../content/landmarks';

/**
 * True when the team can drink today: watered country (terrain ≠ desert),
 * or the current landmark is a river ford / flagged waterSource.
 * Mirrors the human dehydration "wet day" reset, but terrain/landmark-driven.
 * NOTE: human find_water / dig_well do NOT count — you can't water a
 * 60-80 gal/day team from a dug well. That exclusion is the strategic teeth.
 */
export function isWateredDay(state: GameState): boolean {
  if (state.location.terrain !== 'desert') return true;
  const id = state.location.atLandmarkId;
  if (!id) return false;
  const lm = getLandmark(id); // non-nullable; throws only on an unknown id
  return lm.kind === 'river' || lm.waterSource === true;
}

/**
 * Daily ox/mule hydration tick. Refill to 100 at water; drain per-animal
 * on a dry desert leg; floor at 0. (Health effects added in Task 3.)
 */
export function applyOxHydration(state: GameState): GameState {
  const watered = isWateredDay(state);
  const oxen = state.oxen.map((o) => {
    if (o.health <= 0) return o; // dead animals don't drink or drain
    if (watered) return { ...o, hydration: 100 };
    const next = Math.max(0, oxHydration(o) - drainPerDayFor(o));
    return { ...o, hydration: next };
  });
  return { ...state, oxen };
}
```

`getLandmark(id): Landmark` is the canonical lookup (`content/landmarks.ts:769`) — non-nullable, throws on an unknown id (safe: `atLandmarkId` is always a real id when set). `dehydration.ts` reads `state.location.terrain` directly with no landmark lookup — the terrain check here matches that.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/game/systems/ox-hydration.test.ts`
Expected: PASS (all Task 1 + Task 2 tests).

- [ ] **Step 5: Wire into the engine pipeline**

In `src/lib/game/engine.ts`, add the import near the other system imports:

```ts
import { applyOxHydration } from './systems/ox-hydration';
```

Find `tickOxen` in the pipeline array (≈ line 209) and insert `applyOxHydration` immediately after it, before `applyDehydration`:

```ts
  tickOxen,
  applyOxHydration,
  // ... existing systems ...
  applyDehydration,
```

(Match the surrounding array style — if entries are `(s) => fn(s)` wrappers, use `(s) => applyOxHydration(s)`; if bare function references, use `applyOxHydration`.)

- [ ] **Step 6: Run the full engine + system suite**

Run: `npx vitest run src/lib/game/systems src/lib/game/engine.test.ts`
Expected: PASS — no regressions from inserting the new pipeline step.

- [ ] **Step 7: Commit**

```bash
jj describe -m "feat(oxen): #1264 — applyOxHydration drain/refill + engine wiring"
```

---

### Task 3: Effects — pace penalty (milesPerDay) + lethal-tail health drain + log lines

**Files:**
- Modify: `src/lib/game/systems/ox-hydration.ts` (health drain + pace mult + log)
- Modify: `src/lib/game/systems/travel.ts` (`milesPerDay`)
- Test: `src/lib/game/systems/ox-hydration.test.ts`, `src/lib/game/systems/travel.test.ts`

- [ ] **Step 1: Write the failing tests for the health drain + pace mult + logs**

Append to `src/lib/game/systems/ox-hydration.test.ts`:

```ts
import { hydrationPaceMult } from './ox-hydration';

describe('lethal-tail health drain (<20)', () => {
  it('no health drain at or above 20', () => {
    const s = baseState({
      oxen: [{ id: 'o', health: 100, fatigue: 0, shod: true, kind: 'ox', hydration: 40 }]
    });
    expect(applyOxHydration(s).oxen[0].health).toBe(100); // 40-20=20, still not <20
  });
  it('drains health, ramping as hydration approaches 0', () => {
    // hydration 16 → after drain 0 → drain round((20-0)/4)=5
    const s = baseState({
      oxen: [{ id: 'o', health: 100, fatigue: 0, shod: true, kind: 'ox', hydration: 16 }]
    });
    const out = applyOxHydration(s);
    expect(out.oxen[0].hydration).toBe(0);
    expect(out.oxen[0].health).toBe(95);
  });
  it('a parched team sustained at 0 eventually dies (health floors at 0)', () => {
    let s = baseState({
      oxen: [{ id: 'o', health: 6, fatigue: 0, shod: true, kind: 'ox', hydration: 0 }]
    });
    s = applyOxHydration(s); // -5 → health 1
    s = applyOxHydration(s); // -5 → floored 0
    expect(s.oxen[0].health).toBe(0);
  });
  it('emits an amber log on first crossing into the dragging zone', () => {
    const s = baseState({
      oxen: [{ id: 'o', health: 100, fatigue: 0, shod: true, kind: 'ox', hydration: 60 }]
    });
    const out = applyOxHydration(s); // 60-20=40, crosses below 50
    expect(out.eventLog.some((e) => /want of water|flagging/i.test(e.text))).toBe(true);
  });
  it('emits a red log on first crossing into the failing zone', () => {
    const s = baseState({
      oxen: [{ id: 'o', health: 100, fatigue: 0, shod: true, kind: 'ox', hydration: 30 }]
    });
    const out = applyOxHydration(s); // 30-20=10, crosses below 20
    expect(out.eventLog.some((e) => /failing|find water/i.test(e.text))).toBe(true);
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
    // avg 35 → 0.7 + 0.3*(35-20)/30 = 0.85
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
```

The eventLog entry shape is `{ day: number; text: string }` (confirmed in `oxen.ts:187,209` — no `type` field). The test's `e.text` access is correct.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/game/systems/ox-hydration.test.ts`
Expected: FAIL — `hydrationPaceMult` not exported; health unchanged; no logs.

- [ ] **Step 3: Add health drain + log lines to `applyOxHydration`, and the pace mult**

Replace the `applyOxHydration` body in `ox-hydration.ts` so the dry branch also drains health below `HYDRATION_RED` and stamps stage logs. Use the same `eventLog` entry shape as `tickOxen` (read it first):

```ts
export function hydrationPaceMult(oxen: Ox[]): number {
  const alive = oxen.filter((o) => o.health > 0);
  if (alive.length === 0) return 1;
  const avg = alive.reduce((sum, o) => sum + oxHydration(o), 0) / alive.length;
  if (avg >= HYDRATION_AMBER) return 1;
  if (avg <= HYDRATION_RED) return 0.7;
  // lerp 1.0 @50 → 0.7 @20
  return 0.7 + 0.3 * ((avg - HYDRATION_RED) / (HYDRATION_AMBER - HYDRATION_RED));
}

export function applyOxHydration(state: GameState): GameState {
  const watered = isWateredDay(state);
  const logs: GameState['eventLog'] = [];
  const beforeMin = minAliveHydration(state.oxen);

  const oxen = state.oxen.map((o) => {
    if (o.health <= 0) return o;
    if (watered) return { ...o, hydration: 100 };
    const nextHyd = Math.max(0, oxHydration(o) - drainPerDayFor(o));
    let health = o.health;
    if (nextHyd < HYDRATION_RED) {
      const drain = Math.round((HYDRATION_RED - nextHyd) / 4); // ~5/day at 0
      health = Math.max(0, health - drain);
    }
    return { ...o, hydration: nextHyd, health };
  });

  const afterMin = minAliveHydration(oxen);
  // Stage-crossing logs (fire once on the day the team first crosses down).
  if (!watered) {
    if (beforeMin >= HYDRATION_AMBER && afterMin < HYDRATION_AMBER && afterMin >= HYDRATION_RED) {
      logs.push(makeOxLog(state, 'The team is flagging for want of water.'));
    }
    if (beforeMin >= HYDRATION_RED && afterMin < HYDRATION_RED) {
      logs.push(makeOxLog(state, 'The oxen are failing — find water.'));
    }
  }

  return { ...state, oxen, eventLog: [...state.eventLog, ...logs] };
}

function minAliveHydration(oxen: Ox[]): number {
  const alive = oxen.filter((o) => o.health > 0);
  if (alive.length === 0) return 100;
  return Math.min(...alive.map(oxHydration));
}
```

Add a `makeOxLog(state, text)` helper that builds the exact `eventLog` entry shape `tickOxen` uses — `{ day: state.day, text }` (confirmed `oxen.ts:187,209`; no other fields):

```ts
function makeOxLog(state: GameState, text: string): GameState['eventLog'][number] {
  return { day: state.day, text };
}
```

- [ ] **Step 4: Run to verify the system tests pass**

Run: `npx vitest run src/lib/game/systems/ox-hydration.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing `milesPerDay` test**

Append to `src/lib/game/systems/travel.test.ts` (match the existing helper/import style in that file):

```ts
import { hydrationPaceMult as _hpm } from './ox-hydration';

describe('milesPerDay honors ox hydration', () => {
  it('a parched team travels fewer miles than a watered one, all else equal', () => {
    const watered = makeTravelState({ /* desert leg, full team, hydration 100 */ });
    const parched = structuredClone(watered);
    parched.oxen = parched.oxen.map((o) => ({ ...o, hydration: 20 }));
    expect(milesPerDay(parched)).toBeLessThan(milesPerDay(watered));
  });
});
```

Build `watered` with the same factory the surrounding `milesPerDay` tests use (enough alive oxen ≥ `minTeam`, a travel terrain). Set `hydration: 100` on the watered team explicitly.

- [ ] **Step 6: Run to verify it fails**

Run: `npx vitest run src/lib/game/systems/travel.test.ts -t "honors ox hydration"`
Expected: FAIL — `milesPerDay` ignores hydration (equal miles).

- [ ] **Step 7: Wire `hydrationPaceMult` into `milesPerDay`**

In `src/lib/game/systems/travel.ts`, import and apply the multiplier in the final return:

```ts
import { hydrationPaceMult } from './ox-hydration';
// ...
  const hydrationMult = hydrationPaceMult(aliveTeam);
  return Math.round(base * terrain * oxen * wagon.baseSpeedMult * teamSpeedMult * load * guideMult * scoutMult * weatherMult * cowMult * impairmentMult * hydrationMult);
```

(`aliveTeam` already exists at the top of `milesPerDay`.)

- [ ] **Step 8: Run the travel + system suites**

Run: `npx vitest run src/lib/game/systems`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
jj describe -m "feat(oxen): #1264 — thirst effects: pace penalty + lethal-tail health drain + stage logs"
```

---

### Task 4: Legibility — WagonPanel 💧 stat + ⚠ parched chip, WagonModal WATER bar

**Files:**
- Modify: `src/lib/ui/WagonPanel.svelte`
- Modify: `src/lib/ui/WagonModal.svelte`

No unit tests (Svelte presentation) — verified in-browser at Step 4. Reuse `oxHydration` from `ox-hydration.ts` for the no-migration default.

- [ ] **Step 1: WagonPanel — add the 💧 avg-water stat + parched chip**

In `src/lib/ui/WagonPanel.svelte`, find the `ox-summary` block with `❤ {avgOxHealth}` / `⚡ {avgOxFatigue}`. Compute `avgOxWater` alongside the existing averages (alive oxen only, via `oxHydration`):

```svelte
<script lang="ts">
  import { oxHydration } from '$lib/game/systems/ox-hydration';
  // ... existing ...
  const aliveOxen = state.oxen.filter((o) => o.health > 0);
  const avgOxWater = aliveOxen.length
    ? Math.round(aliveOxen.reduce((s, o) => s + oxHydration(o), 0) / aliveOxen.length)
    : 100;
</script>
```

Add the stat next to health/fatigue:

```svelte
<span class="ox-stat">💧 {avgOxWater}</span>
```

Add a `⚠ parched` chip modelled exactly on the existing `⚠ thin grass` chip, fired when `avgOxWater < 30`:

```svelte
{#if avgOxWater < 30}
  <span class="ox-warn">⚠ parched</span>
{/if}
```

(Use the existing chip class/markup — copy the `thin grass` chip's structure and styling exactly; only swap the condition + label.)

- [ ] **Step 2: WagonModal — add a per-ox WATER bar**

In `src/lib/ui/WagonModal.svelte`, find the per-ox row rendering the HEALTH (`#8bb96a`) and FATIGUE (`#c96a2a`) bars. Add a third WATER bar (blue, depleting) using `oxHydration(o)` as the fill percent:

```svelte
<script lang="ts">
  import { oxHydration } from '$lib/game/systems/ox-hydration';
</script>

<!-- beside the HEALTH / FATIGUE bars, same bar markup -->
<div class="bar-row">
  <span class="bar-label">WATER</span>
  <div class="bar-track">
    <div class="bar-fill" style="width: {oxHydration(o)}%; background: #4a90c2;"></div>
  </div>
</div>
```

Match the exact bar markup/classes used by the HEALTH/FATIGUE bars in this file — copy one and change the label, percent source, and color.

- [ ] **Step 3: Run check (Svelte type-check)**

Run: `npm run check`
Expected: PASS — no Svelte/TS errors.

- [ ] **Step 4: Browser-verify the legibility (drycamp Snake scenario)**

Start a dev server and load a desert scenario, then drive a few dry days so hydration drops:

```bash
systemd-run --user --unit=ot-dev-1264 --working-directory=/home/eric/projects/hoosierTrail-1264 npm run dev -- --port 5191
```

Navigate to `http://localhost:5191/dev/scenario/at_hall` (Fort Hall — at the desert approach), advance several dry travel days, and confirm:
- WagonPanel shows `💧 <n>` decreasing each dry day, and a `⚠ parched` chip appears under ~30.
- WagonModal shows the per-ox WATER bar depleting (blue), independent of HEALTH/FATIGUE.
- At a river/Salmon Falls, `💧` snaps back to 100.

Take a screenshot for the PR. Stop the server: `systemctl --user stop ot-dev-1264`.

- [ ] **Step 5: Commit**

```bash
jj describe -m "feat(ui): #1264 — ox water legibility (WagonPanel 💧 + parched chip, WagonModal WATER bar)"
```

---

### Task 5: Bot / NPC parity + thirst-aware pace easing

**Files:**
- Modify: `src/lib/game/systems/npc-engine.ts` (synth/project hydration block)
- Modify: `src/lib/game/ai/personas.ts` (`pickPace` easing, persona-flavored)
- Test: `src/lib/game/systems/npc-engine.test.ts` (or the nearest NPC-tick test file), `src/lib/game/ai/personas.test.ts`

- [ ] **Step 1: Write the failing NPC-parity test**

Find the NPC desert-tick test pattern (grep `applyEngineDehydration` usage in tests, or the `npc-engine` test file). Add a test that an NPC wagon on a dry desert travel day loses ox hydration:

```ts
it('#1264 — NPC ox team loses hydration on a dry desert travel day', () => {
  const wagon = makeNpcWagon({ /* desert env, traveled:true, oxen hydration 100 */ });
  const env = makeTrainEnv({ terrain: 'desert' /* no waterSource landmark */ });
  const out = tickNpcDay(wagon, env, makeRng());
  expect(out.wagon.oxen[0].hydration).toBeLessThan(100);
});
```

Use the existing NPC-tick test factories in that file (`makeNpcWagon` / `tickNpcDay` or whatever the file already calls). Mirror an existing dehydration NPC test as the template.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/game/systems/npc-engine.test.ts -t "1264"`
Expected: FAIL — NPC hydration unchanged (no NPC hydration tick yet).

- [ ] **Step 3: Add the NPC synth/project hydration block**

In `src/lib/game/systems/npc-engine.ts`, add the import beside `applyEngineDehydration`:

```ts
import { applyOxHydration as applyEngineOxHydration } from './ox-hydration';
```

Insert a synth/project block right after the travel ox-tick (the `if (traveled) { ... tickEngineOxen ... }` block ≈ line 537), mirroring the dehydration block at ~647. Run it on travel days (drain) — and it self-refills via `isWateredDay` on watered terrain:

```ts
  // 5a. #1264 — ox hydration drain/refill (desert thirst). Synth/project
  // like the dehydration tick; isWateredDay handles refill at water.
  if (traveled) {
    const synth = synthesizeWagonState(next, env);
    const ticked = applyEngineOxHydration(synth);
    next = projectWagonDeltas(ticked, next);
    for (const entry of ticked.eventLog) {
      playerLogs.push(`${entry.text} (${next.name})`);
    }
  }
```

(Confirm `synth.location.terrain` / `atLandmarkId` are populated by `synthesizeWagonState` from `env` so `isWateredDay` reads correctly — check how the dehydration block's terrain gets set; reuse the same env→location mapping.)

- [ ] **Step 4: Run to verify the NPC test passes**

Run: `npx vitest run src/lib/game/systems/npc-engine.test.ts -t "1264"`
Expected: PASS.

- [ ] **Step 5: Write the failing pace-easing tests**

In `src/lib/game/ai/personas.test.ts`, add (using the existing persona test factories — `getPersona('cautious')`, a desert state with a dry stretch ahead + a parched team):

```ts
describe('#1264 thirst-aware pace easing', () => {
  it('cautious eases off fast/grueling when the team is parched with a dry stretch ahead', () => {
    const s = makeDesertState({ paceWanted: 'fast', dryAhead: true, oxHydration: 25 });
    expect(getPersona('cautious').pickPace(s, makeRng())).not.toBe('grueling');
    expect(['moderate', 'slow']).toContain(getPersona('cautious').pickPace(s, makeRng()));
  });
  it('pace_pusher grinds the parched team anyway (characterful)', () => {
    const s = makeDesertState({ paceWanted: 'fast', dryAhead: true, oxHydration: 25 });
    const pace = getPersona('pace_pusher').pickPace(s, makeRng());
    expect(['fast', 'grueling']).toContain(pace);
  });
});
```

The pace union is `Pace = 'slow' | 'moderate' | 'fast' | 'grueling'` (`types.ts:6` — no `'steady'`). Build `makeDesertState` from existing persona-test helpers so `projectedDryDaysToNextWater(s) > 0` and the team's avg hydration is ~25.

- [ ] **Step 6: Run to verify it fails**

Run: `npx vitest run src/lib/game/ai/personas.test.ts -t "1264"`
Expected: FAIL — pace not eased.

- [ ] **Step 7: Add the easing helper + wire into the persona pickPace impls**

In `personas.ts`, add a module-local helper near `projectedDryDaysToNextWater` (line 232):

```ts
import { oxHydration, HYDRATION_AMBER } from '../systems/ox-hydration';

/** True when the team is parched AND a dry stretch still lies ahead — the
 *  cue to ease off a grinding pace (you can't rest-recover hydration with
 *  no water; the only lever is not over-pushing toward the next source). */
function thirstWantsEasedPace(state: GameState): boolean {
  const alive = state.oxen.filter((o) => o.health > 0);
  if (alive.length === 0) return false;
  const avg = alive.reduce((s, o) => s + oxHydration(o), 0) / alive.length;
  return avg < HYDRATION_AMBER && projectedDryDaysToNextWater(state) > 0;
}

/** Downgrade a grinding pace one rung to protect a parched team. */
function easeThirstPace(pace: GameState['pace']): GameState['pace'] {
  // Pace union: 'slow' | 'moderate' | 'fast' | 'grueling' (types.ts:6).
  if (pace === 'grueling') return 'fast';
  if (pace === 'fast') return 'moderate';
  return pace;
}
```

Wire into the **team-protecting** archetypes' `pickPace` (cautious ≈582, balanced ≈989, and the variant at ≈1414 if it protects): compute the base pace first, then ease:

```ts
  pickPace(state, rng) {
    const base = /* existing pickPace logic → */;
    return thirstWantsEasedPace(state) ? easeThirstPace(base) : base;
  },
```

Leave **aggressive (≈806) and pace_pusher** untouched (they grind — characterful, die more). For **chaos (≈1242)** leave as-is (ignores it). Match each persona's existing return structure; only add the trailing ease wrap to the protectors.

- [ ] **Step 8: Run to verify the pace tests pass**

Run: `npx vitest run src/lib/game/ai/personas.test.ts -t "1264"`
Expected: PASS — cautious eased, pace_pusher grinds.

- [ ] **Step 9: Confirm the player-bot inherits it (no code change)**

The player-bot calls `persona.pickPace(state, botRng)` at `src/lib/dev/bot/runner.ts:820`, so the easing applies for free. Grep to confirm no second pace path bypasses `pickPace`:

Run: `grep -rn "pace:" src/lib/dev/bot/runner.ts`
Expected: the only travel-day pace assignment is via `persona.pickPace(...)`.

- [ ] **Step 10: Full system + AI suite**

Run: `npx vitest run src/lib/game`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
jj describe -m "feat(ai): #1264 — NPC ox-hydration parity + thirst-aware pace easing (protectors ease, pushers grind)"
```

---

### Task 6: Full verify + BEFORE/AFTER sweep gate + tune

**Files:** none (validation + tuning of the Task 1-3 constants only if the gate fails)

- [ ] **Step 1: Full verify**

Run: `npm run verify`
Expected: PASS (svelte-check + full vitest, ~2581+ tests).

- [ ] **Step 2: AFTER sweep (this branch)**

Run the 6-shape sweep at `--runs 2` with a tagged seed alignment:

```bash
npx tsx scripts/persona-profession-sweep.ts --runs 2 --shapes 3/0,4/0,2/2,2/4,4/2,3/3 --tag ox-thirst-1264 > /tmp/sweep-after-1264.log 2>&1
```

- [ ] **Step 3: BEFORE sweep (master baseline, same tag/seeds)**

From the default workspace on master (or `jj new master` in a scratch workspace), run the identical command to `/tmp/sweep-before-1264.log`. (Reuse the established BEFORE/AFTER stash-restore pattern — same `--tag`, same `--runs 2`, same shapes.)

- [ ] **Step 4: Compare against the gate**

Read both logs. The gate (PASS criteria from the spec):
- Arrival on the **dry shapes** (the ones that reach the Snake worn) dips **modestly** — the desert got harder — but does NOT crater.
- Wiped% does **not spike for a prepared run** (fresh team / mules + sane pace still crosses).
- Report the **ox-death share** of the death mix: it should rise from ~0 toward a non-trivial historical share (the engine modelled no ox thirst before this).

- [ ] **Step 5: Tune if needed (only the constants)**

If arrival craters or wiped% spikes for prepared runs: lower `OX_DRAIN_PER_DAY` (longer runway) and/or raise the health-drain divisor (gentler tail) in `ox-hydration.ts`, re-run Step 2 + Step 4. If the desert doesn't bite at all (ox-death share still ~0): raise `OX_DRAIN_PER_DAY`. Keep `MULE_DRAIN_PER_DAY` meaningfully below the ox value (the strategic edge). Re-verify (`npm run verify`) after any constant change. Record the chosen numbers + the BEFORE/AFTER per-shape table in the PR body.

- [ ] **Step 6: Commit any tuning + push + PR**

```bash
jj bookmark set feat/1264-ox-thirst -r @
jj git push --bookmark feat/1264-ox-thirst
# from the default workspace (jj workspaces have no .git):
gh pr create -R ericbond007/ot-revisited --title "feat: #1264 ox thirst — desert draft-animal hydration (core)" --body "..."
```

PR body: summary of the mechanic, the BEFORE/AFTER per-shape table + ox-death share, the chosen `DRAIN_PER_DAY` values, and the deferred follow-ons (#1145 route, timing, hauling). End with the Co-Authored-By + 🤖 Generated lines.

- [ ] **Step 7: Final review + merge**

Dispatch the final code reviewer over the whole branch, then merge once green (per the merge-self rule). Mark VK #1264 In Progress on PR open, Shipped on merge.

---

## Self-review (author)

- **Spec coverage:** state+default (T1) ✓ · drain/refill + dig-well exclusion via `isWateredDay` (T2) ✓ · effects slow→lethal tail (T3) ✓ · mule edge (`MULE_DRAIN_PER_DAY`, T1/T2) ✓ · engine wiring (T2) ✓ · legibility panel chip + modal bar + logs (T3 logs, T4 UI) ✓ · bot/NPC pace + NPC parity (T5) ✓ · tests + sweep gate (T1-3, T6) ✓.
- **Type/name consistency:** `hydration`, `oxHydration`, `applyOxHydration`, `isWateredDay`, `drainPerDayFor`, `hydrationPaceMult`, `OX_DRAIN_PER_DAY`/`MULE_DRAIN_PER_DAY`, `HYDRATION_AMBER=50`/`HYDRATION_RED=20` used identically across tasks.
- **No double-count:** ox hydration is its own track (terrain/landmark reset) — independent of the human keg + human `applyDehydration` (keg reset). Confirmed in T2 `isWateredDay` (does not read keg / find_water / dig_well).
- **Resolved codebase facts (baked in):** `getLandmark(id)` lookup (non-nullable, `landmarks.ts:769`); `eventLog` entry shape `{ day, text }` (`oxen.ts:187,209`); pace union `'slow'|'moderate'|'fast'|'grueling'` (`types.ts:6`). One remaining implementer check: that `synthesizeWagonState` populates `synth.location.terrain`/`atLandmarkId` from `env` so `isWateredDay` reads right in the NPC block — verify against the dehydration synth block (npc-engine.ts:647).
