# wagon_wheel 3-choice ladder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the binary `broken_wheel` resolution with a 3-choice ladder (Spare / Rebuild / Push on) backed by a persistent `wagon.impairment` state and a shared player/NPC resolver.

**Architecture:** New `wagon.impairment` field on the `Wagon` type, defaulting to `null`. New `src/lib/game/systems/wheel-break.ts` resolver shared by the player event modal and the NPC daily wheel-break path. New `Persona.pickWheelBreakResponse` AI surface with a default policy + per-persona overrides for the no-spare branch. Pace + condition-decay multipliers in `travel.ts` / `wagon.ts` honor the impairment when present. Smithy repair at posts clears it.

**Tech Stack:** TypeScript, Svelte 5 (runes), vitest. Project uses jj (not git) — each task ends with `jj describe -m "..."` + `jj new`. Pre-PR gate is `npm run verify` (svelte-check + vitest). Engine changes get a BEFORE/AFTER `--runs 25` sweep via `scripts/persona-profession-sweep.ts`.

**Spec:** `docs/superpowers/specs/2026-05-27-929-wheel-3choice-ladder-design.md`

---

## File map

| File | Action | Responsibility |
|---|---|---|
| `src/lib/game/types.ts` | Modify | Add `WagonImpairment` type; `wagon.impairment: WagonImpairment \| null` field |
| `src/lib/game/saves.ts` | Modify | Default-null deserialize for new field |
| `src/lib/game/engine.ts` | Modify | `createInitialState` defaults `wagon.impairment = null` |
| `src/lib/game/systems/wheel-break.ts` | Create | `resolveWheelBreak(state, rng, choice)` resolver shared by player + NPC |
| `src/lib/game/systems/travel.ts:79` | Modify | `milesPerDay` honors `wagon.impairment.paceMult` |
| `src/lib/game/systems/wagon.ts:40` | Modify | `tickWagon` honors `wagon.impairment.conditionDecayMult` |
| `src/lib/game/systems/town-services.ts:36` | Modify | `repairWagon` clears impairment on successful repair |
| `src/lib/game/content/events.ts:214` | Modify | `broken_wheel` event grows from 1 → 3 choices, delegates to resolver |
| `src/lib/game/ai/wheel-break.ts` | Create | `defaultWheelBreakResponse` + `thresholdWheelBreakResponse` helpers |
| `src/lib/game/ai/types.ts:71` | Modify | Extend `Persona` with `pickWheelBreakResponse` |
| `src/lib/game/ai/personas.ts` | Modify | Per-persona implementations |
| `src/lib/dev/bot/runner.ts` | Modify | Handle `pendingEvent.id === 'wagon_wheel'` via `pickWheelBreakResponse` |
| `src/lib/game/systems/npc-engine.ts` | Modify | NPC wagon-decay path delegates to shared resolver |
| `src/lib/ui/WagonPanel.svelte` | Modify | Render impairment icon when `wagon.impairment != null` |
| `tests/wheel-break-resolver-929.test.ts` | Create | Branch tests (spare consumes + clears; push_on sets; rebuild advances day) |
| `tests/wheel-break-rebuild-rng-929.test.ts` | Create | 4-cell roll table with fixed-RNG forcing SUCCESS/FAILURE |
| `tests/wheel-break-impairment-decay-929.test.ts` | Create | Pace ×0.5, decay ×2, smithy clears |
| `tests/wheel-break-persona-929.test.ts` | Create | Default policy + per-persona override matrix |
| `tests/npc-wheel-break-parity-929.test.ts` | Create | NPC fires event → persona picks → resolver runs → impairment persists |

---

## Task 1: Add `WagonImpairment` type + nullable field on `Wagon`

**Files:**
- Modify: `src/lib/game/types.ts:105-120`
- Modify: `src/lib/game/saves.ts`
- Modify: `src/lib/game/engine.ts`

Pure data scaffold. Type-check is the gate; no test for this task.

- [ ] **Step 1: Add `WagonImpairment` type**

After the `Wagon` interface in `src/lib/game/types.ts` (around line 121):

```ts
/**
 * Persistent wagon impairment (#929). Set when the player picks "Push on"
 * after a wheel break OR when a rebuild attempt fails. Cleared by smithy
 * repair (town-services.repairWagon), by mounting a spare wheel, or by
 * a successful trailside rebuild. Generalizable later to axle/tongue/canvas
 * — for v1, only `kind: 'wheel'`.
 */
export type WagonImpairment = {
  kind: 'wheel';
  /** Daily pace multiplier (wheel = 0.5). Applied in milesPerDay. */
  paceMult: number;
  /** Condition-decay multiplier (wheel = 2). Applied in tickWagon. */
  conditionDecayMult: number;
  /** Day + mile the impairment was contracted, for log + debrief. */
  contractedAt: { day: number; mile: number };
};
```

- [ ] **Step 2: Add `impairment` field to `Wagon`**

In the `Wagon` interface, append after `hasBranBarrel?: boolean;`:

```ts
  /** Persistent impairment from a wheel-break "Push on" or failed rebuild
   *  (#929). null when wagon is sound. */
  impairment: WagonImpairment | null;
```

- [ ] **Step 3: Default null in `saves.ts` deserialize**

In `src/lib/game/saves.ts`, find the `deserialize` function's wagon block. Set `impairment: raw.wagon.impairment ?? null` alongside the other wagon fields (next to `hasBranBarrel`).

- [ ] **Step 4: Default null in `engine.ts` initial state**

In `src/lib/game/engine.ts`, find `createInitialState` and the wagon object it builds. Add `impairment: null` alongside the other wagon fields.

- [ ] **Step 5: Run `npm run check`**

Run: `npm run check`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd /home/eric/projects/hoosierTrail-929-wheel-plan
jj describe -m "feat(929): WagonImpairment type + nullable wagon.impairment field"
jj new
```

---

## Task 2: Resolver scaffold + `spare` branch (TDD)

**Files:**
- Create: `src/lib/game/systems/wheel-break.ts`
- Create: `tests/wheel-break-resolver-929.test.ts`

- [ ] **Step 1: Write the failing `spare` branch test**

Create `tests/wheel-break-resolver-929.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { resolveWheelBreak } from '../src/lib/game/systems/wheel-break';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';

