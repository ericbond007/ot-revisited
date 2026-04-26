# TRAVEL_SCENE_CLAUDE.md — Travel Scene Implementation Brief

> **Scope.** This is a feature-scoped brief for the travel scene work only.
> It does **not** override repo-wide conventions. Read the repo root
> `CLAUDE.md` (and `.claude/` settings) first; defer to anything there if it
> contradicts this file. This brief expects to be read alongside, not
> instead of, the repo's standing rules.

---

You are landing the OT.IO **Travel Scene** in the SvelteKit codebase
`ericbond007/ot-revisited`. This file is your contract: read it before doing
anything, refer back to it as you work.

The handoff bundle (this folder) contains:
- `README.md` — bundle overview, layer stack, animation model, status
- `colors_and_type.css` — design tokens, ported verbatim from the target repo
- `Wagon Showcase.html` — runnable preview of the 3 wagon models + addons
- `src/wagon-svg.jsx` — **final** wagon SVG components (the only "done" piece)
- `src/terrain-bg.jsx`, `weather-sky.jsx`, `landmarks.jsx` — draft components
  for the parallax / weather / landmark layers

**Read those first.** This file tells you how to translate them into the repo.

---

## The repo at a glance

- **Framework:** SvelteKit 2, Svelte 5 (runes), TypeScript
- **DB:** Drizzle + SQLite (irrelevant to this work — scene is pure UI)
- **Styling:** CSS variables in `src/lib/styles/theme.css` (mirror of
  `colors_and_type.css` here)
- **Existing UI:** `src/lib/ui/*.svelte` — TrailMap, ActionBar, EventModal,
  CampStage, PartyPanel, InventoryPanel, etc. (~31 files)
- **Routes:** `/` (landing), `/new` (party), `/outfit` (outfit), `/play`
  (game), `/load` (load)

---

## Slot map — where the new code goes

```
src/lib/ui/wagon/
├── WagonScene.svelte             ← NEW.  The composed scene (top-level)
├── wagon-svg/
│   ├── LightWagon.svelte         ← from src/wagon-svg.jsx
│   ├── PrairieSchooner.svelte    ← from src/wagon-svg.jsx
│   ├── HeavyFreighter.svelte     ← from src/wagon-svg.jsx
│   ├── WagonAddons.svelte        ← Driver + WaterKeg + ChickenCoop
│   └── wagon-helpers.ts          ← HistoricalWheel, PlankBed, CanvasTop, healthToDamage
├── terrain/
│   ├── SkyGradient.svelte        ← from src/terrain-bg.jsx
│   ├── ParallaxBands.svelte      ← FarLayer + MidLayer + NearLayer + GroundBand
│   └── terrain-tokens.ts         ← SKY, GROUND_FILL color tables
├── weather/
│   ├── SkyAccent.svelte          ← sun/moon
│   ├── CloudLayer.svelte
│   ├── PrecipOverlays.svelte     ← Rain + Snow + Lightning
│   └── StormVignette.svelte
├── landmarks/
│   ├── ChimneyRock.svelte        ← (and one file per landmark from src/landmarks.jsx)
│   ├── ...
│   └── LandmarkLayer.svelte      ← chooses which to render based on world position
└── ox-team/
    └── OxTeam.svelte             ← BUILD FROM SCRATCH (see "Ox team" below)
```

`/play` mounts `<WagonScene>` somewhere above `<TrailMap>` (or as a
toggleable view alongside it — confirm with the designer).

---

## Build order

Work top-down through these in order. Don't skip ahead.

### 1. Wagons (port `src/wagon-svg.jsx` → `src/lib/ui/wagon/wagon-svg/`)

Faithful translation. Don't redesign anything.

- `HistoricalWheel`, `PlankBed`, `CanvasTop` are pure SVG primitives — make
  them `.ts` helpers that return Svelte snippets, OR small Svelte components.
  Either is fine; pick whichever the existing codebase prefers.
