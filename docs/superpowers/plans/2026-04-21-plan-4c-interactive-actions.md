# Plan 4c: Interactive Actions & Event Pausing — Hoosier Trail

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the player interactive control over every action and event. Events pause the tick loop and prompt a choice. Hunt, Ford, and Trade each get their own input UI that unlocks at the right time. Adds a fullscreen map toggle for better readability.

**Architecture:** A new `tickDayPausable(state, rng)` function mirrors `tickDay` but returns `{ state, pendingEvent? }` — if an event fired, the event is returned *unresolved* and the caller presents the modal. Resolving the event posts to a separate form action (`?/resolve`) that applies the chosen choice and re-enters the loop. Existing `tickDay` stays auto-resolving for tests. Hunt/Ford/Trade are inline modal forms on the play page, shown when the player clicks their action button (and the contextual guards allow).

**Tech Stack:** Same.

**Companion spec:** §5.5 (hunting), §5.6 (fording), §5.8 (trading), §9.6 (action bar context-aware buttons), §9.4 (fullscreen map).

**Builds on:** Plan 4b merged.

---

## File Structure

### New files

| Path | Responsibility |
|---|---|
| `src/lib/game/engine-pausable.ts` | `tickDayPausable(state, rng)` with event-pause return |
| `src/lib/ui/EventModal.svelte` | Pause modal with choice buttons |
| `src/lib/ui/HuntModal.svelte` | Hunt action picker |
| `src/lib/ui/FordModal.svelte` | Ford action picker (method + waitDays) |
| `src/lib/ui/TradeModal.svelte` | Trade action: buy/sell tables |
| `tests/engine-pausable.test.ts` | Pausable tick behavior |
| `tests/server/play-action-modals.test.ts` | Hunt/Ford/Trade persist after form actions |

### Files modified

| Path | Change |
|---|---|
| `src/routes/play/+page.server.ts` | New actions: `resolveEvent`, `hunt`, `ford`, `trade`; travel uses `tickDayPausable` |
| `src/routes/play/+page.svelte` | Renders modals conditionally based on `pendingEvent`, `showHunt`, etc. |
| `src/lib/ui/ActionBar.svelte` | Enable Hunt button always; Ford only when at river landmark; Trade only at trading post |
| `src/lib/ui/TrailMap.svelte` | Fullscreen-toggle button in upper right |

---

## Task 1: Pausable tick engine

**Files:**
- Create: `src/lib/game/engine-pausable.ts`
- Create: `tests/engine-pausable.test.ts`

### Step 1 — Write failing tests

Create `tests/engine-pausable.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { tickDayPausable, applyPendingChoice } from '../src/lib/game/engine-pausable';
import { makeRng } from '../src/lib/game/rng';
import { createInitialState } from '../src/lib/game/engine';
import { EVENTS } from '../src/lib/game/content/events';

function newGame(seed = 'pausable') {
  return createInitialState({
    seed,
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [
      { name: 'Mary', profession: 'doctor' },
      { name: 'Tom', profession: 'hunter' }
    ],
    startDate: { year: 1848, month: 4, day: 15 }
  });
}

describe('tickDayPausable', () => {
  it('returns state only when no event fires', () => {
    // Find a (seed, day) combo where no event fires.
    let s = newGame('no-event');
    for (let attempt = 0; attempt < 20; attempt++) {
      const result = tickDayPausable(s);
      if (!result.pendingEvent) {
        expect(result.state.day).toBe(s.day + 1);
        return;
      }
      s = applyPendingChoice(result.state, result.pendingEvent, result.pendingEvent.choices.find(c => c.isDefault)!.id);
    }
    // In worst case this test may fire in every attempt — just fine.
  });

  it('returns pendingEvent when an event fires', () => {
    // Use a seed that produces an event on day 1.
    const seeds = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    for (const seed of seeds) {
      const result = tickDayPausable(newGame(seed));
      if (result.pendingEvent) {
        expect(result.pendingEvent.id).toBeTruthy();
        expect(result.pendingEvent.choices.length).toBeGreaterThanOrEqual(1);
        // Day DID NOT advance yet (pending resolution holds the loop)
        expect(result.state.day).toBe(1);
        return;
      }
    }
    throw new Error('Expected at least one event to fire across 8 seeds');
  });

  it('applyPendingChoice applies the choice and advances the day', () => {
    // Find an event to apply.
    for (const seed of ['e1','e2','e3','e4','e5','e6','e7','e8']) {
      const result = tickDayPausable(newGame(seed));
      if (result.pendingEvent) {
        const applied = applyPendingChoice(result.state, result.pendingEvent, result.pendingEvent.choices[0].id);
        expect(applied.day).toBe(2);
        return;
      }
    }
    throw new Error('Expected event to test apply');
  });
});
```

