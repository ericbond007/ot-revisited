# Riding / Scout Horse — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional, named riding horse the party can own — a non-draft mount for scouting ahead and mounted hunting, with period-accurate cost/risk (grain, theft, prestige), rendered ridden out front of the wagon.

**Architecture:** A new `Horse` entity in a `horses[]` array on `GameState`, fully separate from `oxen[]` (never hitched, never in team/speed math). A `systems/horses.ts` daily tick mirrors the ox grain pattern. The mechanic surfaces through three existing systems (hunting, events, morale) plus a new `scoutAhead` action, an acquisition `buyHorse` function, livestock-panel UI, a scout-ahead button, and a `MountedRider` sprite drawn ahead of the team in `WagonScene`.

**Tech Stack:** TypeScript, SvelteKit, Svelte 5 runes, Vitest. Blender for the horse sprite asset (already prototyped; asset source = "Horse animest super pro", CC-BY-4.0).

**Spec:** `docs/superpowers/specs/2026-05-28-riding-scout-horse-design.md`

**Conventions (verified in-repo):**
- State is immutable; every system returns a new `GameState` (`{ ...state, ... }`).
- Log lines: `eventLog: [...state.eventLog, { day: state.day, text }]`. Events use the `logLine(state, text)` helper from `content/events.ts`.
- Grain item id is `'grain'`; quantities live in `state.inventory.grain` (lb).
- Daily systems have signature `(state: GameState, rng: Rng) => GameState` and are composed in `DAILY_STEPS` in `src/lib/game/engine.ts`.
- Tests: Vitest. Build state with `createInitialState(...)` from `engine.ts`, rng with `makeRng(seed)` from `src/lib/game/rng.ts`. Run one file: `npx vitest run tests/<file>.test.ts`. Typecheck: `npm run check`.

---

## Task 1: `Horse` type + `GameState.horses`

**Files:**
- Modify: `src/lib/game/types.ts` (after the `Ox` interface ~line 90–103; and `GameState` ~line 194 after `oxen: Ox[];`)
- Test: `tests/horses.test.ts` (create)

- [ ] **Step 1: Write the failing test**

```typescript
// tests/horses.test.ts
import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/lib/game/engine';

function freshState() {
  return createInitialState({
    seed: 't',
    leader: { name: 'A', profession: 'farmer' },
    companions: [{ name: 'B', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
}

describe('GameState.horses', () => {
  it('starts as an empty array', () => {
    expect(freshState().horses).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it, confirm it fails**

Run: `npx vitest run tests/horses.test.ts`
Expected: FAIL — `horses` is `undefined` (or a type error after Step 3's type lands).

- [ ] **Step 3: Add the `Horse` type** in `src/lib/game/types.ts` immediately after the `Ox` interface:

```typescript
export type HorseColor = 'bay' | 'black' | 'gray' | 'palomino';

export interface Horse {
  id: string;
  name: string;        // e.g. "Dusty"
  color: HorseColor;   // selects the rendered walk-cycle sprite set
  health: number;      // 0..100
}
```

- [ ] **Step 4: Add the field to `GameState`** in `src/lib/game/types.ts`, directly after `oxen: Ox[];`:

```typescript
  oxen: Ox[];
  horses: Horse[];
```

- [ ] **Step 5: Initialize it in `createInitialState`** in `src/lib/game/engine.ts`. After the `const oxen = Array.from(...)` block, add `const horses: Horse[] = [];` and add `horses,` to the returned object directly after `oxen,`. Add `Horse` to the `types` import at the top of `engine.ts`.

```typescript
  const horses: import('./types').Horse[] = [];
  // ... in the returned object:
  oxen,
  horses,
```

- [ ] **Step 6: Run the test + typecheck**

Run: `npx vitest run tests/horses.test.ts` → PASS
Run: `npm run check` → 0 errors

- [ ] **Step 7: Commit**

```bash
git add src/lib/game/types.ts src/lib/game/engine.ts tests/horses.test.ts
git commit -m "feat(horse): add Horse type + GameState.horses (#216 follow-on)"
```

---

## Task 2: `systems/horses.ts` — daily grain upkeep

Each living horse eats 2 lb grain/day (drawn AFTER mules/oxen, which tick first). Fed → +1 HP/day (gentle, capped 100). Unfed → −3 HP/day + a log line. A horse at 0 HP dies: removed from `horses[]`, logged, −3 morale.

**Files:**
- Create: `src/lib/game/systems/horses.ts`
- Modify: `src/lib/game/engine.ts` (`DAILY_STEPS`, insert after `tickOxen,`)
- Test: `tests/horses.test.ts`

- [ ] **Step 1: Write failing tests** (append to `tests/horses.test.ts`)

```typescript
import { tickHorses } from '../src/lib/game/systems/horses';
import { makeRng } from '../src/lib/game/rng';
import type { Horse, GameState } from '../src/lib/game/types';

