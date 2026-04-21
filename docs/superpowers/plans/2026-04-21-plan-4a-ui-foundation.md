# Plan 4a: UI Foundation — Hoosier Trail

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the server-side + UI scaffolding needed for a player to create a game in the browser, save/load it, and navigate between screens. Wires the cookie-based device flow, fixes the Plan 4 prereqs (SSR migrations path + TOCTOU upsert), and ships three Svelte routes: landing page, party-setup wizard, and save-slot picker. **No main play screen yet** — that arrives in Plan 4b.

**Architecture:** SvelteKit server routes handle save CRUD against `SavesRepo`. A persistent `device_id` cookie identifies the browser. The UI is server-rendered Svelte pages + a small client-side store for the in-progress new-game form. Visual style is a pared-back version of the dusty 32-bit western palette locked in brainstorming — just enough to make the screens feel in-world without full asset work.

**Tech Stack:** Same — SvelteKit, TypeScript, better-sqlite3, Drizzle. CSS custom-properties for theming; no CSS framework (Tailwind etc.) — keep the dependency surface small.

**Companion spec:** §9 (UX / screens), §10 (save model). Plan 3a/b ship the engine this UI drives.

**Builds on:** Plans 1 + 2a + 2b + 3a + 3b (merged). Closes Tasks #30 (migrations in SSR), #31 (TOCTOU upsert), and #32 (save version field).

---

## File Structure

### New files

| Path | Responsibility |
|---|---|
| `src/lib/server/device-cookie.ts` | Read / set `device_id` cookie from a SvelteKit `cookies` handle |
| `src/lib/server/db.ts` | Process-wide singleton `SavesRepo` (lazy-initialized SQLite) |
| `src/hooks.server.ts` | Set `event.locals.deviceId` + `event.locals.repo` for every request |
| `src/app.d.ts` | Extend `App.Locals` with `deviceId` and `repo` |
| `src/lib/styles/theme.css` | CSS custom properties for the palette + basic resets |
| `src/routes/+layout.svelte` | Shared chrome (header, theme import) |
| `src/routes/+layout.server.ts` | Loader that exposes device id + saves list |
| `src/routes/+page.svelte` | Landing page: New Game / Load Game |
| `src/routes/new/+page.svelte` | Party-setup wizard |
| `src/routes/new/+page.server.ts` | Form action: creates a new save from submitted party |
| `src/routes/load/+page.svelte` | Save slot picker |
| `src/routes/load/+page.server.ts` | Form actions: load, delete, rename |
| `src/routes/api/saves/+server.ts` | JSON API: list / save / load / delete by slot |
| `tests/server/saves-api.test.ts` | API endpoint tests |
| `tests/server/device-cookie.test.ts` | Cookie read/set tests |

### Files modified

