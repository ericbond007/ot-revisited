# #1266 Stage 3 — rest() onto the spine + residuals — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fold the 4th hand-copied daily ordering (`rest()`) onto the canonical DAILY_STEPS spine, and retire the three Stage-2 residuals: PRE_TRAVEL not auto-reaching NPCs, sabbathDebit-on-override, and the NPC-crisis double-tail.

**Architecture:** `rest()`'s per-day loop becomes tickWeather → MORNING → rest-ox-block → POST_BRANCH → rest-interludes (forage/morale/camp-actions) → PRE_TRAVEL → POST_EVENT_TAIL → advanceTrain(false) → pushMoraleHistory → day-advance. `TickCtx` gains optional `companyRestMode` so the NPC crisis-layby recovery carve-out moves into the `applyDailyRecovery` step and `tickNpcWagon` consumes PRE_TRAVEL_STEPS as a segment. `applyCompanyDissent` consumes PRE_TRAVEL_STEPS (adds the missing Sabbath debit on override). `applyPendingChoice` learns a `_tailRanDay` flag so an NPC-crisis pause (which fires AFTER the tail + advanceTrain already ran) doesn't re-run them.

**Tech stack:** TypeScript, vitest, jj. Workspace: `/home/eric/projects/hoosierTrail-1266-s3`, bookmark `feat/1266-stage3`, base master `7174d77`.

**Gates:** full `npm run verify`; persona sweep BEFORE (master, `/tmp/sweep-s3-before.log`) vs AFTER same tag `1266-s3` — expect a small coherent shift (rest days now run theft/spoilage/cleanliness/holidays/trainShare); NPC-baseline byte-diff for T1 (must be byte-identical — segment consumption replaces equivalent driver code).

---

### Task 1: PRE_TRAVEL segment reaches NPCs (retire the npc-engine residual)

**Files:**
- Modify: `src/lib/game/daily-steps.ts` (TickCtx + applyDailyRecovery step carve)
- Modify: `src/lib/game/systems/npc-engine.ts` (residual block → segment consumption)
- Test: `tests/daily-steps-1266.test.ts` (carve unit tests)

- [ ] **Step 1: failing tests** — in `tests/daily-steps-1266.test.ts` add:

```ts
describe('#1266 stage3 — PRE_TRAVEL crisis-layby carve', () => {
  // build a state with one condition-free member at health 50, morale 60, lay-by
  it('npc + crisis_layby skips daily recovery', () => {
    const s = base(); // any helper state w/ member health 50
    const out = runSteps(PRE_TRAVEL_STEPS, s, makeRng('x'), { traveled: false, driver: 'npc', companyRestMode: 'crisis_layby' });
    expect(out.party[0].health).toBe(50); // no lay-by heal
  });
  it('npc + maintenance_layby keeps the heal', () => {
    const s = base();
    const out = runSteps(PRE_TRAVEL_STEPS, s, makeRng('x'), { traveled: false, driver: 'npc', companyRestMode: 'maintenance_layby' });
    expect(out.party[0].health).toBeGreaterThan(50);
  });
  it('player heals even in crisis_layby (carve is NPC-only)', () => {
    const s = base();
    const out = runSteps(PRE_TRAVEL_STEPS, s, makeRng('x'), { traveled: false, driver: 'player', companyRestMode: 'crisis_layby' });
    expect(out.party[0].health).toBeGreaterThan(50);
  });
});
```

- [ ] **Step 2: run, verify FAIL** (`companyRestMode` not on TickCtx → tsc error = the failure).
- [ ] **Step 3: implement** — daily-steps.ts:

```ts
import type { GameState, CompanyRestMode } from './types';
// TickCtx gains:
  /** #1266 stage3 — company decision mode, when the wagon is in a captained
   *  train. Read by applyDailyRecovery's NPC crisis-layby carve (#1046 §13 C). */
  companyRestMode?: CompanyRestMode;
// PRE_TRAVEL applyDailyRecovery step becomes:
  { id: 'applyDailyRecovery', run: (s, _rng, ctx) =>
      (ctx.driver === 'npc' && ctx.companyRestMode === 'crisis_layby')
        ? s // #1046 §13 (C) — crisis carve: no NPC lay-by heal, else undead crisis lock
        : applyDailyRecovery(s, ctx.traveled) },
```