function withHorses(horses: Horse[], grain = 100): GameState {
  const s = freshState();
  return { ...s, horses, inventory: { ...s.inventory, grain } };
}
const horse = (o: Partial<Horse> = {}): Horse => ({ id: 'h1', name: 'Dusty', color: 'bay', health: 90, ...o });

describe('tickHorses', () => {
  it('no-ops with no horses', () => {
    const s = withHorses([]);
    expect(tickHorses(s, makeRng('t')).horses).toEqual([]);
  });

  it('feeds 2 lb grain per horse and recovers +1 HP', () => {
    const s = withHorses([horse({ health: 90 })], 10);
    const next = tickHorses(s, makeRng('t'));
    expect(next.inventory.grain).toBe(8);
    expect(next.horses[0].health).toBe(91);
  });

  it('unfed horse loses 3 HP and logs', () => {
    const s = withHorses([horse({ health: 50 })], 0);
    const next = tickHorses(s, makeRng('t'));
    expect(next.horses[0].health).toBe(47);
    expect(next.eventLog.some((l) => /without feed/i.test(l.text))).toBe(true);
  });

  it('removes a horse that reaches 0 HP and drops morale', () => {
    const s = withHorses([horse({ health: 2 })], 0);
    const next = tickHorses(s, makeRng('t'));
    expect(next.horses).toHaveLength(0);
    expect(next.morale).toBe(s.morale - 3);
  });
});
```

- [ ] **Step 2: Run, confirm fail**

Run: `npx vitest run tests/horses.test.ts`
Expected: FAIL — `tickHorses` not exported.

- [ ] **Step 3: Implement `src/lib/game/systems/horses.ts`**

```typescript
import type { GameState, Horse } from '../types';
import type { Rng } from '../rng';

export const GRAIN_LB_PER_HORSE = 2;
const UNFED_HP_LOSS = 3;
const FED_HP_RECOVERY = 1;
const DEATH_MORALE_HIT = 3;

/** Daily upkeep for riding horses. Runs after oxen/mules have claimed grain. */
export function tickHorses(state: GameState, _rng: Rng): GameState {
  const live = state.horses.filter((h) => h.health > 0);
  if (live.length === 0) return state;

  let grain = state.inventory.grain ?? 0;
  let unfed = 0;
  const fedHealth = state.horses.map((h) => {
    if (h.health <= 0) return h;
    if (grain >= GRAIN_LB_PER_HORSE) {
      grain -= GRAIN_LB_PER_HORSE;
      return { ...h, health: Math.min(100, h.health + FED_HP_RECOVERY) };
    }
    unfed += 1;
    return { ...h, health: Math.max(0, h.health - UNFED_HP_LOSS) };
  });

  const survivors = fedHealth.filter((h) => h.health > 0);
  const died = fedHealth.length - survivors.length;

  let log = state.eventLog;
  if (unfed > 0) {
    const noun = unfed === 1 ? 'horse went' : 'horses went';
    log = [...log, { day: state.day, text: `${unfed} ${noun} without feed today.` }];
  }
  if (died > 0) {
    const noun = died === 1 ? 'horse' : 'horses';
    log = [...log, { day: state.day, text: `${died} ${noun} died.` }];
  }

  return {
    ...state,
    horses: survivors,
    inventory: { ...state.inventory, grain },
    morale: Math.max(0, state.morale - died * DEATH_MORALE_HIT),
    eventLog: log
  };
}
```

- [ ] **Step 4: Wire into `DAILY_STEPS`** in `src/lib/game/engine.ts` — add the import and insert the step directly after `tickOxen,`:

```typescript
import { tickHorses } from './systems/horses';
// ... in DAILY_STEPS:
  tickOxen,
  tickHorses,
```

- [ ] **Step 5: Run tests + typecheck**

Run: `npx vitest run tests/horses.test.ts` → PASS
Run: `npm run check` → 0 errors

- [ ] **Step 6: Commit**

```bash
git add src/lib/game/systems/horses.ts src/lib/game/engine.ts tests/horses.test.ts
git commit -m "feat(horse): daily grain upkeep + starvation/death tick"
```

---

## Task 3: Mounted-hunting hook

Owning a healthy horse adds +10% hunt yield (stacks with hunter/dog/news) and, on a big-game hunt, a 3% chance the horse throws a hunter (−5..15 HP + broken_leg).

**Files:**
- Modify: `src/lib/game/actions/hunt.ts` (yield block after the news-bonus line; horse-throw roll after the grizzly-maul block)
- Test: `tests/hunt-horse.test.ts` (create)

- [ ] **Step 1: Write failing test**

```typescript
// tests/hunt-horse.test.ts
import { describe, it, expect } from 'vitest';
import { hunt } from '../src/lib/game/actions/hunt';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState, Horse } from '../src/lib/game/types';

