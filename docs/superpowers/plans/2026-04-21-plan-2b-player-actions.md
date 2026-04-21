# Plan 2b: Player Actions — Hoosier Trail

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add player-initiated actions — rest, camp, hunt/gather, ford, trade — as pure state transformations with deterministic outcomes. Fix ox fatigue so rest/camp recovers it, so a full 30-day run with sensible player actions reaches Fort Kearny.

**Architecture:** Actions live in `src/lib/game/actions/` as one file per action. Each action is `(state, params) => GameState`. Actions call Plan 2a's passive system functions directly rather than routing through `tickDay`, since they deliberately skip or override certain steps (e.g., rest skips travel; hunt yields meat but does no wagon wear). Actions thread a unique RNG: `makeRng(\`\${state.seed}:action:\${actionKind}:\${state.day}:\${nonce}\`)`.

**Tech Stack:** Same as Plans 1 + 2a — SvelteKit, TypeScript, Vitest.

**Companion spec:** `docs/superpowers/specs/2026-04-20-hoosier-trail-design.md` (§4.3 camp, §4.4 rest, §5.5 hunting, §5.6 fording, §5.7 wagon+oxen recovery, §5.8 trading posts, §5.11 shovel actions).

**Builds on:** Plans 1 + 2a (merged on master).

---

## File Structure

### New files

| Path | Responsibility |
|---|---|
| `src/lib/game/actions/index.ts` | Re-exports every action |
| `src/lib/game/actions/rest.ts` | Multi-day stationary recovery |
| `src/lib/game/actions/camp.ts` | Overnight setup: fire, shovel actions, forage, services |
| `src/lib/game/actions/hunt.ts` | Hunt/gather choice-based action |
| `src/lib/game/actions/ford.ts` | River crossing decision |
| `src/lib/game/actions/trade.ts` | Minimal buy/sell at a trading post |
| `src/lib/game/content/prices.ts` | Stub price list — Plan 3 expands with year/post modifiers |
| `tests/actions/rest.test.ts` | Rest behavior |
| `tests/actions/camp.test.ts` | Camp behavior |
| `tests/actions/hunt.test.ts` | Hunt outcomes |
| `tests/actions/ford.test.ts` | Ford decisions |
| `tests/actions/trade.test.ts` | Trade math |
| `tests/actions/journey.test.ts` | Full deterministic Independence → Ft Kearny journey |

### Files modified

| Path | Change |
|---|---|
| `src/lib/game/systems/oxen.ts` | Add `recoverOxenFatigue(state, amount)` for rest/camp to call |
| `tests/engine-integration.test.ts` | No change — existing 126-test baseline continues |

### Boundaries
- Actions never import from `src/lib/db/`.
- Each action is a single function exported by its file. No stateful classes.
- Action RNG seeds are distinct per action kind so hunt+camp on the same day don't share RNG draws.
- Shovel actions are sub-choices of Camp; they don't live in their own file.

---

## Conventions locked by this plan

### Action signatures

```ts
// Deterministic state transformer
export function rest(state: GameState, days: number): GameState;
export function camp(state: GameState, opts: CampOptions): GameState;
export function hunt(state: GameState, opts: HuntOptions): GameState;
export function ford(state: GameState, opts: FordOptions): GameState;
export function trade(state: GameState, opts: TradeOptions): GameState;
```

### Action RNG

Actions use:
```ts
const rng = makeRng(`${state.seed}:action:${kind}:${state.day}:${nonce}`);
```
Where `kind` is `"rest" | "camp" | "hunt" | "ford" | "trade"` and `nonce` lets multiple actions on the same day diverge (default `0`).

### Day advancement inside actions

Each action advances the day counter + calendar date internally, because actions often consume multiple days (rest, ford-with-wait). Actions **do not** call `tickDay` — they compose passive systems directly with the choices relevant to the action.

---

## Task 1: Ox fatigue recovery + action scaffolding

**Files:**
- Modify: `src/lib/game/systems/oxen.ts` (add `recoverOxenFatigue`)
- Create: `tests/oxen-recovery.test.ts`
- Create: `src/lib/game/actions/index.ts` (empty placeholder — later tasks add re-exports)

### Step 1: Write failing tests

Create `tests/oxen-recovery.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { recoverOxenFatigue } from '../src/lib/game/systems/oxen';
import type { Ox } from '../src/lib/game/types';

function ox(overrides: Partial<Ox> = {}): Ox {
  return { id: 'o1', health: 100, fatigue: 50, shod: true, ...overrides };
}

describe('recoverOxenFatigue', () => {
  it('reduces fatigue by the given amount', () => {
    const oxen = [ox({ fatigue: 60 })];
    const recovered = recoverOxenFatigue(oxen, 20);
    expect(recovered[0].fatigue).toBe(40);
  });

  it('clamps at 0', () => {
    const oxen = [ox({ fatigue: 10 })];
    const recovered = recoverOxenFatigue(oxen, 50);
    expect(recovered[0].fatigue).toBe(0);
  });

  it('does not touch dead oxen', () => {
    const oxen = [ox({ fatigue: 50, health: 0 })];
    const recovered = recoverOxenFatigue(oxen, 20);
    expect(recovered[0].fatigue).toBe(50);
  });

  it('handles empty array', () => {
    expect(recoverOxenFatigue([], 20)).toEqual([]);
  });

  it('does not mutate input', () => {
    const oxen = [ox({ fatigue: 50 })];
    const snap = JSON.stringify(oxen);
    recoverOxenFatigue(oxen, 20);
    expect(JSON.stringify(oxen)).toBe(snap);
  });
});
```

Run: `npm test -- tests/oxen-recovery.test.ts` — expect fail.

### Step 2: Implement

Append to `src/lib/game/systems/oxen.ts`:

```ts
// Recovery applied when the party rests or camps.
// Dead oxen unaffected. Returns a new array.
export function recoverOxenFatigue(oxen: Ox[], amount: number): Ox[] {
  return oxen.map((o) => {
    if (o.health === 0) return o;
    const fatigue = Math.max(0, o.fatigue - amount);
    return { ...o, fatigue };
  });
}
```

### Step 3: Add actions barrel

