# Human Water Rationing ("Drycamp") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a player/bot water-ration setting (Normal / Conserve / Drycamp) so a disciplined party can stretch limited water across a dry stretch and avoid the dehydration death curve — "fair if prepared."

**Architecture:** A new `waterRation` field on `GameState` scales daily water draw in `waterConsumedToday`; a small `applyWaterRationStrain` system charges a morale (and sustained-drycamp HP) cost; a `persona.pickWaterRation` surface drives the bot/NPC gap-aware; a 3-way UI control + server action lets the human set it; and the desert-gateway posts are guaranteed to stock `water_bag`. The dehydration curve is unchanged.

**Tech Stack:** TypeScript (strict), SvelteKit 5 (runes), Vitest. Run from jj workspace `hoosierTrail-1245`. Verify: `npm run check` + `npm test`. Sweep: `scripts/persona-profession-sweep.ts --runs 2`.

**Spec:** `docs/superpowers/specs/2026-06-07-human-water-ration-design.md`

**Conventions:**
- jj, not git. Commit each task with `jj describe -m "..."` on bookmark `feat/1245-water-ration` (already created). NO `git commit`.
- Edits in THIS workspace are fine; if the Edit/Write tool is hook-blocked, fall back to a Python heredoc (`python3 <<'PY' ... PY`).
- No `// @ts-ignore` / `as any` past a real type error.
- Per project memory there is **no save-migration burden** — default `waterRation` in the initial state and read `state.waterRation ?? 'normal'` defensively everywhere; do NOT edit `saves.ts`.
- Co-Author line on commits: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

## File Structure
- **Modify** `src/lib/game/types.ts` — `WaterRation` type + `waterRation` field on `GameState`.
- **Modify** `src/lib/game/engine.ts` — default `waterRation: 'normal'` in initial state; insert `applyWaterRationStrain` into the daily pipeline.
- **Modify** `src/lib/game/systems/consumption.ts` — `WATER_RATION_MULT` + apply in `waterConsumedToday`.
- **Create** `src/lib/game/systems/water-ration.ts` — `applyWaterRationStrain`.
- **Modify** `src/lib/game/ai/types.ts` + `personas.ts` — `pickWaterRation` surface + impls.
- **Modify** `src/lib/dev/bot/runner.ts` + `src/lib/game/systems/npc-engine.ts` — call `pickWaterRation` daily.
- **Modify** `src/routes/play/+page.server.ts` + `src/routes/play/+page.svelte` — `setWaterRation` action + control.
- **Modify** `src/lib/game/content/landmarks.ts` (or a stock helper) — guarantee `water_bag` stock at desert-gateway posts.
- **Create** tests under `tests/`.

---

## Task 1: `waterRation` state + default

**Files:**
- Modify: `src/lib/game/types.ts` (add type near `Rations` at line 7; add field near `rations` on GameState at line ~209)
- Modify: `src/lib/game/engine.ts:174` (initial state)
- Test: `tests/water-ration-state.test.ts`

- [ ] **Step 1: Write the failing test**
```ts
// tests/water-ration-state.test.ts
import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/lib/game/engine';
import type { WaterRation } from '../src/lib/game/types';

describe('waterRation state', () => {
  it('defaults to normal on a new game', () => {
    const s = createInitialState({ seed: 'wr', startYear: 1849 } as never);
    expect(s.waterRation).toBe<WaterRation>('normal');
  });
});
```
NOTE: confirm `createInitialState`'s real name + signature in `engine.ts` (grep `export function createInitialState` / `newGame`); adjust the import + call to match. The only assertion that matters: a freshly created state has `waterRation === 'normal'`.

- [ ] **Step 2: Run — expect FAIL** `npx vitest run tests/water-ration-state.test.ts` (type error / undefined).

- [ ] **Step 3: Add the type + field.** In `types.ts` after line 7:
```ts
export type WaterRation = 'normal' | 'conserve' | 'drycamp';
```
On the `GameState` interface, beside `rations: Rations;` (line ~209):
```ts
  waterRation: WaterRation;
```
In `engine.ts` initial state (beside `rations: 'normal',` at line 174):
```ts
    waterRation: 'normal',
```