function stateWith(horses: Horse[]): GameState {
  const s = createInitialState({
    seed: 't', leader: { name: 'A', profession: 'hunter' },
    companions: [], startDate: { year: 1848, month: 4, day: 15 }
  });
  return { ...s, horses, inventory: { ...s.inventory, gunpowder: 50, lead_balls: 50, percussion_caps: 50 } };
}
const horse = (o: Partial<Horse> = {}): Horse => ({ id: 'h1', name: 'Dusty', color: 'bay', health: 100, ...o });

describe('mounted hunting', () => {
  it('a healthy horse increases meat yield vs no horse (same seed)', () => {
    const opts = { target: 'small' as const, ammo: 'moderate' as const, hunters: 1 as const };
    const withoutH = hunt(stateWith([]), opts);
    const withH = hunt(stateWith([horse()]), opts);
    const meat = (s: GameState) => (s.inventory.fresh_meat ?? 0) + (s.inventory.jerky ?? 0) + (s.inventory.bacon ?? 0);
    expect(meat(withH)).toBeGreaterThan(meat(withoutH));
  });
});
```

> Note: confirm the meat item id(s) `hunt()` deposits (read `actions/hunt.ts`); adjust the `meat()` accessor to the real id(s) before running. The assertion is "with-horse > without-horse" on identical seed, so it is robust to the exact id as long as it's summed.

- [ ] **Step 2: Run, confirm fail** — `npx vitest run tests/hunt-horse.test.ts` (FAIL: yields equal).

- [ ] **Step 3: Add the yield multiplier** in `actions/hunt.ts`, immediately after the news-bonus line (`if (huntBonusUntil > s.day) yieldMultiplier += 0.25;`):

```typescript
  // Mounted hunting (#216): a horse covers ground and flushes/runs down game.
  const liveHorses = s.horses.filter((h) => h.health > 0).length;
  if (liveHorses > 0) yieldMultiplier += 0.1;
```

- [ ] **Step 4: Add the horse-throw injury roll** at the end of the injury section (after the grizzly-maul block), guarded to big-game hunts with a live horse:

```typescript
  // Mounted big-game hunt risk: the horse can throw a rider.
  if (opts.target === 'big' && s.horses.some((h) => h.health > 0) && rng.chance(0.03)) {
    const alive = s.party.filter((m) => !m.dead && m.kind === 'adult');
    if (alive.length > 0) {
      const victim = alive[rng.int(0, alive.length - 1)];
      const dmg = rng.int(5, 15);
      s = {
        ...s,
        party: s.party.map((m) =>
          m.id === victim.id
            ? { ...m, health: Math.max(0, m.health - dmg), conditions: [...m.conditions, { id: 'broken_leg', daysSinceOnset: 0 }] }
            : m
        ),
        eventLog: [...s.eventLog, { day: s.day, text: `${victim.name} was thrown from the horse during the hunt.` }]
      };
    }
  }
```

- [ ] **Step 5: Run tests + typecheck** — `npx vitest run tests/hunt-horse.test.ts` → PASS; `npm run check` → 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/game/actions/hunt.ts tests/hunt-horse.test.ts
git commit -m "feat(horse): mounted hunting yield bonus + throw-injury risk"
```

---

## Task 4: Horse-ownership prestige (morale)

Owning ≥1 living horse adds +1 to the daily morale delta (sign of means).

**Files:**
- Modify: `src/lib/game/systems/morale.ts` (`adjustMorale`, in the delta-accumulation block before the floor clamp)
- Test: `tests/morale-horse.test.ts` (create)

- [ ] **Step 1: Write failing test**

```typescript
// tests/morale-horse.test.ts
import { describe, it, expect } from 'vitest';
import { adjustMorale } from '../src/lib/game/systems/morale';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { Horse } from '../src/lib/game/types';

const base = () => createInitialState({ seed: 't', leader: { name: 'A', profession: 'farmer' }, companions: [], startDate: { year: 1848, month: 4, day: 15 } });
const horse: Horse = { id: 'h1', name: 'Dusty', color: 'bay', health: 100 };

describe('horse prestige morale', () => {
  it('owning a horse yields higher morale than not, same day', () => {
    const s = { ...base(), morale: 50 };
    const without = adjustMorale(s, makeRng('t')).morale;
    const withH = adjustMorale({ ...s, horses: [horse] }, makeRng('t')).morale;
    expect(withH).toBeGreaterThan(without);
  });
});
```

