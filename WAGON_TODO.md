# Wagon + Ox Team Pipeline — TODO

Tracking the wagon body, wheel-spin, ox-walk pipeline. Phase A target was SVG wagon body + raster pattern fills; pivoted 2026-05-03 to a **Blender 3D render → SVG composite** pipeline (option 4 in the format-decision doc) for higher fidelity and proper animation.

Last updated: 2026-05-03

---

## Pipeline overview

```
GLB model ──┬─→ render_wagon.py    → body raster (no wheels)        ─┐
            ├─→ render_wheels.py   → 12-frame wheel-spin cycle      ─┼─→ SVG composite per scene
            ├─→ render_animation.py→ walk-cycle frames (ox / cow)   ─┘
            └─→ render_ox_team.py  → [STASHED — yoked-pair geometry]
```

All renders use Cycles + OptiX on the RTX 3070 Laptop. Output goes to `static/wagon-bg/wagon-blender/` and is composited in the SvelteKit app.

---

## Upcoming / TODO

> Numbered for reference — say "do #4 next" etc.

### High priority
- [x] ~~**#1a — Trail cow research**~~ — done in [docs/historical-pass/12-trail-cow-breeds.md](docs/historical-pass/12-trail-cow-breeds.md). Period-correct: Durham/Shorthorn (roan), Devon (red). Period-incorrect: Holstein, Jersey.
- [~] **#1 — Trail cow rendering** — **STASHED 2026-05-04**, see Stashed section below for full notes. Models on disk + research doc preserved for future revisit.
- [ ] **#2 — Wire Blender renders into the SvelteKit app** — `/dev/wagon-detail` viewer should consume the body PNGs + wheel-cycle frames as an animated sprite layered over the existing FLUX backdrops. Replace or augment the SVG-only wagon.
- [x] ~~**#3a — Driver model**~~ — `tools/blender/models/cowboy-driver.glb` (Sketchfab uid 160bf043b71c458984c81c717b7483c9, "Western Cowboy (Rigged)" by stevedaman, CC-BY, 35k polys, 1 material). Period-passable: cowboy hat + plaid shirt + brown vest + trousers + boots. T-posed; rigged. 2 hip pistol holsters that can be hidden via material override if game-context too "wild west" rather than emigrant. `FORCE_LENGTH_AXIS=y` env var needed for side-view (T-pose arms make X dominant).
- [ ] **#3b — Driver composite (Option 2: cropped upper body)** — Initial test at `/tmp/wagon-with-driver-v3.png`: crop cowboy to head→mid-chest, scale to 200px, place at (x=783, y=120) on prairie schooner bench seat. Reads as a seated driver (T-pose arm reads as "holding reins"). Needs: lighting match (re-render cowboy with `FLAT_LIGHTING=1`), hide hip pistols, parameterize seat coords per wagon variant.
- [~] **#3c — Driver composite (Option 1: Blender posed)** — `tools/blender/pose_cowboy_seated.py` shipped with: 90° hip / 90° knee / propped feet, IK arms targeting hands at lap level (chain=2, no pole), gun-vert deletion bbox. Tried euler rotations (9 iterations across X/Y/Z axes and signs), then IK with chain=2 and chain=3, then IK + pole targets at multiple positions and angles (0°, 180°, hip-level, shoulder-level). All approaches produced one of: arms detached at shoulder, V-shaped arms-up, mesh distortion, or visible gun-area artifacts following the hip bone when posed. The Mixamo rig's skin weights at shoulder-sleeve junction tear when the upper arm rotates beyond a moderate angle. Reference photo (Texas History Portal medicine-show wagon) shows the target pose: vertical upper arm, elbow at hip, forearm forward to lap.
- [ ] **#3c-finish — Manual GUI pose refinement (deferred, recommended)** — open `cowboy-driver.glb` in Blender GUI, manually pose-mode the arms to match the reference, fix the residual gun geometry via mesh-edit vertex selection + delete, save as `cowboy-driver-seated.glb`. Estimated 10 min of GUI work; replaces the script's algorithmic pose. Script-based posing has hit its ceiling on this rig.
- [ ] **#3c-alt — Different human model** — Sketchfab search done (5 candidates: cartoon Lucky Luke, Russian peasant farmer, .Fuse Civilian medieval, 1940s Man-In-Coat, 1920s detective). None beat the Western Cowboy for period accuracy. Sticking with current model.
- [x] ~~**#3c-hunyuan — Hunyuan3D-2mini install + first usable output**~~ — installed at `~/ai-tools/Hunyuan3D-2/.venv` (Python 3.11, torch 2.11+cu128). FLUX-generated reference image of a clean isolated 1860s emigrant fed into Hunyuan3D-2mini → produced a CLEAN ANATOMICALLY-CORRECT seated cowboy mesh: hat, mustache, both arms hanging at sides resting on lap, knees bent, feet on ground. **Massively better than the cowboy-driver.glb rigged model** that had detached arms / distorted shoulders / mesh tearing under bone deformation. 564k verts / 1.1M faces, ~20 MB GLB. Total time: ~10 min (FLUX 1 min + Hunyuan3D 5 min + iteration).
  - **Pipeline**: `tools/wagon-bg/gen_driver_ref.py` (FLUX prompt) → `~/ai-tools/Hunyuan3D-2/test_driver.py <input.png> <out.glb>` (Hunyuan3D-2mini). Stop ComfyUI first to free GPU (`kill $(pgrep -f "ComfyUI.*main.py")`).
  - **Output**: `tools/blender/models/cowboy-hunyuan-flux.glb` (static mesh, no rig, no texture).
  - **Render command**: `FORCE_LENGTH_AXIS=y blender -b -P tools/blender/render_wagon.py -- tools/blender/models/cowboy-hunyuan-flux.glb out.png 1024 1024` (the `FORCE_LENGTH_AXIS` flag was added to render_wagon.py for this).