| Path | Change |
|---|---|
| `src/lib/db/client.ts` | Resolve `migrationsFolder` relative to `import.meta.url` with CWD fallback (Task #30 fix) |
| `src/lib/db/saves-repo.ts` | `save()` uses `onConflictDoUpdate` (Task #31 fix) |
| `src/lib/game/saves.ts` | Add `version: 1` field wrapper in `serialize` / `deserialize` (Task #32) |
| `package.json` | Add `@sveltejs/adapter-node` (replace `adapter-auto`) for self-hostable Node deploy |
| `svelte.config.js` | Switch to `adapter-node` |

### Boundaries
- `src/lib/server/` is server-only code. Browser never imports from here.
- `src/lib/game/` stays pure engine — no SvelteKit, no request context.
- Svelte pages and form actions are the only things that call `repo.*`.
- Visual polish beyond basic spacing + palette is deferred to Plan 4d.

---

## Task 1: Fix SSR migrations path (Task #30) + TOCTOU save (Task #31)

**Files:**
- Modify: `src/lib/db/client.ts`
- Modify: `src/lib/db/saves-repo.ts`
- Tests remain green (no interface changes)

### Step 1 — Update `client.ts` to use a hybrid path resolution

Replace the contents of `src/lib/db/client.ts` with:

```ts
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import * as schema from './schema';

function defaultMigrationsFolder(): string {
  // Try path relative to this module (works at source + in unbundled tests).
  try {
    const modDir = dirname(fileURLToPath(import.meta.url));
    const relative = resolve(modDir, '../../../drizzle');
    if (existsSync(relative)) return relative;
  } catch {
    // In SSR-bundled contexts `import.meta.url` may be a data: URL — fall through.
  }
  // Fallback: resolve from cwd. Production deploys should run from project root
  // or set DRIZZLE_MIGRATIONS_DIR to the absolute path.
  return process.env.DRIZZLE_MIGRATIONS_DIR ?? resolve(process.cwd(), 'drizzle');
}

export interface CreateClientOptions {
  migrationsFolder?: string;
}

export function createClient(dbPath: string, options: CreateClientOptions = {}) {
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  const db = drizzle(sqlite, { schema });
  migrate(db, {
    migrationsFolder: options.migrationsFolder ?? defaultMigrationsFolder()
  });
  return {
    db,
    close: () => sqlite.close()
  };
}

export type AppDb = ReturnType<typeof createClient>['db'];
```

### Step 2 — Update `saves-repo.ts` `save()` to use `onConflictDoUpdate`

Find the `save()` method in `src/lib/db/saves-repo.ts`. Replace with:

```ts
async save(deviceId: string, slotName: string, state: GameState): Promise<void> {
  const now = new Date();
  const gameState = serialize(state);
  const summary = buildSummary(state);
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
    .onConflictDoUpdate({
      target: [saves.deviceId, saves.slotName],
      set: { gameState, summary, updatedAt: now }
    })
    .run();
}
```

Remove the `import` of `eq` if it's no longer used (it may still be needed by `load`/`delete`).

### Step 3 — Verify, commit

```bash
npm test
npm run check
git add -A
git commit -m "fix(db): SSR-safe migration path; atomic save via onConflictDoUpdate"
```

All 221 tests pass. The fixes are internal; external behavior unchanged.

---

## Task 2: Save version field (Task #32)

**Files:**
- Modify: `src/lib/game/saves.ts`
- Modify: `tests/saves.test.ts`

### Step 1 — Update serialize/deserialize to wrap version

Replace `src/lib/game/saves.ts` with:

```ts
import type { GameState } from './types';

const SAVE_VERSION = 1;

const REQUIRED_KEYS: readonly (keyof GameState)[] = [
  'seed', 'day', 'date', 'location', 'party', 'wagon', 'oxen',
  'inventory', 'cash', 'resources', 'morale', 'pace', 'rations',
  'eventLog', 'flags', 'completed', 'outcome'
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface VersionedSave {
  version: number;
  state: GameState;
}

export function serialize(state: GameState): string {
  const wrapped: VersionedSave = { version: SAVE_VERSION, state };
  return JSON.stringify(wrapped);
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

  // Handle BOTH legacy unversioned (Plan 1-3b) AND versioned (Plan 4a+) formats.
  const obj = parsed as Record<string, unknown>;
  const stateObj = 'version' in obj && 'state' in obj
    ? (obj.state as Record<string, unknown>)
    : obj;

  for (const key of REQUIRED_KEYS) {
    if (!(key in stateObj)) {
      throw new Error(`Invalid save: missing field "${key}"`);
    }
  }
  return stateObj as unknown as GameState;
}

export function buildSummary(state: GameState): string {
  const leader = state.party.find((m) => m.isLeader);
  const leaderName = leader?.name ?? 'Unknown';
  const { year, month, day } = state.date;
  const monthName = MONTH_NAMES[month - 1] ?? `M${month}`;
  return `${leaderName}'s party · Day ${state.day} · ${monthName} ${day}, ${year}`;
}
```

### Step 2 — Tests

The existing `tests/saves.test.ts` round-trip tests will still pass (we serialize wrapped, deserialize unwraps either form). Add one new test:

Append to `tests/saves.test.ts`:

```ts
describe('save format versioning', () => {
  it('serialized JSON contains a version field', () => {
    const s = fresh();
    const json = serialize(s);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(1);
    expect(parsed.state).toBeDefined();
  });

  it('deserialize reads legacy unversioned saves', () => {
    const s = fresh();
    const legacy = JSON.stringify(s); // no version wrapper
    const restored = deserialize(legacy);
    expect(restored).toEqual(s);
  });
});
```

### Step 3 — Commit

```bash
npm test
npm run check
git add -A
git commit -m "feat(game): add save format version; keep legacy reader for back-compat"
```

---

## Task 3: Switch to adapter-node

**Files:**
- Modify: `package.json`, `svelte.config.js`

SvelteKit's `adapter-auto` doesn't target a specific platform. For self-hosting (per spec §2.2), `adapter-node` produces a Node server we can run directly.

### Step 1 — Install adapter

```bash
npm uninstall @sveltejs/adapter-auto
npm install -D @sveltejs/adapter-node
```

### Step 2 — Update svelte.config.js

Open `svelte.config.js`. Change the adapter import + reference:

```js
import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter()
  },
  compilerOptions: {
    runes: true
  }
};