- [ ] **Step 2: Run, confirm fail** — `npx vitest run tests/morale-horse.test.ts`.

- [ ] **Step 3: Add the bump** in `systems/morale.ts`, alongside the other flat delta lines (e.g. after `if (state.dog) delta += 1;`):

```typescript
  if (state.horses.some((h) => h.health > 0)) delta += 1; // owning a horse — a mark of means
```

- [ ] **Step 4: Run tests + typecheck** → PASS; `npm run check` → 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/game/systems/morale.ts tests/morale-horse.test.ts
git commit -m "feat(horse): ownership prestige morale bump"
```

---

## Task 5: Horse-theft event

Gated on owning a living horse. Tracking the thief recovers it (dog improves odds); failure permanently removes a named horse (−5 morale). Mirrors the existing `mule_theft` event.

**Files:**
- Modify: `src/lib/game/content/events.ts` (add `horse_theft`, `EVENTS.push(horse_theft)`, near `mule_theft`)
- Test: `tests/event-horse-theft.test.ts` (create)

- [ ] **Step 1: Write failing test**

```typescript
// tests/event-horse-theft.test.ts
import { describe, it, expect } from 'vitest';
import { EVENTS } from '../src/lib/game/content/events';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { Horse } from '../src/lib/game/types';

const horse: Horse = { id: 'h1', name: 'Dusty', color: 'bay', health: 100 };
const base = () => createInitialState({ seed: 't', leader: { name: 'A', profession: 'farmer' }, companions: [], startDate: { year: 1848, month: 4, day: 15 } });
const theft = () => EVENTS.find((e) => e.id === 'horse_theft')!;

describe('horse_theft event', () => {
  it('exists and gates on owning a live horse', () => {
    const e = theft();
    expect(e).toBeTruthy();
    expect(e.gate!({ ...base(), horses: [] })).toBe(false);
    expect(e.gate!({ ...base(), horses: [horse] })).toBe(true);
  });

  it('a failed track removes a horse', () => {
    const e = theft();
    const choice = e.choices[0];
    // makeRng seed chosen so the recovery roll fails — sweep a few if needed.
    let removed = false;
    for (const seed of ['a','b','c','d','e','f']) {
      const out = choice.apply({ ...base(), horses: [horse], dog: undefined }, makeRng(seed));
      if (out.horses.length === 0) { removed = true; break; }
    }
    expect(removed).toBe(true);
  });
});
```

- [ ] **Step 2: Run, confirm fail** — `npx vitest run tests/event-horse-theft.test.ts`.

- [ ] **Step 3: Add the event** in `content/events.ts` (right after the `mule_theft` definition + its `EVENTS.push`), using the file's existing `logLine` helper:

```typescript
const horse_theft: GameEvent = {
  id: 'horse_theft',
  category: 'encounter',
  title: 'A horse is missing at dawn',
  body: 'The tether is cut clean and hoofprints lead off into the dark. A horse is worth stealing — and someone knew it.',
  weight: 3,
  gate: (s) => s.horses.some((h) => h.health > 0),
  choices: [
    {
      id: 'track_thief',
      icon: '🔍',
      label: 'Track the thief at first light',
      isDefault: true,
      silentLog: true,
      apply: (s, rng) => {
        const recovered = rng.chance(s.dog ? 0.6 : 0.3);
        if (recovered) return logLine(s, 'You ran the thief down and brought your horse back.');
        const idx = s.horses.findIndex((h) => h.health > 0);
        const lost = idx >= 0 ? s.horses[idx].name : 'A horse';
        const next = idx >= 0 ? { ...s, horses: s.horses.filter((_, i) => i !== idx) } : s;
        return logLine({ ...next, morale: Math.max(0, s.morale - 5) }, `${lost} was gone for good. Morale −5.`);
      }
    },
    {
      id: 'let_go',
      icon: '🤷',
      label: 'Let it go — too risky to chase',
      silentLog: true,
      apply: (s) => {
        const idx = s.horses.findIndex((h) => h.health > 0);
        const lost = idx >= 0 ? s.horses[idx].name : 'A horse';
        const next = idx >= 0 ? { ...s, horses: s.horses.filter((_, i) => i !== idx) } : s;
        return logLine({ ...next, morale: Math.max(0, s.morale - 3) }, `${lost} was lost to the thief. Morale −3.`);
      }
    }
  ]
};
EVENTS.push(horse_theft);
```

- [ ] **Step 4: Run tests + typecheck** → PASS; `npm run check` → 0 errors.

- [ ] **Step 5: Add a `horse_stampede` injury/loss event** in the same file, identical structure (gate on a living horse). On fire, a river-ford or stampede scares the horse: 60% it's injured (−`rng.int(15,35)` HP on a chosen horse, logged), 40% it bolts and is lost (remove it, −4 morale). This covers the spec's "ford/stampede injury" lever. Add a test in `tests/event-horse-theft.test.ts` asserting the event exists and its gate matches `horse_theft`'s.

```typescript
const horse_stampede: GameEvent = {
  id: 'horse_stampede',
  category: 'encounter',
  title: 'The horse spooks',
  body: 'A snake, a thunderclap, the churn of a bad ford — the horse rears and bolts.',
  weight: 2,
  gate: (s) => s.horses.some((h) => h.health > 0),
  choices: [
    {
      id: 'settle',
      icon: '🐎',
      label: 'Fight to settle it',
      isDefault: true,
      silentLog: true,
      apply: (s, rng) => {
        const idx = s.horses.findIndex((h) => h.health > 0);
        if (idx < 0) return s;
        if (rng.chance(0.6)) {
          const dmg = rng.int(15, 35);
          const horses = s.horses.map((h, i) => (i === idx ? { ...h, health: Math.max(0, h.health - dmg) } : h));
          return logLine({ ...s, horses }, `${s.horses[idx].name} was hurt in the panic.`);
        }
        const name = s.horses[idx].name;
        return logLine({ ...s, horses: s.horses.filter((_, i) => i !== idx), morale: Math.max(0, s.morale - 4) }, `${name} bolted and was lost. Morale −4.`);
      }
    }
  ]
};
EVENTS.push(horse_stampede);
```

- [ ] **Step 6: Run tests + typecheck** → PASS; `npm run check` → 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/game/content/events.ts tests/event-horse-theft.test.ts
git commit -m "feat(horse): horse-theft + stampede events gated on ownership"
```