- `LightWagon`, `PrairieSchooner`, `HeavyFreighter` — one Svelte file each.
  Same props (`angle`, `bounce`, `health`, `addons`).
- `Driver`, `WaterKeg`, `ChickenCoop` go in `WagonAddons.svelte`.
- `healthToDamage(health)` is critical and is committed visual logic — port
  verbatim. **Do not reinterpret the damage thresholds.**
- The local SVG palette (`W_WOOD`, `W_CANVAS`, etc. at the top of
  `wagon-svg.jsx`) stays as illustration constants. **Do NOT** turn them into
  CSS variables — they're not UI tokens.

Verify by recreating `Wagon Showcase.html` as a `/dev/wagons` route in the app
and visually diffing against the bundled HTML preview.

### 2. Terrain backgrounds

Port `src/terrain-bg.jsx`. The five biomes are `prairie | mountains | forest |
desert | river`. Each has three parallax layers (Far, Mid, Near) plus a
ground gradient and a sky gradient.

- `SKY` and `GROUND_FILL` are color tables (biome → time → stops). Move them
  to `terrain-tokens.ts`.
- `FarLayer`, `MidLayer`, `NearLayer` self-tile by `(scrollX % layerWidth)`.
  Don't add CSS animations — they take a `scrollX` prop and that's it.

### 3. Weather + sky

Port `src/weather-sky.jsx`.

- `SkyAccent({ kind, x, y, t })` — `kind ∈ { 'sunny', 'partly', 'cloudy',
  'rainy', 'snowy', 'night' }`. `night` renders moon; everything else
  renders sun with weather-appropriate halo.
- `CloudLayer` density: `sunny` ≈ 0, `partly` ≈ 3, `cloudy` ≈ 8, `rainy` /
  `snowy` ≈ 12.
- `LightningFlash` triggers periodically off `t`; only used when
  `weather === 'rainy'`.

### 4. Landmarks

Port `src/landmarks.jsx`. One Svelte file per landmark. `LandmarkLayer`
selects which landmark(s) to render based on world position — wire this to
the existing `LANDMARKS` array used by `TrailMap.svelte`.

### 5. Ox team — BUILD FROM SCRATCH

There's no ox team in this bundle. The previous draft was stashed (designer
wasn't happy with proportions). Build a new one against a fresh reference
photo. Constraints:

- Profile view, facing left.
- Working-ox proportions (no zebu hump). Slight shoulder ridge OK.
- Pied red-and-white pattern (`#8a3a18` red, `#efe4c8` white).
- Yoked in pairs; chain to wagon tongue.
- Mule variant: slimmer, single grey-brown tone, harness collar, no yoke.
- Walk cycle: diagonal pairs alternate via `Math.sin(legPhase * 2π)`.
- Coordinate system: origin between hooves on ground, y-positive down,
  spine at `y = -8` to `-9`, length ~17 units, leg length ~5.
- `OxTeam` props: `count` (1–6), `isMule`, `gaitPhase` (0–1), `anchorX`,
  `wagonHookX`, `y`.
- Pair spacing: `PAIR_SPACE = 22`. Phase offset between pairs: `+0.13`.
- Drawn at `sceneScale = 4.0` to match the wagon.

The wagon tongue terminates at `x ≈ -29` in wagon-local units; the rightmost
yoke's chain ring should sit ~6 units left of that point in ox-local
coordinates after the team's `anchorX` is applied.

### 6. Compose `WagonScene.svelte`

Single `<svg viewBox="0 0 1280 720">`. Layer order is in `README.md` — follow
it exactly. One animation tick using Svelte 5 `$state` + `requestAnimationFrame`,
exposing `t` in seconds. All motion derives from `t`:

```ts
const tEff = $derived(paused ? 0 : t);
const scrollX = $derived(tEff * scrollSpeed);
const gaitPhase = $derived((tEff * 1.6) % 1);
const bounce = $derived(Math.sin(tEff * 4) * 0.5);
```

No CSS animations. No `setInterval`s. The entire scene pauses by holding `t`.

### 7. Wire to game state

