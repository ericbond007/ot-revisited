# #939i — NPC daily event roll via engine event bank — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace `rollNpcEvent` parallel impl with engine `rollEvent` over the 96-event bank, gated by category + per-event `npcSkip` opt-out.

**Architecture:** New `NPC_ELIGIBLE_EVENTS` constant in `content/events.ts` filters `EVENTS` by category (allow: wagon/encounter/personal/health/finds; deny: weather/historical) with a per-event `npcSkip: true` opt-out. NPC tick block in `tickNpcWagon` builds a synthesized GameState, calls `rollEvent(shim, rng, { pool: NPC_ELIGIBLE_EVENTS, fireChance: 0.06 })`, picks a choice via `persona.pickNpcEventChoice → isDefault → first`, runs `resolveEvent`, projects deltas back, and forwards the eventLog entries to player news with a `(wagon.name)` suffix.

**Spec:** `docs/superpowers/specs/2026-05-12-939i-npc-event-roll-design.md`

---

### Task 1: Add `npcSkip` to `GameEvent` type

**Files:**
- Modify: `src/lib/game/content/events.ts` (the `GameEvent` interface near top of file)

- [ ] **Step 1: Write the failing test**

Add to `tests/npc-engine-events-939i.test.ts` (new file):

```ts
import { describe, it, expect } from 'vitest';
import { EVENTS } from '../src/lib/game/content/events';

describe('#939i — npcSkip flag on GameEvent', () => {
  it('every event accepts npcSkip as an optional boolean', () => {
    // Surface test: at least one event has the field set, or the type allows it.
    // The category filter is the primary mechanism — npcSkip is the escape hatch.
    for (const e of EVENTS) {
      if ('npcSkip' in e) {
        expect(typeof e.npcSkip).toBe('boolean');
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/npc-engine-events-939i.test.ts`
Expected: PASS (the surface test passes immediately since no event sets it yet). The "failing" red here is the `import` itself if the type doesn't accept the flag — typecheck the file via `npm run check`.

- [ ] **Step 3: Add `npcSkip` to the `GameEvent` interface**

In `src/lib/game/content/events.ts`, locate the `GameEvent` interface (search for `export interface GameEvent`). Add:

```ts
  /** #939i — when true, this event is excluded from `NPC_ELIGIBLE_EVENTS`
   *  even if its category is in the NPC allow-list. Use for events whose
   *  `apply()` reads player-only state the wagon-synth doesn't bridge. */
  npcSkip?: boolean;
```

- [ ] **Step 4: Verify**

Run: `npm run check`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
jj describe -m "feat(ai): #939i task 1 — add npcSkip flag to GameEvent type"
```

---

### Task 2: Export `NPC_ELIGIBLE_EVENTS` from `content/events.ts`

**Files:**
- Modify: `src/lib/game/content/events.ts` (add export near end of file)

- [ ] **Step 1: Write the failing test**

Append to `tests/npc-engine-events-939i.test.ts`:

```ts
import { NPC_ELIGIBLE_EVENTS } from '../src/lib/game/content/events';

