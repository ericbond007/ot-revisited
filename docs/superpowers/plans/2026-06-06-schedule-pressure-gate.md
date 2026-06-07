# Schedule-Pressure Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the player-bot and NPC drivers from dawdling over the 220-day clock by adding a per-persona schedule-pressure signal that suppresses discretionary camping (hunt / pan / voluntary rest / opportunistic find-water) when behind schedule, while critical needs and sacred Sabbath always win.

**Architecture:** A new pure module `src/lib/game/ai/schedule.ts` computes `schedulePressure(state, targetArrivalDay)` from `state.day × (TOTAL_TRAIL_MI / milesTraveled)`, holds the `personaScheduleDoctrine` map, and exposes a `suppressCamp(...)` helper. The gate is applied **inside the persona discretionary predicates** (`shouldHunt`/`shouldRest`/`shouldFindWater`/`shouldPan` in `personas.ts`), which both the player-bot (`dev/bot/runner.ts`) and the NPC engine (`systems/npc-engine.ts`) already call — so parity is free and no runner/engine edits are needed.

**Tech Stack:** TypeScript (strict), Vitest, SvelteKit. Run from the `hoosierTrail-1235` jj workspace. Verify with `npm run check` + `npm test`; balance-gate with `scripts/persona-profession-sweep.ts --runs 2`.

**Spec:** `docs/superpowers/specs/2026-06-06-schedule-pressure-gate-design.md`

**Conventions:**
- jj, not git. Commit each task with `jj describe -m "..."` on bookmark `feat/1235-schedule-pressure` (already created). Do NOT `git commit`.
- Edits in this workspace are fine (not the default workspace). If a hook blocks the Edit/Write tool, fall back to a Python heredoc (`python3 <<'PY' ... PY`) writing the file.
- No `// @ts-ignore` / `as any` past a real type error.
- Co-Author line on commits: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

## File Structure

- **Create** `src/lib/game/ai/schedule.ts` — pressure signal, doctrine map, `suppressCamp` helper, exported `TOTAL_TRAIL_MI`.
- **Create** `tests/schedule-pressure.test.ts` — unit tests for the module.
- **Modify** `src/lib/game/ai/types.ts` — no new Persona field needed (doctrine looked up by `persona.id`); only add the `ScheduleDoctrine`/`SchedulePressure` type re-exports if convenient. (Types live in schedule.ts; types.ts unchanged unless an import cycle forces a move.)
- **Modify** `src/lib/game/ai/personas.ts` — import from schedule.ts; replace the private `const TOTAL_TRAIL_MI`; add the suppression guard to each discretionary predicate; drop the now-redundant `shouldRest` overrides on `sunday_rester` and `faithful`.

No changes to `runner.ts` or `npc-engine.ts` — they call the gated predicates.

---

## Task 1: Schedule signal + doctrine module