- [ ] **Step 4: Run — expect PASS.**

- [ ] **Step 5: `npm run check`** — expect 0 errors EXCEPT new "Property 'waterRation' is missing" errors in code that constructs a full `GameState` literal. Fix each by adding `waterRation: 'normal'` (real code) — but test fixtures that build partial states via `as GameState`/`as unknown as GameState` need no change (defensive `?? 'normal'` reads land in later tasks). If a non-test source file constructs a bare GameState, add the field there. List the files you touched.

- [ ] **Step 6: Commit**
```bash
jj describe -m "feat(water): waterRation state field + default (#1245)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Ration multiplier in water consumption

**Files:**
- Modify: `src/lib/game/systems/consumption.ts` (add const near line 46; edit `waterConsumedToday` at line 124)
- Test: `tests/water-ration-consumption.test.ts`

- [ ] **Step 1: Write the failing test**
```ts
// tests/water-ration-consumption.test.ts
import { describe, it, expect } from 'vitest';
import { waterConsumedToday } from '../src/lib/game/systems/consumption';
import type { GameState } from '../src/lib/game/types';

// 4 adults, temperate (70F baseline -> tempWaterMult 1.0), clear weather.
function st(waterRation: string): GameState {
  return {
    waterRation,
    weather: 'clear',
    party: Array.from({ length: 4 }, (_, i) => ({ id: `a${i}`, kind: 'adult', dead: false, health: 100, conditions: [] })),
    location: { terrain: 'desert' },
    date: { year: 1849, month: 7, day: 10 }
  } as unknown as GameState;
}

describe('waterConsumedToday × ration tier', () => {
  it('normal draws full need, conserve ~half, drycamp ~quarter', () => {
    const n = waterConsumedToday(st('normal'));
    expect(waterConsumedToday(st('conserve'))).toBeLessThan(n);
    expect(waterConsumedToday(st('drycamp'))).toBeLessThan(waterConsumedToday(st('conserve')));
  });
});
```
NOTE: `tempWaterMult` reads `dayTempF(state)` which may need `weather`/`date`/elevation fields — match the stub to what `dayTempF` reads (grep it) so it returns a stable temperate value; the test only needs the ORDERING normal > conserve > drycamp, so exact gallons don't matter. If `dayTempF` throws on the stub, add the fields it needs.

- [ ] **Step 2: Run — expect FAIL** (ordering not yet true; all three equal).

- [ ] **Step 3: Add the multiplier.** In `consumption.ts` near line 46 (after `WATER_PER_ADULT_GAL`):
```ts
import type { WaterRation } from '../types';

/** #1245 — daily water draw multiplier by ration tier. Conserve halves,
 *  drycamp quarters how long the keg lasts (the historical "drycamp"). */
export const WATER_RATION_MULT: Record<WaterRation, number> = {
  normal: 1.0,
  conserve: 0.5,
  drycamp: 0.25
};
```
(If `WaterRation` is already importable via an existing `../types` import line, extend that import instead of adding a new one.) Then edit `waterConsumedToday`'s return (line 124):
```ts
  return Math.ceil(
    base * weatherWaterMult(state.weather) * tempWaterMult(state)
      * WATER_RATION_MULT[state.waterRation ?? 'normal']
  );
```

- [ ] **Step 4: Run — expect PASS.**
- [ ] **Step 5: `npm run check && npm test`** — 0 errors; existing consumption tests still green (normal = ×1.0 is unchanged behavior).
- [ ] **Step 6: Commit** `jj describe -m "feat(water): ration tier scales daily water draw (#1245)\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

## Task 3: Ration-strain system (morale + sustained-drycamp HP)

**Files:**
- Create: `src/lib/game/systems/water-ration.ts`
- Modify: `src/lib/game/engine.ts` (insert into pipeline right after `applyDailyConsumption`, line ~201)
- Test: `tests/water-ration-strain.test.ts`

Rationing costs morale; drycamp also nicks HP after 3 consecutive days. Charged ONLY when the party is rationing AND still has water (keg > 0) — when the keg is dry, the dehydration system owns the damage (no double-count).

