# Plan 4b: Main Play Screen — Hoosier Trail

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the `/play` route that loads a save, renders the core game screen (map + party + inventory + event log + action bar), and wires Travel/Rest/Camp buttons to advance the game and autosave. Hunt / Ford / Trade are routed to stubs for now — the full interactive modals arrive in Plan 4c. Events auto-resolve (default choice) in this plan, same as before; interactive event modals also ship in Plan 4c.

**Architecture:** Single SvelteKit page at `/play` keyed by `?slot=NAME`. Server-side `load` reads the save and returns the initial `GameState`. Client-side action buttons POST to form actions that take a slot + action type, run the appropriate engine function (`tickDay`, `rest`, `camp`, ...), persist via `SavesRepo.save`, then return the updated state. Minimal client-side state — the page re-renders from server data after each POST.

**Tech Stack:** Same.

**Companion spec:** §9.4 (main play screen layout), §9.6 (action bar rules).

**Builds on:** Plan 4a merged.

---

## File Structure

### New files

| Path | Responsibility |
|---|---|
| `src/routes/play/+page.svelte` | The main play screen |
| `src/routes/play/+page.server.ts` | Loader + form actions for game actions |
| `src/lib/ui/TrailMap.svelte` | Parchment-styled map with landmarks + wagon |
| `src/lib/ui/PartyPanel.svelte` | Party-member list with health + conditions |
| `src/lib/ui/InventoryPanel.svelte` | Inventory table |
| `src/lib/ui/EventLog.svelte` | Scrollable recent events |
| `src/lib/ui/ActionBar.svelte` | Travel/Rest/Camp/Hunt/Trade/Ford buttons |
| `src/lib/ui/EndScreen.svelte` | Arrived / wiped / stranded summary |
| `tests/server/play-actions.test.ts` | Form-action logic tests |

### Files modified

| Path | Change |
|---|---|
| `src/routes/new/+page.server.ts` | After `depart` success, redirect to `/play?slot=<slotName>` (not `/?created=...`) |
| `src/routes/load/+page.server.ts` | `load` action redirects to `/play?slot=<slotName>` (not `/?loaded=...`) |

---

## Conventions locked by this plan

### Action dispatch

Play page form actions accept a slot and an action kind:

```
POST /play?slot=X  with form field action=travel|rest|camp|hunt|ford|trade
```

The server action loads the save, calls the appropriate engine function, saves, returns. Travel in this plan runs a **configurable number of `tickDay` cycles** (default 1) controlled by form field `days=N`. Events inside tickDay auto-resolve via default choice.

### Autosave slot

All play actions save back into the same slot the player opened. No manual save-as in Plan 4b — that's Plan 4d polish. The slot name doubles as the autosave target.

### End-of-game

When `state.completed === true`, the page renders `EndScreen.svelte` instead of the action bar and shows the outcome (arrived, wiped, stranded).

---

## Task 1: `/play` route skeleton + loader

**Files:**
- Create: `src/routes/play/+page.server.ts`
- Create: `src/routes/play/+page.svelte` (minimal skeleton)
- Modify: `src/routes/new/+page.server.ts` (redirect to /play)
- Modify: `src/routes/load/+page.server.ts` (redirect to /play)

### Step 1 — Loader

Create `src/routes/play/+page.server.ts`:

```ts
import type { PageServerLoad, Actions } from './$types';
import { error } from '@sveltejs/kit';
import { tickDay } from '$lib/game/engine';
import { rest } from '$lib/game/actions/rest';
import { camp } from '$lib/game/actions/camp';

export const load: PageServerLoad = async ({ url, locals }) => {
  const slot = url.searchParams.get('slot');
  if (!slot) throw error(400, 'Missing ?slot=<name>');

  const state = await locals.repo.load(locals.deviceId, slot);
  if (!state) throw error(404, `No save in slot "${slot}"`);

  return { slot, state };
};

async function loadState(locals: App.Locals, slot: string) {
  const s = await locals.repo.load(locals.deviceId, slot);
  if (!s) throw error(404, `Save "${slot}" not found`);
  return s;
}

export const actions: Actions = {
  travel: async ({ url, request, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    const fd = await request.formData();
    const days = Math.max(1, Math.min(10, parseInt(fd.get('days')?.toString() ?? '1', 10)));
    let state = await loadState(locals, slot);
    for (let i = 0; i < days && !state.completed; i++) {
      state = tickDay(state);
    }
    await locals.repo.save(locals.deviceId, slot, state);
    return { state };
  },

  rest: async ({ url, request, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    const fd = await request.formData();
    const days = Math.max(1, Math.min(7, parseInt(fd.get('days')?.toString() ?? '1', 10)));
    let state = await loadState(locals, slot);
    state = rest(state, days);
    await locals.repo.save(locals.deviceId, slot, state);
    return { state };
  },

  camp: async ({ url, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    let state = await loadState(locals, slot);
    state = camp(state, {});
    await locals.repo.save(locals.deviceId, slot, state);
    return { state };
  }
};
```