### Step 2 — Implement

Create `src/lib/game/engine-pausable.ts`:

```ts
import type { GameState } from './types';
import { makeRng } from './rng';
import { upgradeState } from './upgrade';
import { applyDailyConsumption } from './systems/consumption';
import { progressConditions } from './systems/conditions';
import { tickOxen } from './systems/oxen';
import { tickWagon } from './systems/wagon';
import { adjustMorale } from './systems/morale';
import { applyTravel } from './systems/travel';
import { rollEvent, resolveEvent } from './systems/events';
import { attemptFire } from './systems/fire';
import { reapDead } from './systems/death';
import type { GameEvent } from './content/events';

function advanceDate(d: { year: number; month: number; day: number }) {
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const leap = (d.year % 4 === 0 && d.year % 100 !== 0) || d.year % 400 === 0;
  const cap = d.month === 2 && leap ? 29 : daysInMonth[d.month - 1];
  let { year, month, day } = d;
  day += 1;
  if (day > cap) { day = 1; month += 1; }
  if (month > 12) { month = 1; year += 1; }
  return { year, month, day };
}

export interface PausableTickResult {
  state: GameState;
  pendingEvent?: GameEvent;
}

export function tickDayPausable(state: GameState): PausableTickResult {
  const normalized = upgradeState(state);
  const rng = makeRng(`${normalized.seed}:${normalized.day}`);

  let s = progressConditions(normalized, rng);
  s = applyDailyConsumption(s);
  s = tickOxen(s, rng);
  s = tickWagon(s, rng);
  s = adjustMorale(s, rng);
  s = applyTravel(s, rng);

  // Check event WITHOUT resolving. If cooldown allows, roll; if a fires, pause here.
  if (s.flags._lastEventDay !== s.day) {
    const pending = rollEvent(s, rng);
    if (pending) {
      return { state: s, pendingEvent: pending };
    }
  }

  // No event — continue.
  s = attemptFire(s, rng);
  s = reapDead(s, rng);

  return {
    state: {
      ...s,
      day: s.day + 1,
      date: advanceDate(s.date)
    }
  };
}

// Apply the player's chosen choice, then finish the rest of the day (fire attempt, death reap, advance).
export function applyPendingChoice(
  state: GameState,
  event: GameEvent,
  choiceId: string
): GameState {
  const rng = makeRng(`${state.seed}:${state.day}`);
  let s = resolveEvent(state, event, choiceId, rng);
  // Mark cooldown to prevent the same-day re-roll
  s = { ...s, flags: { ...s.flags, _lastEventDay: s.day } };

  // Finish the day
  s = attemptFire(s, rng);
  s = reapDead(s, rng);

  return {
    ...s,
    day: s.day + 1,
    date: advanceDate(s.date)
  };
}
```

### Step 3 — Verify, commit

```bash
npm test
npm run check
git add -A
git commit -m "feat(engine): add pausable tickDay for interactive event resolution"
```

All existing 229 tests pass + 3 new = 232.

---

## Task 2: Event pause + resolution in /play

**Files:**
- Modify: `src/routes/play/+page.server.ts` — new `resolveEvent` action; travel uses pausable
- Create: `src/lib/ui/EventModal.svelte`
- Modify: `src/routes/play/+page.svelte` — render modal

### Step 1 — Update server actions

In `src/routes/play/+page.server.ts`, replace the `travel` action and add `resolveEvent`:

```ts
import { tickDayPausable, applyPendingChoice } from '$lib/game/engine-pausable';
import { EVENTS } from '$lib/game/content/events';

// ... existing imports + loadState helper

export const actions: Actions = {
  travel: async ({ url, request, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    const fd = await request.formData();
    const days = Math.max(1, Math.min(10, parseInt(fd.get('days')?.toString() ?? '1', 10)));
    let state = await loadState(locals, slot);
    for (let i = 0; i < days && !state.completed; i++) {
      const result = tickDayPausable(state);
      if (result.pendingEvent) {
        await locals.repo.save(locals.deviceId, slot, result.state);
        // Persist pending event in a side-channel flag on state:
        state = {
          ...result.state,
          flags: { ...result.state.flags, _pendingEventId: result.pendingEvent.id }
        };
        await locals.repo.save(locals.deviceId, slot, state);
        return { state, pendingEventId: result.pendingEvent.id };
      }
      state = result.state;
    }
    await locals.repo.save(locals.deviceId, slot, state);
    return { state };
  },

  resolveEvent: async ({ url, request, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    const fd = await request.formData();
    const eventId = fd.get('eventId')?.toString();
    const choiceId = fd.get('choiceId')?.toString();
    if (!eventId || !choiceId) throw error(400, 'eventId and choiceId required');

    let state = await loadState(locals, slot);
    const event = EVENTS.find((e) => e.id === eventId);
    if (!event) throw error(400, `Unknown event ${eventId}`);
    state = applyPendingChoice(state, event, choiceId);
    // Clear the side-channel flag
    const flags = { ...state.flags };
    delete (flags as Record<string, unknown>)._pendingEventId;
    state = { ...state, flags };
    await locals.repo.save(locals.deviceId, slot, state);
    return { state };
  },

  rest: async ({ url, request, locals }) => { /* unchanged */
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    const fd = await request.formData();
    const days = Math.max(1, Math.min(7, parseInt(fd.get('days')?.toString() ?? '1', 10)));
    let state = await loadState(locals, slot);
    state = rest(state, days);
    await locals.repo.save(locals.deviceId, slot, state);
    return { state };
  },

  camp: async ({ url, locals }) => { /* unchanged */
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    let state = await loadState(locals, slot);
    state = camp(state, {});
    await locals.repo.save(locals.deviceId, slot, state);
    return { state };
  }
};
```

### Step 2 — EventModal

Create `src/lib/ui/EventModal.svelte`:

```svelte
<script lang="ts">
  import type { GameEvent } from '$lib/game/content/events';
  import { EVENTS } from '$lib/game/content/events';

  let { eventId, slot }: { eventId: string; slot: string } = $props();
  const event = $derived(EVENTS.find((e) => e.id === eventId));
  const qp = $derived(encodeURIComponent(slot));
</script>

{#if event}
  <div style="
    position: fixed; inset: 0; background: rgba(26, 15, 8, 0.85);
    display: flex; align-items: center; justify-content: center;
    z-index: 100; padding: 1em;
  ">
    <div class="panel" style="max-width: 600px; width: 100%; padding: 1.5em; border-color: var(--c-rust);">
      <h2 style="color: var(--c-rust);">{event.title}</h2>
      <p style="line-height: 1.5;">{event.body}</p>

      <div style="display: flex; flex-direction: column; gap: 0.5em; margin-top: 1.5em;">
        {#each event.choices as c}
          <form method="POST" action="?/resolveEvent&slot={qp}">
            <input type="hidden" name="eventId" value={event.id} />
            <input type="hidden" name="choiceId" value={c.id} />
            <button type="submit" style="width: 100%; text-align: left; padding: 0.8em 1em;">
              {c.label}
            </button>
          </form>
        {/each}
      </div>
    </div>
  </div>
{/if}
```

### Step 3 — Render modal in play page

In `src/routes/play/+page.svelte`, detect a pending event via `state.flags._pendingEventId` and render the modal:

```svelte
<script lang="ts">
  import TrailMap from '$lib/ui/TrailMap.svelte';
  import PartyPanel from '$lib/ui/PartyPanel.svelte';
  import InventoryPanel from '$lib/ui/InventoryPanel.svelte';
  import EventLog from '$lib/ui/EventLog.svelte';
  import ActionBar from '$lib/ui/ActionBar.svelte';
  import EndScreen from '$lib/ui/EndScreen.svelte';
  import EventModal from '$lib/ui/EventModal.svelte';

  let { data, form } = $props();
  const state = $derived(form?.state ?? data.state);
  const pendingEventId = $derived(state.flags._pendingEventId as string | undefined);
</script>

<!-- existing grid -->
<div style="display: grid; grid-template-columns: 1fr 240px; grid-template-rows: auto auto auto auto; gap: 0.8em; padding: 0.8em; min-height: calc(100vh - 60px);">
  <!-- ... same as before ... -->
</div>

{#if pendingEventId}
  <EventModal eventId={pendingEventId} slot={data.slot} />
{/if}
```