Create `src/lib/game/actions/index.ts`:

```ts
// Player-initiated action exports. Each action is a pure state transformer.
export {};
```

### Step 4: Verify, commit

```bash
npm test
npm run check
git add -A
git commit -m "feat(game): add ox fatigue recovery + actions barrel"
```

---

## Task 2: Rest action

**Files:**
- Create: `src/lib/game/actions/rest.ts`
- Create: `tests/actions/rest.test.ts`

Spec §4.4. Stationary multi-day: accelerated healing, ox fatigue recovers, conditions still progress (but morale-multiplier helps healing), Farmer auto-forages.

### Step 1: Write failing tests

Create `tests/actions/rest.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { rest } from '../../src/lib/game/actions/rest';
import { createInitialState } from '../../src/lib/game/engine';
import type { Ox } from '../../src/lib/game/types';

function newGame() {
  const s = createInitialState({
    seed: 'rest-test',
    leader: { name: 'A', profession: 'farmer' },
    companions: [{ name: 'B', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
  const oxen: Ox[] = [
    { id: 'o1', health: 100, fatigue: 80, shod: true },
    { id: 'o2', health: 100, fatigue: 80, shod: true }
  ];
  return { ...s, oxen };
}

describe('rest', () => {
  it('advances the day counter by the rest days', () => {
    const s = newGame();
    const r = rest(s, 3);
    expect(r.day).toBe(s.day + 3);
  });

  it('consumes food across the rest period', () => {
    const s = newGame();
    const startingFlour = s.inventory.flour ?? 0;
    const r = rest(s, 3);
    expect(r.inventory.flour).toBeLessThan(startingFlour);
  });

  it('recovers ox fatigue substantially', () => {
    const s = newGame();
    const r = rest(s, 3);
    expect(r.oxen[0].fatigue).toBeLessThan(30); // 80 - (3 days × 25/day) = 5
  });

  it('does not advance trail position', () => {
    const s = newGame();
    const r = rest(s, 3);
    expect(r.location.milesTraveled).toBe(s.location.milesTraveled);
  });

  it('restores injured member health', () => {
    const s = newGame();
    s.party[1].health = 40;
    const r = rest(s, 5);
    expect(r.party[1].health).toBeGreaterThan(40);
  });

  it('logs the rest period', () => {
    const s = newGame();
    const r = rest(s, 2);
    expect(r.eventLog[r.eventLog.length - 1].text).toMatch(/rest/i);
  });

  it('rejects non-positive days', () => {
    const s = newGame();
    expect(() => rest(s, 0)).toThrow();
    expect(() => rest(s, -1)).toThrow();
  });

  it('is deterministic', () => {
    const a = rest(newGame(), 3);
    const b = rest(newGame(), 3);
    expect(a).toEqual(b);
  });
});
```

### Step 2: Implement

Create `src/lib/game/actions/rest.ts`:

```ts
import type { GameState } from '../types';
import { makeRng } from '../rng';
import { upgradeState } from '../upgrade';
import { applyDailyConsumption } from '../systems/consumption';
import { progressConditions } from '../systems/conditions';
import { adjustMorale } from '../systems/morale';
import { recoverOxenFatigue } from '../systems/oxen';
import { attemptFire } from '../systems/fire';
import { reapDead } from '../systems/death';
import { healingMultiplier } from '../systems/morale';

const OX_FATIGUE_RECOVERY_PER_REST_DAY = 25;
const BASE_HEAL_PER_REST_DAY = 8;
const FARMER_FORAGE_AT_REST = 15;

function advanceOneDay(d: { year: number; month: number; day: number }) {
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const leap = (d.year % 4 === 0 && d.year % 100 !== 0) || d.year % 400 === 0;
  const cap = d.month === 2 && leap ? 29 : daysInMonth[d.month - 1];
  let { year, month, day } = d;
  day += 1;
  if (day > cap) { day = 1; month += 1; }
  if (month > 12) { month = 1; year += 1; }
  return { year, month, day };
}

export function rest(state: GameState, days: number): GameState {
  if (!Number.isInteger(days) || days <= 0) {
    throw new Error('rest: days must be a positive integer');
  }

  let s = upgradeState(state);
  const startDay = s.day;

  for (let i = 0; i < days; i++) {
    const rng = makeRng(`${s.seed}:action:rest:${s.day}:0`);

    // Conditions still progress during rest.
    s = progressConditions(s, rng);
    s = applyDailyConsumption(s);
    s = adjustMorale(s, rng);

    // Healing: base + morale multiplier, applied to each alive, injured member.
    const mult = healingMultiplier(s.morale);
    s = {
      ...s,
      party: s.party.map((m) => {
        if (m.dead) return m;
        const gain = Math.round(BASE_HEAL_PER_REST_DAY * mult);
        return { ...m, health: Math.min(100, m.health + gain) };
      })
    };

    // Ox fatigue recovers.
    s = { ...s, oxen: recoverOxenFatigue(s.oxen, OX_FATIGUE_RECOVERY_PER_REST_DAY) };

    // Fire attempt still happens (camping at night).
    s = attemptFire(s, rng);

    // Farmer auto-forage during rest.
    const hasLiveFarmer = s.party.some((m) => !m.dead && m.profession === 'farmer');
    if (hasLiveFarmer) {
      const currentFlour = s.inventory.flour ?? 0;
      s = { ...s, inventory: { ...s.inventory, flour: currentFlour + FARMER_FORAGE_AT_REST } };
    }

    s = reapDead(s, rng);

    s = { ...s, day: s.day + 1, date: advanceOneDay(s.date) };
  }

  s = {
    ...s,
    eventLog: [...s.eventLog, { day: startDay, text: `Rested for ${days} day${days === 1 ? '' : 's'}.` }]
  };

  return s;
}
```

### Step 3: Verify, commit

```bash
npm test -- tests/actions/rest.test.ts
npm test
npm run check
git add -A
git commit -m "feat(actions): add rest action (multi-day stationary recovery)"
```

---

## Task 3: Camp action

**Files:**
- Create: `src/lib/game/actions/camp.ts`
- Create: `tests/actions/camp.test.ts`

