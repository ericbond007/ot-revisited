# Dynamic Trail Debris Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace GroundPainting's static 6-sprite scatter with a deterministic, terrain- and trail-progress-weighted period-accurate debris field plus two read-only journey hooks (Fort Laramie junk spike; graves ∝ death count).

**Architecture:** A pure TS module (`debris-field.ts`) computes category weights from (progress, terrain, deathCount, Fort-Laramie proximity) and emits deterministic debris instances keyed by absolute trail position. GroundPainting sweeps the visible world-x window through it. A FLUX script regen produces the richer sprite library. No new mechanics; pure read-only atmosphere.

**Tech Stack:** SvelteKit + TypeScript, Vitest 4 (`vitest run`), Python + FLUX/ComfyUI for sprite art.

Spec: `docs/superpowers/specs/2026-05-17-dynamic-trail-debris-design.md`

---

## File structure

- **Create** `src/lib/ui/wagon/terrain/debris-field.ts` — pure: catalog, hash, `categoryWeights`, `fortLaramieProgress`/`LARAMIE_PROGRESS`, `debrisAt`. One responsibility: "what debris exists at trail position X".
- **Create** `tests/debris-field.test.ts` — Vitest unit tests. (Tests live under `tests/` per `vite.config.ts` `include: ['tests/**/*.test.ts']`; embedded snippets below say `from './debris-field'` illustratively — the real import is `from '../src/lib/ui/wagon/terrain/debris-field'`.)
- **Modify** `src/lib/ui/wagon/terrain/GroundPainting.svelte` — replace static `DEBRIS[]` with a windowed `debrisAt` sweep; add `terrain`/`milesTraveled`/`deathCount` props (defaulted).
- **Modify** `src/lib/ui/wagon/terrain/GroundBand.svelte` — accept + forward `milesTraveled`/`deathCount` (already has `terrain`).
- **Modify** `src/lib/ui/wagon/terrain/ParallaxBands.svelte` — accept + forward `milesTraveled`/`deathCount`.
- **Modify** `src/lib/ui/wagon/WagonScene.svelte` — pass real `milesTraveled`/`deathCount` from gameState into `ParallaxBands` (discovery step; graceful `0` default keeps everything working if a field is absent).
- **Modify** `tools/wagon-bg/debris_sprites_flux.py` — 21-sprite 4-category set, enriched prompts, drop `bone-fragment` + the dead `DEBRIS_PLAN.md` docstring line.
- **Regenerate** `static/wagon-bg/trail-debris/*.webp` via the OOM-safe FLUX flow.

`trail-progress.ts` is reused unchanged (`trailProgress`, `TOTAL_TRAIL_MILES`).

---

## Task 1: debris-field core — types, catalog, hash

**Files:**
- Create: `src/lib/ui/wagon/terrain/debris-field.ts`
- Test: `tests/debris-field.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/debris-field.test.ts
import { describe, it, expect } from 'vitest';
import { DEBRIS_CATALOG, hash32, hashFloats } from './debris-field';

describe('debris catalog', () => {
  it('has 21 sprites across 4 categories', () => {
    expect(DEBRIS_CATALOG).toHaveLength(21);
    const cats = new Set(DEBRIS_CATALOG.map((s) => s.category));
    expect([...cats].sort()).toEqual(['bones', 'graves', 'junk', 'natural']);
  });
  it('every sprite has a non-empty name and a size class', () => {
    for (const s of DEBRIS_CATALOG) {
      expect(s.name).toMatch(/^[a-z-]+$/);
      expect(['small', 'large']).toContain(s.size);
    }
  });
});

describe('hash', () => {
  it('hash32 is deterministic and uint32', () => {
    expect(hash32(42)).toBe(hash32(42));
    expect(hash32(42)).not.toBe(hash32(43));
    expect(hash32(42)).toBeGreaterThanOrEqual(0);
    expect(hash32(42)).toBeLessThan(2 ** 32);
  });
  it('hashFloats yields k deterministic values in [0,1)', () => {
    const a = hashFloats(7, 8);
    expect(a).toHaveLength(8);
    expect(a).toEqual(hashFloats(7, 8));
    for (const v of a) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/debris-field.test.ts`
