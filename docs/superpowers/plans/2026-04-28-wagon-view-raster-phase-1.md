# Wagon-view Raster Upgrade — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the four static parallax SVG layers in `WagonScene.svelte` (FarLayer, MidLayer, NearLayer, GroundBand) with AI-generated painterly raster tiles per terrain, behind a `?raster=1` query-param feature flag.

**Architecture:** A new `tools/wagon-bg/` Python pipeline drives the local ComfyUI (`http://127.0.0.1:8188`) to generate one painterly raster per (layer, terrain) pair, post-processes each through `rembg` for alpha, writes WebPs to `static/wagon-bg/`. Each of the four terrain Svelte components gains a `useRaster` derived value reading the URL query, gating between an `<image>` raster branch and the existing hand-authored SVG paths. Animation logic, scrollX math, and z-order in `WagonScene.svelte` are unchanged.

**Tech Stack:** Python 3.11 (asset pipeline), `rembg` + `pillow` (alpha post-process), ComfyUI HTTP API, Svelte 5 runes (component edits), SvelteKit 2.57 `$app/state` for query reads.

**Spec:** `docs/superpowers/specs/2026-04-28-wagon-view-raster-upgrade-design.md`

---

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| `tools/wagon-bg/README.md` | Create | One-pager: how to run the pipeline, dependencies, troubleshooting |
| `tools/wagon-bg/requirements.txt` | Create | Python deps: `rembg[cli]`, `pillow` |
| `tools/wagon-bg/.gitignore` | Create | Ignores `.manifest.json`, `__pycache__/`, raw `.png` outputs |
| `tools/wagon-bg/prompts.py` | Create | The 20-tile config: per-tile content prompt, dimensions, seed; shared style suffix and negative prompt |
| `tools/wagon-bg/comfy_client.py` | Create | Thin ComfyUI HTTP client: submit workflow, poll history |
| `tools/wagon-bg/alpha.py` | Create | Rembg wrapper: opaque PNG → alpha-masked WebP |
| `tools/wagon-bg/generate.py` | Create | Orchestrator: iterate prompts, call comfy + alpha, write `static/wagon-bg/`, manage `.manifest.json`; CLI flags `--only`, `--regen` |
| `static/wagon-bg/.gitkeep` | Create | Directory placeholder before any tiles are committed |
| `static/wagon-bg/{far,mid,near,ground}-{prairie,forest,desert,mountains,river}.webp` | Create | The 20 generated raster tiles |
| `src/lib/ui/wagon/terrain/FarLayer.svelte` | Modify | Add `useRaster` derived from `$app/state` page query; gate render between raster and existing SVG |
| `src/lib/ui/wagon/terrain/MidLayer.svelte` | Modify | Same gate |
| `src/lib/ui/wagon/terrain/NearLayer.svelte` | Modify | Same gate |
| `src/lib/ui/wagon/terrain/GroundBand.svelte` | Modify | Same gate (no tiling — single image) |
| `TODO.md` | Modify | Add a Shipped entry; mark items #157, #159 as advanced by Phase 1 |

**Why files split this way:**
- `comfy_client.py` and `alpha.py` are independently testable (one talks to ComfyUI, one to the filesystem). Splitting keeps the orchestrator readable.
- `prompts.py` is config-only. Iterating on a single tile's prompt edits one Python value, no orchestration code touched.
- The Svelte modifications stay component-local — every terrain layer remains responsible only for its own tile.

---

## Task 1: Set up `tools/wagon-bg/` scaffold

**Files:**
- Create: `tools/wagon-bg/README.md`
- Create: `tools/wagon-bg/requirements.txt`
- Create: `tools/wagon-bg/.gitignore`
- Create: `static/wagon-bg/.gitkeep`

- [ ] **Step 1: Create the directories**

```bash
mkdir -p tools/wagon-bg static/wagon-bg
```

- [ ] **Step 2: Write `tools/wagon-bg/requirements.txt`**

```
rembg[cli]==2.0.59
pillow>=11.0
```

- [ ] **Step 3: Write `tools/wagon-bg/.gitignore`**

```
__pycache__/
*.pyc
.venv/
.manifest.json
*.raw.png
```

- [ ] **Step 4: Write `tools/wagon-bg/README.md`**

````markdown
# wagon-bg asset pipeline

Generates the painterly raster parallax tiles consumed by `WagonScene.svelte`'s
terrain layers when run with `?raster=1`.

## Prereqs

1. ComfyUI running at `http://127.0.0.1:8188` with `sd_xl_base_1.0.safetensors`
   in `~/ComfyUI/models/checkpoints/`. (See the wagon-view spec for the
   feasibility-test setup.)
2. Python 3.11+. Create a venv and install deps:

   ```bash
   uv venv --python 3.11 .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

## Run

```bash
# Generate every missing or stale tile
python generate.py

# Regenerate one specific layer/terrain
python generate.py --only far,prairie

# Force full rebuild
python generate.py --regen
```

Outputs land in `../../static/wagon-bg/{layer}-{terrain}.webp`. The manifest
at `.manifest.json` tracks last-generated seed and prompt hash so a subsequent
run only regenerates what changed.

## Iteration

Edit `prompts.py` for the tile you want to change, rerun `python generate.py`
— only the changed entry regenerates.
````

- [ ] **Step 5: Create the static directory placeholder**

```bash
touch static/wagon-bg/.gitkeep
```

- [ ] **Step 6: Commit**

```bash
git add tools/wagon-bg/ static/wagon-bg/.gitkeep
git commit -m "feat(wagon-bg): scaffold asset pipeline directory"
```

---

## Task 2: Write the prompts config

**Files:**
- Create: `tools/wagon-bg/prompts.py`

- [ ] **Step 1: Write `tools/wagon-bg/prompts.py`**

```python
"""Wagon-view raster tile prompts.

20 entries: 4 layers × 5 terrains. Each tile has a fixed seed for
reproducibility. Edit a `content_prompt` here and rerun `generate.py`
to regenerate just that tile.
"""

from dataclasses import dataclass
from typing import Literal