npc-engine.ts: replace BOTH residual blocks (the `#1266 stage2 residual` comment + recovery synth + sabbath-debit synth) with one segment round-trip:

```ts
  // #1266 stage3 — PRE_TRAVEL via the spine. applyTrainShare is playerOnly
  // (filtered); the crisis-layby recovery carve lives in the step itself.
  {
    const synth = synthesizeWagonState(next, env);
    const ticked = runSteps(PRE_TRAVEL_STEPS, synth, rng, { traveled, driver: 'npc', companyRestMode: ctx.companyRestMode });
    next = projectWagonDeltas(ticked, next);
    for (const entry of ticked.eventLog) {
      playerLogs.push(`${entry.text} (${next.name})`);
    }
  }
```

Add `PRE_TRAVEL_STEPS` to the daily-steps import in npc-engine.ts; drop now-unused direct imports of `applyDailyRecovery` / `applySabbathTravelDebit` if no other use remains.

- [ ] **Step 4: tests pass** — `npx vitest run tests/daily-steps-1266.test.ts tests/npc-full-list-1266.test.ts tests/company-rest-1046.test.ts tests/company-rest-c2-1046.test.ts` then full `npm run verify`. Expect ZERO re-baselines (identical sequence: recovery then debit, no rng consumed by either, trainShare filtered).
- [ ] **Step 5: NPC byte-gate** — `npx tsx scripts/npc-baseline-897.ts > /tmp/npc-s3-t1.log`; before the edit capture `/tmp/npc-s3-t0.log` at the same revision parent; `diff` must be empty.
- [ ] **Step 6: commit** (`jj describe` running message; squash at end).

### Task 2: applyCompanyDissent consumes PRE_TRAVEL_STEPS (Sabbath debit on override)

**Files:**
- Modify: `src/lib/game/engine-pausable.ts:367-374`
- Test: `tests/company-dissent-1046b.test.ts` or new `tests/dissent-sabbath-debit-1266.test.ts`

- [ ] **Step 1: failing test** — build a train state on a SUNDAY where the company decision is sabbath_layby and dissent is pending; call `applyCompanyDissent(s, 'override', rng)`; assert morale reflects BOTH the override cost AND the Sabbath debit (and the "Traveled on the Sabbath" log line exists). Also a control: same on a Tuesday maintenance_layby override → no Sabbath line, morale delta unchanged from current behavior.
- [ ] **Step 2: run, FAIL** (no Sabbath line today).
- [ ] **Step 3: implement** — replace the manual recovery+trainShare block:

```ts
  const dc = s.wagonTrain?.companyDecisionBlock?.dissentChoice;
  const travels = !s.wagonTrain || dc === 'override' || dc === 'lobby_ok';
  // #1266 stage3 — PRE_TRAVEL via the spine: recovery (lay-by heal stays even
  // on override — the team rested while the company argued), #910 train share
  // (self-gates to lay-by blocks), and the Sabbath debit (previously skipped
  // here — an override on a Sabbath lay-by now pays the morale cost).
  s = runSteps(PRE_TRAVEL_STEPS, s, rng, { traveled: travels, driver: 'player' });
```

- [ ] **Step 4: tests pass** + full verify (dissent tests may re-baseline ONLY for Sunday-override fixtures).
- [ ] **Step 5: commit.**

### Task 3: NPC-crisis double-tail fix (`_tailRanDay`)

**Files:**
- Modify: `src/lib/game/engine-pausable.ts` (tickDayPausable advanceTrain pause site + applyPendingChoice)
- Test: new `tests/npc-crisis-tail-1266.test.ts`

Today: tickDayPausable runs POST_EVENT_TAIL (line ~330) then advanceTrain (line ~337); if advanceTrain returns a pendingEvent (NPC starvation crisis), the pause returns. applyPendingChoice then re-runs POST_EVENT_TAIL **and** advanceTrain(s, true) — double fire/dehydration for the player and a double NPC tick that day.