Expected: FAIL — `Cannot find module './debris-field'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/ui/wagon/terrain/debris-field.ts
import type { Terrain } from '$lib/game/types';
import { LANDMARKS } from '$lib/game/content/landmarks';
import { trailProgress } from './trail-progress';

export type DebrisCategory = 'natural' | 'bones' | 'junk' | 'graves';
export type SizeClass = 'small' | 'large';

export interface DebrisSprite {
  /** Matches static/wagon-bg/trail-debris/<name>.webp */
  name: string;
  category: DebrisCategory;
  size: SizeClass;
}

export const DEBRIS_CATALOG: readonly DebrisSprite[] = [
  { name: 'pebble-gray', category: 'natural', size: 'small' },
  { name: 'pebble-tan', category: 'natural', size: 'small' },
  { name: 'pebble-rust', category: 'natural', size: 'small' },
  { name: 'rock-cluster', category: 'natural', size: 'small' },
  { name: 'stick-short', category: 'natural', size: 'small' },
  { name: 'stick-curved', category: 'natural', size: 'small' },
  { name: 'buffalo-chips', category: 'natural', size: 'small' },
  { name: 'bison-skull', category: 'bones', size: 'small' },
  { name: 'pronghorn-skull', category: 'bones', size: 'small' },
  { name: 'rib-cage', category: 'bones', size: 'large' },
  { name: 'ox-skull', category: 'bones', size: 'small' },
  { name: 'long-bones', category: 'bones', size: 'small' },
  { name: 'broken-wheel', category: 'junk', size: 'large' },
  { name: 'discarded-barrel', category: 'junk', size: 'large' },
  { name: 'abandoned-trunk', category: 'junk', size: 'large' },
  { name: 'cook-stove', category: 'junk', size: 'large' },
  { name: 'anvil', category: 'junk', size: 'small' },
  { name: 'bacon-heap', category: 'junk', size: 'large' },
  { name: 'grave-mound', category: 'graves', size: 'large' },
  { name: 'grave-marker', category: 'graves', size: 'large' },
  { name: 'grave-wolfdug', category: 'graves', size: 'large' },
];

/** Deterministic uint32 hash of an integer. */
export function hash32(n: number): number {
  let x = (n | 0) ^ 0x9e3779b9;
  x = Math.imul(x ^ (x >>> 16), 0x21f0aaad);
  x = Math.imul(x ^ (x >>> 15), 0x735a2d97);
  x = x ^ (x >>> 15);
  return x >>> 0;
}

/** k decorrelated deterministic floats in [0,1) from a seed. Each
 *  channel is independently hashed (counter mode) so channels drawn
 *  from one seed are not cross-correlated. */
export function hashFloats(seed: number, k: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < k; i++) {
    out.push(hash32(seed ^ Math.imul(i, 2246822519)) / 4294967296);
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/debris-field.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ui/wagon/terrain/debris-field.ts tests/debris-field.test.ts
git commit -m "feat(wagon): debris-field catalog + deterministic hash"
```

---

## Task 2: categoryWeights() curves

**Files:**
- Modify: `src/lib/ui/wagon/terrain/debris-field.ts`
- Test: `tests/debris-field.test.ts`

- [ ] **Step 1: Write the failing test** (append to the test file)

```ts
import { categoryWeights } from './debris-field';

describe('categoryWeights', () => {
  const base = { terrain: 'prairie' as const, deathCount: 0, laramieProgress: 0.4 };

  it('junk rises monotonically with progress', () => {
    const a = categoryWeights({ ...base, progress: 0.1 }).junk;
    const b = categoryWeights({ ...base, progress: 0.6 }).junk;
    const c = categoryWeights({ ...base, progress: 0.95 }).junk;
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(c);
  });
  it('bones rise from near-zero early to substantial mid-trail', () => {
    expect(categoryWeights({ ...base, progress: 0.05 }).bones).toBeLessThan(0.4);
    expect(categoryWeights({ ...base, progress: 0.6 }).bones).toBeGreaterThan(0.9);
  });
  it('bones weighted up on plains vs forest/mountains', () => {
    const plains = categoryWeights({ ...base, terrain: 'desert', progress: 0.6 }).bones;
    const mtn = categoryWeights({ ...base, terrain: 'mountains', progress: 0.6 }).bones;
    expect(plains).toBeGreaterThan(mtn);
  });
  it('graves scale with deathCount but stay capped at 0.6', () => {
    const none = categoryWeights({ ...base, progress: 0.5, deathCount: 0 }).graves;
    const some = categoryWeights({ ...base, progress: 0.5, deathCount: 4 }).graves;
    expect(some).toBeGreaterThan(none);
    expect(categoryWeights({ ...base, progress: 1, deathCount: 99 }).graves).toBeLessThanOrEqual(0.6);
  });
  it('junk has a local maximum at the Fort Laramie progress', () => {
    const at = categoryWeights({ ...base, progress: 0.4 }).junk;
    const before = categoryWeights({ ...base, progress: 0.3 }).junk;
    const after = categoryWeights({ ...base, progress: 0.5 }).junk;
    expect(at).toBeGreaterThan(before);
    expect(at).toBeGreaterThan(after);
  });
  it('no spike when laramieProgress is null', () => {
    const w = categoryWeights({ ...base, progress: 0.4, laramieProgress: null });
    expect(w.junk).toBeCloseTo(1.1 * smoothstepRef(0.22, 0.85, 0.4), 5);
  });
});

function smoothstepRef(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/debris-field.test.ts`
Expected: FAIL — `categoryWeights is not exported`.

