# LANDMARK_ART_CLAUDE.md — Landmark Art Implementation Brief

> **Scope.** This is a feature-scoped brief for porting the 18 landmark art
> components into the SvelteKit codebase. It does **not** override repo-wide
> conventions. Read the repo root `CLAUDE.md` (and `.claude/` settings)
> first; defer to anything there if it contradicts this file.

---

You are landing the OT.IO **Landmark Art** in the SvelteKit codebase
`ericbond007/ot-revisited`. This file is your contract: read it before doing
anything, refer back to it as you work.

The handoff bundle (this folder) contains:
- `README.md` — bundle overview, slot map, status, design tokens
- `colors_and_type.css` — design tokens, ported verbatim from the target repo
- `Trail Atlas.html` — runnable preview of all 18 landmarks at thumbnail size
- `src/*-art.jsx` — **final** JSX source for the 18 landmark components
- `src/landmark-art-frame.jsx` — **final** JSX frame (chrome + palette)
- `src/svelte/` — partial Svelte port: tokens + frame + worked Chimney Rock
  + index dispatch

**Read `README.md` first.** This file tells you how to translate the JSX
into Svelte without losing fidelity.

---

## The repo at a glance

- **Framework:** SvelteKit 2, Svelte 5 (runes), TypeScript strict
- **Styling:** CSS variables in `src/lib/styles/theme.css` (mirror of
  `colors_and_type.css` here)
- **Existing UI:** `src/lib/ui/*.svelte` — `LandmarkModal.svelte`,
  `TrailMap.svelte`, `CampStage.svelte`, etc.
- **Landmark source of truth:** the `LANDMARKS` array used by
  `TrailMap.svelte`. Reuse it; do **not** duplicate.

---

## Slot map — where the new code goes

```
src/lib/ui/landmark-art/
├── LandmarkArt.svelte              ← public API; id → component dispatch
├── LandmarkArtFrame.svelte         ← shared chrome (paper, grain, vignette)
├── landmark-art-tokens.ts          ← LMK palette + viewport + LandmarkId
├── IndependenceArt.svelte
├── KansasRiverArt.svelte
├── BigBlueArt.svelte
├── FortKearnyArt.svelte
├── CourthouseJailArt.svelte
├── ChimneyRockArt.svelte
├── ScottsBluffArt.svelte
├── FortLaramieArt.svelte
├── IndependenceRockArt.svelte
├── DevilsGateArt.svelte
├── SouthPassArt.svelte
├── FortBridgerArt.svelte
├── SodaSpringsArt.svelte
├── FortHallArt.svelte
├── ThreeIslandArt.svelte
├── WhitmanMissionArt.svelte
├── TheDallesArt.svelte
└── BarlowRoadArt.svelte
```

Then surface it from `LandmarkModal.svelte`:

```svelte
<script lang="ts">
  import LandmarkArt from '$lib/ui/landmark-art/LandmarkArt.svelte';
  import type { LandmarkId } from '$lib/ui/landmark-art/landmark-art-tokens';

  let { landmark }: { landmark: { id: LandmarkId; ... } } = $props();
</script>

<header class="landmark-modal__art">
  <LandmarkArt id={landmark.id} />
</header>
```

---

## Build order

Work top-down through these in order. Don't skip ahead.

### 1. Drop in the done pieces

Land these three files verbatim from `src/svelte/`:

- `landmark-art-tokens.ts` — palette + viewport + `LandmarkId` type
- `LandmarkArtFrame.svelte` — shared chrome
- `ChimneyRockArt.svelte` — the worked port

Skim them, run the type-check, confirm they compile. **Don't tweak them**
yet — get the frame proven first.

### 2. Wire the index

Land `LandmarkArt.svelte` from `src/svelte/`. It imports all 18 art
components — temporarily comment out the imports for the ones you haven't
ported, leaving the dispatch and Chimney Rock live. The component should
now render Chimney Rock end-to-end inside the frame.

Mount it in a `/dev/landmark-art` route as a quick verification harness:

```svelte
<!-- src/routes/dev/landmark-art/+page.svelte -->
<div style="display:grid; gap:14px; grid-template-columns:repeat(3,1fr); padding:24px; background:#2a1a10;">
  {#each ALL_LANDMARK_IDS as id}
    <div style="aspect-ratio:16/7;"><LandmarkArt {id} /></div>
  {/each}
</div>
```

That route is your visual diff target — compare against `Trail Atlas.html`.

### 3. Port the other 17 — mechanically

For each remaining `src/<landmark>-art.jsx`, produce
`src/lib/ui/landmark-art/<Landmark>Art.svelte`. **Mechanical translation,
not redesign.** See § "Porting one landmark" below.

### 4. Wire `LandmarkArt` into `LandmarkModal.svelte`

Replace whatever placeholder image is currently in the modal header with
`<LandmarkArt id={landmark.id} />`. The frame is full-width by default; size
the parent (e.g. `aspect-ratio: 16 / 7`).

### 5. Optional: tooltip + camp backdrop

If the designer signs off, also wire:

- `TrailMapSnippet.svelte` hover tooltip — small thumbnail variant
- `CampStage.svelte` — full-bleed backdrop when camped at a fort

These are stretch — modal is the primary surface.

---

## Porting one landmark

Given `src/scotts-bluff-art.jsx`, produce
`src/lib/ui/landmark-art/ScottsBluffArt.svelte`. Follow these rules
**exactly** — Chimney Rock is the worked example.

### File header

Keep the historical research comment block from the JSX verbatim — that's
the design rationale and shouldn't be lost.

```svelte
<!--
  ScottsBluffArt.svelte — mile ~600, Mitchell Pass.
  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
  [paste the full historical comment block from the JSX]
-->
```

### Script block

```svelte
<script lang="ts">
  import { LMK, LMK_VIEW_W } from './landmark-art-tokens';

  // Local illustration constants — keep as hex literals.
  const stoneLight = '#...';
  const stoneMid   = '#...';
  // ...
</script>
```

### Markup block

The JSX returns a single `<g>...</g>`. Paste it as-is at the top level of
the Svelte file. **Do not wrap it** in another `<svg>` — `LandmarkArt.svelte`
mounts you inside the frame's SVG already.

Translation rules:

| JSX | Svelte |
|---|---|
| `strokeWidth="0.4"` | `stroke-width="0.4"` (hyphenated) |
| `fontFamily="..."` | `font-family="..."` |
| `textAnchor="middle"` | `text-anchor="middle"` |
| `pointerEvents="none"` | `pointer-events="none"` |
| `{LMK.ink}` | `{LMK.ink}` (unchanged) |
| `Array.from({ length: n }).map((_, i) => ...)` | `{#each Array(n) as _, i}...{/each}` |
| `[20,64,108].map((x,i) => ...)` | `{#each [20,64,108] as cx, i}...{/each}` |
| `i % 2 ? A : B` (in attr) | `{i % 2 ? A : B}` |
| `{` `/* comment */` `}` | `<!-- comment -->` |
| `&ldquo;` `&rdquo;` etc. | keep as-is in markup, they're valid HTML entities |

### Helper components inside the JSX

A few JSX files define helpers below the main component (e.g. `SmallWagon`
in `chimney-rock-art.jsx`). Inline them as Svelte snippets in the same
file — see `ChimneyRockArt.svelte` for the pattern. **Don't extract** them
to their own file unless multiple landmarks share them (currently: none do).

### `Object.assign(window, { ... })` at the end

Delete it. That's the JSX preview rig; Svelte's default export does the work.

### Verify

After porting each landmark:

1. Render it at `/dev/landmark-art` in the dispatch grid.
2. Compare side-by-side with the corresponding card in `Trail Atlas.html`.
3. Any pixel-level difference is a regression — fix the port, don't move on.

---

## Conventions to follow

- **Svelte 5 runes only.** `$state`, `$derived`, `$effect`, `$props`. No
  legacy reactivity.