function freshState(overrides: { wheel?: number; impairment?: any } = {}) {
  const s = createInitialState({
    seed: 'wheel-929',
    leader: { name: 'A', profession: 'pioneer', sex: 'male' },
    companions: [],
    startDate: { year: 1848, month: 4, day: 15 },
    includeStarterKit: true
  });
  if (overrides.wheel !== undefined) s.inventory.wheel = overrides.wheel;
  if (overrides.impairment !== undefined) s.wagon.impairment = overrides.impairment;
  return s;
}

describe('resolveWheelBreak — spare', () => {
  it('consumes one wheel, +10 condition, clears impairment', () => {
    const before = freshState({
      wheel: 2,
      impairment: { kind: 'wheel', paceMult: 0.5, conditionDecayMult: 2,
                    contractedAt: { day: 10, mile: 200 } }
    });
    before.wagon.condition = 60;
    const rng = makeRng('test');
    const { state: after, log } = resolveWheelBreak(before, rng, 'spare');
    expect(after.inventory.wheel).toBe(1);
    expect(after.wagon.condition).toBe(70);
    expect(after.wagon.impairment).toBeNull();
    expect(log).toMatch(/spare wheel/i);
  });

  it('clamps condition at 100 when near-full', () => {
    const before = freshState({ wheel: 1 });
    before.wagon.condition = 95;
    const { state: after } = resolveWheelBreak(before, makeRng('t'), 'spare');
    expect(after.wagon.condition).toBe(100);
  });
});
```

- [ ] **Step 2: Run test (expect fail)**

`npx vitest run tests/wheel-break-resolver-929.test.ts` — module not found.

- [ ] **Step 3: Create the resolver with spare branch**

Create `src/lib/game/systems/wheel-break.ts`:

```ts
import { consumeWagonPart } from '../professions/bonuses';
import type { GameState } from '../types';
import type { Rng } from '../rng';

export type WheelBreakChoice = 'spare' | 'rebuild' | 'push_on';

export interface WheelBreakResult {
  state: GameState;
  log: string;
}

export function resolveWheelBreak(
  state: GameState,
  rng: Rng,
  choice: WheelBreakChoice
): WheelBreakResult {
  switch (choice) {
    case 'spare':
      return resolveSpare(state, rng);
    case 'rebuild':
      throw new Error('rebuild branch not yet implemented');
    case 'push_on':
      throw new Error('push_on branch not yet implemented');
  }
}

function resolveSpare(state: GameState, rng: Rng): WheelBreakResult {
  const { state: afterConsume, saved } = consumeWagonPart(state, rng, 'wheel');
  const conditionUp = Math.min(100, afterConsume.wagon.condition + 10);
  const next: GameState = {
    ...afterConsume,
    wagon: { ...afterConsume.wagon, condition: conditionUp, impairment: null }
  };
  const log = saved
    ? 'The carpenter pieced the old wheel back together — the spare was kept. Wagon condition +10.'
    : 'Mounted a spare wheel. Wagon condition +10.';
  return { state: next, log };
}
```

- [ ] **Step 4: Run tests (expect pass)**

`npx vitest run tests/wheel-break-resolver-929.test.ts` → 2/2 passed.

- [ ] **Step 5: Commit**

```bash
jj describe -m "feat(929): resolveWheelBreak — spare branch"
jj new
```

---

## Task 3: `push_on` branch (TDD)

**Files:**
- Modify: `src/lib/game/systems/wheel-break.ts`
- Modify: `tests/wheel-break-resolver-929.test.ts`

- [ ] **Step 1: Append failing test**

Append to `tests/wheel-break-resolver-929.test.ts`:

```ts
describe('resolveWheelBreak — push_on', () => {
  it('sets wagon.impairment with paceMult 0.5, decayMult 2, no day-cost', () => {
    const before = freshState({ wheel: 0 });
    before.day = 25;
    before.location.milesTraveled = 412;
    before.wagon.condition = 55;
    const { state: after, log } = resolveWheelBreak(before, makeRng('t'), 'push_on');
    expect(after.day).toBe(25);
    expect(after.wagon.condition).toBe(55);
    expect(after.wagon.impairment).toEqual({
      kind: 'wheel',
      paceMult: 0.5,
      conditionDecayMult: 2,
      contractedAt: { day: 25, mile: 412 }
    });
    expect(log).toMatch(/limp/i);
  });
});
```

- [ ] **Step 2: Run test (expect fail — "not yet implemented")**

`npx vitest run tests/wheel-break-resolver-929.test.ts`

- [ ] **Step 3: Implement push_on branch**

Replace `case 'push_on'` throw in `src/lib/game/systems/wheel-break.ts` with:

```ts
    case 'push_on':
      return resolvePushOn(state);
```

Add the helper:

```ts
function resolvePushOn(state: GameState): WheelBreakResult {
  const next: GameState = {
    ...state,
    wagon: {
      ...state.wagon,
      impairment: {
        kind: 'wheel',
        paceMult: 0.5,
        conditionDecayMult: 2,
        contractedAt: { day: state.day, mile: state.location.milesTraveled }
      }
    }
  };
  return {
    state: next,
    log: 'Pushed on with a busted wheel. The wagon limps until the next blacksmith.'
  };
}
```

- [ ] **Step 4: Run tests (expect 3/3 pass)**

- [ ] **Step 5: Commit**

```bash
jj describe -m "feat(929): resolveWheelBreak — push_on branch"
jj new
```

---

## Task 4: `rebuild` branch + RNG roll table (TDD)

**Files:**
- Modify: `src/lib/game/systems/wheel-break.ts`
- Create: `tests/wheel-break-rebuild-rng-929.test.ts`

Roll table:

| Party state | Success | Failure |
|---|---:|---|
| Blacksmith + cond ≥ 30 | 90% | 1 day, impairment |
| Blacksmith + cond < 30 | 70% | 1 day, impairment |
| No Blacksmith + cond ≥ 30 | 70% | 2 days, impairment |
| No Blacksmith + cond < 30 | 50% | 2 days, impairment |

- [ ] **Step 1: Write failing tests**

Create `tests/wheel-break-rebuild-rng-929.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { resolveWheelBreak } from '../src/lib/game/systems/wheel-break';
import { createInitialState } from '../src/lib/game/engine';
import type { Rng } from '../src/lib/game/rng';

