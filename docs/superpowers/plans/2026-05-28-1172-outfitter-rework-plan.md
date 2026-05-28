# #1172 Outfitter Rework (UI redesign PR2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle `/outfit` to the 1840s-broadsheet paper system and add one-click historical **bundle presets** + live **coverage hints**, recomputed against the real engine consumption model.

**Architecture:** New leaf data file `bundles.ts` (5 typed `Bundle`s, NO cost field) + a `coverage.ts` helper that imports the engine's own consumption constants (so the hint can't drift) + two presentational Svelte components (`BundleCard`, `CoverageHints`). The existing `/outfit/+page.svelte` keeps all its reactive logic (`buyQty` basket, `groups`, totals, `teamStatus`) — we add `applyBundle()` that folds a kit additively into `buyQty` at normal per-item prices, render the bundle sidebar + coverage, restyle the markup to the broadsheet, and migrate the file off the legacy `--c-*` tokens. Three small wizard components also leave the `--c-*` bridge.

**Tech Stack:** SvelteKit 5 (runes), TypeScript strict, vitest, svelte-check. Version control is **jj** (colocated), not git — commit steps use `jj commit`.

**Spec:** `docs/superpowers/specs/2026-05-28-1172-outfitter-rework-design.md`. Closes #1172. PR2 of `docs/superpowers/specs/2026-05-28-ui-redesign-rollout-design.md` (PR0 tokens + PR1 atoms already merged).

---

## Ground truth gathered during planning (do not re-derive)

- **Basket state:** `src/routes/outfit/+page.svelte:44` — `let buyQty = $state<Record<string,number>>(...)` pre-seeded to `0` for every id in `data.buyables` that has both `PRICES[id]` and `ITEMS[id]`. `data.buyables` = `OUTFITTER_BUYABLES` (94 ids).
- **All 25 bundle item ids** are in `OUTFITTER_BUYABLES` and in `ITEMS` — applying any bundle both updates totals **and** renders a catalog row. No missing-category gap (frontier items are category `'tool'`/`'comfort'`, both already in the catalog `order` array).
- **Pricing is automatic:** `suppliesCost` (`+page.svelte:74`) = sum of `buyQty[id] * PRICES[id].buy * buyMult`. Folding a kit into `buyQty` makes totals recompute with zero extra pricing code. Bundles carry **no** cost field (a-la-carte; spec decision).
- **Real consumption constants** live in `src/lib/game/systems/consumption.ts` and are currently module-private: `FOOD_PER_ADULT = {meager:1, normal:2, filling:3}`, `CHILD_FOOD_MULT = 0.6`, `WATER_PER_ADULT_GAL = 1`, `CHILD_WATER_MULT = 0.5`. Task 1 exports them.
- **Water capacity helper** already exists: `src/lib/game/systems/water-cap.ts` -> `waterCapacityGal(wagonModel, inventory)` = `baseWaterCapGal + (inventory.water_bag ?? 0) * 5`. Reuse it (anti-drift).
- **Food id set:** `foodItemIds(): string[]` exported from `src/lib/game/content/items.ts:350`. Item weight field is `ITEMS[id].weightLbPerUnit` (flour = 1).
- **Default wagon:** `DEFAULT_WAGON_MODEL = 'prairie_schooner'`, `baseWaterCapGal: 20`.
- **`--c-*` -> `--of-*` bridge** (authoritative; the migration just inlines these, so the visual result is identical):

  | legacy | replace with |
  |---|---|
  | `--c-bg-raised` | `--of-paper` |
  | `--c-panel` | `--of-paper-soft` |
  | `--c-parchment` | `--of-paper-soft` |
  | `--c-border` | `--of-rule` |
  | `--c-wood` | `--of-ink-soft` |
  | `--c-ink` | `--of-ink` |
  | `--c-tan` | `--of-ink` |
  | `--c-tan-bright` | `--of-ink` |
  | `--c-cream` | `--of-ink` |
  | `--c-rust` | `--of-rust` |
  | `--c-rust-dark` | `--of-rust-dark` |

- **`.ds-*` utilities available** (from PR0): `.ds-paper`, `.ds-row`, `.ds-eyebrow`, `.ds-btn`, `.ds-btn-strong`, `.ds-bulk-chip`, `.ds-leader`, `.ds-progress`/`.ds-progress-fill`/`-fill-warn`/`-fill-bad`, `.ds-stepper`/`-btn`/`-val`.