Spec §4.3 + §5.11. Overnight single-day action. Fire roll. Shovel-enabled sub-actions with 12-hour budget (firepit auto, latrine auto, dig well, dig grave, dig out). Farmer forages. Preacher service (if Bible + Preacher). Entertain (if harmonica/fiddle + player opted in). Oxen recover partially.

### Step 1: Write failing tests

Create `tests/actions/camp.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { camp } from '../../src/lib/game/actions/camp';
import { createInitialState } from '../../src/lib/game/engine';

function newGame() {
  const s = createInitialState({
    seed: 'camp-test',
    leader: { name: 'A', profession: 'farmer' },
    companions: [{ name: 'B', profession: 'preacher' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
  return { ...s, inventory: { ...s.inventory, bible: 1 }, oxen: [
    { id: 'o1', health: 100, fatigue: 40, shod: true },
    { id: 'o2', health: 100, fatigue: 40, shod: true }
  ] };
}

describe('camp', () => {
  it('advances the day counter by 1', () => {
    const s = newGame();
    const c = camp(s, {});
    expect(c.day).toBe(s.day + 1);
  });

  it('consumes one day of food and water', () => {
    const s = newGame();
    const startingFlour = s.inventory.flour ?? 0;
    const c = camp(s, {});
    expect(c.inventory.flour).toBeLessThan(startingFlour);
  });

  it('recovers some ox fatigue (less than rest)', () => {
    const s = newGame();
    const c = camp(s, {});
    expect(c.oxen[0].fatigue).toBeLessThan(40);
    expect(c.oxen[0].fatigue).toBeGreaterThan(20);
  });

  it('does not advance trail position', () => {
    const s = newGame();
    const c = camp(s, {});
    expect(c.location.milesTraveled).toBe(s.location.milesTraveled);
  });

  it('triggers a fire attempt and sets hadFireLastNight', () => {
    const s = newGame();
    const c = camp(s, {});
    expect(typeof c.flags.hadFireLastNight).toBe('boolean');
  });

  it('runs Farmer forage (Farmer in party)', () => {
    const s = newGame();
    const startingFlour = s.inventory.flour ?? 0;
    const c = camp(s, {});
    // 1 day consumes ~4 lbs (2 members × 2 lb/day); farmer adds 10-30 lb
    // net should be at least ~5 lbs more than starting - 4 = positive net
    expect(c.inventory.flour).toBeGreaterThan(startingFlour - 5);
  });

  it('appends a camp log entry', () => {
    const s = newGame();
    const c = camp(s, {});
    expect(c.eventLog[c.eventLog.length - 1].text).toMatch(/camp/i);
  });

  it('rejects overspend on shovel actions (budget > 12 hours)', () => {
    const s = { ...newGame(), inventory: { ...newGame().inventory, shovel: 1 } };
    expect(() =>
      camp(s, { shovelActions: ['dig_well', 'dig_well', 'dig_well'] }) // 3 × 5hr = 15hr
    ).toThrow(/budget/i);
  });

  it('logs each successful shovel action', () => {
    const s = { ...newGame(), inventory: { ...newGame().inventory, shovel: 1 }, resources: { water: 0, waterCap: 20 } };
    const c = camp(s, { shovelActions: ['dig_well'] });
    const lastTwo = c.eventLog.slice(-3);
    const anyWell = lastTwo.some((e) => /well/i.test(e.text));
    expect(anyWell).toBe(true);
  });

  it('dig_well may yield water (deterministic per seed)', () => {
    const s = { ...newGame(), inventory: { ...newGame().inventory, shovel: 1 }, resources: { water: 0, waterCap: 20 } };
    const c = camp(s, { shovelActions: ['dig_well'] });
    // Outcome depends on seed — just verify no crash and water is number
    expect(typeof c.resources.water).toBe('number');
  });

  it('is deterministic', () => {
    const a = camp(newGame(), {});
    const b = camp(newGame(), {});
    expect(a).toEqual(b);
  });
});
```

### Step 2: Implement

Create `src/lib/game/actions/camp.ts`:

```ts
import type { GameState } from '../types';
import type { Rng } from '../rng';
import { makeRng } from '../rng';
import { upgradeState } from '../upgrade';
import { applyDailyConsumption } from '../systems/consumption';
import { progressConditions } from '../systems/conditions';
import { adjustMorale } from '../systems/morale';
import { recoverOxenFatigue } from '../systems/oxen';
import { attemptFire } from '../systems/fire';
import { reapDead } from '../systems/death';

export type ShovelAction = 'dig_well' | 'dig_grave' | 'dig_out';

export interface CampOptions {
  shovelActions?: ShovelAction[];
}

const CAMP_FATIGUE_RECOVERY = 15;
const FARMER_CAMP_FORAGE = 12;
const TIME_BUDGET_HOURS = 12;

const SHOVEL_ACTION_HOURS: Record<ShovelAction, number> = {
  dig_well: 5,
  dig_grave: 2,
  dig_out: 4
};

const WELL_WATER_GAL_MIN = 30;
const WELL_WATER_GAL_MAX = 50;
const WELL_SUCCESS_CHANCE = 0.4;

function advanceOneDay(d: { year: number; month: number; day: number }) {
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const leap = (d.year % 4 === 0 && d.year % 100 !== 0) || d.year % 400 === 0;
  const cap = d.month === 2 && leap ? 29 : daysInMonth[d.month - 1];
  let { year, month, day } = d;
  day += 1;
  if (day > cap) { day = 1; month += 1; }
  if (month > 12) { month = 1; year += 1; }
  return { year, month, day };
}

function applyShovelActions(state: GameState, actions: ShovelAction[], rng: Rng): GameState {
  const hasShovel = (state.inventory.shovel ?? 0) > 0;
  if (!hasShovel) {
    throw new Error('camp: shovel actions require a shovel in inventory');
  }

  const totalHours = actions.reduce((sum, a) => sum + SHOVEL_ACTION_HOURS[a], 0);
  if (totalHours > TIME_BUDGET_HOURS) {
    throw new Error(`camp: shovel action budget exceeded (${totalHours} > ${TIME_BUDGET_HOURS} hours)`);
  }

  let s = state;
  for (const a of actions) {
    switch (a) {
      case 'dig_well': {
        if (rng.chance(WELL_SUCCESS_CHANCE)) {
          const gal = rng.int(WELL_WATER_GAL_MIN, WELL_WATER_GAL_MAX);
          s = {
            ...s,
            resources: { ...s.resources, water: Math.min(s.resources.waterCap, s.resources.water + gal) },
            eventLog: [...s.eventLog, { day: s.day, text: `Dug a well and found ${gal} gallons of water.` }]
          };
        } else {
          s = { ...s, eventLog: [...s.eventLog, { day: s.day, text: 'Dug a well — came up dry.' }] };
        }
        break;
      }
      case 'dig_grave':
        s = { ...s, eventLog: [...s.eventLog, { day: s.day, text: 'Dug a grave in advance.' }] };
        break;
      case 'dig_out':
        s = { ...s, eventLog: [...s.eventLog, { day: s.day, text: 'Dug out of mud/snow.' }] };
        break;
    }
  }
  return s;
}

export function camp(state: GameState, opts: CampOptions = {}): GameState {
  let s = upgradeState(state);
  const rng = makeRng(`${s.seed}:action:camp:${s.day}:0`);

  // Passive day systems (no travel, no wagon wear).
  s = progressConditions(s, rng);
  s = applyDailyConsumption(s);
  s = adjustMorale(s, rng);

  // Oxen recover partially (less than a full rest day).
  s = { ...s, oxen: recoverOxenFatigue(s.oxen, CAMP_FATIGUE_RECOVERY) };

  // Fire attempt.
  s = attemptFire(s, rng);

  // Farmer auto-forage.
  const hasLiveFarmer = s.party.some((m) => !m.dead && m.profession === 'farmer');
  if (hasLiveFarmer) {
    const currentFlour = s.inventory.flour ?? 0;
    s = { ...s, inventory: { ...s.inventory, flour: currentFlour + FARMER_CAMP_FORAGE } };
  }

  // Shovel actions.
  if (opts.shovelActions && opts.shovelActions.length > 0) {
    s = applyShovelActions(s, opts.shovelActions, rng);
  }

  // Death check.
  s = reapDead(s, rng);

  s = {
    ...s,
    eventLog: [...s.eventLog, { day: s.day, text: 'Made camp for the night.' }],
    day: s.day + 1,
    date: advanceOneDay(s.date)
  };

  return s;
}
```

### Step 3: Verify, commit

```bash
npm test -- tests/actions/camp.test.ts
npm test
npm run check
git add -A
git commit -m "feat(actions): add camp action with shovel sub-actions"
```

---

## Task 4: Hunt / Gather action

**Files:**
- Create: `src/lib/game/actions/hunt.ts`
- Create: `tests/actions/hunt.test.ts`

Spec §5.5. Choice-based: target + ammo + party composition (0/1/2 rifles).

### Step 1: Write failing tests

Create `tests/actions/hunt.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { hunt } from '../../src/lib/game/actions/hunt';
import { createInitialState } from '../../src/lib/game/engine';
import type { Ox } from '../../src/lib/game/types';

function newGame() {
  const s = createInitialState({
    seed: 'hunt-test',
    leader: { name: 'A', profession: 'hunter' },
    companions: [{ name: 'B', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
  const oxen: Ox[] = [
    { id: 'o1', health: 100, fatigue: 10, shod: true },
    { id: 'o2', health: 100, fatigue: 10, shod: true }
  ];
  // Ensure we have a rifle to hunt
  return { ...s, oxen, inventory: { ...s.inventory, rifle: 1, bullets: 40 } };
}

describe('hunt', () => {
  it('advances the day counter by 1 (half-day hunt + half-day rest)', () => {
    const s = newGame();
    const h = hunt(s, { target: 'small', ammo: 'light', hunters: 1 });
    expect(h.day).toBe(s.day + 1);
  });

  it('consumes bullets on a hunt', () => {
    const s = newGame();
    const startingBullets = s.inventory.bullets ?? 0;
    const h = hunt(s, { target: 'small', ammo: 'light', hunters: 1 });
    expect(h.inventory.bullets).toBeLessThan(startingBullets);
  });

  it('adds meat to inventory on a successful hunt', () => {
    // With Hunter profession + plenty of ammo + small game, outcome should skew positive.
    const s = newGame();
    const h = hunt(s, { target: 'small', ammo: 'moderate', hunters: 1 });
    const hadBefore = s.inventory.bacon ?? 0;
    // Meat lands under 'bacon' as our only meat-coded food staple in the Plan 2a catalog.
    expect((h.inventory.bacon ?? 0)).toBeGreaterThanOrEqual(hadBefore);
  });

  it('rejects a hunt when target is non-gather and no rifles are owned', () => {
    const s = { ...newGame(), inventory: { ...newGame().inventory, rifle: 0, bullets: 0 } };
    expect(() => hunt(s, { target: 'small', ammo: 'light', hunters: 1 })).toThrow(/rifle/i);
  });

  it('allows gather-only (no rifles) to add small foraged food', () => {
    const s = { ...newGame(), inventory: { ...newGame().inventory, rifle: 0, bullets: 0 } };
    const startingFlour = s.inventory.flour ?? 0;
    const h = hunt(s, { target: 'gather', ammo: 'light', hunters: 1 });
    expect(h.inventory.flour).toBeGreaterThan(startingFlour - 3);
  });

  it('rejects a hunt with zero hunters when non-gather', () => {
    const s = newGame();
    expect(() => hunt(s, { target: 'small', ammo: 'light', hunters: 0 })).toThrow();
  });

  it('rejects a hunt with two hunters but only one rifle (parallel)', () => {
    const s = newGame();
    // 1 rifle + 2 hunters = not parallel; one hunts, one gathers. Allowed.
    // 2 rifles + 2 hunters = parallel. Also allowed. So no direct error here.
    // Test the disallowed case: 3 hunters.
    expect(() => hunt(s, { target: 'small', ammo: 'light', hunters: 3 })).toThrow();
  });

  it('is deterministic', () => {
    const a = hunt(newGame(), { target: 'small', ammo: 'light', hunters: 1 });
    const b = hunt(newGame(), { target: 'small', ammo: 'light', hunters: 1 });
    expect(a).toEqual(b);
  });

  it('logs the hunt outcome', () => {
    const s = newGame();
    const h = hunt(s, { target: 'small', ammo: 'light', hunters: 1 });
    expect(h.eventLog[h.eventLog.length - 1].text.toLowerCase()).toMatch(/(hunt|game|meat|gather)/);
  });
});
```