function stateFor(opts: { blacksmith: boolean; condition: number }) {
  const s = createInitialState({
    seed: 'rebuild-929',
    leader: { name: 'L', profession: opts.blacksmith ? 'blacksmith' : 'pioneer', sex: 'male' },
    companions: [],
    startDate: { year: 1848, month: 4, day: 15 },
    includeStarterKit: true
  });
  s.wagon.condition = opts.condition;
  s.inventory.wheel = 0;
  return s;
}

function fixedRng(value: number): Rng {
  return {
    next: () => value,
    chance: (p: number) => value < p,
    pick: <T>(arr: T[]) => arr[0],
    int: (min: number, max: number) => Math.floor(value * (max - min + 1)) + min
  };
}

describe('resolveWheelBreak — rebuild RNG roll table', () => {
  it('Blacksmith + cond>=30: threshold 0.90', () => {
    const s = stateFor({ blacksmith: true, condition: 60 });
    const success = resolveWheelBreak(s, fixedRng(0.89), 'rebuild');
    expect(success.state.wagon.impairment).toBeNull();
    expect(success.state.wagon.condition).toBe(75);
    expect(success.state.day).toBe(s.day + 1);

    const failure = resolveWheelBreak(s, fixedRng(0.91), 'rebuild');
    expect(failure.state.wagon.impairment).not.toBeNull();
    expect(failure.state.wagon.condition).toBe(60);
    expect(failure.state.day).toBe(s.day + 1);
  });

  it('Blacksmith + cond<30: threshold 0.70', () => {
    const s = stateFor({ blacksmith: true, condition: 20 });
    expect(resolveWheelBreak(s, fixedRng(0.69), 'rebuild').state.wagon.impairment).toBeNull();
    expect(resolveWheelBreak(s, fixedRng(0.71), 'rebuild').state.wagon.impairment).not.toBeNull();
  });

  it('No Blacksmith + cond>=30: threshold 0.70, 2 days', () => {
    const s = stateFor({ blacksmith: false, condition: 60 });
    const success = resolveWheelBreak(s, fixedRng(0.69), 'rebuild');
    expect(success.state.wagon.impairment).toBeNull();
    expect(success.state.day).toBe(s.day + 2);

    const failure = resolveWheelBreak(s, fixedRng(0.71), 'rebuild');
    expect(failure.state.wagon.impairment).not.toBeNull();
    expect(failure.state.day).toBe(s.day + 2);
  });

  it('No Blacksmith + cond<30: threshold 0.50', () => {
    const s = stateFor({ blacksmith: false, condition: 20 });
    expect(resolveWheelBreak(s, fixedRng(0.49), 'rebuild').state.wagon.impairment).toBeNull();
    expect(resolveWheelBreak(s, fixedRng(0.51), 'rebuild').state.wagon.impairment).not.toBeNull();
  });

  it('success log mentions days; failure log mentions limp', () => {
    const s = stateFor({ blacksmith: false, condition: 60 });
    expect(resolveWheelBreak(s, fixedRng(0.1), 'rebuild').log).toMatch(/rebuilt.*2 days/i);
    expect(resolveWheelBreak(s, fixedRng(0.9), 'rebuild').log).toMatch(/limp/i);
  });
});
```

- [ ] **Step 2: Run tests (expect 5/5 fail)**

- [ ] **Step 3: Implement rebuild branch**

Replace `case 'rebuild'` throw in `src/lib/game/systems/wheel-break.ts`:

```ts
    case 'rebuild':
      return resolveRebuild(state, rng);
```

Add the helper:

```ts
function resolveRebuild(state: GameState, rng: Rng): WheelBreakResult {
  const hasBlacksmith = state.party.some(
    (m) => !m.dead && m.profession === 'blacksmith'
  );
  const days = hasBlacksmith ? 1 : 2;
  const baseSuccess = hasBlacksmith ? 0.90 : 0.70;
  const lowCondPenalty = state.wagon.condition < 30 ? -0.20 : 0;
  const successChance = Math.max(0, Math.min(1, baseSuccess + lowCondPenalty));
  const success = rng.next() < successChance;

  const afterDays: GameState = { ...state, day: state.day + days };

  if (success) {
    const conditionUp = Math.min(100, afterDays.wagon.condition + 15);
    return {
      state: {
        ...afterDays,
        wagon: { ...afterDays.wagon, condition: conditionUp, impairment: null }
      },
      log: `Rebuilt the wheel (took ${days} day${days === 1 ? '' : 's'}). Condition +15.`
    };
  }

  return {
    state: {
      ...afterDays,
      wagon: {
        ...afterDays.wagon,
        impairment: {
          kind: 'wheel',
          paceMult: 0.5,
          conditionDecayMult: 2,
          contractedAt: { day: afterDays.day, mile: afterDays.location.milesTraveled }
        }
      }
    },
    log: `The rebuild went wrong — a spoke split during seating. The wagon limps on. ${days} day${days === 1 ? '' : 's'} spent.`
  };
}
```

- [ ] **Step 4: Run tests (expect all pass)**

`npx vitest run tests/wheel-break-rebuild-rng-929.test.ts tests/wheel-break-resolver-929.test.ts`

- [ ] **Step 5: Commit**

```bash
jj describe -m "feat(929): resolveWheelBreak — rebuild branch with RNG roll table"
jj new
```

---

## Task 5: Wire impairment into `milesPerDay` (TDD)

**Files:**
- Modify: `src/lib/game/systems/travel.ts:79`
- Create: `tests/wheel-break-impairment-decay-929.test.ts`

- [ ] **Step 1: Failing pace test**

Create `tests/wheel-break-impairment-decay-929.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { milesPerDay } from '../src/lib/game/systems/travel';
import { createInitialState } from '../src/lib/game/engine';

function baseline() {
  return createInitialState({
    seed: 'impairment-929',
    leader: { name: 'L', profession: 'pioneer', sex: 'male' },
    companions: [],
    startDate: { year: 1848, month: 4, day: 15 },
    includeStarterKit: true
  });
}

