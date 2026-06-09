# #1266 Stage 0 — Synth Flag-Bridge Generalization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the NPC-wagon synth/project bridge carry every *persistent* `flags._*` the engine writes (not just the 4 typed counters), so multi-day flag state survives the per-tick synth round-trip — fixing the live bug where NPC coffee/tea never depletes.

**Architecture:** Add a generic `persistentFlags?: Record<string, number>` passthrough to `NpcWagonState`, plus an explicit `NPC_PERSISTENT_FLAG_KEYS` allowlist (`_hotDrinkClock`, `_july4Year`, `_christmasYear`, `_cannibalismCount`). `npcFlagsFromWagon` packs those keys into the synth `flags`; the projection unpacks whichever are present back into `persistentFlags` (absent = engine-deleted = omitted). The 4 existing typed counters keep their special semantics, unchanged. No `DAILY_STEPS` / driver work — that is Stage 1.

**Tech Stack:** SvelteKit 5, TypeScript, Vitest. Pure-function engine. jj-colocated git. NPC sweep harness `scripts/npc-baseline-897.ts`.

**Spec:** `docs/superpowers/specs/2026-06-09-tick-engine-unification-design.md` (Stage 0).

---

## Environment notes for the implementer

- **Work in `/home/eric/projects/hoosierTrail-1266`** (the jj workspace for this branch). All paths below are relative to that root.
- **Edit/Write/MultiEdit tools are BLOCKED** by a PreToolUse hook that keys off the session dir. Make all file changes via the **Bash tool** (`python3` heredoc exact string-replacement for edits, `cat >` for new files). The **Read tool works** — Read each file before editing.
- **Bash cwd resets to `/home/eric/projects/hoosierTrail` after every command** — always prefix `cd /home/eric/projects/hoosierTrail-1266 && ...`.
- **Version control is jj, not git.** Commit with `cd /home/eric/projects/hoosierTrail-1266 && jj describe -m "..."` (updates the single working-copy commit message; the whole stage is one change). No `git`, no `jj new`, no `jj edit`.
- **Tests live in `tests/`** (vitest config scans `tests/**/*.test.ts`); imports reach `../src/lib/game/...`.
- Gate command for the full suite: `cd /home/eric/projects/hoosierTrail-1266 && npm run verify` (= `npm run check` + `npm test`).

## File structure

| File | Responsibility | Change |
|---|---|---|
| `src/lib/game/types.ts` | `NpcWagonState` shape | Add optional `persistentFlags?: Record<string, number>` field |
| `src/lib/game/systems/wagon-synth.ts` | the synth/project bridge | Add `NPC_PERSISTENT_FLAG_KEYS`; pack in `npcFlagsFromWagon`; unpack in `npcFieldsFromFlags` + `projectWagonDeltas` |
| `src/lib/game/systems/npc-engine.ts:367-369` | NPC holidays block comment | Fix the false "round-trips" claim |
| `tests/synth-flag-bridge-1266.test.ts` | bridge round-trip unit tests | New |
| `tests/npc-hotdrink-deplete-1266.test.ts` | behavioral: NPC coffee depletes | New |

---

### Task 1: Add `persistentFlags` field + `NPC_PERSISTENT_FLAG_KEYS` + pack

**Files:**
- Modify: `src/lib/game/types.ts` (`NpcWagonState`)
- Modify: `src/lib/game/systems/wagon-synth.ts` (`npcFlagsFromWagon`)
- Test: `tests/synth-flag-bridge-1266.test.ts` (create)

- [ ] **Step 1: Add the `persistentFlags` field to `NpcWagonState`**

In `src/lib/game/types.ts`, find the `NpcWagonState` interface (it ends with the `greaseMiles?: number;` field). Add this field just before the closing `}`:

```ts
  /** #1266 — generic passthrough for persistent `flags._*` the engine
   *  writes that aren't one of the typed counters above. The synth bridge
   *  packs these into the engine `flags` blob and unpacks them back each
   *  tick, so multi-day flag state (hot-drink clock, holiday-year markers,
   *  cannibalism count) survives the per-tick synth round-trip. Keys are
   *  the magic-string flag names; see NPC_PERSISTENT_FLAG_KEYS. Optional —
   *  absent on legacy saves and whenever no persistent flag is set. */
  persistentFlags?: Record<string, number>;
```