---

## Task 6: Acquisition — `buyHorse` (outfitter + posts)

A single `buyHorse(state, opts)` used by both the game-start outfitter and trading posts. Deducts cash, appends a named horse with a chosen/random color. Period names live in a small constant.

**Files:**
- Create: `src/lib/game/systems/horse-trade.ts`
- Test: `tests/horse-trade.test.ts` (create)

- [ ] **Step 1: Write failing test**

```typescript
// tests/horse-trade.test.ts
import { describe, it, expect } from 'vitest';
import { buyHorse, HORSE_PRICE } from '../src/lib/game/systems/horse-trade';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';

const base = () => createInitialState({ seed: 't', leader: { name: 'A', profession: 'farmer' }, companions: [], startDate: { year: 1848, month: 4, day: 15 } });

describe('buyHorse', () => {
  it('adds a named horse and deducts cash', () => {
    const s = { ...base(), cash: 500 };
    const out = buyHorse(s, { color: 'bay' }, makeRng('t'));
    expect(out.horses).toHaveLength(1);
    expect(out.horses[0].color).toBe('bay');
    expect(out.horses[0].name.length).toBeGreaterThan(0);
    expect(out.horses[0].health).toBe(100);
    expect(out.cash).toBe(500 - HORSE_PRICE);
  });

  it('throws when cash is short', () => {
    const s = { ...base(), cash: 10 };
    expect(() => buyHorse(s, { color: 'gray' }, makeRng('t'))).toThrow(/cash/i);
  });
});
```

- [ ] **Step 2: Run, confirm fail** — `npx vitest run tests/horse-trade.test.ts`.

- [ ] **Step 3: Implement `src/lib/game/systems/horse-trade.ts`**

```typescript
import type { GameState, Horse, HorseColor } from '../types';
import type { Rng } from '../rng';

export const HORSE_PRICE = 75; // period-accurate ($50–100); tune in balance pass

const HORSE_NAMES = ['Dusty', 'Bess', 'Comet', 'Banjo', 'Pearl', 'Scout', 'Major', 'Belle', 'Ranger', 'Dolly'];

export interface BuyHorseOpts {
  color: HorseColor;
  name?: string;
  price?: number; // override (e.g. outfitter vs post)
}

export function buyHorse(state: GameState, opts: BuyHorseOpts, rng: Rng): GameState {
  const price = opts.price ?? HORSE_PRICE;
  if (state.cash < price) throw new Error(`buyHorse: not enough cash (need ${price}, have ${state.cash})`);
  const name = opts.name ?? HORSE_NAMES[rng.int(0, HORSE_NAMES.length - 1)];
  const id = `horse-${state.day}-${state.horses.length}`;
  const horse: Horse = { id, name, color: opts.color, health: 100 };
  return {
    ...state,
    cash: state.cash - price,
    horses: [...state.horses, horse],
    eventLog: [...state.eventLog, { day: state.day, text: `Bought a ${opts.color} horse, "${name}", for $${price}.` }]
  };
}
```

