# #1266 Stage 1a — Live-Path System Reconciliation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Wire the daily systems that currently run ONLY in the dead test engine (`tickDay`/`engine.ts`) into the real player path (`tickDayPausable`/`engine-pausable.ts`) and its pause-continuations, fixing three live-path gaps: the #1245 water-ration strain (players ration for free), the morale sparkline (never updates), and `applyPendingChoice`'s missing dehydration.

**Architecture:** No `DAILY_STEPS` extraction yet (that's Stage 1b). This is targeted: (1) move `pushMoraleHistory` to `systems/morale.ts` and call it at all three day-advance points; (2) insert `applyWaterRationStrain` into `tickDayPausable` after consumption; (3) add `applyDehydration` to `applyPendingChoice`'s tail. The fiddly dissent-override ox/wagon correction is DEFERRED to Stage 1b (clean via segment routing). Water-strain is a balance change → persona-sweep-gated.

**Tech Stack:** SvelteKit 5, TS, Vitest. Pure-function engine. jj-colocated. Sweep: `scripts/persona-profession-sweep.ts`.

**Spec:** `docs/superpowers/specs/2026-06-09-tick-engine-unification-design.md` (Stage 1).

---

## Environment notes for the implementer
- **Work in `/home/eric/projects/hoosierTrail-1266-s1`** (the jj workspace; paths below relative to it).
- **Edit/Write/MultiEdit BLOCKED** by a hook → make all file changes via **Bash** (`python3` heredoc exact string-replacement; `cat >` for new files). **Read tool works** — Read before editing.
- **Bash cwd resets to `/home/eric/projects/hoosierTrail` each call** — always `cd /home/eric/projects/hoosierTrail-1266-s1 && ...`.
- **jj, not git.** Commit: `jj describe -m "..."`. NO git/jj new/jj edit. The whole stage is one working-copy commit.
- Tests in `tests/`, imports reach `../src/lib/game/...`. Gate: `npm run verify`.

## File structure
| File | Change |
|---|---|
| `src/lib/game/systems/morale.ts` | Add + export `pushMoraleHistory` (moved from engine.ts) |
| `src/lib/game/engine.ts` | Import `pushMoraleHistory` from morale.ts (delete the local copy); unchanged call site |
| `src/lib/game/engine-pausable.ts` | Import `applyWaterRationStrain` + `pushMoraleHistory`; insert strain after consumption; call `pushMoraleHistory` at the 3 day-advance returns; add `applyDehydration` to `applyPendingChoice` tail |
| `tests/live-path-reconcile-1266.test.ts` | New — strain/sparkline/dehydration on the live path |

---

### Task 1: Move `pushMoraleHistory` to `morale.ts` + wire into all three day-advance points

**Files:**
- Modify: `src/lib/game/systems/morale.ts` (add + export), `src/lib/game/engine.ts` (import it, delete local), `src/lib/game/engine-pausable.ts` (import + call ×3)
- Test: `tests/live-path-reconcile-1266.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `tests/live-path-reconcile-1266.test.ts`. Read an existing test that calls `tickDayPausable` (e.g. `tests/npc-rest-parity-937.test.ts` or `tests/dissent-*.test.ts`) for how to build a `GameState` + call it. Skeleton:

```ts
import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/lib/game/engine';
import { tickDayPausable } from '../src/lib/game/engine-pausable';
import type { GameState } from '../src/lib/game/types';

function game(over: Partial<GameState> = {}): GameState {
  const s = createInitialState({
    seed: 'reconcile', leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'A', profession: 'doctor' }],
    startDate: { year: 1849, month: 5, day: 1 }
  });
  return { ...s, ...over };
}

describe('#1266 stage1a — morale sparkline updates on the live path', () => {
  it('moraleHistory grows across tickDayPausable days', () => {
    let s = game();
    expect(s.moraleHistory ?? []).toEqual([]); // fresh game: no history yet
    for (let d = 0; d < 3; d++) {
      const r = tickDayPausable(s);
      s = r.state;
      // if a pending event surfaced, this minimal test just stops — but on a
      // fresh solo prairie run the first few days shouldn't pause. If it does,
      // pick a seed/start that doesn't, or assert on the days before the pause.
      expect(r.pendingEvent ?? null).toBeNull();
    }
    expect(Array.isArray(s.moraleHistory)).toBe(true);
    expect((s.moraleHistory ?? []).length).toBe(3); // one push per tick
  });
});
```

NOTE: confirm `tickDayPausable`'s return shape (`{ state, pendingEvent }`) and `createInitialState`'s option shape against the real signatures (Read them). If a pending event surfaces in the first 3 days for this seed, choose a seed/start date that doesn't pause, or reduce the loop — the invariant is **`moraleHistory.length` increases by 1 per completed `tickDayPausable` day** (it stays `[]`/undefined on master).

- [ ] **Step 2: Run to verify it fails**

Run: `cd /home/eric/projects/hoosierTrail-1266-s1 && npx vitest run tests/live-path-reconcile-1266.test.ts -t "sparkline"`
Expected: FAIL — `moraleHistory` stays empty (tickDayPausable never pushes).

- [ ] **Step 3: Move `pushMoraleHistory` to `morale.ts`**

In `src/lib/game/systems/morale.ts`, add (near the other exports):

```ts
/** Roll the 7-day morale-history buffer forward. Call at end-of-tick after
 *  every system has settled `s.morale`. Drives the party-panel sparkline.
 *  (Moved from engine.ts in #1266 so every day-advance path can call it.) */
