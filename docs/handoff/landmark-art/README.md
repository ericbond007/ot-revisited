# Handoff — OT.IO Landmark Art

When the player reaches a major trail landmark — Chimney Rock, Fort Laramie,
South Pass — the game pops a **Landmark Modal**: a research-grounded
illustration of the place, with a short historical blurb and the
arrive/leave choices. This bundle delivers the **art half** of that modal,
plus the assets needed to reuse the same illustrations as map-tooltip
thumbnails and as backdrops in `CampStage.svelte`.

It's a sibling to the **trail map** and **travel scene** handoffs.

---

## What's in this bundle

```
design_handoff_landmark_art/
├── README.md                           ← you are here
├── LANDMARK_ART_CLAUDE.md              ← agent-facing brief: porting checklist, do/don't
├── colors_and_type.css                 ← design tokens (mirror of theme.css)
├── Trail Atlas.html                    ← runnable preview — all 18 landmarks at thumbnail size
└── src/
    ├── landmark-art-frame.jsx          ← shared chrome (paper grain, vignette, palette)
    ├── independence-art.jsx            ← Mile 0   · Independence, MO
    ├── kansas-river-art.jsx            ← Mile 100 · Kansas River ferry
    ├── big-blue-art.jsx                ← Mile 150 · Big Blue caulked-wagon ford
    ├── fort-kearny-art.jsx             ← Mile 300 · Fort Kearny (sod-roofed army post)
    ├── courthouse-jail-art.jsx         ← Mile 540 · Courthouse & Jail Rocks
    ├── chimney-rock-art.jsx            ← Mile 560 · Chimney Rock spire
    ├── scotts-bluff-art.jsx            ← Mile 600 · Scotts Bluff / Mitchell Pass
    ├── fort-laramie-art.jsx            ← Mile 640 · Fort Laramie (Old Bedlam)
    ├── independence-rock-art.jsx       ← Mile 815 · Independence Rock dome
    ├── devils-gate-art.jsx             ← Mile 820 · Devil's Gate cleft
    ├── south-pass-art.jsx              ← Mile 915 · South Pass — Continental Divide
    ├── fort-bridger-art.jsx            ← Mile 1070 · Fort Bridger log stockade
    ├── soda-springs-art.jsx            ← Mile 1180 · Soda Springs mineral cones
    ├── fort-hall-art.jsx               ← Mile 1290 · Fort Hall (HBC, Union Jack)
    ├── three-island-art.jsx            ← Mile 1430 · Three Island Crossing of the Snake
    ├── whitman-mission-art.jsx         ← Mile 1640 · Whitman Mission (Waiilatpu)
    ├── the-dalles-art.jsx              ← Mile 1850 · The Dalles · Columbia gorge
    ├── barlow-road-art.jsx             ← Mile 1900 · Barlow Road · Laurel Hill / Mt. Hood
    └── svelte/
        ├── landmark-art-tokens.ts      ← LMK palette + viewport constants + LandmarkId type
        ├── LandmarkArtFrame.svelte     ← shared chrome — done, drop-in
        ├── ChimneyRockArt.svelte       ← worked port — pattern for the other 17
        └── LandmarkArt.svelte          ← index component — id → component dispatch
```

---

## What's done vs. what's left

| Piece | Status | Notes |
|---|---|---|
| **18 JSX landmark components** | ✅ Final | Shipped artwork. Each is a single `<g>` of pure SVG, mostly `<path>` with a few helpers. Don't redesign — port. |
| `landmark-art-frame.jsx` | ✅ Final | The frame chrome: paper grain `<feTurbulence>`, watercolor bleed, sun glow, vignette, period palette `LMK`. |
| `Trail Atlas.html` | ✅ Final | Runs all 18 components at thumbnail size in journey order. Use this as the visual diff target after the Svelte port. |
| `LandmarkArtFrame.svelte` | ✅ Final | Direct port of the JSX frame. Drop-in. |
| `landmark-art-tokens.ts` | ✅ Final | `LMK` palette + viewport + `LandmarkId` union — single source of truth. |
| `LandmarkArt.svelte` | ✅ Final (index) | id → art-component dispatch. Imports all 18; you'll wire the rest as you port. |
| `ChimneyRockArt.svelte` | ✅ Worked port | Pattern for the other 17 — read this side-by-side with the JSX original. |
| Other 17 `*.svelte` ports | ❌ TODO | Mechanical work. Follow the porting rules in `LANDMARK_ART_CLAUDE.md`. |

---

## Where this mounts in the repo

```
src/lib/ui/landmark-art/
├── LandmarkArt.svelte             ← the public API
├── LandmarkArtFrame.svelte
├── landmark-art-tokens.ts
├── ChimneyRockArt.svelte
├── FortLaramieArt.svelte
├── ...                             ← one per landmark
```

Then in the app:

```svelte
<!-- LandmarkModal.svelte (existing, header art panel) -->
<div class="art">
  <LandmarkArt id={landmark.id} />
</div>

<!-- WhitmanMission, post-massacre state -->
<LandmarkArt id="whitman-mission" abandoned />

<!-- TrailMapSnippet.svelte tooltip -->
<div class="thumb"><LandmarkArt id={hovered.id} /></div>
```

The `id` prop matches the canonical landmark id in the existing `LANDMARKS`
array used by `TrailMap.svelte`. **Don't duplicate that array.** If a
landmark is missing an id, add it to `LANDMARKS` first; never invent a new
list here.

---

## How a landmark component is structured

Every `*-art.jsx` follows the same shape:

```jsx
function ChimneyRockArt() {
  // 1. Local illustration constants — stone/water/foliage hues that aren't
  //    in the shared LMK palette. Stay as hex literals; don't tokenize.
  const stoneLight = "#d4c098";
  const stoneMid   = "#b89a72";

  return (
    <g>
      {/* 2. Distant context — ridges, river, atmospheric perspective */}
      <path d="M 0 100 Q 60 96 ..." fill={LMK.sage} opacity="0.4" />

      {/* 3. The HERO — the named formation. Centered around x ≈ 240. */}
      <g> ... </g>

      {/* 4. Foreground — sage clumps, trail ruts, scale-reference figures */}
      <g> ... </g>

      {/* 5. Italic caption — part of the engraving, not chrome */}
      <text x="240" y="194" ...>Chimney Rock — &ldquo;a grand and splendid object&rdquo;</text>
    </g>
  );
}
```

The frame component (`LandmarkArtFrame`) supplies everything outside the
hero — paper background, sky band, sun glow, grain, vignette. Each landmark
just paints its own foreground.

---

## Design tokens

Two layers of color, kept separate on purpose:

| Layer | Where defined | What's in it | When to add to it |
|---|---|---|---|
| **UI tokens** | `colors_and_type.css` (= `theme.css`) | parchment, ink, rust, panel chrome, status colors | Only when a UI surface needs a new color. Coordinate with the trail-map / travel-scene handoffs. |
| **Illustration palette** | `LMK` in `landmark-art-tokens.ts` | period palette: parchment, ink, earth, sage, water, rust, brick, redFlag | When two or more landmarks need the same hue. Single-landmark hues stay as local hex constants. |

**Don't promote local stone/water/foliage hex constants to `LMK`.** They're
specific to one landmark by design; tokenizing them blurs the silhouettes.

---

## Typography

All in-engraving captions use one of two faces:

- **Italic serif** — `IM Fell English, Georgia, serif` for descriptive
  pull-quotes ("a grand and splendid object")
- **Small caps mono** — `Special Elite, monospace` for label tags
  (mile markers, "Sweetwater R.")

These match `--f-body` and `--f-mono` in the theme. **Don't introduce new
fonts.** All caption text lives inside the SVG so it scales with the
illustration; don't move it to `<figcaption>`.

---

## Open questions / known issues

1. **Filter id collisions.** The frame's `<defs>` filters (`-grain`,
   `-vignette`, `-sunglow`) need a unique id per mounted instance — SVG
   `<defs>` are global. `LandmarkArt.svelte` generates a per-instance random
   suffix. Confirm the codebase doesn't already have a hash-id helper to
   reuse.

2. **Performance on the map.** `<feTurbulence>` is expensive. Mounting 18
   thumbnails simultaneously (e.g. an "all landmarks" gallery) would be
   noticeable. Three options if it bites:
   - Cache: rasterize each art at 480×200 to a stable PNG via a build step.
   - Trim: drop the grain filter at thumbnail size (only mount it at
     modal/full size).
   - Defer: only mount the visible landmarks within the map's lookahead
     window.

3. **Abandoned state.** Currently a CSS `filter: saturate(0.35)
   brightness(0.92)` on the wrapper. Adequate for Whitman Mission post-1847.
   If more landmark states are needed (winter, burned, flooded), redesign
   per landmark — don't bolt on more wrapper filters.

4. **`birdseye` → modal art.** The trail map's hover thumbnail uses the same
   component at smaller scale. The art was designed to read at thumbnail
   size; the `Trail Atlas.html` preview verifies that. If anyone asks for a
   "more detailed" version at modal size, push back — the current art is
   intentionally legible at all scales.

---

## Next steps for the implementer

See `LANDMARK_ART_CLAUDE.md` for the focused build plan. In short:

1. Land `LandmarkArtFrame.svelte` + `landmark-art-tokens.ts` + the
   `ChimneyRockArt.svelte` worked port verbatim.
2. Mechanically port the other 17 `*.svelte` files using Chimney Rock as the
   pattern (see `LANDMARK_ART_CLAUDE.md` § "Porting one landmark").
3. Wire `LandmarkArt.svelte` into `LandmarkModal.svelte` first; that's the
   primary surface.
4. Visual diff every component against the bundled `Trail Atlas.html` —
   side-by-side at the same size. Any divergence is a regression.
5. Confirm tooltip + camp-stage uses with the designer before wiring.