- [ ] **Step 4: Run tests + typecheck** → PASS; `npm run check` → 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/game/systems/horse-trade.ts tests/horse-trade.test.ts
git commit -m "feat(horse): buyHorse acquisition (outfitter + posts)"
```

> **Wiring note (handled in UI Tasks 9–10 + outfitter):** the outfitter (game-start) and trading-post screens call `buyHorse`. The post path should require being at a landmark with a horse-trade service; reuse the `state.location.atLandmarkId` + service-list guard pattern from `swapOxen` in `systems/town-services.ts`. Native-trade / found-stray acquisition is a follow-up event (same `buyHorse`/append pattern) — out of v1 scope unless time allows.

---

## Task 7: `scoutAhead` action

Active action requiring a living horse. Reveals a next-leg report (terrain, river-ford difficulty, hazard, game-nearby), sets a `_scoutedUntilDay` flag that softens the next bad-surprise, and applies a small (−2 HP) ride cost plus an encounter chance.

**Files:**
- Create: `src/lib/game/actions/scout.ts`
- Test: `tests/scout.test.ts` (create)

- [ ] **Step 1: Write failing test**

```typescript
// tests/scout.test.ts
import { describe, it, expect } from 'vitest';
import { scoutAhead, canScout } from '../src/lib/game/actions/scout';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { Horse } from '../src/lib/game/types';

const horse: Horse = { id: 'h1', name: 'Dusty', color: 'bay', health: 100 };
const base = () => createInitialState({ seed: 't', leader: { name: 'A', profession: 'farmer' }, companions: [], startDate: { year: 1848, month: 4, day: 15 } });

describe('scoutAhead', () => {
  it('canScout is false without a horse, true with one', () => {
    expect(canScout(base())).toBe(false);
    expect(canScout({ ...base(), horses: [horse] })).toBe(true);
  });

  it('logs a recon report, sets the scouted flag, and costs the horse 2 HP', () => {
    const s = { ...base(), horses: [horse] };
    const out = scoutAhead(s, makeRng('t'));
    expect(out.eventLog.length).toBeGreaterThan(s.eventLog.length);
    expect(out.flags._scoutedUntilDay).toBeGreaterThan(s.day);
    expect(out.horses[0].health).toBe(98);
  });

  it('throws without a horse', () => {
    expect(() => scoutAhead(base(), makeRng('t'))).toThrow(/horse/i);
  });
});
```

- [ ] **Step 2: Run, confirm fail** — `npx vitest run tests/scout.test.ts`.

- [ ] **Step 3: Implement `src/lib/game/actions/scout.ts`**

```typescript
import type { GameState } from '../types';
import type { Rng } from '../rng';

export function canScout(state: GameState): boolean {
  return state.horses.some((h) => h.health > 0);
}

/** Ride ahead on a horse: report the next leg + soften the next bad surprise. */
export function scoutAhead(state: GameState, rng: Rng): GameState {
  if (!canScout(state)) throw new Error('scoutAhead: no living horse to ride');

  const terrain = state.location.terrain;
  const gameNearby = rng.chance(terrain === 'prairie' ? 0.6 : 0.35);
  const report =
    `Rode ahead: ${terrain} country up the trail` +
    (gameNearby ? ', and fresh sign of game.' : ', no game spotted.');

  // Soften the next bad surprise for a short window (read by event weighting later).
  const flags = { ...state.flags, _scoutedUntilDay: state.day + 2 };

  // Small ride cost on the lead horse.
  const idx = state.horses.findIndex((h) => h.health > 0);
  const horses = state.horses.map((h, i) => (i === idx ? { ...h, health: Math.max(0, h.health - 2) } : h));

  return {
    ...state,
    horses,
    flags,
    eventLog: [...state.eventLog, { day: state.day, text: report }]
  };
}
```

- [ ] **Step 4: Run tests + typecheck** → PASS; `npm run check` → 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/game/actions/scout.ts tests/scout.test.ts
git commit -m "feat(horse): scoutAhead action (recon + forewarned flag)"
```

> **Follow-up integration (small, do in this task if quick):** in `systems/events.ts` `effectiveWeight`, when `state.flags._scoutedUntilDay > state.day`, multiply weather/wagon/terrain "bad surprise" categories by ~0.8. Add a one-line test in `tests/scout.test.ts` asserting the multiplier path. Scout-profession synergy (reveal two legs) is a later enhancement — leave a `// TODO(#216): scout-profession deepens recon` only if you also file the issue; otherwise omit.

---

## Task 8: Render asset — saddled + ridden horse sprites (4 colors)