Layer = Literal["far", "mid", "near", "ground"]
Terrain = Literal["prairie", "forest", "desert", "mountains", "river"]

STYLE_SUFFIX = (
    "hand-drawn cartoon illustration, painterly watercolor and ink, "
    "late 90s adventure game background art, muted earth tones, "
    "layered parallax depth, no people no animals no wagon, "
    "isolated on flat sky-blue background"
)

NEGATIVE_PROMPT = (
    "blurry, low quality, modern, photograph, deformed, watermark, text, "
    "signature, people, characters, wagon, oxen, ui, hud, multiple panels"
)

# Tile band heights — the raster occupies its band only; the rest of
# the SVG composition (sky gradient above, ground below) shows around it.
DIMS = {
    "far":    (2048, 512),
    "mid":    (2048, 384),
    "near":   (2048, 256),
    "ground": (2048, 160),
}


@dataclass(frozen=True)
class TilePrompt:
    layer: Layer
    terrain: Terrain
    width: int
    height: int
    seed: int
    content: str

    @property
    def filename(self) -> str:
        return f"{self.layer}-{self.terrain}.webp"

    @property
    def full_prompt(self) -> str:
        return f"{self.content}, {STYLE_SUFFIX}"


def _t(layer: Layer, terrain: Terrain, seed: int, content: str) -> TilePrompt:
    w, h = DIMS[layer]
    return TilePrompt(layer=layer, terrain=terrain, width=w, height=h, seed=seed, content=content)


PROMPTS: list[TilePrompt] = [
    # FAR — distant horizon silhouettes, atmospheric haze
    _t("far", "prairie",   100001, "distant rolling green prairie hills on the horizon, soft atmospheric haze, suggested low cloud shadows, slim painterly silhouette band"),
    _t("far", "forest",    100002, "distant dark green forest line on the horizon, layered receding tree silhouettes, atmospheric blue-grey haze, painterly silhouette band"),
    _t("far", "desert",    100003, "distant red-rock mesas and buttes on the horizon, dry warm haze, ochre and rust palette, painterly silhouette band"),
    _t("far", "mountains", 100004, "distant snow-capped rocky mountain ridges, layered peaks receding into atmospheric haze, blue-grey palette, painterly silhouette band"),
    _t("far", "river",     100005, "distant rolling river-valley hills on the horizon with cottonwood silhouettes, low atmospheric haze, painterly silhouette band"),

    # MID — middle-distance hills + biome accents
    _t("mid", "prairie",   200001, "middle-distance rolling grass hills with low brush and scattered wildflowers, painterly hand-drawn"),
    _t("mid", "forest",    200002, "middle-distance rolling forested hills, mixed deciduous and evergreen, painterly hand-drawn"),
    _t("mid", "desert",    200003, "middle-distance rocky desert outcrops with sagebrush and dry grass, ochre tones, painterly"),
    _t("mid", "mountains", 200004, "middle-distance rocky foothills with pine-covered slopes and exposed grey rock, painterly"),
    _t("mid", "river",     200005, "middle-distance riverbank willows and grass hummocks beside calm water, painterly"),

    # NEAR — foreground roadside vegetation
    _t("near", "prairie",   300001, "foreground prairie grass clumps and wildflowers along a wagon trail, painterly hand-drawn"),
    _t("near", "forest",    300002, "foreground forest underbrush, ferns, fallen logs and low shrubs along a trail, painterly"),
    _t("near", "desert",    300003, "foreground sagebrush, prickly pear cacti, and dry rocks along a wagon trail, painterly"),
    _t("near", "mountains", 300004, "foreground rocky mountain trail with boulders, alpine grass and low shrubs, painterly"),
    _t("near", "river",     300005, "foreground riverbank reeds, rushes and smooth wet river stones, painterly"),

    # GROUND — terrain surface texture below the trail
    _t("ground", "prairie",   400001, "trodden dirt wagon trail running through prairie grass, top-down ground texture, painterly hand-drawn"),
    _t("ground", "forest",    400002, "forest floor with pine needles and exposed roots running through a wagon trail, top-down ground texture, painterly"),
    _t("ground", "desert",    400003, "sandy desert wagon trail with scattered pebbles, top-down ground texture, painterly"),
    _t("ground", "mountains", 400004, "rocky mountain wagon trail with gravel and stone, top-down ground texture, painterly"),
    _t("ground", "river",     400005, "muddy riverbank wagon trail with smooth wet stones, top-down ground texture, painterly"),
]


if __name__ == "__main__":
    # Smoke check: 20 entries, unique filenames, unique seeds.
    assert len(PROMPTS) == 20, f"expected 20 prompts, got {len(PROMPTS)}"
    assert len({p.filename for p in PROMPTS}) == 20, "duplicate filenames"
    assert len({p.seed for p in PROMPTS}) == 20, "duplicate seeds"
    for p in PROMPTS:
        print(f"{p.filename:32s} seed={p.seed} {p.width}x{p.height}")
    print("OK: 20 tiles, no duplicates")
```

- [ ] **Step 2: Run smoke check**

```bash
cd tools/wagon-bg && python prompts.py
```

Expected: prints 20 tile lines plus `OK: 20 tiles, no duplicates`. No assertion error.

- [ ] **Step 3: Commit**

```bash
git add tools/wagon-bg/prompts.py
git commit -m "feat(wagon-bg): add 20-tile prompt config"
```

---

## Task 3: Write the ComfyUI client

**Files:**
- Create: `tools/wagon-bg/comfy_client.py`

- [ ] **Step 1: Write `tools/wagon-bg/comfy_client.py`**

```python
"""Minimal ComfyUI HTTP client for the wagon-bg pipeline.

Builds a stock SDXL t2i workflow, submits it, polls until done,
returns the absolute path of the produced image.
"""

import json
import shutil
import time
import urllib.request
from pathlib import Path

API = "http://127.0.0.1:8188"
COMFY_OUTPUT_DIR = Path.home() / "ComfyUI" / "output"
CHECKPOINT = "sd_xl_base_1.0.safetensors"


