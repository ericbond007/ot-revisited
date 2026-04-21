# Plan 3b: Event System — Hoosier Trail

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Random events fire during `tickDay`, weighted by terrain, season, year, and recent history. Each event has 1–4 choices with state-transforming resolutions. Events auto-resolve with their default choice during automated simulation; the manual resolution path is exposed for Plan 4's UI. Ship ~20 representative events across all 9 categories from the spec (weather, health, wagon/livestock, chance encounters, Native American, bandits, finds, historical, personal). Add year-gated + month-gated logic. Plan 5 balance work expands the catalog; Plan 3b locks the shape.

**Architecture:** Event definitions live as data in `src/lib/game/content/events.ts`. The firing engine is one pure function `rollEvent(state, rng) => Event | null`, called from a new `fireEvent` tick step inserted between `applyTravel` and `attemptFire`. When an event fires, its default resolution is applied in the automated path. The manual path (Plan 4) takes an `Event` + `choiceId` + `state` and returns a new `GameState`.

**Tech Stack:** Same.

**Companion spec:** §5.9 (random events), §8.4 (year/month gating). Plan 3a provides content scaffolding.

**Builds on:** Plans 1 + 2a + 2b + 3a (merged).

---

## File Structure

### New files

| Path | Responsibility |
|---|---|
| `src/lib/game/content/events.ts` | Event catalog + registry helpers |
| `src/lib/game/systems/events.ts` | `rollEvent` (weighted selection) + `resolveEvent` (apply choice outcome) + `fireEvent` (tick step) |
| `src/lib/game/content/event-gating.ts` | Year/month/landmark predicates an event can gate on |
| `tests/events-catalog.test.ts` | Catalog integrity (every event has choices, valid IDs, etc.) |
| `tests/events-roll.test.ts` | Weighted roll behavior + gating |
| `tests/events-resolve.test.ts` | Choice outcomes apply correctly |
| `tests/events-integration.test.ts` | 100-day deterministic run fires multiple events without crashing |

### Files modified

| Path | Change |
|---|---|
| `src/lib/game/engine.ts` | Insert `fireEvent` tick step between `applyTravel` and `attemptFire` |
| `src/lib/game/types.ts` | Extend `GameStateFlag` union if new gating flags are needed |

---

## Conventions locked by this plan

### Event definition shape

```ts
interface EventChoice {
  id: string;                                      // stable id for UI
  label: string;                                   // short text shown to player
  apply: (state: GameState, rng: Rng) => GameState;
  isDefault?: boolean;                             // auto-selected in automated runs
}

interface GameEvent {
  id: string;                                      // stable id for logs/saves
  category: EventCategory;
  title: string;                                   // one-line header
  body: string;                                    // 1–3 paragraph flavor (supports {memberName} templating)
  weight: number;                                  // base selection weight
  choices: EventChoice[];
  gate?: (state: GameState) => boolean;            // if present, only fires when gate returns true
}
```

### Firing frequency

One event rolled per `tickDay`, but only fires if `rng.chance(FIRE_CHANCE)` — baseline **30%**, so roughly 3 events per 10 travel days. Cooldown: no event can fire on back-to-back days (tracked via a hidden `flags._lastEventDay` field).

### Determinism

`rollEvent` uses the same per-day RNG as the rest of `tickDay`. Given the same state + day, the same event (or none) fires with the same outcome.

### Auto-resolution

Every event has at least one choice marked `isDefault: true`. `fireEvent` applies the default choice's `apply` function. Plan 4 UI will skip auto-resolve and instead pause tick for user input.

---

## Task 1: Event type definitions + firing engine

**Files:**
- Create: `src/lib/game/content/events.ts` (just types + empty registry)
- Create: `src/lib/game/content/event-gating.ts`
- Create: `src/lib/game/systems/events.ts`
- Create: `tests/events-engine.test.ts`
- Modify: `src/lib/game/engine.ts` to insert `fireEvent` step

### Step 1 — Failing tests