Integrate the `EventModal` render at the end of the file.

### Step 4 — Verify, commit

```bash
npm run build
npm test
npm run check
git add -A
git commit -m "feat(ui): interactive event modal with pause/resume"
```

Manual smoke: start a game, click Travel 10 days. When an event fires, the modal should appear. Clicking a choice should close the modal and advance the game.

---

## Task 3: Hunt modal

**Files:**
- Create: `src/lib/ui/HuntModal.svelte`
- Modify: `src/routes/play/+page.server.ts` — add `hunt` action
- Modify: `src/lib/ui/ActionBar.svelte` — enable Hunt button
- Modify: `src/routes/play/+page.svelte` — render modal

### Step 1 — Hunt action

In `src/routes/play/+page.server.ts`, add:

```ts
import { hunt, type HuntTarget, type AmmoBand } from '$lib/game/actions/hunt';

// in actions block:
hunt: async ({ url, request, locals }) => {
  const slot = url.searchParams.get('slot');
  if (!slot) throw error(400, 'slot required');
  const fd = await request.formData();
  const target = fd.get('target')?.toString() as HuntTarget;
  const ammo = fd.get('ammo')?.toString() as AmmoBand;
  const hunters = parseInt(fd.get('hunters')?.toString() ?? '1', 10);
  if (!target || !ammo) throw error(400, 'target and ammo required');
  let state = await loadState(locals, slot);
  state = hunt(state, { target, ammo, hunters });
  await locals.repo.save(locals.deviceId, slot, state);
  return { state };
}
```

### Step 2 — HuntModal

Create `src/lib/ui/HuntModal.svelte`:

```svelte
<script lang="ts">
  import type { GameState } from '$lib/game/types';
  let { state, slot, onclose }: { state: GameState; slot: string; onclose: () => void } = $props();

  const qp = $derived(encodeURIComponent(slot));
  const rifleCount = $derived(state.inventory.rifle ?? 0);
  const bullets = $derived(state.inventory.bullets ?? 0);

  let target = $state<'small' | 'medium' | 'big' | 'gather'>(rifleCount > 0 ? 'small' : 'gather');
  let ammo = $state<'light' | 'moderate' | 'heavy'>('light');
  let hunters = $state(1);
</script>

<div style="position: fixed; inset: 0; background: rgba(26, 15, 8, 0.85); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 1em;">
  <div class="panel" style="max-width: 500px; width: 100%; padding: 1.5em; border-color: var(--c-rust);">
    <h2 style="color: var(--c-rust);">Hunt or Gather</h2>
    <p style="font-size: 0.9em; color: var(--c-wood);">Rifles: {rifleCount} · Bullets: {bullets}</p>

    <form method="POST" action="?/hunt&slot={qp}">
      <label style="display: block; margin: 0.8em 0;">
        Target
        <select name="target" bind:value={target} style="width: 100%;">
          {#if rifleCount > 0}
            <option value="small">Small game (rabbits, birds)</option>
            <option value="medium">Medium (deer, antelope)</option>
            <option value="big">Big (buffalo, bear)</option>
          {/if}
          <option value="gather">Gather only (no rifle needed)</option>
        </select>
      </label>

      {#if target !== 'gather'}
        <label style="display: block; margin: 0.8em 0;">
          Ammo
          <select name="ammo" bind:value={ammo} style="width: 100%;">
            <option value="light">Light (5 bullets)</option>
            <option value="moderate">Moderate (10 bullets)</option>
            <option value="heavy">Heavy (20 bullets)</option>
          </select>
        </label>
      {:else}
        <input type="hidden" name="ammo" value="light" />
      {/if}

      <label style="display: block; margin: 0.8em 0;">
        People
        <select name="hunters" bind:value={hunters} style="width: 100%;">
          <option value={1}>1 (solo)</option>
          <option value={2}>2 (parallel / 1 hunter + 1 gatherer)</option>
        </select>
      </label>

      <div style="display: flex; gap: 0.5em; margin-top: 1em;">
        <button type="submit">Go</button>
        <button type="button" onclick={onclose}>Cancel</button>
      </div>
    </form>
  </div>
</div>
```

