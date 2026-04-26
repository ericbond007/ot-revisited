# TRAIL_MAP_CLAUDE.md — Trail Map Implementation Brief

> **Scope.** Feature-scoped brief for the trail-map work only. Does **not**
> override the repo root `CLAUDE.md`. Read that first; defer to it if anything
> here contradicts.

---

You are landing the OT.IO **Trail Map** redesign in the SvelteKit codebase
`ericbond007/ot-revisited`. This file is your contract.

The handoff bundle (this folder) contains:
- `README.md` — bundle overview, layer breakdown, status of each piece
- `colors_and_type.css` — design tokens, ported verbatim from the target repo
- `src/trail-snippet.html` — **final** design: parchment snippet + click-to-expand modal
- `src/TrailMapClassic.jsx`, `TrailMapTerrain.jsx`, `TrailMapHandDrawn.jsx` —
  exploration variants. **Reference only — do not ship.**

**Read those first.** This file tells you how to translate them.

---

## The repo at a glance

- **Framework:** SvelteKit 2, Svelte 5 (runes), TypeScript
- **Existing trail map:** `src/lib/ui/TrailMap.svelte` — flat parchment strip
  with dashed trail and emoji landmark dots. Uses the `LANDMARKS` array.
- **Landmark data:** the repo's `LANDMARKS` array (32 entries) is the source
  of truth. Use it; don't duplicate.

---

## Slot map — where the new code goes

```
src/lib/ui/trail-map/
├── TrailMapSnippet.svelte        ← NEW.  The parchment snippet w/ HUD
├── TrailMapModal.svelte          ← NEW.  Fullscreen pan-zoom modal
├── trail-map-svg/
│   ├── ParchmentBg.svelte        ← shared parchment background
│   ├── TerrainTexture.svelte     ← stipple + tufts + ridges + buttes + dunes + scrub
│   ├── RiverPaths.svelte         ← Platte + N.Platte gradient strokes
│   ├── TrailPath.svelte          ← traveled (solid orange) + remaining (dashed brown)
│   ├── LandmarkPin.svelte        ← single landmark pin + leader line + label
│   ├── WagonGlyph.svelte         ← prairie schooner glyph w/ pulse halo
│   └── Compass.svelte            ← N/S/E/W rose
└── trail-map-helpers.ts          ← interpolatePosition(), currentLeg(), labelFor()
```

The existing `TrailMap.svelte` is replaced by `TrailMapSnippet.svelte`. Keep
it git-deleted, not stubbed — the new component subsumes its responsibility.

---

## Build order

### 1. Helpers (`trail-map-helpers.ts`)

```ts
import type { Landmark } from '$lib/data/landmarks';

export function currentLeg(landmarks: Landmark[], currentMileage: number) {
  const last = [...landmarks].reverse().find(l => l.mile <= currentMileage);
  const next = landmarks.find(l => l.mile > currentMileage);
  return { last, next };
}

export function interpolatePosition(
  landmarks: Landmark[],
  currentMileage: number,
  routeCoords: Record<string, [number, number]>
): [number, number] { /* … */ }

export function milesToNext(
  landmarks: Landmark[],
  currentMileage: number
): { name: string; miles: number } | null { /* … */ }
```

These are pure functions — test them.

### 2. Static SVG sub-components

Each is a small `.svelte` file rendering a `<g>` of pre-positioned elements.
**Lift the SVG verbatim** from `src/trail-snippet.html` — don't redraw.

- `ParchmentBg.svelte` — wraps children with the parchment-textured `<div>`.
  Background pulled from the snippet's `.trailmap` CSS rule.
- `TerrainTexture.svelte` — the 6 layered `<g>` groups in the snippet
  (stipple, tufts, ridge-ticks, caret-peaks, dune curves, cottonwood/scrub).
  Drawn to fill the snippet's viewBox; coordinates are absolute.
- `RiverPaths.svelte` — the two meandering river curves with gradient stroke.
- `TrailPath.svelte` — takes `currentMileage` + `landmarks`; renders solid
  rust east of wagon, dashed brown west. Use the helper to find the wagon's
  position on the path.
- `LandmarkPin.svelte` — props `kind` (`fort | landmark | river | start |
  end`), `x`, `y`, `name`, `passed`, `leaderTo`. Renders the right glyph
  shape + leader line + label.
- `WagonGlyph.svelte` — the prairie schooner SVG from the snippet's wagon
  group. Includes the pulse halo (`<animate>` is fine here — it's a static
  pulse, not part of the travel-scene tick).
- `Compass.svelte` — the N/S/E/W rose.

### 3. `TrailMapSnippet.svelte`

Composes everything for the default zoomed-in view (350-mi window centered
on the wagon).

Props:
```ts
interface Props {
  landmarks: Landmark[];
  currentMileage: number;
  totalMileage: number;
  day: number;
  onExpand: () => void;
}
```