---

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| `src/lib/game/systems/consumption.ts` | Modify | `export` the 4 consumption constants |
| `src/lib/game/content/bundles.ts` | Create | `Bundle` interface + `BUNDLES` (5 presets, no cost) |
| `src/lib/game/systems/coverage.ts` | Create | `computeCoverage()` — food/water days + ammo + clothing, off real constants |
| `src/lib/ui/outfit/BundleCard.svelte` | Create | One bundle card: icon/name/sub/blurb/item-list/a-la-carte-cost; emits `apply` |
| `src/lib/ui/outfit/CoverageHints.svelte` | Create | Renders coverage chips (food/water/ammo/clothing) with good/mid/low tone |
| `src/routes/outfit/+page.svelte` | Modify | Wire `applyBundle` + coverage; broadsheet restructure; `--c-*`->`--of-*` |
| `src/lib/ui/WagonPicker.svelte` | Modify | `--c-*`->`--of-*` (14 refs) |
| `src/lib/ui/ProfessionPicker.svelte` | Modify | `--c-*`->`--of-*` (10 refs) |
| `src/lib/ui/CustomPartyBuilder.svelte` | Modify | `--c-*`->`--of-*` (15 refs) |
| `tests/bundles-1172.test.ts` | Create | Bundle integrity |
| `tests/coverage-1172.test.ts` | Create | Coverage math vs real constants |

**Commit grouping (~4 jj commits):** T1+T2+T3 -> "data + coverage"; T4 -> "bundle/coverage components"; T5 -> "outfit restructure + bundles + token port"; T6 -> "wizard token migration". T7 is verify/screenshot only.

---

### Task 1: Export engine consumption constants

**Files:**
- Modify: `src/lib/game/systems/consumption.ts:30,43,45,46`

- [ ] **Step 1: Add `export` to the four constants**

Change these four declarations (currently bare `const`) to `export const`. Leave values and all downstream usage untouched:

```ts
export const FOOD_PER_ADULT: Record<Rations, number> = {
  meager: 1,
  normal: 2,
  filling: 3
};
// ...
export const CHILD_FOOD_MULT = 0.6;
// #1031b — 0.7 -> 0.5 to model period-realistic child water rationing.
export const CHILD_WATER_MULT = 0.5;
export const WATER_PER_ADULT_GAL = 1;
```

- [ ] **Step 2: Verify no behavior change**

Run: `npm run check`
Expected: PASS (adding `export` is type-safe; the file already uses these internally).

- [ ] **Step 3: Commit**

```bash
jj commit -m "refactor(consumption): export food/water consumption constants for coverage reuse"
```

---

### Task 2: `bundles.ts` data + integrity test

**Files:**
- Create: `src/lib/game/content/bundles.ts`
- Test: `tests/bundles-1172.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/bundles-1172.test.ts
import { describe, it, expect } from 'vitest';
import { BUNDLES } from '$lib/game/content/bundles';
import { ITEMS } from '$lib/game/content/items';
import { OUTFITTER_BUYABLES } from '$lib/game/content/outfitter';

describe('#1172 bundle presets', () => {
  it('ships exactly the 5 designed bundles', () => {
    expect(BUNDLES.map((b) => b.id)).toEqual([
      'marcy_topup', 'palmer_generous', 'bryant_minimum', 'frontier_starter', 'hunter_pack'
    ]);
  });

  it('has unique ids', () => {
    const ids = BUNDLES.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every kit item exists in ITEMS and is buyable at the outfitter', () => {
    const buyable = new Set(OUTFITTER_BUYABLES);
    for (const b of BUNDLES) {
      for (const id of Object.keys(b.kit)) {
        expect(ITEMS[id], `${b.id} -> ${id} missing from ITEMS`).toBeDefined();
        expect(buyable.has(id), `${b.id} -> ${id} not in OUTFITTER_BUYABLES`).toBe(true);
        expect(b.kit[id], `${b.id} -> ${id} qty must be positive`).toBeGreaterThan(0);
      }
    }
  });

  it('carries no cost field (a-la-carte pricing, spec decision)', () => {
    for (const b of BUNDLES) {
      expect((b as Record<string, unknown>).cost).toBeUndefined();
    }
  });

  it('every tone is a known value', () => {
    const tones = new Set(['rust', 'good', 'warn', 'neutral']);
    for (const b of BUNDLES) expect(tones.has(b.tone)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/bundles-1172.test.ts`
Expected: FAIL — cannot resolve `$lib/game/content/bundles`.

- [ ] **Step 3: Create `bundles.ts`**

