# Plan 1: Foundation & Scaffolding — Hoosier Trail

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the SvelteKit + SQLite + Drizzle project and build the core game engine's foundation: `GameState` types, seeded RNG, a working day-tick turn engine, and persistent save/load — end state is a deterministic test proving you can seed a new game, tick forward days with food/water consumption scaling to party size, save it, reload it, and get identical state back.

**Architecture:** Game logic lives in `src/lib/game/` as pure, side-effect-free TypeScript functions. Persistence is handled through a separate `src/lib/db/` layer using Drizzle ORM over `better-sqlite3`. RNG is injected so all randomness is deterministic under a given seed. No UI in this plan — only the engine core and test harness.

**Tech Stack:** SvelteKit (TypeScript), Vitest, Drizzle ORM, `better-sqlite3`, Node.js ≥20.

**Companion spec:** `docs/superpowers/specs/2026-04-20-hoosier-trail-design.md` (sections §2 Architecture, §3 Data Model, §4 Game Loop, §10 Save Model).

---

## File Structure

### Files created in this plan

| Path | Responsibility |
|---|---|
| `package.json` | Project metadata, deps, scripts (created by `sv create`, modified) |
| `svelte.config.js` | SvelteKit config (default) |
| `vite.config.ts` | Vite + Vitest config (modified) |
| `tsconfig.json` | TypeScript config (created by `sv create`) |
| `drizzle.config.ts` | Drizzle migration config |
| `.env.example` | Committed template showing required env vars |
| `.gitignore` | Additions: `dev.db`, `.env` |
| `src/lib/game/types.ts` | `GameState`, `PartyMember`, `Ox`, `Condition`, etc. |
| `src/lib/game/rng.ts` | Seeded Mulberry32 PRNG |
| `src/lib/game/systems/consumption.ts` | Daily food & water deduction scaling with party size + rations |
| `src/lib/game/engine.ts` | `tickDay(state)` turn orchestrator |
| `src/lib/game/saves.ts` | `serialize(state)` / `deserialize(json)` helpers |
| `src/lib/db/schema.ts` | Drizzle schema for `devices` and `saves` |
| `src/lib/db/client.ts` | SQLite client singleton + migration runner |
| `src/lib/db/saves-repo.ts` | Per-device save slot persistence |
| `tests/rng.test.ts` | Seeded RNG determinism tests |
| `tests/consumption.test.ts` | Food/water scaling tests |
| `tests/engine.test.ts` | `tickDay` behavior tests |
| `tests/saves.test.ts` | Serialize/deserialize round-trip |
| `tests/smoke.test.ts` | End-to-end: new game → tick 10 days → save → load → match |
| `drizzle/0000_initial.sql` | Generated migration |

### Boundaries
- `src/lib/game/` is the pure game engine. No imports from `src/lib/db/`, no filesystem, no network, no DOM. Given the same inputs it returns the same outputs.
- `src/lib/db/` is the persistence layer. It imports types from `src/lib/game/types.ts` but the game never imports from here.
- Browser-side device cookie (read/write of the persisted device UUID) is deferred to Plan 4 when the UI exists. Plan 1's `SavesRepo.ensureDevice()` only creates device rows in the DB — Plan 4 wires that to the cookie lifecycle.
- `tests/` mirror `src/lib/game/` layout; each system gets its own test file.

---

## Prerequisites

- Node.js ≥20 installed (`node --version`).
- Working directory: `/home/eric/projects/hoosierTrail`.
- Existing git repo (initialized during brainstorming).

---

## Task 1: Initialize SvelteKit project

**Files:**
- Create: `package.json`, `svelte.config.js`, `vite.config.ts`, `tsconfig.json`, `src/app.html`, `src/routes/+page.svelte` (all via scaffold)

- [ ] **Step 1: Scaffold SvelteKit with TypeScript**

The `sv` CLI is the current canonical scaffold. Run it pointing at the current directory. Select minimal template, TypeScript (syntax only), no additional addons for now.

```bash
cd /home/eric/projects/hoosierTrail
npx sv@latest create . --template minimal --types ts --no-add-ons --install npm
```

Expected: creates `package.json`, `svelte.config.js`, `vite.config.ts`, `tsconfig.json`, `src/app.html`, `src/routes/+page.svelte`, installs deps.