def _build_workflow(prompt: str, negative: str, width: int, height: int, seed: int, filename_prefix: str) -> dict:
    return {
        "3": {
            "class_type": "KSampler",
            "inputs": {
                "seed": seed,
                "steps": 28,
                "cfg": 7.0,
                "sampler_name": "euler",
                "scheduler": "normal",
                "denoise": 1.0,
                "model": ["4", 0],
                "positive": ["6", 0],
                "negative": ["7", 0],
                "latent_image": ["5", 0],
            },
        },
        "4": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": CHECKPOINT}},
        "5": {"class_type": "EmptyLatentImage", "inputs": {"width": width, "height": height, "batch_size": 1}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"text": prompt, "clip": ["4", 1]}},
        "7": {"class_type": "CLIPTextEncode", "inputs": {"text": negative, "clip": ["4", 1]}},
        "8": {"class_type": "VAEDecode", "inputs": {"samples": ["3", 0], "vae": ["4", 2]}},
        "9": {"class_type": "SaveImage", "inputs": {"images": ["8", 0], "filename_prefix": filename_prefix}},
    }


def ping() -> bool:
    """Return True if ComfyUI's HTTP API responds."""
    try:
        with urllib.request.urlopen(f"{API}/", timeout=3) as r:
            return r.status == 200
    except Exception:
        return False


def _post(workflow: dict) -> str:
    payload = json.dumps({"prompt": workflow}).encode()
    req = urllib.request.Request(
        f"{API}/prompt", data=payload, headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())["prompt_id"]


def _wait(prompt_id: str, timeout: float = 180.0) -> dict:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        with urllib.request.urlopen(f"{API}/history/{prompt_id}") as r:
            h = json.loads(r.read())
        if prompt_id in h and h[prompt_id].get("status", {}).get("completed"):
            return h[prompt_id]
        time.sleep(1)
    raise TimeoutError(f"prompt {prompt_id} did not complete in {timeout}s")


def generate_to(out_path: Path, prompt: str, negative: str, width: int, height: int, seed: int) -> None:
    """Generate one image and copy ComfyUI's output PNG to `out_path`.

    `out_path` is the final destination (e.g. a path under tools/wagon-bg/raw/).
    The intermediate file in ~/ComfyUI/output/ stays in place; we copy out.
    """
    prefix = f"wagon-bg-{out_path.stem}"
    workflow = _build_workflow(prompt, negative, width, height, seed, prefix)
    pid = _post(workflow)
    history = _wait(pid)

    # Find the produced filename — there's exactly one image in node 9's outputs.
    images = []
    for _, out in history.get("outputs", {}).items():
        images.extend(out.get("images", []))
    if not images:
        raise RuntimeError(f"prompt {pid} produced no images")
    src = COMFY_OUTPUT_DIR / images[0]["filename"]
    out_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, out_path)


if __name__ == "__main__":
    # Smoke check: ComfyUI is reachable.
    if not ping():
        raise SystemExit("ComfyUI not reachable at " + API)
    print("OK: ComfyUI reachable")
```

- [ ] **Step 2: Run smoke check**

```bash
cd tools/wagon-bg && python comfy_client.py
```

Expected: `OK: ComfyUI reachable`. If it fails with "not reachable", verify ComfyUI is running: `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8188/` should print `200`.

- [ ] **Step 3: Commit**

```bash
git add tools/wagon-bg/comfy_client.py
git commit -m "feat(wagon-bg): add ComfyUI HTTP client"
```

---

## Task 4: Write the rembg post-process

**Files:**
- Create: `tools/wagon-bg/alpha.py`

- [ ] **Step 1: Install rembg locally and download the u2net model once**

```bash
cd tools/wagon-bg
source .venv/bin/activate  # if not already
pip install -r requirements.txt
# Trigger one-time u2net model download (~170 MB) into ~/.u2net/
python -c "from rembg import new_session; new_session('u2net')"
```

Expected: progress bar then prompt returns. Subsequent runs use the cached model.

- [ ] **Step 2: Write `tools/wagon-bg/alpha.py`**

```python
"""Background removal for wagon-bg tiles.

Reads an opaque PNG (SDXL output against a sky-blue backdrop) and writes
an alpha-masked WebP. Uses rembg's u2net model — a clean fit for painterly
silhouettes against a single-color background.

For the `ground` layer, alpha is not applied: the ground tile is
fully opaque, so callers should skip this module entirely for ground.
"""

from pathlib import Path

from PIL import Image
from rembg import new_session, remove

# Module-level session so the u2net model loads once per Python process.
_SESSION = None


def _session():
    global _SESSION
    if _SESSION is None:
        _SESSION = new_session("u2net")
    return _SESSION


def to_webp_with_alpha(src_png: Path, dst_webp: Path, *, quality: int = 85) -> None:
    """Run rembg on src_png and save the result as a WebP with alpha to dst_webp."""
    src_img = Image.open(src_png).convert("RGBA")
    out = remove(src_img, session=_session())
    dst_webp.parent.mkdir(parents=True, exist_ok=True)
    out.save(dst_webp, format="WEBP", quality=quality, method=6)


def copy_opaque_to_webp(src_png: Path, dst_webp: Path, *, quality: int = 85) -> None:
    """Save src_png as a WebP without alpha. Used for the `ground` layer."""
    src_img = Image.open(src_png).convert("RGB")
    dst_webp.parent.mkdir(parents=True, exist_ok=True)
    src_img.save(dst_webp, format="WEBP", quality=quality, method=6)


if __name__ == "__main__":
    # Smoke check: takes a sample SDXL output (the smoke test from earlier
    # sessions if present) and confirms it processes without error.
    sample = Path.home() / "ComfyUI" / "output" / "01_background_prairie_00001_.png"
    out = Path("/tmp/alpha_smoke.webp")
    if not sample.exists():
        raise SystemExit(f"sample {sample} not found — generate one first")
    to_webp_with_alpha(sample, out)
    img = Image.open(out)
    assert img.mode == "RGBA", f"expected RGBA, got {img.mode}"
    print(f"OK: {out} ({img.size}, mode={img.mode})")