export default config;
```

(Preserve any existing options — just swap `adapter-auto` for `adapter-node`.)

### Step 3 — Verify build still works

```bash
npm run build
npm test
npm run check
```

`npm run build` should now produce a `build/` directory with `node build/index.js` as the entrypoint.

### Step 4 — Commit

```bash
git add -A
git commit -m "build: switch to adapter-node for self-hosted deploy"
```

---

## Task 4: Theme CSS + app.d.ts + hooks.server.ts

**Files:**
- Create: `src/lib/styles/theme.css`
- Create: `src/app.d.ts` (or update existing)
- Create: `src/hooks.server.ts`
- Create: `src/lib/server/db.ts`
- Create: `src/lib/server/device-cookie.ts`

### Step 1 — Theme CSS

Create `src/lib/styles/theme.css`:

```css
:root {
  /* Dusty 32-bit western palette, from brainstorm */
  --c-bg: #1a0f08;
  --c-bg-raised: #2a1a10;
  --c-panel: #3d2817;
  --c-border: #5a3a1a;
  --c-tan: #e8c89a;
  --c-tan-bright: #f5e6c8;
  --c-rust: #c96a2a;
  --c-rust-dark: #8a3a1a;
  --c-wood: #8a5a2a;
  --c-ink: #3a1a08;
  --c-sage: #6a7a4a;
  --c-parchment: #e8d9b8;

  /* Typography */
  --f-mono: 'Courier New', ui-monospace, monospace;
  --f-body: 'Georgia', 'Times New Roman', serif;
}

*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: var(--c-bg); color: var(--c-tan); font-family: var(--f-mono); min-height: 100vh; }

h1, h2, h3, h4 { color: var(--c-tan-bright); letter-spacing: 0.05em; margin: 0 0 0.5em 0; }
h1 { font-size: 2em; }
h2 { font-size: 1.5em; }

a { color: var(--c-rust); text-decoration: none; }
a:hover { color: var(--c-tan-bright); text-decoration: underline; }

button {
  font-family: inherit;
  background: var(--c-rust-dark);
  color: var(--c-tan-bright);
  border: 2px solid var(--c-ink);
  padding: 0.5em 1em;
  cursor: pointer;
  letter-spacing: 0.05em;
  font-weight: 700;
  text-transform: uppercase;
}
button:hover:not(:disabled) { background: var(--c-rust); }
button:disabled { opacity: 0.5; cursor: not-allowed; }

input, select, textarea {
  font-family: inherit;
  background: var(--c-bg-raised);
  color: var(--c-tan);
  border: 2px solid var(--c-wood);
  padding: 0.4em 0.6em;
}

.panel { background: var(--c-panel); border: 2px solid var(--c-wood); padding: 1em; border-radius: 3px; }
.container { max-width: 900px; margin: 0 auto; padding: 2em 1em; }
```

### Step 2 — app.d.ts

Create (or update) `src/app.d.ts`:

```ts
import type { SavesRepo } from '$lib/db/saves-repo';

declare global {
  namespace App {
    interface Locals {
      deviceId: string;
      repo: SavesRepo;
    }
  }
}

export {};
```

### Step 3 — Server DB singleton

Create `src/lib/server/db.ts`:

```ts
import { createClient } from '$lib/db/client';
import { SavesRepo } from '$lib/db/saves-repo';
import { resolve } from 'node:path';