```ts
// src/lib/game/content/bundles.ts
//
// #1172 — named outfitter loadouts the player applies with one click.
// ADDITIVE: applying folds `kit[id] x qty` into the basket at normal
// per-item prices (no discount, no premium). Value is convenience, not
// a deal — so there is intentionally NO `cost` field. Compositions are
// taken verbatim from the Claude Design handoff (`outfit-data.jsx`).
export type BundleTone = 'rust' | 'good' | 'warn' | 'neutral';

export interface Bundle {
  id: string;
  /** Display name, e.g. "Marcy's top-up". */
  name: string;
  /** Eyebrow line (IM Fell SC), e.g. "1859 . prudent". */
  sub: string;
  /** Period-citation flavor. */
  blurb: string;
  /** Emoji glyph (placeholder until the icon pass). */
  icon: string;
  tone: BundleTone;
  /** itemId -> quantity, folded additively onto the basket. */
  kit: Record<string, number>;
}

export const BUNDLES: Bundle[] = [
  {
    id: 'marcy_topup',
    name: "Marcy's top-up",
    sub: '1859 . prudent',
    blurb: "Tops up the basics over Marcy 1859's recommended floor — extra powder, water bags, spare wheel.",
    icon: '\u{1F4CB}',
    tone: 'rust',
    kit: {
      flour: 50, bacon: 20, gunpowder: 10, lead_balls: 100, percussion_caps: 100,
      water_bag: 4, ox_shoes: 6, rope: 1, iron_toolkit: 1, bandages: 8
    }
  },
  {
    id: 'palmer_generous',
    name: "Palmer's generous",
    sub: '1845 . 4 souls x full ration',
    blurb: 'Palmer 1845 prescribed lavish per-soul provisioning. Big food, big medicine, no luxuries.',
    icon: '\u{1F35E}',
    tone: 'good',
    kit: {
      flour: 250, bacon: 60, beans: 40, sugar: 15, coffee: 6, dried_fruit: 25,
      hardtack: 30, quinine: 4, laudanum: 2, patent_medicine: 2, bandages: 16
    }
  },
  {
    id: 'bryant_minimum',
    name: "Bryant's minimum",
    sub: '1846 . light & fast',
    blurb: 'Bryant 1846 famously ran light — flour, bacon, rifle, powder, courage. Banks on hunting.',
    icon: '\u{1F40E}',
    tone: 'neutral',
    kit: {
      flour: 40, bacon: 15, gunpowder: 15, lead_balls: 150, percussion_caps: 150,
      rope: 1, shovel: 1
    }
  },
  {
    id: 'frontier_starter',
    name: 'Frontier starter',
    sub: 'Build a life in Oregon',
    blurb: "Plow, seed grain, fruit saplings, family bible. Doesn't help you survive — does set up Oregon.",
    icon: '\u{1F333}',
    tone: 'warn',
    kit: {
      plow: 1, seed_grain: 2, fruit_tree_saplings: 1, garden_seeds: 1, family_bible: 1
    }
  },
  {
    id: 'hunter_pack',
    name: 'Hunter pack',
    sub: 'Heavy on powder & shot',
    blurb: 'For parties that plan to live off the rifle. Triple ammo, spare rifle, light on staples.',
    icon: '\u{1F52B}',
    tone: 'rust',
    kit: {
      gunpowder: 30, lead_balls: 300, percussion_caps: 300, rifle: 1, bacon: 10, hardtack: 15
    }
  }
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/bundles-1172.test.ts`
Expected: PASS (all 5 specs).

- [ ] **Step 5: Commit**

```bash
jj commit -m "feat(1172): add 5 outfitter bundle presets (bundles.ts, no cost field)"
```

---

### Task 3: `coverage.ts` helper + test

**Files:**
- Create: `src/lib/game/systems/coverage.ts`
- Test: `tests/coverage-1172.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/coverage-1172.test.ts
import { describe, it, expect } from 'vitest';
import { computeCoverage } from '$lib/game/systems/coverage';
import { ITEMS } from '$lib/game/content/items';
import { DEFAULT_WAGON_MODEL } from '$lib/game/content/wagons';
import type { PartyMember } from '$lib/game/types';

function adult(name: string): PartyMember {
  return { name, kind: 'adult', dead: false } as unknown as PartyMember;
}
function child(name: string): PartyMember {
  return { name, kind: 'child', dead: false } as unknown as PartyMember;
}

describe('#1172 computeCoverage', () => {
  it('food days = total food lbs / daily food at normal rations (4 adults)', () => {
    const cov = computeCoverage({
      party: [adult('a'), adult('b'), adult('c'), adult('d')],
      starterInventory: {},
      basket: { flour: 80 },
      wagonModel: DEFAULT_WAGON_MODEL
    });
    // daily food = 4 adults x 2 lb = 8 lb/day
    const expected = (80 * ITEMS.flour.weightLbPerUnit) / 8;
    expect(cov.foodDays).toBeCloseTo(expected, 5);
  });

  it('children scale the daily food draw at 0.6x (floored)', () => {
    // 4 adults + 2 children -> 4*2 + floor(2*2*0.6) = 8 + floor(2.4) = 10 lb/day
    const cov = computeCoverage({
      party: [adult('a'), adult('b'), adult('c'), adult('d'), child('e'), child('f')],
      starterInventory: {},
      basket: { flour: 100 },
      wagonModel: DEFAULT_WAGON_MODEL
    });
    expect(cov.foodDays).toBeCloseTo((100 * ITEMS.flour.weightLbPerUnit) / 10, 5);
  });

  it('water days use the real wagon keg capacity + bags', () => {
    // prairie_schooner = 20 gal keg; 4 adults x 1 gal = 4 gal/day -> 5 days
    const cov = computeCoverage({
      party: [adult('a'), adult('b'), adult('c'), adult('d')],
      starterInventory: {},
      basket: {},
      wagonModel: DEFAULT_WAGON_MODEL
    });
    expect(cov.waterDays).toBeCloseTo(20 / 4, 5);
    // +2 water bags -> 30 gal -> 7.5 days
    const cov2 = computeCoverage({
      party: [adult('a'), adult('b'), adult('c'), adult('d')],
      starterInventory: {},
      basket: { water_bag: 2 },
      wagonModel: DEFAULT_WAGON_MODEL
    });
    expect(cov2.waterDays).toBeCloseTo(30 / 4, 5);
  });

  it('combines starter inventory and basket; shots = min(balls, caps)', () => {
    const cov = computeCoverage({
      party: [adult('a')],
      starterInventory: { lead_balls: 50, percussion_caps: 50 },
      basket: { lead_balls: 100, percussion_caps: 100 },
      wagonModel: DEFAULT_WAGON_MODEL
    });
    expect(cov.shots).toBe(150);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/coverage-1172.test.ts`