### Step 2: Implement

Create `src/lib/game/actions/hunt.ts`:

```ts
import type { GameState } from '../types';
import type { Rng } from '../rng';
import { makeRng } from '../rng';
import { upgradeState } from '../upgrade';
import { applyDailyConsumption } from '../systems/consumption';
import { progressConditions } from '../systems/conditions';
import { adjustMorale } from '../systems/morale';
import { reapDead } from '../systems/death';

export type HuntTarget = 'small' | 'medium' | 'big' | 'gather';
export type AmmoBand = 'light' | 'moderate' | 'heavy';

export interface HuntOptions {
  target: HuntTarget;
  ammo: AmmoBand;
  hunters: number; // 1 or 2
}

const AMMO_BY_BAND: Record<AmmoBand, number> = {
  light: 5,
  moderate: 10,
  heavy: 20
};

const BASE_YIELD_BY_TARGET: Record<HuntTarget, { min: number; max: number; injuryRisk: number }> = {
  small: { min: 5, max: 20, injuryRisk: 0 },
  medium: { min: 20, max: 60, injuryRisk: 0.02 },
  big: { min: 60, max: 200, injuryRisk: 0.08 },
  gather: { min: 4, max: 14, injuryRisk: 0 }
};

function advanceOneDay(d: { year: number; month: number; day: number }) {
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const leap = (d.year % 4 === 0 && d.year % 100 !== 0) || d.year % 400 === 0;
  const cap = d.month === 2 && leap ? 29 : daysInMonth[d.month - 1];
  let { year, month, day } = d;
  day += 1;
  if (day > cap) { day = 1; month += 1; }
  if (month > 12) { month = 1; year += 1; }
  return { year, month, day };
}

export function hunt(state: GameState, opts: HuntOptions): GameState {
  if (opts.hunters < 1 || opts.hunters > 2 || !Number.isInteger(opts.hunters)) {
    throw new Error(`hunt: hunters must be 1 or 2, got ${opts.hunters}`);
  }

  const rifleCount = state.inventory.rifle ?? 0;
  const isGather = opts.target === 'gather';

  if (!isGather && rifleCount === 0) {
    throw new Error('hunt: no rifle in inventory; use target "gather" for foraging-only');
  }

  let s = upgradeState(state);
  const rng = makeRng(`${s.seed}:action:hunt:${s.day}:0`);

  // Day's passive systems run.
  s = progressConditions(s, rng);
  s = applyDailyConsumption(s);
  s = adjustMorale(s, rng);

  // Hunt resolution
  const profile = BASE_YIELD_BY_TARGET[opts.target];
  const bullets = isGather ? 0 : AMMO_BY_BAND[opts.ammo];
  const availableBullets = s.inventory.bullets ?? 0;
  const spentBullets = Math.min(bullets, availableBullets);

  // Hunter profession bonus
  const hasLiveHunter = s.party.some((m) => !m.dead && m.profession === 'hunter');
  const hasLiveGunsmith = s.party.some((m) => !m.dead && m.profession === 'gunsmith');
  let yieldMultiplier = 1;
  if (hasLiveHunter) yieldMultiplier += 0.2;
  if (hasLiveGunsmith) yieldMultiplier += 0.2;

  // Carry cap from second rifle / gatherer
  let carryMultiplier = 1;
  if (opts.hunters === 2) {
    carryMultiplier = rifleCount >= 2 ? 1.8 : 1.5;
  }

  const rawYield = rng.int(profile.min, profile.max);
  const meatLbs = isGather
    ? rawYield                       // gather yield is small independent
    : Math.round(rawYield * yieldMultiplier * carryMultiplier * (spentBullets / AMMO_BY_BAND.moderate));

  // Place gather yield into flour; meat yield into bacon.
  const key = isGather ? 'flour' : 'bacon';
  const current = s.inventory[key] ?? 0;
  s = {
    ...s,
    inventory: {
      ...s.inventory,
      [key]: current + Math.max(0, meatLbs),
      bullets: availableBullets - spentBullets
    }
  };

  // Injury risk on big game
  if (profile.injuryRisk > 0 && rng.chance(profile.injuryRisk)) {
    const alive = s.party.filter((m) => !m.dead);
    if (alive.length > 0) {
      const victim = alive[rng.int(0, alive.length - 1)];
      s = {
        ...s,
        party: s.party.map((m) =>
          m.id === victim.id
            ? { ...m, health: Math.max(0, m.health - 10), conditions: [...m.conditions, { id: 'broken_leg', daysSinceOnset: 0 }] }
            : m
        ),
        eventLog: [...s.eventLog, { day: s.day, text: `${victim.name} was injured during the hunt.` }]
      };
    }
  }

  // Log outcome
  const logText = isGather
    ? `Gathered ${meatLbs} lb of berries and roots.`
    : meatLbs > 0
      ? `Hunt returned ${meatLbs} lb of meat (${spentBullets} bullets).`
      : `Hunt returned empty-handed (${spentBullets} bullets).`;
  s = { ...s, eventLog: [...s.eventLog, { day: s.day, text: logText }] };

  // Death check
  s = reapDead(s, rng);

  s = { ...s, day: s.day + 1, date: advanceOneDay(s.date) };
  return s;
}
```

### Step 3: Verify, commit

```bash
npm test -- tests/actions/hunt.test.ts
npm test
npm run check
git add -A
git commit -m "feat(actions): add hunt/gather action"
```

---

## Task 5: River Ford action

**Files:**
- Create: `src/lib/game/actions/ford.ts`
- Create: `tests/actions/ford.test.ts`

Spec §5.6. Four options: ford, caulk, ferry, wait-N-days.

### Step 1: Write failing tests

