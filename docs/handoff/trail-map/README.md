# Handoff — OT.IO Trail Map

The trail map is the player's spatial dashboard: where they are, what they
just passed, what's coming up, and how far to the next decision point. This
bundle hands off three explorations of how to render it, plus a polished
parchment "snippet" design that's the closest to ship-ready.

The bundle is a sibling to the **travel scene** handoff — that one is the
animated side-scrolling stage you watch while traveling; this one is the
strategic map you consult between legs.

---

## What's in this bundle

```
design_handoff_trail_map/
├── README.md                     ← you are here
├── TRAIL_MAP_CLAUDE.md           ← agent-facing brief: slot map, conventions, do/don't
├── colors_and_type.css           ← design tokens (ported from theme.css)
└── src/
    ├── trail-snippet.html        ← FINAL.  Parchment map w/ HUD, click-to-expand modal, pan + zoom
    ├── TrailMapClassic.jsx       ← Variant 1: parchment strip, dashed trail, emoji dots
    ├── TrailMapTerrain.jsx       ← Variant 2: SVG bird's-eye view w/ biome bands, lookahead window
    └── TrailMapHandDrawn.jsx     ← Variant 3: full-territory pen-and-ink map
```

---

## What's recommended to ship

**`trail-snippet.html` is the design to build.** The three variants in
`src/*.jsx` are the exploration history that led there — keep them around as
reference, but the snippet is the converged design.

| Piece | File | Status | Notes |
|---|---|---|---|
| **Parchment trail snippet** | `src/trail-snippet.html` | **Final** | Default zoomed-in 350-mi window with HUD, compass, scale bar, legend, expand button. Click → fullscreen modal w/ pan + zoom of the whole 2,170-mi trail. Drag to pan, scroll/+/− to zoom, Esc to close. |
| Classic variant | `src/TrailMapClassic.jsx` | Reference | Closest to the existing `TrailMap.svelte` in the repo — flat parchment strip with dashed trail and emoji landmark dots. |
| Terrain variant | `src/TrailMapTerrain.jsx` | Reference | Diegetic biome view with paper grain + contour lines. Useful if the team wants more terrain affordance. |
| Hand-drawn variant | `src/TrailMapHandDrawn.jsx` | Reference | Full-territory ink-and-paper map with sketched mountains, hatched water, cartouche. |

---

## How the snippet is composed

Single `<div class="trailmap">` with absolutely-positioned chrome over a full-bleed `<svg>`.

**Layers, back to front:**

1. **Parchment background** — layered CSS background:
   - SVG fractal-noise grain (`feTurbulence`)
   - Two `radial-gradient` age-stains (top-left amber, bottom-right umber)
   - Inset box-shadow for vignette
2. **SVG body** (`viewBox="480 130 420 270"` for the zoomed window) containing:
   - Stipple texture (tiny ochre dots)
   - Prairie tufts (small grass arcs)
   - Ridge ticks (denser in the west)
   - Caret-peak buttes
   - Sand-dune curves (denser through the historical Sand Hills)
   - Cottonwood/scrub Y-shapes
   - Two meandering rivers (Platte / N. Platte) with gradient strokes
   - The trail itself: solid orange-rust east of wagon, dashed brown west of wagon
   - Landmarks with leader lines up to a label band
3. **HUD chrome** (absolute-positioned `<div>` over the SVG):
   - **Top-left HUD** — leg name + day count
   - **Top-center compass** — N/S/E/W rose
   - **Top-right HUD** — distance to next landmark + next fort
   - **Bottom-left scale badge + legend**
   - **Bottom-right expand button** — opens the modal

**Modal:**
A fixed full-screen overlay with a titlebar, zoom controls, zoom readout, and pan-hint pill. The modal map renders the full trail (Independence MO → Oregon City OR, ~2,170 mi) on a 1000×380 viewBox. Pan via drag, zoom via wheel/+/−/buttons, fit via the home button or `0` key, close via Esc or the X.

---

## Design tokens

`colors_and_type.css` mirrors `src/lib/styles/theme.css` in the repo.

**Trail map specifically uses:**

| Variable | Hex | Used for |
|---|---|---|
| `#e8d9b8` | parchment base (`background-color` of `.trailmap`) |
| `#3a1a08` | ink lines, landmark fills, all primary strokes |
| `#5a3a1a` | secondary strokes, parchment border |
| `#c96a2a` | rust (traveled trail, HUD accent border, "you are here" pulse) |
| `#f5e6c8` | wagon canopy, HUD body text |
| `#2f5a8a` | river stroke (gradient bottom) |
| `#6a98c4` | river stroke (gradient top) |
| `#8a5a2a` | scrub/dune strokes, italic territory labels |
| `#c9b89a` | butte / caret-peak fills |

Don't introduce new hues. The map's whole vocabulary is parchment + rust + ink + river-blue.

**Typography:**

- **HUD body**: `'Special Elite', 'Courier New', monospace` (the typewriter face, from `--f-mono`)
- **In-map landmark labels**: `'Special Elite', monospace`, uppercase, `letter-spacing: 0.08em`
- **Italic in-map labels** (rivers, "passed · day 32"): `Georgia, serif italic`
- **Compass cardinals**: `'Rye', Georgia, serif`
- **Modal titlebar**: `'Special Elite', monospace`, uppercase, `letter-spacing: 0.1em`

---

## How the wagon position is wired

In the prototype, the wagon is hard-coded to `(700, 270)` in the snippet's
zoomed viewBox and `(700, 260)` in the modal's full-trail viewBox. In the
target codebase:

- The repo already has a `LANDMARKS` array (32 entries from Independence to
  Oregon City) used by `TrailMap.svelte`. Reuse it — don't duplicate the
  list. The snippet's currently-hardcoded "Ft. Kearny → Ft. Laramie" leg
  should be derived from `currentMileage` against this array, like
  `TrailMapClassic.jsx` already does.
- The wagon's position on the SVG path comes from interpolating between the
  last-passed landmark and the next-upcoming landmark by mileage.
- The HUD's "next landmark · 130 mi" string is computed from the same
  interpolation.

---

## Open questions / known issues

1. **Snippet vs. inline map.** `TrailMap.svelte` in the repo is a fixed
   non-modal strip. The proposed snippet design changes that to a
   click-to-expand pattern. Confirm with the designer whether to replace
   `TrailMap.svelte` outright or add a new `TrailMapSnippet.svelte` that
   coexists.

2. **Modal dependency.** The fullscreen modal includes pan + zoom logic
   (~80 lines of JS in the prototype). In the target codebase, decide
   whether to:
   - Port that JS verbatim into the new component, or
   - Use an existing modal/dialog primitive if the repo has one
   - Use `panzoom` / similar (the repo currently has no such dep — adding
     one is a decision)

3. **The three variants are NOT to be shipped as toggleable map styles.**
   They were exploration. The snippet is the answer.

4. **Map performance.** The snippet's parchment background SVG noise pattern
   re-renders on every paint. If the map is mounted in a high-frequency
   updating screen, consider rasterizing the noise to a stable PNG.

---

## Next steps for the implementer

See `TRAIL_MAP_CLAUDE.md` for the focused build plan. In short:

1. Decide on snippet-replaces-existing vs. new-component-alongside.
2. Port the snippet to `src/lib/ui/TrailMapSnippet.svelte` (or update
   `TrailMap.svelte` in place).
3. Wire to the existing `LANDMARKS` array + `currentMileage` store.
4. Decide on modal pattern and port the pan/zoom logic.
5. Verify against the bundled `trail-snippet.html` visually.