- [ ] **Step 1: Write the failing test**
```ts
// tests/water-ration-strain.test.ts
import { describe, it, expect } from 'vitest';
import { applyWaterRationStrain } from '../src/lib/game/systems/water-ration';
import type { GameState } from '../src/lib/game/types';

function st(waterRation: string, water: number, drycampDays = 0): GameState {
  return {
    waterRation, morale: 80,
    resources: { water, waterCap: 20 },
    party: [{ id: 'a', kind: 'adult', dead: false, health: 100, conditions: [] }],
    flags: drycampDays ? { _drycampDays: drycampDays } : {},
    eventLog: [], day: 50
  } as unknown as GameState;
}

describe('applyWaterRationStrain', () => {
  it('no strain on normal', () => {
    expect(applyWaterRationStrain(st('normal', 10)).morale).toBe(80);
  });
  it('conserve costs morale only', () => {
    const r = applyWaterRationStrain(st('conserve', 10));
    expect(r.morale).toBe(79);                       // -1
    expect(r.party[0].health).toBe(100);
  });
  it('drycamp costs more morale, no HP for first 3 days', () => {
    const r = applyWaterRationStrain(st('drycamp', 10, 0));
    expect(r.morale).toBe(77);                       // -3
    expect(r.party[0].health).toBe(100);             // day 1, no HP
    expect(r.flags._drycampDays).toBe(1);
  });
  it('drycamp nicks HP after 3 consecutive days', () => {
    const r = applyWaterRationStrain(st('drycamp', 10, 3)); // entering day 4
    expect(r.party[0].health).toBe(98);              // -2
  });
  it('does not strain when the keg is dry (dehydration owns it)', () => {
    const r = applyWaterRationStrain(st('drycamp', 0, 5));
    expect(r.morale).toBe(80);
    expect(r.party[0].health).toBe(100);
  });
  it('resets the drycamp counter when not drycamping', () => {
    const r = applyWaterRationStrain(st('conserve', 10, 4));
    expect(r.flags._drycampDays).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (module missing).

- [ ] **Step 3: Implement `water-ration.ts`**
```ts
import type { GameState } from '../types';

const CONSERVE_MORALE = 1;
const DRYCAMP_MORALE = 3;
const DRYCAMP_HP_AFTER_DAYS = 3;   // sustained parching
const DRYCAMP_HP = 2;
const CHILD_HP_MULT = 0.7;         // mirror dehydration

/** #1245 — cost of water rationing. Morale always; drycamp adds an HP nick
 *  after sustained use. Charged only while rationing AND the keg still has
 *  water — once dry, applyDehydration owns the damage (no double-count). */
export function applyWaterRationStrain(state: GameState): GameState {
  const tier = state.waterRation ?? 'normal';
  const water = (state.resources.water ?? 0) + (state.resources.dirtyWater ?? 0);
  if (tier === 'normal' || water <= 0) {
    // Not drycamping — clear the streak counter if present.
    if (state.flags?._drycampDays === undefined) return state;
    const flags = { ...state.flags };
    delete (flags as Record<string, unknown>)._drycampDays;
    return { ...state, flags };
  }

  const moraleLoss = tier === 'drycamp' ? DRYCAMP_MORALE : CONSERVE_MORALE;
  let hpLoss = 0;
  let flags = state.flags;
  if (tier === 'drycamp') {
    const prior = typeof state.flags?._drycampDays === 'number' ? state.flags._drycampDays as number : 0;
    const days = prior + 1;
    flags = { ...state.flags, _drycampDays: days };
    if (days > DRYCAMP_HP_AFTER_DAYS) hpLoss = DRYCAMP_HP;
  } else {
    // conserve clears the drycamp streak
    if (state.flags?._drycampDays !== undefined) {
      const f = { ...state.flags }; delete (f as Record<string, unknown>)._drycampDays; flags = f;
    }
  }

  const party = hpLoss === 0 ? state.party : state.party.map((m) => {
    if (m.dead) return m;
    const loss = Math.round(hpLoss * (m.kind === 'child' ? CHILD_HP_MULT : 1));
    return { ...m, health: Math.max(0, m.health - loss) };
  });

  return { ...state, flags, party, morale: Math.max(0, state.morale - moraleLoss) };
}
```

- [ ] **Step 4: Run — expect PASS.**

- [ ] **Step 5: Wire into the engine pipeline.** In `engine.ts`, import it and insert right after the `applyDailyConsumption` entry (line ~201) so strain is charged on the same tick the water is drawn:
```ts
import { applyWaterRationStrain } from './systems/water-ration';
// ... in the pipeline array, immediately after the applyDailyConsumption entry:
  (s) => applyWaterRationStrain(s),