Produce the in-place walk-cycle sprites with a saddle and seated rider baked on, in bay/black/gray/palomino, matching the ox/mule sprite pipeline. The bare-horse prototype + tinting already exist (`/tmp/horse_set.py`, source `animest-pro.glb`, CC-BY-4.0). This task adds tack + rider and finalizes into the repo.

**Files:**
- Create: `static/wagon-bg/wagon-blender/horse-walk-frames/` and `…-black/`, `…-gray/`, `…-palomino/` (24 PNGs each)
- Create/Modify: a render recipe under `tools/blender/` (extend `/tmp/horse_set.py` into a tracked `tools/blender/render-horse-set.sh` + `tools/blender/render_horse.py`)

This is asset production, not unit-testable; verify visually + by file shape.

- [ ] **Step 1: Bake saddle + rider** — extend the horse render script to (a) import the saddle mesh from the saddled-horse model (Ayan, CC-BY) OR model a simple saddle, fitted to the animest-pro back; (b) import + seat the cowboy rider (`tools/blender/models/cowboy-driver.glb` via `pose_cowboy_seated.py`), parented to the horse's spine/back bone so it rides with the walk. Reuse the root-anchored, per-frame-centered camera + 24-frame sampling from `/tmp/horse_set.py` (already produces clean in-place walks).

- [ ] **Step 2: Render all four colors** at 24 frames, 512×512, transparent, side profile (facing left, matching ox/mule). Apply the HSV coat tints (bay = native baked fur; black/gray/palomino as in `/tmp/horse_set.py`).

- [ ] **Step 3: Union-crop** all 96 frames (4×24) to one shared bbox (PIL, same routine used for the mule set). Record the cropped aspect ratio for the Svelte component (the bare horse was ≈1.20; re-measure after rider is added).

- [ ] **Step 4: Stage into the repo**

```bash
cd static/wagon-bg/wagon-blender
for c in "" -black -gray -palomino; do dir="horse-walk-frames$c"; mkdir -p "$dir"; done
# copy the 24 cropped frames per color as walk--00.png … walk--23.png (bay = no-suffix dir)
```

- [ ] **Step 5: Visual verify** — open the frames cycling (the `nocache_server.py` gallery pattern) and confirm: saddle + rider sit correctly, walk is smooth (no jitter), all four colors read, feet plant on a consistent baseline.

- [ ] **Step 6: Commit**

```bash
git add tools/blender/render_horse.py tools/blender/render-horse-set.sh static/wagon-bg/wagon-blender/horse-walk-frames*/
git commit -m "feat(horse): saddled+ridden walk sprites, 4 colors (CC-BY animest-pro)"
```

> **Risk note:** baking the saddle/rider onto a different horse mesh is the same fiddly fit-work as the mule yoke (see `project_mule_rig_findings`). Budget iteration. If the bake fights you, an SVG saddle/rider overlay in the `MountedRider` component (Task 10) is the fallback — but try the bake first for consistency with the ox/mule.

---

## Task 9: Livestock-panel UI — list horses

**Files:**
- Modify: `src/lib/ui/InventoryPanel.svelte` (livestock section, alongside oxen/cows)

- [ ] **Step 1:** In the livestock section, add a horses block rendered from `state.horses`, each row showing name, color, and a health bar/number — matching the existing oxen/cow row markup.

```svelte
{#if state.horses.length > 0}
  <div class="livestock-group">
    <h4>Horses</h4>
    {#each state.horses as h (h.id)}
      <div class="livestock-row">
        <span>{h.name}</span>
        <span class="muted">{h.color}</span>
        <span>{h.health}/100</span>
      </div>
    {/each}
  </div>
{/if}
```

- [ ] **Step 2: Typecheck + visual** — `npm run check` → 0 errors; open the inventory panel with a horse in state (dev sandbox or a seeded save) and confirm the row renders.

- [ ] **Step 3: Commit**

```bash
git add src/lib/ui/InventoryPanel.svelte
git commit -m "feat(horse): list horses in the livestock panel"
```

---

## Task 10: Wagon-scene render — `MountedRider` out front

**Files:**
- Create: `src/lib/ui/wagon/MountedRider.svelte`
- Modify: `src/lib/ui/wagon/WagonScene.svelte` (after the `<OxTeam>` `<g>` block, ~line 380)

- [ ] **Step 1: Create `MountedRider.svelte`** — a single `<image>` cycling the horse walk frames by `gaitPhase` (12→ now 24 frames), choosing the dir by color. Mirror `OxTeam`'s `blenderFrame` derivation but for 24 frames.