The prototype controls are a debug rig. In production:

- `terrain`, `weather`, `time` come from the world / day state.
- `wagonModel`, `health`, `oxenCount`, `isMule` come from the inventory store.
- `scrollSpeed` is derived from pace / fatigue / terrain modifiers.
- `paused` is a UI concern only.

Confirm the exact stores with the designer before wiring. Hide the debug
controls behind a `?debug=1` query param or a dev-only flag.

---

## Conventions to follow

- **Svelte 5 runes only.** `$state`, `$derived`, `$effect`. No legacy
  `let x =` reactivity.
- **TypeScript strict.** No `any`. Type all component props with `interface
  Props { ... }` and use `let { ... }: Props = $props()`.
- **CSS variables for chrome, hex literals for illustration.** UI panels,
  pills, eyebrow labels: tokens. Wagon wood, canvas, ox hide: hex constants
  defined alongside the component. Don't mix these.
- **No external icon library.** If you need a glyph, draw it inline in SVG.
  The codebase uses emoji as provisional placeholders for game concepts —
  don't add Lucide/Heroicons.
- **No new fonts.** Use `--f-body` (IM Fell English), `--f-mono` (Special
  Elite), or `--f-display` (Rye) only.
- **Match existing component file layout.** Look at how `TrailMap.svelte`
  and `CampStage.svelte` are structured — header comment, `<script lang="ts">`,
  markup, `<style>` block — and follow that exactly.
- **Don't break existing routes.** The travel scene mounts in `/play`; don't
  touch `/new`, `/outfit`, `/load`, or the landing page.

---

## Things to NOT do

- ❌ **Do not reuse the stashed ox draft.** It's stashed for a reason.
- ❌ **Do not add CSS animations** to the parallax, wagon bounce, or ox gait.
  Everything ticks off `t`.
- ❌ **Do not wire `setInterval` or `setTimeout`** for animation. `requestAnimationFrame`
  in one place, period.
- ❌ **Do not introduce new color hues.** Wood / rust / tan / parchment +
  the committed status colors (sage, amber, river-blue) are the entire
  palette. No purples, teals, magentas.
- ❌ **Do not add gradients to UI chrome.** The system is matte. Gradients
  are reserved for sky and ground only.
- ❌ **Do not use `scrollIntoView`** anywhere. It breaks scaled stages.
- ❌ **Do not rasterize the SVGs.** They scale; let them scale.
- ❌ **Do not change the wagon damage thresholds** in `healthToDamage`. The
  designer committed to those breakpoints; reinterpreting them changes how
  the player reads wagon health.
- ❌ **Do not ship the debug controls panel** to production. Gate it behind
  `?debug=1` or remove entirely.

---

## How to verify

1. **Wagon parity.** `/dev/wagons` route should render the same 3 wagons + 3
   damage states the bundled `Wagon Showcase.html` shows. Visual diff.
2. **Layer stack.** Open `/play` with `?debug=1`, toggle each layer off via
   a debug checkbox; confirm z-order matches `README.md`.
3. **Animation pause.** Hit pause: every moving element freezes at the same
   instant (parallax, wheels, gait, bounce, clouds, rain, lightning).
4. **Biome × weather × time matrix.** Cycle through 5 × 5 × 4 = 100
   combinations via the debug controls. Nothing should crash, no z-order
   inversions, no unstyled elements.
5. **Team scaling.** Count 1–6, ox and mule. Yoke beam stays aligned with
   each pair; chain stays tangent to wagon tongue tip.
6. **Build clean.** `pnpm build` (or whatever the repo uses) with no
   TypeScript errors, no Svelte warnings.

---

## When you're stuck

- The four `src/*.jsx` files are the source of truth for **shape, color,
  proportion, and parametric layout math.** Read the path data; don't guess.
- The README's "How the visual layers stack" section is the source of truth
  for **z-order and constants.**
- This file is the source of truth for **conventions and slot map.**
- For anything else — game-state wiring, route layout, when to mount the
  scene — ask the designer. Don't guess.
