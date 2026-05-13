# #939j — Unify cannibalism path — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** One shared helper for cannibalism math, routed through three player surfaces (burial-event choice, new `cannibalism_corpse` camp action, existing `cannibalism_straws`) and the NPC tick — with uniform constants, child cannibalism exposed everywhere, and `_cannibalismCount` bookkeeping that ticks from every consumption.

**Architecture:** New `src/lib/game/systems/cannibal.ts` exports `applyCannibalize`, `findFreshUnconsumedCorpse`, `hasFoodOnHand`, and the shared constants. The burial event's `eat_the_body.apply` collapses to a call into `applyCannibalize`. A reinstated `cannibalism_corpse` camp action calls the same helper. NPC `maybeCannibalize` runs the helper through wagon-synth. Adult morale unifies on −18; child cannibalism eligible everywhere; `_cannibalismCount` increments on every call.

**Spec:** `docs/superpowers/specs/2026-05-12-939j-cannibal-unify-design.md`

---

### Task 1: Create `systems/cannibal.ts` with helper + tests

**Files:**
- Create: `src/lib/game/systems/cannibal.ts`
- Create: `tests/cannibal-unified-939j.test.ts`

- [ ] **Step 1: Write the failing tests**

`tests/cannibal-unified-939j.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  applyCannibalize,
  findFreshUnconsumedCorpse,
  hasFoodOnHand,
  CANNIBAL_ADULT_MEAT_LB,
  CANNIBAL_ADULT_MORALE_HIT,
  CANNIBAL_CHILD_MEAT_LB,
  CANNIBAL_CHILD_MORALE_HIT,
  CANNIBAL_FRESHNESS_DAYS
} from '../src/lib/game/systems/cannibal';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState, PartyMember } from '../src/lib/game/types';

function emptyFood<T extends Record<string, number>>(inv: T): T {
  const out: Record<string, number> = { ...inv };
  for (const k of ['flour','bacon','beans','hardtack','jerky','pemmican','salt_pork',
    'game_meat','berries','egg','milk','dried_fruit','cheese','butter','cornmeal']) {
    delete out[k];
  }
  return out as T;
}

function game(): GameState {
  const s = createInitialState({
    seed: 'cannibal',
    leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'doctor' }],
    startDate: { year: 1849, month: 6, day: 15 }
  });
  return { ...s, inventory: emptyFood(s.inventory) };
}

function killMember(state: GameState, id: string, deathCause: string, deathDay: number): GameState {
  return {
    ...state,
    party: state.party.map((m) =>
      m.id === id ? { ...m, dead: true, health: 0, deathCause, deathDay } : m
    )
  };
}

describe('#939j — applyCannibalize constants', () => {
  it('exports the locked constants', () => {
    expect(CANNIBAL_ADULT_MEAT_LB).toBe(50);
    expect(CANNIBAL_ADULT_MORALE_HIT).toBe(18);
    expect(CANNIBAL_CHILD_MEAT_LB).toBe(25);
    expect(CANNIBAL_CHILD_MORALE_HIT).toBe(25);
    expect(CANNIBAL_FRESHNESS_DAYS).toBe(5);
  });
});

describe('#939j — applyCannibalize (adult)', () => {
  it('marks consumed, +50 meat, −18 morale, +1 _cannibalismCount', () => {
    let s = game();
    s = killMember(s, s.party[1].id, 'Starvation', s.day);
    const moraleBefore = s.morale;
    const { state, log } = applyCannibalize(s, s.party[1].id, makeRng('t'));
    expect(state.party[1].consumed).toBe(true);
    expect(state.inventory.game_meat ?? 0).toBe(50);
    expect(state.morale).toBe(Math.max(0, moraleBefore - 18));
    expect(state.flags._cannibalismCount).toBe(1);
    expect(log).toMatch(/50 lb/);
    expect(log).toMatch(/Morale −18/);
  });
});

describe('#939j — applyCannibalize (child)', () => {
  it('marks consumed, +25 meat, −25 morale, +1 count', () => {
    let s = game();
    // Make first companion a child for this test.
    s = { ...s, party: s.party.map((m, i) => i === 1 ? { ...m, kind: 'child' as const } : m) };
    s = killMember(s, s.party[1].id, 'Starvation', s.day);
    const moraleBefore = s.morale;
    const { state, log } = applyCannibalize(s, s.party[1].id, makeRng('t'));
    expect(state.inventory.game_meat ?? 0).toBe(25);
    expect(state.morale).toBe(Math.max(0, moraleBefore - 25));
    expect(state.flags._cannibalismCount).toBe(1);
    expect(log).toMatch(/25 lb/);
  });
});

describe('#939j — findFreshUnconsumedCorpse', () => {
  it('returns null when no dead members', () => {
    expect(findFreshUnconsumedCorpse(game())).toBeNull();
  });

  it('returns the most-recent fresh adult', () => {
    let s = game();
    s = killMember(s, s.party[1].id, 'Cholera', s.day - 1);
    expect(findFreshUnconsumedCorpse(s)?.id).toBe(s.party[1].id);
  });

  it('rejects corpses past the freshness window', () => {
    let s = game();
    s = killMember(s, s.party[1].id, 'Cholera', s.day - 6);
    expect(findFreshUnconsumedCorpse(s)).toBeNull();
  });

  it('rejects already-consumed corpses', () => {
    let s = game();
    s = killMember(s, s.party[1].id, 'Cholera', s.day);
    s = { ...s, party: s.party.map((m) => m.id === s.party[1].id ? { ...m, consumed: true } : m) };
    expect(findFreshUnconsumedCorpse(s)).toBeNull();
  });

  it('child corpse: starvation deathCause eligible (all casings)', () => {
    for (const cause of ['Starvation', 'starvation', 'attrition']) {
      let s = game();
      s = { ...s, party: s.party.map((m, i) => i === 1 ? { ...m, kind: 'child' as const } : m) };
      s = killMember(s, s.party[1].id, cause, s.day);
      expect(findFreshUnconsumedCorpse(s)?.id).toBe(s.party[1].id);
    }
  });

  it('child corpse: non-starvation cause ineligible', () => {
    let s = game();
    s = { ...s, party: s.party.map((m, i) => i === 1 ? { ...m, kind: 'child' as const } : m) };
    s = killMember(s, s.party[1].id, 'Cholera', s.day);
    expect(findFreshUnconsumedCorpse(s)).toBeNull();
  });
});

describe('#939j — hasFoodOnHand', () => {
  it('returns false on empty-food state', () => {
    expect(hasFoodOnHand(game())).toBe(false);
  });

  it('returns true when any food key has > 0', () => {
    const s = { ...game(), inventory: { ...game().inventory, flour: 5 } };
    expect(hasFoodOnHand(s)).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify fails**

Run: `npx vitest run tests/cannibal-unified-939j.test.ts`
Expected: FAIL — `systems/cannibal.ts` doesn't exist.

- [ ] **Step 3: Create `systems/cannibal.ts`**

```ts
// #939j — Shared cannibalism math used by the burial-event choice,
// the cannibalism_corpse camp action, the cannibalism_straws camp
// action's NPC-mirror, and tickNpcWagon's maybeCannibalize. One file
// owns the constants + the apply logic so the math can't drift.

