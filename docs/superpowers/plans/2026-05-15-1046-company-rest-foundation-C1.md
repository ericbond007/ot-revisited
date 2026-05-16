# #1046 Company Rest — C1 (Decision Engine) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the pure, fully unit-tested company-rest **decision engine** + captain **doctrine** + generation wiring — slice **C1** of the approved spec (`docs/superpowers/specs/2026-05-15-1046-company-rest-recovery-design.md`). Unwired by design; C2 (engine integration) is the next plan.

**Architecture:** One new bounded module `src/lib/game/systems/company-rest.ts` holding a pure `companyRestDecision(state) → {mode,reason}` (precedence crisis > sabbath > maintenance > travel, with hysteresis), a `personaToDoctrine` map, and a `trainAggregate` helper. Serialized type aliases + two `WagonTrain` fields live in `types.ts` (avoids a types→systems import cycle). `generateTrain` stamps the chartered `doctrine` at formation. No engine call sites change in C1.

**Tech Stack:** TypeScript, Vitest, SvelteKit. VCS = **jj** (not git). Branch: `feat/1046-company-rest` (already the working change off master).

**Spec slice:** C1 only. C2 (wire into `advanceTrain`/`engine-pausable`/`npc-engine`), B (dissent + triggers), A+D (recovery math), and joint calibration each get their own plan, gated on the prior sweep checkpoint. C1 produces working, testable software on its own (a unit-tested decision engine + the doctrine charter), exactly as the spec defined this slice.

---

## Conventions (apply to every task)

- **Test runner:** `npx vitest run tests/<file>` for a single file; `npm run verify` (= `npm run check` svelte-check + `npm test` full vitest) is the pre-PR gate.
- **Commit step (jj, not git):** the branch is one evolving change. A task's "commit" = run the task's test green, then update the cumulative message:
  ```bash
  jj describe -m "feat(engine): #1046 C1 — company-rest decision engine + doctrine charter"
  ```
  Do **not** `jj new` between tasks (keep C1 as one change/PR). Do **not** `git` anything.
- **Type errors are bugs.** If `npm run check` fails, fix before proceeding — never `as any`/`@ts-ignore`.
- No save migration anywhere (per project policy); adding fields without backfill is fine.

---

## File Structure

| File | Responsibility | C1 change |
|---|---|---|
| `src/lib/game/types.ts` | Serialized type aliases + `WagonTrain` shape | **Modify**: add `CaptainDoctrine`, `CompanyRestMode`, `CompanyRestDecision` type aliases; add `WagonTrain.doctrine` + `WagonTrain.companyDecisionBlock?` |
| `src/lib/game/systems/company-rest.ts` | The decision engine (pure) | **Create**: `DOCTRINE_PARAMS`, `personaToDoctrine`, `trainAggregate`, `companyRestDecision` |
| `src/lib/game/content/trains.ts` | Train generation | **Modify**: stamp `doctrine` on the returned `WagonTrain` |
| `tests/company-rest-1046.test.ts` | C1 unit tests | **Create** |
| `tests/company-rest-gen-1046.test.ts` | generateTrain doctrine test | **Create** |

---

## Task 1: Serialized types + WagonTrain fields

**Files:**
- Modify: `src/lib/game/types.ts` (`WagonTrain` interface ≈ lines 227–253; add type aliases just above it)
- Test: `tests/company-rest-1046.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `tests/company-rest-1046.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { WagonTrain, CaptainDoctrine, CompanyRestMode } from '../src/lib/game/types';

