# Wagon-view Raster — Phase 1.5 Resume Notes

> **Status:** Pause point, work-in-progress. Branch `feat/wagon-view-raster`
> is current state of truth. This doc captures everything to pick the
> work back up cleanly later.

## Where Phase 1 / Phase 1.5 ended up

**Architecture (locked, working):**

- `WagonScene.svelte` swaps between SVG and raster modes via `?raster=1`.
  In raster mode, **one painted backdrop per biome** (`BackdropPainting.svelte`)
  replaces the SVG FarLayer + MidLayer + NearLayer trio. SVG stays the
  default.
- Independent `?groundraster=1` flag for the ground band. SVG ground
  (two-stop gradient + horizon shadow) is the default; raster ground is
  available but **not iterated** — we agreed it's not the right primitive.
- 4 biomes × 5 variants = **20 painted backdrops** in `static/wagon-bg/`
  (no river — game-design call, river only appears at landmark crossings,
  prairie fallback in BackdropPainting).
- **Seamless x-axis tiling** via `spinagon/ComfyUI-seamless-tiling` custom
  node. Workflow inserts `SeamlessTile` (x_only) before the KSampler and
  `CircularVAEDecode` in place of the standard VAEDecode. Backdrops
  generated at 3072×768.
- BackdropPainting renders three tile copies at offsets `[-PAINT_W, 0, PAINT_W]`
  for full coverage at any parallax position. Scroll factor 0.3×.
  Painting positioned so its vertical center lands between horizon and ground
  (the visible viewport sees the painting's middle band).
- Variant prop on BackdropPainting (0..4) with stable per-mount random fallback.
  WagonScene threads through a `backdropVariant?` prop.
- **Restart button** + variant dropdown on `/dev/wagon-view`.

**Asset pipeline (locked, working):** `tools/wagon-bg/` — Python, ComfyUI HTTP,
manifest-based incremental rebuild. `prompts.py`, `comfy_client.py`,
`alpha.py`, `seam.py` (kept in tree, post-process disabled — see below),
`generate.py`. `--only` filter, `--regen` flag, `.manifest.json` tracks
checkpoint+prompt+dims+seed signature.

**Seam-blend post-process:** **disabled.** Three blend strategies tried —
narrow edge equality, wide smoothstep feather, offset+gauss-blur. Each
fix was worse than the artifact (hazy band, blurry strip). Raw circular-
padded SDXL output is the floor and ceiling for this approach.
`seam.py` kept as reference; the call site in `generate.py` is commented
out.

**Branch state:** `feat/wagon-view-raster`, ~30 commits ahead of master.
One divergent commit pair on master (`feat(party-panel)` exists on both
with different SHAs — needs reconciliation before merge, see "Branch
hygiene" below).

## Open feedback on existing backdrops (Dave, 2026-04-29)

Per-tile:

- **`backdrop-prairie` (v0):** zoomed-in; mostly tree-tops and sky.
  Want wider / more-distant framing.
- **`backdrop-prairie-4` (dawn mist):** zoomed-in, **too swampy** for prairie.
- **`backdrop-forest` (all 5 variants):** tend toward zoomed-in tree-trunks
  rather than whole trees. Want full trees in frame.
- **`backdrop-forest-4` (autumn):** too fall-heavy for default play; keep
  available as a future seasonal-variant slot.
- **Desert tiles:** same "partial object" issue — fragments of mesas / rocks
  rather than whole silhouettes.
- **`backdrop-mountains-1` (alpine meadow):** closest to target aesthetic
  overall, but mountain tops cut off by the frame.

General patterns to address in re-prompts / LoRA:

- **Fragmentary-object problem** across biomes — partial trees, rocks,
  mountains. Want **more full / complete object silhouettes** in each scene
  for readable flavor.
- **Calendar / map binding** — game runs late-spring through early-fall.
  Default backdrops should reflect green-midsummer foliage; avoid heavy
  autumn or wintry palettes unless explicitly seasonal-variant.
- **Stash-and-keep** the autumn forest as a future calendar-aware variant.

## Phase 1.5b: tileable-landscape LoRA (recommended next big task)

Goal: train a LoRA that biases SDXL toward truly-tileable wide landscape
output, AND addresses the "full objects in frame, not fragments" pattern.

**Pre-work:**

1. Free VRAM (see GPU section below) — LoRA training needs full 8 GB.
2. Search Civitai for existing tileable-landscape LoRAs. 20-min spike;
   if a great one exists, skip the custom-train.

**Custom-train flow (if Civitai search comes up empty):**

1. **Dataset prep, 3–6 hours:**
   - Curate 20–40 horizontal landscape paintings whose left/right edges
     are visually compatible.
   - Pull from the existing 20 backdrop variants (the few that happen to
     be near-tileable), supplemented by hand-picked references.
   - Caption each image: subject + style suffix.
   - Quality > quantity. 25 great examples beats 50 mediocre.
   - Bias dataset toward the "feedback patterns above" — full objects in
     frame, midsummer green, no zoomed-in fragments.

2. **Tooling, ~30 min:** Install `kohya_ss` via AUR. Configure for SDXL
   LoRA training: rank 16–32, batch size 1, gradient checkpointing on,
   ~1500 steps.

3. **Training, ~30–60 min on 3070:** Outputs `~/ComfyUI/models/loras/wagon-bg-tileable-v1.safetensors`.

4. **Integrate, ~30 min:** Add `LoraLoader` node to `comfy_client.py`
   workflow, between checkpoint loader and sampler. Update prompts with
   trigger word.

5. **Iterate, 1–2 hours:** Each retrain ≈ 30–60 min. Usually 2–3
   iterations to dial in.

**Estimated total:** half a day if dataset prep goes smoothly, full day
with normal iteration.

**Risks documented:**

- Quality bounded by dataset — non-tileable inputs → "looks kind of
  tileable" outputs.
- Subtle style drift from base SDXL.
- Long iteration cycle (30–60 min retrain).
- Needs VRAM headroom — full 8 GB during training.

## Phase 1.5c: GPU situation cleanup (immediate, ahead of Phase 1.5b)

Current state with normal desktop running (KDE Plasma + Firefox + Steam):
- **Total VRAM:** 8192 MiB
- **Used at idle:** ~6184 MiB (~3 GB desktop overhead + 2.8 GB ComfyUI)
- **Free at idle:** ~1634 MiB

For LoRA training we need full 8 GB available. Plan:

1. Install `nvtop` for live VRAM monitoring (`sudo pacman -S nvtop`).
2. Identify the heaviest non-essential GPU consumers via `fuser /dev/nvidia*`.
   - Steam (3 separate `steamwebhelper` processes — easily 500–1000 MB)
   - Firefox tabs, especially media-heavy ones
   - Idle Dolphin / Systemsettings windows
3. Establish a "training mode" workflow: close Steam + non-essential
   Firefox tabs before training/heavy generation. Document in this file
   so it's a one-line checklist next time.
4. Optional: investigate whether KDE desktop effects can be temporarily
   disabled for the training session (saves ~100–200 MB).

Outcome: 2.5–3 GB free VRAM during ComfyUI generation, ~6+ GB free
when ComfyUI itself is closed (sufficient for kohya_ss LoRA training).

## Phase 2 (further out, queued)

These remain on the roadmap, in priority order:

1. **Ground hybrid (next big rework after Phase 1.5b):** SVG layout +
   small (256×256) seamless biome-specific raster textures via SVG
   `<pattern>` fills. Photoreal-feeling surface fidelity in a vector-clean
   composition. Goal is to match the upcoming wagon/ox visual quality.
   See TODO.md `wagon-bg ground hybrid` entry.

2. **Wagon + ox redo (Phase 2 proper):** raster wagon + ox sprites with
   walk-cycle animation. Requires LoRA + ControlNet + IPAdapter for
   character consistency. Drives Phase 2 design spec.

3. **Passing-landmark rasters:** painted sprites for the wagon-view
   passing landmarks (ChimneyRock, ScottsBluff, etc.) that currently
   live as SVG silhouettes in `src/lib/ui/wagon/landmarks/`. Stretch goal:
   distance-visible non-stop landmarks for trail population.

## Branch hygiene before merge

When ready to merge `feat/wagon-view-raster` → `master`:

- Master has 1 commit not on feat branch: `74ab63c feat(party-panel)`.
- Feat has commit with same message but different SHA: `467394a`.
- These need reconciliation — likely `git rebase master` on feat with
  manual conflict resolution (pick whichever party-panel content is
  the latest/correct).
- Other divergent files: `FordModal.svelte`, `LandmarkStage.svelte`,
  `TradeModal.svelte`, `landmark-icons/*` (renames + canonicalizations
  Dave did during this period). Most of these landed on master and need
  to come over to feat.
- After merge, `git worktree remove ~/projects/hoosierTrail-wagon-bg`.

## Files of interest

- **Spec:** `docs/superpowers/specs/2026-04-28-wagon-view-raster-upgrade-design.md`
- **Original Phase 1 plan (superseded):** `docs/superpowers/plans/2026-04-28-wagon-view-raster-phase-1.md`
- **Asset pipeline:** `tools/wagon-bg/` (prompts, comfy_client, alpha, seam, generate)
- **Components:** `src/lib/ui/wagon/terrain/BackdropPainting.svelte`,
  `WagonScene.svelte`, `GroundBand.svelte`, FarLayer/MidLayer/NearLayer (SVG-only)
- **Dev preview:** `src/routes/dev/wagon-view/+page.svelte`
- **Custom node:** `~/ComfyUI/custom_nodes/ComfyUI-seamless-tiling/` (third-party,
  installed for this work)

## Quick-start to resume

```bash
# In the worktree:
cd ~/projects/hoosierTrail-wagon-bg
git status                                # confirm clean / branch state
npm run dev                               # http://localhost:5173/dev/wagon-view

# In another terminal — start ComfyUI if not running:
cd ~/ComfyUI && .venv/bin/python main.py --listen 127.0.0.1 --port 8188

# Regenerate any tile after a prompt change:
cd ~/projects/hoosierTrail-wagon-bg/tools/wagon-bg
source .venv/bin/activate
python generate.py --only backdrop,prairie  # single tile
python generate.py                          # all tiles whose signature changed
```
