# Handoff — OT.IO Travel Scene

A side-scrolling, fully procedural travel scene for the OT.IO Oregon-Trail-style
game. The wagon and ox team move west across one of five biomes; terrain,
weather, time-of-day, wagon model, team size & species, wagon health, and
playback speed are all live-toggleable.

Everything is **inline SVG** — no raster art, no sprite sheets — drawn in a
"dusty 32-bit western engraving" idiom that matches the rest of the OT.IO
design system.

This bundle hands the work off to Claude Code (or any developer) so it can
land in the target SvelteKit codebase (`ericbond007/ot-revisited`).

---

## What's in this bundle

```
design_handoff_travel_scene/
├── README.md              ← you are here
├── TRAVEL_SCENE_CLAUDE.md  ← agent-facing brief: conventions, slot map, do/don't (scoped — does NOT override repo root CLAUDE.md)
├── colors_and_type.css    ← design tokens, verbatim from the target repo
├── Wagon Showcase.html    ← runnable preview of the 3 wagon models + addons
└── src/
    ├── wagon-svg.jsx      ← FINAL.  3 wagon models + addons + damage system
    ├── terrain-bg.jsx     ← DRAFT.  Sky gradient + 3 parallax bands × 5 biomes
    ├── weather-sky.jsx    ← DRAFT.  Sun/moon, clouds, rain, snow, lightning, vignette
    └── landmarks.jsx      ← DRAFT.  Chimney Rock, Courthouse Rock, forts, etc.
```

There is **no composed travel-scene.jsx** in this bundle. The prototype
composition was stashed during a redesign of the ox team illustration — that
work is paused. The components above are the source of truth for the visual
vocabulary; composing them into a finished scene is part of the next phase.

---

## Status of each piece

| Piece | File | Status | Notes |
|---|---|---|---|
| Wagon models | `src/wagon-svg.jsx` | **Final** | 3 models (Light, Prairie Schooner, Heavy Freighter), 5-step health-driven damage system, addons (driver, water keg, chicken coop). Verified by `Wagon Showcase.html`. |
| Terrain backgrounds | `src/terrain-bg.jsx` | **Draft** | All 5 biomes drawn (prairie, mountains, forest, desert, river); 3 parallax bands each + ground gradient + sky gradient. Not yet composed in a scene. |
| Sky / weather overlays | `src/weather-sky.jsx` | **Draft** | Sun, moon, clouds, rain, snow, lightning flash, storm vignette. Composable; needs a host scene. |
| Distant landmarks | `src/landmarks.jsx` | **Draft** | Chimney Rock, Courthouse Rock, Scotts Bluff, Independence Rock, generic Fort, Mountain Pass, Ferry Post, Tree Clump, Valley Arch. |
| **Ox / mule team** | — | **Not in this bundle** | An earlier draft is stashed under `scrap/_stashed_ox-team.jsx` in the parent project. The designer chose not to ship it; redo from a clean reference photo. |
| Travel scene composition | — | **Not built** | Stage layout, animation tick, parallax wiring, controls panel — not done. `TRAVEL_SCENE_CLAUDE.md` walks through what to build. |

---

## How the visual layers stack

The scene is a single `<svg viewBox="0 0 1280 720">` (16:9). Layer order, back
to front:

1. **Sky** — `<rect>` filled with a per-(biome, time) `<linearGradient>` from `terrain-bg.jsx`
2. **Sun / moon** — `SkyAccent` from `weather-sky.jsx`
3. **Clouds** — `CloudLayer` (density keyed off weather)
4. **Far parallax** — `FarLayer` from `terrain-bg.jsx` — distant silhouettes, scrolls ~0.05x
5. **Landmarks** — components from `landmarks.jsx`, scroll ~0.15x
6. **Mid parallax** — `MidLayer` — closer hills/trees/banks, scroll ~0.4x
7. **Ground band** — `GroundBand` — solid gradient fill from `GROUND_Y` (540) down
8. **Near parallax** — `NearLayer` — grass tufts, cacti, scrub, scroll ~1.0x
9. **Wagon + ox team** — placed at `wagonX = 920`, `groundY = 540`, drawn at `sceneScale = 4.0`
10. **Weather overlays** — rain, snow, lightning, vignette from `weather-sky.jsx`
11. **Time-of-day wash** — semi-transparent `<rect>` over the whole stage (`#0a0a20 @ 0.45` for night, `#d86a30 @ 0.10` for dawn/dusk)

Constants:
- `HORIZON_Y = 380`
- `GROUND_Y = 540`
- Wagon position: `wagonX = 920`, drawn at `sceneScale = 4.0`
- Ox team origin: ~6 units left of wagon tongue tip; the wagon tongue terminates at `x ≈ -29` in wagon-local units.

---

## How the components are exposed

The JSX files are CDN-React/Babel prototypes. Each ends with
`Object.assign(window, { ... })` to expose its components globally. **You will
NOT keep this pattern.** In the target codebase, port them to the framework's
native module system (Svelte components with `<script>` + named exports, or
React modules with `export function`).

What each file exports:

- `wagon-svg.jsx` → `WAGON_MODELS`, `LightWagon`, `PrairieSchooner`,
  `HeavyFreighter`, `Driver`, `WaterKeg`, `ChickenCoop`,
  `HistoricalWheel`, `PlankBed`, `CanvasTop`
- `terrain-bg.jsx` → `SkyGradient`, `FarLayer`, `MidLayer`, `NearLayer`,
  `GroundBand`, `SKY`, `GROUND_FILL`
- `weather-sky.jsx` → `SkyAccent`, `CloudLayer`, `CloudPuff`, `RainOverlay`,
  `SnowOverlay`, `LightningFlash`, `StormVignette`
- `landmarks.jsx` → `ChimneyRock`, `CourthouseRock`, `ScottsBluff`,
  `IndependenceRock`, `Fort`, `MountainPass`, `FerryPost`, `TreeClump`,
  `ValleyArch`

---

## Animation model

A single `useTick()` hook drives all motion via `requestAnimationFrame`,
exposing seconds-elapsed since mount. Everything else is derived from `t`:

- `tEff = paused ? 0 : t`  — frozen when paused
- `scrollX = tEff * scrollSpeed`  — drives all parallax + wheel rotation
- `gaitPhase = (tEff * 1.6) % 1`  — 1.6 Hz step cycle
- `bounce = Math.sin(tEff * 4) * 0.5`  — overall scene bounce

**Stopped state** — pass `gait="stopped"` to `OxTeam` to render a
resting team (camp, fort, river-crossing wait). Animals stand planted,
no body bob; `gaitPhase` is ignored. Wagon should also be passed
`bounce={0}` and a static wheel angle to match.

**No CSS animations. No `setInterval`s. No spring physics.** All motion is
SVG attributes recomputed each frame. The whole scene pauses by holding `t`.

---

## Design tokens

`colors_and_type.css` is the canonical token set, ported verbatim from the
target repo's `src/lib/styles/theme.css`. Use these CSS variables for **chrome**
(controls panel, frame, eyebrow labels, body text).

| Variable | Hex | Used for |
|---|---|---|
| `--c-bg` | `#1a0f08` | Page background outside the stage |
| `--c-border` | `#5a3a1a` | Stage frame, panel borders |
| `--c-panel` | `#3d2817` | Pill buttons (rest), control panel surfaces |
| `--c-rust` | `#c96a2a` | Active state, hardware highlights |
| `--c-tan` | `#e8c89a` | Body text in controls |
| `--c-tan-bright` | `#f5e6c8` | Selected pill text |

The wagon SVGs themselves use a separate, more saturated palette for
**fauna/wood/canvas** — these are local `const`s at the top of each file
(e.g. `W_WOOD = "#8a5a2a"`, `W_CANVAS = "#f5e6c8"`). Keep that separation:
illustration colors are not UI tokens.

**Typography in chrome:**
- Body: `'IM Fell English', serif` (from `--f-body`)
- Eyebrow labels: 11px, `letter-spacing: 0.06em`, color `#a88858`, uppercase

---

## Open questions / known issues

1. **Ox team must be redrawn.** The stashed draft (`scrap/_stashed_ox-team.jsx`
   in the parent project) had proportion problems the designer wasn't happy
   with. Plan a new pass against a fresh reference photo.

2. **Yoke/chain alignment is geometry-sensitive.** Both wagon and ox team
   render at `sceneScale = 4.0` in their own native coordinate systems and
   are positioned in the parent SVG so the wagon's tongue tip aligns with the
   rightmost yoke's chain ring. If you change `sceneScale` or move the wagon,
   recompute the team `anchorX` in lockstep.

3. **No persistence.** The prototype's controls reset on reload. In production
   these values are derived from game state (party, inventory, world stores) —
   they are *outputs* of game state, not user-set sliders. The control panel
   in the prototype is a designer's debug rig; hide or remove it in shipping
   builds.

4. **Babel-in-browser is not for production.** The prototype's
   `<script type="text/babel">` runtime transpilation is purely for design
   iteration. In the target codebase, ship through the existing build
   pipeline.

5. **Wagon health → damage mapping is committed.** `healthToDamage(health)`
   in `wagon-svg.jsx` returns `{ canvas, planks, wheels }` levels keyed off
   `health ∈ [0, 100]`. Five canvas states (pristine/patch/tear/big-rip/
   shredded), four plank states, four wheel states. Use this verbatim.

---

## Next steps for the implementer

See `TRAVEL_SCENE_CLAUDE.md` for a focused build plan. In short:

1. Port `wagon-svg.jsx` to the target framework idiom (Svelte components in
   `src/lib/ui/wagon/`). Faithful translation, no rework.
2. Port `terrain-bg.jsx`, `weather-sky.jsx`, `landmarks.jsx` similarly.
3. Build the new ox/mule team component from scratch against a clean reference.
4. Compose them in `WagonScene.svelte`, driven by an animation tick.
5. Wire the controls (terrain, weather, time, wagon model, team, health,
   speed, play/pause) to the existing game-state stores.