- [ ] **Step 2: Write the failing pack test**

Create `tests/synth-flag-bridge-1266.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { NpcWagonState } from '../src/lib/game/types';
import {
  synthesizeWagonState,
  projectWagonDeltas,
  NPC_PERSISTENT_FLAG_KEYS
} from '../src/lib/game/systems/wagon-synth';

// Minimal NPC wagon for bridge tests. Only the fields the bridge touches matter.
function wagon(over: Partial<NpcWagonState> = {}): NpcWagonState {
  return {
    id: 'w1', name: 'Test', leaderProfession: 'farmer', hasChildren: false,
    seed: 's', eventLog: [], outcome: 'in-progress', rations: 'normal',
    party: [], inventory: {}, oxen: [], cash: 0,
    morale: 50, water: 10, dirtyWater: 0, waterCap: 20,
    dryDays: 0,
    wagon: { model: 'prairie_schooner', condition: 100, canvas: 100 } as NpcWagonState['wagon'],
    ...over
  } as NpcWagonState;
}

const env = {
  day: 5,
  date: { year: 1849, month: 5, day: 10 },
  location: { terrain: 'prairie', atLandmarkId: null } as any,
  pace: 'moderate' as const,
  weather: 'clear' as const
};

describe('#1266 — synth bridge packs persistent flags', () => {
  it('NPC_PERSISTENT_FLAG_KEYS includes hot-drink clock + holiday markers + cannibalism', () => {
    expect(NPC_PERSISTENT_FLAG_KEYS).toContain('_hotDrinkClock');
    expect(NPC_PERSISTENT_FLAG_KEYS).toContain('_july4Year');
    expect(NPC_PERSISTENT_FLAG_KEYS).toContain('_christmasYear');
    expect(NPC_PERSISTENT_FLAG_KEYS).toContain('_cannibalismCount');
  });

  it('packs persistentFlags into the synthesized GameState flags', () => {
    const w = wagon({ persistentFlags: { _hotDrinkClock: 8, _july4Year: 1849 } });
    const synth = synthesizeWagonState(w, env as any);
    expect(synth.flags._hotDrinkClock).toBe(8);
    expect(synth.flags._july4Year).toBe(1849);
  });

  it('does not pack a key the wagon has not set', () => {
    const w = wagon({ persistentFlags: { _hotDrinkClock: 3 } });
    const synth = synthesizeWagonState(w, env as any);
    expect(synth.flags._christmasYear).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `cd /home/eric/projects/hoosierTrail-1266 && npx vitest run tests/synth-flag-bridge-1266.test.ts`
Expected: FAIL — `NPC_PERSISTENT_FLAG_KEYS` not exported / flags not packed.

- [ ] **Step 4: Add the allowlist + pack logic**

In `src/lib/game/systems/wagon-synth.ts`, add the exported allowlist near the top (after the existing flag-key constants like `FLAG_DEHYDRATION_DAYS`):

```ts
/** #1266 — persistent `flags._*` the engine writes across multiple days
 *  that the synth bridge must carry (the typed counters spoilDays/dryDays/
 *  greaseMiles/starvationDays are handled separately above). Add a key here
 *  when a new daily system introduces a multi-day flag; same-tick flags
 *  (consumed within one synth) do NOT belong here. */
export const NPC_PERSISTENT_FLAG_KEYS = [
  '_hotDrinkClock',   // diet.ts — accumulating oz toward the next lb of coffee/tea
  '_july4Year',       // holidays.ts — last year the July 4 bump fired
  '_christmasYear',   // holidays.ts — last year the Christmas bump fired
  '_cannibalismCount' // cannibal.ts / camp-actions.ts — running tally
] as const;
```

In `npcFlagsFromWagon`, add this block before the final `return flags;`:

```ts
  if (wagon.persistentFlags) {
    for (const key of NPC_PERSISTENT_FLAG_KEYS) {
      const v = wagon.persistentFlags[key];
      if (typeof v === 'number') flags[key] = v;
    }
  }