Expected: FAIL — cannot resolve `$lib/game/systems/coverage`.

- [ ] **Step 3: Create `coverage.ts`**

```ts
// src/lib/game/systems/coverage.ts
//
// #1172 — outfit-screen coverage hints. Recomputed against the REAL
// engine consumption constants + water-cap helper so the hint can never
// drift from what the player actually experiences mid-trail. Pre-journey
// there is no pace/weather/terrain context, so food is measured at
// `normal` rations (the engine's baseline).
import type { GameState, PartyMember } from '../types';
import { ITEMS, foodItemIds } from '../content/items';
import { getWagon, type WagonModelId } from '../content/wagons';
import { FOOD_PER_ADULT, CHILD_FOOD_MULT, WATER_PER_ADULT_GAL, CHILD_WATER_MULT } from './consumption';
import { waterCapacityGal } from './water-cap';

export interface CoverageInput {
  party: GameState['party'];
  /** What the party already owns (starter kit). */
  starterInventory: Record<string, number>;
  /** Pending purchases (the `buyQty` basket). */
  basket: Record<string, number>;
  wagonModel: WagonModelId;
}

export interface Coverage {
  /** Days of food at normal rations for the live party. */
  foodDays: number;
  /** Days of water at the wagon's keg capacity + bags. */
  waterDays: number;
  /** Usable rounds: min(lead_balls, percussion_caps). */
  shots: number;
  /** Worst per-soul coverage of coat/boots/blanket (1 = one each per soul). */
  clothingCov: number;
}

const FOOD_IDS = new Set(foodItemIds());

function isAliveAdult(m: PartyMember): boolean {
  return !m.dead && m.kind === 'adult';
}
function isAliveChild(m: PartyMember): boolean {
  return !m.dead && m.kind === 'child';
}

export function computeCoverage(input: CoverageInput): Coverage {
  const { party, starterInventory, basket, wagonModel } = input;
  const combined: Record<string, number> = {};
  for (const [id, q] of Object.entries(starterInventory)) combined[id] = (combined[id] ?? 0) + (q ?? 0);
  for (const [id, q] of Object.entries(basket)) combined[id] = (combined[id] ?? 0) + (q ?? 0);

  const adults = party.filter(isAliveAdult).length;
  const children = party.filter(isAliveChild).length;
  const souls = adults + children;

  // Food — total lbs of food items / daily draw at normal rations.
  const perAdult = FOOD_PER_ADULT.normal;
  const dailyFood = adults * perAdult + Math.floor(children * perAdult * CHILD_FOOD_MULT);
  let foodLbs = 0;
  for (const [id, q] of Object.entries(combined)) {
    if (FOOD_IDS.has(id)) foodLbs += q * (ITEMS[id]?.weightLbPerUnit ?? 0);
  }
  const foodDays = dailyFood > 0 ? foodLbs / dailyFood : 0;

  // Water — real keg capacity (+ bags) / daily water draw.
  const dailyWater = adults * WATER_PER_ADULT_GAL + Math.ceil(children * WATER_PER_ADULT_GAL * CHILD_WATER_MULT);
  const waterCap = waterCapacityGal(getWagon(wagonModel), combined);
  const waterDays = dailyWater > 0 ? waterCap / dailyWater : 0;

  // Ammo — a usable round needs both a ball and a cap.
  const shots = Math.min(combined.lead_balls ?? 0, combined.percussion_caps ?? 0);

  // Clothing — worst per-soul coverage of the three winter items.
  const clothingCov = souls > 0
    ? Math.min(
        (combined.coat ?? 0) / souls,
        (combined.boots ?? 0) / souls,
        (combined.blanket ?? 0) / souls
      )
    : 0;

  return { foodDays, waterDays, shots, clothingCov };
}
```