const MORALE_HISTORY_LEN = 7;
export function pushMoraleHistory(s: GameState): GameState {
  const prior = Array.isArray(s.moraleHistory) ? s.moraleHistory : [];
  const next = [...prior, s.morale].slice(-MORALE_HISTORY_LEN);
  return { ...s, moraleHistory: next };
}
```

(Confirm `morale.ts` already imports `GameState` from `../types`; if not, add it.)

- [ ] **Step 4: Re-point `engine.ts` at the shared copy**

In `src/lib/game/engine.ts`: delete the local `const MORALE_HISTORY_LEN` + `function pushMoraleHistory` definition (the block at ~lines 225-233, before `export function tickDay`). Add `pushMoraleHistory` to the existing import from `./systems/morale` (it already imports `adjustMorale` from there — add `pushMoraleHistory` to that import list). `tickDay`'s existing `s = pushMoraleHistory(s);` call is unchanged.

- [ ] **Step 5: Wire it into `engine-pausable.ts`'s three day-advance points**

In `src/lib/game/engine-pausable.ts`, add `pushMoraleHistory` to the import from `./systems/morale` (it already imports `adjustMorale`).

Then, at EACH of the three day-advance `return` points, insert `s = pushMoraleHistory(s);` immediately before the return:

(a) `tickDayPausable` END — the block `return { state: { ...s, day: s.day + 1, date: advanceDate(s.date) } };` → prefix with `s = pushMoraleHistory(s);`.

(b) `applyPendingChoice` END — `return { ...s, day: s.day + 1, date: advanceDate(s.date) };` → prefix with `s = pushMoraleHistory(s);`.

(c) `applyCompanyDissent` END — its day-advance return → prefix with `s = pushMoraleHistory(s);`. (Read `applyCompanyDissent` to find its exact return; the dissent pause's morale settles before day-advance, so push there too.)

Use `python3` exact-replacement on each return block. (The `tickDayPausable` END is unique; the `applyPendingChoice` / `applyCompanyDissent` returns are `return { ...s, day: s.day + 1, ... }` — disambiguate by matching enough surrounding context to hit each once.)

- [ ] **Step 6: Run to verify the sparkline test passes** + add coverage for the continuation paths

Run: `cd /home/eric/projects/hoosierTrail-1266-s1 && npx vitest run tests/live-path-reconcile-1266.test.ts` → PASS. (Optionally extend the test to assert `moraleHistory` also grows when a day resolves via `applyPendingChoice` — drive a paused event then `applyPendingChoice` and assert length increments. Add only if the factory makes it easy; the core assertion is the tickDayPausable path.)

- [ ] **Step 7: `npm run check`** → 0 errors (the move + re-import is clean).

- [ ] **Step 8: Commit**

```bash
cd /home/eric/projects/hoosierTrail-1266-s1 && jj describe -m "feat(engine): #1266 stage1a — pushMoraleHistory -> morale.ts, wired into live tick + continuations"
```

---

### Task 2: Wire `applyWaterRationStrain` into the live path

**Files:**
- Modify: `src/lib/game/engine-pausable.ts`
- Test: `tests/live-path-reconcile-1266.test.ts` (append)

- [ ] **Step 1: Write the failing test**

Append to `tests/live-path-reconcile-1266.test.ts`:

```ts
describe('#1266 stage1a — water-ration strain applies on the live path', () => {
  it('a drycamp party loses morale over consecutive live ticks', () => {
    // drycamp tier with water > 0 should cost morale every day (CONSERVE/DRYCAMP_MORALE).
    let s = game({ waterRation: 'drycamp', morale: 80 });
    s = { ...s, resources: { ...s.resources, water: 15 } }; // keg has water (strain only fires when water>0)
    const startMorale = s.morale;
    for (let d = 0; d < 3; d++) {
      const r = tickDayPausable(s);
      s = r.state;
      if (r.pendingEvent) break;
      s = { ...s, waterRation: 'drycamp', resources: { ...s.resources, water: 15 } }; // hold tier + keg each day
    }
    // On master the strain never runs in tickDayPausable → morale only moves via
    // other systems. With the fix, drycamp adds a per-day morale debit on top.
    expect(s.morale).toBeLessThan(startMorale);
  });
});
```

NOTE: this is a directional assertion (morale strictly drops under sustained drycamp). If other live systems already drop morale on this seed making it pass vacuously, strengthen it: capture morale with `waterRation:'normal'` over the same 3 ticks/seed and assert the `'drycamp'` run ends with STRICTLY lower morale than the `'normal'` run (the delta = the strain). Read `applyWaterRationStrain` (`src/lib/game/systems/water-ration.ts`) for the exact morale constants (`CONSERVE_MORALE`/`DRYCAMP_MORALE`) and assert the precise delta if feasible — a constant-anchored delta is the strongest form.

- [ ] **Step 2: Run to verify it fails** (or passes vacuously — if so, switch to the normal-vs-drycamp contrast form above).

Run: `cd /home/eric/projects/hoosierTrail-1266-s1 && npx vitest run tests/live-path-reconcile-1266.test.ts -t "water-ration strain"`

- [ ] **Step 3: Insert the strain step**

In `src/lib/game/engine-pausable.ts`: add `applyWaterRationStrain` to the imports (it lives in `./systems/water-ration`; engine-pausable does NOT currently import it — add the import). Then insert it in the pre-branch run, immediately AFTER `s = applyDailyConsumption(s);` and before `s = applyDietVariety(s);` — matching `engine.ts`'s order (strain right after consumption):

```ts
  s = applyDailyConsumption(s);
  s = applyWaterRationStrain(s); // #1245/#1266 — ration morale/HP strain (was test-engine-only)
  s = applyDietVariety(s);