```

- [ ] **Step 5: Run to verify it passes**

Run: `cd /home/eric/projects/hoosierTrail-1266 && npx vitest run tests/synth-flag-bridge-1266.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
cd /home/eric/projects/hoosierTrail-1266 && jj describe -m "feat(npc): #1266 stage0 — persistentFlags field + allowlist + synth pack"
```

---

### Task 2: Unpack persistent flags in projection + fix the false comment

**Files:**
- Modify: `src/lib/game/systems/wagon-synth.ts` (`npcFieldsFromFlags`, `projectWagonDeltas`)
- Modify: `src/lib/game/systems/npc-engine.ts:367-369` (false comment)
- Test: `tests/synth-flag-bridge-1266.test.ts` (append)

- [ ] **Step 1: Write the failing unpack + round-trip tests**

Append to `tests/synth-flag-bridge-1266.test.ts`:

```ts
import type { GameState } from '../src/lib/game/types';

describe('#1266 — synth bridge unpacks persistent flags on projection', () => {
  it('projects present persistent flags back onto the wagon', () => {
    const original = wagon();
    // A ticked GameState whose flags carry a persistent flag the engine set.
    const ticked = synthesizeWagonState(original, env as any);
    const tickedWithFlag: GameState = {
      ...ticked,
      flags: { ...ticked.flags, _hotDrinkClock: 12, _july4Year: 1849 }
    };
    const out = projectWagonDeltas(tickedWithFlag, original);
    expect(out.persistentFlags?._hotDrinkClock).toBe(12);
    expect(out.persistentFlags?._july4Year).toBe(1849);
  });

  it('omits a persistent flag the engine deleted (absent = cleared)', () => {
    const original = wagon({ persistentFlags: { _hotDrinkClock: 9 } });
    const ticked = synthesizeWagonState(original, env as any);
    // Engine deleted _hotDrinkClock (e.g. ran out of coffee) — not in ticked.flags.
    const tickedNoFlag: GameState = { ...ticked, flags: {} };
    const out = projectWagonDeltas(tickedNoFlag, original);
    expect(out.persistentFlags?._hotDrinkClock).toBeUndefined();
  });

  it('round-trips a persistent flag across two synth cycles', () => {
    let w = wagon();
    // Cycle 1: engine sets the clock to 8.
    let synth = synthesizeWagonState(w, env as any);
    w = projectWagonDeltas({ ...synth, flags: { ...synth.flags, _hotDrinkClock: 8 } }, w);
    expect(w.persistentFlags?._hotDrinkClock).toBe(8);
    // Cycle 2: the clock packs back IN, engine adds to it (8 -> 14).
    synth = synthesizeWagonState(w, env as any);
    expect(synth.flags._hotDrinkClock).toBe(8); // survived to the next synth
    w = projectWagonDeltas({ ...synth, flags: { ...synth.flags, _hotDrinkClock: 14 } }, w);
    expect(w.persistentFlags?._hotDrinkClock).toBe(14);
  });

  it('leaves persistentFlags undefined when no persistent flag is set', () => {
    const original = wagon();
    const ticked = synthesizeWagonState(original, env as any);
    const out = projectWagonDeltas({ ...ticked, flags: {} }, original);
    expect(out.persistentFlags).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd /home/eric/projects/hoosierTrail-1266 && npx vitest run tests/synth-flag-bridge-1266.test.ts -t "unpacks persistent"`
Expected: FAIL — projection doesn't carry `persistentFlags`.

- [ ] **Step 3: Extend `npcFieldsFromFlags` to compute persistentFlags**

In `src/lib/game/systems/wagon-synth.ts`, `npcFieldsFromFlags` currently returns a `Pick<NpcWagonState, 'spoilDays' | 'dryDays' | 'greaseMiles' | 'starvationDays'>`. Widen the return type to also include `'persistentFlags'` and build it. Change the signature's return type to:

```ts
): Pick<NpcWagonState, 'spoilDays' | 'dryDays' | 'greaseMiles' | 'starvationDays' | 'persistentFlags'> {
```

and just before the existing `return { ... }`, add:

```ts
  const persistentFlags: Record<string, number> = {};
  for (const key of NPC_PERSISTENT_FLAG_KEYS) {
    const v = ticked.flags[key];
    if (typeof v === 'number') persistentFlags[key] = v;
  }
```

and add to the returned object (after `starvationDays`):

```ts
    persistentFlags: Object.keys(persistentFlags).length > 0 ? persistentFlags : undefined
```

- [ ] **Step 4: Wire it into `projectWagonDeltas`**

In the same file, `projectWagonDeltas` returns an object spreading `...original` plus the ticked fields and `fromFlags.*`. Add one line to the returned object (after `starvationDays: fromFlags.starvationDays`):

```ts
    persistentFlags: fromFlags.persistentFlags
```

(Setting it to `undefined` when empty correctly clears a stale `original.persistentFlags`, which is the desired delete-semantics.)

- [ ] **Step 5: Run to verify the unpack tests pass**

Run: `cd /home/eric/projects/hoosierTrail-1266 && npx vitest run tests/synth-flag-bridge-1266.test.ts`
Expected: PASS (all 7 tests).

- [ ] **Step 6: Fix the false comment in npc-engine.ts**

Read `src/lib/game/systems/npc-engine.ts` around lines 360-378 (the holidays block). It contains a comment falsely claiming the holiday flags round-trip via `npcFlagsFromWagon` / `projectWagonDeltas`. Replace the false claim with an accurate note. Find the comment text asserting the round-trip (it mentions `_july4Year`/`_christmasYear` "which the synth carries through npcFlagsFromWagon / projectWagonDeltas") and replace that sentence with:

```
  // #1266 — the holiday-year flags now persist via the wagon's
  // persistentFlags passthrough (NPC_PERSISTENT_FLAG_KEYS), so the
  // once-per-year idempotency guard sees its own prior marker across
  // ticks. (Before #1266 these flags were discarded on projection.)
```

(Match the surrounding comment style; only correct the false claim — do not change the holidays code itself.)

- [ ] **Step 7: Run check (type-widening sanity)**

Run: `cd /home/eric/projects/hoosierTrail-1266 && npm run check`
Expected: 0 errors (the widened `Pick` return + new field are type-consistent).

- [ ] **Step 8: Commit**

```bash
cd /home/eric/projects/hoosierTrail-1266 && jj describe -m "feat(npc): #1266 stage0 — synth persistentFlags pack/unpack + fix false round-trip comment"
```

---

### Task 3: Behavioral test — NPC coffee depletes over a multi-day tick

This is the headline bug proof: before the bridge, a normal-size NPC party (adults < 16) consumes `adults` oz/day, the clock resets to 0 every synth, so `floor(adults/16) === 0` and **coffee is never decremented**. With the clock now persisting, oz accumulate across days and a pound is consumed once the total crosses 16.

**Files:**
- Test: `tests/npc-hotdrink-deplete-1266.test.ts` (create)

- [ ] **Step 1: Write the failing/passing behavioral test**

Find an existing NPC-tick test to mirror the factory + context shape — read `tests/wagon-train-water-303e.test.ts` and/or `tests/npc-engine-280b.test.ts` for how they build a wagon via `generateTrain` and a `ctx` (`tickNpcWagon(wagon, ctx, rng)`; the `ctx` carries `day/traveled/pace/terrain/weather` and optionally `date`/`location`). Create `tests/npc-hotdrink-deplete-1266.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { tickNpcWagon, type NpcTickContext } from '../src/lib/game/systems/npc-engine';
import { generateTrain } from '../src/lib/game/content/trains';
import { makeRng } from '../src/lib/game/rng';
import type { NpcWagonState } from '../src/lib/game/types';

// A 2-adult wagon drinking coffee consumes 2 oz/day (1 oz/adult). With the
// clock persisting it reaches 16 oz (= 1 lb) after 8 travel days; before
// #1266 the clock reset every tick so floor(2/16)=0 and coffee never moved.
function ctx(day: number, over: Partial<NpcTickContext> = {}): NpcTickContext {
  return {
    day,
    traveled: true,
    pace: 'moderate',
    terrain: 'prairie',
    weather: 'clear',
    // mid-May 1849 — avoid July 4 / Thanksgiving / Christmas so the only
    // morale/inventory mover under test is the hot-drink consumption.
    date: { year: 1849, month: 5, day: 1 + day },
    ...over
  } as NpcTickContext;
}

describe('#1266 — NPC coffee depletes (hot-drink clock now persists)', () => {
  it('a 2-adult coffee-drinking wagon consumes a pound after ~8 days', () => {
    const train = generateTrain('hotdrink-test', 1, 'independence_mo', makeRng('hd'), { fresh: true });
    let w: NpcWagonState = train.companions[0];
    // Force exactly 2 adults + 1 lb coffee + ample food/water so the wagon
    // survives and the only depleting consumable under test is coffee.
    w = {
      ...w,
      party: w.party.slice(0, 2).map((m) => ({ ...m, age: 30, health: 100 })),
      inventory: { ...w.inventory, coffee: 1, flour: 500, bacon: 300 },
      water: w.waterCap,
      morale: 60
    };
    const startCoffee = w.inventory.coffee ?? 0;
    expect(startCoffee).toBe(1);

    for (let d = 1; d <= 10; d++) {
      w = tickNpcWagon(w, ctx(d), makeRng(`hd-${d}`)).wagon;
      if (w.outcome !== 'in-progress') break;
    }

    // With the clock persisting, 10 days * 2 adults = 20 oz > 16 -> 1 lb gone.
    expect(w.inventory.coffee ?? 0).toBe(0);
    // And the clock holds the remainder (20 - 16 = 4) on the wagon.
    expect(w.persistentFlags?._hotDrinkClock).toBe(4);
  });
});
```

NOTE: confirm `tickNpcWagon`'s return shape (`{ wagon, playerLogs }`) and the `NpcTickContext` field names against the real signature (read `npc-engine.ts` `export function tickNpcWagon`). If the party from `generateTrain` already has ≠2 adults or the ctx shape differs, adapt the factory to the real shapes — the invariant under test is: **a normal-size coffee-drinking NPC wagon's `coffee` count drops to 0 within ~10 days, and `persistentFlags._hotDrinkClock` holds the remainder.** If `generateTrain`'s wagon is awkward to coerce, build a minimal `NpcWagonState` literal instead (mirror the `wagon()` factory in `tests/synth-flag-bridge-1266.test.ts`), giving it 2 adult party members.

- [ ] **Step 2: Run it**

Run: `cd /home/eric/projects/hoosierTrail-1266 && npx vitest run tests/npc-hotdrink-deplete-1266.test.ts`
Expected: PASS (the fix from Tasks 1–2 makes coffee deplete). If it fails because the wagon dies/stalls or the adult count is off, fix the fixture (more food/water, exactly 2 adults) — NOT the source.

- [ ] **Step 3: Sanity — confirm this would fail on master**

Reason about it (no code change): on master, `projectWagonDeltas` discards `_hotDrinkClock`, so each tick `clock=0`, `totalOz=2`, `lbConsumed=floor(2/16)=0` → coffee stays 1 forever and `persistentFlags` doesn't exist. The test asserts coffee `=== 0` and a defined `_hotDrinkClock`, so it is a genuine regression guard for the bug. (No action — this step is a reasoning check, not a command.)

- [ ] **Step 4: Commit**

```bash
cd /home/eric/projects/hoosierTrail-1266 && jj describe -m "test(npc): #1266 stage0 — NPC coffee depletes (hot-drink clock persists)"
```

---

### Task 4: NPC-baseline sweep gate + full verify + PR

**Files:** none (validation).

- [ ] **Step 1: Full verify**

Run: `cd /home/eric/projects/hoosierTrail-1266 && npm run verify`
Expected: PASS — svelte-check 0 errors + full vitest green (incl. the two new test files). If any existing NPC test now fails because NPC coffee/holiday behavior changed, inspect: a test asserting "NPC coffee unchanged after N days" was encoding the bug — update it to the corrected behavior and note why. Do not weaken a test to hide a real regression.

- [ ] **Step 2: AFTER NPC-baseline sweep (this branch)**

Run: `cd /home/eric/projects/hoosierTrail-1266 && npx tsx scripts/npc-baseline-897.ts > /tmp/npc-baseline-after-1266.log 2>&1`
Read the per-persona outcome table at the tail of the log.

- [ ] **Step 3: BEFORE NPC-baseline sweep (master)**

From this same workspace, switch to master, run the identical harness, switch back:

```bash
cd /home/eric/projects/hoosierTrail-1266 && jj new master
npx tsx scripts/npc-baseline-897.ts > /tmp/npc-baseline-before-1266.log 2>&1
jj edit feat/1266-tick-engine-unification
```
(Confirm `src/lib/game/systems/wagon-synth.ts` has no `NPC_PERSISTENT_FLAG_KEYS` after `jj new master` to verify you're on the baseline; confirm it's back after `jj edit`.)

- [ ] **Step 4: Compare against the gate**

Read both logs. **Gate (Stage 0): neutral-or-better.** The only behavioral change is NPC coffee/tea now depletes (a small, correct loss of a previously-infinite morale source) and holiday/cannibalism flags persist. Expect per-persona outcomes (arrived/wiped/stalled, survivors, avg morale) to be **within noise** of master — a slight morale/survival dip on coffee-carrying personas is acceptable and is the intended correction. PASS = no crater, no new wipes spike, no NaN/undefined; the shift is coherent (coffee-drinkers lose the infinite-coffee crutch). If anything craters, STOP and bring the numbers back — do not ship a regression.

- [ ] **Step 5: Push + PR**

```bash
cd /home/eric/projects/hoosierTrail-1266 && jj bookmark set feat/1266-tick-engine-unification -r @
jj git push --bookmark feat/1266-tick-engine-unification
# from the default workspace (jj workspaces have no .git):
gh pr create -R ericbond007/ot-revisited --base master --head feat/1266-tick-engine-unification \
  --title "feat: #1266 stage 0 — synth flag-bridge generalization (NPC persistent flags)" --body "..."
```

PR body: the bug (NPC hot drinks never deplete; the false round-trip comment), the fix (generic `persistentFlags` passthrough + allowlist), the BEFORE/AFTER NPC-baseline summary, and that this is **Stage 0** of the #1266 tick-engine unification (Stage 1 = canonical `DAILY_STEPS` + drivers). End with the Co-Authored-By + 🤖 Generated lines.

- [ ] **Step 6: Final review + merge**

Dispatch a final reviewer over the branch, then merge once green. Mark the #1266 stage in Vikunja as appropriate (the umbrella #1266 stays open through Stages 1–3).

---

## Self-review (author)

- **Spec coverage (Stage 0 section):** persistent-flag passthrough on `NpcWagonState` (T1) ✓ · pack/unpack in `npcFlagsFromWagon`/`npcFieldsFromFlags` (T1/T2) ✓ · fixes hot-drinks (T3 behavioral) + holidays/cannibalism (carried via the same allowlist, T1/T2 round-trip tests) ✓ · fix false comment npc-engine.ts:367-369 (T2 S6) ✓ · NPC-train sweep neutral-or-better gate (T4) ✓ · unit tests for hot-drink depletion + flag round-trip (T2/T3) ✓ · explicitly NO DAILY_STEPS/driver work ✓.
- **Holiday honesty:** the holiday-year flags are bridged for correctness + to make the comment true, but the *observable* over-fire on master is negligible (one tick per calendar day), so Stage 0's behavioral test targets hot-drinks (the real, reproducible bug); holiday is covered by the flag round-trip test, not a spurious over-fire test. This is intentional, not a gap.
- **Type consistency:** `persistentFlags?: Record<string, number>`, `NPC_PERSISTENT_FLAG_KEYS`, the widened `Pick<… | 'persistentFlags'>` return, and `fromFlags.persistentFlags` used identically across T1/T2. The 4 typed counters are untouched.
- **No-migration safety:** `persistentFlags` is optional; absent on legacy saves; `npcFlagsFromWagon` guards `if (wagon.persistentFlags)`; projection omits it when empty. No save migration needed.
- **Implementer confirmations flagged inline (not guesses):** the exact false-comment wording at npc-engine.ts:367-369 (Read it), the `tickNpcWagon` return shape + `NpcTickContext` field names (Read the signature), and `generateTrain`'s wagon party shape (coerce or build a literal). Each is "Read the real shape, adapt the fixture, keep the asserted invariant."
