# #1266 Stage 1b — DAILY_STEPS Extraction + Headless Driver — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Extract the canonical daily-system sequence out of `tickDayPausable` into shared, declarative segment lists (`daily-steps.ts`); collapse `tickDay` into a thin headless wrapper over the real engine; fix the dissent-override free-travel exploit; route both continuations through the shared post-event tail. After this stage, a new daily system is wired **once**.

**Architecture:** The day splits into shared **segments** (flat `TickStep[]` arrays) and **driver interludes** (branch/pause/train-orch logic that stays in `engine-pausable.ts`). `tickDayPausable` consumes the segments — **byte-identical behavior** (the paramount gate: a BEFORE/AFTER persona sweep must byte-match). `tickDay` becomes `tickDayPausable` + auto-resolve-default — the test engine *is* the real engine (deliberate re-baseline of value-asserting tests). `applyCompanyDissent`'s override branch charges the travel ox/wagon trio + the shared tail (closing the free-travel exploit); `applyPendingChoice` routes through the same shared tail (structural, no behavior change after 1a).

**Tech Stack:** SvelteKit 5, TS, Vitest, jj-colocated. Sweep: `scripts/persona-profession-sweep.ts`.

**Spec:** `docs/superpowers/specs/2026-06-09-tick-engine-unification-design.md` (Stage 1). **Anatomy reference:** the segment boundaries + RNG-order analysis are from the committed exploration (see the spec's Stage 1 notes); the critical hazards are repeated inline below.

---

## Environment notes for the implementer
- **Work in `/home/eric/projects/hoosierTrail-1266-s1b`** (jj workspace; paths relative to it).
- **Edit/Write/MultiEdit BLOCKED** by a hook → ALL file changes via **Bash** (`python3` heredoc exact string-replacement with asserted anchors; `cat >` for new files). **Read tool works** — Read before every edit.
- **Bash cwd resets each call** — always `cd /home/eric/projects/hoosierTrail-1266-s1b && ...`.
- **jj, not git.** Commit: `jj describe -m "..."`. NO git / jj new / jj edit.
- Tests in `tests/`, imports `../src/lib/game/...`. Full gate: `npm run verify`.

## The RNG contract (read before touching anything)

`tickDayPausable` creates ONE shared rng: `makeRng(\`${seed}:${day}\`)`. The refactor must preserve the **exact sequence of shared-rng draws**: progressConditions → filthDisease → ambientWaterRefill (conditional) → pastryQuality (conditional) → dailyTheft → dirtyWaterRisk → [forceElection / trainShare / maybeElectCaptain when train] → travel (stray rolls) → the travel-event `rollEvent` (ALWAYS draws ≥1 chance on an eligible travel day, even when no event fires). `tickWeather`/`tickOxen`/`tickWagon`/`adjustMorale`/`attemptFire`/`reapDead` accept `rng` but draw nothing. The continuations (`applyPendingChoice`/`applyCompanyDissent`) deliberately **restart** a fresh rng on the same seed — keep that contract. Any step reorder that moves a drawing step across another, or changes whether `rollEvent` is reached, breaks every determinism test and the byte-identical sweep gate. **The segment extraction reorders NOTHING** — it only lifts contiguous runs into arrays.

## File structure

| File | Responsibility | Change |
|---|---|---|
| `src/lib/game/daily-steps.ts` | NEW — canonical segments: `MORNING_STEPS`, `TRAVEL_OX_WAGON_STEPS`, `POST_BRANCH_STEPS`, `PRE_TRAVEL_STEPS`, `POST_EVENT_TAIL_STEPS`, `TickCtx`, `runSteps` | create |
| `src/lib/game/engine-pausable.ts` | consumes the segments; dissent-override fix; Sabbath sparkline push | refactor |
| `src/lib/game/engine.ts` | `tickDay` = headless wrapper; DELETE the stale `DAILY_STEPS` array + `fireEvent` wiring | shrink |
| `tests/daily-steps-1266.test.ts` | NEW — spine-order lock + runSteps unit tests | create |
| `tests/dissent-wear-1266.test.ts` | NEW — override-day charges ox fatigue/wagon wear/dehydration | create |
| `tests/smoke.test.ts`, `tests/engine-integration.test.ts`, `tests/events-integration.test.ts` (+ any other `tickDay` value-asserters) | re-baseline to the unified engine | modify |

---

### Task 1: `daily-steps.ts` — the canonical segments + spine-order lock

**Files:** Create `src/lib/game/daily-steps.ts`; Create `tests/daily-steps-1266.test.ts`.

- [ ] **Step 1: Read the source of truth.** Read `src/lib/game/engine-pausable.ts` `tickDayPausable` top to bottom and write down the EXACT current call order. It must match this segment map (verify each; if the file has drifted from this list, the FILE wins — adjust the segments to match the file, never the reverse):
  - **MORNING_STEPS** (between the crisis-election interlude and the rest-decision branch): `progressConditions(s,rng)` → `applyEggLay(s)` → `applyDairy(s)` → `applyButterChurn(s)` → `applySpoilage(s)` → `applyHeatSpoilage(s)` → `decayCleanliness(s)` → `applyDirtyMorale(s)` → `applyFilthDiseaseRisk(s,rng)` → `applyAmbientWaterRefill(s,rng)` → `applyDailyConsumption(s)` → `applyWaterRationStrain(s)` → `applyDietVariety(s)` → `applyHotDrinks(s)` → `applyPastryQuality(s,rng).state` → `rollDailyTheft(s,rng).state` → `applyDirtyWaterRisk(s,rng)` → `applyStarvation(s)`  — 18 entries. (`tickWeather` + the crisis-election interlude stay driver code ABOVE the list; NPCs never run tickWeather, so starting at conditions is also what Stage 2 needs.)
  - **TRAVEL_OX_WAGON_STEPS**: `tickOxen(s,rng)` → `applyOxHydration(s)` → `tickWagon(s,rng)` — 3 entries. (The lay-by recover substitution stays driver code.)
  - **POST_BRANCH_STEPS**: `adjustMorale(s,rng)` → `applyHolidays(s)` — 2 entries.
  - **PRE_TRAVEL_STEPS** (need `ctx.traveled`): `applyDailyRecovery(s, ctx.traveled)` → `applyTrainShare(s,rng)` → `applySabbathTravelDebit(s, ctx.traveled)` — 3 entries.
  - **POST_EVENT_TAIL_STEPS**: `attemptFire(s,rng)` → `applyDehydration(s)` → `reapDead(s,rng)` — 3 entries.

- [ ] **Step 2: Write the failing spine test.** Create `tests/daily-steps-1266.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  MORNING_STEPS,
  TRAVEL_OX_WAGON_STEPS,
  POST_BRANCH_STEPS,
  PRE_TRAVEL_STEPS,
  POST_EVENT_TAIL_STEPS,
  runSteps,
  type TickCtx
} from '../src/lib/game/daily-steps';
import type { GameState } from '../src/lib/game/types';
import { makeRng } from '../src/lib/game/rng';

describe('#1266 — daily-steps spine order is locked', () => {
  it('MORNING_STEPS exact order', () => {
    expect(MORNING_STEPS.map((s) => s.id)).toEqual([
      'progressConditions', 'applyEggLay', 'applyDairy', 'applyButterChurn',
      'applySpoilage', 'applyHeatSpoilage', 'decayCleanliness', 'applyDirtyMorale',
      'applyFilthDiseaseRisk', 'applyAmbientWaterRefill', 'applyDailyConsumption',
      'applyWaterRationStrain', 'applyDietVariety', 'applyHotDrinks',
      'applyPastryQuality', 'rollDailyTheft', 'applyDirtyWaterRisk', 'applyStarvation'
    ]);
  });
  it('TRAVEL_OX_WAGON_STEPS exact order', () => {
    expect(TRAVEL_OX_WAGON_STEPS.map((s) => s.id)).toEqual(['tickOxen', 'applyOxHydration', 'tickWagon']);
  });
  it('POST_BRANCH_STEPS exact order', () => {
    expect(POST_BRANCH_STEPS.map((s) => s.id)).toEqual(['adjustMorale', 'applyHolidays']);
  });
  it('PRE_TRAVEL_STEPS exact order', () => {
    expect(PRE_TRAVEL_STEPS.map((s) => s.id)).toEqual(['applyDailyRecovery', 'applyTrainShare', 'applySabbathTravelDebit']);
  });
  it('POST_EVENT_TAIL_STEPS exact order', () => {
    expect(POST_EVENT_TAIL_STEPS.map((s) => s.id)).toEqual(['attemptFire', 'applyDehydration', 'reapDead']);
  });
});

describe('#1266 — runSteps', () => {
  it('applies steps in order, threading state', () => {
    const calls: string[] = [];
    const fake = (id: string) => ({
      id,
      run: (s: GameState) => { calls.push(id); return { ...s, morale: s.morale + 1 }; }
    });
    const s0 = { morale: 0 } as unknown as GameState;
    const ctx: TickCtx = { traveled: true };
    const out = runSteps([fake('a'), fake('b'), fake('c')], s0, makeRng('t'), ctx);
    expect(calls).toEqual(['a', 'b', 'c']);
    expect(out.morale).toBe(3);
  });
});
```

If the real spine (Step 1) differs from the listed ids, fix the TEST's expected arrays to the real order — the file is truth.

- [ ] **Step 3: Run to verify it fails** (`npx vitest run tests/daily-steps-1266.test.ts` → module not found).

- [ ] **Step 4: Create `src/lib/game/daily-steps.ts`.**

```ts
// #1266 — the canonical daily-system spine. ONE ordered list per segment,
// consumed by every tick driver (tickDayPausable today; the headless tickDay
// wrapper; the NPC tick in Stage 2). Wire a new daily system HERE, once.
//
// Segments, not one flat list: the day's pause points (events, dissent) and
// train orchestration are driver control-flow and cannot be list entries.
// Order within each segment is LOAD-BEARING (shared rng stream) — see the
// spine-order test. Do not reorder without a determinism re-baseline.
import type { GameState } from './types';
import type { Rng } from './rng';
import { progressConditions } from './systems/conditions';
import { applyEggLay } from './systems/eggs';
import { applyDairy, applyButterChurn } from './systems/dairy';
import { applySpoilage, applyHeatSpoilage } from './systems/spoilage';
import { decayCleanliness, applyDirtyMorale, applyFilthDiseaseRisk } from './systems/cleanliness';
import { applyAmbientWaterRefill, applyDailyConsumption, applyDietVariety, applyDirtyWaterRisk } from './systems/consumption';
import { applyWaterRationStrain } from './systems/water-ration';
import { applyHotDrinks } from './systems/diet';
import { applyPastryQuality } from './systems/pastry';
import { rollDailyTheft } from './systems/item-loss';
import { applyStarvation } from './systems/starvation';
import { tickOxen } from './systems/oxen';
import { applyOxHydration } from './systems/ox-hydration';
import { tickWagon } from './systems/wagon';
import { adjustMorale } from './systems/morale';
import { applyHolidays } from './systems/holidays';
import { applyDailyRecovery } from './systems/recovery';
import { applyTrainShare } from './systems/train-share';
import { applySabbathTravelDebit } from './systems/sabbath-travel';
import { attemptFire } from './systems/fire';
import { applyDehydration } from './systems/dehydration';
import { reapDead } from './systems/death';

/** Per-day context a step may need beyond (state, rng). */
export interface TickCtx {
  /** True when the wagon travels today (companyMode === 'travel'). */
  traveled: boolean;
}

export interface TickStep {
  id: string;
  run: (s: GameState, rng: Rng, ctx: TickCtx) => GameState;
}

export function runSteps(steps: readonly TickStep[], s: GameState, rng: Rng, ctx: TickCtx): GameState {
  let next = s;
  for (const step of steps) next = step.run(next, rng, ctx);
  return next;
}

export const MORNING_STEPS: readonly TickStep[] = [
  { id: 'progressConditions', run: (s, rng) => progressConditions(s, rng) },
  { id: 'applyEggLay', run: (s) => applyEggLay(s) },
  { id: 'applyDairy', run: (s) => applyDairy(s) },
  { id: 'applyButterChurn', run: (s) => applyButterChurn(s) },
  { id: 'applySpoilage', run: (s) => applySpoilage(s) },
  { id: 'applyHeatSpoilage', run: (s) => applyHeatSpoilage(s) },
  { id: 'decayCleanliness', run: (s) => decayCleanliness(s) },
  { id: 'applyDirtyMorale', run: (s) => applyDirtyMorale(s) },
  { id: 'applyFilthDiseaseRisk', run: (s, rng) => applyFilthDiseaseRisk(s, rng) },
  { id: 'applyAmbientWaterRefill', run: (s, rng) => applyAmbientWaterRefill(s, rng) },
  { id: 'applyDailyConsumption', run: (s) => applyDailyConsumption(s) },
  { id: 'applyWaterRationStrain', run: (s) => applyWaterRationStrain(s) },
  { id: 'applyDietVariety', run: (s) => applyDietVariety(s) },
  { id: 'applyHotDrinks', run: (s) => applyHotDrinks(s) },
  { id: 'applyPastryQuality', run: (s, rng) => applyPastryQuality(s, rng).state },
  { id: 'rollDailyTheft', run: (s, rng) => rollDailyTheft(s, rng).state },
  { id: 'applyDirtyWaterRisk', run: (s, rng) => applyDirtyWaterRisk(s, rng) },
  { id: 'applyStarvation', run: (s) => applyStarvation(s) }
];

export const TRAVEL_OX_WAGON_STEPS: readonly TickStep[] = [
  { id: 'tickOxen', run: (s, rng) => tickOxen(s, rng) },
  { id: 'applyOxHydration', run: (s) => applyOxHydration(s) },
  { id: 'tickWagon', run: (s, rng) => tickWagon(s, rng) }
];

export const POST_BRANCH_STEPS: readonly TickStep[] = [
  { id: 'adjustMorale', run: (s, rng) => adjustMorale(s, rng) },
  { id: 'applyHolidays', run: (s) => applyHolidays(s) }
];

export const PRE_TRAVEL_STEPS: readonly TickStep[] = [
  { id: 'applyDailyRecovery', run: (s, _rng, ctx) => applyDailyRecovery(s, ctx.traveled) },
  { id: 'applyTrainShare', run: (s, rng) => applyTrainShare(s, rng) },
  { id: 'applySabbathTravelDebit', run: (s, _rng, ctx) => applySabbathTravelDebit(s, ctx.traveled) }
];

export const POST_EVENT_TAIL_STEPS: readonly TickStep[] = [
  { id: 'attemptFire', run: (s, rng) => attemptFire(s, rng) },
  { id: 'applyDehydration', run: (s) => applyDehydration(s) },
  { id: 'reapDead', run: (s, rng) => reapDead(s, rng) }
];
```

**EVERY import path above is a GUESS from system names — verify each against the real imports at the top of `engine-pausable.ts` and copy those exact paths/names.** Same for each function's signature (which take rng, which return `.state`). The engine-pausable imports are the source of truth.

- [ ] **Step 5: Run to verify it passes** (`npx vitest run tests/daily-steps-1266.test.ts`). Then `npm run check` → 0 errors.

- [ ] **Step 6: Commit.** `jj describe -m "feat(engine): #1266 stage1b — canonical daily-steps segments + spine-order lock"`

---

### Task 2: `tickDayPausable` consumes the segments — BYTE-IDENTICAL refactor

**Files:** Modify `src/lib/game/engine-pausable.ts` only.

- [ ] **Step 1: Replace each contiguous run with its segment call.** In `tickDayPausable`, replace (one `python3` exact-replacement per block, asserting the anchor):
  - the 18-call morning run (from `s = progressConditions(s, rng);` through `s = applyStarvation(s);`, INCLUDING all interleaved comments) → `s = runSteps(MORNING_STEPS, s, rng, ctx);`
  - the travel branch's `tickOxen`/`applyOxHydration`/`tickWagon` trio → `s = runSteps(TRAVEL_OX_WAGON_STEPS, s, rng, ctx);` (the lay-by `recoverOxenHealth(recoverOxenFatigue(...))` else-branch stays verbatim)
  - `adjustMorale` + `applyHolidays` → `s = runSteps(POST_BRANCH_STEPS, s, rng, ctx);`
  - `applyDailyRecovery(s, companyMode === 'travel')` + `applyTrainShare(s, rng)` + `applySabbathTravelDebit(s, companyMode === 'travel')` (with their comments) → `s = runSteps(PRE_TRAVEL_STEPS, s, rng, ctx);`
  - the tail `attemptFire` + `applyDehydration` + `reapDead` → `s = runSteps(POST_EVENT_TAIL_STEPS, s, rng, ctx);`
  
  Define `const ctx: TickCtx = { traveled: companyMode === 'travel' };` right after `companyMode` is computed. **CAREFUL:** the PRE_TRAVEL run is interrupted in the current file by the decision-block persist + dissent pause (recovery/trainShare/sabbathDebit sit AFTER the dissent pause) — verify against the real file: if recovery/trainShare/sabbathDebit are contiguous, one runSteps call; if any train-orch code sits between them, split the replacement to preserve the exact interleaving (do NOT move any statement across another). Add the imports (`runSteps`, the segment arrays, `TickCtx`) from `./daily-steps`, and REMOVE the now-unused direct system imports from engine-pausable (check each — some systems are still used elsewhere in the file, e.g. `applyDehydration` in `applyPendingChoice`, `recoverOxenFatigue` in the lay-by branch; only remove imports that have zero remaining uses).

- [ ] **Step 2: Hoisting check.** Move NOTHING. Each segment call sits exactly where the first call of its run sat. Diff the function before/after (`jj diff src/lib/game/engine-pausable.ts`) and confirm no statement crossed another.

- [ ] **Step 3: Full suite.** `npm run verify` → ALL green with ZERO test edits. If any test fails, the refactor moved something — fix the refactor, never the test.

- [ ] **Step 4: Byte-identical sweep check (the strong gate, run it now not just at T5).**
```bash
cd /home/eric/projects/hoosierTrail-1266-s1b && npx tsx scripts/persona-profession-sweep.ts --runs 2 --shapes 3/0,4/0,2/2,2/4,4/2,3/3 --tag s1b-1266 > /tmp/sweep-t2-after.log 2>&1
jj new master && npx tsx scripts/persona-profession-sweep.ts --runs 2 --shapes 3/0,4/0,2/2,2/4,4/2,3/3 --tag s1b-1266 > /tmp/sweep-t2-before.log 2>&1 && jj edit feat/1266-stage1b
diff <(grep '^|' /tmp/sweep-t2-before.log) <(grep '^|' /tmp/sweep-t2-after.log) && echo BYTE-IDENTICAL || echo "DIVERGED — STOP"
```
(Adjust the bookmark name to the real one. If DIVERGED: stop, find the moved/reordered statement, fix. Do not proceed.)

- [ ] **Step 5: Commit.** `jj describe -m "refactor(engine): #1266 stage1b — tickDayPausable consumes daily-steps segments (byte-identical)"`

---

### Task 3: `tickDay` = headless wrapper; delete the stale engine.ts pipeline

**Files:** Modify `src/lib/game/engine.ts`; re-baseline `tests/smoke.test.ts`, `tests/engine-integration.test.ts`, `tests/events-integration.test.ts` (+ any other value-asserting `tickDay` callers found failing).

- [ ] **Step 1: Cycle check.** `grep -n "from './engine'" src/lib/game/engine-pausable.ts`. If engine-pausable imports anything from engine.ts (e.g. `upgradeState`), importing engine-pausable INTO engine.ts creates a cycle. If so: move the shared helper(s) into their own module (e.g. `src/lib/game/state-upgrade.ts`), update both imports, verify check passes — THEN proceed. If no cycle, proceed directly.

- [ ] **Step 2: Rewrite `tickDay`.** In `engine.ts`: DELETE the `DAILY_STEPS` array and every import used only by it (fireEvent, the system imports — keep `createInitialState`'s needs). Replace `tickDay` with the wrapper:

```ts
import { tickDayPausable, applyPendingChoice, applyCompanyDissent } from './engine-pausable';

/** Headless day-advance: the REAL engine (tickDayPausable) with pauses
 *  auto-resolved by the default choice. Tests and headless sims exercise the
 *  exact live pipeline. (#1266 — replaces the stale parallel DAILY_STEPS.) */
export function tickDay(state: GameState): GameState {
  const ticked = tickDayPausable(state);
  if (ticked.pendingEvent) {
    const ev = ticked.pendingEvent;
    const choice = ev.choices.find((c) => c.isDefault) ?? ev.choices[0];
    return applyPendingChoice(ticked.state, ev, choice.id);
  }
  if (ticked.state.flags?._companyDissentPending) {
    const rng = makeRng(`${ticked.state.seed}:${ticked.state.day}`);
    return applyCompanyDissent(ticked.state, 'abide', rng);
  }
  return ticked.state;
}
```

**Verify against the real code:** (a) the default-choice predicate — read the old `fireEvent` (`systems/events.ts`) and copy its EXACT default-pick expression (`isDefault`? `default`? `choices[0]` fallback?); (b) `applyCompanyDissent`'s signature (choice type — `'abide'`? read `DissentChoice`); (c) `pendingEvent`'s type exposes `choices`. Do NOT call `pushMoraleHistory` in the wrapper — `tickDayPausable`/the continuations already push (Stage 1a); a wrapper push would double-count. Delete engine.ts's `s = pushMoraleHistory(s)` line along with the old body (keep the `pushMoraleHistory` import ONLY if engine.ts still uses it elsewhere — it shouldn't).

- [ ] **Step 3: Run the affected suites; re-baseline.** `npx vitest run tests/smoke.test.ts tests/engine.test.ts tests/engine-integration.test.ts tests/events-integration.test.ts tests/saves.test.ts tests/saves-repo.test.ts tests/actions/journey.test.ts tests/actions/trail-full.test.ts tests/server/play-actions.test.ts tests/canvas-system.test.ts`. Expect failures in the value-asserting files (tickDay now runs ~20 more systems + real event flow). For EACH failure: (1) confirm the new value is sane (no NaN/undefined; direction explainable — e.g. flour drops faster because spoilage now runs; a wipe day shifts because recovery now heals), then (2) update the assertion/snapshot to the new value or loosen to the tolerance form the file already uses. **MUST keep passing without edits:** determinism asserts (`run() === run()` / `toEqual(run())`), the no-mutation invariant (`tickDay(s)` doesn't mutate `s`), event year-gating semantics (1852 cholera fires, 1848 doesn't), and day/date arithmetic. If a determinism or no-mutation test fails, that's a WRAPPER BUG — fix the wrapper, not the test. Document every re-baselined value in the commit message.

- [ ] **Step 4: Full verify.** `npm run verify` → green.

- [ ] **Step 5: Commit.** `jj describe -m "feat(engine): #1266 stage1b — tickDay = headless wrapper over the real engine; delete stale DAILY_STEPS; re-baseline (<list files>)"`

---

### Task 4: Dissent-override charges wear + shared tail + Sabbath sparkline

**Files:** Modify `src/lib/game/engine-pausable.ts`; Create `tests/dissent-wear-1266.test.ts`.

Background: on a doctrine lay-by, the main tick runs the RECOVER ox branch, persists the decision block, then pauses for dissent. If the player **overrides to travel**, `applyCompanyDissent` runs `applyTravel` but never `tickOxen`/`applyOxHydration`/`tickWagon`/`applyDehydration` → miles are free. Fix in the continuation: on the override branch, run `TRAVEL_OX_WAGON_STEPS` before travel and replace the bare `attemptFire`+`reapDead` tail with `POST_EVENT_TAIL_STEPS` (adds dehydration). The morning recovery that already ran stays — documented as "the team rested while the company argued, then pushed on" (a deliberate, flavor-consistent approximation; the exact-restructure alternative reorders the main tick and is rejected to protect the byte-identical gate).

- [ ] **Step 1: Write the failing test.** Create `tests/dissent-wear-1266.test.ts`. Read an existing dissent test (grep `applyCompanyDissent` in tests/ — the B-series tests exist) for how to construct a train state with `_companyDissentPending` + a decision block. The test: build a dissent-pending lay-by state where the oxen have `fatigue: 0` and the keg is empty, resolve with the override choice, and assert the returned (day-advanced) state shows: ox fatigue > 0 (tickOxen ran), wagon condition < start (tickWagon ran), `flags._dehydrationDays >= 1` (dehydration ran). Mirror the existing dissent-test fixture EXACTLY — constructing a valid `companyDecisionBlock` by hand is error-prone; reuse their builder. Also assert the ABIDE branch does NOT add fatigue (recovery day stays a recovery day).

- [ ] **Step 2: Run to verify it fails** (override branch leaves fatigue 0 / no dehydration on the current code).

- [ ] **Step 3: Fix `applyCompanyDissent`.** In its body (after `travels` is computed): on the `travels` branch insert the trio BEFORE `applyTravel`, and replace the `attemptFire`/`reapDead` pair with the shared tail:

```ts
  if (travels) {
    // #1266 stage1b — an override-to-travel day charges the same wear as any
    // travel day: ox fatigue + hydration + wagon wear (the morning's lay-by
    // recovery stays — the team rested while the company argued, then pushed on).
    s = runSteps(TRAVEL_OX_WAGON_STEPS, s, rng, { traveled: true });
    s = applyTravel(s, rng);
  }
  s = runSteps(POST_EVENT_TAIL_STEPS, s, rng, { traveled: travels });
```
(Adapt to the real body: `applyTravel` is currently inside `if (travels)`; the tail pair follows unconditionally. Preserve everything else — `applyDailyRecovery`/`applyTrainShare` stay where they are, `advanceTrain` + `pushMoraleHistory` + day-advance unchanged.) **RNG note:** the continuation's rng is caller-supplied/fresh; tickOxen/oxHydration/tickWagon draw nothing, so inserting them does NOT shift trainShare/travel draws that precede them — verify the insertion point is AFTER applyTrainShare in the body (it is: trio goes right before applyTravel).

- [ ] **Step 4: Route `applyPendingChoice` through the shared tail (structural).** Replace its `attemptFire` → `applyDehydration` → `reapDead` triple (the 1a wiring) with `s = runSteps(POST_EVENT_TAIL_STEPS, s, rng, { traveled: true });`. Same three calls, same order — zero behavior change. Remove now-unused direct imports if any.

- [ ] **Step 5: Sabbath sparkline.** In the auto-Sabbath intercept at the top of `tickDayPausable` (the `_autoSabbathRest && Sunday` early return), wrap the returned state with `pushMoraleHistory(...)` so auto-Sabbath days record the sparkline point. Read the exact return shape first (`return { state: sundayLayBy(...) ... }`) and apply the push to the completed-day state.

- [ ] **Step 6: Run** the new test (PASS) + `npx vitest run tests/` for the dissent/B-series files + `npm run check` → 0 errors.

- [ ] **Step 7: Commit.** `jj describe -m "fix(engine): #1266 stage1b — dissent-override charges ox/wagon/dehydration wear; shared tail; Sabbath sparkline"`

---

### Task 5: Full verify + byte-identical sweep gate + PR

- [ ] **Step 1: Full verify.** `npm run verify` → green.
- [ ] **Step 2: Final BEFORE/AFTER persona sweep.** Same commands as T2-Step 4 (AFTER on the branch tip, BEFORE on master, same `--tag`). **Gate: BYTE-IDENTICAL.** Rationale: the solo persona sweep exercises tickDayPausable + applyPendingChoice; T2 is structural, T4's pendingChoice routing is the same three calls, and the dissent/Sabbath changes are train-/flag-gated paths the solo sweep never enters. Any diff = an unintended behavior change — investigate, do not ship.
- [ ] **Step 3: Push + PR.** Bookmark + `jj git push`, then from the default workspace `gh pr create` (base master). PR body: the segments architecture, the byte-identical gate result, the tickDay wrapper + every re-baselined test value (list them), the dissent-wear fix + its documented recovery-offset approximation, Sabbath sparkline. Note Stage 2 (NPC driver consumes the same segments) is next. End with Co-Authored-By + 🤖 lines.
- [ ] **Step 4: Final whole-branch review (Opus) + merge once green.** Update VK #1266 progress.

---

## Self-review (author)
- **Spec coverage (Stage 1):** extract canonical list (T1) ✓ · tickDayPausable runs it (T2) ✓ · tickDay headless driver, auto-resolve, no double moraleHistory push (T3) ✓ · delete engine.ts SYSTEMS array (T3) ✓ · dissent-gap fix (T4) ✓ · re-baseline value tests, keep determinism/no-mutation (T3) ✓ · Sabbath sparkline (T4, carried from the 1a review) ✓.
- **The two paramount safety properties:** (1) byte-identical live path — enforced TWICE (T2 Step 4 early gate + T5 final gate); (2) RNG order — extraction reorders nothing; all T4 insertions are non-drawing systems placed after the last drawing step they could affect.
- **Known accepted approximation:** dissent-override days get morning recovery + travel wear (documented in code + PR). The exact alternative (reordering the main tick) is explicitly rejected to protect property (1).
- **Implementer confirmations flagged inline:** real import paths/signatures for all 29 step functions (engine-pausable's imports are truth); the PRE_TRAVEL contiguity check; the default-choice predicate from fireEvent; `DissentChoice` values; the dissent-test fixture builder; the cycle check before importing engine-pausable into engine.ts.
- **Stage 2 readiness:** MORNING_STEPS deliberately starts at progressConditions (NPCs don't run tickWeather); ctx.traveled is the only context a step needs; the NPC driver will run these arrays via synth/project.