### Step 2 — Minimal play page (skeleton)

Create `src/routes/play/+page.svelte`:

```svelte
<script lang="ts">
  let { data, form } = $props();
  const state = $derived(form?.state ?? data.state);
</script>

<div class="container">
  <h1>{state.party[0].name}'s Journey</h1>
  <p>Day {state.day} · {state.date.year}-{state.date.month}-{state.date.day} · {state.location.milesTraveled} mi</p>
  <p>Next stop: {state.location.nextLandmarkId}</p>
  <p>Morale {state.morale} · Cash ${state.cash}</p>
  <p>Pace: {state.pace} · Rations: {state.rations}</p>

  {#if state.completed}
    <p><strong>Journey ended: {state.outcome}</strong></p>
  {:else}
    <form method="POST" action="?/travel&slot={encodeURIComponent(data.slot)}">
      <input type="hidden" name="days" value="1" />
      <button type="submit">Travel 1 Day</button>
    </form>
  {/if}

  <p style="margin-top: 2em;"><a href="/">← Home</a></p>
</div>
```

### Step 3 — Redirect from `new` and `load` to `/play`

In `src/routes/new/+page.server.ts`, change the final redirect:

```ts
throw redirect(303, `/play?slot=${encodeURIComponent(slotName)}`);
```

In `src/routes/load/+page.server.ts`, change the `load` action's redirect:

```ts
throw redirect(303, `/play?slot=${encodeURIComponent(slotName)}`);
```

### Step 4 — Verify build + manual smoke

```bash
npm run build
npm test
npm run check
```

Then manual: `node build/index.js`, visit `/new`, create a party, depart, confirm redirect to `/play?slot=...` and the basic page renders with Day 1 and a Travel button. Click Travel, verify Day 2.

### Step 5 — Commit

```bash
git add -A
git commit -m "feat(ui): /play route with basic tick + autosave"
```

---

## Task 2: Side panels (PartyPanel + InventoryPanel + EventLog)

**Files:**
- Create: `src/lib/ui/PartyPanel.svelte`
- Create: `src/lib/ui/InventoryPanel.svelte`
- Create: `src/lib/ui/EventLog.svelte`

### Step 1 — PartyPanel

Create `src/lib/ui/PartyPanel.svelte`:

```svelte
<script lang="ts">
  import type { GameState } from '$lib/game/types';
  let { state }: { state: GameState } = $props();

  function statusLabel(m: GameState['party'][0]): string {
    if (m.dead) return `✝ dead (${m.deathCause ?? 'unknown'})`;
    if (m.conditions.length > 0) return m.conditions.map((c) => c.id).join(', ');
    if (m.health < 50) return 'hurting';
    if (m.health < 80) return 'tired';
    return 'ok';
  }
</script>

<div class="panel">
  <h4 style="color: var(--c-rust); margin: 0 0 0.5em 0;">PARTY</h4>
  <div style="display: flex; flex-direction: column; gap: 0.2em;">
    {#each state.party as m}
      <div style="font-size: 0.9em; {m.dead ? 'opacity: 0.5;' : ''}">
        <strong>{m.name}</strong>
        {#if m.isLeader}<span style="color: var(--c-rust);">*</span>{/if}
        <span style="color: var(--c-wood); font-size: 0.85em;">({m.profession})</span>
        <div style="font-size: 0.8em;">HP {m.health}/100 · {statusLabel(m)}</div>
      </div>
    {/each}
  </div>

  <h4 style="color: var(--c-rust); margin: 1em 0 0.5em 0;">MORALE</h4>
  <div style="font-size: 0.9em;">{state.morale} / 100</div>

  <h4 style="color: var(--c-rust); margin: 1em 0 0.5em 0;">OXEN</h4>
  <div style="font-size: 0.85em;">
    {state.oxen.filter((o) => o.health > 0).length} alive / {state.oxen.length} total
  </div>
</div>
```

### Step 2 — InventoryPanel

Create `src/lib/ui/InventoryPanel.svelte`:

```svelte
<script lang="ts">
  import type { GameState } from '$lib/game/types';
  import { getItem, ITEMS } from '$lib/game/content/items';
  let { state }: { state: GameState } = $props();

  const entries = $derived(
    Object.entries(state.inventory)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const meta = ITEMS[id];
        return {
          id,
          qty,
          name: meta?.name ?? id,
          category: meta?.category ?? 'other'
        };
      })
      .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
  );
</script>

<div class="panel">
  <h4 style="color: var(--c-rust); margin: 0 0 0.5em 0;">INVENTORY</h4>
  <div style="font-size: 0.85em; max-height: 300px; overflow-y: auto;">
    {#each entries as e}
      <div style="display: flex; justify-content: space-between; gap: 0.5em; padding: 1px 0;">
        <span>{e.name}</span>
        <span style="color: var(--c-wood);">{e.qty}</span>
      </div>
    {/each}
  </div>

  <h4 style="color: var(--c-rust); margin: 1em 0 0.5em 0;">SUPPLIES</h4>
  <div style="font-size: 0.85em;">
    Cash ${state.cash}<br>
    Water {state.resources.water} / {state.resources.waterCap} gal<br>
    Wagon {Math.round(state.wagon.condition)}/100
  </div>
</div>
```

### Step 3 — EventLog

Create `src/lib/ui/EventLog.svelte`:

```svelte
<script lang="ts">
  import type { GameState } from '$lib/game/types';
  let { state }: { state: GameState } = $props();

  const entries = $derived([...state.eventLog].slice(-20).reverse());
</script>

<div class="panel" style="max-height: 200px; overflow-y: auto;">
  <h4 style="color: var(--c-rust); margin: 0 0 0.5em 0;">EVENT LOG</h4>
  <div style="font-size: 0.85em; line-height: 1.4;">
    {#each entries as e}
      <div>
        <span style="color: var(--c-rust);">Day {e.day}</span> · {e.text}
      </div>
    {/each}
  </div>
</div>
```

### Step 4 — Commit (components only; page wiring is Task 4)

```bash
npm test
npm run check
git add -A
git commit -m "feat(ui): party, inventory, event-log panel components"
```

---

## Task 3: TrailMap component

**Files:**
- Create: `src/lib/ui/TrailMap.svelte`

Renders the full landmark list as dots on a parchment background with the wagon at the current position. Simple CSS-only styling — no SVG yet.

### Step 1 — Component

Create `src/lib/ui/TrailMap.svelte`:

```svelte
<script lang="ts">
  import type { GameState } from '$lib/game/types';
  import { LANDMARKS } from '$lib/game/content/landmarks';
  let { state }: { state: GameState } = $props();

  // Total trail miles (sum of milesFromPrevious).
  const totalMiles = LANDMARKS.reduce((s, l) => s + l.milesFromPrevious, 0);

  // For each landmark compute its cumulative mileage and percentage along the trail.
  const markers = (() => {
    let cum = 0;
    return LANDMARKS.map((l) => {
      cum += l.milesFromPrevious;
      return {
        ...l,
        mile: cum,
        pct: (cum / totalMiles) * 100
      };
    });
  })();

  const wagonPct = $derived(Math.min(100, (state.location.milesTraveled / totalMiles) * 100));
  const previousId = $derived(state.location.previousLandmarkId);
</script>

<div class="map panel" style="background: var(--c-parchment); color: var(--c-ink); position: relative; min-height: 320px; padding: 1em 1em 4em 1em;">
  <h4 style="color: var(--c-ink); margin: 0 0 0.5em 0; letter-spacing: 0.15em;">THE TRAIL — {Math.round(state.location.milesTraveled)} / {totalMiles} mi</h4>

  <!-- Dashed trail -->
  <div style="position: relative; height: 200px; margin-top: 1em;">
    <div style="position: absolute; top: 50%; left: 4%; right: 4%; height: 2px; background: repeating-linear-gradient(to right, var(--c-rust) 0 6px, transparent 6px 12px);"></div>

    {#each markers as m}
      {@const reached = previousId && markers.findIndex((x) => x.id === previousId) >= markers.indexOf(m)}
      <div
        style="
          position: absolute;
          left: calc({Math.max(4, Math.min(96, m.pct))}% - 6px);
          top: 50%;
          transform: translateY(-50%);
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: {m.kind === 'river' ? '#6a8aa8' : (reached ? 'var(--c-ink)' : 'var(--c-wood)')};
          border: 2px solid var(--c-ink);
        "
        title="{m.name} ({m.mile} mi)"
      ></div>
    {/each}

    <!-- Wagon -->
    <div style="
      position: absolute;
      left: calc({Math.max(2, Math.min(98, wagonPct))}% - 12px);
      top: 38%;
      transform: translateY(-50%);
      font-size: 1.5em;
    ">🐂🛖</div>
  </div>

  <!-- Next landmark flavor -->
  <div style="font-size: 0.85em; font-style: italic; position: absolute; bottom: 1em; left: 1em; right: 1em; text-align: center;">
    Heading for {markers.find((m) => m.id === state.location.nextLandmarkId)?.name ?? '—'}
  </div>
</div>
```