Layout (top to bottom, all absolutely positioned over the parchment):
- Top-left HUD: `<eyebrow>FROM → TO</eyebrow><big>{leg}</big><sub>Leg N of M · day D</sub>`
- Top-center: `<Compass>`
- Top-right HUD: `<eyebrow>NEXT LANDMARK</eyebrow><big>{n} mi · {name}</big><sub>{fort} in {n} mi</sub>`
- Center: the SVG (TerrainTexture + RiverPaths + TrailPath + LandmarkPin × N + WagonGlyph)
- Bottom-left: scale badge `~ 75 MI` + 3-row legend
- Bottom-right: expand button

The snippet is **clickable** as a whole — click anywhere (except the legend)
opens the modal. Add `role="button" tabindex="0"` and Enter/Space handlers.

### 4. `TrailMapModal.svelte`

Fullscreen modal with the full 2,170-mi trail. Same SVG sub-components, but
laid out across the wider viewBox (1000×380, see snippet HTML for exact
geometry).

**Pan + zoom:**
- Wheel / `+` / `-` zoom around cursor position
- Drag to pan
- `0` or home button fits to view
- Esc or X closes
- Min scale 0.5, max scale 6

The pan/zoom JS in `src/trail-snippet.html` is ~80 lines and is correct.
Port it verbatim into `TrailMapModal.svelte`'s `<script>` — it's plain DOM
math, no Svelte-specific anything. Use `$state` for `scale`, `tx`, `ty`.

**Do not** introduce a new modal/dialog primitive unless the repo already
has one. If it does (search `src/lib/ui/` for `Modal`, `Dialog`, `Overlay`),
use it. If not, hand-roll the fixed overlay as in the prototype.

### 5. Wire to the existing `TrailMap.svelte` mount points

Find every `import TrailMap from …/TrailMap.svelte` in the repo. Each one
becomes:

```svelte
<script lang="ts">
  import TrailMapSnippet from '$lib/ui/trail-map/TrailMapSnippet.svelte';
  import TrailMapModal from '$lib/ui/trail-map/TrailMapModal.svelte';
  let modalOpen = $state(false);
</script>

<TrailMapSnippet {landmarks} {currentMileage} {totalMileage} {day}
                 onExpand={() => modalOpen = true} />
{#if modalOpen}
  <TrailMapModal {landmarks} {currentMileage} {totalMileage}
                 onClose={() => modalOpen = false} />
{/if}
```

---

## Conventions to follow

- **Svelte 5 runes only.** `$state`, `$derived`, `$effect`. No `let x =`
  reactivity.
- **TypeScript strict.** Type all props with `interface Props`.
- **CSS variables for chrome, hex literals for illustration.** HUD pills,
  eyebrow labels, expand button: tokens. Parchment fills, ink strokes, river
  gradients: hex constants in the SVG sub-components. Don't mix.
- **No external icon library.** Inline SVG only.
- **No new fonts.** `--f-body`, `--f-mono`, `--f-display` only.
- **Match `CampStage.svelte` / `TrailMap.svelte` for file structure.**
  Header comment, `<script lang="ts">`, markup, scoped `<style>`.

---

## Things to NOT do

- ❌ **Do not ship the three `*.jsx` variants.** They're exploration, not
  product. Reference only.
- ❌ **Do not duplicate the `LANDMARKS` array.** Reuse the repo's.
- ❌ **Do not invent new map hues.** Parchment / rust / ink / river-blue is
  the entire palette.
- ❌ **Do not use CSS animations for the wagon's pulse.** The `<animate>`
  tag inside the SVG is fine (it's not coupled to a frame loop) but don't
  add `@keyframes`-driven pulses on top of it.
- ❌ **Do not rasterize the parchment background per-frame.** The CSS
  `background-image` with the SVG noise data-URL is fine — it computes once
  per repaint.
- ❌ **Do not use `scrollIntoView` in the modal.** Pan with `transform:
  translate()`.
- ❌ **Do not drop the keyboard handlers.** Esc closes. `0` fits. `+/-`
  zooms. Enter/Space on the snippet expands.

---

## How to verify

1. **Snippet parity.** Render `TrailMapSnippet` with `currentMileage = 580`
   (the snippet's hardcoded position — Ft. Kearny → Ft. Laramie leg) and
   visually diff against `src/trail-snippet.html`.
2. **Modal parity.** Open the modal and visually diff against the modal
   state of `src/trail-snippet.html` (click anywhere on the snippet to open).
3. **Wagon interpolation.** Slide `currentMileage` from 0 to 2000; the wagon
   glyph should follow the trail path smoothly with no jumps at landmark
   boundaries.
4. **Pan + zoom.** Wheel zooms around cursor. Drag pans. `0`/home fits.
   `+/-` zoom centered. Esc closes.
5. **Build clean.** No TypeScript errors, no Svelte warnings.

---

## When you're stuck

- `src/trail-snippet.html` is the source of truth for **visual layout, SVG
  paths, color values, and HUD copy.** Read the markup; don't guess.
- This file is the source of truth for **slot map, conventions, and what to
  ship vs. discard.**
- For game-state wiring (current mileage source, day count, store names) —
  ask the designer.