- **TypeScript strict.** `LandmarkId` and `LandmarkTone` are exported from
  `landmark-art-tokens.ts`; use them. No `any`.
- **CSS variables for chrome, hex literals for illustration.** UI surfaces
  use tokens; landmark stone/water/foliage stays as hex constants in the
  component. Don't mix these.
- **No new fonts.** Captions use `IM Fell English` (italic serif) or
  `Special Elite` (mono). They're already in `theme.css`.
- **No external icon library.** Inline SVG only.
- **Match existing component file layout.** Look at `LandmarkModal.svelte`
  in the repo — header comment, `<script lang="ts">`, markup, `<style>` —
  and follow that exactly.
- **Don't break existing routes.** The art mounts inside the existing
  `LandmarkModal.svelte`; don't touch routing.

---

## Things to NOT do

- ❌ **Do not redesign any landmark.** The art is committed. Mechanical port
  only. If something looks off, the JSX original is canonical, not your
  intuition. Reproduce, don't reinterpret.
- ❌ **Do not introduce a separate `LandmarkId` registry.** Match the
  existing `LANDMARKS[].id` strings. If an id mismatch surfaces, fix the
  string in `landmark-art-tokens.ts` to match — never the other way.
- ❌ **Do not promote local hex constants to `LMK`.** Stone hues, water
  hues, foliage hues are deliberately per-landmark. Tokenizing them
  homogenizes the silhouettes.
- ❌ **Do not introduce new fonts or icon libraries.**
- ❌ **Do not extract caption `<text>` to `<figcaption>`.** It lives inside
  the SVG so it scales with the illustration. Pulling it out breaks the
  thumbnail use.
- ❌ **Do not drop the historical research comments.** That block at the top
  of each JSX file is design intent. Carry it across to the Svelte file
  verbatim.
- ❌ **Do not share a single filter id.** `<defs>` ids are SVG-document
  global. `LandmarkArt.svelte` already generates a per-instance suffix —
  don't undo that.
- ❌ **Do not rasterize the SVGs at port time.** They scale; let them scale.
  If perf bites at gallery scale, see `README.md` § "Open questions" for the
  options — but make that call after measuring, not preemptively.
- ❌ **Do not add CSS animations** to the art. The illustrations are
  static engravings.
- ❌ **Do not use `scrollIntoView`** — see repo `CLAUDE.md`.

---

## How to verify

1. **Frame parity.** `LandmarkArtFrame.svelte` should render identically to
   the JSX frame. Mount one of each at the same size and visual diff.
2. **Per-landmark parity.** Each Svelte port should be pixel-equivalent to
   its JSX counterpart in `Trail Atlas.html`.
3. **Atlas grid.** Mount all 18 in a 3-column grid (the `/dev/landmark-art`
   route from "Build order"). Verify silhouettes are distinct — Courthouse
   & Jail vs. Scotts Bluff, Independence Rock vs. South Pass, etc. The
   bundled `Trail Atlas.html` is the visual reference.
4. **Modal mount.** Open `LandmarkModal.svelte` for each landmark id; the
   header art should fill cleanly at the modal's aspect ratio.
5. **`abandoned` state.** Pass `abandoned` to Whitman Mission; the wrapper
   should desaturate and dim.
6. **Build clean.** `pnpm check` and `pnpm build` with no TS errors, no
   Svelte warnings. Watch specifically for unused-prop warnings on the JSX
   helpers — delete them rather than suppress.

---

## When you're stuck

- The 18 `src/*-art.jsx` files are the source of truth for **shape, color,
  proportion, and historical detail.** Read the path data; don't guess.
- `Trail Atlas.html` is the source of truth for **how the set should look
  together** at thumbnail scale.
- `src/svelte/ChimneyRockArt.svelte` is the source of truth for **how to
  port one landmark.**
- The `README.md` is the source of truth for **slot map, design tokens, and
  open questions.**
- This file is the source of truth for **conventions, build order, and the
  things-to-not-do list.**
- For anything else — game-state wiring, abandoned-state expansions, new
  landmarks — ask the designer. Don't guess.
