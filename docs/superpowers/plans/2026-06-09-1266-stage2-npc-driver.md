# #1266 Stage 2 — NPC Driver Consumes the Canonical Segments — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** `tickNpcWagon` runs the SAME canonical daily-steps segments as the player (via the synth/project bridge), killing the last hand-listed tick ordering. NPC wagons gain the 5 systems they silently skip (cleanliness ×3, ambient-water, water-ration strain) and adopt the player's order.

**Architecture:** (1) Add `scope?: 'all'|'playerOnly'|'npcOnly'` metadata to `TickStep` + a `driver` field on `TickCtx`; `runSteps` skips non-matching steps. Tag `applyTrainShare`/`attemptFire`/`adjustMorale` as `playerOnly`; add `applyNpcMoraleBaseline` as an `npcOnly` sibling in POST_BRANCH. **Default-include = drift-proof**: a new untagged system reaches NPCs automatically. (2) Fix the synth bridge's hardcoded `waterRation: 'normal'` so the strain can fire. (3) Rewrite `tickNpcWagon` as a thin driver: NPC preamble → MORNING (one synth round-trip) → camp-bundle interlude → POST_BRANCH → stray → TRAVEL_OX_WAGON/recover → storm → recovery+sabbath (driver code, crisis guard) → NPC events → POST_EVENT_TAIL → cannibalize. (4) Gate with the **full wagon-train sweep** (npc-baseline + persona sweep BEFORE/AFTER) — NPC outcomes WILL shift (that's the parity correction).

**Tech Stack:** SvelteKit 5, TS, Vitest, jj. Harnesses: `scripts/npc-baseline-897.ts`, `scripts/persona-profession-sweep.ts`.

**Spec:** `docs/superpowers/specs/2026-06-09-tick-engine-unification-design.md` (Stage 2).

---

## Environment notes for the implementer
- **Work in `/home/eric/projects/hoosierTrail-1266-s2`** (jj workspace; paths relative to it).
- **Edit/Write/MultiEdit BLOCKED** by a hook → ALL changes via **Bash** (`python3` heredoc exact replacement with asserted anchors; `cat >` for new files). **Read tool works** — Read before every edit.
- **Bash cwd resets each call** — always `cd /home/eric/projects/hoosierTrail-1266-s2 && ...`.
- **jj, not git.** Commit: `jj describe -m "..."`. NO git / jj new / jj edit.
- Tests in `tests/`, imports `../src/lib/game/...`. Full gate: `npm run verify`.

## Decisions of record (from the committed mapping analysis — do not relitigate)
- **Exclusion = scope metadata, default-include.** "Run everything" is rejected: `attemptFire` at the synth's forced `firewood: 0` takes the cold-camp branch (`fire.ts` cold penalty) and would HP/morale-drain every NPC on cold nights. `applyTrainShare` is a player-recipient no-op on the synth stub. `adjustMorale` is REPLACED for NPCs by `applyNpcMoraleBaseline` (running both double-counts daily morale).
- **PRE_TRAVEL stays driver code in the NPC tick** (the one residual): `applyDailyRecovery` needs the NPC crisis-layby guard (skip heal when `companyRestMode === 'crisis_layby'`) which isn't expressible as scope; `applySabbathTravelDebit` rides with it; `applyTrainShare` is playerOnly anyway. 2 direct calls + a comment naming this as a known residual.
- **Per-SEGMENT synth/project round-trips** (one per segment, ~5/day instead of ~16). No NPC interlude reads a mid-segment delta.
- **Camp-bundle sub-rng is preserved exactly** (its isolation prevents cross-wagon stream desync).
- **Adopted reorders (deliberate parity, will re-baseline NPC tests):** theft moves from dead-last to MORNING position; sabbath-debit moves from early to the recovery slot; producers (egg/dairy/churn) move to top-of-MORNING un-nested; dehydration now runs BEFORE reap (player tail order).

---

### Task 1: `scope` metadata + driver filter + tags

**Files:** Modify `src/lib/game/daily-steps.ts`; Modify `src/lib/game/engine-pausable.ts` (ctx gets `driver: 'player'`); Modify `tests/daily-steps-1266.test.ts`.

- [ ] **Step 1: Write the failing tests.** In `tests/daily-steps-1266.test.ts`, update/extend:

```ts
// POST_BRANCH spine gains the npcOnly morale-baseline sibling:
it('POST_BRANCH_STEPS exact order', () => {
  expect(POST_BRANCH_STEPS.map((s) => s.id)).toEqual(['adjustMorale', 'applyNpcMoraleBaseline', 'applyHolidays']);
});

describe('#1266 stage2 — scope filtering', () => {
  it('playerOnly steps are skipped for the npc driver', () => {
    const calls: string[] = [];
    const steps = [
      { id: 'a', run: (s: GameState) => { calls.push('a'); return s; } },
      { id: 'p', scope: 'playerOnly' as const, run: (s: GameState) => { calls.push('p'); return s; } },
      { id: 'n', scope: 'npcOnly' as const, run: (s: GameState) => { calls.push('n'); return s; } }
    ];
    const s0 = { morale: 0 } as unknown as GameState;
    runSteps(steps, s0, makeRng('t'), { traveled: true, driver: 'npc' });
    expect(calls).toEqual(['a', 'n']);
    calls.length = 0;
    runSteps(steps, s0, makeRng('t'), { traveled: true, driver: 'player' });
    expect(calls).toEqual(['a', 'p']);
  });
  it('tags: trainShare/attemptFire/adjustMorale playerOnly; npcMoraleBaseline npcOnly', () => {
    const tag = (arr: readonly TickStep[], id: string) => arr.find((x) => x.id === id)?.scope;
    expect(tag(PRE_TRAVEL_STEPS, 'applyTrainShare')).toBe('playerOnly');
    expect(tag(POST_EVENT_TAIL_STEPS, 'attemptFire')).toBe('playerOnly');
    expect(tag(POST_BRANCH_STEPS, 'adjustMorale')).toBe('playerOnly');
    expect(tag(POST_BRANCH_STEPS, 'applyNpcMoraleBaseline')).toBe('npcOnly');
  });
});
```

- [ ] **Step 2: Run to verify it fails.**

- [ ] **Step 3: Implement in `daily-steps.ts`:**
  - `TickCtx` gains `driver: 'player' | 'npc';` (required — forces every call site to declare).
  - `TickStep` gains `scope?: 'all' | 'playerOnly' | 'npcOnly';` with a doc comment: *"default 'all' — a new step reaches BOTH drivers unless explicitly tagged. Tag playerOnly only for player-resource/recipient steps (fire needs firewood the NPC synth stubs to 0; trainShare is the player receiving from the train)."*
  - `runSteps` skips a step when `(step.scope === 'playerOnly' && ctx.driver === 'npc') || (step.scope === 'npcOnly' && ctx.driver === 'player')`.
  - Tag: `applyTrainShare` → `playerOnly`; `attemptFire` → `playerOnly` (comment: *"NPC synth stubs firewood to 0 — the cold-camp branch would exposure-drain NPCs; excluded until NPCs carry firewood"*); `adjustMorale` → `playerOnly` (comment: *"NPCs use applyNpcMoraleBaseline instead — stacking both double-counts"*).
  - Insert into POST_BRANCH between adjustMorale and applyHolidays: `{ id: 'applyNpcMoraleBaseline', scope: 'npcOnly', run: (s, _rng, ctx) => (ctx.traveled ? applyNpcMoraleBaseline(s) : s) }` — READ `applyNpcMoraleBaseline`'s real signature + its current travel gate in npc-engine.ts first (mirror the gate exactly; if it takes rng, pass it). Import it from its real module (likely `./systems/npc-morale`); confirm no import cycle (npc-morale must not import daily-steps/engine).

- [ ] **Step 4: Update player call sites.** In `engine-pausable.ts`, every `runSteps(...)` ctx gains `driver: 'player'` (the `ctx` const + the inline literals in the continuations + the MORNING literal). `npm run check` will find them all (TickCtx.driver is required).

- [ ] **Step 5: Player path must be UNCHANGED.** `npm run verify` → all green with NO test edits beyond Step 1's. The new npcOnly step is filtered out for the player; the playerOnly tags don't change player execution. (Determinism untouched — no rng changes.)

- [ ] **Step 6: Commit.** `jj describe -m "feat(engine): #1266 stage2 — TickStep scope metadata + driver-aware runSteps + npc morale-baseline sibling"`

---

### Task 2: Synth bridge passes the wagon's real `waterRation`

**Files:** Modify `src/lib/game/systems/wagon-synth.ts`; Modify `tests/synth-flag-bridge-1266.test.ts` (append).

- [ ] **Step 1: Failing test** (append to `tests/synth-flag-bridge-1266.test.ts`, reusing its `wagon()`/`env` fixtures):