const DB_PATH = process.env.DATABASE_URL?.replace('file:', '') ?? resolve(process.cwd(), 'dev.db');

let cached: { repo: SavesRepo; close: () => void } | null = null;

export function getRepo(): SavesRepo {
  if (!cached) {
    const handle = createClient(DB_PATH);
    cached = { repo: new SavesRepo(handle.db), close: handle.close };
  }
  return cached.repo;
}
```

### Step 4 — Device cookie helper

Create `src/lib/server/device-cookie.ts`:

```ts
import type { Cookies } from '@sveltejs/kit';

const COOKIE_NAME = 'ht_device';
const ONE_YEAR = 60 * 60 * 24 * 365;

export function readOrCreateDeviceId(cookies: Cookies, create: () => string): string {
  const existing = cookies.get(COOKIE_NAME);
  if (existing) return existing;
  const fresh = create();
  cookies.set(COOKIE_NAME, fresh, {
    path: '/',
    maxAge: ONE_YEAR,
    sameSite: 'lax',
    httpOnly: true
  });
  return fresh;
}
```

### Step 5 — hooks.server.ts

Create `src/hooks.server.ts`:

```ts
import type { Handle } from '@sveltejs/kit';
import { getRepo } from '$lib/server/db';
import { readOrCreateDeviceId } from '$lib/server/device-cookie';

export const handle: Handle = async ({ event, resolve }) => {
  const repo = getRepo();
  const deviceId = readOrCreateDeviceId(event.cookies, async () => {
    const id = await repo.createDevice();
    return id;
  }) ;

  // The cookie callback can be async above if we awaited inside — make it synchronous
  // by eagerly creating a device when none exists.
  if (!event.cookies.get('ht_device')) {
    const id = await repo.createDevice();
    event.cookies.set('ht_device', id, { path: '/', maxAge: 60*60*24*365, sameSite: 'lax', httpOnly: true });
    event.locals.deviceId = id;
  } else {
    event.locals.deviceId = event.cookies.get('ht_device')!;
  }

  event.locals.repo = repo;
  return resolve(event);
};
```

(Note: the `readOrCreateDeviceId` helper above accepts a synchronous `create` callback. The hook above inlines the async `createDevice()` call. Remove the helper from `device-cookie.ts` or simplify it — choose one pattern. Simplest: drop the helper, inline the logic in the hook.)

Simplified version of `src/hooks.server.ts`:

```ts
import type { Handle } from '@sveltejs/kit';
import { getRepo } from '$lib/server/db';

const COOKIE_NAME = 'ht_device';
const ONE_YEAR = 60 * 60 * 24 * 365;

export const handle: Handle = async ({ event, resolve }) => {
  const repo = getRepo();
  let deviceId = event.cookies.get(COOKIE_NAME);
  if (!deviceId) {
    deviceId = await repo.createDevice();
    event.cookies.set(COOKIE_NAME, deviceId, { path: '/', maxAge: ONE_YEAR, sameSite: 'lax', httpOnly: true });
  }
  event.locals.deviceId = deviceId;
  event.locals.repo = repo;
  return resolve(event);
};
```

Delete `src/lib/server/device-cookie.ts` in favor of this inline approach (or keep it for tests — up to the implementer).

### Step 6 — Verify, commit

```bash
npm run build
npm test
npm run check
git add -A
git commit -m "feat(server): add device cookie, DB singleton, SvelteKit hooks"
```

Tests don't touch the hook yet (tests will arrive in Task 7). `npm run build` should succeed with the hook in place.

---

## Task 5: Landing page + shared layout

**Files:**
- Create: `src/routes/+layout.svelte`
- Create: `src/routes/+layout.server.ts`
- Replace: `src/routes/+page.svelte` (currently the sv-scaffold default)

### Step 1 — Shared layout

Create `src/routes/+layout.svelte`:

```svelte
<script lang="ts">
  import '$lib/styles/theme.css';
  let { children } = $props();
</script>

<header style="border-bottom: 2px solid var(--c-border); background: var(--c-bg-raised); padding: 0.8em 1em;">
  <a href="/" style="font-size: 1.4em; font-weight: 700; color: var(--c-rust);">🤠 HOOSIER TRAIL</a>