### Step 3 — ActionBar: enable Hunt

In `src/lib/ui/ActionBar.svelte`, replace the disabled Hunt button with a proper trigger. Since triggering a modal needs client-side state, pass a `onhunt: () => void` prop:

```svelte
<script lang="ts">
  let { slot, onhunt }: { slot: string; onhunt?: () => void } = $props();
  const qp = $derived(encodeURIComponent(slot));
  let travelDays = $state(3);
  let restDays = $state(2);
</script>

<div class="panel" style="display: flex; flex-wrap: wrap; gap: 0.5em; align-items: center;">
  <!-- travel, rest, camp unchanged -->

  <button type="button" onclick={onhunt}>Hunt</button>
  <button type="button" disabled title="Plan 4c">Trade</button>
  <button type="button" disabled title="Plan 4c">Ford</button>
</div>
```

### Step 4 — Render HuntModal in play page

In `src/routes/play/+page.svelte`:

```svelte
<script>
  // ... existing imports
  import HuntModal from '$lib/ui/HuntModal.svelte';

  let showHunt = $state(false);
</script>

<!-- within the grid, ActionBar: -->
<ActionBar slot={data.slot} onhunt={() => (showHunt = true)} />

<!-- at the end of the file: -->
{#if showHunt && !state.completed}
  <HuntModal {state} slot={data.slot} onclose={() => (showHunt = false)} />
{/if}
```