- [ ] **Step 1: failing test** — craft a state where advanceTrain fires an NPC crisis pendingEvent (use the existing crisis fixtures from `tests/npc-crisis-events*.test.ts` as the template). Tick once → get pendingEvent. Record player firewood / `_dehydrationDays` / NPC wagon `.day`-equivalent (e.g. a companion's food). Resolve via applyPendingChoice. Assert: dehydration applied ONCE (player HP/dry counters reflect one application), advanceTrain effect applied ONCE (companion food drained one day's worth), day advanced once.
- [ ] **Step 2: run, FAIL** (double-applied today).
- [ ] **Step 3: implement** — in tickDayPausable, at the advanceTrain pause:

```ts
  const trainResult = advanceTrain(s, companyMode === 'travel', milesTraveledToday);
  s = trainResult.state;
  if (trainResult.pendingEvent) {
    // #1266 stage3 — the tail + advanceTrain already ran this tick; mark it so
    // applyPendingChoice doesn't double-apply them on resume.
    s = { ...s, flags: { ...s.flags, _tailRanDay: s.day } };
    return { state: s, pendingEvent: trainResult.pendingEvent };
  }
```

in applyPendingChoice, after resolveEvent + cooldown flag:

```ts
  const tailAlreadyRan = s.flags._tailRanDay === s.day;
  if (tailAlreadyRan) {
    const cleared = { ...s.flags };
    delete (cleared as Record<string, unknown>)._tailRanDay;
    s = { ...s, flags: cleared };
  } else {
    s = runSteps(POST_EVENT_TAIL_STEPS, s, rng, { traveled: true, driver: 'player' });
  }
  ...
  if (!tailAlreadyRan) {
    const trainResult = advanceTrain(s, true);
    s = trainResult.state;
  }
```

