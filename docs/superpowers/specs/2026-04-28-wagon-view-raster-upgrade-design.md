# Wagon-view raster upgrade — Phase 1 design

**Status:** Draft for review
**Owner:** Dave
**Date:** 2026-04-28
**Branch:** `feat/wagon-view-raster`

## Context

`src/lib/ui/wagon/WagonScene.svelte` is a complete 13-layer animated SVG composition driven by a single `requestAnimationFrame` tick. The architecture is sound — terrain-aware components, a clean weather-state mapping, condition-aware wagon variants, gait-phase animation, parallax-coupled clouds, time-of-day wash. The visible problem is that the *static* layers (sky beyond the gradient, far/mid/near parallax silhouettes, ground texture) are minimal hand-authored SVG paths. Compared to a painterly hand-drawn aesthetic, the result reads as flat and basic.

Reaching the painterly fidelity Dave wants in pure SVG means writing many hundreds more path/filter/turbulence layers per biome — months of asset work that hits a ceiling well below what diffusion models produce in seconds.

A test render against the local SDXL stack (`stabilityai/stable-diffusion-xl-base-1.0`) using a hand-drawn-cartoon prompt produced an immediately on-target painterly prairie scene — single prompt, no LoRA, ~18 seconds. The aesthetic gap is bridgeable in raster.

A second test (three independent generations of "the same ox" walking) produced three visibly different oxen, confirming that **walk-cycle animation cannot be diffused frame-by-frame without a consistency stack** (LoRA + ControlNet pose + IPAdapter character lock). That stack is achievable but not free; it justifies splitting the work across two phases.

## Phase split

- **Phase 1 (this spec):** raster the four static parallax layers per biome. SVG architecture and dynamics unchanged. Highest visual return per hour invested. Reversible behind a feature flag.
- **Phase 2 (sketched, not specced):** raster the dynamic foreground (oxen team, wagon variants, weather effects) using a trained-LoRA + ControlNet + IPAdapter consistency pipeline. Specced after Phase 1 review.

## Architecture

The composition order, scene dimensions, prop contracts, animation tick, weather state mapping, and time-of-day wash in `WagonScene.svelte` are **unchanged**. The change is internal to four leaf components only:

- `src/lib/ui/wagon/terrain/FarLayer.svelte`
- `src/lib/ui/wagon/terrain/MidLayer.svelte`
- `src/lib/ui/wagon/terrain/NearLayer.svelte`
- `src/lib/ui/wagon/terrain/GroundBand.svelte`

Inside each, the hand-authored `<path>` content is replaced with one `<image href="/wagon-bg/{layer}-{terrain}.webp" />` per `terrain` value. The component continues to receive `terrain`, `scrollX`, `horizonY`, `groundY` and continues to apply the parallax `transform="translate(scrollX*depthFactor, 0)"` on the moving group. Only the rendered content of the moving group changes from path geometry to a raster image.

Components left untouched:

- `terrain/SkyGradient.svelte` (parameterized gradient is sufficient; raster offers no benefit here)
- `weather/CloudLayer.svelte`, `weather/SkyAccent.svelte`, `weather/PrecipOverlays.svelte`, `weather/StormVignette.svelte`
- `landmarks/LandmarkLayer.svelte` and all per-landmark silhouette components
- `ox-team/OxTeam.svelte`, `ox-team/SingleOx.svelte`
- All `wagon-svg/` components (`PrairieSchooner`, `LightWagon`, `HeavyFreighter`, addons)
- The time-of-day wash applied at the top of `WagonScene`

## Tile inventory

5 terrains × 4 layers = **20 tiles**. No weather variants on these layers (the weather overlays handle atmospheric change). No time-of-day variants (the existing wash overlay handles dusk and night).

| layer | dimensions | alpha | covers |
|---|---|---|---|
| `far` | 2048×512 | yes | sky horizon → mid-band; distant ridges, atmospheric haze |
| `mid` | 2048×384 | yes | rolling hills, mid-distance trees/rocks |
| `near` | 2048×256 | yes (heavy) | foreground shrubs, rocks, trail-side vegetation |
| `ground` | 2048×160 | no | terrain surface texture below `GROUND_Y` |

Width 2048 is chosen so a single Travel pulse (≤90 px scrolled at the current `scrollX = -t*60` rate over a 1.5s rolling window) consumes <5 % of one tile width, leaving ~22 pulses of headroom before the parallax loop wraps. When wrap occurs in long Travel sessions, the visual seam is acceptable in motion; seamless tiling is deferred to Phase 1.5 if needed.

**Format:** WebP at quality 85. Expected per-tile size 150–400 KB; total payload committed under `static/wagon-bg/` ≈ 4–8 MB.

**Naming:** `static/wagon-bg/{layer}-{terrain}.webp` — e.g., `static/wagon-bg/far-prairie.webp`, `static/wagon-bg/ground-mountains.webp`.

## Asset pipeline

A Python script `tools/wagon-bg/generate.py` reads a prompt config and submits jobs to the local ComfyUI server (`http://127.0.0.1:8188`).

**Prompt config:** `tools/wagon-bg/prompts.ts` (TypeScript so it shares types with the runtime if needed). One entry per tile, each with:

- `layer` — `'far' | 'mid' | 'near' | 'ground'`
- `terrain` — `Terrain` from `src/lib/game/types.ts`
- `width`, `height` — from the tile-inventory table
- `seed` — fixed integer per tile for reproducibility
- `content_prompt` — per-tile description (e.g. *"distant rolling green prairie hills, soft horizon haze, midday sky tint"*)