After a successful hunt action POST, `form?.state` is set and the modal closes implicitly (it's only rendered when `showHunt === true`, which is reset on navigation since the component remounts). You may need to add `showHunt = false` after a form submit — easiest is to clear it in the form's `onsubmit`.

### Step 5 — Verify, commit

```bash
npm run build
npm test
npm run check
git add -A
git commit -m "feat(ui): Hunt modal with target/ammo/hunters pickers"
```

---

## Task 4: Ford + Trade modals (combined — they share the modal pattern)

**Files:**
- Create: `src/lib/ui/FordModal.svelte`
- Create: `src/lib/ui/TradeModal.svelte`
- Modify: `src/routes/play/+page.server.ts` — add `ford` and `trade` actions
- Modify: `src/lib/ui/ActionBar.svelte` — enable contextual Ford/Trade buttons
- Modify: `src/routes/play/+page.svelte` — render Ford & Trade modals

### Step 1 — Server actions

In `src/routes/play/+page.server.ts`:

```ts
import { ford, type FordMethod } from '$lib/game/actions/ford';
import { trade } from '$lib/game/actions/trade';
import { getLandmark } from '$lib/game/content/landmarks';

// in actions:
ford: async ({ url, request, locals }) => {
  const slot = url.searchParams.get('slot');
  if (!slot) throw error(400, 'slot required');
  const fd = await request.formData();
  const method = fd.get('method')?.toString() as FordMethod;
  const waitDays = parseInt(fd.get('waitDays')?.toString() ?? '1', 10);
  if (!method) throw error(400, 'method required');

  let state = await loadState(locals, slot);
  // Use a hardcoded RiverState for now; Plan 5 can make rivers contextual per-landmark.
  const river = { depthFt: 3, currentMph: 3, ferryPrice: 5 };
  state = ford(state, { method, river, waitDays });
  await locals.repo.save(locals.deviceId, slot, state);
  return { state };
},

trade: async ({ url, request, locals }) => {
  const slot = url.searchParams.get('slot');
  if (!slot) throw error(400, 'slot required');
  const fd = await request.formData();
  const buys: Array<{ item: string; qty: number }> = [];
  const sells: Array<{ item: string; qty: number }> = [];
  for (const [key, value] of fd.entries()) {
    if (key.startsWith('buy_')) {
      const item = key.slice(4);
      const qty = parseInt(value.toString(), 10);
      if (qty > 0) buys.push({ item, qty });
    } else if (key.startsWith('sell_')) {
      const item = key.slice(5);
      const qty = parseInt(value.toString(), 10);
      if (qty > 0) sells.push({ item, qty });
    }
  }
  let state = await loadState(locals, slot);
  state = trade(state, { buys, sells });
  await locals.repo.save(locals.deviceId, slot, state);
  return { state };
}
```

### Step 2 — FordModal

Create `src/lib/ui/FordModal.svelte`:

```svelte
<script lang="ts">
  let { slot, onclose }: { slot: string; onclose: () => void } = $props();
  const qp = $derived(encodeURIComponent(slot));

  let method = $state<'ford' | 'caulk' | 'ferry' | 'wait'>('ford');
  let waitDays = $state(1);
</script>

<div style="position: fixed; inset: 0; background: rgba(26, 15, 8, 0.85); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 1em;">
  <div class="panel" style="max-width: 500px; width: 100%; padding: 1.5em; border-color: var(--c-rust);">
    <h2 style="color: var(--c-rust);">River Crossing</h2>
    <p>Depth 3 ft · Current 3 mph · Ferry $5</p>

    <form method="POST" action="?/ford&slot={qp}">
      <label style="display: block; margin: 0.8em 0;">
        <input type="radio" name="method" value="ford" bind:group={method} /> Ford (fast, risky)
      </label>
      <label style="display: block; margin: 0.8em 0;">
        <input type="radio" name="method" value="caulk" bind:group={method} /> Caulk & float (2 days)
      </label>
      <label style="display: block; margin: 0.8em 0;">
        <input type="radio" name="method" value="ferry" bind:group={method} /> Hire ferry ($5)
      </label>
      <label style="display: block; margin: 0.8em 0;">
        <input type="radio" name="method" value="wait" bind:group={method} /> Wait
        {#if method === 'wait'}
          <input type="number" name="waitDays" bind:value={waitDays} min="1" max="7" style="width: 4em;" /> days
        {:else}
          <input type="hidden" name="waitDays" value={waitDays} />
        {/if}
      </label>

      <div style="display: flex; gap: 0.5em; margin-top: 1em;">
        <button type="submit">Go</button>
        <button type="button" onclick={onclose}>Cancel</button>
      </div>
    </form>
  </div>
</div>
```

### Step 3 — TradeModal

Create `src/lib/ui/TradeModal.svelte`:

```svelte
<script lang="ts">
  import type { GameState } from '$lib/game/types';
  import { PRICES } from '$lib/game/content/prices';
  import { ITEMS } from '$lib/game/content/items';

  let { state, slot, onclose }: { state: GameState; slot: string; onclose: () => void } = $props();
  const qp = $derived(encodeURIComponent(slot));

  // Items the player owns and can sell
  const sellableIds = $derived(
    Object.entries(state.inventory)
      .filter(([id, qty]) => qty > 0 && PRICES[id])
      .map(([id]) => id)
  );
  // Items available for purchase (top 8 staples for Plan 4c)
  const buyableIds = ['flour', 'beans', 'bacon', 'bullets', 'bandages', 'quinine', 'coat', 'blanket'];
</script>

<div style="position: fixed; inset: 0; background: rgba(26, 15, 8, 0.85); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 1em; overflow-y: auto;">
  <div class="panel" style="max-width: 700px; width: 100%; padding: 1.5em; border-color: var(--c-rust);">
    <h2 style="color: var(--c-rust);">Trading Post</h2>
    <p>Cash on hand: <strong>${state.cash}</strong></p>

    <form method="POST" action="?/trade&slot={qp}">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1em;">
        <div>
          <h4>Buy</h4>
          {#each buyableIds as id}
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.5em; margin: 0.3em 0;">
              <span>{ITEMS[id]?.name ?? id} (${PRICES[id]?.buy.toFixed(2)})</span>
              <input type="number" name="buy_{id}" min="0" value="0" style="width: 5em;" />
            </div>
          {/each}
        </div>

        <div>
          <h4>Sell</h4>
          {#each sellableIds as id}
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.5em; margin: 0.3em 0;">
              <span>{ITEMS[id]?.name ?? id} ({state.inventory[id]}) @ ${PRICES[id]?.sell.toFixed(2)}</span>
              <input type="number" name="sell_{id}" min="0" max={state.inventory[id]} value="0" style="width: 5em;" />
            </div>
          {/each}
        </div>
      </div>

      <div style="display: flex; gap: 0.5em; margin-top: 1em;">
        <button type="submit">Confirm Trade</button>
        <button type="button" onclick={onclose}>Cancel</button>
      </div>
    </form>
  </div>
</div>
```

### Step 4 — Contextual ActionBar

Update `src/lib/ui/ActionBar.svelte` to enable Ford/Trade based on current landmark:

```svelte
<script lang="ts">
  import type { GameState } from '$lib/game/types';
  import { getLandmark } from '$lib/game/content/landmarks';

  let { state, slot, onhunt, onford, ontrade }: {
    state: GameState;
    slot: string;
    onhunt?: () => void;
    onford?: () => void;
    ontrade?: () => void;
  } = $props();
  const qp = $derived(encodeURIComponent(slot));

  const nextLandmark = $derived(getLandmark(state.location.nextLandmarkId));
  const atRiver = $derived(nextLandmark.kind === 'river');
  const nearTradingPost = $derived(nextLandmark.kind === 'trading_post' || nextLandmark.kind === 'start' || nextLandmark.kind === 'end');

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

  <button type="button" onclick={onhunt}>Hunt</button>
  <button type="button" onclick={ontrade} disabled={!nearTradingPost} title={nearTradingPost ? '' : 'Only at trading posts'}>Trade</button>
  <button type="button" onclick={onford} disabled={!atRiver} title={atRiver ? '' : 'Only at river crossings'}>Ford</button>
</div>
```

The `state` prop is now required. Update the play page to pass it.

### Step 5 — Play page integration

In `src/routes/play/+page.svelte`:

```svelte
<script lang="ts">
  // ... existing imports
  import FordModal from '$lib/ui/FordModal.svelte';
  import TradeModal from '$lib/ui/TradeModal.svelte';

  let showHunt = $state(false);
  let showFord = $state(false);
  let showTrade = $state(false);
</script>

<!-- ActionBar in the grid: -->
<ActionBar {state} slot={data.slot}
  onhunt={() => (showHunt = true)}
  onford={() => (showFord = true)}
  ontrade={() => (showTrade = true)}
/>

<!-- After the grid / at end: -->
{#if showHunt && !state.completed}
  <HuntModal {state} slot={data.slot} onclose={() => (showHunt = false)} />
{/if}
{#if showFord && !state.completed}
  <FordModal slot={data.slot} onclose={() => (showFord = false)} />
{/if}
{#if showTrade && !state.completed}
  <TradeModal {state} slot={data.slot} onclose={() => (showTrade = false)} />
{/if}
```

### Step 6 — Verify, commit

```bash
npm run build
npm test
npm run check
git add -A
git commit -m "feat(ui): Ford and Trade modals with context-aware action bar"
```

---

## Task 5: Fullscreen map toggle

**Files:**
- Modify: `src/lib/ui/TrailMap.svelte`

### Step 1 — Update TrailMap to support fullscreen

```svelte
<script lang="ts">
  import type { GameState } from '$lib/game/types';
  import { LANDMARKS } from '$lib/game/content/landmarks';
  let { state }: { state: GameState } = $props();

  let fullscreen = $state(false);

  // (keep existing mile/pct computations)
</script>

<div class="map panel"
  style="
    background: var(--c-parchment);
    color: var(--c-ink);
    position: {fullscreen ? 'fixed' : 'relative'};
    {fullscreen ? 'inset: 0; z-index: 50;' : ''}
    min-height: 320px;
    padding: 1em 1em 4em 1em;
  "
>
  <button type="button" onclick={() => (fullscreen = !fullscreen)}
    style="position: absolute; top: 0.5em; right: 0.5em; padding: 0.3em 0.6em; font-size: 0.8em; background: var(--c-ink); color: var(--c-parchment);">
    {fullscreen ? '✕ Close' : '⛶ Expand'}
  </button>

  <!-- rest of map unchanged -->
</div>
```

### Step 2 — Commit

```bash
npm run build
npm test
npm run check
git add -A
git commit -m "feat(ui): fullscreen map toggle"
```

---

## Verification Checklist

- [ ] `npm test` all pass (~232+).
- [ ] `npm run check` 0 errors.
- [ ] `npm run build` succeeds.
- [ ] Event modal appears when events fire during Travel.
- [ ] Hunt button opens HuntModal.
- [ ] Ford button enabled only when at river crossing.
- [ ] Trade button enabled only at trading posts.
- [ ] Map fullscreen toggle works.

---

## Handoff to Plan 4d

Plan 4d lands:
- Pixel-art sprites / graphics replacing emoji
- Z Fold 4 responsive layout (~884px breakpoint)
- Typography + spacing polish
- Optional ambient sound cues