(keep the existing comments; adjust the #300 axle-grease comment if it references the always-run advanceTrain).

- [ ] **Step 4: tests pass** + full verify. Watch `tests/npc-crisis-events*.test.ts` — fixtures that asserted the doubled values must re-baseline to single-application (that's the point — note each in the commit).
- [ ] **Step 5: commit.**

### Task 4: rest() onto the spine

**Files:**
- Modify: `src/lib/game/actions/rest.ts` (day loop → segments; prune imports)
- Modify: `src/lib/game/engine-pausable.ts:88` (remove pushMoraleHistory double-wrap on the auto-Sabbath path)
- Test: re-baseline `tests/actions/rest.test.ts`, `tests/multi-day-camp-187.test.ts`, `tests/camp-audit-195.test.ts`, `tests/auto-sabbath-rest-1189.test.ts` as needed; new `tests/rest-spine-1266.test.ts`

- [ ] **Step 1: failing proof tests** — new `tests/rest-spine-1266.test.ts`:
  1. **Spoilage ticks in camp:** state with fresh `game_meat` + spoil clock near expiry; `rest(s, 3)` → meat spoiled (today: rest never runs applySpoilage → stays fresh).
  2. **Holiday fires in camp:** date = July 3, `rest(s, 2)` → July 4 morale lift + log line (today: missed).
  3. **Theft can fire in camp:** seed-hunt a deterministic seed where rollDailyTheft fires during a rest day; assert item loss (today: impossible).
  4. **Morale history grows:** `rest(s, 3)` → `moraleHistory.length` grew by 3 (capped 7).
  5. **dig_well still beats dehydration:** keg=0, dry streak active, campActions=['dig_well'] → no dehydration damage that day (regression guard for the tail running after camp actions).
  6. **Cleanliness decays in camp** (no wash action): party cleanliness lower after `rest(s, 2)`.
- [ ] **Step 2: run, FAIL** (1, 2, 3, 4, 6 fail today; 5 passes — keep as guard).
- [ ] **Step 3: implement** — rest.ts day loop becomes:

```ts
  for (let i = 0; i < days; i++) {
    const rng = makeRng(`${s.seed}:action:rest:${s.day}:0`);
    const ctx: TickCtx = { traveled: false, driver: 'player' };

    s = tickWeather(s, rng);
    s = runSteps(MORNING_STEPS, s, rng, ctx);

    // Rest-day ox block (richer than the engine lay-by branch: feed +
    // teamster/blacksmith multipliers + 30/day base) — stays driver code.
    const restFeed = consumeOxenFeed(s);
    s = restFeed.state;
    const blacksmithMult = hasLiveBlacksmith(s) ? 1.10 : 1;
    const oxRecovery = Math.round(
      OX_FATIGUE_RECOVERY_PER_REST_DAY
        * (hasLiveTeamster(s) ? TEAMSTER_RECOVERY_MULT : 1)
        * blacksmithMult
        * restFeed.effectiveGrazing
    );
    s = { ...s, oxen: recoverOxenFatigue(s.oxen, oxRecovery) };
    s = { ...s, oxen: recoverOxenHealth(s.oxen) };

    s = runSteps(POST_BRANCH_STEPS, s, rng, ctx); // adjustMorale + holidays (holidays NEW in camp)

    // ... farmer forage block UNCHANGED ...
    // ... +10 base rest morale UNCHANGED ...
    // ... preacher +1 UNCHANGED ...
    // ... camp actions (i === 0) block UNCHANGED ...

    // PRE_TRAVEL: lay-by recovery (replaces the old inline REST_HEAL block —
    // same formula via layByRecovery), #910 train share (NEW in camp,
    // self-gates), Sabbath debit (no-op: traveled=false).
    s = runSteps(PRE_TRAVEL_STEPS, s, rng, ctx);
    // Tail AFTER camp actions so dig_well refills clear the dry-day counter
    // the same tick (fire + dehydration + reap).
    s = runSteps(POST_EVENT_TAIL_STEPS, s, rng, ctx);

    s = advanceTrain(s, false).state;
    s = pushMoraleHistory(s);
    s = { ...s, day: s.day + 1, date: advanceOneDay(s.date) };
  }
```

Delete from rest.ts: the inline heal block (REST_HEAL_PER_DAY × healingMultiplier loop), the early hand-listed system calls (progressConditions/applyEggLay/applyDailyConsumption/applyDietVariety/applyHotDrinks/applyDirtyWaterRisk/applyStarvation/adjustMorale), the early `attemptFire` call, the late applyDehydration/reapDead calls. Prune imports accordingly (keep setSpoilClock, consumeOxenFeed, oxen recovery fns, camp-action imports, tickWeather, advanceTrain; add runSteps + segments + TickCtx + pushMoraleHistory).

engine-pausable.ts:88 — auto-Sabbath wrap: `pushMoraleHistory(sundayLayBy(...))` → `sundayLayBy(...)` (rest() now pushes per-day internally; the wrap would double-push). Grep all `sundayLayBy(`/`rest(` callers for other external pushMoraleHistory wraps and remove the same way.

- [ ] **Step 4: proof tests pass; re-baseline** — run full verify; rest/camp/sabbath tests with exact-value assertions shift (different rng draw order + new systems). Re-baseline each, sanity-checking the new value is explainable (e.g. morale now includes holiday lift; food lower because spoilage). Document every re-baselined assertion in the commit message.
- [ ] **Step 5: commit.**

### Task 5: gates + ship

- [ ] Full `npm run verify` (all 241+ files).
- [ ] AFTER persona sweep: `npx tsx scripts/persona-profession-sweep.ts --runs 2 --shapes 3/0,4/0,2/2,2/4,4/2,3/3 --tag 1266-s3 > /tmp/sweep-s3-after.log`; compare vs `/tmp/sweep-s3-before.log` (`diff <(grep '^|' before) <(grep '^|' after)`). Expect: small coherent shift (rest days harsher: theft/spoilage/cleanliness; + holiday/trainShare lifts). PASS = no crater, wiped counts comparable, shift explainable.
- [ ] NPC-baseline byte-diff for the T1 change already done in Task 1.
- [ ] `jj describe` final message (cover: 4th ordering folded, the 3 residuals retired with the sabbath-on-override + double-tail fixes, systems rest days gained, re-baseline list, gate tables). Push, PR, Opus whole-branch review, CI, merge, VK #1266 update (Stage 3 = done → close if all stages complete), workspace cleanup.

## Self-review notes

- T1 must land before T4 only for cleanliness of diffs (no hard dependency). T2/T3 independent.
- The spec's "camp-finish parity" gate = CampSummary diffing still correct after the rewrite (snapshot logic untouched; inventoryDelta will now include spoilage losses — that's correct surfacing, check the modal copes with negative deltas it already supports).
- rest() keeps its own rng namespace (`:action:rest:`) — no cross-driver stream interference.
- applyAmbientWaterRefill in MORNING runs in camp now (it already ran for the player travel path with the same ctx-independence) — acceptable: ambient refill is weather/terrain-gated internally.