**Files:**
- Create: `src/lib/game/ai/schedule.ts`
- Create: `tests/schedule-pressure.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/schedule-pressure.test.ts
import { describe, it, expect } from 'vitest';
import {
  projectedArrivalDay,
  schedulePressure,
  personaScheduleDoctrine,
  doctrineFor,
  TOTAL_TRAIL_MI
} from '../src/lib/game/ai/schedule';
import type { GameState } from '../src/lib/game/types';

// Minimal GameState stub — only the fields the signal reads.
function stateAt(day: number, miles: number): GameState {
  return { day, location: { milesTraveled: miles } } as unknown as GameState;
}

describe('projectedArrivalDay', () => {
  it('returns null before the judge thresholds (too early)', () => {
    expect(projectedArrivalDay(stateAt(10, 200))).toBeNull(); // day < 20
    expect(projectedArrivalDay(stateAt(30, 50))).toBeNull();  // miles < 100
  });
  it('projects linearly from average pace', () => {
    // 50% of the trail in 100 days -> projects to ~2x = day 200
    const halfway = TOTAL_TRAIL_MI / 2;
    expect(projectedArrivalDay(stateAt(100, halfway))).toBeCloseTo(200, 0);
  });
});

describe('schedulePressure', () => {
  it('is ok when too early to judge', () => {
    expect(schedulePressure(stateAt(10, 50), 185)).toBe('ok');
  });
  it('is ok when projected arrival beats the target', () => {
    // projects to ~150 (fast), target 185 -> ok
    expect(schedulePressure(stateAt(100, TOTAL_TRAIL_MI * 0.67), 185)).toBe('ok');
  });
  it('is behind when projected is past target but within the critical margin', () => {
    // project to ~195: day 100, miles s.t. 100*TOTAL/miles=195 -> miles=TOTAL*100/195
    const miles = (TOTAL_TRAIL_MI * 100) / 195;
    expect(schedulePressure(stateAt(100, miles), 185)).toBe('behind'); // 185 < 195 <= 200
  });
  it('is critical when projected is far past target', () => {
    const miles = (TOTAL_TRAIL_MI * 100) / 210; // projects to 210 > 185+15
    expect(schedulePressure(stateAt(100, miles), 185)).toBe('critical');
  });
  it('is always ok when the target is null (chaos ignores the clock)', () => {
    const miles = (TOTAL_TRAIL_MI * 100) / 260; // wildly behind
    expect(schedulePressure(stateAt(100, miles), null)).toBe('ok');
  });
});

describe('personaScheduleDoctrine', () => {
  const ids = [
    'cautious','balanced','aggressive','chaos','sunday_rester',
    'pace_pusher','hoarder','generous','faithful','drinker'
  ] as const;
  it('has an entry for every persona', () => {
    for (const id of ids) expect(personaScheduleDoctrine[id]).toBeDefined();
  });
  it('marks only faithful + sunday_rester sabbath-sacred', () => {
    for (const id of ids) {
      const sacred = personaScheduleDoctrine[id].sabbathSacred;
      expect(sacred).toBe(id === 'faithful' || id === 'sunday_rester');
    }
  });
  it('chaos ignores the clock (null target)', () => {
    expect(personaScheduleDoctrine.chaos.targetArrivalDay).toBeNull();
  });
  it('doctrineFor falls back to balanced for an unknown id', () => {
    expect(doctrineFor('balanced')).toEqual(personaScheduleDoctrine.balanced);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/schedule-pressure.test.ts`
Expected: FAIL — cannot resolve `../src/lib/game/ai/schedule`.

- [ ] **Step 3: Write the module**

```ts
// src/lib/game/ai/schedule.ts
import type { GameState } from '../types';
import type { PersonaId } from './types';

/** Full Oregon Trail length in miles. Single source of truth; personas.ts
 *  imports this. */
export const TOTAL_TRAIL_MI = 2195;

/** Below these, the run is too young to judge pace — return no pressure. */
const MIN_JUDGE_DAYS = 20;
const MIN_JUDGE_MILES = 100;
/** Days past a persona's target arrival before pressure escalates ok->behind->critical. */
const CRITICAL_MARGIN = 15;

export type SchedulePressure = 'ok' | 'behind' | 'critical';

export interface ScheduleDoctrine {
  /** Target finish day (cumulative `state.day`). null = ignores the clock (chaos). */
  targetArrivalDay: number | null;
  /** true = never skip Sunday rest, even when behind (the devout). */
  sabbathSacred: boolean;
}

/** Projected finish day if the party holds its average all-in pace so far.
 *  Returns null when it's too early to judge. */
export function projectedArrivalDay(state: GameState): number | null {
  const day = state.day ?? 0;
  const miles = state.location?.milesTraveled ?? 0;
  if (day < MIN_JUDGE_DAYS || miles < MIN_JUDGE_MILES) return null;
  return day * (TOTAL_TRAIL_MI / miles);
}

export function schedulePressure(
  state: GameState,
  targetArrivalDay: number | null
): SchedulePressure {
  if (targetArrivalDay === null) return 'ok';
  const proj = projectedArrivalDay(state);
  if (proj === null) return 'ok';
  if (proj <= targetArrivalDay) return 'ok';
  if (proj <= targetArrivalDay + CRITICAL_MARGIN) return 'behind';
  return 'critical';
}

/** Per-persona schedule temperament. See the design doc for the rationale. */
export const personaScheduleDoctrine: Record<PersonaId, ScheduleDoctrine> = {
  pace_pusher:   { targetArrivalDay: 165, sabbathSacred: false },
  aggressive:    { targetArrivalDay: 175, sabbathSacred: false },
  balanced:      { targetArrivalDay: 185, sabbathSacred: false },
  generous:      { targetArrivalDay: 190, sabbathSacred: false },
  cautious:      { targetArrivalDay: 190, sabbathSacred: false },
  sunday_rester: { targetArrivalDay: 195, sabbathSacred: true },
  faithful:      { targetArrivalDay: 195, sabbathSacred: true },
  hoarder:       { targetArrivalDay: 205, sabbathSacred: false },
  drinker:       { targetArrivalDay: 205, sabbathSacred: false },
  chaos:         { targetArrivalDay: null, sabbathSacred: false }
};

export function doctrineFor(id: PersonaId): ScheduleDoctrine {
  return personaScheduleDoctrine[id] ?? personaScheduleDoctrine.balanced;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/schedule-pressure.test.ts`