- [ ] **#3c-texture — Add texture to Hunyuan output** — current mesh is plain white. Two options:
  - (a) **Hunyuan3D PaintPipeline** — same install, ~3 GB more VRAM + ~5 min more inference. Auto-generates texture from the original FLUX input image. `from hy3dgen.texgen import Hunyuan3DPaintPipeline; mesh = pipeline_texgen(mesh, image=image)`
  - (b) **Manual Blender materials** — apply a flat color or a simple Principled BSDF with the FLUX input as base color texture. Crude but fast.
  - (c) **Bake the FLUX output as the texture** — sample colors from the FLUX 2D image based on the mesh's silhouette. Hacky, OK for distance.
- [ ] **#3d — Bullwhacker (walking ox driver)** — separate from the seated wagon driver; per the [07-ox-team-harness.md](docs/historical-pass/07-ox-team-harness.md) research, the bullwhacker walks on the LEFT side of the ox team mid-pair holding bullwhip + goad. For ox-team game state.

### Medium priority
- [ ] **#4 — Per-ox actual texture variation (not just color tint)** — the current `OX_SEED` knob jitters the multiply tint by ±15% per channel, which gives subtly different shades but every ox of "Devon Red" still has the **same fur texture** underneath. Real per-ox variation would touch the texture itself: procedural noise patches (Holstein-style spots), brindle stripes via a stripe mask, dirt/mud variation per ox, or randomly-seeded UV offset on the body texture. Approach: add a noise/voronoi shader node mixed into the base color before the tint multiply, seeded per-ox. Re-run renders to compare.
- [ ] **#5 — Multi-ox team rendering at game scale** — emit 1–3 yoke pairs from `gameState.oxen` count, chain them with SVG line elements between the team and the wagon tongue.
- [ ] **#6 — Mule team variant** — leather harness (no yoke), seated driver on wagon seat, jerk-line. For `kind: 'mule'` game state.
- [ ] **#7 — Spare wheel + on-trail wheel repair** — research pass (TaskList #42 still pending). The covered-wagon.glb spare is currently strapped to the side; need a "wheel removed" state for damage gameplay.