describe('#1046 C1 — serialized types', () => {
  it('WagonTrain carries a doctrine + optional decision block', () => {
    const wt: WagonTrain = {
      id: 't', name: 'Co', joinedDay: 1, joinedAtLandmarkId: null,
      leaderId: 'player', companions: [],
      doctrine: 'prudent',
      companyDecisionBlock: { mode: 'travel', blockStartDay: 1 }
    };
    expect(wt.doctrine).toBe('prudent');
    expect(wt.companyDecisionBlock?.mode).toBe('travel');
  });

  it('the doctrine + mode unions have exactly the spec values', () => {
    const doctrines: CaptainDoctrine[] = ['hard_driver', 'prudent', 'devout'];
    const modes: CompanyRestMode[] =
      ['travel', 'sabbath_layby', 'maintenance_layby', 'crisis_layby'];
    expect(doctrines).toHaveLength(3);
    expect(modes).toHaveLength(4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/company-rest-1046.test.ts`
Expected: FAIL — TS error "Module '../src/lib/game/types' has no exported member 'CaptainDoctrine'" (and `doctrine` not assignable on `WagonTrain`).

- [ ] **Step 3: Add the types**

In `src/lib/game/types.ts`, immediately **above** `export interface WagonTrain {`, insert:

```ts
/** #1046 — the train captain's fixed rest doctrine, set at formation
 *  from the captain figure's persona. Static for the journey; the
 *  daily decision it produces is condition-driven. */
export type CaptainDoctrine = 'hard_driver' | 'prudent' | 'devout';

/** #1046 — the company's daily rest decision. Precedence when
 *  computed: crisis > sabbath > maintenance > travel. */
export type CompanyRestMode =
  | 'travel'
  | 'sabbath_layby'
  | 'maintenance_layby'
  | 'crisis_layby';

export interface CompanyRestDecision {
  mode: CompanyRestMode;
  /** Short human-readable why, for logs/UI/tests. */
  reason: string;
}
```

Then inside `export interface WagonTrain { ... }`, **after** the `playerStandsAside?: boolean;` line, add:

```ts
  /** #1046 — chartered rest doctrine, stamped at generation from the
   *  captain figure's persona. Required on all trains created from
   *  #1046 onward. */
  doctrine: CaptainDoctrine;
  /** #1046 — the in-flight company-rest decision block. Carries the
   *  current mode + the day it started so the daily decision has
   *  hysteresis (a maintenance lay-by holds until conditions clear a
   *  margin, not 1-day-thrash) and so the dissent prompt (slice B)
   *  fires once per block. Absent until the first day's decision. */
  companyDecisionBlock?: { mode: CompanyRestMode; blockStartDay: number };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/company-rest-1046.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit** — `jj describe -m "feat(engine): #1046 C1 — company-rest decision engine + doctrine charter"`

---

## Task 2: `personaToDoctrine` map

**Files:**
- Create: `src/lib/game/systems/company-rest.ts`
- Test: `tests/company-rest-1046.test.ts` (append)

- [ ] **Step 1: Write the failing test**

Append to `tests/company-rest-1046.test.ts`:

```ts
import { personaToDoctrine } from '../src/lib/game/systems/company-rest';
import type { PersonaId } from '../src/lib/game/ai/types';

describe('#1046 C1 — personaToDoctrine', () => {
  const cases: Array<[PersonaId | undefined, string]> = [
    ['aggressive', 'hard_driver'],
    ['pace_pusher', 'hard_driver'],
    ['cautious', 'devout'],
    ['faithful', 'devout'],
    ['sunday_rester', 'devout'],
    ['balanced', 'prudent'],
    ['hoarder', 'prudent'],
    ['generous', 'prudent'],
    ['drinker', 'prudent'],
    ['chaos', 'prudent'],
    [undefined, 'prudent']
  ];
  for (const [persona, doctrine] of cases) {
    it(`${persona ?? 'undefined'} → ${doctrine}`, () => {
      expect(personaToDoctrine(persona)).toBe(doctrine);
    });
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/company-rest-1046.test.ts`
Expected: FAIL — "Cannot find module '../src/lib/game/systems/company-rest'".

- [ ] **Step 3: Create the module with the map**

Create `src/lib/game/systems/company-rest.ts`:

```ts
// #1046 — company rest & recovery, slice C1: the captain-owned daily
// rest decision engine. PURE — no side effects, no engine call sites
// in C1 (wired in C2). Spec: docs/superpowers/specs/2026-05-15-1046-
// company-rest-recovery-design.md
import type {
  GameState,
  CaptainDoctrine,
  CompanyRestMode,
  CompanyRestDecision
} from '../types';
import type { PersonaId } from '../ai/types';
import { isSunday } from '../utils/calendar';

/** Captain persona → chartered doctrine. aggressive-family pushes
 *  (hard_driver); the devotion/caution personas keep the Sabbath
 *  (devout); everything else, incl. chaos and the 'balanced' filler
 *  default, sits at the prudent middle. Spec §4. */
export function personaToDoctrine(persona: PersonaId | undefined): CaptainDoctrine {
  switch (persona) {
    case 'aggressive':
    case 'pace_pusher':
      return 'hard_driver';
    case 'cautious':
    case 'faithful':
    case 'sunday_rester':
      return 'devout';
    default:
      return 'prudent';
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/company-rest-1046.test.ts`
Expected: PASS (2 + 11 tests).

- [ ] **Step 5: Commit** — `jj describe -m "feat(engine): #1046 C1 — company-rest decision engine + doctrine charter"`

---

## Task 3: `trainAggregate` — whole-company weakest-wagon state

The decision reads avg ox-fatigue and **min** party HP across the *whole* company: the player wagon (`state.party`/`state.oxen`) **plus** every `wagonTrain.companions[]` wagon.

**Files:**
- Modify: `src/lib/game/systems/company-rest.ts`
- Test: `tests/company-rest-1046.test.ts` (append)

- [ ] **Step 1: Write the failing test**

Append:

```ts
import { trainAggregate } from '../src/lib/game/systems/company-rest';
import { createInitialState } from '../src/lib/game/engine';
import { generateTrain } from '../src/lib/game/content/trains';
import { makeRng } from '../src/lib/game/rng';
import type { GameState } from '../src/lib/game/types';

function gameInTrain(): GameState {
  const s = createInitialState({
    seed: 'agg', leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'doctor' }],
    startDate: { year: 1849, month: 6, day: 15 }
  });
  const train = generateTrain('agg', 1, null, makeRng('agg'), { fresh: true });
  return { ...s, wagonTrain: train };
}

describe('#1046 C1 — trainAggregate', () => {
  it('min party HP spans player + all companion wagons', () => {
    const s = gameInTrain();
    // wound one companion member to 12 → min must be ≤ 12
    s.wagonTrain!.companions[0].party[0].health = 12;
    const a = trainAggregate(s);
    expect(a.minPartyHP).toBeLessThanOrEqual(12);
  });

  it('avg ox-fatigue spans player + all companion oxen', () => {
    const s = gameInTrain();
    s.oxen.forEach((o) => (o.fatigue = 80));
    s.wagonTrain!.companions.forEach((w) => w.oxen.forEach((o) => (o.fatigue = 80)));
    const a = trainAggregate(s);
    expect(a.avgOxFatigue).toBeGreaterThan(75);
  });

  it('solo (no train) aggregates the player wagon only', () => {
    // createInitialState requires >=2 adults; a valid party with NO
    // wagonTrain exercises the player-only path (companions ?? []).
    const s = createInitialState({
      seed: 'p', leader: { name: 'L', profession: 'farmer' },
      companions: [{ name: 'C', profession: 'doctor' }],
      startDate: { year: 1849, month: 6, day: 15 }
    });
    s.party[0].health = 40; // the other adult stays 100 → min = 40
    expect(s.wagonTrain).toBeNull(); // createInitialState sets null, not undefined
    expect(trainAggregate(s).minPartyHP).toBe(40);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/company-rest-1046.test.ts`
Expected: FAIL — "trainAggregate is not a function" / no export.

- [ ] **Step 3: Implement `trainAggregate`**

Append to `src/lib/game/systems/company-rest.ts`:

```ts
export interface TrainAggregate {
  avgOxFatigue: number;
  /** Lowest alive-member HP across the whole company; 100 if nobody
   *  alive anywhere (degenerate — keeps the decision from resting). */
  minPartyHP: number;
}

/** Aggregate the whole company: the player wagon (state.party /
 *  state.oxen) plus every companion wagon. Weakest-wagon-weighted —
 *  the captain watched the company and the train moved at the
 *  condition of its worst wagon (Unruh 1979 / Faragher 1979). */
export function trainAggregate(state: GameState): TrainAggregate {
  const partyGroups = [state.party, ...(state.wagonTrain?.companions ?? []).map((w) => w.party)];
  const oxGroups = [state.oxen, ...(state.wagonTrain?.companions ?? []).map((w) => w.oxen)];

  let minHP = 100;
  for (const party of partyGroups) {
    for (const m of party) {
      if (m.dead) continue;
      if (m.health < minHP) minHP = m.health;
    }
  }

  let oxSum = 0;
  let oxCount = 0;
  for (const oxen of oxGroups) {
    for (const o of oxen) {
      if (o.health <= 0) continue;
      oxSum += o.fatigue;
      oxCount += 1;
    }
  }
  const avgOxFatigue = oxCount > 0 ? oxSum / oxCount : 0;

  return { avgOxFatigue, minPartyHP: minHP };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/company-rest-1046.test.ts`
Expected: PASS (all prior + 3).

- [ ] **Step 5: Commit** — `jj describe -m "feat(engine): #1046 C1 — company-rest decision engine + doctrine charter"`

---

## Task 4: `companyRestDecision` — crisis floor (always wins)

**Files:**
- Modify: `src/lib/game/systems/company-rest.ts`
- Test: `tests/company-rest-1046.test.ts` (append)

- [ ] **Step 1: Write the failing test**

Append:

```ts
import { companyRestDecision, DOCTRINE_PARAMS } from '../src/lib/game/systems/company-rest';
import type { CaptainDoctrine } from '../src/lib/game/types';

function withDoctrine(s: GameState, d: CaptainDoctrine): GameState {
  return { ...s, wagonTrain: { ...s.wagonTrain!, doctrine: d } };
}

describe('#1046 C1 — companyRestDecision: crisis floor', () => {
  const ALL: CaptainDoctrine[] = ['hard_driver', 'prudent', 'devout'];
  it('min HP < 20 → crisis_layby for EVERY doctrine (even hard_driver)', () => {
    for (const d of ALL) {
      const s = withDoctrine(gameInTrain(), d);
      s.party[0].health = 15;
      const dec = companyRestDecision(s);
      expect(dec.mode).toBe('crisis_layby');
    }
  });
  it('DOCTRINE_PARAMS has all three doctrines', () => {
    for (const d of ALL) expect(DOCTRINE_PARAMS[d]).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/company-rest-1046.test.ts`
Expected: FAIL — "companyRestDecision is not a function" / "DOCTRINE_PARAMS undefined".

- [ ] **Step 3: Implement params + crisis branch**

Append to `src/lib/game/systems/company-rest.ts`:

```ts
interface DoctrineParams {
  sabbath: boolean;
  /** maintenance lay-by triggers (whole-company aggregate). */
  maintOxFatigue: number;
  maintMinHP: number;
}

/** Spec §4 starting values — calibration (a later slice) tunes these
 *  via the sweep; C1 locks the shape, not the final numbers. */
export const DOCTRINE_PARAMS: Record<CaptainDoctrine, DoctrineParams> = {
  hard_driver: { sabbath: false, maintOxFatigue: 65, maintMinHP: 25 },
  prudent:     { sabbath: false, maintOxFatigue: 50, maintMinHP: 40 },
  devout:      { sabbath: true,  maintOxFatigue: 50, maintMinHP: 40 }
};

/** Universal crisis floor — even a hard_driver stops here. Mirrors
 *  the existing engine emergency bar (min HP < 20). */
const CRISIS_MIN_HP = 20;

/** Hysteresis: once a maintenance lay-by is called it holds until
 *  avg ox-fatigue drops a margin below the trigger (and HP recovers a
 *  margin) — prevents 1-day-rest-then-instant-retrigger thrash. */
const HYSTERESIS_OXFAT = 15;
const HYSTERESIS_HP = 10;

export function companyRestDecision(state: GameState): CompanyRestDecision {
  const train = state.wagonTrain;
  // Solo / no captain: C1 returns travel (the solo per-wagon path is
  // unchanged and owns that case; C2 only consults this in a train).
  if (!train) return { mode: 'travel', reason: 'no train' };

  const agg = trainAggregate(state);

  // 1. Crisis — highest precedence, doctrine-independent.
  if (agg.minPartyHP < CRISIS_MIN_HP) {
    return { mode: 'crisis_layby', reason: `crisis: min HP ${Math.round(agg.minPartyHP)}` };
  }

  return { mode: 'travel', reason: 'no rest trigger' };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/company-rest-1046.test.ts`
Expected: PASS (all prior + 2).

- [ ] **Step 5: Commit** — `jj describe -m "feat(engine): #1046 C1 — company-rest decision engine + doctrine charter"`

---

## Task 5: `companyRestDecision` — Sabbath branch

**Files:**
- Modify: `src/lib/game/systems/company-rest.ts`
- Test: `tests/company-rest-1046.test.ts` (append)

- [ ] **Step 1: Write the failing test**

Append:

```ts
describe('#1046 C1 — companyRestDecision: Sabbath', () => {
  // 1849-06-17 is a Sunday; 1849-06-18 a Monday (Gregorian).
  it('devout + Sunday + healthy → sabbath_layby', () => {
    const s = withDoctrine(gameInTrain(), 'devout');
    s.date = { year: 1849, month: 6, day: 17 };
    expect(companyRestDecision(s).mode).toBe('sabbath_layby');
  });
  it('devout + Monday + healthy → travel (no Sabbath today)', () => {
    const s = withDoctrine(gameInTrain(), 'devout');
    s.date = { year: 1849, month: 6, day: 18 };
    expect(companyRestDecision(s).mode).toBe('travel');
  });
  it('prudent + Sunday → travel (secular company keeps no Sabbath)', () => {
    const s = withDoctrine(gameInTrain(), 'prudent');
    s.date = { year: 1849, month: 6, day: 17 };
    expect(companyRestDecision(s).mode).toBe('travel');
  });
  it('crisis still beats Sabbath (devout + Sunday + dying → crisis)', () => {
    const s = withDoctrine(gameInTrain(), 'devout');
    s.date = { year: 1849, month: 6, day: 17 };
    s.party[0].health = 15;
    expect(companyRestDecision(s).mode).toBe('crisis_layby');
  });
});
```

> Note: verify the Sunday date with `isSunday` semantics in `src/lib/game/utils/calendar.ts` before relying on 1849-06-17; if `dayOfWeek` maps differently, adjust the two date literals so one `isSunday` is true and the other false. The assertions, not the literals, are the contract.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/company-rest-1046.test.ts`
Expected: FAIL — devout+Sunday returns `travel` (Sabbath branch not implemented).

- [ ] **Step 3: Add the Sabbath branch**

In `src/lib/game/systems/company-rest.ts`, in `companyRestDecision`, **between** the crisis block and the final `return { mode: 'travel', ... }`, insert:

```ts
  const params = DOCTRINE_PARAMS[train.doctrine];

  // 2. Sabbath — devout doctrine on the Sabbath day.
  if (params.sabbath && isSunday(state.date)) {
    return { mode: 'sabbath_layby', reason: 'Sabbath observance' };
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/company-rest-1046.test.ts`
Expected: PASS (all prior + 4).

- [ ] **Step 5: Commit** — `jj describe -m "feat(engine): #1046 C1 — company-rest decision engine + doctrine charter"`

---

## Task 6: `companyRestDecision` — maintenance branch + hysteresis

**Files:**
- Modify: `src/lib/game/systems/company-rest.ts`
- Test: `tests/company-rest-1046.test.ts` (append)

- [ ] **Step 1: Write the failing test**

Append:

```ts
describe('#1046 C1 — companyRestDecision: maintenance + hysteresis', () => {
  function tiredTrain(d: CaptainDoctrine, fatigue: number): GameState {
    const s = withDoctrine(gameInTrain(), d);
    s.date = { year: 1849, month: 6, day: 18 }; // Monday — no Sabbath
    s.oxen.forEach((o) => (o.fatigue = fatigue));
    s.wagonTrain!.companions.forEach((w) => w.oxen.forEach((o) => (o.fatigue = fatigue)));
    return s;
  }

  it('prudent: avg ox-fat 55 (>50) → maintenance_layby', () => {
    expect(companyRestDecision(tiredTrain('prudent', 55)).mode).toBe('maintenance_layby');
  });
  it('hard_driver: avg ox-fat 55 (≤65) → travel (pushes harder)', () => {
    expect(companyRestDecision(tiredTrain('hard_driver', 55)).mode).toBe('travel');
  });
  it('hard_driver: avg ox-fat 70 (>65) → maintenance_layby', () => {
    expect(companyRestDecision(tiredTrain('hard_driver', 70)).mode).toBe('maintenance_layby');
  });
  it('hysteresis: once in a maintenance block, ox-fat 40 (>50−15) HOLDS the layby', () => {
    const s = tiredTrain('prudent', 40);
    s.wagonTrain!.companyDecisionBlock = { mode: 'maintenance_layby', blockStartDay: s.day - 1 };
    expect(companyRestDecision(s).mode).toBe('maintenance_layby');
  });
  it('hysteresis cleared: in a maintenance block, ox-fat 30 (<50−15) → travel', () => {
    const s = tiredTrain('prudent', 30);
    s.wagonTrain!.companyDecisionBlock = { mode: 'maintenance_layby', blockStartDay: s.day - 1 };
    expect(companyRestDecision(s).mode).toBe('travel');
  });
  it('min HP trigger also fires maintenance (prudent, HP 35 < 40, HP ≥ crisis 20)', () => {
    const s = withDoctrine(gameInTrain(), 'prudent');
    s.date = { year: 1849, month: 6, day: 18 };
    s.party[0].health = 35;
    expect(companyRestDecision(s).mode).toBe('maintenance_layby');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/company-rest-1046.test.ts`
Expected: FAIL — maintenance cases return `travel` (branch absent).

- [ ] **Step 3: Add the maintenance + hysteresis branch**

In `companyRestDecision`, **after** the Sabbath block and **before** the final `return { mode: 'travel', ... }`, insert:

```ts
  // 3. Maintenance — condition-driven, with hysteresis. If we're
  //    already mid maintenance/crisis block, hold until the company
  //    clears the trigger by a margin (no 1-day-thrash). Otherwise,
  //    fire when the doctrine's threshold is first crossed.
  const inLaybyBlock =
    train.companyDecisionBlock?.mode === 'maintenance_layby' ||
    train.companyDecisionBlock?.mode === 'crisis_layby';

  const oxTrigger = inLaybyBlock
    ? params.maintOxFatigue - HYSTERESIS_OXFAT
    : params.maintOxFatigue;
  const hpTrigger = inLaybyBlock
    ? params.maintMinHP - HYSTERESIS_HP
    : params.maintMinHP;

  if (agg.avgOxFatigue > oxTrigger || agg.minPartyHP < hpTrigger) {
    const why = agg.avgOxFatigue > oxTrigger
      ? `maintenance: avg ox-fatigue ${Math.round(agg.avgOxFatigue)}`
      : `maintenance: min HP ${Math.round(agg.minPartyHP)}`;
    return { mode: 'maintenance_layby', reason: why };
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/company-rest-1046.test.ts`
Expected: PASS (all prior + 6).

- [ ] **Step 5: Commit** — `jj describe -m "feat(engine): #1046 C1 — company-rest decision engine + doctrine charter"`

---

## Task 7: Full precedence integration test

No new code — locks the crisis > sabbath > maintenance > travel ordering as one contract test (a regression net for C2+).

**Files:**
- Test: `tests/company-rest-1046.test.ts` (append)

- [ ] **Step 1: Write the test**

Append:

```ts
describe('#1046 C1 — full precedence: crisis > sabbath > maintenance > travel', () => {
  it('devout, Sunday, ox-fat 90, min HP 15 → crisis (beats all)', () => {
    const s = withDoctrine(gameInTrain(), 'devout');
    s.date = { year: 1849, month: 6, day: 17 };
    s.oxen.forEach((o) => (o.fatigue = 90));
    s.party[0].health = 15;
    expect(companyRestDecision(s).mode).toBe('crisis_layby');
  });
  it('devout, Sunday, ox-fat 90, healthy → sabbath (beats maintenance)', () => {
    const s = withDoctrine(gameInTrain(), 'devout');
    s.date = { year: 1849, month: 6, day: 17 };
    s.oxen.forEach((o) => (o.fatigue = 90));
    expect(companyRestDecision(s).mode).toBe('sabbath_layby');
  });
  it('prudent, Monday, ox-fat 90, healthy → maintenance (beats travel)', () => {
    const s = withDoctrine(gameInTrain(), 'prudent');
    s.date = { year: 1849, month: 6, day: 18 };
    s.oxen.forEach((o) => (o.fatigue = 90));
    expect(companyRestDecision(s).mode).toBe('maintenance_layby');
  });
  it('prudent, Monday, fresh team, healthy → travel', () => {
    const s = withDoctrine(gameInTrain(), 'prudent');
    s.date = { year: 1849, month: 6, day: 18 };
    expect(companyRestDecision(s).mode).toBe('travel');
  });
});
```

- [ ] **Step 2: Run to verify it passes immediately** (logic already implemented)

Run: `npx vitest run tests/company-rest-1046.test.ts`
Expected: PASS (all prior + 4). If any fail, the precedence ordering in Tasks 4–6 is wrong — fix the branch order in `companyRestDecision` (crisis, then sabbath, then maintenance, then travel) before continuing.

- [ ] **Step 3: Commit** — `jj describe -m "feat(engine): #1046 C1 — company-rest decision engine + doctrine charter"`

---

## Task 8: Stamp `doctrine` in `generateTrain`

`generateTrain` returns a `WagonTrain` (≈ `src/lib/game/content/trains.ts:543–547`) that now lacks the required `doctrine` field → `npm run check` fails until stamped. The chartered doctrine = the company that formed around "Captain X" — derived deterministically from the first companion's persona (the natural captain figure; charisma-weighted selection is a later-slice refinement).

**Files:**
- Modify: `src/lib/game/content/trains.ts` (the `return { ... }` of `generateTrain`, ≈ lines 543–547; add the import)
- Test: `tests/company-rest-gen-1046.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `tests/company-rest-gen-1046.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { generateTrain } from '../src/lib/game/content/trains';
import { personaToDoctrine } from '../src/lib/game/systems/company-rest';
import { makeRng } from '../src/lib/game/rng';

describe('#1046 C1 — generateTrain stamps a chartered doctrine', () => {
  it('every generated train has a doctrine in the valid set', () => {
    const t = generateTrain('seed-a', 1, null, makeRng('seed-a'), { fresh: true });
    expect(['hard_driver', 'prudent', 'devout']).toContain(t.doctrine);
  });

  it('doctrine matches the first companion persona via personaToDoctrine', () => {
    const t = generateTrain('seed-b', 1, null, makeRng('seed-b'), { fresh: true });
    expect(t.doctrine).toBe(personaToDoctrine(t.companions[0]?.personaId));
  });

  it('a no-companion train still has a valid doctrine (defaults prudent)', () => {
    const t = generateTrain('seed-c', 1, null, makeRng('seed-c'), { fresh: true });
    if (t.companions.length === 0) expect(t.doctrine).toBe('prudent');
    else expect(['hard_driver', 'prudent', 'devout']).toContain(t.doctrine);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/company-rest-gen-1046.test.ts && npm run check`
Expected: FAIL — `t.doctrine` is `undefined` (assertion fails) and/or `npm run check` errors that `doctrine` is missing on the `generateTrain` return literal.

- [ ] **Step 3: Stamp the doctrine**

In `src/lib/game/content/trains.ts`, add to the import block at the top (with the other `../systems` or `../ai` imports):

```ts
import { personaToDoctrine } from '../systems/company-rest';
```

Then in `generateTrain`'s `return { ... }` object (the one with `leaderId: 'player'`, `companions`), add the field:

```ts
    doctrine: personaToDoctrine(companions[0]?.personaId),
```

(Place it adjacent to `leaderId` / `companions` in the returned object literal.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/company-rest-gen-1046.test.ts && npm run check`
Expected: PASS (3 tests) and `npm run check` clean.

- [ ] **Step 5: Commit** — `jj describe -m "feat(engine): #1046 C1 — company-rest decision engine + doctrine charter"`

---

## Task 9: Full gate + PR

**Files:** none (verification + ship).

- [ ] **Step 1: Full verify**

Run: `npm run verify`
Expected: svelte-check 0 errors; all vitest pass (existing suite + the two new C1 files). If any *other* test now fails because `WagonTrain` requires `doctrine` (a test that builds a `WagonTrain` literal without it), fix that test by adding `doctrine: 'prudent'` to its fixture — that is correct (the field is now required), not a regression. Re-run until green.

- [ ] **Step 2: Final commit message**

```bash
jj describe -m "$(cat <<'EOF'
feat(engine): #1046 C1 — company-rest decision engine + doctrine charter

Slice C1 of the unified company rest & recovery model (spec
2026-05-15-1046). Pure, unwired (C2 integrates):

- types.ts: CaptainDoctrine / CompanyRestMode / CompanyRestDecision;
  WagonTrain.doctrine (required) + .companyDecisionBlock?.
- systems/company-rest.ts: personaToDoctrine map, trainAggregate
  (whole-company weakest-wagon: player wagon + all companions),
  companyRestDecision — precedence crisis > sabbath > maintenance >
  travel, doctrine-driven thresholds, maintenance hysteresis.
- content/trains.ts: generateTrain stamps the chartered doctrine
  from the captain-figure persona.

No engine call sites changed (C1 is unwired by design). No save
migration (project policy). tests/company-rest-1046.test.ts +
tests/company-rest-gen-1046.test.ts. npm run verify green.

VK: #1046 (slice C1)
EOF
)"
```

- [ ] **Step 3: Push + open PR** (jj, from `/tmp` so jj's detached-HEAD doesn't break `gh`)

```bash
jj git push --bookmark feat/1046-company-rest --allow-new
cd /tmp && gh pr create --repo ericbond007/ot-revisited \
  --head feat/1046-company-rest --base master \
  --title "#1046 C1 — company-rest decision engine + doctrine charter" \
  --body "Slice C1 (pure, unwired) of the approved #1046 spec. Decision engine + doctrine charter + generateTrain stamping. C2 wires it. npm run verify green. VK: #1046"
```

- [ ] **Step 4:** Wait for CI green, then `gh pr merge <n> --repo ericbond007/ot-revisited --merge --delete-branch`. Mark VK #1046 In-Progress on PR open (slice tracking), keep open (C1 is one of five slices — do **not** close #1046 until the final slice ships).

---

## Self-Review

**1. Spec coverage (C1 scope only):** doctrine type ✓ (Task 1), persona→doctrine map ✓ (Task 2, spec §4 + sunday_rester/chaos extension noted), whole-company weakest-wagon aggregate ✓ (Task 3, spec §4), precedence crisis>sabbath>maintenance>travel ✓ (Tasks 4–7), doctrine thresholds as starting values ✓ (Task 4, spec says sweep-tuned later), hysteresis no-thrash ✓ (Task 6, spec §4), generation stamping ✓ (Task 8). Out of C1 scope by design (own later plans): C2 wiring, dissent flow, A/D recovery, calibration — explicitly stated in header.

**2. Placeholder scan:** none. Every code step has complete code; the one soft note (Task 5 Sunday-date literal) gives an explicit verification + fallback rule, not a TODO.

**3. Type consistency:** `CaptainDoctrine`/`CompanyRestMode`/`CompanyRestDecision` defined in Task 1, imported identically in Tasks 2–8. `personaToDoctrine` (Task 2) signature reused verbatim in Tasks 3/8. `trainAggregate`→`{avgOxFatigue,minPartyHP}` (Task 3) consumed with those exact names in Tasks 4/6. `companyRestDecision` returns `{mode,reason}` consistently. `DOCTRINE_PARAMS` keys = the three doctrines, used in Tasks 4–6. Consistent.
