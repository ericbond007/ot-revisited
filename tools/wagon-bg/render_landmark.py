"""Per-landmark FLUX backdrop renderer.

Parallel pipeline to generate.py — uses the same comfy_client + LoRA
stack but writes per-landmark backdrops to `static/wagon-bg/landmarks/<id>.webp`.
Each landmark's prompt is sourced from the matching research file at
`docs/historical-pass/13-landmark-visual-references/<id>.md` §"FLUX
prompt building blocks → Default".

Usage:
    python render_landmark.py chimney_rock
    python render_landmark.py --all                 # render every entry below
    python render_landmark.py --regen chimney_rock  # force regenerate

Dimensions: 3072×1024 per the umbrella #1078 rework spec — wider vertical
extent than the biome backdrop (3072×768) to accommodate landmarks with
significant vertical presence (Chimney Rock spire, Scotts Bluff face, the
Devil's Gate cleft, Wind River Mountains on the horizon at Flagstaff Hill).

Output: `static/wagon-bg/landmarks/<id>.webp` (committed).
"""

import argparse
import sys
import time
from pathlib import Path

from alpha import copy_opaque_to_webp
from comfy_client import generate_to, ping
from prompts import NEGATIVE_PROMPT

THIS_DIR = Path(__file__).parent
RAW_DIR = THIS_DIR / "raw" / "landmarks"
STATIC_DIR = THIS_DIR.parent.parent / "static" / "wagon-bg" / "landmarks"

# Same default LoRA as biome backdrops — ht_landscape v2_2000 at 1.0.
# Trigger word "ht_landscape" is baked into each prompt below.
DEFAULT_LORAS: list[tuple[str, float]] = [("ht_landscape_v2_2000.safetensors", 1.0)]
# Default 3072×1024 (3:1) for natural-landscape landmarks. Per-landmark
# entries can override with `width`/`height` keys — architectural subjects
# (forts, missions) suffer 3:1 duplication artifacts in SDXL and need
# narrower aspects until the arch pipeline (#1187) lands.
WIDTH, HEIGHT = 3072, 1024

# Per-landmark prompts. Each entry: { id, seed, prompt }. The prompt
# bakes in "ht_landscape" trigger + "painterly oil on canvas" tail to
# match the LoRA's training caption pattern (same convention as
# prompts.py). Prompt content lifted directly from the research file's
# §"FLUX prompt building blocks → Default" — single source of truth.
LANDMARKS: list[dict] = [
    {
        "id": "chimney_rock",
        "seed": 810001,
        "prompt": (
            "ht_landscape, horizon-vista of Chimney Rock, slender sandstone spire "
            "rising from wide conical clay apron, two-part silhouette tapering "
            "to a needle point, spire off-center to the right, high plains sage "
            "prairie foreground, distant wagon caravan strung along North Platte "
            "river in middle ground, soft late afternoon light, pale tan rock "
            "against deep blue sky, sky dominant in upper half of frame, "
            "painterly oil on canvas, period accurate 1850"
        ),
    },
    {
        "id": "scotts_bluff",
        "seed": 820009,
        "prompt": (
            "ht_landscape, view from inside the wide open Mitchell Pass, "
            "a massive towering sandstone bluff cliff face on the left side close to the viewer, "
            "another massive towering sandstone bluff cliff face on the right side close to the viewer, "
            "the wide open prairie pass and deep blue sky between them in the center, "
            "wagon caravan on the trail strung through the pass into the distance, "
            "looking up at flat-topped layered cliffs flanking the trail on both sides, "
            "Scotts Bluff and South Bluff on the Oregon Trail in 1850, "
            "pale tan stratified sandstone, mixed-grass prairie foreground, "
            "soft late afternoon light, painterly oil on canvas"
        ),
    },
    # Architectural-subject stopgap (Old Bedlam-style single-building view).
    # ht_landscape + 3:1 wrecks man-made structures (tiled duplication +
    # cartoon buildings). Rendered at 2:1 to dodge the worst tiling.
    # Replace once #1187's architectural pipeline lands.
    {
        "id": "ft_laramie",
        "seed": 830020,
        "width": 2048,
        "height": 1024,
        "prompt": (
            "ht_landscape, close-up architectural portrait painting of Fort Laramie in 1850, "
            "EXACTLY two distinct standalone fort buildings on the left side of the frame, "
            "the two buildings stand apart with sky visible between them, "
            "each building is a single tall wooden-and-adobe structure, "
            "the buildings rise from the ground all the way to the upper third of the frame, "
            "close enough to see every weathered timber and adobe brick, "
            "one tall wooden flagpole standing between the two buildings flying one American flag, "
            "two single horses tied to a hitching post in front of the buildings, "
            "EXACTLY two tall conical Native American teepees on the far right edge of the frame, "
            "the two teepees stand apart with prairie visible between them, "
            "wide open empty prairie separating the teepees from the fort buildings in the middle of the frame, "
            "clear sharp painterly detail, NO fog NO haze NO mist NO atmospheric softness, "
            "warm golden afternoon light, painterly oil on canvas, period accurate 1850"
        ),
    },
]


def render(landmark_id: str, *, regen: bool = False) -> Path:
    """Render one landmark backdrop. Returns the final WebP path."""
    entry = next((e for e in LANDMARKS if e["id"] == landmark_id), None)
    if entry is None:
        raise SystemExit(
            f"Unknown landmark {landmark_id!r}. "
            f"Known: {', '.join(e['id'] for e in LANDMARKS)}"
        )
    raw_path = RAW_DIR / f"{landmark_id}.png"
    out_path = STATIC_DIR / f"{landmark_id}.webp"
    if out_path.exists() and not regen:
        print(f"[skip] {out_path} exists (use --regen to force)")
        return out_path
    width = entry.get("width", WIDTH)
    height = entry.get("height", HEIGHT)
    print(f"[render] {landmark_id} → {out_path.name} ({width}x{height}, seed {entry['seed']})")
    t0 = time.time()
    generate_to(
        raw_path, entry["prompt"], NEGATIVE_PROMPT,
        width, height, entry["seed"], loras=DEFAULT_LORAS,
    )
    print(f"  raw {raw_path.name} written in {time.time() - t0:.1f}s")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    copy_opaque_to_webp(raw_path, out_path)
    print(f"  ✅ {out_path.relative_to(THIS_DIR.parent.parent)}")
    return out_path


def main() -> int:
    p = argparse.ArgumentParser(description="Render per-landmark FLUX backdrops.")
    p.add_argument("landmark", nargs="?", help="Landmark id to render. Omit with --all to render every entry.")
    p.add_argument("--all", action="store_true", help="Render every landmark in LANDMARKS.")
    p.add_argument("--regen", action="store_true", help="Re-render even if the WebP already exists.")
    args = p.parse_args()
    if not ping():
        print("✗ ComfyUI not reachable at 127.0.0.1:8188 — start it first.", file=sys.stderr)
        return 1
    ids = [e["id"] for e in LANDMARKS] if args.all else ([args.landmark] if args.landmark else [])
    if not ids:
        p.error("Pass a landmark id or --all.")
    for lid in ids:
        render(lid, regen=args.regen)
    return 0


if __name__ == "__main__":
    sys.exit(main())