</header>

<main>
  {@render children()}
</main>
```

### Step 2 — Layout server loader

Create `src/routes/+layout.server.ts`:

```ts
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  const saves = await locals.repo.list(locals.deviceId);
  return {
    deviceId: locals.deviceId,
    saves: saves.map((s) => ({
      id: s.id,
      slotName: s.slotName,
      summary: s.summary,
      updatedAt: s.updatedAt.toISOString()
    }))
  };
};
```

### Step 3 — Landing page

Replace `src/routes/+page.svelte` with:

```svelte
<script lang="ts">
  let { data } = $props();
  const hasSaves = data.saves.length > 0;
</script>

<div class="container">
  <h1>Hoosier Trail</h1>
  <p class="subtitle" style="color: var(--c-wood); font-size: 1.1em; margin-bottom: 2em;">
    A single-player journey along the Oregon Trail, 1841–1869.
  </p>

  <div style="display: flex; flex-direction: column; gap: 1em; max-width: 400px;">
    <a href="/new">
      <button style="width: 100%; padding: 1em;">Start a New Journey</button>
    </a>
    <a href="/load" aria-disabled={!hasSaves}>
      <button style="width: 100%; padding: 1em;" disabled={!hasSaves}>
        Load a Saved Game {hasSaves ? `(${data.saves.length})` : ''}
      </button>
    </a>
  </div>
</div>
```

### Step 4 — Verify

```bash
npm run build
npm run dev
```

Visit `http://localhost:5173/` in a browser. Confirm:
- Landing page renders with the western theme.
- "Start a New Journey" link exists.
- "Load a Saved Game" button is disabled on a fresh visit.

Kill the dev server (Ctrl-C).

### Step 5 — Commit

```bash
git add -A
git commit -m "feat(ui): landing page + shared layout"
```

---

## Task 6: Party setup wizard (`/new`)

**Files:**
- Create: `src/routes/new/+page.svelte`
- Create: `src/routes/new/+page.server.ts`
- Create: `src/lib/game/content/historical-names.ts` — auto-populated name pool per memory

### Step 1 — Historical names pool

Create `src/lib/game/content/historical-names.ts`:

```ts
// Historical OT-era American names, per feedback memory. Split by gender so Whore profession stays female-only.
export const MALE_NAMES = [
  'John', 'William', 'James', 'Thomas', 'George', 'Samuel', 'Henry', 'Joseph',
  'Ezra', 'Amos', 'Elijah', 'Caleb', 'Isaac', 'Asa', 'Jedediah', 'Silas',
  'Nathaniel', 'Abraham', 'Jonas', 'Hiram', 'Obadiah', 'Enoch'
];

export const FEMALE_NAMES = [
  'Mary', 'Sarah', 'Rebecca', 'Martha', 'Abigail', 'Elizabeth', 'Hannah',
  'Ruth', 'Esther', 'Charity', 'Prudence', 'Temperance', 'Patience',
  'Susannah', 'Abigail', 'Margaret', 'Catherine', 'Rachel', 'Lydia', 'Phoebe'
];

export function randomName(gender: 'male' | 'female', seed: number): string {
  const pool = gender === 'female' ? FEMALE_NAMES : MALE_NAMES;
  return pool[seed % pool.length];
}
```

### Step 2 — Form action

Create `src/routes/new/+page.server.ts`:

```ts
import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { createInitialState } from '$lib/game/engine';
import { PROFESSIONS } from '$lib/game/content/professions';
import type { ProfessionId } from '$lib/game/types';

export const load: PageServerLoad = async () => {
  return {
    professions: Object.values(PROFESSIONS).map((p) => ({
      id: p.id,
      name: p.name,
      bonusSummary: p.bonusSummary,
      femaleOnly: !!p.femaleOnly
    }))
  };
};

interface PartyFormMember {
  name: string;
  profession: ProfessionId;
}

function parseMembers(fd: FormData): PartyFormMember[] {
  const members: PartyFormMember[] = [];
  for (let i = 0; i < 6; i++) {
    const name = fd.get(`member_${i}_name`)?.toString();
    const profession = fd.get(`member_${i}_profession`)?.toString() as ProfessionId | undefined;
    if (!name || !profession) continue;
    members.push({ name, profession });
  }
  return members;
}

export const actions: Actions = {
  depart: async ({ request, locals }) => {
    const fd = await request.formData();
    const members = parseMembers(fd);
    if (members.length < 2) return fail(400, { error: 'Party must have at least 2 adults.' });
    if (members.length > 6) return fail(400, { error: 'Party must have at most 6 adults.' });

    const year = parseInt(fd.get('year')?.toString() ?? '1848', 10);
    const month = parseInt(fd.get('month')?.toString() ?? '4', 10);
    const day = parseInt(fd.get('day')?.toString() ?? '15', 10);

    const seed = `${locals.deviceId}-${Date.now()}`;
    const state = createInitialState({
      seed,
      leader: members[0],
      companions: members.slice(1),
      startDate: { year, month, day }
    });

    const slotName = `Journey ${new Date().toLocaleDateString()}`;
    await locals.repo.save(locals.deviceId, slotName, state);

    // Redirect will be /play in Plan 4b; for now send them to the landing page where they can see the save exists.
    throw redirect(303, `/?created=${encodeURIComponent(slotName)}`);
  }
};
```

### Step 3 — Wizard UI

Create `src/routes/new/+page.svelte`:

```svelte
<script lang="ts">
  import { MALE_NAMES, FEMALE_NAMES } from '$lib/game/content/historical-names';

  let { data, form } = $props();

  type Member = { name: string; profession: string };
  let members = $state<Member[]>([
    { name: MALE_NAMES[0], profession: 'farmer' },
    { name: FEMALE_NAMES[0], profession: 'doctor' }
  ]);

  let year = $state(1848);
  let month = $state(4);
  let day = $state(15);

  function addMember() {
    if (members.length >= 6) return;
    const nextName = members.length % 2 === 0 ? MALE_NAMES[members.length] : FEMALE_NAMES[members.length];
    members.push({ name: nextName, profession: 'hunter' });
  }
  function removeMember(i: number) {
    if (members.length <= 2) return;
    members.splice(i, 1);
  }
</script>

<div class="container">
  <h1>Assemble your party</h1>
  <p class="subtitle" style="color: var(--c-wood);">2 to 6 adults. Pick a profession for each — stacks matter.</p>

  {#if form?.error}
    <div class="panel" style="border-color: var(--c-rust); margin: 1em 0;">{form.error}</div>
  {/if}

  <form method="POST" action="?/depart">
    <div style="display: flex; flex-direction: column; gap: 0.8em; margin-bottom: 1.5em;">
      {#each members as m, i}
        <div class="panel" style="display: grid; grid-template-columns: 2fr 2fr auto; gap: 0.5em; align-items: center;">
          <input type="text" name="member_{i}_name" bind:value={m.name} placeholder="Name" />
          <select name="member_{i}_profession" bind:value={m.profession}>
            {#each data.professions as p}
              <option value={p.id}>{p.name}</option>
            {/each}
          </select>
          {#if members.length > 2}
            <button type="button" onclick={() => removeMember(i)} style="padding: 0.3em 0.7em;">✕</button>
          {:else}
            <span style="color: var(--c-wood); font-size: 0.8em;">required</span>
          {/if}
        </div>
      {/each}
    </div>

    {#if members.length < 6}
      <button type="button" onclick={addMember} style="margin-bottom: 1.5em;">+ Add companion</button>
    {/if}

    <h2>When do we set out?</h2>
    <div style="display: flex; gap: 1em; margin-bottom: 2em;">
      <label>Year
        <input type="number" name="year" bind:value={year} min="1841" max="1869" />
      </label>
      <label>Month
        <select name="month" bind:value={month}>
          <option value={3}>March</option>
          <option value={4}>April</option>
          <option value={5}>May</option>
          <option value={6}>June</option>
        </select>
      </label>
      <label>Day
        <input type="number" name="day" bind:value={day} min="1" max="30" />
      </label>
    </div>

    <button type="submit" style="font-size: 1.1em; padding: 0.8em 1.5em;">Depart</button>
    <a href="/" style="margin-left: 1em;">Cancel</a>
  </form>

  <h3 style="margin-top: 2em;">Profession bonuses</h3>
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5em;">
    {#each data.professions as p}
      <div class="panel" style="font-size: 0.9em;">
        <strong style="color: var(--c-rust);">{p.name}</strong>{#if p.femaleOnly} <span style="color: var(--c-wood); font-size: 0.8em;">(female-only)</span>{/if}
        <div>{p.bonusSummary}</div>
      </div>
    {/each}
  </div>
</div>
```