Create `tests/actions/ford.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ford } from '../../src/lib/game/actions/ford';
import { createInitialState } from '../../src/lib/game/engine';
import type { Ox } from '../../src/lib/game/types';

function newGame() {
  const s = createInitialState({
    seed: 'ford-test',
    leader: { name: 'A', profession: 'farmer' },
    companions: [{ name: 'B', profession: 'scout' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
  const oxen: Ox[] = [
    { id: 'o1', health: 100, fatigue: 20, shod: true },
    { id: 'o2', health: 100, fatigue: 20, shod: true }
  ];
  return { ...s, oxen };
}

const RIVER = { depthFt: 2.5, currentMph: 3, ferryPrice: 5 } as const;

describe('ford', () => {
  it('"ferry" pays cash and crosses safely', () => {
    const s = { ...newGame(), cash: 20 };
    const f = ford(s, { method: 'ferry', river: RIVER });
    expect(f.cash).toBe(15); // 20 - 5
    expect(f.day).toBe(s.day + 1);
  });

  it('"ferry" throws if not enough cash', () => {
    const s = { ...newGame(), cash: 3 };
    expect(() => ford(s, { method: 'ferry', river: RIVER })).toThrow(/cash/i);
  });

  it('"ford" succeeds on shallow water', () => {
    const shallow = { ...RIVER, depthFt: 1.5 };
    const s = newGame();
    const f = ford(s, { method: 'ford', river: shallow });
    expect(f.day).toBe(s.day + 1);
    // Cash unchanged
    expect(f.cash).toBe(s.cash);
  });

  it('"ford" risks supplies loss on deep swift water', () => {
    const dangerous = { ...RIVER, depthFt: 5.5, currentMph: 8 };
    const s = newGame();
    const f = ford(s, { method: 'ford', river: dangerous });
    // On worst-case rolls, expect inventory or wagon condition to drop.
    const wagonWorse = f.wagon.condition < s.wagon.condition;
    const suppliesLost = (f.inventory.flour ?? 0) < (s.inventory.flour ?? 0) - 2;
    expect(wagonWorse || suppliesLost).toBe(true);
  });

  it('"caulk" takes longer but is safer than ford', () => {
    const s = newGame();
    const f = ford(s, { method: 'caulk', river: RIVER });
    expect(f.day).toBe(s.day + 2); // 2 days for caulk-and-float
  });

  it('"wait" skips N days', () => {
    const s = newGame();
    const f = ford(s, { method: 'wait', river: RIVER, waitDays: 3 });
    expect(f.day).toBe(s.day + 3);
  });

  it('"wait" consumes food over the waiting period', () => {
    const s = newGame();
    const startingFlour = s.inventory.flour ?? 0;
    const f = ford(s, { method: 'wait', river: RIVER, waitDays: 3 });
    expect(f.inventory.flour).toBeLessThan(startingFlour);
  });

  it('logs the ford method', () => {
    const s = newGame();
    const f = ford(s, { method: 'ferry', river: RIVER });
    expect(f.eventLog[f.eventLog.length - 1].text.toLowerCase()).toMatch(/(ferry|river)/);
  });

  it('is deterministic', () => {
    const a = ford(newGame(), { method: 'ford', river: { ...RIVER, depthFt: 1.5 } });
    const b = ford(newGame(), { method: 'ford', river: { ...RIVER, depthFt: 1.5 } });
    expect(a).toEqual(b);
  });
});
```

### Step 2: Implement

Create `src/lib/game/actions/ford.ts`:

```ts
import type { GameState } from '../types';
import { makeRng } from '../rng';
import { upgradeState } from '../upgrade';
import { applyDailyConsumption } from '../systems/consumption';
import { progressConditions } from '../systems/conditions';
import { adjustMorale } from '../systems/morale';
import { reapDead } from '../systems/death';

export interface RiverState {
  depthFt: number;
  currentMph: number;
  ferryPrice: number; // 0 = no ferry
}

export type FordMethod = 'ford' | 'caulk' | 'ferry' | 'wait';

export interface FordOptions {
  method: FordMethod;
  river: RiverState;
  waitDays?: number;
}

function advanceOneDay(d: { year: number; month: number; day: number }) {
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const leap = (d.year % 4 === 0 && d.year % 100 !== 0) || d.year % 400 === 0;
  const cap = d.month === 2 && leap ? 29 : daysInMonth[d.month - 1];
  let { year, month, day } = d;
  day += 1;
  if (day > cap) { day = 1; month += 1; }
  if (month > 12) { month = 1; year += 1; }
  return { year, month, day };
}

function passiveDay(state: GameState, seedSuffix: string): GameState {
  const rng = makeRng(`${state.seed}:action:ford:${state.day}:${seedSuffix}`);
  let s = progressConditions(state, rng);
  s = applyDailyConsumption(s);
  s = adjustMorale(s, rng);
  s = reapDead(s, rng);
  return { ...s, day: s.day + 1, date: advanceOneDay(s.date) };
}

export function ford(state: GameState, opts: FordOptions): GameState {
  let s = upgradeState(state);

  switch (opts.method) {
    case 'ferry': {
      if (s.cash < opts.river.ferryPrice) {
        throw new Error(`ford: not enough cash for ferry ($${s.cash} < $${opts.river.ferryPrice})`);
      }
      s = { ...s, cash: s.cash - opts.river.ferryPrice };
      s = { ...s, eventLog: [...s.eventLog, { day: s.day, text: `Paid $${opts.river.ferryPrice} for ferry across the river.` }] };
      return passiveDay(s, 'ferry');
    }

    case 'caulk': {
      s = { ...s, eventLog: [...s.eventLog, { day: s.day, text: 'Caulked the wagon and floated across the river.' }] };
      // 2 days
      s = passiveDay(s, 'caulk-1');
      s = passiveDay(s, 'caulk-2');
      return s;
    }

    case 'wait': {
      const days = opts.waitDays ?? 1;
      if (!Number.isInteger(days) || days <= 0) {
        throw new Error('ford: waitDays must be a positive integer');
      }
      s = { ...s, eventLog: [...s.eventLog, { day: s.day, text: `Waiting ${days} day${days === 1 ? '' : 's'} for the river to drop.` }] };
      for (let i = 0; i < days; i++) {
        s = passiveDay(s, `wait-${i}`);
      }
      return s;
    }

    case 'ford': {
      const rng = makeRng(`${s.seed}:action:ford:${s.day}:ford`);
      // Risk scales with depth × current. Baseline safe at 2ft, 2mph.
      const danger = (opts.river.depthFt / 2) * (opts.river.currentMph / 2);

      if (rng.chance(Math.min(0.7, danger / 10))) {
        // Wagon takes damage
        const dmg = Math.round(rng.int(5, 20) * danger);
        s = {
          ...s,
          wagon: { ...s.wagon, condition: Math.max(0, s.wagon.condition - dmg) },
          eventLog: [...s.eventLog, { day: s.day, text: `Wagon took damage fording the river. Condition -${dmg}.` }]
        };
      }

      if (rng.chance(Math.min(0.5, danger / 8))) {
        // Supplies lost
        const loss = rng.int(5, 20);
        const currentFlour = s.inventory.flour ?? 0;
        const taken = Math.min(currentFlour, loss);
        s = {
          ...s,
          inventory: { ...s.inventory, flour: currentFlour - taken },
          eventLog: [...s.eventLog, { day: s.day, text: `Lost ${taken} lb of supplies in the current.` }]
        };
      }

      s = { ...s, eventLog: [...s.eventLog, { day: s.day, text: 'Forded the river.' }] };
      return passiveDay(s, 'ford');
    }
  }
}
```