### Low priority / Deferred
- [ ] **#8 — Hunyuan3D yoke + bows** generated from a Hansen Wheel & Wagon Shop reference photo. Local GPU runs Hunyuan3D, but the geometric construction in `render_ox_team.py` is good enough for now and we're not using it anyway.
- [ ] **#9 — Painterly stylization revisit** — when overall game-UI cohesion passes call for it. `stylize.py` is wired up; flip on with `STYLIZE=1`.
- [ ] **#10 — More ox/cow color variants** — white (rare-but-attested), tan, Holstein-pattern (period-incorrect on OT but useful for non-OT scenes).
- [ ] **#11 — Procedural brindle / Holstein patches** — current `brindle` is a flat dark color tint; real brindle has stripes and Holstein has blotches. Same idea as #4 — needs a procedural texture mask in the body material.

### Out-of-scope-for-wagon-pipeline (tracked elsewhere)
- **#12 — Landmark approach-backdrop concept** (TaskList #31)
- **#13 — Detailed ground band** (TaskList #32)

---

## Done

### Historical research
- [x] [docs/historical-pass/06-wagon-anatomy.md](docs/historical-pass/06-wagon-anatomy.md)
- [x] [docs/historical-pass/07-ox-team-harness.md](docs/historical-pass/07-ox-team-harness.md)
- [x] [docs/historical-pass/08-wagon-accessories-placement.md](docs/historical-pass/08-wagon-accessories-placement.md)
- [x] [docs/historical-pass/09-canvas-and-wear-states.md](docs/historical-pass/09-canvas-and-wear-states.md)
- [x] [docs/historical-pass/10-wagon-format-decision.md](docs/historical-pass/10-wagon-format-decision.md) — chose option 4 (SVG + raster)
- [x] [docs/historical-pass/11-wagon-visual-references.md](docs/historical-pass/11-wagon-visual-references.md)

### 3D models acquired (`tools/blender/models/`)
- [x] `conestoga.glb` — Sketchfab Ursei, 30 MB, **HEAVY** wagon variant. 278k polys, materials: Chair / Cloth1 / HangingRope / WagonTrunk / WholeWheelSet / WoodenSign. Length axis Y.
- [x] `covered-wagon.glb` — Sketchfab shuvalov.di, 19 MB. Same model serves **PRAIRIE_SCHOONER** (with canvas) and **LIGHT** (canvas hidden via `HIDE_MATERIAL=1011,1012`). 47.5k polys. Length axis X.
- [x] `ox-walk.glb` — Sketchfab uid 5692c6029ceb, 12 MB, "Double Ox walk" / Hungarian Grey ox. 50k polys, 10 materials, one walk action (frames 0–33).
- [x] ~~`prairie-schooner.glb`~~ — MBB3D Polycam scan, **rejected** (chassis only, no bed/canvas). Kept on disk for reference.