- [ ] **Step 3: Write minimal implementation** (append to `debris-field.ts`)

```ts
export interface FieldInputs {
  progress: number; // 0..1 trail fraction
  terrain: Terrain;
  deathCount: number;
  /** Trail-progress of Fort Laramie, or null → no Camp-Sacrifice spike. */
  laramieProgress: number | null;
}

export interface CategoryWeights {
  natural: number;
  bones: number;
  junk: number;
  graves: number;
}

function smoothstep(a: number, b: number, x: number): number {
  if (a === b) return x < a ? 0 : 1;
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function categoryWeights(inp: FieldInputs): CategoryWeights {
  const { progress: p, terrain, deathCount, laramieProgress } = inp;
  const natural = 1.0;
  const tMul =
    terrain === 'prairie' || terrain === 'desert' ? 1.5
    : terrain === 'forest' || terrain === 'mountains' ? 0.6
    : 1.0;
  const bones = (0.15 + 0.85 * smoothstep(0.12, 0.55, p)) * tMul;
  const spike =
    laramieProgress == null
      ? 0
      : 1.6 * Math.exp(-(((p - laramieProgress) / 0.05) ** 2));
  const junk = 1.1 * smoothstep(0.22, 0.85, p) + spike;
  const graves = Math.min(0.6, (0.05 + 0.25 * p) * (1 + 0.15 * deathCount));
  return { natural, bones, junk, graves };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/debris-field.test.ts`