describe('#939i — NPC_ELIGIBLE_EVENTS category allow-list', () => {
  const ALLOWED = new Set(['wagon', 'encounter', 'personal', 'health', 'finds']);
  const DENIED  = new Set(['weather', 'historical']);

  it('only contains events from allowed categories', () => {
    for (const e of NPC_ELIGIBLE_EVENTS) {
      expect(ALLOWED.has(e.category)).toBe(true);
      expect(DENIED.has(e.category)).toBe(false);
    }
  });

  it('excludes any event with npcSkip: true', () => {
    for (const e of NPC_ELIGIBLE_EVENTS) {
      expect(e.npcSkip).not.toBe(true);
    }
  });

  it('has at least one event per allowed category', () => {
    for (const cat of ALLOWED) {
      const found = NPC_ELIGIBLE_EVENTS.some((e) => e.category === cat);
      expect(found).toBe(true);
    }
  });

  it('contains roughly 30 events (sanity check on filter math)', () => {
    expect(NPC_ELIGIBLE_EVENTS.length).toBeGreaterThanOrEqual(25);
    expect(NPC_ELIGIBLE_EVENTS.length).toBeLessThanOrEqual(35);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/npc-engine-events-939i.test.ts`
Expected: FAIL — `NPC_ELIGIBLE_EVENTS` not exported.

- [ ] **Step 3: Add the export**

At the end of `src/lib/game/content/events.ts`, append:

```ts
// #939i — NPC event pool. Engine events run on NPC wagons via wagon-
// synth in `tickNpcWagon`. Allow-list by category: wagon, encounter,
// personal, health, finds. Weather (train-shared) and historical
// (one-shot named) intentionally excluded. Per-event `npcSkip: true`
// further opts out events whose `apply()` reads state the synth
// doesn't bridge.
const NPC_ALLOWED_CATEGORIES: ReadonlySet<EventCategory> = new Set([
  'wagon', 'encounter', 'personal', 'health', 'finds'
]);

export const NPC_ELIGIBLE_EVENTS: readonly GameEvent[] = EVENTS.filter(
  (e) => NPC_ALLOWED_CATEGORIES.has(e.category) && e.npcSkip !== true
);
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/npc-engine-events-939i.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
jj describe -m "feat(ai): #939i task 2 — export NPC_ELIGIBLE_EVENTS pool"
```

---

### Task 3: Wire NPC tick to engine `rollEvent`

**Files:**
- Modify: `src/lib/game/systems/npc-engine.ts` (replace the `rollNpcEvent` call block with a synth/project pattern around engine `rollEvent` + `resolveEvent`)

- [ ] **Step 1: Write the failing test**

Append to `tests/npc-engine-events-939i.test.ts`:

```ts
import { tickNpcWagon } from '../src/lib/game/systems/npc-engine';
import { generateTrain } from '../src/lib/game/content/trains';
import { makeRng } from '../src/lib/game/rng';

describe('#939i — tickNpcWagon fires from engine event bank', () => {
  it('fires ~0.06 per wagon-day across many trials', () => {
    const train = generateTrain('fire-rate', 1, 'independence_mo', makeRng('seed'), { fresh: true });
    const wagon = train.companions[0];
    let fires = 0;
    const trials = 5000;
    for (let i = 0; i < trials; i++) {
      const result = tickNpcWagon(wagon, {
        day: 1 + (i % 30),
        traveled: true,
        pace: 'moderate',
        terrain: 'prairie',
        weather: 'clear',
        traveledMiles: 14
      }, makeRng(`r${i}`));
      if (result.playerLogs.length > 0) fires++;
    }
    // 0.06 fire chance × 5000 trials ≈ 300, allow ±50%
    expect(fires).toBeGreaterThan(150);
    expect(fires).toBeLessThan(450);
  });

  it('bubbles event log lines with the wagon name suffix', () => {
    const train = generateTrain('logs', 1, 'independence_mo', makeRng('seed2'), { fresh: true });
    const wagon = train.companions[0];
    let foundSuffixed = false;
    for (let i = 0; i < 200; i++) {
      const result = tickNpcWagon(wagon, {
        day: 1,
        traveled: true,
        pace: 'moderate',
        terrain: 'prairie',
        weather: 'clear',
        traveledMiles: 14
      }, makeRng(`l${i}`));
      const hit = result.playerLogs.find((s) => s.endsWith(`(${wagon.name})`));
      if (hit) { foundSuffixed = true; break; }
    }
    expect(foundSuffixed).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/npc-engine-events-939i.test.ts`
Expected: FAIL — fire rate today is 0.06 from `npc-events.ts`'s parallel impl, so the first test may pass coincidentally; the suffix test passes too. **The real verification:** after this task, `rollNpcEvent` is no longer called. Use `git diff` to confirm.

- [ ] **Step 3: Replace `rollNpcEvent` block with synth/project pattern**

In `src/lib/game/systems/npc-engine.ts`, locate the existing event block:

```ts
  // 5c. NPC event roll (#280c). May damage wagon, sicken a member,
  // kill an ox, etc. Result bubbles up as a player news entry.
  const eventResult = rollNpcEvent(next, ctx, rng);
  if (eventResult) {
    next = eventResult.wagon;
    if (eventResult.playerLog) playerLogs.push(eventResult.playerLog);
  }
```

Replace with:

```ts
  // 5c. #939i — NPC event roll via engine event bank (replaces the
  // rollNpcEvent parallel impl). Synthesize a per-wagon GameState,
  // roll from NPC_ELIGIBLE_EVENTS at the per-wagon fire chance, auto-
  // resolve via persona → default, project deltas back, suffix log
  // entries with the wagon name.
  {
    const synth = synthesizeWagonState(next, env);
    const event = rollEvent(synth, rng, {
      pool: NPC_ELIGIBLE_EVENTS,
      fireChance: NPC_FIRE_CHANCE
    });
    if (event) {
      const personaChoice = persona.pickNpcEventChoice(
        synth, event.id, event.choices.map((c) => c.id), rng
      );
      const choiceId = personaChoice
        ?? event.choices.find((c) => c.isDefault)?.id
        ?? event.choices[0]?.id;
      if (choiceId) {
        let ticked: GameState;
        try {
          ticked = resolveEvent(synth, event, choiceId, rng);
        } catch {
          // Defensive: pickNpcEventChoice returned an unknown id.
          // Fall back to default → first.
          const fallback = event.choices.find((c) => c.isDefault)?.id ?? event.choices[0].id;
          ticked = resolveEvent(synth, event, fallback, rng);
        }
        next = projectWagonDeltas(ticked, next);
        for (const entry of ticked.eventLog) {
          playerLogs.push(`${entry.text} (${next.name})`);
        }
      }
    }
  }
```

Update imports at the top of the file:

```ts
import { rollEvent, resolveEvent } from './events';
import { NPC_ELIGIBLE_EVENTS } from '../content/events';
// remove: import { rollNpcEvent } from './npc-events';
```

Add the constant near the other NPC constants:

```ts
/** #939i — per-NPC-per-day event fire chance. Preserves today's
 *  parallel-impl rate (0.06) so a 10-wagon train still surfaces
 *  ~0.6 events/day. The wider 31-event pool brings variety, not volume. */
const NPC_FIRE_CHANCE = 0.06;
```

- [ ] **Step 4: Run tests**

Run: `npm run verify`
Expected: 0 typecheck errors. Test suite passes (some old npc-events tests may fail — handled in Task 5).

- [ ] **Step 5: Commit**

```bash
jj describe -m "feat(ai): #939i task 3 — wire NPC tick to engine rollEvent"
```

---

### Task 4: Smoke-fire every eligible event on a fresh NPC wagon

**Files:**
- Modify: `tests/npc-engine-events-939i.test.ts`

- [ ] **Step 1: Write the smoke-fire test**

Append:

```ts
import { resolveEvent } from '../src/lib/game/systems/events';
import { synthesizeWagonState, projectWagonDeltas } from '../src/lib/game/systems/wagon-synth';

describe('#939i — smoke-fire every NPC-eligible event', () => {
  it('every event resolves cleanly with default choice on a fresh wagon', () => {
    const train = generateTrain('smoke', 1, 'independence_mo', makeRng('s'), { fresh: true });
    const wagon = train.companions[0];
    const env = {
      day: 1,
      date: { year: 1849, month: 4, day: 15 },
      location: { trailPosition: 100, nextLandmarkId: 'ft_kearny',
        previousLandmarkId: null, milesTraveled: 100, terrain: 'prairie' as const },
      weather: 'clear' as const,
      pace: 'moderate' as const
    };
    for (const ev of NPC_ELIGIBLE_EVENTS) {
      const synth = synthesizeWagonState(wagon, env);
      // Gate may reject — skip if so; we only assert the events that fire don't crash.
      if (ev.gate && !ev.gate(synth)) continue;
      const choiceId = ev.choices.find((c) => c.isDefault)?.id ?? ev.choices[0]?.id;
      if (!choiceId) continue;
      const ticked = resolveEvent(synth, ev, choiceId, makeRng(`sf-${ev.id}`));
      const projected = projectWagonDeltas(ticked, wagon);
      expect(Number.isFinite(projected.morale)).toBe(true);
      expect(projected.morale).toBeGreaterThanOrEqual(0);
      expect(projected.morale).toBeLessThanOrEqual(100);
      for (const id of Object.keys(projected.inventory)) {
        expect(projected.inventory[id]).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run tests/npc-engine-events-939i.test.ts -t smoke-fire`
Expected: PASS. If any event throws or leaves invalid state, mark it with `npcSkip: true` in `content/events.ts` and re-run.

- [ ] **Step 3: Commit**

```bash
jj describe -m "feat(ai): #939i task 4 — smoke-fire every NPC-eligible event"
```

---

### Task 5: Delete `systems/npc-events.ts` and clean up tests

**Files:**
- Delete: `src/lib/game/systems/npc-events.ts`
- Modify: `tests/wagon-train-events-280c.test.ts` (drop parallel-impl-specific assertions; keep tick-integration tests)

- [ ] **Step 1: Identify test imports**

Run: `grep -rn "from.*npc-events" tests/ src/`
Note every file that imports from `systems/npc-events.ts`.

- [ ] **Step 2: Delete the file**

```bash
rm src/lib/game/systems/npc-events.ts
```

- [ ] **Step 3: Fix or delete the test file(s) found in Step 1**

For `tests/wagon-train-events-280c.test.ts`:
- Drop any test that directly imports + calls `rollNpcEvent` or references `NPC_EVENTS` constant.
- Keep tests that hit `tickNpcWagon` end-to-end.
- Replace the deleted blocks with a `#939i` comment noting the parallel impl removal and that engine-event coverage lives in `tests/npc-engine-events-939i.test.ts`.

- [ ] **Step 4: Run verify**

Run: `npm run verify`
Expected: 0 errors, all tests pass.

- [ ] **Step 5: Commit**

```bash
jj describe -m "feat(ai): #939i task 5 — delete npc-events.ts parallel impl"
```

---

### Task 6: Open PR, harness sanity, merge

- [ ] **Step 1: Push + open PR**

```bash
jj git push --bookmark feat/npc-engine-events-939i --allow-new
gh pr create --title "#949 (#939i) NPC event roll via engine bank" --base master --head feat/npc-engine-events-939i --body "..."
```

PR body should reference `docs/superpowers/specs/2026-05-12-939i-npc-event-roll-design.md` and call out the locked decisions.

- [ ] **Step 2: Pre/post harness diff**

```bash
node --import tsx/esm scripts/persona-profession-sweep.ts > /tmp/sweep-pre-939i.md
# merge PR
node --import tsx/esm scripts/persona-profession-sweep.ts > /tmp/sweep-post-939i.md
diff /tmp/sweep-pre-939i.md /tmp/sweep-post-939i.md
```

Expect modest wipe-rate movement (5pp or less). Anything bigger triggers a content audit before next PR.

- [ ] **Step 3: Wait for CI green, merge, reset, mark VK #949 Shipped**

Standard merge dance.