### Step 2 — Commit

```bash
npm test
npm run check
git add -A
git commit -m "feat(ui): TrailMap component with landmarks + wagon"
```

---

## Task 4: ActionBar + end screen + assemble play page

**Files:**
- Create: `src/lib/ui/ActionBar.svelte`
- Create: `src/lib/ui/EndScreen.svelte`
- Rewrite: `src/routes/play/+page.svelte` to use all the components

### Step 1 — ActionBar

Create `src/lib/ui/ActionBar.svelte`:

```svelte
<script lang="ts">
  let { slot }: { slot: string } = $props();
  const qp = encodeURIComponent(slot);

  let travelDays = $state(3);
  let restDays = $state(2);
</script>

<div class="panel" style="display: flex; flex-wrap: wrap; gap: 0.5em; align-items: center;">
  <form method="POST" action="?/travel&slot={qp}" style="display: flex; gap: 0.3em; align-items: center;">
    <input type="number" name="days" bind:value={travelDays} min="1" max="10" style="width: 4em;" />
    <button type="submit">Travel</button>
  </form>

  <form method="POST" action="?/rest&slot={qp}" style="display: flex; gap: 0.3em; align-items: center;">
    <input type="number" name="days" bind:value={restDays} min="1" max="7" style="width: 4em;" />
    <button type="submit">Rest</button>
  </form>

  <form method="POST" action="?/camp&slot={qp}">
    <button type="submit">Camp</button>
  </form>

  <button type="button" disabled title="Plan 4c">Hunt</button>
  <button type="button" disabled title="Plan 4c">Trade</button>
  <button type="button" disabled title="Plan 4c">Ford</button>
</div>
```

### Step 2 — EndScreen

Create `src/lib/ui/EndScreen.svelte`:

```svelte
<script lang="ts">
  import type { GameState } from '$lib/game/types';
  let { state }: { state: GameState } = $props();

  const summary = $derived((() => {
    if (state.outcome === 'arrived') return `You arrived in Oregon City after ${state.day} days. ${state.party.filter((m) => !m.dead).length} survivors.`;
    if (state.outcome === 'wiped') return `The whole party perished on day ${state.day}.`;
    if (state.outcome === 'stranded') return `Stranded on the trail on day ${state.day}.`;
    return 'Journey ended.';
  })());
</script>

<div class="panel" style="border-color: var(--c-rust); padding: 1.5em;">
  <h2 style="color: var(--c-rust);">Journey's End</h2>
  <p>{summary}</p>
  <ul style="font-size: 0.9em;">
    {#each state.party as m}
      <li>{m.name} ({m.profession}) — {m.dead ? `✝ died day ${m.deathDay}, ${m.deathCause}` : `survived, HP ${m.health}`}</li>
    {/each}
  </ul>
  <p style="margin-top: 1em;"><a href="/">← Home</a></p>
</div>
```

### Step 3 — Rewrite play page to use all components

Replace `src/routes/play/+page.svelte` with:

```svelte
<script lang="ts">
  import TrailMap from '$lib/ui/TrailMap.svelte';
  import PartyPanel from '$lib/ui/PartyPanel.svelte';
  import InventoryPanel from '$lib/ui/InventoryPanel.svelte';
  import EventLog from '$lib/ui/EventLog.svelte';
  import ActionBar from '$lib/ui/ActionBar.svelte';
  import EndScreen from '$lib/ui/EndScreen.svelte';

  let { data, form } = $props();
  const state = $derived(form?.state ?? data.state);
</script>

<div style="display: grid; grid-template-columns: 1fr 240px; grid-template-rows: auto auto auto; gap: 0.8em; padding: 0.8em; min-height: calc(100vh - 60px);">
  <!-- Header -->
  <div class="panel" style="grid-column: 1 / 3; display: flex; justify-content: space-between; align-items: center;">
    <h2 style="margin: 0;">{state.party[0].name}'s Journey</h2>
    <div style="color: var(--c-wood);">
      Day {state.day} · {state.date.year}-{String(state.date.month).padStart(2, '0')}-{String(state.date.day).padStart(2, '0')} · {state.pace} · {state.rations}
    </div>
  </div>

  <!-- Map -->
  <div style="grid-column: 1; grid-row: 2;">
    <TrailMap {state} />
  </div>

  <!-- Right rail -->
  <div style="grid-column: 2; grid-row: 2 / 4; display: flex; flex-direction: column; gap: 0.8em;">
    <PartyPanel {state} />
    <InventoryPanel {state} />
  </div>

  <!-- Actions / End screen -->
  <div style="grid-column: 1; grid-row: 3;">
    {#if state.completed}
      <EndScreen {state} />
    {:else}
      <ActionBar slot={data.slot} />
    {/if}
  </div>

  <!-- Event log (full width bottom) -->
  <div style="grid-column: 1 / 3; grid-row: 4;">
    <EventLog {state} />
  </div>
</div>
```