Expected: PASS (all cases). If `PersonaId` is not exactly this 10-member union, fix the doctrine map to match the real `PersonaId` (it is defined in `src/lib/game/ai/types.ts` around line 27).

- [ ] **Step 5: Point personas.ts at the shared constant**

In `src/lib/game/ai/personas.ts`, replace the private declaration (around line 61):
```ts
const TOTAL_TRAIL_MI = 2195;
```
with an import (add to the existing `./schedule` or `./foresight` import group near the top of the file):
```ts
import { TOTAL_TRAIL_MI } from './schedule';
```
Verify no other `const TOTAL_TRAIL_MI` remains: `grep -n "TOTAL_TRAIL_MI" src/lib/game/ai/personas.ts` should show only usages, no declaration.

- [ ] **Step 6: Run check + full test**

Run: `npm run check && npx vitest run tests/schedule-pressure.test.ts`
Expected: check 0 errors; tests pass. (`personas.ts` now imports the constant.)

- [ ] **Step 7: Commit**

```bash
jj describe -m "feat(ai): schedule-pressure signal + per-persona doctrine (#1235)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Discretionary-camp suppression helper

**Files:**
- Modify: `src/lib/game/ai/schedule.ts`
- Modify: `tests/schedule-pressure.test.ts`

The helper decides whether schedule pressure should *suppress* a discretionary
camp action. Critical floors always override (never suppressed): water below
`CRITICAL_WATER_RATIO`, food below `STARVATION_FLOOR`. `behind` and `critical`
suppress identically (the tier split is retained in the signal for telemetry /
future use, but the suppression rule treats any non-`ok` pressure the same — keeps
the tuning surface small).

- [ ] **Step 1: Write the failing test** (append to `tests/schedule-pressure.test.ts`)

```ts
import { suppressCamp, allowsSabbathRest } from '../src/lib/game/ai/schedule';

describe('suppressCamp', () => {
  // helper: a state that projects to ~210 (critical) for a target-185 persona
  const behindState = stateAt(100, (TOTAL_TRAIL_MI * 100) / 210);
  const onTimeState = stateAt(100, TOTAL_TRAIL_MI * 0.67); // projects ~150, ok

  it('does not suppress when on schedule', () => {
    expect(suppressCamp(onTimeState, 'balanced', 'hunt', { foodOnHand: 100 })).toBe(false);
    expect(suppressCamp(onTimeState, 'balanced', 'pan')).toBe(false);
  });
  it('suppresses discretionary hunt/pan when behind', () => {
    expect(suppressCamp(behindState, 'balanced', 'hunt', { foodOnHand: 100 })).toBe(true);
    expect(suppressCamp(behindState, 'balanced', 'pan')).toBe(true);
  });
  it('never suppresses hunt when near starvation (critical override)', () => {
    expect(suppressCamp(behindState, 'balanced', 'hunt', { foodOnHand: 20 })).toBe(false);
  });
  it('suppresses opportunistic find-water but never a near-empty keg', () => {
    expect(suppressCamp(behindState, 'balanced', 'findWater', { waterRatio: 0.5 })).toBe(true);
    expect(suppressCamp(behindState, 'balanced', 'findWater', { waterRatio: 0.1 })).toBe(false);
  });
  it('never suppresses for chaos (ignores the clock)', () => {
    expect(suppressCamp(behindState, 'chaos', 'hunt', { foodOnHand: 100 })).toBe(false);
  });
});