```

- [ ] **Step 3: Run smoke check**

```bash
cd tools/wagon-bg && python alpha.py
```

Expected: `OK: /tmp/alpha_smoke.webp ((W, H), mode=RGBA)`. Open the file in an image viewer to eyeball: the sky should be transparent, the painterly content (hills, path) should remain.

- [ ] **Step 4: Commit**

```bash
git add tools/wagon-bg/alpha.py
git commit -m "feat(wagon-bg): add rembg alpha post-process"
```

---

## Task 5: Write the orchestrator

**Files:**
- Create: `tools/wagon-bg/generate.py`

- [ ] **Step 1: Write `tools/wagon-bg/generate.py`**

```python
"""Wagon-bg pipeline orchestrator.

Iterates the prompt config, generates each tile through ComfyUI, runs
the alpha post-process, writes the final WebP to ../../static/wagon-bg/.
A manifest at .manifest.json tracks which tiles have been built so a
re-run only regenerates what changed.
"""

import argparse
import hashlib
import json
import time
from pathlib import Path

from alpha import copy_opaque_to_webp, to_webp_with_alpha
from comfy_client import generate_to, ping
from prompts import NEGATIVE_PROMPT, PROMPTS, TilePrompt

THIS_DIR = Path(__file__).parent
RAW_DIR = THIS_DIR / "raw"
STATIC_DIR = THIS_DIR.parent.parent / "static" / "wagon-bg"
MANIFEST = THIS_DIR / ".manifest.json"


def _signature(p: TilePrompt) -> str:
    """Hash of everything that affects the output: prompt + neg + dims + seed."""
    h = hashlib.sha256()
    h.update(p.full_prompt.encode())
    h.update(NEGATIVE_PROMPT.encode())
    h.update(f"{p.width}x{p.height}".encode())
    h.update(str(p.seed).encode())
    return h.hexdigest()[:16]


def _load_manifest() -> dict[str, str]:
    if MANIFEST.exists():
        return json.loads(MANIFEST.read_text())
    return {}


def _save_manifest(m: dict[str, str]) -> None:
    MANIFEST.write_text(json.dumps(m, indent=2, sort_keys=True))


def _filter(args: argparse.Namespace, all_prompts: list[TilePrompt]) -> list[TilePrompt]:
    if not args.only:
        return all_prompts
    # --only "far,prairie" or --only "far" or --only "*,mountains"
    parts = [p.strip() for p in args.only.split(",")]
    layer_filter = parts[0] if parts and parts[0] != "*" else None
    terrain_filter = parts[1] if len(parts) > 1 and parts[1] != "*" else None
    out = []
    for p in all_prompts:
        if layer_filter and p.layer != layer_filter:
            continue
        if terrain_filter and p.terrain != terrain_filter:
            continue
        out.append(p)
    return out


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", help="layer[,terrain] filter, e.g. 'far,prairie'", default=None)
    parser.add_argument("--regen", action="store_true", help="force regenerate even if manifest matches")
    args = parser.parse_args()

    if not ping():
        raise SystemExit("ComfyUI not reachable at http://127.0.0.1:8188 — start it first")

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    STATIC_DIR.mkdir(parents=True, exist_ok=True)

    manifest = _load_manifest()
    selection = _filter(args, PROMPTS)
    print(f"Generating {len(selection)} tile(s) of {len(PROMPTS)} total\n")

    for i, p in enumerate(selection, 1):
        sig = _signature(p)
        out_path = STATIC_DIR / p.filename
        if not args.regen and manifest.get(p.filename) == sig and out_path.exists():
            print(f"[{i}/{len(selection)}] {p.filename}  -- up to date, skip")
            continue

        print(f"[{i}/{len(selection)}] {p.filename}  ({p.width}x{p.height}, seed={p.seed})", flush=True)
        t0 = time.monotonic()
        raw_path = RAW_DIR / f"{p.layer}-{p.terrain}.png"
        generate_to(raw_path, p.full_prompt, NEGATIVE_PROMPT, p.width, p.height, p.seed)

        if p.layer == "ground":
            copy_opaque_to_webp(raw_path, out_path)
        else:
            to_webp_with_alpha(raw_path, out_path)

        elapsed = time.monotonic() - t0
        manifest[p.filename] = sig
        _save_manifest(manifest)
        print(f"   -> {out_path.relative_to(THIS_DIR.parent.parent)}  ({elapsed:.1f}s)\n")

    print("done.")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Verify the script's argument parsing without generating**

```bash
cd tools/wagon-bg && python generate.py --only far,prairie --help 2>&1 | head -10
```

Expected: argparse usage output. (Don't actually run yet — that's Task 6.)

- [ ] **Step 3: Commit**

```bash
git add tools/wagon-bg/generate.py
git commit -m "feat(wagon-bg): add pipeline orchestrator with --only / --regen"
```

---

## Task 6: Run the pipeline and commit the 20 tiles

**Files:**
- Create: `static/wagon-bg/{far,mid,near,ground}-{prairie,forest,desert,mountains,river}.webp` (20 files)
- Create: `tools/wagon-bg/.manifest.json`

- [ ] **Step 1: Confirm ComfyUI is up and the SDXL checkpoint is loaded**

```bash
curl -s -o /dev/null -w "ComfyUI HTTP %{http_code}\n" http://127.0.0.1:8188/
ls ~/ComfyUI/models/checkpoints/sd_xl_base_1.0.safetensors
```

Expected: `ComfyUI HTTP 200` and the checkpoint file is listed (~6.5 GB).

- [ ] **Step 2: Generate one tile end-to-end as a sanity check**

```bash
cd tools/wagon-bg && python generate.py --only far,prairie
```

Expected: prints `[1/1] far-prairie.webp (2048x512, seed=100001)` then completes in ~20–25 s. Open `static/wagon-bg/far-prairie.webp` and confirm it's painterly hand-drawn distant prairie hills with a transparent background where the sky was.

- [ ] **Step 3: Generate the remaining 19 tiles**