import type { GameState, PartyMember } from '../types';
import type { Rng } from '../rng';

export const CANNIBAL_ADULT_MEAT_LB = 50;
export const CANNIBAL_ADULT_MORALE_HIT = 18;
export const CANNIBAL_CHILD_MEAT_LB = 25;
export const CANNIBAL_CHILD_MORALE_HIT = 25;
export const CANNIBAL_FRESHNESS_DAYS = 5;

const FOOD_ITEMS = [
  'flour','bacon','beans','hardtack','jerky','pemmican','salt_pork',
  'game_meat','berries','egg','milk','dried_fruit','cheese','butter','cornmeal'
] as const;

/** True iff the party has any food item with quantity > 0. The gate
 *  every cannibal surface checks before becoming visible. */
export function hasFoodOnHand(state: GameState): boolean {
  for (const id of FOOD_ITEMS) {
    if ((state.inventory[id] ?? 0) > 0) return true;
  }
  return false;
}

/** Most-recently-dead-and-unconsumed corpse the survivors could
 *  consume. Adults eligible regardless of deathCause. Children
 *  eligible only when starvation (or its synonyms) killed them. */
export function findFreshUnconsumedCorpse(state: GameState): PartyMember | null {
  const fresh = state.party.filter((m) => {
    if (!m.dead || m.consumed) return false;
    if (typeof m.deathDay !== 'number') return false;
    if (state.day - m.deathDay > CANNIBAL_FRESHNESS_DAYS) return false;
    if (m.kind === 'adult') return true;
    if (m.kind === 'child') {
      const cause = (m.deathCause ?? '').toLowerCase();
      return cause === 'starvation' || cause === 'attrition'
        || m.deathCause === 'cannibalism_volunteered';
    }
    return false;
  });
  if (fresh.length === 0) return null;
  return fresh.sort((a, b) => (b.deathDay ?? 0) - (a.deathDay ?? 0))[0];
}