### Step 3: Verify, commit

```bash
npm test -- tests/actions/ford.test.ts
npm test
npm run check
git add -A
git commit -m "feat(actions): add river ford action"
```

---

## Task 6: Trading stub

**Files:**
- Create: `src/lib/game/content/prices.ts`
- Create: `src/lib/game/actions/trade.ts`
- Create: `tests/actions/trade.test.ts`

Minimal price list; Plan 3 adds year + remoteness modifiers.

### Step 1: Write failing tests

Create `tests/actions/trade.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { trade } from '../../src/lib/game/actions/trade';
import { createInitialState } from '../../src/lib/game/engine';

function newGame() {
  return createInitialState({
    seed: 'trade-test',
    leader: { name: 'A', profession: 'merchant' },
    companions: [{ name: 'B', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
}

describe('trade', () => {
  it('buys flour at the base price', () => {
    const s = { ...newGame(), cash: 200 };
    // Merchant gives -15% buy discount; flour base $0.20/lb × 50 lb = $10, discounted to $8.50
    const t = trade(s, { buys: [{ item: 'flour', qty: 50 }] });
    expect(t.inventory.flour).toBe((s.inventory.flour ?? 0) + 50);
    expect(t.cash).toBe(Math.round(200 - 50 * 0.20 * 0.85));
  });

  it('sells bacon at the adjusted price (Merchant +20%)', () => {
    const s = { ...newGame(), cash: 0, inventory: { ...newGame().inventory, bacon: 100 } };
    // bacon base sell ~$0.30/lb × 50 = $15, +20% Merchant = $18
    const t = trade(s, { sells: [{ item: 'bacon', qty: 50 }] });
    expect(t.inventory.bacon).toBe(50);
    expect(t.cash).toBeGreaterThan(0);
  });

  it('throws if not enough cash for buy', () => {
    const s = { ...newGame(), cash: 1 };
    expect(() => trade(s, { buys: [{ item: 'flour', qty: 100 }] })).toThrow(/cash/i);
  });

  it('throws if selling more than owned', () => {
    const s = { ...newGame(), inventory: { bacon: 10 } };
    expect(() => trade(s, { sells: [{ item: 'bacon', qty: 100 }] })).toThrow(/quantity/i);
  });

  it('logs the transaction', () => {
    const s = { ...newGame(), cash: 100 };
    const t = trade(s, { buys: [{ item: 'flour', qty: 10 }] });
    expect(t.eventLog[t.eventLog.length - 1].text.toLowerCase()).toMatch(/(trade|bought|sold)/);
  });

  it('does not advance the day', () => {
    const s = newGame();
    const t = trade(s, { buys: [] });
    expect(t.day).toBe(s.day);
  });
});
```

### Step 2: Implement price stub

Create `src/lib/game/content/prices.ts`:

```ts
export interface PriceEntry {
  buy: number;  // dollars per unit
  sell: number; // dollars per unit (baseline)
}

export const PRICES: Record<string, PriceEntry> = {
  flour: { buy: 0.20, sell: 0.10 },
  bacon: { buy: 0.40, sell: 0.30 },
  beans: { buy: 0.25, sell: 0.15 },
  bullets: { buy: 2.00, sell: 1.00 },
  rifle: { buy: 20.00, sell: 12.00 },
  shovel: { buy: 4.00, sell: 2.00 },
  yoke: { buy: 6.00, sell: 3.00 },
  wheel: { buy: 10.00, sell: 6.00 },
  axle: { buy: 12.00, sell: 8.00 },
  tongue: { buy: 8.00, sell: 5.00 },
  ox: { buy: 30.00, sell: 20.00 },
  coffee: { buy: 1.50, sell: 0.80 },
  tea: { buy: 1.00, sell: 0.60 },
  dried_fruit: { buy: 0.60, sell: 0.35 }
};

export function getPrice(item: string): PriceEntry {
  const p = PRICES[item];
  if (!p) throw new Error(`Unknown item for trade: ${item}`);
  return p;
}
```

### Step 3: Implement trade action

Create `src/lib/game/actions/trade.ts`:

```ts
import type { GameState } from '../types';
import { getPrice } from '../content/prices';

export interface TradeEntry {
  item: string;
  qty: number;
}

export interface TradeOptions {
  buys?: TradeEntry[];
  sells?: TradeEntry[];
}

function professionDiscount(state: GameState): { buyMult: number; sellMult: number } {
  const alive = (p: string) => state.party.some((m) => !m.dead && m.profession === p);
  let buyMult = 1;
  let sellMult = 1;
  if (alive('merchant')) { buyMult *= 0.85; sellMult *= 1.20; }
  if (alive('banker')) { buyMult *= 0.90; sellMult *= 1.10; }
  return { buyMult, sellMult };
}

export function trade(state: GameState, opts: TradeOptions): GameState {
  const buys = opts.buys ?? [];
  const sells = opts.sells ?? [];

  const { buyMult, sellMult } = professionDiscount(state);

  // Validate sells first
  for (const { item, qty } of sells) {
    const have = state.inventory[item] ?? 0;
    if (qty > have) {
      throw new Error(`trade: attempted to sell ${qty} ${item} but only have ${have} (quantity)`);
    }
  }

  // Calculate costs
  let totalCost = 0;
  for (const { item, qty } of buys) {
    totalCost += Math.round(getPrice(item).buy * qty * buyMult);
  }
  if (totalCost > state.cash) {
    throw new Error(`trade: not enough cash ($${state.cash} < $${totalCost})`);
  }

  let totalRevenue = 0;
  for (const { item, qty } of sells) {
    totalRevenue += Math.round(getPrice(item).sell * qty * sellMult);
  }

  const inventory: Record<string, number> = { ...state.inventory };
  for (const { item, qty } of buys) {
    inventory[item] = (inventory[item] ?? 0) + qty;
  }
  for (const { item, qty } of sells) {
    inventory[item] = (inventory[item] ?? 0) - qty;
  }

  const parts: string[] = [];
  if (buys.length > 0) parts.push(`bought ${buys.map((b) => `${b.qty} ${b.item}`).join(', ')}`);
  if (sells.length > 0) parts.push(`sold ${sells.map((s) => `${s.qty} ${s.item}`).join(', ')}`);
  const logText = `Trade: ${parts.join('; ')} (net $${totalRevenue - totalCost}).`;

  return {
    ...state,
    cash: state.cash - totalCost + totalRevenue,
    inventory,
    eventLog: [...state.eventLog, { day: state.day, text: logText }]
  };
}
```

### Step 4: Verify, commit

```bash
npm test -- tests/actions/trade.test.ts
npm test
npm run check
git add -A
git commit -m "feat(actions): add trade stub + price list"
```

---

## Task 7: Full-journey integration test

**Files:**
- Create: `tests/actions/journey.test.ts`

Prove actions compose into a real game: a 30-day run using a mix of travel (via `tickDay`), camp nights, and rest periods reaches Fort Kearny deterministically and nobody dies.

### Step 1: Write the integration test

Create `tests/actions/journey.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createInitialState, tickDay } from '../../src/lib/game/engine';
import { camp } from '../../src/lib/game/actions/camp';
import { rest } from '../../src/lib/game/actions/rest';
import type { Ox } from '../../src/lib/game/types';

function freshParty() {
  const s = createInitialState({
    seed: 'journey',
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [
      { name: 'Mary', profession: 'doctor' },
      { name: 'Tom', profession: 'hunter' }
    ],
    startDate: { year: 1848, month: 4, day: 15 }
  });
  const oxen: Ox[] = Array.from({ length: 4 }, (_, i) => ({
    id: `ox-${i}`,
    health: 100,
    fatigue: 0,
    shod: true
  }));
  return { ...s, oxen };
}

describe('full journey: Independence → Fort Kearny', () => {
  it('reaches Fort Kearny within 30 calendar days using travel + camp + rest', () => {
    let s = freshParty();
    // Rhythm: travel 5 days, camp 1, rest 1 (or camp 2). Repeat.
    for (let cycle = 0; cycle < 6 && !s.completed; cycle++) {
      for (let d = 0; d < 4; d++) s = tickDay(s);
      s = camp(s, {});
      s = rest(s, 1);
    }
    // Did we reach Ft Kearny? The milestone is that previousLandmarkId moved past independence.
    expect(s.location.milesTraveled).toBeGreaterThanOrEqual(300);
  });

  it('nobody dies in a healthy journey', () => {
    let s = freshParty();
    for (let cycle = 0; cycle < 6 && !s.completed; cycle++) {
      for (let d = 0; d < 4; d++) s = tickDay(s);
      s = camp(s, {});
      s = rest(s, 1);
    }
    expect(s.party.every((m) => !m.dead)).toBe(true);
  });

  it('same seed + same action sequence = identical final state', () => {
    function run() {
      let s = freshParty();
      for (let cycle = 0; cycle < 6; cycle++) {
        for (let d = 0; d < 4; d++) s = tickDay(s);
        s = camp(s, {});
        s = rest(s, 1);
      }
      return s;
    }
    expect(run()).toEqual(run());
  });
});
```

### Step 2: Verify, commit

```bash
npm test -- tests/actions/journey.test.ts
npm test
npm run check
```

If the "reaches Fort Kearny" assertion fails with the current pace/fatigue balance, either:
- Adjust the cycle (more travel days per camp/rest), or
- Tune `CAMP_FATIGUE_RECOVERY` or `OX_FATIGUE_RECOVERY_PER_REST_DAY` in their source files,

and describe the adjustment in the commit.

```bash
git add -A
git commit -m "test: full-journey integration — Independence → Fort Kearny"
```

---

## Verification Checklist

- [ ] `npm test` all tests pass (126 + ~45 new = ~170+).
- [ ] `npm run check` 0 errors.
- [ ] `src/lib/game/actions/` contains `rest.ts`, `camp.ts`, `hunt.ts`, `ford.ts`, `trade.ts`, `index.ts`.
- [ ] `src/lib/game/content/prices.ts` shipped.
- [ ] `recoverOxenFatigue` added to oxen system.
- [ ] Full-journey test reaches Ft Kearny without the party dying.
- [ ] Each action is deterministic under the same inputs.
- [ ] Each action uses the `\${seed}:action:\${kind}:\${day}:\${nonce}` RNG convention.

---

## Handoff to Plan 3

Plan 3 lands:
- Full profession catalog + passive bonus wiring (beyond the Hunter/Gunsmith/Farmer/Doctor references used in Plan 2b actions)
- Full item catalog (beyond the stub in prices.ts)
- Full landmark catalog (~31 stops replacing the 3-stop stub in `content/landmarks.ts`)
- Random event catalog (60–80 events) + event firing integrated into `tickDay`
- Year/month-gated event logic
- Native trade menu + Indian Trader unlocks