A shared **style suffix** is appended to every content prompt:

> *"hand-drawn cartoon illustration, painterly watercolor and ink, late 90s adventure game background art, muted earth tones, layered parallax depth, no people no animals no wagon, transparent background where applicable"*

A shared **negative prompt** is applied to every tile:

> *"blurry, low quality, modern, photograph, deformed, watermark, text, signature, people, characters, wagon, oxen, ui, hud"*

**Alpha handling.** Far/mid/near layers need transparency so sky, sun, and underlying parallax show through. SDXL doesn't natively output alpha. The pragmatic Phase 1 approach: each layer's tile is sized to its visible band only (heights given in the inventory table), generated against a flat magenta or sky-blue key color, then alpha is recovered either with ComfyUI's `LayerDiffusion` custom node (cleanest) or with a post-process `rembg` pass. The implementation plan picks one of these and pins it. Ground is fully opaque so the question doesn't apply.

**Why no LoRA in Phase 1:** the smoke-test prairie render landed the aesthetic with stock SDXL base. A LoRA tightens style consistency but isn't required to ship Phase 1. Add it in Phase 2 alongside the consistency stack.

**Run model:** `python tools/wagon-bg/generate.py [--only far,prairie] [--regen]`. Without arguments, regenerates only tiles whose prompt or seed has changed since the last run (tracked by a sibling `.manifest.json`). The `--regen` flag forces a full rebuild.

**Wall-clock budget:** 20 tiles × ~18 s/tile = ~6 minutes for a clean rebuild. Iteration on individual tiles is single-tile cost.

## Migration with feature flag

Each of the four terrain layer components gains a render branch:

```svelte
<script lang="ts">
  import { page } from '$app/state';
  // ... existing imports
  const useRaster = $derived(page.url.searchParams.get('raster') === '1');
</script>

{#if useRaster}
  <image href="/wagon-bg/{LAYER}-{terrain}.webp" ... />
{:else}
  <!-- existing hand-authored <path> content -->
{/if}
```

Where `{LAYER}` is the layer name (`far`/`mid`/`near`/`ground`) and `{terrain}` is the prop. Toggle is by URL query (`?raster=1`) so it works inside `/play` without a build flag.

This keeps both implementations live during review. Once Dave approves, a follow-up commit removes the SVG branches and the flag.

## Verification

1. **Visual soak.** Load `/play?raster=1`, walk through each of the five terrains (state-injection or save-game equivalent). Confirm:
   - All five biomes render without missing tiles or 404s
   - Parallax scroll respects layer depth (near scrolls fastest, far slowest)
   - Wagon, oxen, weather, landmarks, sun all still render correctly on top
   - Time-of-day wash still tints raster layers as expected
   - Pause behavior freezes raster scroll alongside SVG dynamics
2. **Compare.** Toggle `?raster=1` ↔ no flag on the same biome to confirm the raster version is a strict aesthetic upgrade and no regression in scene proportions.
3. **Performance.** Confirm `requestAnimationFrame` callback cost stays under 2 ms with raster layers active (Chromium devtools performance recording on a `/play` Travel session).
4. **No automated test changes** — existing tests assert game state, not pixels.

## Out of scope (Phase 1)

- Seamless-tile generation (deferred to Phase 1.5 if visible seams become annoying)
- Time-of-day raster variants (handled by the existing wash overlay)
- Weather raster variants on the static layers (handled by overlay components)
- Cloud raster sprites (CloudLayer stays SVG)
- Sun/moon raster (SkyAccent stays SVG)
- Any change to `OxTeam`, `SingleOx`, wagon SVG components, weather overlays — all Phase 2 territory
- LoRA training, ControlNet/IPAdapter setup — all Phase 2

## Risks and open questions

- **Tile-wrap seams.** If the 2048 px headroom proves visually annoying on long Travel sessions, Phase 1.5 adds a seamless-tile pass (img2img tile-and-blend technique against the existing tiles' edges). Not blocking.
- **Aesthetic consistency across biomes.** All 20 tiles are generated with the same style suffix, but stock SDXL base will drift slightly between prompts. If drift is visible, Phase 1.5 trains a single shared "hoosier-trail-bg" style LoRA from the best-of generation set and regenerates with it. Not blocking.
- **WebP browser support.** Universal in evergreens. SvelteKit static assets pass through unchanged. No issue.
- **Repo size growth.** ~4–8 MB committed is fine for a non-binary-heavy project. If concern grows, switch to git-lfs for `static/wagon-bg/`.

## Phase 2 (outline only — to be specced after Phase 1 review)

Phase 2 raster upgrades the dynamic foreground using a consistency stack:

1. Train a **wagon style LoRA** and an **ox style LoRA** from a curated reference set (15–25 images each, kohya_ss locally on the existing 8 GB VRAM, ~30 minutes per LoRA).
2. Stand up the **consistency pipeline**: ControlNet OpenPose / DWPose for quadruped pose driving, IPAdapter for character lock, fixed seed per cycle.
3. Generate **walk-cycle sprite sheets**: 8–12 frames per cycle, one cycle per ox count variant, packed into atlases. Same approach for wagon wheel rotation if the existing SVG wheel is replaced.
4. **Replace `OxTeam` / `SingleOx` / wagon SVG components** with sprite-sheet animators that consume `gaitPhase` / `wheelAngle` and index the right frame.
5. Generate **condition variants** (broken wagon, sick ox) as additional sprites.
6. Same migration/feature-flag approach as Phase 1.

Detailed spec written after Phase 1 ships and the painterly style is locked.