describe('allowsSabbathRest', () => {
  const behindState = stateAt(100, (TOTAL_TRAIL_MI * 100) / 210);
  const onTimeState = stateAt(100, TOTAL_TRAIL_MI * 0.67);
  it('allows Sabbath when on schedule for everyone', () => {
    expect(allowsSabbathRest(onTimeState, 'balanced')).toBe(true);
  });
  it('cuts Sabbath for non-sacred personas when behind', () => {
    expect(allowsSabbathRest(behindState, 'balanced')).toBe(false);
  });
  it('keeps Sabbath sacred for faithful + sunday_rester even when behind', () => {
    expect(allowsSabbathRest(behindState, 'faithful')).toBe(true);
    expect(allowsSabbathRest(behindState, 'sunday_rester')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/schedule-pressure.test.ts`
Expected: FAIL — `suppressCamp` / `allowsSabbathRest` not exported.

- [ ] **Step 3: Add the helpers to `schedule.ts`**

```ts
/** Keg ratio at/under which find-water is a survival need, never suppressed. */
const CRITICAL_WATER_RATIO = 0.25;
/** Food (lbs) at/under which hunting is a survival need, never suppressed. */
const STARVATION_FLOOR = 30;

export type DiscretionaryCamp = 'hunt' | 'pan' | 'findWater';

/** True = schedule pressure should veto this discretionary camp action now.
 *  Critical floors (near-empty keg, near-starvation) always return false. */
export function suppressCamp(
  state: GameState,
  personaId: PersonaId,
  kind: DiscretionaryCamp,
  opts: { waterRatio?: number; foodOnHand?: number } = {}
): boolean {
  const doctrine = doctrineFor(personaId);
  const pressure = schedulePressure(state, doctrine.targetArrivalDay);
  if (pressure === 'ok') return false;
  switch (kind) {
    case 'hunt':
      // Near-starvation overrides — go hunt regardless of the clock.
      return (opts.foodOnHand ?? Infinity) > STARVATION_FLOOR;
    case 'findWater':
      // A near-empty keg overrides — finding water beats the schedule.
      return (opts.waterRatio ?? 1) >= CRITICAL_WATER_RATIO;
    case 'pan':
      return true; // pure opportunism; always cut when behind
  }
}

/** Sunday-rest gate. Sacred personas always rest; others skip it when behind. */
export function allowsSabbathRest(state: GameState, personaId: PersonaId): boolean {
  const doctrine = doctrineFor(personaId);
  if (doctrine.sabbathSacred) return true;
  return schedulePressure(state, doctrine.targetArrivalDay) === 'ok';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/schedule-pressure.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
jj describe -m "feat(ai): suppressCamp + allowsSabbathRest gate helpers (#1235)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Gate the rest predicate (Sabbath + voluntary rest)

**Files:**
- Modify: `src/lib/game/ai/personas.ts` (balanced `shouldRest`; drop `sunday_rester`/`faithful` `shouldRest` overrides)
- Test: `tests/schedule-gate-rest.test.ts` (create)

Rationale: `balanced.shouldRest` is the shared base (sunday_rester/faithful spread it). Rewrite its Sunday branch to use `allowsSabbathRest` (so non-sacred personas skip Sunday when behind, sacred keep it), and gate the **voluntary morale** branch behind schedule pressure. Crisis branches (HP floor, `oxenWornOut`) stay unconditional. Then **delete** the now-redundant `shouldRest` overrides on `sunday_rester` and `faithful` — `allowsSabbathRest` reads their own `persona.id`, so the base handles their sacred Sunday correctly.

- [ ] **Step 1: Write the failing test**

```ts
// tests/schedule-gate-rest.test.ts
import { describe, it, expect } from 'vitest';
import { balancedPersona, faithfulPersona } from '../src/lib/game/ai/personas';
import { TOTAL_TRAIL_MI } from '../src/lib/game/ai/schedule';
import type { GameState } from '../src/lib/game/types';

// A Sunday, healthy party, far behind schedule (projects ~210).
function behindSunday(): GameState {
  return {
    day: 100,
    date: { year: 1849, month: 7, day: 8 }, // 1849-07-08 is a Sunday
    location: { milesTraveled: (TOTAL_TRAIL_MI * 100) / 210 },
    morale: 80,
    party: [{ hp: 90, alive: true }],
    oxen: [{ fatigue: 10, alive: true }, { fatigue: 10, alive: true }]
  } as unknown as GameState;
}

describe('shouldRest schedule gate', () => {
  it('balanced (non-sacred) skips Sunday rest when behind + healthy', () => {
    expect(balancedPersona.shouldRest(behindSunday(), {} as any)).toBe(false);
  });
  it('faithful keeps Sunday rest sacred even when behind', () => {
    expect(faithfulPersona.shouldRest(behindSunday(), {} as any)).toBe(true);
  });
});
```

NOTE: confirm 1849-07-08 maps to Sunday under the game's `isSunday(state.date)` — if the game uses a fixed weekday convention, pick a date the existing `isSunday` treats as Sunday (check `src/lib/game/ai/personas.ts` `isSunday` import / impl). Adjust the `date` in the fixture to a real Sunday for the engine. Also confirm the party/oxen shapes match what `minPartyHealth`/`oxenWornOut` read (see `personas.ts`); tweak the stub fields so a healthy non-crisis party is represented (no rest from HP/oxen).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/schedule-gate-rest.test.ts`
Expected: FAIL — balanced currently returns `true` on Sunday unconditionally.

- [ ] **Step 3: Edit `balanced.shouldRest`**

Add the import (with the other `./schedule` imports):
```ts
import { suppressCamp, allowsSabbathRest } from './schedule';
```
Replace the body of `balancedPersona.shouldRest` (currently around lines 785-806) with:
```ts
  shouldRest(state) {
    // #1235 — Sabbath is gated by schedule pressure: non-sacred personas
    // skip Sunday rest when behind; faithful/sunday_rester keep it sacred
    // (allowsSabbathRest reads persona.id).
    if (isSunday(state.date)) return allowsSabbathRest(state, this.id);
    // Crisis rest — always allowed (critical override).
    const hpFloor = hasLiveDoctor(state) ? 15 : 25;
    if (minPartyHealth(state) < hpFloor || oxenWornOut(state)) return true;
    // Voluntary morale rest — discretionary; suppressed when behind.
    if (state.morale < 10 && !suppressCamp(state, this.id, 'pan')) return true;
    return false;
  },
```
(Reusing the `'pan'`-kind suppression for voluntary rest is intentional: it is the
"pure discretionary, suppress whenever behind" rule — no criticality floor. The
crisis HP/oxen branch above is the rest-specific critical override.)

- [ ] **Step 4: Delete the redundant overrides**

In `sundayResterPersona` (around line 1330) remove the `shouldRest(state, rng) {...}` property entirely (keep `id` and `bundleWeights`). In `faithfulPersona` (around line 1558) remove its `shouldRest(state, rng) {...}` property (keep the other overrides). Both now inherit `balanced.shouldRest`, which honors their sacred Sunday via `this.id`.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/schedule-gate-rest.test.ts`
Expected: PASS (balanced skips, faithful keeps).

- [ ] **Step 6: Run full check + test**

Run: `npm run check && npm test`
Expected: check 0 errors. Some existing persona/sweep tests may assert old Sunday-rest behavior — if a test now fails because it expected unconditional Sunday rest under a behind-schedule fixture, update it to the new gated behavior (the fixture is the thing that changed meaning). Do NOT weaken the gate to satisfy a stale fixture; fix the fixture's expectation. If a failure is NOT schedule-related, stop and investigate.

- [ ] **Step 7: Commit**

```bash
jj describe -m "feat(ai): schedule-gate the rest predicate; Sabbath sacred for the devout (#1235)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Gate the hunt predicate across personas

**Files:**
- Modify: `src/lib/game/ai/personas.ts` (every `shouldHunt` impl: cautious, balanced, aggressive, chaos)
- Test: `tests/schedule-gate-hunt.test.ts` (create)

Each `shouldHunt` gets a one-line guard at the top. Note: `chaos` will no-op the
guard because its doctrine target is null (suppressCamp returns false), preserving
chaos's clock-blindness automatically.

- [ ] **Step 1: Write the failing test**

```ts
// tests/schedule-gate-hunt.test.ts
import { describe, it, expect } from 'vitest';
import { balancedPersona } from '../src/lib/game/ai/personas';
import { TOTAL_TRAIL_MI } from '../src/lib/game/ai/schedule';
import type { GameState } from '../src/lib/game/types';

// Behind schedule, food low enough that on-time balanced WOULD hunt
// (threshold 140), but well above the starvation floor (30), with a rifle+ammo.
function behindHuntable(food: number): GameState {
  return {
    day: 100,
    date: { year: 1849, month: 7, day: 10 },
    location: { milesTraveled: (TOTAL_TRAIL_MI * 100) / 210 },
    inventory: { flour: food, rifle: 1, gunpowder: 50, lead_balls: 50 },
    party: [{ hp: 90, alive: true, profession: 'farmer' }]
  } as unknown as GameState;
}

describe('shouldHunt schedule gate', () => {
  it('balanced skips a discretionary hunt when behind', () => {
    expect(balancedPersona.shouldHunt(behindHuntable(100), {} as any)).toBe(false);
  });
  it('balanced still hunts when near starvation even if behind', () => {
    expect(balancedPersona.shouldHunt(behindHuntable(20), {} as any)).toBe(true);
  });
});
```

NOTE: `canHunt(state)` / `foodOnHand(state)` decide the existing trigger — match the
stub `inventory` to whatever `canHunt` requires (rifle + ammo) and what `foodOnHand`
sums (check `personas.ts` lines ~281, ~510). Adjust fixture fields so `canHunt`
returns true and `foodOnHand` returns the intended value (100 vs 20).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/schedule-gate-hunt.test.ts`
Expected: FAIL — balanced hunts at food=100 when behind (no gate yet).

- [ ] **Step 3: Add the guard to each `shouldHunt`**

At the top of each `shouldHunt(state)` body (cautious ~615, balanced ~808, aggressive ~1026, chaos ~1192), insert:
```ts
    if (suppressCamp(state, this.id, 'hunt', { foodOnHand: foodOnHand(state) })) return false;
```
…before the existing `return canHunt(state) && foodOnHand(state) < threshold;` line. (`suppressCamp` is already imported from Task 3. `foodOnHand` is already in scope in personas.ts.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/schedule-gate-hunt.test.ts`
Expected: PASS.

- [ ] **Step 5: Run full check + test**

Run: `npm run check && npm test`
Expected: check 0 errors; tests pass (fix any stale hunt fixtures the same way as Task 3 — update expectations, don't weaken the gate).

- [ ] **Step 6: Commit**

```bash
jj describe -m "feat(ai): schedule-gate the hunt predicate (starvation override) (#1235)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Gate the find-water predicate across personas

**Files:**
- Modify: `src/lib/game/ai/personas.ts` (every `shouldFindWater` impl: cautious ~645, balanced ~845, aggressive ~1047, chaos ~1211)
- Test: `tests/schedule-gate-water.test.ts` (create)

- [ ] **Step 1: Write the failing test**

```ts
// tests/schedule-gate-water.test.ts
import { describe, it, expect } from 'vitest';
import { balancedPersona } from '../src/lib/game/ai/personas';
import { TOTAL_TRAIL_MI } from '../src/lib/game/ai/schedule';
import type { GameState } from '../src/lib/game/types';

// Behind schedule; keg ratio set via resources.water / waterCap.
function behindWater(water: number, cap: number): GameState {
  return {
    day: 100,
    date: { year: 1849, month: 7, day: 10 },
    location: { milesTraveled: (TOTAL_TRAIL_MI * 100) / 210, terrain: 'prairie' },
    resources: { water, waterCap: cap }
  } as unknown as GameState;
}

describe('shouldFindWater schedule gate', () => {
  it('skips an opportunistic top-up when behind (ratio 0.5)', () => {
    expect(balancedPersona.shouldFindWater(behindWater(10, 20), {} as any)).toBe(false);
  });
  it('still finds water on a near-empty keg even when behind (ratio 0.1)', () => {
    expect(balancedPersona.shouldFindWater(behindWater(2, 20), {} as any)).toBe(true);
  });
});
```

NOTE: confirm how `waterRatio(state)` reads the keg (resources.water / waterCap — see `personas.ts` ~289) and that `desertWaterFloor(state, lo, hi)` for non-desert terrain returns the `lo` bound. Make the ratio-0.1 fixture fall below the critical 0.25 floor so the existing trigger fires AND the gate's critical override allows it. Pick a non-desert terrain so `desertWaterFloor` returns the low bound.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/schedule-gate-water.test.ts`
Expected: FAIL at ratio 0.5 (balanced's floor is below 0.5 so it already returns false there) — **adjust the fixture** so the "opportunistic" case is one the *current* predicate would say true to (ratio just under balanced's 0.10-0.20 floor is the trigger; the opportunistic band that schedule should now cut is ratio in [0.25, floor)). Re-read: balanced triggers at `ratio < 0.10` (non-desert low bound). So "opportunistic" findWater for balanced is a narrow band. Set the test to a persona/terrain whose floor sits in [0.25, 0.6) — OR assert via `suppressCamp` directly for the band and keep the persona test focused on the critical override. Concretely: test that at ratio 0.05 (below floor, behind) it STILL returns true (critical override), and unit-test the opportunistic suppression at the `suppressCamp` level (already covered in Task 2). This keeps the persona test meaningful given balanced's low floor.

Revised assertions:
```ts
  it('still finds water on a near-empty keg when behind (critical override)', () => {
    expect(balancedPersona.shouldFindWater(behindWater(1, 20), {} as any)).toBe(true); // ratio .05 < .10 floor
  });
```
(The opportunistic-suppression path is exercised by Task 2's `suppressCamp` 'findWater' test; the persona test guards the critical override.)

- [ ] **Step 3: Add the guard to each `shouldFindWater`**

At the top of each `shouldFindWater(state)` body, insert:
```ts
    const _r = waterRatio(state);
    if (suppressCamp(state, this.id, 'findWater', { waterRatio: _r })) return false;
```
…before the existing `return waterRatio(state) < desertWaterFloor(...)` line (you may reuse `_r` in the return to avoid a double call). `waterRatio` is already in scope.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/schedule-gate-water.test.ts`
Expected: PASS (critical override returns true at ratio .05 when behind).

- [ ] **Step 5: Run full check + test**

Run: `npm run check && npm test`
Expected: check 0 errors; tests pass (fix stale water fixtures by updating expectations).

- [ ] **Step 6: Commit**

```bash
jj describe -m "feat(ai): schedule-gate find-water (near-empty keg override) (#1235)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Gate the pan predicate

**Files:**
- Modify: `src/lib/game/ai/personas.ts` (`shouldPan` impls that can return true — balanced ~860 returns `canPanForGold`; aggressive/chaos may also; cautious already returns false)
- Test: extend `tests/schedule-gate-hunt.test.ts` or add `tests/schedule-gate-pan.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/schedule-gate-pan.test.ts
import { describe, it, expect } from 'vitest';
import { balancedPersona } from '../src/lib/game/ai/personas';
import { TOTAL_TRAIL_MI } from '../src/lib/game/ai/schedule';
import type { GameState } from '../src/lib/game/types';

// Behind schedule, in gold country where canPanForGold would otherwise allow it.
function behindGold(): GameState {
  return {
    day: 120,
    date: { year: 1850, month: 8, day: 2 },
    location: { milesTraveled: (TOTAL_TRAIL_MI * 120) / 220, terrain: 'river' },
    flags: {}
  } as unknown as GameState;
}

describe('shouldPan schedule gate', () => {
  it('skips panning when behind', () => {
    expect(balancedPersona.shouldPan(behindGold(), {} as any)).toBe(false);
  });
});
```

NOTE: set `location.milesTraveled` ≥ 700 and terrain/year so `canPanForGold` would
return true on time; confirm the fixture projects to a behind state for balanced
(target 185). Read `canPanForGold` (~236) for its exact gates and match them.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/schedule-gate-pan.test.ts`
Expected: FAIL — balanced pans when `canPanForGold` is true and not yet gated.

- [ ] **Step 3: Add the guard to each non-trivial `shouldPan`**

At the top of each `shouldPan(state)` that can return true, insert:
```ts
    if (suppressCamp(state, this.id, 'pan')) return false;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/schedule-gate-pan.test.ts`
Expected: PASS.

- [ ] **Step 5: Run full check + test**

Run: `npm run check && npm test`
Expected: check 0 errors; all tests pass.

- [ ] **Step 6: Commit**

```bash
jj describe -m "feat(ai): schedule-gate gold-panning (#1235)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Verify, sweep gate, tune

**Files:** none (validation) unless tuning is needed.

- [ ] **Step 1: Full verify**

Run: `npm run verify`
Expected: svelte-check 0/0; all vitest pass.

- [ ] **Step 2: BEFORE baseline sweep (master tip, no gate)**

The honest stock-limited baseline already exists from the #1235 diagnostic, but re-run a clean tagged baseline on the workspace's PARENT (master) for an apples-to-apples compare. From the workspace:
```bash
npx tsx scripts/persona-profession-sweep.ts --runs 2 --tag before-1235 > /tmp/sweep-before-1235.log 2>&1
```
Record per-shape Arrived/Wiped/Stalled. (This is the pre-gate state because the working copy is committed; to be exact, run it once before Task 1 lands or stash via `jj` — simplest: trust the diagnostic numbers 3/0 ≈ 17/19/65 stall-heavy as the BEFORE, and treat this run as a sanity echo.)

- [ ] **Step 3: AFTER sweep (gate active)**

```bash
npx tsx scripts/persona-profession-sweep.ts --runs 2 --tag after-1235 > /tmp/sweep-after-1235.log 2>&1
```

- [ ] **Step 4: Compare against the gate criteria**

PASS criteria (from the spec):
- **Stall% drops and Arrived% rises** across the stall-heavy shapes (3/0, 2/2 especially).
- **Wiped% does NOT spike** — pushing on must not cause mass death. A few points is fine; a jump of >~5–8pp on any shape means the gate pushes parties past their water/health margin → too aggressive.
- **Persona spread preserved** — pace_pusher/aggressive show the biggest Arrived gains; faithful/sunday_rester still lag (Sabbath tax); chaos roughly unchanged (clock-blind).

- [ ] **Step 5: Tune if needed**

If wiped% spikes: relax by raising `CRITICAL_WATER_RATIO` (e.g. 0.25 → 0.30) and/or `STARVATION_FLOOR` (30 → 45) in `schedule.ts` so the critical overrides kick in sooner, then re-run Step 3. If stall% barely moves: the targets may be too lax — lower the mid-pack `targetArrivalDay`s (balanced 185 → 180, etc.) and re-run. Re-run `npm run verify` after any change. Record the final numbers.

- [ ] **Step 6: Commit any tuning + final sweep numbers**

```bash
jj describe -m "test(ai): schedule-pressure sweep gate — <summary of before/after> (#1235)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-review notes (author)

- **Spec coverage:** signal (T1), doctrine (T1), suppression helper + criticality + Sabbath (T2), gate wiring rest/hunt/water/pan (T3–T6), NPC parity (free — shared predicates, no edits), human UI untouched (no runner/route edits), sweep gate (T7). Dehydration (#1245) and in-company rest (#927) explicitly out of scope. ✓
- **`this.id` safety:** personas are `{...balancedPersona, id, overrides}`; spread methods retain the calling object's `this`, so `this.id` is correct in every predicate. The only delegating `shouldRest` overrides (sunday_rester/faithful) are DELETED in T3, removing the one `this`-loss path. ✓
- **NPC faux-state safety:** `projectedArrivalDay` returns null (→ pressure 'ok', no gating) when `state.day`/`milesTraveled` are missing or below thresholds, so an NPC faux state lacking those fields safely no-ops the gate rather than misfiring. ✓
- **Type consistency:** `ScheduleDoctrine`, `SchedulePressure`, `DiscretionaryCamp`, `suppressCamp`, `allowsSabbathRest`, `doctrineFor`, `personaScheduleDoctrine`, `projectedArrivalDay`, `schedulePressure`, `TOTAL_TRAIL_MI` — names used identically across tasks. ✓