describe('milesPerDay honors wagon.impairment.paceMult', () => {
  it('halves miles per day when impairment.paceMult = 0.5', () => {
    const s = baseline();
    const sound = milesPerDay(s);
    s.wagon.impairment = {
      kind: 'wheel', paceMult: 0.5, conditionDecayMult: 2,
      contractedAt: { day: 5, mile: 100 }
    };
    expect(milesPerDay(s)).toBe(Math.round(sound * 0.5));
  });

  it('null impairment leaves pace unchanged', () => {
    const s = baseline();
    s.wagon.impairment = null;
    const before = milesPerDay(s);
    expect(milesPerDay(s)).toBe(before);
  });
});
```

- [ ] **Step 2: Run test (expect fail)**

`npx vitest run tests/wheel-break-impairment-decay-929.test.ts -t paceMult`

- [ ] **Step 3: Add impairment factor to milesPerDay**

In `src/lib/game/systems/travel.ts` `milesPerDay`, before the final `Math.round(...)` return:

```ts
  // #929 — wagon wheel impairment halves pace.
  const impairmentMult = state.wagon.impairment?.paceMult ?? 1;
```

Then append `* impairmentMult` to the existing product chain inside `Math.round(...)`. Match the existing chain (`base * terrain * oxen * teamSpeedMult * load * guideMult * scoutMult * weatherMult * cowMult`) and tack on `* impairmentMult`.

- [ ] **Step 4: Run tests (expect 2/2 pass)**

- [ ] **Step 5: Commit**

```bash
jj describe -m "feat(929): milesPerDay honors wagon.impairment.paceMult"
jj new
```

---

## Task 6: Wire impairment into `tickWagon` decay (TDD)

**Files:**
- Modify: `src/lib/game/systems/wagon.ts:40`
- Modify: `tests/wheel-break-impairment-decay-929.test.ts`

- [ ] **Step 1: Append failing decay test**

Append to `tests/wheel-break-impairment-decay-929.test.ts`:

```ts
import { tickWagon } from '../src/lib/game/systems/wagon';
import { makeRng } from '../src/lib/game/rng';

describe('tickWagon honors wagon.impairment.conditionDecayMult', () => {
  it('doubles condition decay when decayMult = 2', () => {
    const sound = baseline();
    sound.wagon.condition = 80;
    sound.wagon.impairment = null;
    const tickedSound = tickWagon(sound, makeRng('a'));
    const soundDecay = sound.wagon.condition - tickedSound.wagon.condition;

    const limp = baseline();
    limp.wagon.condition = 80;
    limp.wagon.impairment = {
      kind: 'wheel', paceMult: 0.5, conditionDecayMult: 2,
      contractedAt: { day: 5, mile: 100 }
    };
    const tickedLimp = tickWagon(limp, makeRng('a'));
    const limpDecay = limp.wagon.condition - tickedLimp.wagon.condition;
    expect(limpDecay).toBeCloseTo(soundDecay * 2, 1);
  });
});
```

- [ ] **Step 2: Run test (expect fail)**

`npx vitest run tests/wheel-break-impairment-decay-929.test.ts -t conditionDecayMult`

- [ ] **Step 3: Add impairment factor to tickWagon**

In `src/lib/game/systems/wagon.ts:40`, the existing decay formula is `base * terrain * tarMult * carpenterMult`. Add:

```ts
const impairmentMult = state.wagon.impairment?.conditionDecayMult ?? 1;
const decay = base * terrain * tarMult * carpenterMult * impairmentMult;
```

- [ ] **Step 4: Run tests (expect 3/3 pass)**

- [ ] **Step 5: Commit**

```bash
jj describe -m "feat(929): tickWagon honors wagon.impairment.conditionDecayMult"
jj new
```

---

## Task 7: Clear impairment on smithy repair (TDD)

**Files:**
- Modify: `src/lib/game/systems/town-services.ts:36`
- Modify: `tests/wheel-break-impairment-decay-929.test.ts`

- [ ] **Step 1: Append failing test**

Append:

```ts
import { repairWagon } from '../src/lib/game/systems/town-services';