### Step 4 — Verify manually

```bash
npm run build
npm run dev
```

Visit `/new`, add a companion, change professions, submit. Confirm you land back at `/` with the save visible in `data.saves`. Kill dev server.

### Step 5 — Commit

```bash
git add -A
git commit -m "feat(ui): party setup wizard"
```

---

## Task 7: Save slot picker (`/load`) + saves API

**Files:**
- Create: `src/routes/load/+page.svelte`
- Create: `src/routes/load/+page.server.ts`
- Create: `src/routes/api/saves/+server.ts`
- Create: `tests/server/saves-api.test.ts`

### Step 1 — Load page server actions

Create `src/routes/load/+page.server.ts`:

```ts
import type { Actions, PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
  const saves = await locals.repo.list(locals.deviceId);
  return {
    saves: saves.map((s) => ({
      id: s.id,
      slotName: s.slotName,
      summary: s.summary,
      updatedAt: s.updatedAt.toISOString()
    }))
  };
};

export const actions: Actions = {
  load: async ({ request, locals }) => {
    const fd = await request.formData();
    const slotName = fd.get('slotName')?.toString();
    if (!slotName) throw error(400, 'slotName required');
    const state = await locals.repo.load(locals.deviceId, slotName);
    if (!state) throw error(404, `No save in slot "${slotName}"`);
    // Plan 4b wires /play; for now just redirect home with a marker.
    throw redirect(303, `/?loaded=${encodeURIComponent(slotName)}`);
  },
  delete: async ({ request, locals }) => {
    const fd = await request.formData();
    const slotName = fd.get('slotName')?.toString();
    if (!slotName) throw error(400, 'slotName required');
    await locals.repo.delete(locals.deviceId, slotName);
    throw redirect(303, '/load');
  }
};
```

### Step 2 — Load page UI

Create `src/routes/load/+page.svelte`:

```svelte
<script lang="ts">
  let { data } = $props();
</script>

<div class="container">
  <h1>Load a saved journey</h1>

  {#if data.saves.length === 0}
    <p>No saves yet. <a href="/new">Start a new journey</a>.</p>
  {:else}
    <div style="display: flex; flex-direction: column; gap: 0.8em;">
      {#each data.saves as save}
        <div class="panel" style="display: flex; justify-content: space-between; align-items: center; gap: 1em;">
          <div>
            <strong style="color: var(--c-rust);">{save.slotName}</strong>
            <div style="font-size: 0.9em;">{save.summary}</div>
            <div style="font-size: 0.75em; color: var(--c-wood);">Saved {new Date(save.updatedAt).toLocaleString()}</div>
          </div>
          <div style="display: flex; gap: 0.5em;">
            <form method="POST" action="?/load">
              <input type="hidden" name="slotName" value={save.slotName} />
              <button type="submit">Load</button>
            </form>
            <form method="POST" action="?/delete" onsubmit={(e) => { if (!confirm(`Delete "${save.slotName}"?`)) e.preventDefault(); }}>
              <input type="hidden" name="slotName" value={save.slotName} />
              <button type="submit" style="background: var(--c-panel); color: var(--c-wood);">Delete</button>
            </form>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <p style="margin-top: 2em;"><a href="/">← Back</a></p>
</div>
```

### Step 3 — JSON API

Create `src/routes/api/saves/+server.ts`:

```ts
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ locals }) => {
  const saves = await locals.repo.list(locals.deviceId);
  return json({ saves: saves.map((s) => ({ slotName: s.slotName, summary: s.summary, updatedAt: s.updatedAt })) });
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
  const slotName = url.searchParams.get('slot');
  if (!slotName) throw error(400, 'slot parameter required');
  await locals.repo.delete(locals.deviceId, slotName);
  return new Response(null, { status: 204 });
};
```