```

`applyWaterRationStrain` takes only `(state)` — no `rng` — so it does NOT shift the rng stream (determinism preserved).

- [ ] **Step 4: Run to verify it passes.** `cd /home/eric/projects/hoosierTrail-1266-s1 && npx vitest run tests/live-path-reconcile-1266.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
cd /home/eric/projects/hoosierTrail-1266-s1 && jj describe -m "feat(engine): #1266 stage1a — wire applyWaterRationStrain into the live tick (drycamp/conserve now cost morale/HP)"
```

---

### Task 3: Add `applyDehydration` to `applyPendingChoice`'s tail

The event-resume continuation runs `attemptFire → reapDead` but skips `applyDehydration` (the normal tick runs it between them). On an event-paused day with an empty keg, the party skips a dehydration tick — free hydration.

**Files:**
- Modify: `src/lib/game/engine-pausable.ts` (`applyPendingChoice`)
- Test: `tests/live-path-reconcile-1266.test.ts` (append)

- [ ] **Step 1: Write the failing test**

Append to `tests/live-path-reconcile-1266.test.ts`. You need a paused event to drive `applyPendingChoice`. Read an existing test that exercises `applyPendingChoice` (grep `applyPendingChoice` in tests/) for the pattern, then assert that resolving an event on an empty-keg day applies dehydration HP/morale loss (or at least advances `flags._dehydrationDays`). Skeleton (adapt to a real paused-event fixture):

```ts
import { applyPendingChoice } from '../src/lib/game/engine-pausable';

describe('#1266 stage1a — applyPendingChoice runs dehydration', () => {
  it('resolving an event on an empty keg advances the dehydration tick', () => {
    // Build a state with water 0 (so applyDehydration bites), drive a tick that
    // pauses on an event, then applyPendingChoice and assert the dry-day counter
    // moved / HP dropped vs a no-dehydration baseline.
    // ... (use the real paused-event fixture from the existing tests) ...
  });
});
```

If constructing a genuine paused event is heavy, the acceptable minimal proof: call `applyPendingChoice(state, event, choiceId)` directly with `state.resources.water = 0` and a trivial event/choice, and assert the returned state's `flags._dehydrationDays` is set (it would be undefined/unchanged on master because applyDehydration never ran). Read `applyDehydration` (`src/lib/game/systems/dehydration.ts`) for what it sets when water=0.

- [ ] **Step 2: Run to verify it fails.**

- [ ] **Step 3: Add the call.** In `applyPendingChoice` (engine-pausable.ts), the tail is `s = attemptFire(s, rng); s = reapDead(s, rng);`. Insert dehydration between them (matching the normal path order attemptFire → applyDehydration → reapDead):

```ts
  s = attemptFire(s, rng);
  s = applyDehydration(s); // #1266 stage1a — event-resume day still owes a dehydration tick
  s = reapDead(s, rng);