export interface ApplyCannibalizeResult {
  state: GameState;
  log: string;
}

/** Consume a specific corpse. Marks consumed, adds game meat,
 *  hits morale, and increments _cannibalismCount uniformly across
 *  every caller (#939j decision 7). Defensive null-corpse fallback. */
export function applyCannibalize(
  state: GameState,
  corpseId: string,
  _rng: Rng
): ApplyCannibalizeResult {
  const corpse = state.party.find((m) => m.id === corpseId && m.dead && !m.consumed);
  if (!corpse) {
    return { state, log: 'No fresh corpse to consume.' };
  }
  const isChild = corpse.kind === 'child';
  const meat = isChild ? CANNIBAL_CHILD_MEAT_LB : CANNIBAL_ADULT_MEAT_LB;
  const hit  = isChild ? CANNIBAL_CHILD_MORALE_HIT : CANNIBAL_ADULT_MORALE_HIT;
  const flags = {
    ...state.flags,
    _cannibalismCount: ((state.flags._cannibalismCount as number | undefined) ?? 0) + 1
  };
  const next: GameState = {
    ...state,
    party: state.party.map((m) => m.id === corpseId ? { ...m, consumed: true } : m),
    inventory: {
      ...state.inventory,
      game_meat: (state.inventory.game_meat ?? 0) + meat
    },
    morale: Math.max(0, state.morale - hit),
    flags
  };
  const log = `Took ${corpse.name}'s body for meat — ${meat} lb of fresh game. Nobody spoke. Morale −${hit}.`;
  return { state: next, log };
}
```

- [ ] **Step 4: Verify**

Run: `npm run verify`
Expected: 0 errors, helper tests pass.

- [ ] **Step 5: Commit**

```bash
jj describe -m "feat(ai): #939j task 1 — cannibal.ts helper module"
```

---

### Task 2: Route burial event `eat_the_body` through the helper

**Files:**
- Modify: `src/lib/game/content/events.ts`

- [ ] **Step 1: Write/update tests**

`tests/cannibalism.test.ts` already covers the burial-event path. Verify:
- Existing adult test still expects 50 lb / −18 morale.
- Add a new test for child cannibalism (eligibility now applies).

```ts
it('#939j — burial event eats a starved child corpse when no adult body present', () => {
  let s = game();
  // make companion a child, kill via starvation, set _burialPending
  s = { ...s, party: s.party.map((m, i) => i === 1 ? { ...m, kind: 'child' as const } : m) };
  s = killMember(s, s.party[1].id, 'Starvation', s.day);
  s = { ...s, flags: { ...s.flags, _burialPending: true }, inventory: emptyFood(s.inventory) };
  // Resolve burial → eat_the_body
  const event = EVENTS.find((e) => e.id === 'personal_burial')!;
  const eatChoice = event.choices.find((c) => c.id === 'eat_the_body')!;
  // Hidden predicate should pass when food is gone
  expect(eatChoice.hidden?.(s) ?? false).toBe(false);
  const next = eatChoice.apply(s, makeRng('t'));
  expect(next.inventory.game_meat ?? 0).toBe(25);
  expect(next.morale).toBe(Math.max(0, s.morale - 25));
});
```

- [ ] **Step 2: Refactor `eat_the_body.apply`**

In `src/lib/game/content/events.ts`, find the `eat_the_body` choice. Replace its `apply` body:

```ts
      apply: (s, rng) => {
        if (hasFoodOnHand(s)) {
          // Defensive fallback — hidden predicate should prevent reach.
          const flags = { ...s.flags };
          delete (flags as Record<string, unknown>)._burialPending;
          const penalty = deathMoralePenalty(s, 4);
          return logLine(
            { ...s, flags, morale: Math.max(0, s.morale - penalty) },
            `Built a stone mound over the body. A hard farewell. Morale −${penalty}.`
          );
        }
        const corpse = findFreshUnconsumedCorpse(s);
        if (!corpse) {
          const flags = { ...s.flags };
          delete (flags as Record<string, unknown>)._burialPending;
          return logLine({ ...s, flags }, 'Burial — but no body was fresh enough.');
        }
        const flags = { ...s.flags };
        delete (flags as Record<string, unknown>)._burialPending;
        const { state, log } = applyCannibalize({ ...s, flags }, corpse.id, rng);
        return logLine(state, log);
      }