### Step 4 — API tests

Create `tests/server/saves-api.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '../../src/lib/db/client';
import { SavesRepo } from '../../src/lib/db/saves-repo';
import { createInitialState } from '../../src/lib/game/engine';

describe('saves API shape (via SavesRepo)', () => {
  let dir: string;
  let handle: ReturnType<typeof createClient>;
  let repo: SavesRepo;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'ht-api-'));
    handle = createClient(join(dir, 'db.sqlite'));
    repo = new SavesRepo(handle.db);
  });

  afterEach(() => {
    handle.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('list returns empty for new device', async () => {
    const deviceId = await repo.createDevice();
    const saves = await repo.list(deviceId);
    expect(saves).toEqual([]);
  });

  it('list → save → list flow returns the saved summary', async () => {
    const deviceId = await repo.createDevice();
    const state = createInitialState({
      seed: 'api',
      leader: { name: 'Ezra', profession: 'farmer' },
      companions: [{ name: 'Mary', profession: 'doctor' }],
      startDate: { year: 1848, month: 4, day: 15 }
    });
    await repo.save(deviceId, 'slot-1', state);
    const saves = await repo.list(deviceId);
    expect(saves).toHaveLength(1);
    expect(saves[0].summary).toContain('Ezra');
  });

  it('save → save same slot (upsert) does not duplicate', async () => {
    const deviceId = await repo.createDevice();
    const state = createInitialState({
      seed: 'up',
      leader: { name: 'A', profession: 'farmer' },
      companions: [{ name: 'B', profession: 'doctor' }],
      startDate: { year: 1848, month: 4, day: 15 }
    });
    await repo.save(deviceId, 'slot-1', state);
    await repo.save(deviceId, 'slot-1', state);
    const saves = await repo.list(deviceId);
    expect(saves).toHaveLength(1);
  });
});
```

(We're testing SavesRepo directly rather than spinning up a live HTTP server for now; real HTTP-level integration is smoke-tested via `npm run build` + manual dev-server check. A full request-cycle test using SvelteKit's test utilities is deferred to Plan 4b when the play loop exists.)

### Step 5 — Verify, commit

```bash
npm run build
npm test
npm run check
git add -A
git commit -m "feat(ui): save slot picker + saves API"
```

---

## Task 8: Manual smoke test + docs

**Files:**
- Modify: `README.md` — add dev instructions

### Step 1 — Manual smoke

```bash
npm run build
PORT=5173 node build/index.js &
# In browser: http://localhost:5173/
# Click "Start a New Journey"
# Fill in party, click Depart
# Verify redirect to /?created=...
# Click "Load a Saved Game"
# Verify the save appears
# Click Delete, confirm
# Verify save disappears
kill %1   # stop the server
```

If everything works, commit the README update below.

### Step 2 — Update README

Append a section to `README.md`:

```markdown
## Running the UI

```bash
npm run build         # produces build/
node build/index.js   # starts the self-hosted server on :3000
```

Open `http://localhost:3000/` (or whatever `PORT` you set) in a browser.

Current UI screens (Plan 4a):
- `/` — landing, list saves
- `/new` — party-setup wizard, start a new game
- `/load` — load or delete existing saves

Main play screen arrives in Plan 4b.
```

### Step 3 — Commit

```bash
git add README.md
git commit -m "docs: note Plan 4a UI routes in README"
```

---

## Verification Checklist

- [ ] `npm test` all pass (~225+).
- [ ] `npm run check` 0 errors.
- [ ] `npm run build` produces `build/` with adapter-node output.
- [ ] Dev server renders `/`, `/new`, `/load` correctly.
- [ ] A new game can be created, saved, and deleted via the UI.
- [ ] Device cookie is set on first visit; persists across reloads.
- [ ] All three Plan 4 prereq tasks closed: #30 (SSR migrations path), #31 (TOCTOU save), #32 (save version field).

---

## Handoff to Plan 4b

Plan 4b lands the main play screen: map rendering with animated wagon + landmarks, party/inventory panels, event log, and the Travel action button wired to `tickDay` with event modals pausing the loop. Also wires `/play?slot=...` as the destination for both "Depart" and "Load" redirects.