### Rendered output (`static/wagon-bg/wagon-blender/`)
- [x] **Conestoga (HEAVY)**:
  - [x] `conestoga-body--nowheels.png` — body without wheels (1536×817)
  - [x] `conestoga-wheels-frames/wheel--{00..11}.png` — 12-frame wheel-spin cycle, all 4 wheels rotating, tongue pitch oscillation, structural axles stationary. K-means hub clustering required (`WholeWheelSet` mesh isn't topologically welded; loose-separate yields 948 fragments).
- [x] **Prairie Schooner**: body without wheels + 12-frame wheel-spin cycle (`prairie-schooner-wheels-frames/`).
- [x] **Light wagon**: body without wheels (canvas + wheels both hidden); reuses prairie-schooner wheel-frames since the chassis is identical.
- [x] **Ox walk**: 12-frame default (`ox-walk-frames/`), 30-frame smooth (`ox-walk-frames-smooth/`).
- [x] **Ox color variants** (12-frame each, same skinned mesh):
  - [x] `ox-walk-frames/` — Gray (Hungarian Grey, default)
  - [x] `ox-walk-frames-devon/` — Devon Red (period-correct, common Oregon Trail ox)
  - [x] `ox-walk-frames-roan/` — Durham/Shorthorn Roan (most common Oregon Trail milk cow)
  - [x] `ox-walk-frames-angus/` — Aberdeen Angus (solid black)
  - [x] `ox-walk-frames-brindle/` — Brindle (dark mottled)

### Tools
- [x] `tools/blender/render_wagon.py` — orthographic side-on body render. `HIDE_MATERIAL` env var (comma-separated material names). `FLIP_VIEW=1` to mirror.
- [x] `tools/blender/render_wheels.py` — k-means k=4 wheel-hub clustering, mean-shift refinement, per-hub rotation animation, tongue pitch oscillation.
- [x] `tools/blender/render_animation.py` — sample N frames from a built-in action. `OX_COLOR` env var for body reskin.
- [x] `tools/blender/inspect_model.py` — bounds, mesh stats, material list.
- [x] `tools/blender/stylize.py` — opt-in `STYLIZE=1` painterly pipeline (Kuwahara filter + matte materials + cream color grade); also houses `reskin_ox_body()` and the `OX_COLORS` palette.
- [x] `tools/blender/render_ox_team.py` — **stashed** (see below).

### Asset-source searches — exhausted, no usable period-correct yoke or pioneer wagon found beyond what's already on disk
- [x] Sketchfab API (key in 1Password)
- [x] Smithsonian Open Access (37 ox-yokes cataloged, 0 digitized — physical objects only)
- [x] OpenGameArt (only Handwagon and Trash Wagon, both unsuitable)
- [x] Quaternius Farm Animal Pack (CC0, has a cow — could repurpose; no wagon or yoke)
- [x] Kenney.nl (no wagons)
- [x] MyMiniFactory Scan the World cat=112 (classical antiquity, no frontier items)

---

## Stashed / Parked

- **Trail cow rendering** — entire `#1` track parked 2026-05-04. The cow is a nice-to-have accessory (period emigrants tied a milk cow behind the wagon), not core to the wagon + ox team gameplay visual. Both candidate models have unfixable issues:
  - **`tools/blender/models/cow-npc.glb`** (nataliekirk, CC-BY, 2.7k polys) — period-correct Durham/Shorthorn coloring (brown + white markings, visible udder), but mesh has self-intersections during bone deformation → dark patches under directional lighting. Source action isn't a true periodic walk-in-place (~9% pose drift between frame 0 and the closest matching loop point); 30 minutes of `CLEAR_LOCATION_KEYS=1` + crossfade only got loop-seam diff from 74k → 60k px. Pipeline knobs left in place if revisited: `FLAT_LIGHTING=1 NO_SUN_LIGHTS=1 CLEAR_LOCATION_KEYS=1 FLIP_VIEW=1 FRAME_START=2 FRAME_END=26 FRAME_COUNT=60` and the `crossfade_loop.py` post-process.
  - **`tools/blender/models/cow-holstein.glb`** (GameCraftPro, CC-BY, 24.5k polys) — Holstein-pattern (period-incorrect on Oregon Trail; introduced 1852, not widespread till late 1800s). Has 30× tighter loop-seam diff (~2k px — source IS a true walk-in-place cycle) BUT the rig has stray `Teeth_0/1` and `eyes_0` meshes that float beside the cow when the head moves; also reads cartoonish.
  - Other Sketchfab options reviewed: nearly all Holstein-pattern or wrong breed (Brahman, Zebu, Indian buffalo). Searches in WAGON_TODO history.
  - **Tools left in tree, not invoked**: `tools/blender/crossfade_loop.py` (post-render image blending for loop seam), `tools/blender/align_frames.py` (image-space centroid alignment), and the `CLEAR_LOCATION_KEYS` / `LOCK_BODY_POSITION` / `FLAT_LIGHTING` / `NO_SUN_LIGHTS` / `BACKFACE_FIX` env-var knobs in `render_animation.py`.
  - **If revisited**: best path is probably hand-author a clean walk-cycle rig on a low-poly cow body with period-correct texture, OR find a Sketchfab "shorthorn cow walk cycle" model that doesn't yet exist in the catalog.

- **Yoked-pair side-on render** (`render_ox_team.py`). Mechanically working: imports two ox copies, constructs geometric yoke beam + U-bows in Python, renders walk cycle. From a pure side-on camera the pair stacks visually (one ox occludes the other — historically accurate but reads as one-ox + noise). Decision 2026-05-03: drop multi-ox, stick with single-ox side-on; team representation will be done as SVG overlays in the team component. Script stays in tree, not invoked.
- **Painterly stylization** (`STYLIZE=1` flag in `stylize.py`). Built and tested at Kuwahara size 8/12/16 with matching desaturation + cream color-grade. Visibly more painterly than photoreal, blends better with FLUX backdrops in side-by-side composite. Decision 2026-05-03: photoreal is fine for now; can flip on later if game-UI cohesion needs it.
- **Texas Longhorn ox** (Sketchfab uid eb6b44060154/49898b24b390). Animated, downloadable, distinct silhouette. Rejected: **period-incorrect**. Longhorns descended from Spanish Texas range cattle and dominated the 1865–1885 Texas–Kansas drives — *after* the peak Oregon Trail emigration window (1843–1869). OT emigrants drove from Missouri/Iowa with mixed-breed American + Devon + Durham oxen.

---

## Reference info

### Model material maps (auto-discovery would re-derive these; pinned here for sanity)
| Model | Material(s) | Role |
|---|---|---|
| `conestoga.glb` | `WholeWheelSet` | wheels + tongue + axles + brake (one big rigid-body group) |
| `conestoga.glb` | Chair, Cloth1, HangingRope, WagonTrunk, WoodenSign | body parts |
| `covered-wagon.glb` | `1001` | hardware (small details) |
| `covered-wagon.glb` | `1002` | body shell (painted blue wood) |
| `covered-wagon.glb` | `1011` | wheels |
| `covered-wagon.glb` | `1012` | canvas |
| `ox-walk.glb` | `Material.010` (22k faces) + `krom` (14k faces) | dominant body fur — reskin targets |

### Render command quick-reference

```fish
# Body raster (transparent PNG, no wheels)
HIDE_MATERIAL=WholeWheelSet blender -b -P tools/blender/render_wagon.py -- \
  tools/blender/models/conestoga.glb \
  static/wagon-bg/wagon-blender/conestoga-body--nowheels.png 1536 817

# Wheel rotation cycle (12 frames)
blender -b -P tools/blender/render_wheels.py -- \
  tools/blender/models/conestoga.glb \
  static/wagon-bg/wagon-blender/conestoga-wheels-frames \
  wheel 1536 817 12 WholeWheelSet

# Ox walk cycle (12-frame default), with color reskin
OX_COLOR=devon blender -b -P tools/blender/render_animation.py -- \
  tools/blender/models/ox-walk.glb \
  static/wagon-bg/wagon-blender/ox-walk-frames-devon \
  ox 1024 1024 12

# Painterly stylization (opt-in)
STYLIZE=1 STYLIZE_KUWAHARA=12 STYLIZE_SATURATION=0.75 \
  HIDE_MATERIAL=WholeWheelSet \
  blender -b -P tools/blender/render_wagon.py -- \
  tools/blender/models/conestoga.glb out.png 1536 817
```

### `OX_COLOR` palette (in `stylize.py`)

Values are **multiply tints** applied over the existing texture (preserves fur detail). Read as: "fully-lit fur of this breed reads roughly this color." Linear sRGB.

| Key | Tint (linear sRGB) | Breed |
|---|---|---|
| `gray` | (1.00, 0.97, 0.92) | Hungarian Grey — default, near-no-op |
| `devon` / `red` | (0.55, 0.20, 0.10) / (0.65, 0.25, 0.12) | Devon Red |
| `durham` | (0.62, 0.32, 0.18) | Durham/Shorthorn |
| `roan` | (0.78, 0.50, 0.42) | Durham roan (most common OT milk cow) |
| `angus` / `black` | (0.18, 0.15, 0.13) / (0.20, 0.17, 0.15) | Aberdeen Angus |
| `brindle` | (0.32, 0.22, 0.16) | Brindle (flat tint — real brindle has stripes; see #11) |
| `white` | (1.10, 1.05, 0.95) | rare-but-attested white |

`OX_SEED=<string>` jitters the tint by ±15% per channel based on a deterministic md5 hash of the seed string. Same seed → same shade.

### API credentials (1Password vault.ericbond.net)
- Sketchfab: `op read "op://vault.ericbond.net/sketchfab api key/password"`
- MyMiniFactory: `op read "op://vault.ericbond.net/myminifactor api key/password"` (ApiKey passes as `?key=...` query param)