Create `tests/events-engine.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { fireEvent, rollEvent, resolveEvent } from '../src/lib/game/systems/events';
import { makeRng } from '../src/lib/game/rng';
import { createInitialState } from '../src/lib/game/engine';
import { EVENTS } from '../src/lib/game/content/events';
import type { GameEvent } from '../src/lib/game/content/events';

function newGame() {
  return createInitialState({
    seed: 'events',
    leader: { name: 'A', profession: 'farmer' },
    companions: [{ name: 'B', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
}

// A fake event we can register manually for isolated testing.
const TEST_EVENT: GameEvent = {
  id: 'test_noop',
  category: 'finds',
  title: 'Test',
  body: 'Nothing happens.',
  weight: 1,
  choices: [{ id: 'ok', label: 'Acknowledge', apply: (s) => s, isDefault: true }]
};

describe('rollEvent', () => {
  it('returns null when no events match gate or when roll fails', () => {
    const s = newGame();
    // Roll with a seed where the 30% fire chance will fail — very low p.
    // Force failure by explicitly passing only a gated-out event pool.
    const gated: GameEvent[] = [{ ...TEST_EVENT, gate: () => false }];
    const picked = rollEvent(s, makeRng('never'), { pool: gated });
    expect(picked).toBeNull();
  });

  it('picks an event from an eligible pool when fire chance hits', () => {
    const s = newGame();
    // Deterministic: use a seed we know fires. Try a few until one hits.
    for (let d = 0; d < 20; d++) {
      const r = makeRng(`seed-${d}`);
      const picked = rollEvent(s, r, { pool: [TEST_EVENT] });
      if (picked) {
        expect(picked.id).toBe('test_noop');
        return;
      }
    }
    throw new Error('Expected a fire in 20 seeds');
  });
});

describe('resolveEvent', () => {
  it('applies the chosen choice', () => {
    const s = newGame();
    const evt: GameEvent = {
      id: 'test_cash',
      category: 'finds',
      title: 'Test',
      body: '',
      weight: 1,
      choices: [
        { id: 'take', label: 'Take the cash', apply: (st) => ({ ...st, cash: st.cash + 50 }), isDefault: true },
        { id: 'leave', label: 'Leave it', apply: (st) => st }
      ]
    };
    const result = resolveEvent(s, evt, 'take', makeRng('r'));
    expect(result.cash).toBe(s.cash + 50);
    expect(result.eventLog[result.eventLog.length - 1].text).toMatch(/test/i);
  });

  it('throws on unknown choice id', () => {
    const s = newGame();
    expect(() => resolveEvent(s, TEST_EVENT, 'not-a-choice', makeRng('r'))).toThrow();
  });
});

describe('fireEvent (tick step)', () => {
  it('is a no-op when no event fires', () => {
    const s = newGame();
    // We can't force null without internal seed knowledge, but with an empty pool
    // the function is guaranteed to return state unchanged.
    const next = fireEvent(s, makeRng('t:1'), { pool: [] });
    expect(next).toEqual(s);
  });

  it('applies the default choice when an event fires', () => {
    const s = newGame();
    const evt: GameEvent = {
      id: 'test_default',
      category: 'finds',
      title: 'Test',
      body: '',
      weight: 1,
      choices: [
        { id: 'chosen', label: 'Gain $1', apply: (st) => ({ ...st, cash: st.cash + 1 }), isDefault: true }
      ]
    };
    for (let d = 0; d < 20; d++) {
      const next = fireEvent(s, makeRng(`t:${d}`), { pool: [evt] });
      if (next.cash !== s.cash) {
        expect(next.cash).toBe(s.cash + 1);
        return;
      }
    }
    throw new Error('Expected at least one fire in 20 seeds');
  });

  it('cooldown: does not fire again if _lastEventDay is the current day', () => {
    const s = { ...newGame(), flags: { ...newGame().flags, _lastEventDay: 1 } };
    // Current day is 1; lastEventDay is 1 → cooldown blocks firing.
    const next = fireEvent(s, makeRng('t:cool'), { pool: [TEST_EVENT] });
    expect(next).toEqual(s);
  });
});

describe('EVENTS catalog', () => {
  it('has at least 15 entries in the initial registry', () => {
    expect(EVENTS.length).toBeGreaterThanOrEqual(15);
  });
});
```

### Step 2 — Implement event types + registry stub

Create `src/lib/game/content/events.ts`:

```ts
import type { GameState } from '../types';
import type { Rng } from '../rng';

export type EventCategory =
  | 'weather'
  | 'health'
  | 'wagon'
  | 'encounter'
  | 'native'
  | 'bandit'
  | 'finds'
  | 'historical'
  | 'personal';

export interface EventChoice {
  id: string;
  label: string;
  apply: (state: GameState, rng: Rng) => GameState;
  isDefault?: boolean;
}

export interface GameEvent {
  id: string;
  category: EventCategory;
  title: string;
  body: string;
  weight: number;
  choices: EventChoice[];
  gate?: (state: GameState) => boolean;
}

// The full registry is built up in Tasks 2-5. Task 1 ships an empty-or-placeholder
// array to unblock the systems module; Task 2 onward pushes real events.
export const EVENTS: GameEvent[] = [];
```

### Step 3 — Implement event-gating helpers

Create `src/lib/game/content/event-gating.ts`:

```ts
import type { GameState } from '../types';

export function yearBetween(min: number, maxInclusive: number): (s: GameState) => boolean {
  return (s) => s.date.year >= min && s.date.year <= maxInclusive;
}

export function yearAtLeast(min: number): (s: GameState) => boolean {
  return (s) => s.date.year >= min;
}

export function monthIs(...months: number[]): (s: GameState) => boolean {
  return (s) => months.includes(s.date.month);
}

export function inTerrain(...terrain: GameState['location']['terrain'][]): (s: GameState) => boolean {
  return (s) => terrain.includes(s.location.terrain);
}

export function hasFlag(flag: string): (s: GameState) => boolean {
  return (s) => !!s.flags[flag];
}

export function and(...gates: Array<(s: GameState) => boolean>): (s: GameState) => boolean {
  return (s) => gates.every((g) => g(s));
}

export function or(...gates: Array<(s: GameState) => boolean>): (s: GameState) => boolean {
  return (s) => gates.some((g) => g(s));
}
```