```bash
cd tools/wagon-bg && python generate.py
```

Expected: ~6–8 minutes wall-clock total. Each tile prints its progress; the prairie far one already-up-to-date and is skipped.

- [ ] **Step 4: Visually review every tile**

Open `static/wagon-bg/` in a file manager that previews WebPs (Dolphin, KDE's image viewer) or spot-check via Read tool. For each tile, confirm:
- Subject matches the layer × terrain pair (no oxen, no wagon, no ui artifacts).
- Painterly hand-drawn aesthetic, not photograph or vector.
- Where alpha applies (far/mid/near), the sky is transparent — no blue fringe.
- Ground tiles are fully opaque, grass/sand/mud texture is correct per biome.

If a tile looks wrong, edit its `content_prompt` in `prompts.py`, then:

```bash
cd tools/wagon-bg && python generate.py --only <layer>,<terrain>
```

(Each individual fix is a single commit on its own — don't bundle multiple prompt fixes into one commit.)

- [ ] **Step 5: Commit the tiles and manifest**

```bash
git add static/wagon-bg/*.webp tools/wagon-bg/.manifest.json
git commit -m "feat(wagon-bg): generate 20 painterly raster tiles (5 biomes × 4 layers)"
```

---

## Task 7: Add the `?raster=1` branch to `FarLayer.svelte`

**Files:**
- Modify: `src/lib/ui/wagon/terrain/FarLayer.svelte`

- [ ] **Step 1: Read the current file**

The file is 66 lines. The relevant structure is a `<script lang="ts">` block followed by a `<g>` with a `{#each offsets as offset}` that renders one of five terrain branches via `{#if terrain === 'mountains'} ... {:else if ...} ... {/if}`.

- [ ] **Step 2: Replace the file's contents**

```svelte
<script lang="ts">
  // Far parallax layer — distant horizon silhouettes per biome.
  // Scrolls at 0.15x of the scene scrollX, tile width 600 (SVG mode) or
  // 2048 (raster mode). Drawn at horizonY in the parent's coordinate
  // system; each terrain renders a different silhouette shape.
  //
  // When the URL query has `?raster=1`, the SVG-path branches are
  // replaced by a per-terrain raster tile (`/wagon-bg/far-{terrain}.webp`).
  // Both branches use the same tile-and-scroll structure.
  import { page } from '$app/state';
  import type { Terrain } from '$lib/game/types';

  interface Props {
    terrain: Terrain;
    /** Scene-level horizontal scroll position (any units). */
    scrollX: number;
    horizonY: number;
  }

  let { terrain, scrollX, horizonY }: Props = $props();

  const useRaster = $derived(page.url.searchParams.get('raster') === '1');

  // SVG-mode parallax tiling parameters
  const TILE_W = 600;
  const SCROLL_FACTOR = 0.15;

  // Raster-mode parallax tiling parameters. Wider tile = larger wrap
  // distance; the spec accepts the seam since it appears once per
  // ~22 Travel pulses and is barely visible in motion.
  const RASTER_TILE_W = 2048;
  const RASTER_TILE_H = 512;

  const x = $derived(
    -((scrollX * SCROLL_FACTOR) % (useRaster ? RASTER_TILE_W : TILE_W))
  );
  const offsets = $derived(useRaster ? [0, RASTER_TILE_W] : [0, TILE_W]);

  // Forest needs 60 conifer triangles per tile; precompute the indices
  // so the markup stays readable.
  const forestTriIndices = Array.from({ length: 60 }, (_, i) => i);
</script>

<g>
  {#each offsets as offset (offset)}
    {@const tx = x + offset}
    {#if useRaster}
      <image
        href="/wagon-bg/far-{terrain}.webp"
        x={tx}
        y={horizonY - RASTER_TILE_H}
        width={RASTER_TILE_W}
        height={RASTER_TILE_H}
        preserveAspectRatio="none"
      />
    {:else if terrain === 'mountains'}
      <g transform="translate({tx} {horizonY})">
        <path d="M 0 0 L 60 -34 L 100 -10 L 140 -42 L 200 -8 L 260 -28 L 320 -4 L 380 -36 L 460 -10 L 540 -32 L 600 0 Z"
              fill="#5a6a7a" stroke="#2a3a4a" stroke-width="0.8" />
        <!-- snowcaps -->
        <path d="M 130 -38 L 140 -42 L 150 -38 Z M 370 -32 L 380 -36 L 390 -32 Z M 530 -28 L 540 -32 L 550 -28 Z"
              fill="#e8e8f0" />
      </g>
    {:else if terrain === 'forest'}
      <g transform="translate({tx} {horizonY})">
        <path d="M 0 0 L 0 -12 L 600 -12 L 600 0 Z" fill="#2a3a28" />
        {#each forestTriIndices as i (i)}
          <path d={`M ${i * 10} -12 l 4 -8 l 4 8 Z`} fill="#1a2a18" />
        {/each}
      </g>
    {:else if terrain === 'desert'}
      <g transform="translate({tx} {horizonY})">
        <path d="M 0 0 L 0 -8 L 80 -8 L 80 -22 L 160 -22 L 160 -10 L 240 -10 L 240 -28 L 340 -28 L 340 -14 L 420 -14 L 420 -20 L 520 -20 L 520 -6 L 600 -6 L 600 0 Z"
              fill="#9a5838" stroke="#5a2818" stroke-width="0.7" />
      </g>
    {:else if terrain === 'river'}
      <g transform="translate({tx} {horizonY})">
        <path d="M 0 0 L 0 -10 Q 100 -16 200 -10 Q 300 -6 400 -12 Q 500 -16 600 -8 L 600 0 Z"
              fill="#6a8aa8" stroke="#3a5a78" stroke-width="0.6" opacity="0.85" />
      </g>
    {:else}
      <!-- prairie: gentle low hills -->
      <g transform="translate({tx} {horizonY})">
        <path d="M 0 0 Q 80 -6 160 -3 Q 240 -8 320 -2 Q 400 -7 480 -3 Q 560 -6 600 -1 L 600 0 Z"
              fill="#8a9a6a" stroke="#5a6a3a" stroke-width="0.5" opacity="0.8" />
      </g>
    {/if}
  {/each}
</g>
```

- [ ] **Step 3: Run the typecheck and existing tests**

```bash
npm run check
npm run test
```

Expected: no new errors. The terrain layer change is type-compatible (props unchanged, only internal logic added).

- [ ] **Step 4: Commit**

```bash
git add src/lib/ui/wagon/terrain/FarLayer.svelte
git commit -m "feat(wagon-bg): add ?raster=1 branch to FarLayer"
```

---

## Task 8: Add the `?raster=1` branch to `MidLayer.svelte`

**Files:**
- Modify: `src/lib/ui/wagon/terrain/MidLayer.svelte`

- [ ] **Step 1: Replace the file's script and add the raster branch**

In `MidLayer.svelte`, replace the `<script lang="ts">` block and the `<g>` block with the version below. The non-raster branches stay byte-identical to the current file; the only additions are the import, the `useRaster` derived value, the `RASTER_*` constants, the updated `x`/`offsets`, and the `{#if useRaster}` branch at the top of each `{#each}` iteration.

```svelte
<script lang="ts">
  // Mid parallax layer — rolling hills, mid-distance trees, and biome
  // accents. Scrolls at 0.4x; tile width 400 (SVG) or 2048 (raster).
  import { page } from '$app/state';
  import type { Terrain } from '$lib/game/types';

  interface Props {
    terrain: Terrain;
    scrollX: number;
    horizonY: number;
    groundY: number;
  }

  let { terrain, scrollX, horizonY, groundY }: Props = $props();

  const useRaster = $derived(page.url.searchParams.get('raster') === '1');

  const TILE_W = 400;
  const SCROLL_FACTOR = 0.4;
  const RASTER_TILE_W = 2048;
  const RASTER_TILE_H = 384;

  const x = $derived(
    -((scrollX * SCROLL_FACTOR) % (useRaster ? RASTER_TILE_W : TILE_W))
  );
  const offsets = $derived(useRaster ? [0, RASTER_TILE_W] : [0, TILE_W]);
  const midY = $derived(horizonY + (groundY - horizonY) * 0.45);

  const mountainPineXs = [40, 100, 180, 260, 340];
  const forestTreeXs = [20, 60, 100, 140, 180, 220, 260, 300, 340, 380];
  const desertCactiXs = [60, 180, 280];
  const riverReedXs = [40, 90, 140, 200, 260, 320, 360];
  const prairieTuftXs = [40, 110, 180, 260, 330];
</script>

<g>
  {#each offsets as offset (offset)}
    {@const tx = x + offset}
    {#if useRaster}
      <image
        href="/wagon-bg/mid-{terrain}.webp"
        x={tx}
        y={midY - RASTER_TILE_H}
        width={RASTER_TILE_W}
        height={RASTER_TILE_H}
        preserveAspectRatio="none"
      />
    {:else if terrain === 'mountains'}
      <g transform="translate({tx} {midY})">
        <path d="M 0 0 Q 80 -20 160 -8 Q 240 -24 320 -10 Q 400 -22 400 0 L 0 0 Z"
              fill="#6e5a45" stroke="#3a2818" stroke-width="0.7" />
        {#each mountainPineXs as px (px)}
          <g transform="translate({px} -2)">
            <path d="M 0 0 l -3 -7 l 3 -2 l -2 -5 l 2 -2 l 2 2 l -2 5 l 3 2 l -3 7 Z"
                  fill="#2a3a28" stroke="#1a2a18" stroke-width="0.4" />
          </g>
        {/each}
      </g>
    {:else if terrain === 'forest'}
      <g transform="translate({tx} {midY})">
        {#each forestTreeXs as px (px)}
          <g transform="translate({px} 0)">
            <rect x="-1" y="-2" width="2" height="4" fill="#3a2418" />
            <ellipse cx="0" cy="-7" rx="6" ry="9" fill="#3a5a3a" stroke="#1a2a1a" stroke-width="0.4" />
            <path d="M -4 -10 q 4 -2 8 0" stroke="#1a2a1a" stroke-width="0.3" fill="none" />
          </g>
        {/each}
      </g>
    {:else if terrain === 'desert'}
      <g transform="translate({tx} {midY})">
        <path d="M 0 0 Q 80 -12 160 -2 Q 240 -14 320 -4 Q 400 -10 400 0 L 0 0 Z"
              fill="#c8884a" stroke="#7a4818" stroke-width="0.5" />
        {#each desertCactiXs as px (px)}
          <g transform="translate({px} -1)">
            <path d="M 0 0 L 0 -10 M -2 -7 L -2 -10 M 2 -8 L 2 -11"
                  stroke="#3a5a28" stroke-width="1.2" fill="none" stroke-linecap="round" />
          </g>
        {/each}
      </g>
    {:else if terrain === 'river'}
      <g transform="translate({tx} {midY})">
        <path d="M 0 0 Q 100 -4 200 0 Q 300 -3 400 0 L 400 8 L 0 8 Z"
              fill="#6a7a4a" stroke="#3a4a2a" stroke-width="0.5" />
        {#each riverReedXs as px (px)}
          <line x1={px} y1="0" x2={px + 1} y2="-5" stroke="#3a4a2a" stroke-width="0.5" />
        {/each}
      </g>
    {:else}
      <!-- prairie: low rolling tufts -->
      <g transform="translate({tx} {midY})">
        <path d="M 0 0 Q 60 -4 120 0 Q 180 -3 240 0 Q 300 -4 360 0 Q 400 -2 400 0 L 0 0 Z"
              fill="#9a8a4a" stroke="#5a4818" stroke-width="0.4" />
        {#each prairieTuftXs as px (px)}
          <g transform="translate({px} 0)">
            <ellipse cx="0" cy="-1" rx="6" ry="1.2" fill="#7a6a3a" opacity="0.7" />
            <path d="M -3 -1 q 1 -2 2 -1 m 1 0 q 1 -2 2 -1"
                  stroke="#5a4818" stroke-width="0.4" fill="none" opacity="0.6" />
          </g>
        {/each}
      </g>
    {/if}
  {/each}
</g>
```

- [ ] **Step 2: Run typecheck + tests**

```bash
npm run check
npm run test
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/lib/ui/wagon/terrain/MidLayer.svelte
git commit -m "feat(wagon-bg): add ?raster=1 branch to MidLayer"
```

---

## Task 9: Add the `?raster=1` branch to `NearLayer.svelte`

**Files:**
- Modify: `src/lib/ui/wagon/terrain/NearLayer.svelte`

- [ ] **Step 1: Replace the file's contents**

```svelte
<script lang="ts">
  // Near parallax layer — foreground tufts, rocks, and biome accents
  // the wagon walks past. Scrolls at 0.85x of the scene scrollX,
  // tile width 200 (SVG) or 2048 (raster).
  import { page } from '$app/state';
  import type { Terrain } from '$lib/game/types';

  interface Props {
    terrain: Terrain;
    scrollX: number;
    groundY: number;
  }

  let { terrain, scrollX, groundY }: Props = $props();

  const useRaster = $derived(page.url.searchParams.get('raster') === '1');

  const TILE_W = 200;
  const SCROLL_FACTOR = 0.85;
  const RASTER_TILE_W = 2048;
  const RASTER_TILE_H = 256;

  const x = $derived(
    -((scrollX * SCROLL_FACTOR) % (useRaster ? RASTER_TILE_W : TILE_W))
  );
  const offsets = $derived(
    useRaster ? [0, RASTER_TILE_W] : [0, TILE_W, TILE_W * 2]
  );

  const prairieGrassXs = [10, 35, 70, 110, 140, 175];
  const forestStumpXs = [20, 80, 140];
</script>

<g>
  {#each offsets as offset (offset)}
    {@const tx = x + offset}
    {#if useRaster}
      <image
        href="/wagon-bg/near-{terrain}.webp"
        x={tx}
        y={groundY - RASTER_TILE_H}
        width={RASTER_TILE_W}
        height={RASTER_TILE_H}
        preserveAspectRatio="none"
      />
    {:else}
      <g transform="translate({tx} {groundY})">
        {#if terrain === 'prairie'}
          <g stroke="#4a3818" stroke-width="0.5" fill="none" stroke-linecap="round">
            {#each prairieGrassXs as px (px)}
              <path d={`M ${px} 4 q 1 -3 2 0 m -1 0 q -1 -3 0 -5 m 0 0 q 1 -2 2 -1`} />
            {/each}
          </g>
        {:else if terrain === 'mountains'}
          <g fill="#5a4a3a" stroke="#1a0e08" stroke-width="0.5">
            <ellipse cx="30" cy="3" rx="8" ry="2" />
            <ellipse cx="100" cy="2" rx="5" ry="1.4" />
            <ellipse cx="160" cy="3" rx="7" ry="1.8" />
          </g>
        {:else if terrain === 'forest'}
          <g>
            {#each forestStumpXs as px (px)}
              <g transform="translate({px} 0)">
                <ellipse cx="0" cy="2" rx="4" ry="1" fill="#3a2818" />
                <path d="M -2 2 l 1 -3 m 2 3 l 0 -3 m 1 3 l 1 -2"
                      stroke="#5a4828" stroke-width="0.5" />
              </g>
            {/each}
          </g>
        {:else if terrain === 'desert'}
          <g>
            <ellipse cx="40" cy="3" rx="3" ry="1" fill="#8a5828" />
            <ellipse cx="120" cy="3" rx="5" ry="1.2" fill="#a86838" />
            <!-- small skull -->
            <g transform="translate(150 1)">
              <ellipse cx="0" cy="0" rx="2" ry="1.2" fill="#e8d8b8" stroke="#3a1a08" stroke-width="0.3" />
              <circle cx="-0.6" cy="0" r="0.3" fill="#3a1a08" />
              <circle cx="0.6" cy="0" r="0.3" fill="#3a1a08" />
            </g>
          </g>
        {:else if terrain === 'river'}
          <g>
            <path d="M 0 0 Q 50 -2 100 0 Q 150 2 200 0 L 200 8 L 0 8 Z"
                  fill="#4a8bc9" opacity="0.6" />
            <path d="M 0 0 Q 50 -2 100 0 Q 150 2 200 0"
                  stroke="#7aa8d4" stroke-width="0.5" fill="none" />
          </g>
        {/if}
      </g>
    {/if}
  {/each}
</g>
```

- [ ] **Step 2: Run typecheck + tests**

```bash
npm run check
npm run test
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/lib/ui/wagon/terrain/NearLayer.svelte
git commit -m "feat(wagon-bg): add ?raster=1 branch to NearLayer"
```

---

## Task 10: Add the `?raster=1` branch to `GroundBand.svelte`

**Files:**
- Modify: `src/lib/ui/wagon/terrain/GroundBand.svelte`

GroundBand does not parallax-scroll (no `scrollX` prop) and is rendered as a full-width rect under the wagon. The raster swap is correspondingly simpler: one `<image>` covering the band, no tiling.

- [ ] **Step 1: Replace the file's contents**

```svelte
<script lang="ts">
  // Solid foreground earth band. SVG mode renders a two-stop linear
  // gradient with a horizon-shadow fade. Raster mode (?raster=1)
  // replaces the gradient with a single per-terrain ground texture.
  import { page } from '$app/state';
  import type { Terrain } from '$lib/game/types';
  import { GROUND_FILL } from './terrain-tokens';

  interface Props {
    terrain: Terrain;
    groundY: number;
    h: number;
    w: number;
    /** Used as the unique id prefix for the inline gradient defs. */
    idPrefix?: string;
  }

  let { terrain, groundY, h, w, idPrefix = 'gb' }: Props = $props();

  const useRaster = $derived(page.url.searchParams.get('raster') === '1');

  const gradId = $derived(`${idPrefix}-${terrain}`);
  const fadeId = $derived(`${idPrefix}-${terrain}-fade`);
  const fills = $derived(GROUND_FILL[terrain] ?? GROUND_FILL.prairie);
</script>

<g>
  {#if useRaster}
    <image
      href="/wagon-bg/ground-{terrain}.webp"
      x="0"
      y={groundY}
      width={w}
      height={h}
      preserveAspectRatio="none"
    />
  {:else}
    <defs>
      <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color={fills[0]} />
        <stop offset="100%" stop-color={fills[1]} />
      </linearGradient>
      <linearGradient id={fadeId} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#000" stop-opacity="0.35" />
        <stop offset="100%" stop-color="#000" stop-opacity="0" />
      </linearGradient>
    </defs>
    <rect x="0" y={groundY} width={w} height={h} fill={`url(#${gradId})`} />
    <!-- horizon shadow band -->
    <rect x="0" y={groundY} width={w} height="8" fill={`url(#${fadeId})`} opacity="0.4" />
  {/if}
</g>
```

- [ ] **Step 2: Run typecheck + tests**

```bash
npm run check
npm run test
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/lib/ui/wagon/terrain/GroundBand.svelte
git commit -m "feat(wagon-bg): add ?raster=1 branch to GroundBand"
```

---

## Task 11: Visual soak across all five biomes

This task is manual — there is no automated visual diff. It verifies the raster pipeline works end-to-end against a running game.

**Files:** none modified.

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

Expected: Vite prints a local URL (typically `http://localhost:5173`).

- [ ] **Step 2: Confirm baseline (SVG) still renders correctly**

Open `http://localhost:5173/play` in a browser, start a save, take one Travel action. The wagon scene should render exactly as before (hand-authored SVG silhouettes).

- [ ] **Step 3: Confirm raster mode renders for the starting biome**

Append `?raster=1` to the URL: `http://localhost:5173/play?raster=1`. Reload, take one Travel action. The wagon scene should now show the painterly raster background. Wagon, oxen, weather, sun should still render on top correctly.

- [ ] **Step 4: Confirm raster mode renders for every other biome**

Travel through (or use save-state injection / debug controls if available) until each of the five biomes (prairie, forest, desert, mountains, river) has been visited. For each:
- All four raster layers load (no broken image icons / 404s in devtools network panel).
- Parallax depth reads correctly (near scrolls fastest, far slowest).
- Weather overlays still composite correctly on top of raster layers.
- Time-of-day wash still tints raster layers (try `?raster=1&dusk=1` if the debug rig supports it; otherwise verify by waiting for night in-game).

- [ ] **Step 5: Confirm pause still works**

Without taking a Travel action, the scene should be frozen. Raster scroll position should hold steady alongside SVG dynamics.

- [ ] **Step 6: Performance sanity check**

Open Chromium devtools → Performance, record 5 seconds of Travel motion in `?raster=1` mode. The `requestAnimationFrame` callback should stay under ~2 ms per frame. Major regression here (>5 ms) would warrant investigation.

- [ ] **Step 7: If everything passes, no commit needed.** If you spot a tile that needs prompt iteration, regenerate just that tile (`python tools/wagon-bg/generate.py --only <layer>,<terrain>`), commit the new tile, and re-soak.

---

## Task 12: Update `TODO.md`

**Files:**
- Modify: `TODO.md`

- [ ] **Step 1: Find the most recent "Shipped" header in TODO.md**

```bash
cd ~/projects/hoosierTrail && grep -nE "^- \*\*#" TODO.md | head -5
```

This shows the most recent shipped entries. Insert the new entry above them so the newest sits at the top.

- [ ] **Step 2: Add the shipped entry**

Open `TODO.md` in your editor. Above the most recent `- **#NNN** ...` line, insert:

```markdown
- **wagon-bg Phase 1** raster background tiles for the wagon view — replaces the four static SVG parallax layers (FarLayer / MidLayer / NearLayer / GroundBand) with painterly hand-drawn AI-generated raster tiles per biome (5 terrains × 4 layers = 20 WebP tiles in `static/wagon-bg/`). Asset pipeline at `tools/wagon-bg/` (Python + ComfyUI HTTP + rembg/u2net for alpha). Behind a `?raster=1` URL flag so SVG and raster paths coexist for review; the SVG branches and feature flag will be removed once the raster aesthetic is locked. Animation logic, parallax math, weather overlays, ox team, and wagon SVG all unchanged. Advances #157 (terrain + weather visual revisit) and #159 (strip framing pass). Phase 2 (raster wagon + ox + LoRA + ControlNet/IPAdapter consistency stack) follows.
```

- [ ] **Step 3: Commit**

```bash
git add TODO.md
git commit -m "docs(TODO): record wagon-bg Phase 1 shipped entry"
```

---

## Self-review against spec

Cross-checking the plan against `docs/superpowers/specs/2026-04-28-wagon-view-raster-upgrade-design.md`:

- **Architecture (only 4 components change, rest unchanged)** → covered by Tasks 7–10; Section 1 of the spec maps 1:1.
- **Tile inventory (5 × 4 = 20 tiles, dimensions per row)** → covered by `prompts.py` in Task 2; dimensions match the spec table exactly.
- **Asset pipeline (Python + ComfyUI + rembg)** → covered by Tasks 1–6 with concrete code.
- **Migration with feature flag (`?raster=1` from `$app/state`)** → covered by Tasks 7–10; uses the same `$app/state` pattern already present in `src/routes/+error.svelte`.
- **Verification (visual soak across biomes, perf, pause)** → covered by Task 11.
- **Out of scope items** (seamless tiling, time-of-day raster variants, weather raster variants, cloud raster, sun/moon raster, OxTeam/wagon/weather changes, LoRA training) — none implemented. ✓

No spec gaps. No placeholders found. Type-consistency check: `useRaster`, `RASTER_TILE_W`, `RASTER_TILE_H` are used identically across Tasks 7/8/9; `TilePrompt`, `PROMPTS`, `STYLE_SUFFIX`, `NEGATIVE_PROMPT`, `DIMS` are used consistently across Tasks 2/3/4/5.