### Step 4 — Verify + commit

```bash
npm run build
npm test
npm run check
git add -A
git commit -m "feat(ui): ActionBar, EndScreen, assembled play screen"
```

Manual smoke: `node build/index.js`, create game, verify all zones render, click Travel a few times, verify log grows, verify miles go up, verify map wagon moves.

---

## Task 5: Play actions tests

**Files:**
- Create: `tests/server/play-actions.test.ts`

Direct tests of the engine-function integration (same pattern as `tests/server/saves-api.test.ts`). Tests that a save loads → travel advances days → state persists.

### Step 1 — Write tests

Create `tests/server/play-actions.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '../../src/lib/db/client';
import { SavesRepo } from '../../src/lib/db/saves-repo';
import { createInitialState, tickDay } from '../../src/lib/game/engine';
import { rest } from '../../src/lib/game/actions/rest';
import { camp } from '../../src/lib/game/actions/camp';

function fresh() {
  return createInitialState({
    seed: 'play',
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [{ name: 'Mary', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
}

describe('play action persistence', () => {
  let dir: string;
  let handle: ReturnType<typeof createClient>;
  let repo: SavesRepo;
  let deviceId: string;

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'ht-play-'));
    handle = createClient(join(dir, 'db.sqlite'));
    repo = new SavesRepo(handle.db);
    deviceId = await repo.createDevice();
    await repo.save(deviceId, 'slot-1', fresh());
  });

  afterEach(() => {
    handle.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('travel action advances day and persists', async () => {
    let state = await repo.load(deviceId, 'slot-1');
    expect(state).not.toBeNull();
    for (let i = 0; i < 3 && !state!.completed; i++) {
      state = tickDay(state!);
    }
    await repo.save(deviceId, 'slot-1', state!);

    const reloaded = await repo.load(deviceId, 'slot-1');
    expect(reloaded?.day).toBe(4);
  });

  it('rest action advances days, recovers ox fatigue', async () => {
    let state = (await repo.load(deviceId, 'slot-1'))!;
    state = rest(state, 3);
    await repo.save(deviceId, 'slot-1', state);

    const reloaded = await repo.load(deviceId, 'slot-1');
    expect(reloaded?.day).toBe(4);
  });

  it('camp action advances one day and saves', async () => {
    let state = (await repo.load(deviceId, 'slot-1'))!;
    state = camp(state, {});
    await repo.save(deviceId, 'slot-1', state);

    const reloaded = await repo.load(deviceId, 'slot-1');
    expect(reloaded?.day).toBe(2);
  });
});
```

### Step 2 — Commit

```bash
npm test
npm run check
git add -A
git commit -m "test: play action persistence tests"
```

---

## Verification Checklist

- [ ] `npm test` all pass.
- [ ] `npm run check` 0 errors.
- [ ] `npm run build` succeeds.
- [ ] `/play?slot=X` renders all five zones: map, party, inventory, actions, event log.
- [ ] Travel button advances the day and shows updated state.
- [ ] Rest and Camp buttons work.
- [ ] Hunt/Trade/Ford buttons are visibly disabled (Plan 4c).
- [ ] End screen appears when `state.completed === true`.

---

## Handoff to Plan 4c

Plan 4c lands:
- Interactive event modals (pause tick for user choice)
- Hunt action modal (target / ammo / hunters pickers)
- Ford action modal (method + wait-days pickers)
- Trade action modal (at trading posts: buy/sell tables)
- Fullscreen map toggle

Plan 4d lands:
- Pixel-art sprites replacing emoji
- Z Fold 4 responsive layout
- Polish pass on typography + spacing