### Step 4 — Implement events system

Create `src/lib/game/systems/events.ts`:

```ts
import type { GameState } from '../types';
import type { Rng } from '../rng';
import { EVENTS } from '../content/events';
import type { GameEvent } from '../content/events';

const BASE_FIRE_CHANCE = 0.30;

export interface RollOptions {
  pool?: GameEvent[];   // default: global EVENTS
  fireChance?: number;  // default: BASE_FIRE_CHANCE
}

export function eligibleEvents(state: GameState, pool: GameEvent[] = EVENTS): GameEvent[] {
  return pool.filter((e) => !e.gate || e.gate(state));
}

export function rollEvent(state: GameState, rng: Rng, opts: RollOptions = {}): GameEvent | null {
  const pool = opts.pool ?? EVENTS;
  const fireChance = opts.fireChance ?? BASE_FIRE_CHANCE;
  if (!rng.chance(fireChance)) return null;

  const eligible = eligibleEvents(state, pool);
  if (eligible.length === 0) return null;

  const totalWeight = eligible.reduce((sum, e) => sum + e.weight, 0);
  if (totalWeight <= 0) return null;

  let pick = rng.next() * totalWeight;
  for (const e of eligible) {
    pick -= e.weight;
    if (pick <= 0) return e;
  }
  return eligible[eligible.length - 1];
}

export function resolveEvent(state: GameState, event: GameEvent, choiceId: string, rng: Rng): GameState {
  const choice = event.choices.find((c) => c.id === choiceId);
  if (!choice) throw new Error(`resolveEvent: unknown choice "${choiceId}" for event "${event.id}"`);
  const applied = choice.apply(state, rng);
  return {
    ...applied,
    eventLog: [
      ...applied.eventLog,
      { day: applied.day, text: `${event.title}: ${choice.label}.` }
    ]
  };
}

export function fireEvent(state: GameState, rng: Rng, opts: RollOptions = {}): GameState {
  // Cooldown: don't fire if we already fired on the same day
  if (state.flags._lastEventDay === state.day) return state;

  const event = rollEvent(state, rng, opts);
  if (!event) return state;

  const defaultChoice = event.choices.find((c) => c.isDefault) ?? event.choices[0];
  const resolved = resolveEvent(state, event, defaultChoice.id, rng);
  return {
    ...resolved,
    flags: { ...resolved.flags, _lastEventDay: state.day }
  };
}
```

Note: the last test in the task expects `EVENTS.length >= 15` which won't be true until Task 2+ populates the registry. That test will fail in Task 1 and pass in Task 2. Temporarily comment it out (or use `.skip()`) and re-enable in Task 2.

Actually, better: **skip** that final describe via `describe.skip`:

```ts
describe.skip('EVENTS catalog', () => {
  it('has at least 15 entries in the initial registry', () => {
    expect(EVENTS.length).toBeGreaterThanOrEqual(15);
  });
});
```

Task 2 removes the `.skip` when adding the first batch of events.

### Step 5 — Insert fireEvent into tickDay

In `src/lib/game/engine.ts`:

```ts
import { fireEvent } from './systems/events';

// Replace the DAILY_STEPS array:
const DAILY_STEPS: TickStep[] = [
  progressConditions,
  (s) => applyDailyConsumption(s),
  tickOxen,
  tickWagon,
  adjustMorale,
  applyTravel,
  fireEvent,        // <-- new step between travel and fire
  attemptFire,
  reapDead
];
```

### Step 6 — Extend types.ts for gating flags

The event cooldown uses `flags._lastEventDay`. Flags are already `Record<string, boolean>` — but we need to store a number, not a boolean.

**Either:** change flags to `Record<string, boolean | number>` in types.ts, **or** use a separate field. Cleanest fix: change the type.

In `src/lib/game/types.ts`, update the `GameState.flags` field:

```ts
flags: Record<string, boolean | number>;
```

Verify existing flag usage (`flags.hasBoilingKnowledge`, `flags.hadFireLastNight`) still works as booleans — it does, since `boolean | number` is a superset.

Also update `src/lib/game/upgrade.ts` `DEFAULT_FLAGS` to accept the wider type — it still sets booleans only, which is fine.

### Step 7 — Run tests, commit

```bash
npm test
npm run check
git add -A
git commit -m "feat(events): add event type, registry, firing engine, cooldown"
```

All 206 tests pass + ~6 new engine tests = 212 tests.

---