```

- [ ] **Step 6: `npm run check && npm test`** — 0 errors, green. If any existing full-journey/integration test shifts morale because a bot now drycamps, that's expected behavior change — confirm it's only morale drift from rationing, and update the fixture's expectation; do NOT weaken the strain. (Bots don't ration until Task 4 wires `pickWaterRation`, so nothing should drift yet.)

- [ ] **Step 7: Commit** `jj describe -m "feat(water): ration-strain system (morale + sustained drycamp HP) (#1245)\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

## Task 4: `persona.pickWaterRation` (bot/NPC, gap-aware)

**Files:**
- Modify: `src/lib/game/ai/types.ts` (add to `Persona` interface near `pickRations`, line 81)
- Modify: `src/lib/game/ai/personas.ts` (default impl on `balancedPersona`; overrides on `cautious`, `pace_pusher`, `chaos`)
- Modify: `src/lib/dev/bot/runner.ts:821` (call it in the daily settings block) + `src/lib/game/systems/npc-engine.ts:324` (beside `pickRations`)
- Test: `tests/water-ration-persona.test.ts`

- [ ] **Step 1: Write the failing test**
```ts
// tests/water-ration-persona.test.ts
import { describe, it, expect } from 'vitest';
import { balancedPersona, chaosPersona } from '../src/lib/game/ai/personas';
import type { GameState } from '../src/lib/game/types';

// Helper: state with `water` gallons and a known dry-distance ahead.
function st(water: number, terrain = 'desert'): GameState {
  return {
    waterRation: 'normal', morale: 70,
    resources: { water, waterCap: 20 },
    party: Array.from({ length: 4 }, (_, i) => ({ id: `a${i}`, kind: 'adult', dead: false, health: 90, conditions: [] })),
    location: { terrain, milesTraveled: 1400, atLandmarkId: null },
    weather: 'clear', date: { year: 1849, month: 7, day: 15 }, pace: 'moderate', flags: {}
  } as unknown as GameState;
}

describe('pickWaterRation', () => {
  it('normal when water comfortably covers the stretch', () => {
    expect(balancedPersona.pickWaterRation(st(20), 'desert')).toBe('normal');
  });
  it('rations down as the keg shrinks against a dry stretch', () => {
    const low = balancedPersona.pickWaterRation(st(3), 'desert');
    expect(['conserve', 'drycamp']).toContain(low);
  });
  it('chaos ignores it (always normal)', () => {
    expect(chaosPersona.pickWaterRation(st(1), 'desert')).toBe('normal');
  });
});
```
NOTE: the gap-aware helper uses existing foresight (`effectiveGapMiles`/`nextSupplyDistance` in `src/lib/game/ai/foresight.ts`). Read those + `waterConsumedToday` to build `projectedDryDaysToNextWater`. Shape the fixture so `effectiveGapMiles` returns a real dry distance (set `milesTraveled` into the Snake leg / terrain desert). If the exact gap math is hard to stub deterministically, assert only the ORDERING (more water → normal; little water + dry ahead → conserve/drycamp; chaos → normal) rather than exact tiers.

- [ ] **Step 2: Run — expect FAIL** (`pickWaterRation` undefined).

- [ ] **Step 3: Add the interface method** (`ai/types.ts`, after `pickRations` line 81):
```ts
  /** #1245 — daily water-ration choice. Gap-aware: ration down when a dry
   *  stretch ahead would empty the keg at normal draw. */
  pickWaterRation(state: GameState, rng: Rng): GameState['waterRation'];
```