```svelte
<script lang="ts">
  import type { HorseColor } from '$lib/game/types';
  interface Props { gaitPhase: number; gait?: 'walking' | 'stopped'; color?: HorseColor; scale?: number; }
  let { gaitPhase, gait = 'walking', color = 'bay', scale = 1 }: Props = $props();
  const ASPECT = 1.20; // re-measure after rider bake (Task 8 Step 3)
  const frame = $derived(
    String(gait === 'stopped' ? 0 : Math.floor(((gaitPhase % 1) + 1) % 1 * 24) % 24).padStart(2, '0')
  );
  const dir = $derived(color === 'bay' ? 'horse-walk-frames' : `horse-walk-frames-${color}`);
  const w = $derived(20 * scale);          // tune to match ox/mule footprint
  const h = $derived((20 / ASPECT) * scale);
</script>
<image href="/wagon-bg/wagon-blender/{dir}/walk--{frame}.png"
       x={-w / 2} y={-10} width={w} height={h} preserveAspectRatio="xMidYMid meet" />
```

- [ ] **Step 2: Wire into `WagonScene.svelte`** after the `<OxTeam>` group. Render only when a live horse exists; place it ahead of the team (forward of `wagonTongueTipSceneX`). Reuse the existing `gaitPhase` clock.

```svelte
{#if state.horses.some((h) => h.health > 0)}
  <g transform="translate({wagonTongueTipSceneX - HORSE_LEAD_DX * SCENE_SCALE} {GROUND_Y}) scale({SCENE_SCALE})">
    <MountedRider {gaitPhase} gait={paused ? 'stopped' : 'walking'} color={state.horses.find((h) => h.health > 0)?.color} />
  </g>
{/if}
```

Add `const HORSE_LEAD_DX = 40;` near the other scene constants. (Subtract because the team faces/leads toward decreasing scene-X — confirm sign against the ox team's `pair.px` direction; the team is drawn at negative local X ahead of the tongue tip, so "out front" is further negative.) Import `MountedRider`.

- [ ] **Step 3: Verify in `/dev/wagon-view`** — add a "Horse (riding)" toggle to the dev page state (set `previewState.horses` to one bay horse), reload, and confirm the ridden horse walks out front of the wagon, in sync, feet on the baseline. Tune `HORSE_LEAD_DX`, `w/h scale`, and `y` so it sits right.

- [ ] **Step 4: Typecheck** — `npm run check` → 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ui/wagon/MountedRider.svelte src/lib/ui/wagon/WagonScene.svelte src/routes/dev/wagon-view/+page.svelte
git commit -m "feat(horse): render mounted rider out front of the wagon"
```

---

## Task 11: Scout-ahead button + outfitter/post buy UI

**Files:**
- Modify: the camp/travel action UI (locate the component that renders day-actions, e.g. the camp menu) — add a "Scout ahead" button gated on `canScout(state)` calling `scoutAhead`.
- Modify: the outfitter screen (game start) and trading-post screen — add a "Buy horse" option calling `buyHorse` (post path guarded by a horse-trade landmark service).

- [ ] **Step 1:** Find the action/menu component (grep for where `hunt`/existing actions are dispatched from the UI). Add a "Scout ahead 🐎" button, `disabled={!canScout(state)}`, that dispatches `scoutAhead`.

- [ ] **Step 2:** In the outfitter (game-start) flow, add a "Riding horse — $75" line item that calls `buyHorse(state, { color: 'bay' }, rng)` (color pick optional; default bay). Coordinate with the #1172 outfitter rework if it's mid-flight.

- [ ] **Step 3:** In the trading-post screen, add a "Buy horse" action when the current landmark offers horse trade; reuse the `swapOxen` landmark/service guard pattern.

- [ ] **Step 4: Typecheck + visual** — `npm run check` → 0 errors; smoke-test buying a horse at start and scouting on the trail.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(horse): scout-ahead button + outfitter/post buy UI"
```

---

## Final integration check

- [ ] Run the full suite: `npm test` → all green.
- [ ] `npm run check` → 0 errors.
- [ ] Manual playthrough: start with a horse from the outfitter → see it ridden out front → scout ahead (report + forewarned) → mounted hunt (bonus) → let grain run out (it starves) / trigger the theft event → confirm livestock panel reflects state throughout.
- [ ] Use `superpowers:finishing-a-development-branch` to open the PR (title references #216 follow-on / a new VK ticket for the riding-horse feature).

---

## Notes / deferred (per spec "Out of scope v1")

- Passive auto-scouting (own a horse → auto next-leg reveal).
- Native-trade / found-stray acquisition events (same `buyHorse`/append pattern; add post-v1).
- Breeding, multiple riders, mounted combat, cavalry profession, horse-specific vet services.
- Balance tuning (price, morale points, event weights, yield %) — dial against existing constants in a balance pass after the mechanic is in.