```

Add the import near the top:

```ts
import { applyCannibalize, findFreshUnconsumedCorpse, hasFoodOnHand } from '../systems/cannibal';
```

Delete `freshUnconsumedDead`, `hasNoFoodAtBurial` (replaced by `!hasFoodOnHand`), `BURIAL_CANNIBALISM_MEAT_LBS`, `BURIAL_CANNIBALISM_MORALE` — they're now in cannibal.ts or inlined.

- [ ] **Step 3: Verify**

Run: `npm run verify`
Expected: 0 errors. Existing cannibalism tests pass.

- [ ] **Step 4: Commit**

```bash
jj describe -m "feat(ai): #939j task 2 — burial event eats via shared helper + child path"
```

---

### Task 3: Reinstate `cannibalism_corpse` camp action

**Files:**
- Modify: `src/lib/game/actions/camp-actions.ts`
- Create: `tests/cannibalism-corpse-action-939j.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/cannibalism-corpse-action-939j.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { CAMP_ACTIONS, type CampActionId } from '../src/lib/game/actions/camp-actions';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState } from '../src/lib/game/types';

function game(): GameState { /* same shape as cannibal-unified-939j helper */ }
function emptyFood(inv: Record<string, number>) { /* ... */ }

describe('#939j — cannibalism_corpse camp action', () => {
  const cannibalCorpse = CAMP_ACTIONS.find((a) => a.id === ('cannibalism_corpse' as CampActionId))!;

  it('exists in the camp-action registry', () => {
    expect(cannibalCorpse).toBeDefined();
  });

  it('hidden when food is on hand', () => {
    const s = game(); // has full starter food
    expect(cannibalCorpse.hidden?.(s) ?? false).toBe(true);
  });

  it('unavailable when food is gone but no fresh corpse', () => {
    const s = { ...game(), inventory: emptyFood(game().inventory) };
    const avail = cannibalCorpse.availability(s);
    expect(avail.available).toBe(false);
  });

  it('available when food gone AND fresh corpse present', () => {
    let s = { ...game(), inventory: emptyFood(game().inventory) };
    s = { ...s, party: s.party.map((m, i) => i === 1
      ? { ...m, dead: true, health: 0, deathCause: 'Starvation', deathDay: s.day } : m) };
    const avail = cannibalCorpse.availability(s);
    expect(avail.available).toBe(true);
  });

  it('apply consumes the corpse and returns new state', () => {
    let s = { ...game(), inventory: emptyFood(game().inventory) };
    s = { ...s, party: s.party.map((m, i) => i === 1
      ? { ...m, dead: true, health: 0, deathCause: 'Starvation', deathDay: s.day } : m) };
    const next = cannibalCorpse.apply(s, makeRng('t'));
    expect(next.inventory.game_meat ?? 0).toBe(50);
    expect(next.party[1].consumed).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify fails**

Expected: FAIL — action doesn't exist.

- [ ] **Step 3: Add the camp action**

In `src/lib/game/actions/camp-actions.ts`, near `cannibalism_straws`:

```ts
const cannibalism_corpse: CampAction = {
  id: 'cannibalism_corpse',
  label: 'Take the body for meat',
  sub: 'Fresh corpse · food gone · 2 hr · the unthinkable',
  icon: '🍖',
  hourCost: 2,
  hidden: (s) => hasFoodOnHand(s),
  availability: (s) => {
    if (hasFoodOnHand(s)) return { available: false, reason: 'Only when out of food.' };
    if (!findFreshUnconsumedCorpse(s)) return { available: false, reason: 'No fresh body to consume.' };
    return { available: true };
  },
  apply: (s, rng) => {
    if (hasFoodOnHand(s)) return s; // defensive — availability should prevent
    const corpse = findFreshUnconsumedCorpse(s);
    if (!corpse) return s;
    const { state, log } = applyCannibalize(s, corpse.id, rng);
    return logLine(state, log);
  }
};
```

Add to the registry export at the bottom of the file (the `CAMP_ACTIONS` array or equivalent) — place it alongside `cannibalism_straws`. Also update the `CampActionId` union if it's manually maintained.

Imports:

```ts
import { applyCannibalize, findFreshUnconsumedCorpse, hasFoodOnHand } from '../systems/cannibal';
```

- [ ] **Step 4: Verify**

Run: `npm run verify`
Expected: 0 errors, tests pass.

- [ ] **Step 5: Commit**

```bash
jj describe -m "feat(ai): #939j task 3 — reinstate cannibalism_corpse camp action"
```

---

### Task 4: Route NPC `maybeCannibalize` through the helper

**Files:**
- Modify: `src/lib/game/systems/npc-engine.ts`

- [ ] **Step 1: Update existing NPC test expectations**

In `tests/npc-cannibalize-907.test.ts`:
- Adult morale assertion: −15 → −18 anywhere it's pinned.
- New: `expect(next.flags?._cannibalismCount).toBe(?)` is unreachable because NPCs use NpcWagonState (no flags). Instead, route the count check via the synth/project — verify it reaches GameState's flags during the call. (Alternative: skip count assertion at the NPC integration level; rely on the helper unit test for count coverage.)

- [ ] **Step 2: Refactor `maybeCannibalize` to use the helper**

In `src/lib/game/systems/npc-engine.ts`, replace the body:

```ts
function maybeCannibalize(
  wagon: NpcWagonState,
  ctx: NpcTickContext,
  rng: Rng
): { wagon: NpcWagonState; playerLog?: string } {
  // Synthesize state to share gating + helper with the player path.
  const env = trainEnv(ctx);
  const synth = synthesizeWagonState(wagon, env);
  if (hasFoodOnHand(synth)) return { wagon };
  const corpse = findFreshUnconsumedCorpse(synth);
  if (!corpse) return { wagon };
  const persona = getPersona(wagon.personaId ?? 'balanced');
  if (!persona.shouldCannibalize(synth)) return { wagon };
  const { state: ticked, log } = applyCannibalize(synth, corpse.id, rng);
  const next = projectWagonDeltas(ticked, wagon);
  return { wagon: next, playerLog: `${log} (${next.name})` };
}
```

Update the call site in `tickNpcWagon`:

```ts
const cannibalResult = maybeCannibalize(next, ctx, rng);
next = cannibalResult.wagon;
if (cannibalResult.playerLog) playerLogs.push(cannibalResult.playerLog);
```

Delete the now-unused locals: `isCannibalEligible`, `NPC_CANNIBAL_ADULT_MEAT_LBS`, `NPC_CANNIBAL_CHILD_MEAT_LBS`, `NPC_CANNIBAL_FRESHNESS_DAYS`, the inline `FOOD_DRAW_ORDER`-based food-count check.

Imports:

```ts
import { applyCannibalize, findFreshUnconsumedCorpse, hasFoodOnHand } from './cannibal';
```

- [ ] **Step 3: Verify**

Run: `npm run verify`
Expected: 0 errors, all tests pass (including updated NPC integration tests).

- [ ] **Step 4: Commit**

```bash
jj describe -m "feat(ai): #939j task 4 — NPC maybeCannibalize via shared helper"
```

---

### Task 5: Update camp-actions `bumpGuilt` + `recentCorpse` + `hasNoFood` to use shared helpers

**Files:**
- Modify: `src/lib/game/actions/camp-actions.ts`

- [ ] **Step 1: Replace local helpers**

In `actions/camp-actions.ts`:
- Replace `hasNoFood(s)` calls with `!hasFoodOnHand(s)`.
- Replace `recentCorpse(s)` calls with `findFreshUnconsumedCorpse(s)` (the shape matches — returns PartyMember | null).
- Keep `bumpGuilt` as a local in this file — straws weights it `× 3` for the heavier sacrifice flow, which is straws-specific.
- Delete the local `recentCorpse` / `hasNoFood` function definitions.

- [ ] **Step 2: Verify**

Run: `npm run verify`
Expected: 0 errors, straws action test still passes.

- [ ] **Step 3: Commit**

```bash
jj describe -m "feat(ai): #939j task 5 — camp-actions use shared cannibal helpers"
```

---

### Task 6: Open PR, harness sanity, merge

- [ ] **Step 1: Push + open PR**

```bash
jj git push --bookmark feat/cannibal-unify-939j --allow-new
gh pr create --title "#950 (#939j) unify cannibalism — shared helper + by-choice camp action" --base master --head feat/cannibal-unify-939j --body "..."
```

Body references the spec, calls out the locked decisions, lists the four behavior changes (adult morale unify, child path exposed everywhere, count incremented uniformly, new corpse camp action).

- [ ] **Step 2: Pre/post harness diff**

Run the persona-profession sweep on master, merge, run again, diff. The morale shift on NPC adult cannibalism is −3 — expect ±1pp wipe-rate movement at most. Bigger movement = audit.

- [ ] **Step 3: CI green, merge, reset, VK #950 Shipped**