If `sv` errors on non-empty dir: move `docs/` and `.gitignore` aside, scaffold, move them back. (Usually it accepts the existing dir as long as there's no `package.json` already.)

- [ ] **Step 2: Verify it builds**

```bash
npm run check
```

Expected: no errors (may print `0 errors, 0 warnings`).

- [ ] **Step 3: Verify dev server starts**

```bash
npm run dev
```

Expected: `Local: http://localhost:5173/`. Ctrl-C to stop.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: scaffold SvelteKit project with TypeScript"
```

---

## Task 2: Add Vitest testing framework

**Files:**
- Modify: `package.json` (add scripts + deps)
- Modify: `vite.config.ts` (add Vitest config)
- Create: `tests/sanity.test.ts`

- [ ] **Step 1: Install Vitest**

```bash
npm install -D vitest @vitest/ui
```

- [ ] **Step 2: Configure Vitest in `vite.config.ts`**

Open `vite.config.ts`. It was scaffolded like:

```ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()]
});
```

Replace the whole file with:

```ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node'
  }
});
```

- [ ] **Step 3: Add test scripts to `package.json`**

Find the `"scripts"` block and add `test` and `test:watch`:

```json
"scripts": {
  "dev": "vite dev",
  "build": "vite build",
  "preview": "vite preview",
  "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 4: Write a sanity test**

Create `tests/sanity.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('sanity', () => {
  it('runs tests', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run tests**

```bash
npm test
```

Expected: 1 test, 1 passed.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "test: add Vitest with sanity test"
```

---

## Task 3: Install Drizzle + SQLite

**Files:**
- Modify: `package.json`
- Create: `drizzle.config.ts`
- Create: `.env.example`
- Modify: `.gitignore`

- [ ] **Step 1: Install Drizzle runtime + dev tooling + SQLite driver**

```bash
npm install drizzle-orm better-sqlite3
npm install -D drizzle-kit @types/better-sqlite3
```

- [ ] **Step 2: Create `drizzle.config.ts`**

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'file:./dev.db'
  }
});
```

- [ ] **Step 3: Create `.env.example`**

```
DATABASE_URL=file:./dev.db
```

- [ ] **Step 4: Update `.gitignore`**

Ensure these lines are present (append if missing):

```
dev.db
dev.db-journal
.env
drizzle/meta
```

- [ ] **Step 5: Add Drizzle scripts to `package.json`**

In the `"scripts"` block, add:

```json
"db:generate": "drizzle-kit generate",
"db:push": "drizzle-kit push",
"db:studio": "drizzle-kit studio"
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: install Drizzle ORM and SQLite"
```

---

## Task 4: Define the Drizzle schema

**Files:**
- Create: `src/lib/db/schema.ts`
- Generate: `drizzle/0000_<hash>.sql`

- [ ] **Step 1: Write the schema**

Create `src/lib/db/schema.ts`:

```ts
import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const devices = sqliteTable('devices', {
  id: text('id').primaryKey(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`)
});

export const saves = sqliteTable(
  'saves',
  {
    id: text('id').primaryKey(),
    deviceId: text('device_id')
      .notNull()
      .references(() => devices.id, { onDelete: 'cascade' }),
    slotName: text('slot_name').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    gameState: text('game_state').notNull(),
    summary: text('summary').notNull()
  },
  (t) => ({
    uxDeviceSlot: uniqueIndex('ux_saves_device_slot').on(t.deviceId, t.slotName)
  })
);

export type Device = typeof devices.$inferSelect;
export type NewDevice = typeof devices.$inferInsert;
export type Save = typeof saves.$inferSelect;
export type NewSave = typeof saves.$inferInsert;
```

- [ ] **Step 2: Generate the first migration**

```bash
npm run db:generate
```

Expected: creates `drizzle/0000_<some_name>.sql` containing `CREATE TABLE devices`, `CREATE TABLE saves`, and the unique index.

- [ ] **Step 3: Verify the migration file**

```bash
cat drizzle/0000_*.sql
```

Expected output contains both `CREATE TABLE` statements and `CREATE UNIQUE INDEX`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/schema.ts drizzle/
git commit -m "feat(db): add devices and saves schema"
```

---

## Task 5: SQLite client + migration runner

**Files:**
- Create: `src/lib/db/client.ts`
- Create: `tests/db.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/db.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '../src/lib/db/client';
import { devices } from '../src/lib/db/schema';

describe('db client', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'htrail-'));
    dbPath = join(dir, 'test.db');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('creates tables after migrations', async () => {
    const { db, close } = createClient(dbPath);
    const rows = await db.select().from(devices).all();
    expect(rows).toEqual([]);
    close();
  });

  it('inserts and reads a device', async () => {
    const { db, close } = createClient(dbPath);
    await db.insert(devices).values({ id: 'dev-1' }).run();
    const rows = await db.select().from(devices).all();
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('dev-1');
    close();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test -- tests/db.test.ts
```

Expected: FAIL — `createClient is not a function` or module not found.

- [ ] **Step 3: Implement the client**

Create `src/lib/db/client.ts`:

```ts
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import * as schema from './schema';

const migrationsFolder = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../drizzle'
);

export function createClient(dbPath: string) {
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder });
  return {
    db,
    close: () => sqlite.close()
  };
}

export type AppDb = ReturnType<typeof createClient>['db'];
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm test -- tests/db.test.ts
```

Expected: both tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/client.ts tests/db.test.ts
git commit -m "feat(db): add SQLite client with automatic migrations"
```

---

## Task 6: Define core game types

**Files:**
- Create: `src/lib/game/types.ts`

No test in this task — types are verified structurally by their downstream consumers.

- [ ] **Step 1: Write the type module**

Create `src/lib/game/types.ts`:

```ts
// Core types for the Hoosier Trail game state.
// See spec §3.2 for the full data model.

export type Pace = 'slow' | 'moderate' | 'fast' | 'grueling';
export type Rations = 'meager' | 'normal' | 'filling';
export type Terrain = 'prairie' | 'forest' | 'desert' | 'mountains' | 'river';
export type Outcome = 'in-progress' | 'arrived' | 'wiped' | 'stranded';

export type ProfessionId =
  | 'banker'
  | 'farmer'
  | 'carpenter'
  | 'doctor'
  | 'blacksmith'
  | 'hunter'
  | 'teamster'
  | 'merchant'
  | 'whore'
  | 'scout'
  | 'preacher'
  | 'indian_trader'
  | 'gunsmith';

export type ConditionId =
  | 'cholera'
  | 'dysentery'
  | 'typhoid'
  | 'measles'
  | 'exhaustion'
  | 'broken_leg'
  | 'snakebite'
  | 'frostbite'
  | 'scurvy';

export interface Condition {
  id: ConditionId;
  daysSinceOnset: number;
}

export interface PartyMember {
  id: string;
  name: string;
  profession: ProfessionId;
  isLeader: boolean;
  age: number;
  health: number; // 0..100
  conditions: Condition[];
  dead: boolean;
  deathCause?: string;
  deathDay?: number;
}

export interface Ox {
  id: string;
  health: number; // 0..100
  fatigue: number; // 0..100
  shod: boolean;
}

export interface Wagon {
  condition: number; // 0..100
  carryCapacity: number; // lb
}

export interface GameDate {
  year: number;
  month: number; // 1..12
  day: number; // 1..31
}

export interface Location {
  trailPosition: number; // 0..1 along trail
  nextLandmarkId: string;
  previousLandmarkId: string | null;
  milesTraveled: number;
  terrain: Terrain;
}

export interface Resources {
  water: number; // gallons on hand
  waterCap: number;
}

export type ItemId = string; // item catalog IDs — catalog ships in Plan 3

export interface LogEntry {
  day: number;
  text: string;
}

export interface GameState {
  seed: string;
  day: number;
  date: GameDate;
  location: Location;
  party: PartyMember[];
  wagon: Wagon;
  oxen: Ox[];
  inventory: Record<ItemId, number>;
  cash: number;
  resources: Resources;
  morale: number; // 0..100
  pace: Pace;
  rations: Rations;
  eventLog: LogEntry[];
  flags: Record<string, boolean>;
  completed: boolean;
  outcome: Outcome;
}
```

- [ ] **Step 2: Verify the file type-checks**

```bash
npm run check
```

Expected: 0 errors, 0 warnings.

- [ ] **Step 3: Commit**

```bash
git add src/lib/game/types.ts
git commit -m "feat(game): add core state types"
```

---

## Task 7: Seeded RNG

**Files:**
- Create: `src/lib/game/rng.ts`
- Create: `tests/rng.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/rng.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { makeRng } from '../src/lib/game/rng';

describe('makeRng', () => {
  it('produces values in [0, 1)', () => {
    const rng = makeRng('seed-1');
    for (let i = 0; i < 100; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('is deterministic for the same seed', () => {
    const a = makeRng('abc');
    const b = makeRng('abc');
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('diverges for different seeds', () => {
    const a = makeRng('one');
    const b = makeRng('two');
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it('int(a, b) returns inclusive integers in range', () => {
    const rng = makeRng('r');
    const samples = Array.from({ length: 500 }, () => rng.int(3, 7));
    for (const n of samples) {
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(7);
    }
    expect(new Set(samples)).toEqual(new Set([3, 4, 5, 6, 7]));
  });

  it('pick(arr) returns one of the elements', () => {
    const rng = makeRng('p');
    const items = ['a', 'b', 'c'];
    for (let i = 0; i < 50; i++) {
      expect(items).toContain(rng.pick(items));
    }
  });

  it('chance(p) returns true ~p of the time', () => {
    const rng = makeRng('c');
    let hits = 0;
    const n = 10000;
    for (let i = 0; i < n; i++) if (rng.chance(0.3)) hits++;
    // loose bounds — deterministic but seed-specific
    expect(hits / n).toBeGreaterThan(0.25);
    expect(hits / n).toBeLessThan(0.35);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test -- tests/rng.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the RNG**

Create `src/lib/game/rng.ts`:

```ts
// Mulberry32 PRNG — fast, tiny, fully deterministic, and good enough for a game.
// Seed is any string; hashed with a simple string-hash to a 32-bit integer.

function hashSeed(seed: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface Rng {
  next(): number;
  int(min: number, max: number): number; // inclusive on both ends
  pick<T>(arr: readonly T[]): T;
  chance(p: number): boolean;
}

export function makeRng(seed: string): Rng {
  let state = hashSeed(seed);

  function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function int(min: number, max: number): number {
    if (!Number.isInteger(min) || !Number.isInteger(max) || min > max) {
      throw new Error(`rng.int: invalid range [${min}, ${max}]`);
    }
    return min + Math.floor(next() * (max - min + 1));
  }

  function pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error('rng.pick: empty array');
    return arr[Math.floor(next() * arr.length)];
  }

  function chance(p: number): boolean {
    return next() < p;
  }

  return { next, int, pick, chance };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/rng.test.ts
```

Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/game/rng.ts tests/rng.test.ts
git commit -m "feat(game): add seeded Mulberry32 RNG"
```

---

## Task 8: Daily food & water consumption

**Files:**
- Create: `src/lib/game/systems/consumption.ts`
- Create: `tests/consumption.test.ts`

This is the first real game system. It consumes food and water based on alive party members and the current rations setting (see spec §4.2, §4.6, §5.4).

- [ ] **Step 1: Write the failing tests**

Create `tests/consumption.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  foodConsumedToday,
  waterConsumedToday,
  applyDailyConsumption
} from '../src/lib/game/systems/consumption';
import type { GameState } from '../src/lib/game/types';

function baseState(overrides: Partial<GameState> = {}): GameState {
  return {
    seed: 't',
    day: 1,
    date: { year: 1848, month: 4, day: 1 },
    location: {
      trailPosition: 0,
      nextLandmarkId: 'ft_kearny',
      previousLandmarkId: null,
      milesTraveled: 0,
      terrain: 'prairie'
    },
    party: [
      { id: 'a', name: 'Ezra', profession: 'farmer', isLeader: true, age: 30, health: 100, conditions: [], dead: false },
      { id: 'b', name: 'Mary', profession: 'doctor', isLeader: false, age: 28, health: 100, conditions: [], dead: false },
      { id: 'c', name: 'Tom', profession: 'hunter', isLeader: false, age: 22, health: 100, conditions: [], dead: false }
    ],
    wagon: { condition: 100, carryCapacity: 2500 },
    oxen: [],
    inventory: { flour: 300, bacon: 100, beans: 100 },
    cash: 300,
    resources: { water: 10, waterCap: 20 },
    morale: 60,
    pace: 'moderate',
    rations: 'normal',
    eventLog: [],
    flags: {},
    completed: false,
    outcome: 'in-progress',
    ...overrides
  };
}

describe('foodConsumedToday', () => {
  it('is 2 lb per alive member on normal rations', () => {
    expect(foodConsumedToday(baseState())).toBe(6);
  });

  it('is 1 lb per alive member on meager rations', () => {
    expect(foodConsumedToday(baseState({ rations: 'meager' }))).toBe(3);
  });

  it('is 3 lb per alive member on filling rations', () => {
    expect(foodConsumedToday(baseState({ rations: 'filling' }))).toBe(9);
  });

  it('ignores dead members', () => {
    const s = baseState();
    s.party[2].dead = true;
    expect(foodConsumedToday(s)).toBe(4);
  });

  it('returns 0 when whole party is dead', () => {
    const s = baseState();
    for (const m of s.party) m.dead = true;
    expect(foodConsumedToday(s)).toBe(0);
  });
});

describe('waterConsumedToday', () => {
  it('is 1 gallon per alive member', () => {
    expect(waterConsumedToday(baseState())).toBe(3);
  });

  it('ignores dead members', () => {
    const s = baseState();
    s.party[0].dead = true;
    expect(waterConsumedToday(s)).toBe(2);
  });
});

describe('applyDailyConsumption', () => {
  it('decrements food from inventory, drawing down staples in order', () => {
    const s = baseState();
    const next = applyDailyConsumption(s);
    // 6 lb should come from flour (plenty), leaving 294
    expect(next.inventory.flour).toBe(294);
    expect(next.inventory.bacon).toBe(100);
    expect(next.inventory.beans).toBe(100);
  });

  it('draws across multiple food types if the first is depleted', () => {
    const s = baseState({ inventory: { flour: 4, bacon: 100, beans: 100 } });
    const next = applyDailyConsumption(s); // needs 6
    expect(next.inventory.flour).toBe(0);
    expect(next.inventory.bacon).toBe(98); // 2 lb taken from bacon
  });

  it('decrements water from resources', () => {
    const s = baseState();
    const next = applyDailyConsumption(s);
    expect(next.resources.water).toBe(7); // 10 - 3
  });

  it('clamps water at 0 when over-consumed', () => {
    const s = baseState({ resources: { water: 1, waterCap: 20 } });
    const next = applyDailyConsumption(s);
    expect(next.resources.water).toBe(0);
  });

  it('returns a new object (does not mutate input)', () => {
    const s = baseState();
    const before = JSON.stringify(s);
    applyDailyConsumption(s);
    expect(JSON.stringify(s)).toBe(before);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test -- tests/consumption.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the module**

Create `src/lib/game/systems/consumption.ts`:

```ts
import type { GameState, Rations } from '../types';

const FOOD_PER_PERSON: Record<Rations, number> = {
  meager: 1,
  normal: 2,
  filling: 3
};

const WATER_PER_PERSON_GAL = 1;

// Order food staples are drawn down — first is eaten first.
const FOOD_DRAW_ORDER = [
  'flour',
  'beans',
  'bacon',
  'hardtack',
  'dried_fruit',
  'pemmican'
];

export function aliveCount(state: GameState): number {
  return state.party.filter((m) => !m.dead).length;
}

export function foodConsumedToday(state: GameState): number {
  return aliveCount(state) * FOOD_PER_PERSON[state.rations];
}

export function waterConsumedToday(state: GameState): number {
  return aliveCount(state) * WATER_PER_PERSON_GAL;
}

export function applyDailyConsumption(state: GameState): GameState {
  const foodNeeded = foodConsumedToday(state);
  const waterNeeded = waterConsumedToday(state);

  const inventory = { ...state.inventory };
  let remaining = foodNeeded;
  for (const id of FOOD_DRAW_ORDER) {
    if (remaining <= 0) break;
    const have = inventory[id] ?? 0;
    if (have <= 0) continue;
    const take = Math.min(have, remaining);
    inventory[id] = have - take;
    remaining -= take;
  }

  const resources = {
    ...state.resources,
    water: Math.max(0, state.resources.water - waterNeeded)
  };

  return {
    ...state,
    inventory,
    resources
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/consumption.test.ts
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/game/systems/consumption.ts tests/consumption.test.ts
git commit -m "feat(game): add daily food and water consumption"
```

---

## Task 9: Day-tick turn engine

**Files:**
- Create: `src/lib/game/engine.ts`
- Create: `tests/engine.test.ts`

This is the orchestrator that advances the game by one day. For Plan 1 it only wires consumption and date advancement together — later plans add travel, events, condition progression.

- [ ] **Step 1: Write the failing tests**

Create `tests/engine.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { tickDay, createInitialState } from '../src/lib/game/engine';
import type { ProfessionId } from '../src/lib/game/types';

const leaderPick: { name: string; profession: ProfessionId } = {
  name: 'Ezra',
  profession: 'farmer'
};

describe('createInitialState', () => {
  it('uses the provided seed', () => {
    const s = createInitialState({
      seed: 's-1',
      leader: leaderPick,
      companions: [],
      startDate: { year: 1848, month: 4, day: 15 }
    });
    expect(s.seed).toBe('s-1');
  });

  it('starts on day 1', () => {
    const s = createInitialState({
      seed: 's',
      leader: leaderPick,
      companions: [],
      startDate: { year: 1848, month: 4, day: 15 }
    });
    expect(s.day).toBe(1);
    expect(s.date).toEqual({ year: 1848, month: 4, day: 15 });
  });

  it('places the leader first and marks them as leader', () => {
    const s = createInitialState({
      seed: 's',
      leader: { name: 'Ezra', profession: 'farmer' },
      companions: [{ name: 'Mary', profession: 'doctor' }],
      startDate: { year: 1848, month: 4, day: 15 }
    });
    expect(s.party).toHaveLength(2);
    expect(s.party[0].name).toBe('Ezra');
    expect(s.party[0].isLeader).toBe(true);
    expect(s.party[1].isLeader).toBe(false);
  });

  it('rejects a party of 1', () => {
    expect(() =>
      createInitialState({
        seed: 's',
        leader: leaderPick,
        companions: [],
        startDate: { year: 1848, month: 4, day: 15 }
      })
    ).toThrow(/at least 2/i);
  });

  it('rejects a party larger than 6', () => {
    const six: Array<{ name: string; profession: ProfessionId }> = Array.from(
      { length: 6 },
      (_, i) => ({ name: `X${i}`, profession: 'hunter' })
    );
    expect(() =>
      createInitialState({
        seed: 's',
        leader: leaderPick,
        companions: six,
        startDate: { year: 1848, month: 4, day: 15 }
      })
    ).toThrow(/at most 6/i);
  });
});

describe('tickDay', () => {
  function newGame(seed = 't') {
    return createInitialState({
      seed,
      leader: leaderPick,
      companions: [{ name: 'Mary', profession: 'doctor' }],
      startDate: { year: 1848, month: 4, day: 15 }
    });
  }

  it('advances the day counter by 1', () => {
    const s0 = newGame();
    const s1 = tickDay(s0);
    expect(s1.day).toBe(2);
  });

  it('advances the calendar date correctly across month boundary', () => {
    let s = newGame();
    s = { ...s, date: { year: 1848, month: 4, day: 30 } };
    const next = tickDay(s);
    expect(next.date).toEqual({ year: 1848, month: 5, day: 1 });
  });

  it('advances across year boundary', () => {
    let s = newGame();
    s = { ...s, date: { year: 1848, month: 12, day: 31 } };
    const next = tickDay(s);
    expect(next.date).toEqual({ year: 1849, month: 1, day: 1 });
  });

  it('applies daily consumption', () => {
    const s0 = newGame();
    const initialFlour = s0.inventory.flour ?? 0;
    const s1 = tickDay(s0);
    expect(s1.inventory.flour).toBeLessThan(initialFlour);
  });

  it('is deterministic — same seed, same result after 10 ticks', () => {
    let a = newGame('equal');
    let b = newGame('equal');
    for (let i = 0; i < 10; i++) {
      a = tickDay(a);
      b = tickDay(b);
    }
    expect(a).toEqual(b);
  });

  it('does not mutate the input state', () => {
    const s = newGame();
    const snap = JSON.stringify(s);
    tickDay(s);
    expect(JSON.stringify(s)).toBe(snap);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test -- tests/engine.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the engine**

Create `src/lib/game/engine.ts`:

```ts
import type { GameDate, GameState, PartyMember, ProfessionId } from './types';
import { applyDailyConsumption } from './systems/consumption';

export interface PartyPick {
  name: string;
  profession: ProfessionId;
}

export interface NewGameOptions {
  seed: string;
  leader: PartyPick;
  companions: PartyPick[];
  startDate: GameDate;
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2 && isLeapYear(year)) return 29;
  return DAYS_IN_MONTH[month - 1];
}

function advanceDate(d: GameDate): GameDate {
  let { year, month, day } = d;
  day += 1;
  if (day > daysInMonth(year, month)) {
    day = 1;
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return { year, month, day };
}

function makeMember(
  pick: PartyPick,
  isLeader: boolean,
  index: number
): PartyMember {
  return {
    id: `p${index}`,
    name: pick.name,
    profession: pick.profession,
    isLeader,
    age: 30,
    health: 100,
    conditions: [],
    dead: false
  };
}

export function createInitialState(opts: NewGameOptions): GameState {
  const size = 1 + opts.companions.length;
  if (size < 2) throw new Error('Party must have at least 2 adults.');
  if (size > 6) throw new Error('Party must have at most 6 adults.');

  const party: PartyMember[] = [
    makeMember(opts.leader, true, 0),
    ...opts.companions.map((c, i) => makeMember(c, false, i + 1))
  ];

  return {
    seed: opts.seed,
    day: 1,
    date: { ...opts.startDate },
    location: {
      trailPosition: 0,
      nextLandmarkId: 'ft_kearny',
      previousLandmarkId: null,
      milesTraveled: 0,
      terrain: 'prairie'
    },
    party,
    wagon: { condition: 100, carryCapacity: 2500 },
    oxen: [],
    inventory: {
      flour: 500,
      bullets: 20,
      shovel: 1,
      yoke: 1
    },
    cash: 300,
    resources: { water: 20, waterCap: 20 },
    morale: 70,
    pace: 'moderate',
    rations: 'normal',
    eventLog: [],
    flags: {},
    completed: false,
    outcome: 'in-progress'
  };
}

export function tickDay(state: GameState): GameState {
  const consumed = applyDailyConsumption(state);
  return {
    ...consumed,
    day: state.day + 1,
    date: advanceDate(state.date)
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/engine.test.ts
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/game/engine.ts tests/engine.test.ts
git commit -m "feat(game): add day-tick turn engine and initial state builder"
```

---

## Task 10: Serialize / deserialize game state

**Files:**
- Create: `src/lib/game/saves.ts`
- Create: `tests/saves.test.ts`

Saves store `GameState` as JSON in SQLite. This module owns the JSON conversion.

- [ ] **Step 1: Write the failing tests**

Create `tests/saves.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createInitialState, tickDay } from '../src/lib/game/engine';
import { serialize, deserialize, buildSummary } from '../src/lib/game/saves';

function fresh() {
  return createInitialState({
    seed: 'sv',
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [{ name: 'Mary', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
}

describe('serialize / deserialize', () => {
  it('round-trips an initial state', () => {
    const s0 = fresh();
    const json = serialize(s0);
    const s1 = deserialize(json);
    expect(s1).toEqual(s0);
  });

  it('round-trips after ticking several days', () => {
    let s = fresh();
    for (let i = 0; i < 5; i++) s = tickDay(s);
    const json = serialize(s);
    const restored = deserialize(json);
    expect(restored).toEqual(s);
  });

  it('throws on malformed JSON', () => {
    expect(() => deserialize('{not valid')).toThrow();
  });

  it('throws when required fields are missing', () => {
    expect(() => deserialize('{"day":1}')).toThrow(/invalid save/i);
  });
});

describe('buildSummary', () => {
  it('includes leader name, day, and date', () => {
    const s = fresh();
    const sum = buildSummary(s);
    expect(sum).toContain('Ezra');
    expect(sum).toContain('Day 1');
    expect(sum).toMatch(/1848/);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test -- tests/saves.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the module**

Create `src/lib/game/saves.ts`:

```ts
import type { GameState } from './types';

const REQUIRED_KEYS: readonly (keyof GameState)[] = [
  'seed',
  'day',
  'date',
  'location',
  'party',
  'wagon',
  'oxen',
  'inventory',
  'cash',
  'resources',
  'morale',
  'pace',
  'rations',
  'eventLog',
  'flags',
  'completed',
  'outcome'
];

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

export function serialize(state: GameState): string {
  return JSON.stringify(state);
}

export function deserialize(json: string): GameState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    throw new Error(`Failed to parse save JSON: ${(err as Error).message}`);
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Invalid save: not an object');
  }
  for (const key of REQUIRED_KEYS) {
    if (!(key in (parsed as Record<string, unknown>))) {
      throw new Error(`Invalid save: missing field "${key}"`);
    }
  }
  return parsed as GameState;
}

export function buildSummary(state: GameState): string {
  const leader = state.party.find((m) => m.isLeader);
  const leaderName = leader?.name ?? 'Unknown';
  const { year, month, day } = state.date;
  const monthName = MONTH_NAMES[month - 1] ?? `M${month}`;
  return `${leaderName}'s party · Day ${state.day} · ${monthName} ${day}, ${year}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/saves.test.ts
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/game/saves.ts tests/saves.test.ts
git commit -m "feat(game): add save serialize / deserialize / summary"
```

---

## Task 11: Persist saves through the DB layer

**Files:**
- Create: `src/lib/db/saves-repo.ts`
- Create: `tests/saves-repo.test.ts`

This is the bridge between the pure game engine and the SQLite layer.

- [ ] **Step 1: Write the failing tests**

Create `tests/saves-repo.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '../src/lib/db/client';
import { SavesRepo } from '../src/lib/db/saves-repo';
import { createInitialState, tickDay } from '../src/lib/game/engine';

function fresh() {
  return createInitialState({
    seed: 'repo-seed',
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [{ name: 'Mary', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
}

describe('SavesRepo', () => {
  let dir: string;
  let handle: ReturnType<typeof createClient>;
  let repo: SavesRepo;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'htrail-repo-'));
    handle = createClient(join(dir, 'db.sqlite'));
    repo = new SavesRepo(handle.db);
  });

  afterEach(() => {
    handle.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('creates a device and lists no saves', async () => {
    const deviceId = await repo.ensureDevice();
    expect(deviceId).toMatch(/^[0-9a-f-]{36}$/);
    const list = await repo.list(deviceId);
    expect(list).toEqual([]);
  });

  it('saves and loads an exact round-trip', async () => {
    const deviceId = await repo.ensureDevice();
    const state = fresh();
    await repo.save(deviceId, 'slot-1', state);
    const loaded = await repo.load(deviceId, 'slot-1');
    expect(loaded).toEqual(state);
  });

  it('overwrites when saving the same slot twice', async () => {
    const deviceId = await repo.ensureDevice();
    let state = fresh();
    await repo.save(deviceId, 'slot-1', state);
    state = tickDay(state);
    state = tickDay(state);
    await repo.save(deviceId, 'slot-1', state);
    const loaded = await repo.load(deviceId, 'slot-1');
    expect(loaded?.day).toBe(3);
    const list = await repo.list(deviceId);
    expect(list).toHaveLength(1);
  });

  it('keeps multiple slots separate', async () => {
    const deviceId = await repo.ensureDevice();
    const a = fresh();
    const b = tickDay(tickDay(fresh()));
    await repo.save(deviceId, 'slot-a', a);
    await repo.save(deviceId, 'slot-b', b);
    const list = await repo.list(deviceId);
    expect(list.map((s) => s.slotName).sort()).toEqual(['slot-a', 'slot-b']);
    const loadedA = await repo.load(deviceId, 'slot-a');
    const loadedB = await repo.load(deviceId, 'slot-b');
    expect(loadedA?.day).toBe(1);
    expect(loadedB?.day).toBe(3);
  });

  it('isolates saves per device', async () => {
    const d1 = await repo.ensureDevice();
    const d2 = await repo.ensureDevice();
    await repo.save(d1, 'slot-1', fresh());
    const list2 = await repo.list(d2);
    expect(list2).toEqual([]);
  });

  it('load returns null for missing slot', async () => {
    const deviceId = await repo.ensureDevice();
    const loaded = await repo.load(deviceId, 'does-not-exist');
    expect(loaded).toBeNull();
  });

  it('delete removes a save', async () => {
    const deviceId = await repo.ensureDevice();
    await repo.save(deviceId, 'slot-1', fresh());
    await repo.delete(deviceId, 'slot-1');
    const loaded = await repo.load(deviceId, 'slot-1');
    expect(loaded).toBeNull();
  });

  it('list returns summaries that include the leader name', async () => {
    const deviceId = await repo.ensureDevice();
    await repo.save(deviceId, 'slot-1', fresh());
    const list = await repo.list(deviceId);
    expect(list[0].summary).toContain('Ezra');
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test -- tests/saves-repo.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the repo**

Create `src/lib/db/saves-repo.ts`:

```ts
import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { devices, saves } from './schema';
import type { AppDb } from './client';
import { buildSummary, deserialize, serialize } from '../game/saves';
import type { GameState } from '../game/types';

export interface SaveRow {
  id: string;
  slotName: string;
  summary: string;
  updatedAt: Date;
}

export class SavesRepo {
  constructor(private db: AppDb) {}

  async ensureDevice(): Promise<string> {
    const id = randomUUID();
    await this.db.insert(devices).values({ id }).run();
    return id;
  }

  async list(deviceId: string): Promise<SaveRow[]> {
    const rows = await this.db
      .select({
        id: saves.id,
        slotName: saves.slotName,
        summary: saves.summary,
        updatedAt: saves.updatedAt
      })
      .from(saves)
      .where(eq(saves.deviceId, deviceId))
      .all();
    return rows;
  }

  async load(deviceId: string, slotName: string): Promise<GameState | null> {
    const row = await this.db
      .select({ gameState: saves.gameState })
      .from(saves)
      .where(and(eq(saves.deviceId, deviceId), eq(saves.slotName, slotName)))
      .get();
    if (!row) return null;
    return deserialize(row.gameState);
  }

  async save(deviceId: string, slotName: string, state: GameState): Promise<void> {
    const now = new Date();
    const gameState = serialize(state);
    const summary = buildSummary(state);
    const existing = await this.db
      .select({ id: saves.id })
      .from(saves)
      .where(and(eq(saves.deviceId, deviceId), eq(saves.slotName, slotName)))
      .get();
    if (existing) {
      await this.db
        .update(saves)
        .set({ gameState, summary, updatedAt: now })
        .where(eq(saves.id, existing.id))
        .run();
    } else {
      await this.db
        .insert(saves)
        .values({
          id: randomUUID(),
          deviceId,
          slotName,
          gameState,
          summary,
          createdAt: now,
          updatedAt: now
        })
        .run();
    }
  }

  async delete(deviceId: string, slotName: string): Promise<void> {
    await this.db
      .delete(saves)
      .where(and(eq(saves.deviceId, deviceId), eq(saves.slotName, slotName)))
      .run();
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/saves-repo.test.ts
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/saves-repo.ts tests/saves-repo.test.ts
git commit -m "feat(db): add SavesRepo for per-device save slots"
```

---

## Task 12: End-to-end smoke test

**Files:**
- Create: `tests/smoke.test.ts`

No new implementation. The smoke test proves the whole foundation works together.

- [ ] **Step 1: Write the smoke test**

Create `tests/smoke.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '../src/lib/db/client';
import { SavesRepo } from '../src/lib/db/saves-repo';
import { createInitialState, tickDay } from '../src/lib/game/engine';

describe('foundation smoke test', () => {
  let dir: string;
  let handle: ReturnType<typeof createClient>;
  let repo: SavesRepo;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'htrail-smoke-'));
    handle = createClient(join(dir, 'game.db'));
    repo = new SavesRepo(handle.db);
  });

  afterEach(() => {
    handle.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('new game → tick 10 days → save → load → identical state', async () => {
    const deviceId = await repo.ensureDevice();

    // Start
    let state = createInitialState({
      seed: 'smoke-42',
      leader: { name: 'Ezra', profession: 'farmer' },
      companions: [
        { name: 'Mary', profession: 'doctor' },
        { name: 'Tom', profession: 'hunter' }
      ],
      startDate: { year: 1848, month: 4, day: 15 }
    });

    // Capture starting provisions
    const startingFlour = state.inventory.flour ?? 0;
    const startingWater = state.resources.water;
    expect(startingFlour).toBeGreaterThan(0);

    // Tick 10 days
    for (let i = 0; i < 10; i++) state = tickDay(state);

    // Verify day advanced
    expect(state.day).toBe(11); // day 1 + 10 ticks
    expect(state.date).toEqual({ year: 1848, month: 4, day: 25 });

    // Verify food and water consumed
    expect(state.inventory.flour).toBeLessThan(startingFlour);
    expect(state.resources.water).toBeLessThan(startingWater);

    // Save
    await repo.save(deviceId, 'Autosave', state);

    // Load
    const loaded = await repo.load(deviceId, 'Autosave');
    expect(loaded).not.toBeNull();
    expect(loaded).toEqual(state);

    // Summary contains expected info
    const slots = await repo.list(deviceId);
    expect(slots).toHaveLength(1);
    expect(slots[0].summary).toContain('Ezra');
    expect(slots[0].summary).toContain('Day 11');
  });

  it('same seed + same actions = identical state (determinism)', async () => {
    function run() {
      let s = createInitialState({
        seed: 'determinism',
        leader: { name: 'Ezra', profession: 'farmer' },
        companions: [{ name: 'Mary', profession: 'doctor' }],
        startDate: { year: 1848, month: 4, day: 15 }
      });
      for (let i = 0; i < 30; i++) s = tickDay(s);
      return s;
    }
    expect(run()).toEqual(run());
  });
});
```

- [ ] **Step 2: Run it**

```bash
npm test -- tests/smoke.test.ts
```

Expected: both tests pass.

- [ ] **Step 3: Run the whole test suite**

```bash
npm test
```

Expected: all tests in all files pass. Should be 7 test files, 30+ tests.

- [ ] **Step 4: Commit**

```bash
git add tests/smoke.test.ts
git commit -m "test: add end-to-end foundation smoke test"
```

---

## Task 13: Document the foundation

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write a minimal README**

Create `README.md`:

```markdown
# Hoosier Trail

Browser-based replica of the original Oregon Trail. Single-player, choice-driven, self-hostable.

## Status

v1 in progress. Foundation (Plan 1) complete: game engine types, seeded RNG, day-tick turn loop, SQLite saves. Core mechanics (Plan 2) next.

## Stack

- SvelteKit + TypeScript
- Vitest for tests
- Drizzle ORM + better-sqlite3 for persistence

## Development

```bash
npm install
npm run db:generate   # regenerate migrations after schema changes
npm test              # run the suite
npm run test:watch    # watch mode
npm run dev           # dev server (UI arrives in Plan 4)
```

## Project layout

- `src/lib/game/` — pure game engine (no DB, no DOM). `types.ts`, `rng.ts`, `engine.ts`, `saves.ts`, `systems/`.
- `src/lib/db/` — SQLite persistence. `schema.ts`, `client.ts`, `saves-repo.ts`.
- `tests/` — Vitest tests mirroring the source layout.
- `docs/superpowers/specs/` — design spec.
- `docs/superpowers/plans/` — implementation plans.

## Design spec

See `docs/superpowers/specs/2026-04-20-hoosier-trail-design.md`.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README for v1 foundation"
```

---

## Verification checklist

After completing all tasks, verify the foundation is solid before moving to Plan 2:

- [ ] `npm test` passes all tests (should be ~30+ tests across 7 files).
- [ ] `npm run check` reports 0 errors.
- [ ] `npm run build` succeeds (even with only a placeholder `+page.svelte`).
- [ ] Git log shows ~12 commits, one per task.
- [ ] `tree src/lib` (or `ls -R src/lib`) matches the File Structure table.
- [ ] `dev.db` exists after running tests and is gitignored.
- [ ] The smoke test demonstrates seed → tick → save → load → equality.

---

## V1 → V2 save migration invariant

The schema in this plan is deliberately shaped so that v2 (user accounts + cross-device sync) is a purely additive migration. **No save data is ever lost across the v1→v2 transition**, assuming the SQLite file itself is preserved on your server.

The v2 migration will:
1. Create a `users` table.
2. Add a nullable `saves.user_id` column + FK to `users`.
3. Relax `saves.device_id` to nullable + `ON DELETE SET NULL` (so a save can outlive a device).
4. On first login from a device: `UPDATE saves SET user_id = :uid WHERE device_id = :did`. Existing saves gain an owner without being rewritten.

**Invariants that every future plan must preserve:**
- The `saves` table is never dropped or truncated.
- `serialize(state)` / `deserialize(json)` format (Task 10) is append-only compatible — new fields added with safe defaults, existing fields never removed or renamed without a versioning shim.
- SQLite file path is a server-held artifact, not coupled to UI sessions.

## Handoff to Plan 2

Plan 2 builds on this foundation with core mechanics: travel, morale, health/conditions, hunting, fording, wagon maintenance, camping + fire + shovel actions. It consumes `GameState`, `tickDay`, and `makeRng` from this plan. Nothing in Plan 2 modifies the DB schema.