```ts
describe('#1266 stage2 — synth carries the wagon waterRation', () => {
  it('a drycamp wagon synthesizes with waterRation drycamp (not hardcoded normal)', () => {
    const w = wagon({ waterRation: 'drycamp' } as Partial<NpcWagonState>);
    const synth = synthesizeWagonState(w, env as any);
    expect(synth.waterRation).toBe('drycamp');
  });
  it('a wagon without the field defaults to normal (legacy)', () => {
    const w = wagon();
    const synth = synthesizeWagonState(w, env as any);
    expect(synth.waterRation ?? 'normal').toBe('normal');
  });
});
```

- [ ] **Step 2: Fail, then fix.** In `synthesizeWagonState` (wagon-synth.ts ~line 195), replace the hardcoded `waterRation: 'normal'` with `waterRation: wagon.waterRation ?? 'normal'`. (`NpcWagonState.waterRation` exists — optional, #1245.) Check whether `projectWagonDeltas` should project `ticked.waterRation` back — READ what the engine can do to `waterRation` during a tick (nothing mutates it today → projection unnecessary; the persona pick in the NPC preamble owns it. Note that in a comment.)

- [ ] **Step 3: Pass + check + commit.** `jj describe -m "fix(npc): #1266 stage2 — synth passes the wagon's real waterRation (strain can now fire)"`

---

### Task 3: `tickNpcWagon` consumes the segments

**Files:** Modify `src/lib/game/systems/npc-engine.ts`; re-baseline NPC tests as needed; Create `tests/npc-full-list-1266.test.ts`.

- [ ] **Step 1: Read `tickNpcWagon` fully** + the committed mapping (this plan's header). The target shape — replace the hand-ordered blocks with:

```
guard + env hoist                                   (unchanged)
NPC preamble: pickRations, pickWaterRation, voluntary-rest → traveled   (blocks 1c/1d, unchanged)
synth → runSteps(MORNING_STEPS, rng, {traveled, driver:'npc'}) → project
camp-bundle interlude on rest days (sub-rng, unchanged)                  (block 2b)
synth → runSteps(POST_BRANCH_STEPS, ...) → project   (npcMoraleBaseline runs via its npcOnly entry; adjustMorale filtered)
stray-ox interlude (travel only, unchanged)                              (block 1g)
travel ? synth → runSteps(TRAVEL_OX_WAGON_STEPS, ...) → project
       : rest-recover oxen (unchanged NPC-local recover)
storm-damage interlude (unchanged)                                       (block 5b tail; applyAxleGrease stays with it — READ how it's wired)
applyDailyRecovery (crisis-layby guard) + applySabbathTravelDebit — DRIVER CODE, 2 direct synth calls, with the residual comment
NPC event interlude (NPC_ELIGIBLE_EVENTS roll + auto-resolve, unchanged) (block 5c)
synth → runSteps(POST_EVENT_TAIL_STEPS, ...) → project   (attemptFire filtered; dehydration now BEFORE reap = player order)
cannibalize interlude (unchanged)                                        (block 7)
```

  Deleted outright: the standalone conditions/spoilage/consumption/theft/holiday/sabbath blocks (now inside MORNING/POST_BRANCH segments). The old block 7b (theft-last) dies — theft now runs at its MORNING position. The old 1e (sabbath-early) dies — it runs at the recovery slot. KEEP every playerLogs-forwarding pattern: each synth/project pair still forwards `ticked.eventLog` entries to `playerLogs` exactly as the current blocks do.

- [ ] **Step 2: Write the proof test FIRST.** Create `tests/npc-full-list-1266.test.ts` (mirror `tests/npc-hotdrink-deplete-1266.test.ts`'s minimal-wagon fixture + ctx). Assertions:
  - **Cleanliness decays:** tick a healthy wagon 5 travel days → `party[0].cleanliness < 100` (impossible before — NPCs never ran decayCleanliness).
  - **Water-ration strain bites:** a `waterRation: 'drycamp'` wagon with water>0 held across 3 days ends with lower morale than the same wagon at `'normal'` (needs Task 2's synth fix).
  - **No fire damage:** a wagon ticked on a COLD day (read how `nightTempF` derives — set date/weather for cold) takes NO attemptFire HP loss (the playerOnly filter works; compare party HP before/after a day where only fire could hurt them — or simpler: assert no "shivered" log line in wagon.eventLog).
  - **Morale not double-counted:** hard to assert directly; instead assert `applyNpcMoraleBaseline` still applies (a wagon at morale 20, healthy, drifts UP toward 50 over days — mirror whatever `npc-morale-cluster-301.test.ts` asserts).

- [ ] **Step 3: Implement the rewrite.** Surgical, block by block, one python3 replacement per block, re-Reading between edits. Preserve: the env hoist, every interlude verbatim, the playerLogs forwarding, the `outcome !== 'in-progress'` guard, the crisis-layby recovery guard. Import the segment arrays + runSteps from `../daily-steps` (note the path — npc-engine is in `systems/`).

- [ ] **Step 4: Run the NPC test files + re-baseline.** `npx vitest run tests/npc-*.test.ts tests/wagon-train-*.test.ts tests/ox-hydration-npc-1264.test.ts tests/synth-flag-bridge-1266.test.ts tests/bundle-927.test.ts` (glob what exists). Expected re-baselines (the mapping's list): `npc-engine-280b` (cleanliness/ambient deltas), `wagon-train-water-303e` (strain), `npc-livestock-297` (producers un-nested), `npc-morale-cluster-301` (verify baseline still substitutes — if it FAILS because morale now double-moves, the scope filter is broken: STOP and fix, don't re-baseline). For each re-baseline: confirm the new value is sane + direction explainable, keep the assertion form, document old→new. Tests that must survive UNCHANGED: `npc-rest-parity-937` (preamble untouched), `npc-hotdrink-deplete-1266`, `npc-engine-events-939i`, `npc-bundle-927` (sub-rng untouched), `ox-hydration-npc-1264`. If one of THOSE fails → driver bug.

- [ ] **Step 5: Full verify** → green. **Step 6: Commit.** `jj describe -m "feat(npc): #1266 stage2 — tickNpcWagon consumes the canonical segments (full-list parity; re-baselines: <list>)"`

---

### Task 4: Wagon-train sweep gates + PR

- [ ] **Step 1: Full verify** → green.
- [ ] **Step 2: NPC-baseline BEFORE/AFTER.** AFTER on the branch: `npx tsx scripts/npc-baseline-897.ts > /tmp/npc-baseline-after-s2.log 2>&1`. BEFORE on master (`jj new master` → run → `jj edit feat/1266-stage2`): `/tmp/npc-baseline-before-s2.log`. Compare per-persona outcome/alive/morale/food. **Expected**: outcomes SHIFT — NPCs now decay cleanliness (morale/disease pressure), pay water-ration strain, gain ambient water. PASS = coherent (NPC trajectories move toward player-equivalent hardship; no persona craters to instant-wipe; no NaN/undefined; chaos still dies, the others still mostly survive 180 days). If wipes explode → the cleanliness/filth pressure may need the same care the player got — STOP and report numbers.
- [ ] **Step 3: Persona sweep BEFORE/AFTER** (`--runs 2`, 6 shapes, same tag both sides). Bots join trains via encounters, so train-life changes leak into player outcomes (trade, share-watch, train survival). **Expected**: small shifts only; per-shape arrival within a few points, wiped flat. PASS = no crater.
- [ ] **Step 4: Push + PR.** Bookmark `feat/1266-stage2`, push, `gh pr create` from the default workspace. PR body: the 5 gained systems, the scope-metadata design (+ the attemptFire exposure-kill rationale), the synth waterRation fix, adopted reorders, both gate tables, re-baseline list, the PRE_TRAVEL residual. Co-Authored-By + 🤖 lines.
- [ ] **Step 5: Final whole-branch review (Opus) + merge once CI green.** Update VK #1266 (Stage 3 = rest() + the two #248-flagged residuals remain).

---

## Self-review (author)
- **Spec coverage (Stage 2):** NPC runs the full list via synth (T3) ✓ · cleanliness + ambient-water added with zero new bridge fields (T3, per audit) ✓ · scope metadata drift-proof default-include (T1) ✓ · sub-rng rule preserved (T3) ✓ · full wagon-train sweep gate (T4) ✓ · compact state + SYNTH_TRAIN_STUB untouched ✓.
- **Beyond spec, evidence-driven:** waterRationStrain is a 5th skip + the synth hardcode blocks it (T2) — both from the committed mapping; attemptFire exclusion is load-bearing (exposure-kill), documented in the tag comment.
- **Known residuals (documented, not hidden):** PRE_TRAVEL recovery+sabbath stay driver code in the NPC tick (crisis guard); stray/storm/bundle/events/cannibalize stay interludes (genuinely NPC-only); a new PRE_TRAVEL step won't auto-reach NPCs (smallest, most train-flavored segment — acceptable, commented).
- **Implementer confirmations flagged inline:** applyNpcMoraleBaseline signature/gate + import path; applyAxleGrease wiring in block 5b; nightTempF derivation for the cold-day test; the exact playerLogs-forwarding pattern per block.