## Task 2: First event batch — weather + wagon/livestock (~10 events)

**Files:**
- Modify: `src/lib/game/content/events.ts` (append events)
- Create: `tests/events-catalog.test.ts`
- Re-enable the EVENTS-catalog test in `tests/events-engine.test.ts`

### Step 1 — Define the events

Append to `src/lib/game/content/events.ts` before the `export const EVENTS = []`:

```ts
import { inTerrain, monthIs } from './event-gating';

// Weather events
const storm: GameEvent = {
  id: 'weather_storm',
  category: 'weather',
  title: 'A thunderstorm rolls in',
  body: 'Dark clouds gather and the rain comes down in sheets.',
  weight: 4,
  choices: [
    {
      id: 'press_on',
      label: 'Press on',
      isDefault: true,
      apply: (s) => ({
        ...s,
        morale: Math.max(0, s.morale - 2),
        wagon: { ...s.wagon, condition: Math.max(0, s.wagon.condition - 2) }
      })
    },
    {
      id: 'shelter',
      label: 'Shelter until it passes',
      apply: (s) => ({ ...s, morale: Math.max(0, s.morale - 1) })
    }
  ]
};

const heat_wave: GameEvent = {
  id: 'weather_heat',
  category: 'weather',
  title: 'A stifling heat wave',
  body: 'The sun beats down mercilessly. Water stores dwindle fast.',
  weight: 3,
  gate: inTerrain('prairie', 'desert'),
  choices: [
    {
      id: 'endure',
      label: 'Endure it',
      isDefault: true,
      apply: (s) => ({
        ...s,
        resources: { ...s.resources, water: Math.max(0, s.resources.water - 5) },
        morale: Math.max(0, s.morale - 1)
      })
    }
  ]
};

const fog: GameEvent = {
  id: 'weather_fog',
  category: 'weather',
  title: 'Heavy fog sets in',
  body: 'Visibility drops to nothing.',
  weight: 2,
  choices: [
    {
      id: 'wait',
      label: 'Wait it out',
      isDefault: true,
      apply: (s) => ({ ...s, location: { ...s.location, milesTraveled: Math.max(0, s.location.milesTraveled - 5) } })
    }
  ]
};

const early_snow: GameEvent = {
  id: 'weather_snow',
  category: 'weather',
  title: 'Early snowfall',
  body: 'A chill bite in the air and snowflakes on the pass.',
  weight: 3,
  gate: monthIs(9, 10, 11),
  choices: [
    {
      id: 'push_through',
      label: 'Push through',
      isDefault: true,
      apply: (s) => ({
        ...s,
        morale: Math.max(0, s.morale - 3),
        party: s.party.map((m) => m.dead ? m : ({ ...m, health: Math.max(0, m.health - 3) }))
      })
    }
  ]
};

// Wagon / livestock events
const broken_wheel: GameEvent = {
  id: 'wagon_wheel',
  category: 'wagon',
  title: 'A wheel shatters',
  body: 'A spoke gives way, then the whole rim.',
  weight: 3,
  choices: [
    {
      id: 'replace',
      label: 'Replace with a spare wheel',
      isDefault: true,
      apply: (s) => {
        const have = s.inventory.wheel ?? 0;
        if (have > 0) {
          return {
            ...s,
            inventory: { ...s.inventory, wheel: have - 1 },
            wagon: { ...s.wagon, condition: Math.min(100, s.wagon.condition + 10) }
          };
        }
        return { ...s, wagon: { ...s.wagon, condition: Math.max(0, s.wagon.condition - 15) } };
      }
    }
  ]
};

const ox_lame: GameEvent = {
  id: 'ox_lame',
  category: 'wagon',
  title: 'An ox goes lame',
  body: 'One of the oxen is favoring a hoof.',
  weight: 3,
  choices: [
    {
      id: 'rest_it',
      label: 'Rest it in the yoke for the day',
      isDefault: true,
      apply: (s) => ({
        ...s,
        oxen: s.oxen.map((o, i) => i === 0 ? { ...o, fatigue: Math.min(100, o.fatigue + 15) } : o)
      })
    }
  ]
};

const ox_threw_shoe: GameEvent = {
  id: 'ox_shoe',
  category: 'wagon',
  title: 'An ox throws a shoe',
  body: 'The rocky terrain took a toll.',
  weight: 3,
  gate: inTerrain('mountains', 'desert'),
  choices: [
    {
      id: 'reshoe',
      label: 'Re-shoe the ox',
      isDefault: true,
      apply: (s) => {
        const have = s.inventory.ox_shoes ?? 0;
        if (have > 0) {
          return { ...s, inventory: { ...s.inventory, ox_shoes: have - 1 } };
        }
        return {
          ...s,
          oxen: s.oxen.map((o, i) => i === 0 ? { ...o, shod: false } : o)
        };
      }
    }
  ]
};

const tongue_snaps: GameEvent = {
  id: 'wagon_tongue',
  category: 'wagon',
  title: 'The wagon tongue snaps',
  body: 'A crack, then a splinter. The oxen halt.',
  weight: 2,
  choices: [
    {
      id: 'repair',
      label: 'Repair with a spare tongue',
      isDefault: true,
      apply: (s) => {
        const have = s.inventory.tongue ?? 0;
        if (have > 0) {
          return { ...s, inventory: { ...s.inventory, tongue: have - 1 } };
        }
        return { ...s, wagon: { ...s.wagon, condition: Math.max(0, s.wagon.condition - 20) } };
      }
    }
  ]
};

const canvas_tear: GameEvent = {
  id: 'wagon_canvas',
  category: 'wagon',
  title: 'The canvas cover tears',
  body: 'A gust of wind rips a seam.',
  weight: 2,
  choices: [
    {
      id: 'patch',
      label: 'Patch it',
      isDefault: true,
      apply: (s) => {
        const have = s.inventory.canvas ?? 0;
        if (have > 0) {
          return { ...s, inventory: { ...s.inventory, canvas: have - 1 } };
        }
        return { ...s, wagon: { ...s.wagon, condition: Math.max(0, s.wagon.condition - 8) }, morale: Math.max(0, s.morale - 1) };
      }
    }
  ]
};

const ox_wanders: GameEvent = {
  id: 'ox_wander',
  category: 'wagon',
  title: 'An ox wandered off in the night',
  body: 'Tracks lead into the brush.',
  weight: 2,
  choices: [
    {
      id: 'search',
      label: 'Search for it (half day)',
      isDefault: true,
      apply: (s) => ({ ...s, morale: Math.max(0, s.morale - 1) })
    }
  ]
};

// Now push them all into EVENTS.
EVENTS.push(storm, heat_wave, fog, early_snow, broken_wheel, ox_lame, ox_threw_shoe, tongue_snaps, canvas_tear, ox_wanders);
```