> NOTE: `waterCapacityGal` in `water-cap.ts` takes `(wagonModel, inventory)` — confirm its exact param order/type when implementing and match it (it reads `getWagon(...).baseWaterCapGal` + `inventory.water_bag*5`). If it accepts a `WagonModelId` directly rather than the resolved wagon, drop the `getWagon()` wrapper. Adjust the call, not the math.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/coverage-1172.test.ts`
Expected: PASS (4 specs).

- [ ] **Step 5: Commit**

```bash
jj commit -m "feat(1172): coverage helper (food/water/ammo/clothing) off real engine constants"
```

---

### Task 4: `BundleCard.svelte` + `CoverageHints.svelte`

**Files:**
- Create: `src/lib/ui/outfit/BundleCard.svelte`
- Create: `src/lib/ui/outfit/CoverageHints.svelte`

- [ ] **Step 1: Create `BundleCard.svelte`**

Presentational. Shows icon/name/sub/blurb, the item list (real names + qtys from `ITEMS`), and the derived a-la-carte cost (passed in as a prop so the page owns the discount math). Emits `apply` via a callback prop. Paper styling via `--of-*`.

```svelte
<script lang="ts">
  import type { Bundle } from '$lib/game/content/bundles';
  import { ITEMS } from '$lib/game/content/items';

  let {
    bundle,
    cost,
    applied = false,
    onapply
  }: {
    bundle: Bundle;
    /** Pre-computed a-la-carte cost (page applies merchant/banker discount). */
    cost: number;
    applied?: boolean;
    onapply: (b: Bundle) => void;
  } = $props();

  let expanded = $state(false);
  const entries = $derived(Object.entries(bundle.kit));
  const itemCount = $derived(entries.length);
  function money(n: number): string {
    return '$' + (Math.round(n * 100) / 100).toFixed(2);
  }
</script>