```

(`applyDehydration` is already imported in engine-pausable.ts.)

- [ ] **Step 4: Run to verify it passes.** Then `npm run check` → 0 errors.

- [ ] **Step 5: Commit**

```bash
cd /home/eric/projects/hoosierTrail-1266-s1 && jj describe -m "feat(engine): #1266 stage1a — applyPendingChoice runs applyDehydration (event-resume parity)"
```

---

### Task 4: Persona sweep gate + full verify + PR

The water-strain wiring is a real balance change (drycamp/conserve now cost morale/HP in real play). Gate it.

- [ ] **Step 1: Full verify.** `cd /home/eric/projects/hoosierTrail-1266-s1 && npm run verify` → PASS. **Watch for fixture breakage:** existing `tickDayPausable`-driven tests may shift because (a) `moraleHistory` now appears on returned states (a save-roundtrip `toEqual` may need the field) and (b) drycamp/conserve states now lose morale. Update any test that encoded the OLD (strain-free / no-history) behavior to the corrected behavior — note why in the commit. Do not weaken a test to hide a real regression.

- [ ] **Step 2: AFTER persona sweep (branch).** `cd /home/eric/projects/hoosierTrail-1266-s1 && npx tsx scripts/persona-profession-sweep.ts --runs 2 --shapes 3/0,4/0,2/2,2/4,4/2,3/3 --tag s1a-1266 > /tmp/sweep-after-s1a.log 2>&1`

- [ ] **Step 3: BEFORE persona sweep (master).** `jj new master`, run the identical command to `/tmp/sweep-before-s1a.log`, `jj edit feat/1266-tick-engine-unification`. (Confirm `applyWaterRationStrain` is absent from engine-pausable.ts on master before running; present after restore.)

- [ ] **Step 4: Compare against the gate.** Read both. **Gate:** the strain should BITE — expect a modest dip on water-rationing personas/shapes (drinker, cautious, and the dry desert shapes where bots drycamp the Snake), since drycamp now costs morale/HP. **PASS** = the dip is modest and the #1245 Snake crossing is NOT re-cratered (arrival on the dry shapes still meaningfully above the pre-#1245 wall; wiped% not spiking). If drycamp's new cost over-nerfs and craters arrival, **re-tune** the strain constants (`CONSERVE_MORALE`/`DRYCAMP_MORALE`/`DRYCAMP_HP` in `water-ration.ts`) down and re-sweep — the goal is "rationing is a real tradeoff," not "rationing is suicide." Record the BEFORE/AFTER per-shape table + the chosen constants in the PR.

- [ ] **Step 5: Push + PR.**

```bash
cd /home/eric/projects/hoosierTrail-1266-s1 && jj bookmark set feat/1266-tick-engine-unification -r @
jj git push --bookmark feat/1266-tick-engine-unification
# from default workspace:
gh pr create -R ericbond007/ot-revisited --base master --head feat/1266-tick-engine-unification \
  --title "feat: #1266 stage 1a — live-path system reconciliation (water strain + sparkline + dehydration)" --body "..."
```

PR body: the three live-path gaps fixed, the BEFORE/AFTER persona sweep + chosen strain constants, that the dissent-override ox/wagon correction is deferred to Stage 1b, and that this is Stage 1a of #1266 (1b = the DAILY_STEPS extraction). End with Co-Authored-By + 🤖 lines.

- [ ] **Step 6: Final review + merge.** Dispatch a final reviewer, merge once green.

---

## Self-review (author)
- **Spec coverage (Stage 1 live-path fixes):** water strain wired live (T2) ✓ · pushMoraleHistory wired live + continuations (T1) ✓ · applyPendingChoice dehydration (T3) ✓ · sweep gate for the balance change (T4) ✓ · dissent-override ox/wagon correction explicitly DEFERRED to 1b (noted) ✓ · NO DAILY_STEPS extraction (1b) ✓.
- **RNG safety:** `applyWaterRationStrain` and `pushMoraleHistory` take no `rng` → zero rng-stream shift → determinism preserved. `applyDehydration` (T3) also takes no rng. So no determinism test should break from rng reordering; only value/snapshot shifts from the new morale-history field + drycamp morale cost.
- **Type consistency:** `pushMoraleHistory` exported from `morale.ts`, imported by both engines; `applyWaterRationStrain` imported into engine-pausable; insertion points match `engine.ts`'s order (strain after consumption).
- **No-migration safety:** `moraleHistory` is already optional (pre-existing field, read with `?? []`). Wagons/saves without it are fine.
- **Implementer confirmations flagged inline:** the three day-advance return blocks' exact text (Read `applyCompanyDissent`'s return); `createInitialState`/`tickDayPausable` shapes; a real paused-event fixture for T3 (grep existing `applyPendingChoice` tests); the strain morale constants for an exact-delta assertion.