- [ ] **Step 4: Default impl on `balancedPersona`** (add a method beside `pickRations`). Add a module-private helper above the persona objects:
```ts
import { waterConsumedToday } from '../systems/consumption';
import { effectiveGapMiles } from './foresight';

/** Days of dry travel before the next reliable water, at current pace. */
function projectedDryDaysToNextWater(state: GameState): number {
  if (state.location.terrain !== 'desert') return 0; // watered terrain refills ambiently
  const milesPerDay = 15; // conservative all-in estimate; pace detail not needed for the gate
  return Math.ceil(effectiveGapMiles(state) / milesPerDay);
}
```
balanced's method:
```ts
  pickWaterRation(state) {
    const dryDays = projectedDryDaysToNextWater(state);
    if (dryDays <= 0) return 'normal';
    const perDay = Math.max(1, waterConsumedToday({ ...state, waterRation: 'normal' }));
    const daysOfWater = state.resources.water / perDay;
    if (daysOfWater >= dryDays) return 'normal';
    if (daysOfWater * 2 >= dryDays) return 'conserve';   // 0.5x bridges it
    return 'drycamp';
  },
```
Per-persona overrides:
- `cautiousPersona`: rations one rung earlier (multiply `dryDays` by 1.3 safety, or return 'conserve' as soon as `daysOfWater < dryDays * 1.3`). Keep it simple — copy balanced's body but compare against `dryDays * this.foresight.safetyFactor` (cautious safetyFactor is 1.5).
- `pacePusherPersona`: later — only conserve/drycamp when `daysOfWater < dryDays` strictly (i.e., balanced's body is fine; pace_pusher can just inherit balanced — do NOT add an override unless you want it leaner).
- `chaosPersona`: `pickWaterRation() { return 'normal'; }` (ignores the clock, consistent with its null schedule doctrine).

Spread personas (generous/drinker/hoarder/sunday_rester/faithful) inherit balanced's — no override.

- [ ] **Step 5: Wire the callers.** In `runner.ts:821` (the daily settings block that sets `rations: persona.pickRations(...)`), add:
```ts
          waterRation: persona.pickWaterRation(state, botRng),
```
In `npc-engine.ts` beside line 324 (`next = { ...next, rations: persona.pickRations(fauxState, rng) };`):
```ts
  next = { ...next, waterRation: persona.pickWaterRation(fauxState, rng) };
```

- [ ] **Step 6: Run test — expect PASS.**
- [ ] **Step 7: `npm run check && npm test`** — 0 errors; full suite green. Persona/sweep fixtures may shift now that bots ration — update expectations only where the change is explained by water-rationing; otherwise STOP and report.
- [ ] **Step 8: Commit** `jj describe -m "feat(water): persona pickWaterRation — gap-aware bot/NPC rationing (#1245)\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

## Task 5: Player UI control + server action

**Files:**
- Modify: `src/routes/play/+page.server.ts` (add `setWaterRation` action mirroring `setRations` at line 532)
- Modify: `src/routes/play/+page.svelte` (add a 3-way Normal/Conserve/Drycamp control beside the existing food-rations control)
- Test: `tests/water-ration-action.test.ts` (server-action logic) — mirror whatever `tests/` covers `setRations`, if any; otherwise a focused state-transition test.

- [ ] **Step 1: Write the failing test**
```ts
// tests/water-ration-action.test.ts
import { describe, it, expect } from 'vitest';
import type { GameState, WaterRation } from '../src/lib/game/types';

// Pure helper extracted from the action (see Step 3): validate + apply.
import { setWaterRationOnState, isWaterRation } from '../src/routes/play/water-ration-action';

describe('water-ration action helper', () => {
  it('validates the tier', () => {
    expect(isWaterRation('drycamp')).toBe(true);
    expect(isWaterRation('nope')).toBe(false);
  });
  it('applies the tier to state', () => {
    const s = { waterRation: 'normal' } as unknown as GameState;
    expect(setWaterRationOnState(s, 'conserve' as WaterRation).waterRation).toBe('conserve');
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (helper module missing).

- [ ] **Step 3: Extract a tiny pure helper** `src/routes/play/water-ration-action.ts` (keeps the action testable without a full request):
```ts
import type { GameState, WaterRation } from '$lib/game/types';

const TIERS: readonly WaterRation[] = ['normal', 'conserve', 'drycamp'];
export function isWaterRation(v: string): v is WaterRation {
  return (TIERS as readonly string[]).includes(v);
}
export function setWaterRationOnState(state: GameState, tier: WaterRation): GameState {
  return { ...state, waterRation: tier };
}
```

- [ ] **Step 4: Add the server action** in `+page.server.ts` (mirror `setRations` at line 532, using the helper):
```ts
  setWaterRation: async ({ url, request, locals }) => {
    // ...load state exactly as setRations does (copy its load/persist scaffolding)...
    const fd = await request.formData();
    const raw = fd.get('waterRation')?.toString() ?? '';
    if (!isWaterRation(raw)) throw error(400, 'invalid waterRation');
    const next = setWaterRationOnState(state, raw);
    // ...persist `next` exactly as setRations persists...
  },
```
Import `isWaterRation, setWaterRationOnState` from `./water-ration-action`. Match `setRations`'s load/persist boilerplate precisely (same repo/save calls).

- [ ] **Step 5: Add the UI control** in `+page.svelte`. Find the existing food-rations control (grep `setRations` / `rations` in the file), and add a sibling 3-way control bound to `state.waterRation` that POSTs to `?/setWaterRation` with a `waterRation` field. Label the options **Normal / Conserve / Drycamp** with a one-line hint ("Conserve: half water, the party grumbles · Drycamp: a sip, for crossing dry country"). Reuse the food-rations control's markup/styling so it's visually consistent.

- [ ] **Step 6: Run test — expect PASS.** Then `npm run check` (0 errors) — Svelte component typechecks.

- [ ] **Step 7: Verify in-browser.** `systemd-run --user --unit=ot-dev-1245 --working-directory=$PWD npm run dev` (port 5173); drive with Playwright or load a desert scenario via the dev harness; confirm the water-ration control renders, switches tiers, and persists (reload shows the chosen tier). Stop the server: `systemctl --user stop ot-dev-1245`. (Per project memory: verify UI yourself before claiming done.)

- [ ] **Step 8: Commit** `jj describe -m "feat(water): player water-ration control + server action (#1245)\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

## Task 6: Guarantee `water_bag` stock at desert-gateway posts

**Files:**
- Modify: `src/lib/game/content/landmarks.ts` (ensure `water_bag` in `stock` for the desert-gateway posts: Fort Hall, Fort Boise, and the last post before each ≥200mi dry gap)
- Modify: `src/lib/game/systems/post-stock.ts` (a small per-category floor so #1223's stock cap doesn't starve water gear) OR raise those posts' relevant stock — choose the lighter touch.
- Test: `tests/water-bag-stock.test.ts`

- [ ] **Step 1: Write the failing test**
```ts
// tests/water-bag-stock.test.ts
import { describe, it, expect } from 'vitest';
import { getLandmark } from '../src/lib/game/content/landmarks';
import { postBaselineQty } from '../src/lib/game/systems/post-stock';

describe('desert-gateway water_bag supply', () => {
  for (const id of ['ft_hall', 'ft_boise']) {
    it(`${id} stocks water_bag in enough quantity for a 4-adult party (>=4)`, () => {
      const lm = getLandmark(id);
      expect(lm.stock ?? []).toContain('water_bag');
      expect(postBaselineQty(lm, 'water_bag')).toBeGreaterThanOrEqual(4);
    });
  }
});
```
NOTE: confirm the real landmark ids (grep `ft_hall`/`ft_boise`/`fort_boise` in landmarks.ts) and that `postBaselineQty(landmark, itemId)` is exported from post-stock.ts (it is — `export function postBaselineQty`). The gap-aware target is 4 bags (`gapAwareWaterBagTarget`), so baseline ≥ 4 lets a 4-adult party reach it.

- [ ] **Step 2: Run — expect FAIL** (water_bag missing from stock, or baseline < 4 because of low `stockScale`).

- [ ] **Step 3: Implement.** Add `'water_bag'` to the `stock` array of the gateway posts in `landmarks.ts`. Then ensure `postBaselineQty` returns ≥4 for `water_bag` at those posts — the cleanest is a per-item floor in `post-stock.ts`'s `postBaselineQty`: after computing `base`, for `water_bag` at desert-adjacent posts return `Math.max(base, 4)`. Implement as a small explicit rule (a `WATER_GEAR_FLOOR = 4` applied when `itemId === 'water_bag'`), documented as the #1245 desert-provisioning guarantee. Keep it minimal and pure.

- [ ] **Step 4: Run — expect PASS.**
- [ ] **Step 5: `npm run check && npm test`** — green (post-stock + trade tests unaffected).
- [ ] **Step 6: Commit** `jj describe -m "feat(water): guarantee water_bag stock at desert-gateway posts (#1245)\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

## Task 7: Verify, sweep gate, tune

- [ ] **Step 1: Full verify** — `npm run verify` (svelte-check 0/0 + vitest green).

- [ ] **Step 2: BEFORE baseline.** Spin a master workspace, `npm ci`, run:
```bash
npx tsx scripts/persona-profession-sweep.ts --runs 2 --tag water --shapes 3/0,4/0,2/2,2/4,4/2,3/3 > /tmp/sweep-before-water.log 2>&1
```
(BEFORE = master, no water-ration.)

- [ ] **Step 3: AFTER.** From THIS workspace, same tag + shapes:
```bash
npx tsx scripts/persona-profession-sweep.ts --runs 2 --tag water --shapes 3/0,4/0,2/2,2/4,4/2,3/3 > /tmp/sweep-after-water.log 2>&1
```

- [ ] **Step 4: Compare against the gate (from the spec).** PASS =
  - **Arrival % rises** on the dry-sensitive shapes (esp. 4/0 / 3/0).
  - **Dehydration's share of deaths drops materially** — it should no longer be the #1 killer. (Grep the per-persona / death-cause output; if the sweep summary lacks death causes, run a focused 4/0 diagnostic dumping `deathsByCause` BEFORE vs AFTER.)
  - **No new failure mode spikes** — watch wiped% (over-rationing morale collapse → desertion) and stall%. No shape's wiped% should jump >~5–8pp.

- [ ] **Step 5: Tune if needed.** Levers (in `water-ration.ts` / `consumption.ts`): if dehydration still dominates → lower `WATER_RATION_MULT.drycamp` (0.25 → 0.2) so drycamp stretches further, or raise the strain HP threshold. If a morale-collapse failure appears → lower `DRYCAMP_MORALE`/`CONSERVE_MORALE`. If arrival doesn't move → check the bot is actually rationing (instrument `pickWaterRation`) and that water_bag provisioning reaches the desert. Re-run Step 3 after each change; `npm run verify` after any source edit.

- [ ] **Step 6: Record final numbers + commit** `jj describe -m "test(water): sweep gate — dehydration share <summary> (#1245)\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

## Self-review notes (author)
- **Spec coverage:** state+default (T1), consumption multiplier (T2), strain morale/HP + no-double-count (T3), persona gap-aware bot/NPC (T4), player UI+action (T5), water_bag provisioning (T6), sweep gate incl. dehydration-share check (T7). Migration handled by initial-state default + defensive `?? 'normal'` reads (no saves.ts per the no-migration rule). ✓
- **NPC parity (#298):** `pickWaterRation` is wired into BOTH runner and npc-engine (T4). ✓
- **game-ai (#302):** persona surface + foresight-based gate live under `game/ai`. ✓
- **No double-count:** strain only fires when keg > 0 (T3); dehydration owns keg = 0 (unchanged). ✓
- **Type consistency:** `WaterRation`, `waterRation`, `WATER_RATION_MULT`, `applyWaterRationStrain`, `pickWaterRation`, `_drycampDays`, `isWaterRation`, `setWaterRationOnState`, `postBaselineQty` used identically across tasks. ✓