Expected: PASS (all Task 1 + Task 2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ui/wagon/terrain/debris-field.ts tests/debris-field.test.ts
git commit -m "feat(wagon): debris category-weight curves"
```

---

## Task 3: Fort Laramie progress resolution

**Files:**
- Modify: `src/lib/ui/wagon/terrain/debris-field.ts`
- Test: `tests/debris-field.test.ts`

- [ ] **Step 1: Write the failing test** (append)

```ts
import { fortLaramieProgress, LARAMIE_PROGRESS } from './debris-field';

describe('fortLaramieProgress', () => {
  it('resolves to a 0..1 fraction strictly between start and end', () => {
    const p = fortLaramieProgress();
    expect(p).not.toBeNull();
    expect(p as number).toBeGreaterThan(0);
    expect(p as number).toBeLessThan(1);
  });
  it('LARAMIE_PROGRESS is the memoised value', () => {
    expect(LARAMIE_PROGRESS).toBe(fortLaramieProgress());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/debris-field.test.ts`
Expected: FAIL — `fortLaramieProgress is not exported`.

- [ ] **Step 3: Write minimal implementation** (append)

```ts
/**
 * Cumulative trail-progress of the Fort Laramie landmark (stable id
 * `ft_laramie`). Returns null if the landmark is absent so the
 * Camp-Sacrifice spike degrades gracefully (no spike, no NaN).
 */
export function fortLaramieProgress(): number | null {
  let miles = 0;
  for (const lm of LANDMARKS) {
    miles += lm.milesFromPrevious;
    if (lm.id === 'ft_laramie') return trailProgress(miles);
  }
  return null;
}

/** Memoised — LANDMARKS is static. */
export const LARAMIE_PROGRESS: number | null = fortLaramieProgress();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/debris-field.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ui/wagon/terrain/debris-field.ts tests/debris-field.test.ts
git commit -m "feat(wagon): resolve Fort Laramie trail-progress"
```

---

## Task 4: debrisAt() deterministic placement

**Files:**
- Modify: `src/lib/ui/wagon/terrain/debris-field.ts`
- Test: `tests/debris-field.test.ts`

- [ ] **Step 1: Write the failing test** (append)

```ts
import { debrisAt, SLOT_PITCH } from './debris-field';

describe('debrisAt', () => {
  const heavy = { natural: 1, bones: 1, junk: 2, graves: 0.3 };

  it('is deterministic for a slot index', () => {
    expect(debrisAt(123, heavy)).toEqual(debrisAt(123, heavy));
  });
  it('returns null for empty slots and DebrisInstance otherwise', () => {
    let hit = 0;
    for (let i = 0; i < 200; i++) if (debrisAt(i, heavy)) hit++;
    expect(hit).toBeGreaterThan(20);   // some occupancy
    expect(hit).toBeLessThan(200);     // not every slot
  });
  it('never emits the rut band: row is only above|below', () => {
    for (let i = 0; i < 500; i++) {
      const d = debrisAt(i, heavy);
      if (d) expect(['above', 'below']).toContain(d.row);
    }
  });
  it('large sprites are always placed below the rut', () => {
    for (let i = 0; i < 500; i++) {
      const d = debrisAt(i, heavy);
      if (d && /wheel|barrel|trunk|stove|bacon|rib-cage|grave/.test(d.sprite)) {
        expect(d.row).toBe('below');
      }
    }
  });
  it('worldX stays within its slot +/- jitter', () => {
    for (let i = 0; i < 200; i++) {
      const d = debrisAt(i, heavy);
      if (d) {
        expect(Math.abs(d.worldX - i * SLOT_PITCH)).toBeLessThanOrEqual(0.5 * SLOT_PITCH);
      }
    }
  });
  it('zero-weight category is never selected', () => {
    const noGraves = { natural: 1, bones: 0, junk: 0, graves: 0 };
    for (let i = 0; i < 400; i++) {
      const d = debrisAt(i, noGraves);
      if (d) expect(d.sprite).toMatch(/pebble|stick|rock|buffalo/);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/debris-field.test.ts`
Expected: FAIL — `debrisAt is not exported`.

- [ ] **Step 3: Write minimal implementation** (append)

```ts
export interface DebrisInstance {
  sprite: string;             // catalog name → /wagon-bg/trail-debris/<name>.webp
  worldX: number;             // absolute trail x of this instance
  row: 'above' | 'below';     // rut band (560..585 scene-y) is never used
  rowT: number;               // 0..1 position within the chosen band
  size: number;               // base scene-unit size; GroundPainting places it
  rot: number;                // degrees
}

/** Scene-x units between candidate debris slots. */
export const SLOT_PITCH = 26;

const LARGE_RE = /wheel|barrel|trunk|stove|bacon|rib-cage|grave/;

export function debrisAt(slotIndex: number, w: CategoryWeights): DebrisInstance | null {
  const f = hashFloats(slotIndex + 1, 8);
  const total = w.natural + w.bones + w.junk + w.graves;
  if (total <= 0) return null;
  // density ~0.4 early → ~0.7 late as more categories activate
  const occ = Math.min(0.7, 0.3 + 0.1 * total);
  if (f[0] >= occ) return null;

  const pick = f[1] * total;
  const cat: DebrisCategory =
      pick < w.natural ? 'natural'
    : pick < w.natural + w.bones ? 'bones'
    : pick < w.natural + w.bones + w.junk ? 'junk'
    : 'graves';

  const pool = DEBRIS_CATALOG.filter((s) => s.category === cat);
  const sprite = pool[Math.min(pool.length - 1, Math.floor(f[2] * pool.length))];

  const big = sprite.size === 'large';
  const row: 'above' | 'below' = big ? 'below' : f[4] < 0.5 ? 'above' : 'below';
  const rowT = f[5];
  const size = big ? 26 + f[6] * 14 : 14 + f[6] * 10;
  const rot = sprite.category === 'graves' ? 0 : Math.round((f[7] - 0.5) * 50);
  const worldX = slotIndex * SLOT_PITCH + (f[3] - 0.5) * 0.8 * SLOT_PITCH;

  return { sprite: sprite.name, worldX, row, rowT, size, rot };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/debris-field.test.ts`
Expected: PASS (all tests, ~17).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ui/wagon/terrain/debris-field.ts tests/debris-field.test.ts
git commit -m "feat(wagon): deterministic debrisAt placement field"
```

---

## Task 5: GroundPainting consumes the field

**Files:**
- Modify: `src/lib/ui/wagon/terrain/GroundPainting.svelte`

- [ ] **Step 1: Add props + imports**

In the `<script lang="ts">` block, replace the import line
`import { GROUND_Y } from './terrain-tokens';` with:

```ts
  import { GROUND_Y, SCENE_W } from './terrain-tokens';
  import type { Terrain } from '$lib/game/types';
  import { trailProgress } from './trail-progress';
  import {
    categoryWeights,
    debrisAt,
    LARAMIE_PROGRESS,
    SLOT_PITCH,
  } from './debris-field';
```

Replace the `Props` interface and `$props()` line:

```ts
  interface Props {
    /** Scene-level horizontal scroll position. */
    scrollX: number;
    terrain: Terrain;
    /** Absolute miles travelled; defaults keep the component usable
     *  standalone (renders early-trail procedural debris). */
    milesTraveled?: number;
    deathCount?: number;
  }

  let { scrollX, terrain, milesTraveled = 0, deathCount = 0 }: Props = $props();
```

- [ ] **Step 2: Replace the static DEBRIS data with the field generator**

Delete the entire `// ─── Trail debris sprites ───` block: the
`DEBRIS_SPRITES` const, the `Debris` type, and the hand-tuned `DEBRIS`
array (everything from the `DEBRIS_SPRITES` comment down to the closing
`];` of `DEBRIS`). Replace with:

```ts
  // ─── Dynamic trail debris (deterministic per trail position) ───
  // Rut-avoided y bands (rut groove lives ~scene y 560..585):
  const ABOVE_Y0 = 540, ABOVE_Y1 = 558;   // above the upper rut
  const BELOW_Y0 = 588, BELOW_Y1 = 600;   // below the lower rut
  const DEBRIS_SCROLL = 0.6;              // matches the dirt-base factor

  const progress = $derived(trailProgress(milesTraveled));
  const weights = $derived(
    categoryWeights({
      progress,
      terrain,
      deathCount,
      laramieProgress: LARAMIE_PROGRESS,
    }),
  );

  // Visible absolute-world span, swept slot by slot.
  const debris = $derived.by(() => {
    const worldStart = scrollX * DEBRIS_SCROLL;
    const i0 = Math.floor(worldStart / SLOT_PITCH) - 1;
    const i1 = Math.ceil((worldStart + SCENE_W) / SLOT_PITCH) + 1;
    const out: {
      href: string;
      x: number;
      y: number;
      size: number;
      rot: number;
      cx: number;
    }[] = [];
    for (let i = i0; i <= i1; i++) {
      const d = debrisAt(i, weights);
      if (!d) continue;
      const screenX = d.worldX - worldStart;
      const [y0, y1] = d.row === 'above' ? [ABOVE_Y0, ABOVE_Y1] : [BELOW_Y0, BELOW_Y1];
      const cy = y0 + d.rowT * (y1 - y0);
      out.push({
        href: `/wagon-bg/trail-debris/${d.sprite}.webp`,
        x: screenX - d.size / 2,
        y: cy - d.size / 2,
        size: d.size,
        rot: d.rot,
        cx: screenX,
      });
    }
    return out;
  });
```

- [ ] **Step 3: Replace the debris markup**

In the template, replace the entire `<!-- 3. Debris OVERLAY ... -->`
block (the `{#each offsets ...}{#each DEBRIS ...}` double-loop and its
contents, up to but not including the final `</g>`) with:

```svelte
  <!-- 3. Debris OVERLAY — deterministic field over the visible world span -->
  {#each debris as d, i (i)}
    <image
      href={d.href}
      x={d.x}
      y={d.y}
      width={d.size}
      height={d.size}
      transform={d.rot ? `rotate(${d.rot} ${d.cx} ${d.y + d.size / 2})` : ''}
      preserveAspectRatio="xMidYMid meet"
    />
  {/each}
```

- [ ] **Step 4: Typecheck**

Run: `npm run check`
Expected: 0 errors (pre-existing `WagonShadows.svelte` warnings only).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ui/wagon/terrain/GroundPainting.svelte
git commit -m "feat(wagon): GroundPainting renders the dynamic debris field"
```

---

## Task 6: Thread terrain/miles/deaths through the scene

**Files:**
- Modify: `src/lib/ui/wagon/terrain/GroundBand.svelte`
- Modify: `src/lib/ui/wagon/terrain/ParallaxBands.svelte`
- Modify: `src/lib/ui/wagon/WagonScene.svelte`

- [ ] **Step 1: GroundBand — accept + forward the new props**

In `GroundBand.svelte`, add to the `Props` interface (after the
`scrollX?` line):

```ts
    milesTraveled?: number;
    deathCount?: number;
```

Update the `$props()` destructure to include them with defaults:

```ts
  let {
    terrain, groundY, h, w, scrollX = 0, idPrefix = 'gb',
    milesTraveled = 0, deathCount = 0,
  }: Props = $props();
```

Change the GroundPainting call from `<GroundPainting {scrollX} />` to:

```svelte
    <GroundPainting {scrollX} {terrain} {milesTraveled} {deathCount} />
```

- [ ] **Step 2: ParallaxBands — accept + forward**

In `ParallaxBands.svelte` `Props` interface add:

```ts
    milesTraveled?: number;
    deathCount?: number;
```

Add to the `$props()` destructure with defaults `milesTraveled = 0,
deathCount = 0`. Change the GroundBand render line to:

```svelte
  <GroundBand {terrain} {groundY} h={groundH} {w} {idPrefix} {milesTraveled} {deathCount} />
```

- [ ] **Step 3: Discover + wire the gameState source in WagonScene**

Run: `grep -n "ParallaxBands\|milesTraveled\|deaths\|gameState\|location" src/lib/ui/wagon/WagonScene.svelte | head -30`

Identify the gameState object and its travelled-miles + death-count
fields (likely `gameState.milesTraveled` and a party death tally).
Pass them into the `<ParallaxBands ... />` render. If a field does not
exist, pass `0` (the spec's graceful default) and add a `TODO(spec
2026-05-17): wire real deathCount` comment — do NOT invent gameState
fields.

Example (adjust names to what grep reveals):

```svelte
  <ParallaxBands
    {terrain}
    {scrollX}
    milesTraveled={gameState.milesTraveled ?? 0}
    deathCount={gameState.party.filter((m) => m.dead).length}
  />
```

- [ ] **Step 4: Typecheck**

Run: `npm run check`
Expected: 0 errors (pre-existing `WagonShadows.svelte` warnings only).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ui/wagon/terrain/GroundBand.svelte src/lib/ui/wagon/terrain/ParallaxBands.svelte src/lib/ui/wagon/WagonScene.svelte
git commit -m "feat(wagon): thread terrain/miles/deaths to the debris field"
```

---

## Task 7: Expand the FLUX sprite script

**Files:**
- Modify: `tools/wagon-bg/debris_sprites_flux.py`

- [ ] **Step 1: Remove the dead DEBRIS_PLAN.md reference**

In the module docstring, delete the sentence fragment referencing
`DEBRIS_PLAN.md` (the planned-system note); replace with:
`See docs/superpowers/specs/2026-05-17-dynamic-trail-debris-design.md`.

- [ ] **Step 2: Replace the DEBRIS list**

Replace the entire `DEBRIS: list[tuple[str, str, int, str]] = [ ... ]`
literal with the 21-sprite set below. Drop `bone-fragment` (it was
never in this list; GroundPainting no longer references it after Task
5). Keep the existing well-formed entries verbatim; the new ones use
the shared `_STYLE` suffix.

```python
DEBRIS: list[tuple[str, str, int, str]] = [
    # ── natural: rocks ──────────────────────────────────────────────
    ("pebble-gray", "natural", 801001,
     "A single smooth dark gray river stone, rounded oval shape, with "
     "subtle mineral mottling and a worn polished surface." + _STYLE),
    ("pebble-tan", "natural", 801002,
     "A single tan and cream weathered sandstone pebble, irregular "
     "rounded shape, dry and dusty with fine grain texture." + _STYLE),
    ("pebble-rust", "natural", 801003,
     "A single rust-red iron-stained rock, angular broken shape, with "
     "orange oxidation streaks and rough fractured faces." + _STYLE),
    ("rock-cluster", "natural", 801007,
     "A small cluster of three or four scattered stones of varied size "
     "and earth-tone color (gray, tan, ochre), nestled together in the "
     "dirt." + _STYLE),
    # ── natural: wood ───────────────────────────────────────────────
    ("stick-short", "natural", 801004,
     "A single short broken weathered tree branch, finger-length, gray "
     "and tan bark peeling, dry and cracked." + _STYLE),
    ("stick-curved", "natural", 801005,
     "A single curved weathered driftwood-like stick, slightly bent, "
     "silver-gray sun-bleached wood with split grain." + _STYLE),
    # ── natural: plains fuel ────────────────────────────────────────
    ("buffalo-chips", "natural", 801006,
     "A single dried disc of weathered buffalo dung (a 'buffalo chip'), "
     "flat circular fibrous brown pat, cracked and sun-dried — the "
     "universal cooking fuel of the treeless plains." + _STYLE),
    # ── bones: western plains remains ───────────────────────────────
    ("bison-skull", "bones", 801010,
     "A single sun-bleached American bison buffalo skull, broad plains "
     "skull with two short curved dark horns and weathered white-gray "
     "bone, half-buried in trail dust." + _STYLE),
    ("pronghorn-skull", "bones", 801011,
     "A single sun-bleached pronghorn antelope skull with its pair of "
     "black pronged horns curving up and back, weathered ivory bone, "
     "dry and cracked." + _STYLE),
    ("rib-cage", "bones", 801012,
     "A partial sun-bleached ox ribcage and spine section, curved "
     "white-gray rib bones arcing up from a vertebral column, "
     "weathered and dry — a draft ox that died on the trail." + _STYLE),
    ("ox-skull", "bones", 801013,
     "A single sun-bleached domestic ox skull with broad forehead and "
     "two thick weathered horns, cracked grey-white bone half sunk in "
     "dust — the most common large carcass on the Oregon Trail." + _STYLE),
    ("long-bones", "bones", 801014,
     "A few scattered sun-bleached large animal leg bones, white-grey, "
     "dry and cracked, lying loosely apart in the dirt as if scattered "
     "by wolves." + _STYLE),
    # ── junk: abandoned wagon cargo ─────────────────────────────────
    ("broken-wheel", "junk", 801020,
     "A single broken wooden wagon wheel, iron rim rusted, several "
     "spokes snapped, lying flat and partly splintered — discarded "
     "from a broken-down prairie schooner." + _STYLE),
    ("discarded-barrel", "junk", 801021,
     "A single weathered wooden barrel lying on its side, iron hoops "
     "rusted, staves grayed and cracked, lid missing — a food barrel "
     "abandoned to lighten a wagon load." + _STYLE),
    ("abandoned-trunk", "junk", 801022,
     "A single battered wooden steamer trunk, leather straps cracked, "
     "brass corners tarnished, lid ajar — a settler's chest left "
     "behind on the trail." + _STYLE),
    ("cook-stove", "junk", 801023,
     "A single small cast-iron cook stove, rusted, one leg bent, "
     "abandoned and tipped slightly — the kind of heavy household "
     "item pioneers dumped at Fort Laramie's 'Camp Sacrifice'." + _STYLE),
    ("anvil", "junk", 801024,
     "A single rusted blacksmith's anvil sitting in the dirt, heavy "
     "iron pitted with orange rust — endlessly listed among goods "
     "jettisoned on the 1849 trail." + _STYLE),
    ("bacon-heap", "junk", 801025,
     "A single heap of abandoned cured side-bacon slabs, fatty cream "
     "and pink-brown streaked, dusty and spoiling in a pile on the "
     "ground — the infamous 'piles of most beautiful bacon'." + _STYLE),
    # ── graves: the trail's long graveyard ──────────────────────────
    ("grave-mound", "graves", 801030,
     "A single low unmarked grave: a long mound of compacted trail "
     "dirt, slightly raised, bare and somber, no marker — dug into "
     "the trail itself." + _STYLE),
    ("grave-marker", "graves", 801031,
     "A single lonely grave with a crude weathered wooden headboard, "
     "a rough plank or simple wooden cross leaning slightly, low dirt "
     "mound, stark and somber." + _STYLE),
    ("grave-wolfdug", "graves", 801032,
     "A single disturbed shallow grave, the low dirt mound partly dug "
     "open and scattered by wolves, a broken wooden marker askew — "
     "grim and somber, no remains visible." + _STYLE),
]
```

- [ ] **Step 3: Syntax check**

Run: `cd tools/wagon-bg && .venv/bin/python -m py_compile debris_sprites_flux.py && echo OK`
Expected: `OK`.

- [ ] **Step 4: Commit (script only)**

```bash
git add tools/wagon-bg/debris_sprites_flux.py
git commit -m "feat(wagon): 21-sprite 4-category period debris script"
```

---

## Task 8: Generate the sprite library (OOM-safe FLUX flow)

**Files:**
- Regenerate: `static/wagon-bg/trail-debris/*.webp`

- [ ] **Step 1: Ensure ComfyUI is up**

Run: `curl -s -m3 http://127.0.0.1:8188/system_stats >/dev/null && echo UP || (cd ~/ComfyUI && .venv/bin/python main.py --listen 127.0.0.1 --port 8188 &)`
If it was started, wait until `curl -s -m2 http://127.0.0.1:8188/system_stats` returns 200 (poll with an until-loop, not chained sleeps).

- [ ] **Step 2: Generate all sprites in the background, monitored**

Run (background — FLUX at 1024² × 21 is slow; swap fix makes it OOM-safe):
`cd /home/eric/projects/hoosierTrail-wagon-bg/tools/wagon-bg && .venv/bin/python debris_sprites_flux.py`
While running, watch `free -h` + `/swap/swapfile` usage and the task output for `done.` Expected final: `done.` and 21 fresh `static/wagon-bg/trail-debris/*.webp` (no `bone-fragment.webp`).

- [ ] **Step 3: Remove the stale sprite + verify the set**

```bash
cd /home/eric/projects/hoosierTrail-wagon-bg
rm -f static/wagon-bg/trail-debris/bone-fragment.webp
ls static/wagon-bg/trail-debris/ | sort
```
Expected: exactly the 21 names from `DEBRIS_CATALOG`, all `.webp`.

- [ ] **Step 4: Gallery review**

Add/refresh a `trail-debris` section in `static/wagon-bg/index.html`
showing all 21 sprites (bump any `?v=` cache-bust). Serve via
`python3 /tmp/nocache_server.py /home/eric/projects/hoosierTrail-wagon-bg/static/wagon-bg/ 8768`
and review at `http://127.0.0.1:8768/index.html` — pay attention that
the `graves` sprites read **somber, not comical**. Regenerate any weak
sprite with a new seed (edit its seed in `debris_sprites_flux.py`,
rerun `.venv/bin/python debris_sprites_flux.py <name>`).

- [ ] **Step 5: Commit assets**

```bash
git add static/wagon-bg/trail-debris static/wagon-bg/index.html
git commit -m "feat(wagon): regenerated 21-sprite period debris library"
```

---

## Task 9: Integration verification

**Files:** none (verification + final gate)

- [ ] **Step 1: Full test suite**

Run: `npm run test`
Expected: PASS, including all `debris-field.test.ts` tests.

- [ ] **Step 2: Typecheck gate**

Run: `npm run check`
Expected: 0 errors (only the pre-existing `WagonShadows.svelte` warnings).

- [ ] **Step 3: Visual scenarios via the dev harness**

Start the dev server (`npm run dev -- --port 5174`). Open
`http://localhost:5174/dev/wagon-view` and exercise terrains
prairie/desert/forest/mountains. Confirm: clean rocks/sticks read
early; bones appear by mid-trail and heavier on plains; junk ramps
late; the field scrolls without jitter; debris never crosses the ruts.
(Use the dev scenario harness / `?` params to vary miles + deaths if
exposed; otherwise temporarily hard-set `milesTraveled`/`deathCount`
defaults in `GroundPainting.svelte` to spot-check progress=0.4 ±
Fort-Laramie spike and deathCount>0 graves, then revert.)

- [ ] **Step 4: Final commit (if any tweaks)**

```bash
git add -A src/lib/ui/wagon
git commit -m "test(wagon): debris-field integration verified"
```

---

## Self-review notes

- **Spec coverage:** sprite library + drift fix (T7/T8), 4 categories incl. graves + buffalo-chips (T1/T7), weight curves incl. Camp-Sacrifice spike + graves∝deaths (T2), Fort Laramie resolution w/ graceful null (T3), deterministic per-trail-position placement + rut-band avoidance (T4), GroundPainting sweep (T5), prop threading + graceful 0 defaults (T6), perf/window (T5 sweep is visible-only), NPC/game-ai N/A (no gameState writes, read-only props), testing (T1–T4 unit, T9 visual + gates). All spec sections mapped.
- **Placeholders:** none — all code is complete; T6 Step 3 is an explicit discovery step with a concrete fallback rule, not a placeholder.
- **Type consistency:** `CategoryWeights`, `FieldInputs`, `DebrisInstance`, `DEBRIS_CATALOG`, `SLOT_PITCH`, `LARAMIE_PROGRESS`, `categoryWeights`, `debrisAt`, `fortLaramieProgress` are defined in T1–T4 and consumed with identical names in T5. Sprite `name`s in `DEBRIS_CATALOG` (T1) exactly match the script output names in T7.