<div class="bundle-card bundle-{bundle.tone}" class:expanded class:applied>
  <button class="bundle-summary" onclick={() => (expanded = !expanded)} type="button">
    <span class="bundle-icon">{bundle.icon}</span>
    <span class="bundle-titles">
      <span class="bundle-name">{bundle.name}</span>
      <span class="ds-eyebrow bundle-sub">{bundle.sub}</span>
    </span>
    <span class="bundle-meta">
      <span class="bundle-itemcount">{itemCount} items</span>
      <span class="bundle-cost">{money(cost)}</span>
    </span>
    <span class="bundle-chevron">{expanded ? '▾' : '▸'}</span>
  </button>

  {#if expanded}
    <div class="bundle-expand">
      <p class="bundle-blurb">{bundle.blurb}</p>
      <div class="bundle-items">
        {#each entries as [id, qty] (id)}
          <span class="bundle-item">
            <span class="bundle-item-name">{ITEMS[id]?.name ?? id}</span>
            <span class="bundle-item-qty">x{qty}</span>
          </span>
        {/each}
      </div>
      <button
        class="ds-btn bundle-add"
        class:applied
        type="button"
        onclick={() => onapply(bundle)}
      >
        {applied ? 'Add again' : 'Add to outfit'}
      </button>
    </div>
  {/if}
</div>

<style>
  .bundle-card {
    background: var(--of-paper);
    border: 1.5px solid var(--of-rule);
    border-radius: 3px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: border-color 0.12s;
  }
  .bundle-card:hover { border-color: var(--of-ink-soft); }
  .bundle-card.expanded { border-color: var(--of-rust); border-width: 2px; }
  .bundle-card.applied { background: color-mix(in srgb, var(--of-good) 6%, var(--of-paper)); border-color: var(--of-good); }
  .bundle-summary {
    display: grid;
    grid-template-columns: 22px 1fr auto auto;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    background: transparent;
    border: 0;
    cursor: pointer;
    text-align: left;
    color: var(--of-ink);
    font-family: var(--of-body);
  }
  .bundle-icon { font-size: 17px; line-height: 1; text-align: center; }
  .bundle-titles { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .bundle-name { font-family: var(--of-display); font-size: 15px; color: var(--of-ink); letter-spacing: 0.02em; line-height: 1.1; }
  .bundle-sub { font-size: var(--of-fs-label); font-style: italic; }
  .bundle-meta { display: flex; flex-direction: column; align-items: flex-end; line-height: 1.1; }
  .bundle-itemcount { font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--of-ink-soft); opacity: 0.7; font-weight: 700; }
  .bundle-cost { font-family: var(--of-mono); font-size: 13px; color: var(--of-rust); font-weight: 700; font-variant-numeric: tabular-nums; }
  .bundle-chevron { color: var(--of-ink-soft); font-size: 12px; width: 14px; text-align: center; }
  .bundle-expand { padding: 4px 12px 12px; border-top: 1px dashed var(--of-rule); background: var(--of-paper-soft); display: flex; flex-direction: column; gap: 8px; }
  .bundle-blurb { margin: 6px 0 0; font-family: var(--of-body); font-style: italic; font-size: 12px; color: var(--of-ink); line-height: 1.5; }
  .bundle-items { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 12px; padding: 6px 0; border-top: 1px dashed var(--of-rule); border-bottom: 1px dashed var(--of-rule); }
  .bundle-item { display: flex; justify-content: space-between; gap: 6px; font-size: 11px; color: var(--of-ink); padding: 2px 0; font-variant-numeric: tabular-nums; }
  .bundle-item-qty { color: var(--of-rust); font-weight: 700; }
  .bundle-add { margin-top: 4px; align-self: flex-start; }
  .bundle-add.applied { background: var(--of-paper); color: var(--of-good); border-color: var(--of-good); }
</style>
```

- [ ] **Step 2: Create `CoverageHints.svelte`**

```svelte
<script lang="ts">
  import type { Coverage } from '$lib/game/systems/coverage';

  let { coverage, souls }: { coverage: Coverage; souls: number } = $props();

  // Tone thresholds — green if comfortable, amber if thin, red if short.
  // Display-only color bands (full run is ~150-170 trail days).
  function dayTone(days: number): 'good' | 'mid' | 'low' {
    if (days >= 120) return 'good';
    if (days >= 80) return 'mid';
    return 'low';
  }
  function round(n: number): number { return Math.round(n); }
</script>

<div class="cov">
  <span class="ds-eyebrow cov-head">Coverage</span>
  <div class="cov-chips">
    <span class="cov-chip cov-{dayTone(coverage.foodDays)}">
      Food . {round(coverage.foodDays)} days for {souls} {souls === 1 ? 'soul' : 'souls'}
    </span>
    <span class="cov-chip cov-{dayTone(coverage.waterDays * 12)}">
      Water . {round(coverage.waterDays)} days between sources
    </span>
    <span class="cov-chip cov-{coverage.shots >= 200 ? 'good' : coverage.shots >= 60 ? 'mid' : 'low'}">
      Ammo . {coverage.shots} shots
    </span>
    <span class="cov-chip cov-{coverage.clothingCov >= 1 ? 'good' : coverage.clothingCov >= 0.5 ? 'mid' : 'low'}">
      Clothing . {Math.round(coverage.clothingCov * 100)}% per soul
    </span>
  </div>
</div>

<style>
  .cov { display: flex; flex-direction: column; gap: 6px; }
  .cov-head { display: block; }
  .cov-chips { display: flex; flex-direction: column; gap: 4px; }
  .cov-chip {
    font-family: var(--of-mono);
    font-size: var(--of-fs-label);
    letter-spacing: 0.02em;
    padding: 3px 8px;
    border-radius: 2px;
    border: 1px solid;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .cov-good { color: var(--of-good); border-color: var(--of-good); background: color-mix(in srgb, var(--of-good) 8%, transparent); }
  .cov-mid  { color: var(--of-warn); border-color: var(--of-warn); background: color-mix(in srgb, var(--of-warn) 8%, transparent); }
  .cov-low  { color: var(--of-bad);  border-color: var(--of-bad);  background: color-mix(in srgb, var(--of-bad) 6%, transparent); }
</style>
```

> Threshold note (`dayTone`, ammo, water cutoffs): display-only color bands, not engine values. The displayed numbers are raw. If a band reads wrong in the screenshot pass (Task 7), adjust cutoffs — the numbers shown don't change.

- [ ] **Step 3: Verify the components compile**

Run: `npm run check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
jj commit -m "feat(1172): BundleCard + CoverageHints broadsheet components"
```

---

### Task 5: Restructure `/outfit/+page.svelte` — bundles, coverage, broadsheet, token port

**Files:**
- Modify: `src/routes/outfit/+page.svelte` (script + markup + `<style>`)

Largest task. **Preserve every existing reactive declaration** (`buyQty`, `groups`, `suppliesCost`, `totalCost`, `teamStatus`, `liveGroups`, etc.). You ADD bundle/coverage wiring, restructure markup to the broadsheet, and migrate tokens. Do NOT rewrite the engine wiring.

- [ ] **Step 1: Add imports + bundle-apply + coverage to the `<script>`**

After the existing imports (around `+page.svelte:10`), add:

```ts
  import { BUNDLES, type Bundle } from '$lib/game/content/bundles';
  import { computeCoverage } from '$lib/game/systems/coverage';
  import BundleCard from '$lib/ui/outfit/BundleCard.svelte';
  import CoverageHints from '$lib/ui/outfit/CoverageHints.svelte';
```

After the `buyQty` declaration (`+page.svelte:44-46`), add the apply handler + applied-tracking + cost helper:

```ts
  // #1172 — applied-bundle ids (visual marker only; a bundle can be
  // applied more than once — additive is intentional, the steppers trim).
  let appliedBundles = $state<Set<string>>(new Set());

  function applyBundle(b: Bundle) {
    for (const [id, qty] of Object.entries(b.kit)) {
      // All bundle ids are pre-seeded in buyQty (they're in OUTFITTER_BUYABLES),
      // so this mutates an existing reactive key — additive onto the basket.
      buyQty[id] = (buyQty[id] ?? 0) + qty;
    }
    appliedBundles = new Set(appliedBundles).add(b.id);
  }

  // A-la-carte cost at the player's effective buy prices (honors
  // merchant/banker discount via buyMult). Display only — no stored cost.
  function bundleCost(b: Bundle): number {
    return Object.entries(b.kit).reduce(
      (s, [id, qty]) => s + qty * (PRICES[id]?.buy ?? 0) * buyMult,
      0
    );
  }
```

After the `totalWeight`/`capacity` derivations (around `+page.svelte:106`), add coverage:

```ts
  // #1172 — live coverage hints, recomputed against the real engine
  // consumption model as the basket + wagon change.
  const coverage = $derived(
    computeCoverage({
      party: gs.party,
      starterInventory: gs.inventory,
      basket: buyQty,
      wagonModel: selectedWagon
    })
  );
  const liveSouls = $derived(gs.party.filter((m) => !m.dead).length);
```

- [ ] **Step 2: Run check after script changes**

Run: `npm run check`
Expected: PASS (unused-import warnings for the two new components are acceptable until Step 3 wires markup; if svelte-check errors on unused, do Step 3 first then re-run).

- [ ] **Step 3: Add the bundles + coverage to the markup**

Insert into the left rail (`<!-- Left rail: tips + contextual hints -->` at `+page.svelte:292`), near its top, matching the handoff sidebar placement:

```svelte
  <!-- #1172 — one-click historical loadouts (additive, a-la-carte priced) -->
  <section class="ds-paper bundles-panel">
    <span class="ds-eyebrow">Loadouts</span>
    <p class="bundles-blurb">
      Apply a historical preset to fill the basket fast, then adjust. Priced at the
      shelf rate — no discount, no markup.
    </p>
    <div class="bundles-list">
      {#each BUNDLES as b (b.id)}
        <BundleCard
          bundle={b}
          cost={bundleCost(b)}
          applied={appliedBundles.has(b.id)}
          onapply={applyBundle}
        />
      {/each}
    </div>
  </section>

  <!-- #1172 — live coverage hints -->
  <section class="ds-paper">
    <CoverageHints {coverage} souls={liveSouls} />
  </section>
```

Add styling in the `<style>` block:

```css
  .bundles-panel { display: flex; flex-direction: column; gap: 8px; }
  .bundles-blurb { margin: 0; font-family: var(--of-body); font-style: italic; font-size: var(--of-fs-sub); color: var(--of-ink-soft); line-height: 1.4; }
  .bundles-list { display: flex; flex-direction: column; gap: 6px; }
```

- [ ] **Step 4: Migrate `/outfit` off `--c-*`**

Replace every `--c-*` reference using the bridge table. Mechanical and visually a no-op (the bridge already resolves each `--c-X` to these `--of-*` values). Order matters — the list below is already safe:

```bash
cd /home/eric/projects/hoosierTrail-ui-pr2
sed -i \
  -e 's/--c-bg-raised/--of-paper/g' \
  -e 's/--c-parchment/--of-paper-soft/g' \
  -e 's/--c-panel/--of-paper-soft/g' \
  -e 's/--c-border/--of-rule/g' \
  -e 's/--c-wood/--of-ink-soft/g' \
  -e 's/--c-tan-bright/--of-ink/g' \
  -e 's/--c-tan/--of-ink/g' \
  -e 's/--c-cream/--of-ink/g' \
  -e 's/--c-ink/--of-ink/g' \
  -e 's/--c-rust-dark/--of-rust-dark/g' \
  -e 's/--c-rust/--of-rust/g' \
  src/routes/outfit/+page.svelte
grep -c -- '--c-' src/routes/outfit/+page.svelte   # expect 0
```

- [ ] **Step 5: Verify check + tests**

Run: `npm run check && npx vitest run`
Expected: PASS (svelte-check clean; all tests green).

- [ ] **Step 6: Commit**

```bash
jj commit -m "feat(1172): outfit broadsheet restructure — bundles, coverage, --of-* token port"
```

---

### Task 6: Migrate the 3 wizard components off `--c-*`

**Files:**
- Modify: `src/lib/ui/WagonPicker.svelte`
- Modify: `src/lib/ui/ProfessionPicker.svelte`
- Modify: `src/lib/ui/CustomPartyBuilder.svelte`

`WagonPicker` is consumed by `/outfit`; the other two by the new-journey wizard (a later rollout PR) but are cheap bridge-backed swaps now. Visually a no-op.

- [ ] **Step 1: Run the bridge replacement on each file**

```bash
cd /home/eric/projects/hoosierTrail-ui-pr2
for f in src/lib/ui/WagonPicker.svelte src/lib/ui/ProfessionPicker.svelte src/lib/ui/CustomPartyBuilder.svelte; do
  sed -i \
    -e 's/--c-bg-raised/--of-paper/g' \
    -e 's/--c-parchment/--of-paper-soft/g' \
    -e 's/--c-panel/--of-paper-soft/g' \
    -e 's/--c-border/--of-rule/g' \
    -e 's/--c-wood/--of-ink-soft/g' \
    -e 's/--c-tan-bright/--of-ink/g' \
    -e 's/--c-tan/--of-ink/g' \
    -e 's/--c-cream/--of-ink/g' \
    -e 's/--c-ink/--of-ink/g' \
    -e 's/--c-rust-dark/--of-rust-dark/g' \
    -e 's/--c-rust/--of-rust/g' \
    "$f"
done
```

> If any file references a `--c-*` token NOT in the bridge table (grep first: `grep -oE -- '--c-[a-z-]+' <file> | sort -u`), STOP, look it up in the full bridge block in `theme.css`, and add the correct `-e` rule rather than leaving residue.

- [ ] **Step 2: Confirm zero residue**

```bash
grep -c -- '--c-' src/lib/ui/WagonPicker.svelte src/lib/ui/ProfessionPicker.svelte src/lib/ui/CustomPartyBuilder.svelte
```
Expected: `0` for each.

- [ ] **Step 3: Verify**

Run: `npm run check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
jj commit -m "refactor(ui): migrate WagonPicker/ProfessionPicker/CustomPartyBuilder off --c-* bridge (#1172)"
```

---

### Task 7: Full verify + Playwright screenshot sweep

**Files:** none (verification only)

- [ ] **Step 1: Full gate**

Run: `npm run verify`
Expected: PASS (check + full vitest).

- [ ] **Step 2: Start the dev server (systemd-run, not nohup)**

```bash
cd /home/eric/projects/hoosierTrail-ui-pr2
systemd-run --user --unit=ot-pr2-dev --working-directory="$PWD" npm run dev
```
(The controller — not a subagent — drives Playwright; subagents cannot screenshot.)

- [ ] **Step 3: Screenshot + interact via Playwright**

Land on `/outfit` (new-game flow / a pre-journey scenario that redirects to `/outfit?slot=...`). Then:
1. Screenshot the broadsheet layout + bundle sidebar + coverage chips.
2. Click a bundle card to expand; screenshot the item list + a-la-carte cost.
3. Click "Add to outfit"; confirm the totals bar AND coverage chips update (food/water/ammo climb).
4. Confirm no inverted/invisible text and no `--c-*`-driven breakage.

- [ ] **Step 4: Stop the dev server**

```bash
systemctl --user stop ot-pr2-dev
```

- [ ] **Step 5: Final residue check**

```bash
grep -rc -- '--c-' src/routes/outfit/+page.svelte src/lib/ui/WagonPicker.svelte src/lib/ui/ProfessionPicker.svelte src/lib/ui/CustomPartyBuilder.svelte
```
Expected: `0` across all four.

---

## Self-Review (ran during planning)

**Spec coverage:**
- bundles.ts typed Bundle[], 5 loadouts verbatim, no cost field -> Task 2.
- Additive apply into buyQty at normal per-item prices -> Task 5 Step 1 (applyBundle).
- computeCoverage recomputed against real engine constants (imports consumption consts + water-cap helper + foodItemIds) -> Tasks 1+3.
- Broadsheet restructure of /outfit + token migration of the 4 files -> Tasks 5+6.
- Tests: bundles-1172 (ids exist + buyable + unique) + coverage-1172 (food/water/child math) -> Tasks 2+3.
- npm run verify + Playwright sweep -> Task 7.
- Out of scope respected: no scoring screen (#148), no trade-post (PR3), no bundle-aware bots.

**Placeholder scan:** none — every code step shows complete code; the one threshold-tuning note (CoverageHints color bands) is flagged display-only and adjustable, numbers unaffected.

**Type/name consistency:** Bundle/BUNDLES/BundleTone (T2) used identically in BundleCard (T4) and the page (T5). computeCoverage(CoverageInput) -> Coverage (T3) consumed with exact field names in T5 + CoverageHints. applyBundle/bundleCost/appliedBundles/coverage/liveSouls names consistent across T5 script + markup. Bridge table identical in T5+T6.

**Watch-item flagged inline:** confirm waterCapacityGal's exact signature when wiring T3 (wrap with getWagon() or pass the id) — adjust the call, not the math.

---

## Execution Handoff

Plan complete. Recommended: **subagent-driven-development** — fresh implementer per task + spec/quality review between tasks; the controller runs `npm run verify` between behavior-changing tasks and drives the Task 7 Playwright sweep (subagents can't screenshot).