### Step 2 — Catalog test

Create `tests/events-catalog.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { EVENTS } from '../src/lib/game/content/events';

describe('events catalog', () => {
  it('has events in all core categories covered so far', () => {
    const cats = new Set(EVENTS.map((e) => e.category));
    expect(cats.has('weather')).toBe(true);
    expect(cats.has('wagon')).toBe(true);
  });

  it('every event has id, title, body, >=1 choice', () => {
    for (const e of EVENTS) {
      expect(e.id).toBeTruthy();
      expect(e.title).toBeTruthy();
      expect(e.body).toBeTruthy();
      expect(e.choices.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('every event has at least one default choice', () => {
    for (const e of EVENTS) {
      const hasDefault = e.choices.some((c) => c.isDefault);
      expect(hasDefault, `event ${e.id} has no default choice`).toBe(true);
    }
  });

  it('event ids are unique', () => {
    const seen = new Set<string>();
    for (const e of EVENTS) {
      expect(seen.has(e.id), `duplicate event id ${e.id}`).toBe(false);
      seen.add(e.id);
    }
  });
});
```

### Step 3 — Re-enable the length test

In `tests/events-engine.test.ts`, remove `.skip` from the `describe('EVENTS catalog', ...)` block, and adjust the length assertion to `>= 10` (we've added 10 in Task 2).

### Step 4 — Verify, commit

```bash
npm test
npm run check
git add -A
git commit -m "feat(events): add 10 weather & wagon events"
```

---

## Task 3: Second event batch — health + finds + encounters (~10 events)

**Files:**
- Modify: `src/lib/game/content/events.ts`

(same pattern — define ~10 events in these categories and push to EVENTS)

Include:

- `health_cholera_scare` (water-near-settlement) — applies cholera to random member; mitigated by `canBoilWater`
- `health_dysentery` — applies dysentery
- `health_snakebite` — applies snakebite (desert/prairie gate)
- `find_berry_patch` — adds dried_fruit, small morale (summer gate)
- `find_abandoned_cache` — adds misc inventory items
- `find_spring` — adds water
- `encounter_emigrant_party` — morale + news flavor
- `encounter_abandoned_wagon` — loot or pass
- `encounter_lost_child` — morale hit or rescue
- `personal_crisis` — member breaks down, small morale shift

Each follows the pattern established in Task 2.

Commit message: `feat(events): add 10 health, finds, encounter, and personal events`

(Full content inlined below — dense but straightforward. Implementer should paste these verbatim.)

```ts
// --- Health ---
const cholera_scare: GameEvent = {
  id: 'health_cholera',
  category: 'health',
  title: 'Water tastes foul downstream',
  body: 'The river here smells off. Someone got sick at the last wagon train.',
  weight: 3,
  choices: [
    {
      id: 'risk_drink',
      label: 'Drink anyway',
      isDefault: true,
      apply: (s, rng) => {
        // Boiling knowledge cuts risk dramatically
        const baseChance = 0.25;
        const chance = s.flags.hasBoilingKnowledge || s.party.some(m => !m.dead && m.profession === 'doctor') ? baseChance * 0.3 : baseChance;
        if (rng.chance(chance)) {
          const alive = s.party.filter(m => !m.dead);
          if (alive.length > 0) {
            const victim = alive[rng.int(0, alive.length - 1)];
            return {
              ...s,
              party: s.party.map(m => m.id === victim.id ? { ...m, conditions: [...m.conditions, { id: 'cholera', daysSinceOnset: 0 }] } : m)
            };
          }
        }
        return s;
      }
    },
    {
      id: 'wait',
      label: 'Travel upstream before drinking',
      apply: (s) => ({ ...s, day: s.day })
    }
  ]
};

const snakebite: GameEvent = {
  id: 'health_snake',
  category: 'health',
  title: 'Rattlesnake strike',
  body: 'A camp-gatherer reaches into the brush and recoils, clutching their hand.',
  weight: 1,
  gate: inTerrain('prairie', 'desert'),
  choices: [
    {
      id: 'treat',
      label: 'Treat with bandages & laudanum',
      isDefault: true,
      apply: (s, rng) => {
        const alive = s.party.filter(m => !m.dead);
        if (alive.length === 0) return s;
        const victim = alive[rng.int(0, alive.length - 1)];
        const bandages = s.inventory.bandages ?? 0;
        const hp = bandages > 0 ? 10 : 20;
        return {
          ...s,
          inventory: bandages > 0 ? { ...s.inventory, bandages: bandages - 1 } : s.inventory,
          party: s.party.map(m =>
            m.id === victim.id
              ? { ...m, health: Math.max(0, m.health - hp), conditions: [...m.conditions, { id: 'snakebite', daysSinceOnset: 0 }] }
              : m
          )
        };
      }
    }
  ]
};

// --- Finds ---
const berry_patch: GameEvent = {
  id: 'find_berries',
  category: 'finds',
  title: 'A patch of wild berries',
  body: 'Dark-purple berries hang heavy on the bushes.',
  weight: 3,
  gate: monthIs(6, 7, 8),
  choices: [
    {
      id: 'harvest',
      label: 'Harvest them',
      isDefault: true,
      apply: (s, rng) => {
        const amount = rng.int(10, 25);
        return {
          ...s,
          inventory: { ...s.inventory, dried_fruit: (s.inventory.dried_fruit ?? 0) + amount },
          morale: Math.min(100, s.morale + 2)
        };
      }
    }
  ]
};

const abandoned_cache: GameEvent = {
  id: 'find_cache',
  category: 'finds',
  title: 'An abandoned cache',
  body: 'A sealed barrel and a small wooden chest, left by a party that moved on quickly.',
  weight: 1,
  choices: [
    {
      id: 'take',
      label: 'Take everything',
      isDefault: true,
      apply: (s, rng) => ({
        ...s,
        inventory: {
          ...s.inventory,
          flour: (s.inventory.flour ?? 0) + rng.int(20, 60),
          bullets: (s.inventory.bullets ?? 0) + rng.int(5, 15)
        }
      })
    }
  ]
};

const fresh_spring: GameEvent = {
  id: 'find_spring',
  category: 'finds',
  title: 'A cold clear spring',
  body: 'Water bubbles up from between the rocks.',
  weight: 3,
  choices: [
    {
      id: 'fill',
      label: 'Fill every water skin',
      isDefault: true,
      apply: (s) => ({ ...s, resources: { ...s.resources, water: s.resources.waterCap } })
    }
  ]
};

// --- Chance encounters ---
const emigrant_party: GameEvent = {
  id: 'encounter_emigrants',
  category: 'encounter',
  title: 'A passing wagon train',
  body: 'Fellow travelers bound the same direction. They stop to swap news.',
  weight: 3,
  choices: [
    {
      id: 'talk',
      label: 'Trade news',
      isDefault: true,
      apply: (s) => ({ ...s, morale: Math.min(100, s.morale + 2) })
    }
  ]
};

const abandoned_wagon: GameEvent = {
  id: 'encounter_abandoned',
  category: 'encounter',
  title: 'An abandoned wagon',
  body: 'Tipped over, split at the tongue. Scattered possessions lie in the grass.',
  weight: 2,
  choices: [
    {
      id: 'scavenge',
      label: 'Scavenge what you can',
      isDefault: true,
      apply: (s, rng) => {
        const parts = ['wheel', 'axle', 'tongue', 'canvas'];
        const gift = parts[rng.int(0, parts.length - 1)];
        return { ...s, inventory: { ...s.inventory, [gift]: (s.inventory[gift] ?? 0) + 1 } };
      }
    },
    { id: 'pass', label: 'Pass it by', apply: (s) => s }
  ]
};

const lost_child: GameEvent = {
  id: 'encounter_child',
  category: 'encounter',
  title: 'A lost child',
  body: 'A small figure sits crying beside the trail. Separated from another party.',
  weight: 1,
  choices: [
    {
      id: 'help',
      label: 'Take them to the next post',
      isDefault: true,
      apply: (s) => ({ ...s, morale: Math.min(100, s.morale + 3), inventory: { ...s.inventory, flour: Math.max(0, (s.inventory.flour ?? 0) - 5) } })
    }
  ]
};

// --- Personal ---
const personal_quarrel: GameEvent = {
  id: 'personal_quarrel',
  category: 'personal',
  title: 'A quarrel breaks out',
  body: 'Tensions boil over. Harsh words pass between party members.',
  weight: 2,
  choices: [
    {
      id: 'mediate',
      label: 'Mediate',
      isDefault: true,
      apply: (s) => ({ ...s, morale: Math.max(0, s.morale - 1) })
    }
  ]
};

const personal_prayer: GameEvent = {
  id: 'personal_prayer',
  category: 'personal',
  title: 'A quiet evening prayer',
  body: 'Someone leads a short prayer at the campfire.',
  weight: 2,
  choices: [
    {
      id: 'join',
      label: 'Join',
      isDefault: true,
      apply: (s) => ({ ...s, morale: Math.min(100, s.morale + 1) })
    }
  ]
};

EVENTS.push(cholera_scare, snakebite, berry_patch, abandoned_cache, fresh_spring, emigrant_party, abandoned_wagon, lost_child, personal_quarrel, personal_prayer);
```

Then run, commit: `feat(events): add 10 health, finds, encounter, and personal events`.

---

## Task 4: Historical year/month-gated events (~6 events)

**Files:**
- Modify: `src/lib/game/content/events.ts`

Add events that only fire in specific year ranges:

```ts
import { yearAtLeast, yearBetween } from './event-gating';

const donner_rumor: GameEvent = {
  id: 'historical_donner',
  category: 'historical',
  title: 'News of the Donner Party',
  body: 'A returning traveler tells a chilling story of a party caught in the mountains last winter.',
  weight: 2,
  gate: yearAtLeast(1847),
  choices: [
    {
      id: 'heed',
      label: 'Heed the warning',
      isDefault: true,
      apply: (s) => ({ ...s, morale: Math.max(0, s.morale - 2), flags: { ...s.flags, donner_warning_heard: true } })
    }
  ]
};

const gold_rush_news: GameEvent = {
  id: 'historical_gold',
  category: 'historical',
  title: 'Word of gold in California',
  body: 'Travelers speak excitedly of nuggets as big as walnuts picked straight out of the streams.',
  weight: 3,
  gate: yearAtLeast(1849),
  choices: [
    {
      id: 'stay_course',
      label: 'Stay on the Oregon Trail',
      isDefault: true,
      apply: (s) => ({ ...s, morale: Math.min(100, s.morale + 1) })
    }
  ]
};

const cholera_peak_1852: GameEvent = {
  id: 'historical_cholera_1852',
  category: 'health',
  title: 'Cholera sweeps the trail',
  body: '1852 is a cruel year. Graves line the way.',
  weight: 6,  // extra high weight for 1852
  gate: yearBetween(1852, 1852),
  choices: [
    {
      id: 'keep_moving',
      label: 'Keep moving',
      isDefault: true,
      apply: (s, rng) => {
        // 50% chance of cholera onset on a random alive member
        if (rng.chance(0.5)) {
          const alive = s.party.filter(m => !m.dead);
          if (alive.length > 0) {
            const victim = alive[rng.int(0, alive.length - 1)];
            return {
              ...s,
              party: s.party.map(m => m.id === victim.id ? { ...m, conditions: [...m.conditions, { id: 'cholera', daysSinceOnset: 0 }] } : m)
            };
          }
        }
        return s;
      }
    }
  ]
};

const mormon_handcart: GameEvent = {
  id: 'historical_mormon',
  category: 'encounter',
  title: 'A Mormon handcart company',
  body: 'A line of men, women, and children pushing and pulling handcarts westward.',
  weight: 2,
  gate: yearBetween(1856, 1860),
  choices: [
    {
      id: 'share',
      label: 'Share a meal',
      isDefault: true,
      apply: (s) => ({
        ...s,
        morale: Math.min(100, s.morale + 2),
        inventory: { ...s.inventory, flour: Math.max(0, (s.inventory.flour ?? 0) - 5) }
      })
    }
  ]
};

const pony_express: GameEvent = {
  id: 'historical_pony',
  category: 'encounter',
  title: 'A Pony Express rider',
  body: 'A rider thunders past, bags bulging with mail. He shouts news of the east.',
  weight: 2,
  gate: yearBetween(1860, 1861),
  choices: [
    {
      id: 'cheer',
      label: 'Cheer him on',
      isDefault: true,
      apply: (s) => ({ ...s, morale: Math.min(100, s.morale + 2) })
    }
  ]
};

const spring_flood: GameEvent = {
  id: 'weather_flood',
  category: 'weather',
  title: 'Spring flooding',
  body: 'Swollen creeks overflow into the trail.',
  weight: 3,
  gate: monthIs(3, 4, 5),
  choices: [
    {
      id: 'detour',
      label: 'Detour around the flood',
      isDefault: true,
      apply: (s) => ({ ...s, location: { ...s.location, milesTraveled: Math.max(0, s.location.milesTraveled - 8) } })
    }
  ]
};

EVENTS.push(donner_rumor, gold_rush_news, cholera_peak_1852, mormon_handcart, pony_express, spring_flood);
```

Commit: `feat(events): add 6 year/month-gated historical events`.

---

## Task 5: Integration test + tuning pass

**Files:**
- Create: `tests/events-integration.test.ts`
- Tuning: adjust `BASE_FIRE_CHANCE` or event weights if events fire too often / too rarely

### Step 1 — Integration test

Create `tests/events-integration.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createInitialState, tickDay } from '../src/lib/game/engine';
import { camp } from '../src/lib/game/actions/camp';
import { rest } from '../src/lib/game/actions/rest';

function newGame(seed = 'events-integration') {
  return createInitialState({
    seed,
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [
      { name: 'Mary', profession: 'doctor' },
      { name: 'Tom', profession: 'hunter' },
      { name: 'Sarah', profession: 'teamster' }
    ],
    startDate: { year: 1848, month: 4, day: 15 }
  });
}

describe('100-day run with events', () => {
  it('fires multiple distinct events across a long journey', () => {
    let s = newGame();
    for (let cycle = 0; cycle < 20 && !s.completed; cycle++) {
      for (let d = 0; d < 4; d++) s = tickDay(s);
      s = camp(s, {});
      s = rest(s, 1);
    }
    // Count unique event logs — events prepend the event title, which is distinctive.
    const eventLines = s.eventLog.filter((e) =>
      /thunderstorm|heat wave|fog|snowfall|wheel|lame|shoe|tongue|canvas|wander|berries|cache|spring|wagon train|abandoned wagon|lost child|quarrel|prayer|Donner|gold|handcart|Pony|flood/.test(e.text)
    );
    expect(eventLines.length).toBeGreaterThanOrEqual(3);
  });

  it('is deterministic across runs', () => {
    function run() {
      let s = newGame();
      for (let cycle = 0; cycle < 10; cycle++) {
        for (let d = 0; d < 4; d++) s = tickDay(s);
        s = camp(s, {});
        s = rest(s, 1);
      }
      return s;
    }
    expect(run()).toEqual(run());
  });

  it('1852 game sees the cholera-peak event at higher rates than 1848', () => {
    function runYear(year: number): number {
      let s = createInitialState({
        seed: `year-${year}`,
        leader: { name: 'A', profession: 'farmer' },
        companions: [{ name: 'B', profession: 'doctor' }],
        startDate: { year, month: 4, day: 15 }
      });
      for (let d = 0; d < 60; d++) s = tickDay(s);
      return s.eventLog.filter((e) => e.text.includes('1852')).length;
    }
    // Only 1852 should see the peak event.
    expect(runYear(1852)).toBeGreaterThan(0);
    expect(runYear(1848)).toBe(0);
  });
});
```

### Step 2 — Tune if needed

Run `npm test -- tests/events-integration.test.ts`. If events fire too rarely or too often, tune either:
- `BASE_FIRE_CHANCE` in `src/lib/game/systems/events.ts` (currently 0.30)
- Individual event weights
- The cooldown logic

Document any tuning in the commit message.

### Step 3 — Commit

```bash
npm test
npm run check
git add -A
git commit -m "feat(events): integration test + tuning"
```

---

## Verification Checklist

- [ ] `npm test` all pass (206 + ~25 new = ~230+).
- [ ] `npm run check` 0 errors.
- [ ] `src/lib/game/content/events.ts` has ≥26 events across categories.
- [ ] `src/lib/game/systems/events.ts` has `rollEvent`, `resolveEvent`, `fireEvent`.
- [ ] `fireEvent` is wired into `tickDay` between `applyTravel` and `attemptFire`.
- [ ] Integration test shows multiple events fire in a 100-day run.
- [ ] Year-gated events only fire in their window.

---

## Handoff to Plan 4

Plan 4 (UI) will:
- Wire the **manual** event resolution path: pause `tickDay` when an event fires, show a modal, let the player pick a choice, then call `resolveEvent(state, event, choiceId, rng)` and resume.
- Render the landmark-reach log, party/inventory panel, and map.
- Add party-setup wizard.
- Add save/load screen.

Plan 5 (polish) will:
- Expand the event catalog to 60–80 entries
- Tune weights based on playtesting
- Add Native American and bandit event branches (deferred from Plan 3b scope)
- Add landmark-triggered auto-events (Soda Springs hot spring, Independence Rock July 4, Chimney Rock morale spike)