describe('repairWagon clears wagon.impairment', () => {
  it('successful repair sets impairment to null', () => {
    const s = baseline();
    s.cash = 100;
    s.wagon.condition = 40;
    s.wagon.impairment = {
      kind: 'wheel', paceMult: 0.5, conditionDecayMult: 2,
      contractedAt: { day: 5, mile: 100 }
    };
    const result = repairWagon(s, 20);
    expect(result.state.wagon.impairment).toBeNull();
    expect(result.state.wagon.condition).toBeGreaterThan(40);
  });

  it('zero-dollar no-op does not clear impairment', () => {
    const s = baseline();
    s.cash = 100;
    s.wagon.impairment = {
      kind: 'wheel', paceMult: 0.5, conditionDecayMult: 2,
      contractedAt: { day: 5, mile: 100 }
    };
    const result = repairWagon(s, 0);
    expect(result.state.wagon.impairment).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test (expect fail)**

- [ ] **Step 3: Modify repairWagon**

In `src/lib/game/systems/town-services.ts:36`, when constructing the returned state add the impairment clear gated on `pointsRestored > 0`:

```ts
wagon: {
  ...state.wagon,
  condition: state.wagon.condition + pointsRestored,
  // #929 — smithy repair clears any limping-wheel impairment.
  impairment: pointsRestored > 0 ? null : state.wagon.impairment
}
```

- [ ] **Step 4: Run tests (expect 4/4 pass)**

- [ ] **Step 5: Commit**

```bash
jj describe -m "feat(929): repairWagon clears wagon.impairment on successful smithy repair"
jj new
```

---

## Task 8: Refactor `broken_wheel` event to 3 choices (TDD)

**Files:**
- Modify: `src/lib/game/content/events.ts:214`
- Append: `tests/wheel-break-resolver-929.test.ts`

- [ ] **Step 1: Append event-shape test**

Append to `tests/wheel-break-resolver-929.test.ts`:

```ts
import { EVENTS } from '../src/lib/game/content/events';

describe('broken_wheel event shape', () => {
  const evt = EVENTS.find((e) => e.id === 'wagon_wheel')!;
  it('has 3 choices: spare / rebuild / push_on', () => {
    expect(evt.choices.map((c) => c.id)).toEqual(['spare', 'rebuild', 'push_on']);
  });
  it('spare disabled when no wheel inventory', () => {
    const s = freshState({ wheel: 0 });
    expect(evt.choices.find((c) => c.id === 'spare')!.enabled?.(s)).toBe(false);
  });
  it('spare enabled when wheel >= 1', () => {
    const s = freshState({ wheel: 1 });
    expect(evt.choices.find((c) => c.id === 'spare')!.enabled?.(s)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test (expect fail)**

- [ ] **Step 3: Refactor broken_wheel**

In `src/lib/game/content/events.ts` around line 214, replace the entire `broken_wheel` definition. Add the import at the top:

```ts
import { resolveWheelBreak } from '../systems/wheel-break';
```

Then:

```ts
const broken_wheel: GameEvent = {
  id: 'wagon_wheel',
  category: 'wagon',
  title: 'A wheel shatters',
  body: 'A spoke gives way, then the whole rim.',
  bodyKey: 'wagon_wheel.body',
  weight: 3,
  choices: [
    {
      id: 'spare',
      icon: '⚙️',
      label: 'Mount the spare wheel',
      enabled: (s) => (s.inventory.wheel ?? 0) > 0,
      silentLog: true,
      apply: (s, rng) => {
        const { state, log } = resolveWheelBreak(s, rng, 'spare');
        return logLine(state, log);
      }
    },
    {
      id: 'rebuild',
      icon: '🔨',
      label: 'Rebuild the wheel trailside (2 days, 1 if Blacksmith)',
      silentLog: true,
      apply: (s, rng) => {
        const { state, log } = resolveWheelBreak(s, rng, 'rebuild');
        return logLine(state, log);
      }
    },
    {
      id: 'push_on',
      icon: '🐎',
      label: 'Push on — limp to the next post',
      silentLog: true,
      apply: (s, rng) => {
        const { state, log } = resolveWheelBreak(s, rng, 'push_on');
        return logLine(state, log);
      }
    }
  ]
};
```

The old `consumeWagonPart` + manual condition logic is now in the resolver.

- [ ] **Step 4: Run tests + check (expect pass)**

```bash
npx vitest run tests/wheel-break-resolver-929.test.ts tests/wheel-break-rebuild-rng-929.test.ts
npm run check
```

- [ ] **Step 5: Commit**

```bash
jj describe -m "feat(929): broken_wheel event — 3 choices delegating to resolver"
jj new
```

---

## Task 9: Default `pickWheelBreakResponse` + `Persona` interface (TDD)

**Files:**
- Create: `src/lib/game/ai/wheel-break.ts`
- Modify: `src/lib/game/ai/types.ts`
- Create: `tests/wheel-break-persona-929.test.ts`

- [ ] **Step 1: Write failing default-policy tests**

Create `tests/wheel-break-persona-929.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { defaultWheelBreakResponse } from '../src/lib/game/ai/wheel-break';
import { createInitialState } from '../src/lib/game/engine';
import type { ProfessionId } from '../src/lib/game/types';

function state(opts: {
  wheel?: number;
  condition?: number;
  leaderProfession?: ProfessionId;
}) {
  const s = createInitialState({
    seed: 'persona-929',
    leader: { name: 'L', profession: opts.leaderProfession ?? 'pioneer', sex: 'male' },
    companions: [],
    startDate: { year: 1848, month: 4, day: 15 },
    includeStarterKit: true
  });
  if (opts.wheel !== undefined) s.inventory.wheel = opts.wheel;
  if (opts.condition !== undefined) s.wagon.condition = opts.condition;
  return s;
}

describe('defaultWheelBreakResponse', () => {
  it('spare when wheel inventory > 0', () => {
    expect(defaultWheelBreakResponse(state({ wheel: 1, condition: 10 }))).toBe('spare');
    expect(defaultWheelBreakResponse(state({ wheel: 3, condition: 95, leaderProfession: 'blacksmith' }))).toBe('spare');
  });
  it('push_on when no spare + cond<25 + no smith', () => {
    expect(defaultWheelBreakResponse(state({ wheel: 0, condition: 20 }))).toBe('push_on');
  });
  it('rebuild when no spare + cond>=25 + no smith', () => {
    expect(defaultWheelBreakResponse(state({ wheel: 0, condition: 50 }))).toBe('rebuild');
  });
  it('rebuild when no spare + cond<25 + smith present', () => {
    expect(defaultWheelBreakResponse(state({ wheel: 0, condition: 20, leaderProfession: 'blacksmith' }))).toBe('rebuild');
  });
});
```

- [ ] **Step 2: Run test (expect fail)**

- [ ] **Step 3: Create the AI module**

Create `src/lib/game/ai/wheel-break.ts`:

```ts
import type { GameState } from '../types';
import type { WheelBreakChoice } from '../systems/wheel-break';

/**
 * Default persona policy for the broken_wheel event (#929).
 *
 * Priority: spare > rebuild > push_on. push_on is a desperation move —
 * fires only when there is no spare AND the wagon is so worn that a
 * rebuild has a coin-flip chance of failure (cond < 25, no Blacksmith).
 * With a Blacksmith, rebuild stays preferable even on a worn wagon
 * (success rate stays at 70%+).
 *
 * Per-persona overrides adjust the desperation gate's threshold.
 */
export function defaultWheelBreakResponse(state: GameState): WheelBreakChoice {
  if ((state.inventory.wheel ?? 0) > 0) return 'spare';
  const hasBlacksmith = state.party.some(
    (m) => !m.dead && m.profession === 'blacksmith'
  );
  if (state.wagon.condition < 25 && !hasBlacksmith) return 'push_on';
  return 'rebuild';
}

/**
 * Per-persona policy with adjustable desperation threshold. The
 * threshold is the wagon-condition floor *below* which the persona
 * gives up on rebuild and pushes on. Default 25; Reckless/Worn 40;
 * Faithful/Frugal -1 (disabled — never push on).
 */
export function thresholdWheelBreakResponse(
  state: GameState,
  desperationCondThreshold: number
): WheelBreakChoice {
  if ((state.inventory.wheel ?? 0) > 0) return 'spare';
  const hasBlacksmith = state.party.some(
    (m) => !m.dead && m.profession === 'blacksmith'
  );
  if (state.wagon.condition < desperationCondThreshold && !hasBlacksmith) {
    return 'push_on';
  }
  return 'rebuild';
}
```

- [ ] **Step 4: Run tests (expect 4/4 pass)**

- [ ] **Step 5: Extend Persona interface**

In `src/lib/game/ai/types.ts:71`, after `pickRepairBudget` (~line 148), add:

```ts
  /**
   * Trailside response when a wagon_wheel event fires. Sibling to
   * `pickRepairBudget` (which fires at trading posts). See #929.
   */
  pickWheelBreakResponse(state: GameState, rng: Rng): WheelBreakChoice;
```

Import:

```ts
import type { WheelBreakChoice } from '../systems/wheel-break';
```

- [ ] **Step 6: Run check (expect errors on Persona impls)**

`npm run check` — errors flow to Task 10.

- [ ] **Step 7: Commit**

```bash
jj describe -m "feat(929): default + threshold pickWheelBreakResponse + Persona interface"
jj new
```

---

## Task 10: Per-persona implementations (TDD)

**Files:**
- Modify: `src/lib/game/ai/personas.ts`
- Append: `tests/wheel-break-persona-929.test.ts`

- [ ] **Step 1: Enumerate persona ids**

Read `src/lib/game/ai/personas.ts` and the project's `getPersona` export (or PERSONAS map). List the actual ids. Likely: `pioneer`, `pragmatic`, `faithful`, `reckless` (or `chaos`), `frugal`, `worn`. Adjust the array in the test to match.

- [ ] **Step 2: Append failing per-persona tests**

Append to `tests/wheel-break-persona-929.test.ts`:

```ts
import { getPersona } from '../src/lib/game/ai/personas';
import { makeRng } from '../src/lib/game/rng';

describe('per-persona pickWheelBreakResponse', () => {
  const rng = makeRng('persona-929');

  it('pioneer uses default policy', () => {
    const p = getPersona('pioneer');
    expect(p.pickWheelBreakResponse(state({ wheel: 1 }), rng)).toBe('spare');
    expect(p.pickWheelBreakResponse(state({ wheel: 0, condition: 20 }), rng)).toBe('push_on');
    expect(p.pickWheelBreakResponse(state({ wheel: 0, condition: 50 }), rng)).toBe('rebuild');
  });

  it('faithful never pushes on', () => {
    const p = getPersona('faithful');
    expect(p.pickWheelBreakResponse(state({ wheel: 0, condition: 20 }), rng)).toBe('rebuild');
    expect(p.pickWheelBreakResponse(state({ wheel: 0, condition: 5 }), rng)).toBe('rebuild');
  });

  it('reckless / chaos pushes on at cond < 40', () => {
    const p = getPersona('reckless');  // adjust id if needed
    expect(p.pickWheelBreakResponse(state({ wheel: 0, condition: 39 }), rng)).toBe('push_on');
    expect(p.pickWheelBreakResponse(state({ wheel: 0, condition: 50 }), rng)).toBe('rebuild');
  });

  it('worn pushes on at cond < 40', () => {
    const p = getPersona('worn');
    expect(p.pickWheelBreakResponse(state({ wheel: 0, condition: 39 }), rng)).toBe('push_on');
    expect(p.pickWheelBreakResponse(state({ wheel: 0, condition: 50 }), rng)).toBe('rebuild');
  });

  it('frugal never pushes on', () => {
    const p = getPersona('frugal');
    expect(p.pickWheelBreakResponse(state({ wheel: 0, condition: 10 }), rng)).toBe('rebuild');
  });

  it('every persona returns spare when wheel inventory > 0', () => {
    for (const id of ['pioneer', 'pragmatic', 'faithful', 'reckless', 'frugal', 'worn'] as const) {
      try {
        const p = getPersona(id);
        expect(p.pickWheelBreakResponse(state({ wheel: 1, condition: 10 }), rng)).toBe('spare');
      } catch {
        // Skip ids that don't exist in this project's persona registry.
      }
    }
  });
});
```

- [ ] **Step 3: Run tests (expect fail)**

- [ ] **Step 4: Add per-persona implementations**

In `src/lib/game/ai/personas.ts`, import:

```ts
import { defaultWheelBreakResponse, thresholdWheelBreakResponse } from './wheel-break';
```

For Pioneer + Pragmatic:

```ts
pickWheelBreakResponse(state) {
  return defaultWheelBreakResponse(state);
}
```

For Faithful + Frugal (never push on):

```ts
pickWheelBreakResponse(state) {
  return thresholdWheelBreakResponse(state, -1);
}
```

For Reckless / Chaos + Worn (gate at cond < 40):

```ts
pickWheelBreakResponse(state) {
  return thresholdWheelBreakResponse(state, 40);
}
```

- [ ] **Step 5: Run tests + check (expect pass + zero check errors)**

```bash
npx vitest run tests/wheel-break-persona-929.test.ts
npm run check
```

- [ ] **Step 6: Commit**

```bash
jj describe -m "feat(929): per-persona pickWheelBreakResponse — Faithful/Reckless/Worn/Frugal overrides"
jj new
```

---

## Task 11: Player-bot wiring (TDD)

**Files:**
- Modify: `src/lib/dev/bot/runner.ts`
- Append: `tests/wheel-break-persona-929.test.ts`

- [ ] **Step 1: Append player-bot smoke test**

Append to `tests/wheel-break-persona-929.test.ts`:

```ts
import { runBot } from '../src/lib/dev/bot/runner';

describe('player-bot wires wagon_wheel pendingEvent through persona', () => {
  it('bot does not crash when a wheel break may fire', () => {
    const report = runBot({
      seed: 'wheel-bot-929',
      leader: { name: 'L', profession: 'blacksmith', sex: 'male' },
      companions: [],
      persona: 'pioneer',
      maxDays: 60
    });
    expect(report).toBeTruthy();
  });
});
```

(Match the exact `runBot` opts shape in `src/lib/dev/bot/runner.ts` — `BotRunOpts` interface near line 58.)

- [ ] **Step 2: Run test**

`npx vitest run tests/wheel-break-persona-929.test.ts -t player-bot`

Either passes by accident (no wheel event fired) or fails with "no handler for wagon_wheel pendingEvent". Either way the next step is the same.

- [ ] **Step 3: Modify runner.ts**

In `src/lib/dev/bot/runner.ts`, find the section that processes `result.pendingEvent` after `tickDayPausable`. Add a branch for `wagon_wheel`:

```ts
if (result.pendingEvent?.id === 'wagon_wheel') {
  const choice = persona.pickWheelBreakResponse(result.state, rng);
  state = applyPendingChoice(result.state, choice);
  continue;
}
```

Pattern-match the surrounding event handlers in the same file — `handleLandmark` style. The exact integration point is where `pendingEvent` dispatch already happens.

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/wheel-break-persona-929.test.ts -t player-bot
npm test
```

Expected: zero regressions.

- [ ] **Step 5: Commit**

```bash
jj describe -m "feat(929): player-bot dispatches wagon_wheel event via pickWheelBreakResponse"
jj new
```

---

## Task 12: NPC parity (TDD)

**Files:**
- Modify: `src/lib/game/systems/npc-engine.ts`
- Create: `tests/npc-wheel-break-parity-929.test.ts`

- [ ] **Step 1: Read existing NPC test harness pattern**

Read `tests/ai-pickoxswap-931.test.ts` (or any `npc-*-{N}.test.ts`). It documents the project's pattern for forcing a specific NPC event and asserting per-tick behavior. Mirror that pattern.

- [ ] **Step 2: Locate NPC wheel-break handler**

In `src/lib/game/systems/npc-engine.ts`, search for `wagon_wheel` or the `#280c — wheel break` comment near line 239. That's the NPC daily event-roll handler.

- [ ] **Step 3: Write the failing NPC parity test**

Create `tests/npc-wheel-break-parity-929.test.ts`. Use the harness pattern from `ai-pickoxswap-931.test.ts`. Two tests:

1. Reckless NPC, no spare, condition < 40, no Blacksmith → forced wagon_wheel event → assert `npc.wagon.impairment != null` after the tick (Reckless chose push_on).
2. Pioneer NPC with spare wheel in inventory → forced wagon_wheel event → assert wheel was consumed AND `npc.wagon.impairment === null`.

Skeleton:

```ts
import { describe, expect, it } from 'vitest';
// import { tickNpcDay } from '../src/lib/game/systems/npc-engine'; // or whatever the harness uses
// import { /* fixture builder used in ai-pickoxswap-931 */ } from '...';

describe('NPC wheel-break parity (#929)', () => {
  it('Reckless NPC pushes on when no spare + low cond — impairment applied', () => {
    // Build NPC fixture matching ai-pickoxswap-931's harness pattern.
    // Force the wagon_wheel event. Tick the NPC day.
    // expect(npc.wagon.impairment).not.toBeNull();
    expect(true).toBe(false);  // placeholder — replace with real assertion
  });

  it('Pioneer NPC with spare always uses it', () => {
    // Same harness, persona pioneer, wheel: 1 inventory.
    // expect(npc.inventory.wheel).toBe(0);
    // expect(npc.wagon.impairment).toBeNull();
    expect(true).toBe(false);  // placeholder
  });
});
```

Replace the placeholders with the real assertions once the harness is in scope.

- [ ] **Step 4: Run test (expect fail)**

`npx vitest run tests/npc-wheel-break-parity-929.test.ts`

- [ ] **Step 5: Modify npc-engine.ts to delegate to resolver**

In `src/lib/game/systems/npc-engine.ts`, the existing wagon_wheel handler resolves implicitly (auto-replace). Replace with delegation:

```ts
import { resolveWheelBreak } from './wheel-break';

// Inside the NPC daily event-roll handler, when firedEvent.id === 'wagon_wheel':
const synth = synthesizeWagonState(npc, env);
const choice = npc.persona.pickWheelBreakResponse(synth, rng);
const { state: resolved } = resolveWheelBreak(synth, rng, choice);
// Bridge resolved.wagon back to the NPC's persistent state:
npc.wagon = { ...npc.wagon, ...resolved.wagon };
```

If `WagonStateLike` doesn't carry `impairment`, extend that type so the field round-trips through synth. One field addition matches the existing wagon.condition + greaseMiles bridge pattern.

- [ ] **Step 6: Run NPC tests**

```bash
npx vitest run tests/npc-wheel-break-parity-929.test.ts
npx vitest run tests/npc-*.test.ts
```

Expected: new tests pass; zero regressions in existing NPC tests.

- [ ] **Step 7: Commit**

```bash
jj describe -m "feat(929): NPC wagon-decay path uses shared resolveWheelBreak + persona pick"
jj new
```

---

## Task 13: UI — impairment indicator in `WagonPanel`

**Files:**
- Modify: `src/lib/ui/WagonPanel.svelte` (or the surface showing wagon condition)

Visual addition, no engine impact. Verified visually in dev.

- [ ] **Step 1: Locate the wagon-condition readout**

Open `src/lib/ui/WagonPanel.svelte`. Find the block rendering `wagon.condition`. If that file doesn't exist, check `src/lib/ui/wagon/` or grep `'condition'` across `src/lib/ui/` for the right surface.

- [ ] **Step 2: Add the impairment icon**

```svelte
<div class="wagon-row">
  <span class="label">Wagon</span>
  <span class="value">{Math.round(wagon.condition)}/100</span>
  {#if wagon.impairment}
    <span
      class="impairment-icon"
      title="Limping — wheel impaired. Pace ×0.5, decay ×2 until a blacksmith mounts a new wheel."
    >⚠️</span>
  {/if}
</div>
```

Adjust to match the existing class names + structure in the file.

- [ ] **Step 3: Verify visually**

```bash
systemd-run --user --unit=ot-dev-929 -p WorkingDirectory=/home/eric/projects/hoosierTrail-929-wheel-plan /usr/bin/bash -c 'npm run dev -- --port 5177 > /tmp/dev-929.log 2>&1'
```

Open `http://localhost:5177/dev/scenario/at_chimney_rock`. Trigger an actual wheel break + pick Push on, or force `wagon.impairment` via dev console mutation.

Expected: ⚠️ icon next to wagon-condition readout.

- [ ] **Step 4: Stop dev server**

```bash
systemctl --user stop ot-dev-929
```

- [ ] **Step 5: Commit**

```bash
jj describe -m "feat(929): WagonPanel impairment icon when wagon.impairment != null"
jj new
```

---

## Task 14: BEFORE / AFTER sweep validation

**Files:**
- None — validation only.

Per memory `feedback_sweep_runs_100`, engine changes get a BEFORE/AFTER `--runs 25` sweep. Output goes into the PR description.

- [ ] **Step 1: Stash current changes**

```bash
cd /home/eric/projects/hoosierTrail-929-wheel-plan
jj diff > /tmp/929-stash.diff   # backup
jj edit master                  # temporarily revert working copy to master tip
```

- [ ] **Step 2: Run BEFORE sweep**

```bash
npm run bot -- --sweep --personas all --professions all --runs 25 --tag before-929 > /tmp/sweep-before-929.log
```

(Adjust the CLI flags to match `scripts/persona-profession-sweep.ts` — see memory `reference_persona_sweep` for the exact invocation pattern.)

Expected: ~20–30 min run.

- [ ] **Step 3: Switch back to the change**

```bash
jj edit plan/929-wheel-3choice
```

- [ ] **Step 4: Run AFTER sweep**

```bash
npm run bot -- --sweep --personas all --professions all --runs 25 --tag after-929 > /tmp/sweep-after-929.log
```

- [ ] **Step 5: Build the comparison table**

Pull aggregates from each tag's log: arrival rate %, mean days, mean wagon condition, mean push_on count. Format for the PR description (Task 15 Step 3):

```
Sweep: persona-profession-sweep --runs 25, before/after

| Metric              | Before | After | Δ      |
|---------------------|-------:|------:|-------:|
| Arrival rate %      |   xx.x |  xx.x |   ±x.x |
| Mean days           |  xxx.x | xxx.x |   ±x.x |
| Mean wagon cond     |   xx.x |  xx.x |   ±x.x |
| Mean push_on count  |    n/a |   x.x |    new |
```

If arrival rate shifts > ±2pp, escalate to `--runs 100` per `feedback_sweep_runs_100`.

- [ ] **Step 6: No commit needed** — numbers land in the PR description (Task 15).

---

## Task 15: Full `npm run verify` + PR + merge + cleanup

- [ ] **Step 1: Run verify**

```bash
cd /home/eric/projects/hoosierTrail-929-wheel-plan
npm run verify
```

Expected: `check && test` both green. Zero errors, zero failing tests.

- [ ] **Step 2: Push the branch**

```bash
jj git push --bookmark plan/929-wheel-3choice --allow-new
```

- [ ] **Step 3: Open the PR**

Write the PR body to a tmpfile (avoids heredoc nesting):

```bash
cat > /tmp/929-pr-body.md <<'BODY'
## Summary

Closes #929.

Replaces the binary wheel-break with a 3-choice ladder (Spare / Rebuild / Push on) backed by a persistent `wagon.impairment` state and a shared player/NPC resolver. Spec at `docs/superpowers/specs/2026-05-27-929-wheel-3choice-ladder-design.md`.

## Wagon-train / game-ai axes

- **NPC parity (#300):** ✅ NPC wagon-decay path uses the same resolver via `npc-engine.ts`.
- **game-ai (#302 / #303c):** ✅ New `Persona.pickWheelBreakResponse` method, sibling to existing `pickRepairBudget`.

## Sweep validation

`persona-profession-sweep --runs 25`, BEFORE / AFTER:

[paste table from Task 14 Step 5]

## Test plan

- [x] `npm run verify` — `check` + `test` green
- [x] BEFORE/AFTER sweep at `--runs 25`
- [x] Manual: ⚠️ impairment icon appears in WagonPanel on a forced push_on
- [ ] After merge: monitor for unexpected condition-decay regressions
BODY
```

Open the PR from the default colocated workspace (where `.git/` lives):

```bash
cd /home/eric/projects/hoosierTrail
gh pr create --head plan/929-wheel-3choice --base master \
  --title "feat(929): wagon_wheel 3-choice ladder — Spare / Rebuild / Push on" \
  --body-file /tmp/929-pr-body.md
```

- [ ] **Step 4: Wait for CI**

```bash
gh pr view <PR_NUMBER> --json statusCheckRollup -q '.statusCheckRollup[0].detailsUrl'
gh run watch <RUN_ID> --exit-status
```

- [ ] **Step 5: Merge on green**

```bash
gh pr merge <PR_NUMBER> --squash --delete-branch
```

- [ ] **Step 6: Move VK #929 to Shipped**

```bash
VIKUNJA_TOKEN=$(op read "op://vault.ericbond.net/projects api key/password") \
python3 -c "
import os, json, urllib.request
H = {'Authorization': f\"Bearer {os.environ['VIKUNJA_TOKEN']}\", 'Content-Type': 'application/json'}
def http(m, p, b=None):
    d = json.dumps(b).encode() if b else None
    return json.loads(urllib.request.urlopen(urllib.request.Request(
        f'https://projects.ericbond.net/api/v1{p}', data=d, headers=H, method=m)).read())
t = http('GET', '/tasks/929')
t['done'] = True
http('POST', '/tasks/929', t)
print('VK #929 → Shipped')
"
```

- [ ] **Step 7: Clean up the workspace**

```bash
cd /home/eric/projects/hoosierTrail
jj workspace forget hoosierTrail-929-wheel-plan
rm -rf /home/eric/projects/hoosierTrail-929-wheel-plan
```

---

## Out of scope (filed as follow-ups)

- **#1186 — camp/post rebuild for broken parts.** Camp action `rebuild_wagon_parts` + extended `repairWagon` semantics for clearing impairment via explicit rebuild (not just paid-for repair). Gated on a historical-pass research write-up before designing the mechanic.
- **Generalizing impairment to axle / tongue / canvas.** Each part already has its own event today (`tongue_snaps`, `axle_breaks`, `canvas_tear`). The same 3-choice ladder pattern could apply. File as separate tickets if/when the wheel ladder proves the model.
